/**
 * PM2 Ecosystem Configuration for Production
 * 
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 start ecosystem.config.js --env production
 * 
 * Commands:
 *   pm2 status              - Check status
 *   pm2 logs                - View logs
 *   pm2 monit               - Real-time monitoring
 *   pm2 restart all         - Restart all apps
 *   pm2 stop all            - Stop all apps
 *   pm2 delete all          - Remove from PM2 list
 *   pm2 save                - Save process list
 *   pm2 startup             - Setup auto-start on boot
 */

module.exports = {
  apps: [
    {
      name: 'tickethub-backend',
      script: './dist/server.js',
      cwd: '.',
      
      // Environment
      env: {
        NODE_ENV: 'development',
        PORT: 8081,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 8081,
        ENABLE_DEV_SEED: 'false',
        ENABLE_TEST_USERS: 'false',
        ENABLE_DEFAULT_USERS: 'false',
        ENABLE_SCRAPER: 'false',
        ENABLE_AUTOMATIC_BACKUPS: 'false',
        ENABLE_LOG_MONITORING: 'false',
        BOOTSTRAP_ON_START: 'false',
      },
      
      // Process management
      instances: 2, // Number of instances (cluster mode)
      exec_mode: 'cluster', // Cluster mode for load balancing
      max_memory_restart: '500M', // Auto restart if memory exceeds 500MB
      
      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
      
      // Auto restart
      autorestart: true,
      watch: false, // Disable file watching in production
      ignore_watch: ['node_modules', 'logs', '.git'],
      max_restarts: 10,
      min_uptime: '10s',
      
      // Advanced settings
      kill_timeout: 3000, // Wait 3s before killing process
      listen_timeout: 3000, // Time to wait for process to be ready
      restart_delay: 4000, // Delay between restarts
      
      // Resource limits
      max_memory_restart: '500M',
      
      // Readiness check (PM2 Plus feature)
      // Prefer /ready for orchestration so traffic only reaches the app
      // after env validation, DB connectivity, route mounting, and metrics init.
      // health_check: {
      //   path: '/ready',
      //   port: 8081,
      //   timeout: 3000,
      //   interval: 30000,
      // },
    },
    
    // Optional: Background worker for scraping
    // {
    //   name: 'tickethub-scraper',
    //   script: './dist/workers/scraper.js',
    //   cwd: '.',
    //   env_production: {
    //     NODE_ENV: 'production',
    //   },
    //   instances: 1,
    //   exec_mode: 'fork',
    //   autorestart: true,
    //   max_memory_restart: '300M',
    //   log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    //   error_file: './logs/scraper-error.log',
    //   out_file: './logs/scraper-out.log',
    // },
    
    // Optional: WebSocket worker
    // {
    //   name: 'tickethub-websocket',
    //   script: './dist/workers/websocket.js',
    //   cwd: '.',
    //   env_production: {
    //     NODE_ENV: 'production',
    //   },
    //   instances: 1,
    //   exec_mode: 'fork',
    //   autorestart: true,
    // },
  ],
  
  // Deployment configuration
  deploy: {
    production: {
      user: 'root',
      host: 'your-ecs-ip',
      ref: 'origin/main',
      repo: 'git@github.com:your-org/ticket-hub-app.git',
      path: '/opt/tickethub',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 restart ecosystem.config.js --env production',
      'pre-setup': '',
    },
    
    staging: {
      user: 'root',
      host: 'your-staging-ecs-ip',
      ref: 'origin/develop',
      repo: 'git@github.com:your-org/ticket-hub-app.git',
      path: '/opt/tickethub-staging',
      'post-deploy': 'npm install && npm run build && pm2 restart ecosystem.config.js --env production',
    },
  },
};
