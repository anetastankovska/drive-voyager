import { Request, Response } from "express";
import { DriveService } from "app/services/drive.service";

export const DriveController = {
  async listFiles(req: Request, res: Response) {
    const folderId = req.query.folderId as string;
    if (!folderId) {
      res.status(400).json({ error: "folderId query parameter is required" });
      return;
    }

    try {
      const files = await DriveService.listFiles(folderId);
      res.json(files);
    } catch (error) {
      console.error("Error listing files:", error);
      res.status(500).send("Error listing files");
    }
  },

  async getFolderTree(req: Request, res: Response) {
    const folderId = req.query.folderId as string;
    if (!folderId) {
      res.status(400).json({ error: "folderId query parameter is required" });
      return;
    }

    try {
      const folderTree = await DriveService.getFolderTree(folderId);
      res.json(folderTree);
    } catch (error) {
      console.error("Error listing folder tree:", error);
      res.status(400).send("Error listing folder tree");
    }
  },

  async downloadFile(req: Request, res: Response) {
    const fileId = req.params.fileId;
    const filename = req.query.filename as string;

    try {
      await DriveService.downloadFile(fileId, res, filename);
    } catch (error) {
      console.error("Error downloading file:", error);
      res.status(400).send("File not found");
    }
  },
};
