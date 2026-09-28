import type { FastifyInstance } from 'fastify';
import { requireAdmin } from '../middleware/require-role.js';
import { UploadService } from '../services/upload.service.js';
import { BadRequestError } from '../utils/errors.js';

export async function uploadRoutes(app: FastifyInstance) {
  /**
   * POST /api/upload/product
   * Upload a single product image — admin only
   */
  app.post(
    '/product',
    {
      preHandler: [app.authenticate, requireAdmin],
    },
    async (req, reply) => {
      const data = await req.file();

      if (!data) {
        throw new BadRequestError('No file provided');
      }

      const buffer = await data.toBuffer();

      const result = await UploadService.saveFile(
        buffer,
        data.filename,
        data.mimetype,
        'products'
      );

      return reply.code(201).send({
        success: true,
        data: result,
      });
    }
  );

  /**
   * POST /api/upload/product/multiple
   * Upload multiple product images at once
   */
  app.post(
    '/product/multiple',
    {
      preHandler: [app.authenticate, requireAdmin],
    },
    async (req, reply) => {
      const parts = req.files();
      const results: Array<{ url: string; filename: string; size: number }> = [];

      for await (const part of parts) {
        const buffer = await part.toBuffer();
        const result = await UploadService.saveFile(
          buffer,
          part.filename,
          part.mimetype,
          'products'
        );
        results.push(result);
      }

      if (results.length === 0) {
        throw new BadRequestError('No files provided');
      }

      return reply.code(201).send({
        success: true,
        data: results,
      });
    }
  );

  /**
   * DELETE /api/upload
   * Delete a file by URL — admin only
   */
  app.delete(
    '/',
    {
      preHandler: [app.authenticate, requireAdmin],
    },
    async (req, reply) => {
      const { url } = req.body as { url?: string };

      if (!url) {
        throw new BadRequestError('No URL provided');
      }

      const deleted = await UploadService.deleteByUrl(url);

      return reply.send({
        success: true,
        data: { deleted },
      });
    }
  );
}