import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface UploadImageOptions {
  folder: string;
  publicId: string;
  /** Transformation Cloudinary (crop, dimensions…). */
  transformation?: Record<string, unknown>[];
}

/**
 * Envoie un buffer image sur Cloudinary et renvoie l'URL sécurisée.
 * `overwrite: true` + `publicId` déterministe → une seule image par entité.
 */
export function uploadImage(buffer: Buffer, opts: UploadImageOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: opts.folder,
          public_id: opts.publicId,
          overwrite: true,
          transformation: opts.transformation,
        },
        (err, result) => {
          if (err || !result) return reject(err ?? new Error('Cloudinary upload failed'));
          resolve(result.secure_url);
        },
      )
      .end(buffer);
  });
}

export { cloudinary };
