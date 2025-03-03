import { Router, Request, Response } from "express";

import { DriveController } from "app/controllers/drive.controller";

const router = Router();

router.get("/", (req: Request, res: Response) => {
  res.send("Welcome to Drive-Voyager!");
});

router.get("/files", DriveController.listFiles);
router.get("/all-files", DriveController.getFolderTree);
router.get("/download/:fileId", DriveController.downloadFile);

export default router;
