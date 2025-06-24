# Node.js Express Server with Router Proxy

## server.js

```javascript
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const logger = require('./utils/logger');
const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/devices');
const routerRoutes = require('./routes/router');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow for development
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['exp://192.168.1.100:8081'] // Replace with your Expo dev server
    : true,
  credentials: true,
  optionsSuccessStatus: 200
}));

// Rate limiting
if (process.env.ENABLE_RATE_LIMITING === 'true') {
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
    message: 'Too many requests from this IP'
  });
  app.use(limiter);
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: parseInt(process.env.SESSION_TIMEOUT) || 30 * 60 * 1000 // 30 minutes
  }
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/router', routerRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Global error handler:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📱 Router IP: ${process.env.ROUTER_IP}`);
  logger.info(`🔧 Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;
```

## services/routerService.js

```javascript
const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');

class RouterService {
  constructor() {
    this.routerIP = process.env.ROUTER_IP || 'http://10.0.0.1';
    this.timeout = parseInt(process.env.API_TIMEOUT) || 15000;
    this.retryAttempts = parseInt(process.env.MAX_RETRY_ATTEMPTS) || 3;
    this.retryDelay = parseInt(process.env.RETRY_DELAY) || 1000;
    
    // Create axios instance with default config
    this.client = axios.create({
      baseURL: this.routerIP,
      timeout: this.timeout,
      validateStatus: status => status < 500, // Don't throw on 4xx errors
      headers: {
        'User-Agent': 'XfinityRouterApp/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
  }

  /**
   * Authenticate with router admin interface
   */
  async authenticate(username, password, session) {
    try {
      logger.info('Attempting router authentication');
      
      // First, get the login page to extract any CSRF tokens or form data
      const loginPageResponse = await this.client.get(process.env.ROUTER_LOGIN_PATH || '/login.php');
      const $ = cheerio.load(loginPageResponse.data);
      
      // Extract form data and CSRF tokens if present
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);
      
      // Look for hidden form fields (common in router interfaces)
      $('input[type="hidden"]').each((i, elem) => {
        const name = $(elem).attr('name');
        const value = $(elem).attr('value');
        if (name && value) {
          formData.append(name, value);
        }
      });

      // Attempt login
      const loginResponse = await this.client.post(
        process.env.ROUTER_LOGIN_PATH || '/login.php',
        formData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Referer': `${this.routerIP}${process.env.ROUTER_LOGIN_PATH || '/login.php'}`
          },
          maxRedirects: 5
        }
      );

      // Check if login was successful
      const isAuthenticated = this.validateAuthentication(loginResponse);
      
      if (isAuthenticated) {
        // Store session cookies
        const cookies = loginResponse.headers['set-cookie'];
        if (cookies) {
          session.routerCookies = cookies;
        }
        
        logger.info('Router authentication successful');
        return { success: true, message: 'Authentication successful' };
      } else {
        logger.warn('Router authentication failed - invalid credentials');
        return { success: false, message: 'Invalid credentials' };
      }
    } catch (error) {
      logger.error('Router authentication error:', error.message);
      return { success: false, message: 'Authentication failed due to connection error' };
    }
  }

  /**
   * Validate if authentication was successful
   */
  validateAuthentication(response) {
    // Common indicators of successful router login
    const successIndicators = [
      'dashboard',
      'home.php',
      'status.php',
      'main.php',
      'logout'
    ];
    
    const failureIndicators = [
      'login failed',
      'invalid password',
      'authentication failed',
      'incorrect credentials'
    ];
    
    const responseText = response.data.toLowerCase();
    const hasFailureIndicator = failureIndicators.some(indicator => 
      responseText.includes(indicator)
    );
    
    if (hasFailureIndicator) return false;
    
    // Check for success indicators or successful redirect
    const hasSuccessIndicator = successIndicators.some(indicator => 
      responseText.includes(indicator) || response.request.path?.includes(indicator)
    );
    
    return hasSuccessIndicator || response.status === 200;
  }

  /**
   * Get router cookies for authenticated requests
   */
  getAuthHeaders(session) {
    return session.routerCookies ? {
      'Cookie': session.routerCookies.join('; ')
    } : {};
  }

  /**
   * Test router connection
   */
  async testConnection() {
    try {
      const response = await this.client.get('/', { timeout: 5000 });
      return {
        success: true,
        status: response.status,
        message: 'Router is reachable'
      };
    } catch (error) {
      logger.error('Router connection test failed:', error.message);
      return {
        success: false,
        message: `Unable to reach router at ${this.routerIP}`
      };
    }
  }

  /**
   * Reboot router
   */
  async rebootRouter(session) {
    try {
      logger.info('Attempting router reboot');
      
      const authHeaders = this.getAuthHeaders(session);
      const response = await this.client.post(
        process.env.ROUTER_REBOOT_PATH || '/reboot_router.php',
        { reboot: 'yes' },
        { headers: authHeaders }
      );

      if (response.status === 200) {
        logger.info('Router reboot initiated successfully');
        return { success: true, message: 'Router reboot initiated' };
      } else {
        return { success: false, message: 'Failed to reboot router' };
      }
    } catch (error) {
      logger.error('Router reboot error:', error.message);
      return { success: false, message: 'Reboot request failed' };
    }
  }
}

module.exports = new RouterService();
```