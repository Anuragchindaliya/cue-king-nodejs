import { Router, Request, Response, NextFunction } from 'express';
import { upload } from '../../middlewares/upload.middleware';
import { protect } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/role.middleware';
import { sendResponse } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Helper — build a sanitised Cloudinary folder path from route params
//
// Route pattern:  /api/uploads/:entityType/:entityId{/:subFolder}
//                 (Express 5 syntax — curly braces = optional segment)
//
// Examples:
//   POST /api/uploads/clubs/42/logo         → cueking/clubs/42/logo
//   POST /api/uploads/products/99/gallery   → cueking/products/99/gallery
//   POST /api/uploads/users/7               → cueking/users/7
// ─────────────────────────────────────────────────────────────────────────────
const sanitiseSegment = (s: string) =>
  s.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();

const buildFolderPath = (
  entityType: string,
  entityId: string,
  subFolder?: string
): string => {
  const parts = [
    'cueking',
    sanitiseSegment(entityType),
    sanitiseSegment(entityId),
  ];
  if (subFolder) parts.push(sanitiseSegment(subFolder));
  return parts.join('/');
};

// ─────────────────────────────────────────────────────────────────────────────
// Middleware — attaches the computed folder path onto the request object
// so that CloudinaryStorage can read it inside `params`.
// ─────────────────────────────────────────────────────────────────────────────
const attachCloudinaryFolder = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const { entityType, entityId, subFolder } = req.params;
  (req as any).cloudinaryFolder = buildFolderPath(
    entityType as string,
    entityId as string,
    subFolder as string | undefined
  );
  next();
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/uploads/:entityType/:entityId{/:subFolder}
//
// Upload a single image to a dynamic nested Cloudinary folder.
// Returns the absolute secure_url for storage in PostgreSQL.
//
// Auth: JWT required  |  Roles: CLUB_OWNER, ADMIN
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/:entityType/:entityId{/:subFolder}',
  protect,
  authorize('CLUB_OWNER', 'ADMIN'),
  attachCloudinaryFolder,
  upload.single('image'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      return sendResponse(res, 400, false, 'No image file provided. Send the file under the field name "image".');
    }

    // multer-storage-cloudinary enriches req.file with Cloudinary metadata
    const file = req.file as Express.Multer.File & {
      path: string;       // secure_url
      filename: string;   // public_id
    };

    const secureUrl = file.path;   // absolute HTTPS URL from Cloudinary
    const publicId  = file.filename;
    const folder    = (req as any).cloudinaryFolder as string;

    return sendResponse(res, 200, true, 'Image uploaded successfully', {
      secureUrl,          // ← store this in PostgreSQL
      publicId,           // ← store for future deletion / transformations
      folder,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
    });
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/uploads/multiple/:entityType/:entityId{/:subFolder}
//
// Upload up to 10 images at once. Returns an array of secure URLs.
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/multiple/:entityType/:entityId{/:subFolder}',
  protect,
  authorize('CLUB_OWNER', 'ADMIN'),
  attachCloudinaryFolder,
  upload.array('images', 10),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return sendResponse(res, 400, false, 'No image files provided. Send files under the field name "images".');
    }

    type CloudinaryFile = Express.Multer.File & { path: string; filename: string };

    const uploaded = (req.files as CloudinaryFile[]).map((file) => ({
      secureUrl: file.path,        // ← store in PostgreSQL
      publicId: file.filename,
      folder: (req as any).cloudinaryFolder,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    }));

    return sendResponse(res, 200, true, `${uploaded.length} image(s) uploaded successfully`, {
      images: uploaded,
    });
  })
);

export default router;
