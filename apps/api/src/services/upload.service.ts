import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { BadRequestError } from '../utils/errors.js';

// ============================================
// Configuration (from .env)
// ============================================

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const UPLOAD_URL_BASE =
  process.env.UPLOAD_URL_BASE || 'http://localhost:4000';
const MAX_FILE_SIZE_MB = Number(process.env.UPLOAD_MAX_MB || 5);
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;

const ALLOWED_MIME = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
];

const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

// ============================================
// Upload Service
// ============================================

export class UploadService {
  /**
   * Ensure upload directory exists
   */
  static async ensureDir(subfolder = 'products'): Promise<string> {
    const dir = path.join(process.cwd(), UPLOAD_DIR, subfolder);
    await fs.mkdir(dir, { recursive: true });
    return dir;
  }

  /**
   * Save a file buffer to disk and return its public URL
   */
  static async saveFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    subfolder = 'products'
  ): Promise<{ url: string; filename: string; size: number }> {
    // Validate size
    if (buffer.length > MAX_FILE_SIZE) {
      throw new BadRequestError(
        `File too large. Max ${MAX_FILE_SIZE_MB}MB allowed`
      );
    }

    // Validate mime
    if (!ALLOWED_MIME.includes(mimeType)) {
      throw new BadRequestError(
        `Invalid file type. Allowed: JPG, PNG, WebP, GIF`
      );
    }

    // Get extension from original name (fallback from mime)
    let ext = path.extname(originalName).toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      const mimeToExt: Record<string, string> = {
        'image/jpeg': '.jpg',
        'image/jpg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp',
        'image/gif': '.gif',
      };
      ext = mimeToExt[mimeType] || '.jpg';
    }

    // Generate unique filename
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const random = crypto.randomBytes(8).toString('hex');
    const filename = `${yearMonth}-${random}${ext}`;

    // Write file
    const dir = await this.ensureDir(subfolder);
    const filepath = path.join(dir, filename);
    await fs.writeFile(filepath, buffer);

    // Return public URL
    const url = `${UPLOAD_URL_BASE}/${UPLOAD_DIR}/${subfolder}/${filename}`;

    return {
      url,
      filename,
      size: buffer.length,
    };
  }

  /**
   * Delete a file by URL (best-effort)
   */
  static async deleteByUrl(url: string): Promise<boolean> {
    try {
      const urlPath = new URL(url).pathname;
      const filename = path.basename(urlPath);
      const subfolder = urlPath.includes('/products/') ? 'products' : '';

      const filepath = path.join(
        process.cwd(),
        UPLOAD_DIR,
        subfolder,
        filename
      );

      await fs.unlink(filepath);
      return true;
    } catch {
      return false;
    }
  }
}