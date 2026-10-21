module.exports = {
  apps: [
    {
      name: 'tanavia-api',
      script: 'pnpm',
      args: 'start',
      cwd: './apps/api',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
    },
    {
      name: 'tanavia-web',
      script: 'pnpm',
      args: 'start',
      cwd: './apps/web',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};