import { buildApp } from './app.js';

async function start() {
  try {
    const app = await buildApp();
    const port = Number(process.env.PORT) || 4000;
    const host = process.env.HOST || '0.0.0.0';

    await app.listen({ port, host });

    app.log.info(`✅ TANAVIA API running at http://localhost:${port}`);
    app.log.info(`✅ Health check: http://localhost:${port}/health`);
  } catch (err) {
    console.error('❌ Server startup failed:', err);
    process.exit(1);
  }
}

start();