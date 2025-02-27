import express, { Request, Response } from "express";
import { google } from "googleapis";
import { config } from "dotenv";

// Load environment variables from .env file
config();

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure the service account key is set in the environment variable
if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
  console.error("Please set GOOGLE_SERVICE_ACCOUNT_KEY in your .env file");
  process.exit(1);
}

// Parse the JSON credentials from the environment variable
const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

// Initialize Google Auth with the service account credentials
const auth = new google.auth.GoogleAuth({
  credentials: serviceAccount,
  scopes: ["https://www.googleapis.com/auth/drive"],
});

// Create the Google Drive client
const drive = google.drive({ version: "v3", auth });

// Middleware to parse JSON bodies
app.use(express.json());

// ---------------------------------------------------------------------
// API Routes
// ---------------------------------------------------------------------

// Base route
app.get("/", (req: Request, res: Response) => {
  res.send("Welcome to Drive-Voyager!");
});

/**
 * GET /files
 * Lists files in a specified folder (non-recursive).
 * Usage: GET /files?folderId=<FOLDER_ID>
 */
app.get("/files", async (req: Request, res: Response): Promise<void> => {
  const folderId = req.query.folderId as string;
  if (!folderId) {
    res.status(400).json({ error: "folderId query parameter is required" });
    return; // End the function here
  }

  try {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: "files(id, name, mimeType)",
    });
    res.json(response.data.files);
  } catch (error) {
    console.error("Error listing files:", error);
    res.status(500).send("Error listing files");
  }
});

interface FolderTree {
  id?: string;
  name?: string;
  mimeType?: string;
  contents?: FolderTree[];
}

/**
 * Recursively builds a folder tree.
 * Returns an object representing the folder with its details and a `contents`
 * array containing its child files and folders.
 *
 * @param folderId - The ID of the folder to get the tree for.
 * @returns A promise that resolves to a FolderTree object.
 */
async function getFolderTree(folderId: string): Promise<FolderTree> {
  // Get folder details
  const folderResponse = await drive.files.get({
    fileId: folderId,
    fields: "id, name, mimeType",
  });
  const folderData: FolderTree = folderResponse.data;

  // List children inside the folder
  const childrenResponse = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    fields: "files(id, name, mimeType)",
  });
  const children = childrenResponse.data.files || [];
  const contents: FolderTree[] = [];

  for (const child of children) {
    if (child.mimeType === "application/vnd.google-apps.folder" && child.id) {
      const childTree = await getFolderTree(child.id);
      contents.push(childTree);
    } else {
      // For non-folder files, simply add the file object
      contents.push(child);
    }
  }
  folderData.contents = contents;
  return folderData;
}

/**
 * GET /all-files
 * Recursively builds and returns a folder tree including all subfolders and files.
 * Usage: GET /all-files?folderId=<FOLDER_ID>
 */
app.get("/all-files", async (req: Request, res: Response): Promise<void> => {
  const folderId = req.query.folderId as string;
  if (!folderId) {
    res.status(400).json({ error: "folderId query parameter is required" });
    return; // End the function here
  }

  try {
    const folderTree = await getFolderTree(folderId);
    res.json(folderTree);
  } catch (error) {
    console.error("Error listing folder tree:", error);
    res.status(500).send("Error listing folder tree");
  }
});

/**
 * GET /download/:fileId
 * Streams a file from Google Drive to the client.
 * Optionally, provide a custom filename via the "filename" query parameter.
 * Usage: GET /download/<FILE_ID>?filename=yourfilename.ext
 */
app.get("/download/:fileId", async (req: Request, res: Response) => {
  const fileId = req.params.fileId;
  try {
    const driveResponse = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "stream" }
    );
    const filename = (req.query.filename as string) || fileId;
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    driveResponse.data.pipe(res);
  } catch (error) {
    console.error("Error downloading file:", error);
    res.status(500).send("Error downloading file");
  }
});

// ---------------------------------------------------------------------
// Start Server
// ---------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
