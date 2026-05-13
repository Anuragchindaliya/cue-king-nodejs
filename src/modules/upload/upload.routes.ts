import { Router, Request, Response } from 'express';
import { upload } from '../../middlewares/upload.middleware';
import { protect } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/role.middleware';
import { sendResponse } from '../../utils/response';

const router = Router();

router.post(
  '/',
  protect,
  authorize('CLUB_OWNER', 'ADMIN'),
  upload.single('image'),
  (req: Request, res: Response) => {
    if (!req.file) {
      return sendResponse(res, 400, false, 'No image provided');
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    sendResponse(res, 200, true, 'Image uploaded successfully', { url: imageUrl });
  }
);

router.post(
  '/multiple',
  protect,
  authorize('CLUB_OWNER', 'ADMIN'),
  upload.array('images', 10),
  (req: Request, res: Response) => {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return sendResponse(res, 400, false, 'No images provided');
    }

    const imageUrls = req.files.map((f: Express.Multer.File) => `/uploads/${f.filename}`);
    sendResponse(res, 200, true, 'Images uploaded successfully', { urls: imageUrls });
  }
);

export default router;
