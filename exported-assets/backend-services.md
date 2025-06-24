# Backend Services - HTML Parser and Device Management

## services/htmlParser.js

```javascript
const cheerio = require('cheerio');
const logger = require('../utils/logger');

class HTMLParser {
  /**
   * Parse connected devices from router HTML response
   */
  parseConnectedDevices(html) {
    try {
      const $ = cheerio.load(html);
      const devices = [];
      
      // Common patterns for device tables in router interfaces
      const deviceSelectors = [
        'table.device-table tbody tr',
        'table#connectedDevices tbody tr',
        '.device-list .device-row',
        'table tbody tr:has(td:contains("MAC"))',
        'tbody tr:not(:first-child)' // Skip header row
      ];
      
      let deviceRows = null;
      
      // Try different selectors to find device data
      for (const selector of deviceSelectors) {
        deviceRows = $(selector);
        if (deviceRows.length > 0) {
          logger.debug(`Found devices using selector: ${selector}`);
          break;
        }
      }
      
      if (!deviceRows || deviceRows.length === 0) {
        logger.warn('No device rows found in HTML');
        return this.fallbackDeviceParsing($, html);
      }
      
      deviceRows.each((index, row) => {
        const device = this.parseDeviceRow($, row);
        if (device && device.mac) {
          devices.push(device);
        }
      });
      
      logger.info(`Parsed ${devices.length} devices from HTML`);
      return devices;
    } catch (error) {
      logger.error('Error parsing devices HTML:', error.message);
      return [];
    }
  }
  
  /**
   * Parse individual device row
   */
  parseDeviceRow($, row) {
    try {
      const cells = $(row).find('td');
      if (cells.length < 3) return null;
      
      const cellTexts = cells.map((i, cell) => $(cell).text().trim()).get();
      
      // Try to identify device information by patterns
      const device = {
        id: this.generateDeviceId(cellTexts),
        name: this.extractDeviceName(cellTexts),
        ip: this.extractIPAddress(cellTexts),
        mac: this.extractMACAddress(cellTexts),
        connectionType: this.extractConnectionType(cellTexts),
        status: this.extractDeviceStatus(cellTexts, $, row),
        lastSeen: new Date().toISOString(),
        isBlocked: this.extractBlockedStatus($, row)
      };
      
      // Validate required fields
      if (!device.mac) {
        logger.debug('Skipping device row - no MAC address found');
        return null;
      }
      
      return device;
    } catch (error) {
      logger.error('Error parsing device row:', error.message);
      return null;
    }
  }
  
  /**
   * Extract device name from cell data
   */
  extractDeviceName(cellTexts) {
    // Look for device names (usually first column or contains letters)
    for (const text of cellTexts) {
      if (text && !this.isIPAddress(text) && !this.isMACAddress(text) && 
          text.length > 2 && /[a-zA-Z]/.test(text)) {
        return text;
      }
    }
    return 'Unknown Device';
  }
  
  /**
   * Extract IP address from cell data
   */
  extractIPAddress(cellTexts) {
    const ipPattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return cellTexts.find(text => ipPattern.test(text)) || null;
  }
  
  /**
   * Extract MAC address from cell data
   */
  extractMACAddress(cellTexts) {
    const macPattern = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    return cellTexts.find(text => macPattern.test(text)) || null;
  }
  
  /**
   * Extract connection type (WiFi, Ethernet, etc.)
   */
  extractConnectionType(cellTexts) {
    const wifiPatterns = ['wifi', 'wireless', '802.11', 'wlan'];
    const ethernetPatterns = ['ethernet', 'wired', 'lan', 'cable'];
    
    for (const text of cellTexts) {
      const lowerText = text.toLowerCase();
      if (wifiPatterns.some(pattern => lowerText.includes(pattern))) {
        return 'WiFi';
      }
      if (ethernetPatterns.some(pattern => lowerText.includes(pattern))) {
        return 'Ethernet';
      }
    }
    return 'Unknown';
  }
  
  /**
   * Extract device status
   */
  extractDeviceStatus(cellTexts, $, row) {
    const statusPatterns = {
      'connected': ['connected', 'online', 'active'],
      'disconnected': ['disconnected', 'offline', 'inactive']
    };
    
    // Check cell text content
    for (const text of cellTexts) {
      const lowerText = text.toLowerCase();
      for (const [status, patterns] of Object.entries(statusPatterns)) {
        if (patterns.some(pattern => lowerText.includes(pattern))) {
          return status;
        }
      }
    }
    
    // Check for status indicators in the row (icons, colors, etc.)
    const statusIcons = $(row).find('.status-icon, .connection-status, img[src*="status"]');
    if (statusIcons.length > 0) {
      const iconSrc = statusIcons.first().attr('src') || '';
      if (iconSrc.includes('green') || iconSrc.includes('online')) {
        return 'connected';
      }
      if (iconSrc.includes('red') || iconSrc.includes('offline')) {
        return 'disconnected';
      }
    }
    
    return 'connected'; // Default assumption
  }
  
  /**
   * Extract blocked status
   */
  extractBlockedStatus($, row) {
    const blockedIndicators = [
      '.blocked', '.disabled', '.paused',
      'input[type="checkbox"]:checked',
      'select option[selected]:contains("Block")'
    ];
    
    for (const indicator of blockedIndicators) {
      if ($(row).find(indicator).length > 0) {
        return true;
      }
    }
    
    // Check text content for blocked indicators
    const rowText = $(row).text().toLowerCase();
    return rowText.includes('blocked') || rowText.includes('paused');
  }
  
  /**
   * Generate unique device ID
   */
  generateDeviceId(cellTexts) {
    const mac = this.extractMACAddress(cellTexts);
    if (mac) {
      return mac.replace(/[:-]/g, '').toLowerCase();
    }
    
    const ip = this.extractIPAddress(cellTexts);
    if (ip) {
      return `ip_${ip.replace(/\./g, '_')}`;
    }
    
    return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Utility: Check if text is IP address
   */
  isIPAddress(text) {
    const ipPattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipPattern.test(text);
  }
  
  /**
   * Utility: Check if text is MAC address
   */
  isMACAddress(text) {
    const macPattern = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    return macPattern.test(text);
  }
  
  /**
   * Fallback parsing when standard selectors don't work
   */
  fallbackDeviceParsing($, html) {
    logger.info('Attempting fallback device parsing');
    
    // Look for MAC addresses in the entire HTML
    const macPattern = /([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})/g;
    const ipPattern = /(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)/g;
    
    const macs = html.match(macPattern) || [];
    const ips = html.match(ipPattern) || [];
    
    const devices = [];
    const processedMacs = new Set();
    
    macs.forEach((mac, index) => {
      if (!processedMacs.has(mac)) {
        processedMacs.add(mac);
        
        const device = {
          id: mac.replace(/[:-]/g, '').toLowerCase(),
          name: `Device ${index + 1}`,
          ip: ips[index] || null,
          mac: mac,
          connectionType: 'Unknown',
          status: 'connected',
          lastSeen: new Date().toISOString(),
          isBlocked: false
        };
        
        devices.push(device);
      }
    });
    
    logger.info(`Fallback parsing found ${devices.length} devices`);
    return devices;
  }
  
  /**
   * Parse block/unblock form data
   */
  parseBlockingForm(html) {
    try {
      const $ = cheerio.load(html);
      const formData = {};
      
      // Extract form fields and CSRF tokens
      $('form input[type="hidden"]').each((i, elem) => {
        const name = $(elem).attr('name');
        const value = $(elem).attr('value');
        if (name && value) {
          formData[name] = value;
        }
      });
      
      // Find the form action URL
      const formAction = $('form').attr('action');
      if (formAction) {
        formData._formAction = formAction;
      }
      
      return formData;
    } catch (error) {
      logger.error('Error parsing blocking form:', error.message);
      return {};
    }
  }
}

module.exports = new HTMLParser();
```

