import { google } from "googleapis";

// Parse the JSON credentials from the environment variable
if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
  console.error("Please set GOOGLE_SERVICE_ACCOUNT_KEY in your .env file");
  process.exit(1);
}

const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

// Initialize Google Auth with the service account credentials
const auth = new google.auth.GoogleAuth({
  credentials: serviceAccount,
  scopes: ["https://www.googleapis.com/auth/drive"],
});

// Create the Google Drive client
const drive = google.drive({ version: "v3", auth });

interface FolderTree {
  id?: string;
  name?: string;
  mimeType?: string;
  contents?: FolderTree[];
}

export const DriveService = {
  async listFiles(folderId: string) {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: "files(id, name, mimeType)",
    });
    return response.data.files;
  },

  async getFolderTree(folderId: string): Promise<FolderTree> {
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
        const childTree = await this.getFolderTree(child.id);
        contents.push(childTree);
      } else {
        contents.push(child);
      }
    }
    folderData.contents = contents;
    return folderData;
  },

  async downloadFile(fileId: string, res: any, filename?: string) {
    const driveResponse = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "stream" }
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename || fileId}"`
    );
    driveResponse.data.pipe(res);
  },
};
