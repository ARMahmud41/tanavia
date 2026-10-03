import type { FastifyInstance } from 'fastify';
import { parsePaymentSms } from '../../services/sms-parser.service.js';
import { smsQueue } from '../../services/sms-queue.service.js';
import { BadRequestError } from '../../utils/errors.js';

export async function smsWebhookRoutes(app: FastifyInstance) {
  /**
   * POST /api/webhooks/sms
   * Receive SMS from Android SMS Forwarder
   * Body: { from: string, message: string, timestamp?: string }
   */
  app.post('/', async (req, reply) => {
    if (process.env.SMS_WEBHOOK_ENABLED === 'false') {
      return reply.code(403).send({
        success: false,
        error: 'SMS webhook disabled',
      });
    }

    const body = req.body as {
      from?: string;
      message?: string;
      timestamp?: string;
      // Common SMS Forwarder field names
      sender?: string;
      body?: string;
      text?: string;
    };

    const from = body.from || body.sender || '';
    const message = body.message || body.body || body.text || '';

    if (!message || message.trim().length < 10) {
      throw new BadRequestError('Missing or invalid SMS message');
    }

    app.log.info(
      { from, messageLength: message.length },
      '[SMS] Received'
    );

    // Parse SMS
    const parsed = parsePaymentSms(from, message);

    if (parsed.provider === 'UNKNOWN' || !parsed.txId) {
      app.log.warn(
        { from, message: message.slice(0, 100) },
        '[SMS] Could not parse payment SMS'
      );

      return reply.send({
        success: false,
        error: 'NOT_A_PAYMENT_SMS',
        message: 'This SMS is not a recognized payment',
      });
    }

    // Add to queue
    const queued = smsQueue.add(parsed);

    app.log.info(
      {
        provider: parsed.provider,
        sender: parsed.senderNumber,
        amount: parsed.amount,
        txId: parsed.txId,
      },
      '[SMS] Parsed successfully'
    );

    return reply.send({
      success: true,
      data: {
        id: queued.id,
        provider: queued.provider,
        senderNumber: queued.senderNumber,
        amount: queued.amount,
        txId: queued.txId,
        time: queued.time,
        receivedAt: queued.receivedAt,
      },
    });
  });

  /**
   * GET /api/webhooks/sms/recent
   * Get recent SMS (for POS auto-fill)
   * Public — no auth needed
   */
  app.get('/recent', async (_req, reply) => {
    const recent = smsQueue.getRecent();

    return reply.send({
      success: true,
      data: recent.map((item) => ({
        id: item.id,
        provider: item.provider,
        senderNumber: item.senderNumber,
        amount: item.amount,
        txId: item.txId,
        time: item.time,
        receivedAt: item.receivedAt,
        consumed: item.consumed,
      })),
      count: recent.length,
    });
  });

  /**
   * GET /api/webhooks/sms/latest
   * Get the latest unconsumed SMS
   */
  app.get('/latest', async (_req, reply) => {
    const latest = smsQueue.getLatestUnconsumed();

    return reply.send({
      success: true,
      data: latest
        ? {
            id: latest.id,
            provider: latest.provider,
            senderNumber: latest.senderNumber,
            amount: latest.amount,
            txId: latest.txId,
            time: latest.time,
            receivedAt: latest.receivedAt,
          }
        : null,
    });
  });

  /**
   * POST /api/webhooks/sms/:id/consume
   * Mark an SMS as consumed
   */
  app.post('/:id/consume', async (req, reply) => {
    const { id } = req.params as { id: string };
    smsQueue.markConsumed(id);

    return reply.send({
      success: true,
    });
  });

  /**
   * POST /api/webhooks/sms/test
   * Test endpoint — insert a sample SMS (for development)
   */
  app.post('/test', async (req, reply) => {
    if (process.env.NODE_ENV === 'production') {
      return reply.code(403).send({
        success: false,
        error: 'Test endpoint disabled in production',
      });
    }

    const { provider = 'BKASH' } = (req.body || {}) as {
      provider?: 'BKASH' | 'NAGAD' | 'ROCKET';
    };

    const samples: Record<string, { from: string; message: string }> = {
      BKASH: {
        from: 'bKash',
        message:
          'You have received Tk 4,752.00 from 01871085648. Fee Tk 0.00. Balance Tk 5,000.00. TrxID 8H4K9L2M at 02/10/2026 21:40',
      },
      NAGAD: {
        from: 'Nagad',
        message:
          'Money Received. Tk 4,752.00 from 01725104464. TxnID 8H4K9L2M. Date: 02/10/2026 21:40',
      },
      ROCKET: {
        from: 'Rocket',
        message:
          'Money received from 01871085648. Amount: Tk. 4,752.00. TxnID: 8H4K9L2M',
      },
    };

    const sample = samples[provider] || samples.BKASH;
    const parsed = parsePaymentSms(sample.from, sample.message);
    const queued = smsQueue.add(parsed);

    return reply.send({
      success: true,
      data: {
        id: queued.id,
        provider: queued.provider,
        senderNumber: queued.senderNumber,
        amount: queued.amount,
        txId: queued.txId,
      },
    });
  });
}