## routes/devices.js

```javascript
const express = require('express');
const router = express.Router();
const routerService = require('../services/routerService');
const htmlParser = require('../services/htmlParser');
const { validateDevice, validateBlockAction } = require('../utils/validation');
const logger = require('../utils/logger');

// Middleware to check authentication
const requireAuth = (req, res, next) => {
  if (!req.session.routerCookies) {
    return res.status(401).json({ error: 'Router authentication required' });
  }
  next();
};

/**
 * GET /api/devices - Fetch all connected devices
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    logger.info('Fetching connected devices');
    
    const authHeaders = routerService.getAuthHeaders(req.session);
    const response = await routerService.client.get(
      process.env.ROUTER_DEVICES_PATH || '/connected_devices_computers.php',
      { headers: authHeaders }
    );
    
    if (response.status !== 200) {
      return res.status(500).json({ error: 'Failed to fetch devices from router' });
    }
    
    const devices = htmlParser.parseConnectedDevices(response.data);
    
    res.json({
      success: true,
      devices,
      count: devices.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching devices:', error.message);
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

/**
 * POST /api/devices/:deviceId/block - Block a device
 */
router.post('/:deviceId/block', requireAuth, validateBlockAction, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { duration, schedule } = req.body;
    
    logger.info(`Blocking device: ${deviceId}`);
    
    const authHeaders = routerService.getAuthHeaders(req.session);
    
    // First, get the blocking form to extract necessary form data
    const formResponse = await routerService.client.get(
      process.env.ROUTER_BLOCK_PATH || '/user_block_device.php',
      { headers: authHeaders }
    );
    
    const formData = htmlParser.parseBlockingForm(formResponse.data);
    
    // Prepare block request data
    const blockData = new URLSearchParams({
      ...formData,
      device_id: deviceId,
      action: 'block',
      duration: duration || 'permanent',
      schedule: schedule ? JSON.stringify(schedule) : undefined
    });
    
    const blockResponse = await routerService.client.post(
      process.env.ROUTER_BLOCK_PATH || '/user_block_device.php',
      blockData,
      {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    if (blockResponse.status === 200) {
      logger.info(`Successfully blocked device: ${deviceId}`);
      res.json({
        success: true,
        message: 'Device blocked successfully',
        deviceId,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({ error: 'Failed to block device' });
    }
  } catch (error) {
    logger.error('Error blocking device:', error.message);
    res.status(500).json({ error: 'Failed to block device' });
  }
});

/**
 * POST /api/devices/:deviceId/unblock - Unblock a device
 */
router.post('/:deviceId/unblock', requireAuth, async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    logger.info(`Unblocking device: ${deviceId}`);
    
    const authHeaders = routerService.getAuthHeaders(req.session);
    
    // Get the blocking form
    const formResponse = await routerService.client.get(
      process.env.ROUTER_BLOCK_PATH || '/user_block_device.php',
      { headers: authHeaders }
    );
    
    const formData = htmlParser.parseBlockingForm(formResponse.data);
    
    // Prepare unblock request data
    const unblockData = new URLSearchParams({
      ...formData,
      device_id: deviceId,
      action: 'unblock'
    });
    
    const unblockResponse = await routerService.client.post(
      process.env.ROUTER_BLOCK_PATH || '/user_block_device.php',
      unblockData,
      {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    if (unblockResponse.status === 200) {
      logger.info(`Successfully unblocked device: ${deviceId}`);
      res.json({
        success: true,
        message: 'Device unblocked successfully',
        deviceId,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({ error: 'Failed to unblock device' });
    }
  } catch (error) {
    logger.error('Error unblocking device:', error.message);
    res.status(500).json({ error: 'Failed to unblock device' });
  }
});

/**
 * PUT /api/devices/:deviceId/rename - Rename a device
 */
router.put('/:deviceId/rename', requireAuth, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { name } = req.body;
    
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Device name is required' });
    }
    
    logger.info(`Renaming device ${deviceId} to: ${name}`);
    
    // Store the custom name in session (since most routers don't support renaming via API)
    if (!req.session.deviceNames) {
      req.session.deviceNames = {};
    }
    req.session.deviceNames[deviceId] = name.trim();
    
    res.json({
      success: true,
      message: 'Device renamed successfully',
      deviceId,
      name: name.trim(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error renaming device:', error.message);
    res.status(500).json({ error: 'Failed to rename device' });
  }
});

/**
 * GET /api/devices/custom-names - Get custom device names
 */
router.get('/custom-names', requireAuth, (req, res) => {
  res.json({
    success: true,
    deviceNames: req.session.deviceNames || {},
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
```