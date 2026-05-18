import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { Request } from 'express';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
export const MAX_FILE_SIZE_MB = 5;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_FORMATS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

// ─────────────────────────────────────────────────────────────────────────────
// Dynamic Cloudinary Storage
// Reads folder path from req.cloudinaryFolder (set by route handler or middleware)
// Fallback: 'cueking/general'
// ─────────────────────────────────────────────────────────────────────────────
const cloudinaryStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req: Request, file: Express.Multer.File) => {
    // The folder is attached to the request object by the upload route handlers.
    // Shape: cueking/<EntityType>/<EntityId>/<SubFolder>
    const folder = (req as any).cloudinaryFolder ?? 'cueking/general';

    // Sanitize the original filename to create a stable public_id prefix
    const originalName = file.originalname
      .replace(/\.[^/.]+$/, '')     // remove extension
      .replace(/[^a-zA-Z0-9_-]/g, '_') // replace special chars
      .toLowerCase();

    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;

    return {
      folder,
      public_id: `${originalName}_${uniqueSuffix}`,
      allowed_formats: ALLOWED_FORMATS,
      resource_type: 'image',
      // Deliver images over HTTPS automatically via cloudinary.config({ secure: true })
    };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// File filter — only accept images
// ─────────────────────────────────────────────────────────────────────────────
const imageFileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type "${file.mimetype}". ` +
        `Only ${ALLOWED_MIME_TYPES.join(', ')} are accepted.`
      )
    );
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// upload — Cloudinary-backed multer (for generic upload routes)
// ─────────────────────────────────────────────────────────────────────────────
export const upload = multer({
  storage: cloudinaryStorage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: imageFileFilter,
});

// ─────────────────────────────────────────────────────────────────────────────
// memoryUpload — in-memory multer (for controllers that need the Buffer to
// call Cloudinary manually with a DB-generated ID in the folder path)
// ─────────────────────────────────────────────────────────────────────────────
export const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: imageFileFilter,
});
