# Node.js Backend Package Configuration

## package.json

```json
{
  "name": "xfinity-router-proxy",
  "version": "1.0.0",
  "description": "Node.js Express backend proxy for Xfinity router management with HTML parsing",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.0",
    "axios": "^1.6.0",
    "cheerio": "^1.0.0-rc.12",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "express-session": "^1.17.3",
    "express-rate-limit": "^6.10.0",
    "dotenv": "^16.3.0",
    "bcryptjs": "^2.4.3",
    "joi": "^17.9.0",
    "winston": "^3.10.0",
    "connect-session-sequelize": "^7.1.7"
  },
  "devDependencies": {
    "nodemon": "^3.0.0",
    "jest": "^29.0.0",
    "supertest": "^6.3.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

## .env (Backend Environment Configuration)

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Router Configuration
ROUTER_IP=http://10.0.0.1
ROUTER_LOGIN_PATH=/login.php
ROUTER_DEVICES_PATH=/connected_devices_computers.php
ROUTER_BLOCK_PATH=/user_block_device.php
ROUTER_REBOOT_PATH=/reboot_router.php

# Session Configuration
SESSION_SECRET=your-super-secure-session-secret-change-this
SESSION_TIMEOUT=1800000

# API Configuration
API_TIMEOUT=15000
CONNECTION_TIMEOUT=5000
MAX_RETRY_ATTEMPTS=3
RETRY_DELAY=1000

# Security
ENABLE_RATE_LIMITING=true
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log
```