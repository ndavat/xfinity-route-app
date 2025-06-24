# Backend Routes and Utilities

## routes/auth.js

```javascript
const express = require('express');
const router = express.Router();
const routerService = require('../services/routerService');
const { validateAuthCredentials } = require('../utils/validation');
const logger = require('../utils/logger');

/**
 * POST /api/auth/login - Authenticate with router
 */
router.post('/login', validateAuthCredentials, async (req, res) => {
  try {
    const { routerIP, username, password } = req.body;
    
    logger.info(`Authentication attempt for router: ${routerIP}`);
    
    // Update router IP if provided
    if (routerIP && routerIP !== routerService.routerIP) {
      routerService.routerIP = routerIP;
      routerService.client.defaults.baseURL = routerIP;
    }
    
    // Attempt authentication
    const authResult = await routerService.authenticate(username, password, req.session);
    
    if (authResult.success) {
      // Store credentials in session
      req.session.routerCredentials = {
        routerIP: routerIP || routerService.routerIP,
        username,
        authenticatedAt: new Date().toISOString()
      };
      
      logger.info('Router authentication successful');
      res.json({
        success: true,
        message: 'Authentication successful',
        routerIP: routerIP || routerService.routerIP,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(401).json({
        success: false,
        error: authResult.message
      });
    }
  } catch (error) {
    logger.error('Authentication error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Authentication failed due to server error'
    });
  }
});

/**
 * POST /api/auth/test-connection - Test router connection
 */
router.post('/test-connection', async (req, res) => {
  try {
    const { routerIP } = req.body;
    
    if (!routerIP) {
      return res.status(400).json({ error: 'Router IP is required' });
    }
    
    // Temporarily update router IP for testing
    const originalIP = routerService.routerIP;
    routerService.routerIP = routerIP;
    routerService.client.defaults.baseURL = routerIP;
    
    const connectionResult = await routerService.testConnection();
    
    // Restore original IP if test fails
    if (!connectionResult.success) {
      routerService.routerIP = originalIP;
      routerService.client.defaults.baseURL = originalIP;
    }
    
    res.json(connectionResult);
  } catch (error) {
    logger.error('Connection test error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Connection test failed'
    });
  }
});

/**
 * GET /api/auth/status - Check authentication status
 */
router.get('/status', (req, res) => {
  const isAuthenticated = !!req.session.routerCookies;
  
  res.json({
    authenticated: isAuthenticated,
    routerIP: req.session.routerCredentials?.routerIP || routerService.routerIP,
    username: req.session.routerCredentials?.username,
    authenticatedAt: req.session.routerCredentials?.authenticatedAt,
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/auth/logout - Logout and clear session
 */
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      logger.error('Logout error:', err.message);
      return res.status(500).json({ error: 'Logout failed' });
    }
    
    logger.info('User logged out successfully');
    res.json({
      success: true,
      message: 'Logged out successfully',
      timestamp: new Date().toISOString()
    });
  });
});

module.exports = router;
```

## routes/router.js

```javascript
const express = require('express');
const router = express.Router();
const routerService = require('../services/routerService');
const logger = require('../utils/logger');

// Middleware to check authentication
const requireAuth = (req, res, next) => {
  if (!req.session.routerCookies) {
    return res.status(401).json({ error: 'Router authentication required' });
  }
  next();
};

/**
 * POST /api/router/reboot - Reboot the router
 */
router.post('/reboot', requireAuth, async (req, res) => {
  try {
    logger.info('Router reboot requested');
    
    const rebootResult = await routerService.rebootRouter(req.session);
    
    if (rebootResult.success) {
      res.json({
        success: true,
        message: 'Router reboot initiated successfully',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: rebootResult.message
      });
    }
  } catch (error) {
    logger.error('Router reboot error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to reboot router'
    });
  }
});

/**
 * GET /api/router/status - Get router status information
 */
router.get('/status', requireAuth, async (req, res) => {
  try {
    const connectionTest = await routerService.testConnection();
    
    res.json({
      success: true,
      status: {
        connected: connectionTest.success,
        routerIP: routerService.routerIP,
        lastChecked: new Date().toISOString(),
        uptime: process.uptime()
      },
      session: {
        authenticated: !!req.session.routerCookies,
        username: req.session.routerCredentials?.username,
        authenticatedAt: req.session.routerCredentials?.authenticatedAt
      }
    });
  } catch (error) {
    logger.error('Router status error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get router status'
    });
  }
});

module.exports = router;
```

## utils/validation.js

```javascript
const Joi = require('joi');

// Validation schemas
const authCredentialsSchema = Joi.object({
  routerIP: Joi.string().uri({ scheme: ['http', 'https'] }).optional(),
  username: Joi.string().min(1).max(50).required(),
  password: Joi.string().min(1).max(100).required()
});

const deviceSchema = Joi.object({
  deviceId: Joi.string().alphanum().min(1).max(50).required()
});

const blockActionSchema = Joi.object({
  duration: Joi.string().valid('permanent', '1hour', '2hours', '4hours', '8hours', '24hours').optional(),
  schedule: Joi.object({
    startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    endTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    days: Joi.array().items(Joi.number().min(0).max(6)).optional(),
    enabled: Joi.boolean().optional()
  }).optional()
});

// Validation middleware functions
const validateAuthCredentials = (req, res, next) => {
  const { error } = authCredentialsSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: 'Validation error',
      details: error.details[0].message
    });
  }
  next();
};

const validateDevice = (req, res, next) => {
  const { error } = deviceSchema.validate(req.params);
  if (error) {
    return res.status(400).json({
      error: 'Validation error',
      details: error.details[0].message
    });
  }
  next();
};

const validateBlockAction = (req, res, next) => {
  const { error } = blockActionSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: 'Validation error',
      details: error.details[0].message
    });
  }
  next();
};

// Utility functions
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>\"'&]/g, '');
};

const validateIPAddress = (ip) => {
  const ipPattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipPattern.test(ip);
};

const validateMACAddress = (mac) => {
  const macPattern = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
  return macPattern.test(mac);
};

module.exports = {
  validateAuthCredentials,
  validateDevice,
  validateBlockAction,
  sanitizeInput,
  validateIPAddress,
  validateMACAddress
};
```

## utils/logger.js

```javascript
const winston = require('winston');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'xfinity-router-proxy' },
  transports: [
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Write all logs with level 'info' and below to combined.log
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// If we're not in production, log to the console as well
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
      })
    )
  }));
}

module.exports = logger;
```