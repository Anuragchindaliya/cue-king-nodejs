import { cloudinary } from '../config/cloudinary.config';
import { UploadApiResponse } from 'cloudinary';

export interface CloudinaryUploadResult {
  /** Absolute HTTPS URL — store this in your PostgreSQL database */
  secureUrl: string;
  /** Cloudinary public_id — useful for deletion / transformation later */
  publicId: string;
  /** Full folder path in Cloudinary, e.g. cueking/clubs/123/logo */
  folder: string;
  /** Pixel width of the uploaded image */
  width: number;
  /** Pixel height of the uploaded image */
  height: number;
  /** File size in bytes */
  bytes: number;
  /** Image format, e.g. "jpg", "png" */
  format: string;
}

/**
 * Uploads a file buffer directly to Cloudinary.
 *
 * Use this for programmatic uploads (e.g. from seeder scripts or
 * server-to-server transfers). For HTTP multipart uploads use the
 * `upload` multer middleware instead (src/middlewares/upload.middleware.ts).
 *
 * @param fileBuffer  - Raw file buffer
 * @param folderPath  - Destination folder, e.g. "cueking/clubs/42/logo"
 * @param publicId    - Optional stable identifier (filename without extension)
 */
export const uploadToCloudinary = async (
  fileBuffer: Buffer,
  folderPath: string,
  publicId?: string
): Promise<CloudinaryUploadResult> => {
  return new Promise((resolve, reject) => {
    const uploadOptions: Record<string, unknown> = {
      folder: folderPath,
      resource_type: 'image',
      secure: true,
    };

    if (publicId) {
      uploadOptions.public_id = publicId;
    }

    // upload_stream is the buffer-friendly API
    const stream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result: UploadApiResponse | undefined) => {
        if (error || !result) {
          return reject(
            new Error(error?.message ?? 'Cloudinary upload failed with no error details.')
          );
        }
        resolve(mapResult(result));
      }
    );

    stream.end(fileBuffer);
  });
};

/**
 * Deletes an image from Cloudinary by its public_id.
 * Useful when a user updates or deletes their profile/club image.
 */
export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

function mapResult(result: UploadApiResponse): CloudinaryUploadResult {
  return {
    secureUrl: result.secure_url,   // absolute HTTPS URL for PostgreSQL
    publicId: result.public_id,
    folder: result.folder ?? '',
    width: result.width,
    height: result.height,
    bytes: result.bytes,
    format: result.format,
  };
}
