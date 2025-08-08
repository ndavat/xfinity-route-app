import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { mockDevices, MockDevice } from './mockData';

// Security: Load test environment configuration
const MOCK_SERVER_PORT = process.env.MOCK_SERVER_PORT ? parseInt(process.env.MOCK_SERVER_PORT, 10) : 8081;
const MOCK_SERVER_HOST = process.env.MOCK_SERVER_HOST || '127.0.0.1';

// Security: Validate test environment
if (process.env.NODE_ENV !== 'test') {
  console.warn('⚠️  Mock router server should only run in test environment');
}

// Log startup configuration
console.log('🔧 Mock Router Server Configuration:');
console.log(`   Host: ${MOCK_SERVER_HOST}`);
console.log(`   Port: ${MOCK_SERVER_PORT}`);
console.log(`   Environment: ${process.env.NODE_ENV}`);
console.log(`   ADB Reverse Support: ${process.env.ANDROID_USE_ADB_REVERSE === 'true' ? 'Enabled' : 'Disabled'}`);
console.log(`   iOS Localhost Support: ${process.env.IOS_USE_LOCALHOST === 'true' ? 'Enabled' : 'Disabled'}`);
console.log('📱 For Android testing: run `adb reverse tcp:8081 tcp:' + MOCK_SERVER_PORT + '`');

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Store active connections for broadcasting
const connectedClients = new Set<WebSocket>();

// WebSocket handling for real-time device updates
wss.on('connection', (ws: WebSocket) => {
  console.log('WebSocket client connected');
  connectedClients.add(ws);

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    connectedClients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    connectedClients.delete(ws);
  });

  // Send initial device state
  ws.send(JSON.stringify({
    type: 'devices',
    data: mockDevices
  }));
});

// Broadcast function for real-time updates
function broadcast(message: any) {
  const messageStr = JSON.stringify(message);
  connectedClients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(messageStr);
    }
  });
}

// Login endpoint - simulates router login
app.post('/index.php', (req, res) => {
  const { username, password } = req.body;
  
  console.log('Login attempt:', { username, password });
  
  // Mock authentication - accept admin/password1 or any credentials in test mode
  if ((username === 'admin' && password === 'password1') || process.env.NODE_ENV === 'test') {
    res.status(200).json({
      success: true,
      message: 'Login successful',
      sessionId: 'mock-session-' + Date.now(),
      redirectUrl: '/at_a_glance.php'
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
});

// At a glance endpoint - router overview
app.get('/at_a_glance.php', (req, res) => {
  res.json({
    routerStatus: 'online',
    internetStatus: 'connected',
    wifiStatus: 'active',
    connectedDevices: mockDevices.filter(d => d.isOnline).length,
    totalDevices: mockDevices.length,
    uptime: '2 days, 14 hours',
    signalStrength: -45
  });
});

// Connected devices endpoint
app.get('/connected_devices_computers.php', (req, res) => {
  const onlineDevices = mockDevices.filter(device => device.isOnline);
  
  res.json({
    devices: onlineDevices,
    total: onlineDevices.length,
    timestamp: new Date().toISOString()
  });
});

// All devices endpoint (managed devices)
app.get('/managed_devices.php', (req, res) => {
  res.json({
    devices: mockDevices,
    total: mockDevices.length,
    timestamp: new Date().toISOString()
  });
});

// Get devices endpoint (alternative format)
app.get('/devices', (req, res) => {
  res.json(mockDevices);
});

// Connection status endpoint
app.get('/connection_status.php', (req, res) => {
  res.json({
    status: 'connected',
    uptime: 248400, // seconds
    downloadSpeed: 95.2,
    uploadSpeed: 12.1,
    ping: 15,
    signalStrength: -45
  });
});

// Block device endpoint
app.post('/block/:mac', (req, res) => {
  const { mac } = req.params;
  const device = mockDevices.find(d => d.mac.toLowerCase() === mac.toLowerCase());
  
  if (!device) {
    return res.status(404).json({
      success: false,
      message: 'Device not found'
    });
  }

  device.isBlocked = true;
  device.isOnline = false; // Blocked devices go offline
  
  // Broadcast device update to WebSocket clients
  broadcast({
    type: 'deviceUpdate',
    data: {
      mac: device.mac,
      isBlocked: device.isBlocked,
      isOnline: device.isOnline
    }
  });

  res.json({
    success: true,
    message: `Device ${device.customName} has been blocked`,
    device: device
  });
});

// Unblock device endpoint
app.post('/unblock/:mac', (req, res) => {
  const { mac } = req.params;
  const device = mockDevices.find(d => d.mac.toLowerCase() === mac.toLowerCase());
  
  if (!device) {
    return res.status(404).json({
      success: false,
      message: 'Device not found'
    });
  }

  device.isBlocked = false;
  device.isOnline = true; // Unblocked devices come back online
  
  // Broadcast device update to WebSocket clients
  broadcast({
    type: 'deviceUpdate',
    data: {
      mac: device.mac,
      isBlocked: device.isBlocked,
      isOnline: device.isOnline
    }
  });

  res.json({
    success: true,
    message: `Device ${device.customName} has been unblocked`,
    device: device
  });
});

// Update device name endpoint
app.post('/device/:mac/name', (req, res) => {
  const { mac } = req.params;
  const { name } = req.body;
  const device = mockDevices.find(d => d.mac.toLowerCase() === mac.toLowerCase());
  
  if (!device) {
    return res.status(404).json({
      success: false,
      message: 'Device not found'
    });
  }

  device.customName = name;
  
  // Broadcast device update to WebSocket clients
  broadcast({
    type: 'deviceUpdate',
    data: {
      mac: device.mac,
      customName: device.customName
    }
  });

  res.json({
    success: true,
    message: 'Device name updated',
    device: device
  });
});

// Restore/reboot endpoint
app.post('/restore_reboot.php', (req, res) => {
  const { action } = req.body;
  
  if (action === 'reboot') {
    // Simulate reboot - all devices temporarily go offline
    mockDevices.forEach(device => {
      device.isOnline = false;
    });
    
    broadcast({
      type: 'routerReboot',
      data: { message: 'Router is rebooting...' }
    });
    
    // Simulate devices coming back online after 30 seconds
    setTimeout(() => {
      mockDevices.forEach(device => {
        if (!device.isBlocked) {
          device.isOnline = true;
        }
      });
      
      broadcast({
        type: 'routerOnline',
        data: { message: 'Router is back online' }
      });
    }, 30000);
    
    res.json({
      success: true,
      message: 'Router reboot initiated'
    });
  } else {
    res.status(400).json({
      success: false,
      message: 'Invalid action'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Simulate periodic device updates (for testing real-time features)
function simulateDeviceUpdates() {
  setInterval(() => {
    const randomDevice = mockDevices[Math.floor(Math.random() * mockDevices.length)];
    if (randomDevice && randomDevice.networkDetails) {
      // Simulate signal strength changes
      const currentSignal = randomDevice.networkDetails.signalStrength || -60;
      const newSignal = currentSignal + (Math.random() - 0.5) * 10;
      randomDevice.networkDetails.signalStrength = Math.max(-90, Math.min(-30, newSignal));
      randomDevice.networkDetails.rssiLevel = `${Math.round(newSignal)} dBm`;
      randomDevice.networkDetails.lastSeen = new Date().toISOString();
      
      broadcast({
        type: 'deviceUpdate',
        data: {
          mac: randomDevice.mac,
          networkDetails: randomDevice.networkDetails
        }
      });
    }
  }, 10000); // Update every 10 seconds
}

// Server startup function
export function startMockServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    server.listen(MOCK_SERVER_PORT, MOCK_SERVER_HOST, () => {
      console.log(`\n🚀 Mock Router Server started successfully!`);
      console.log(`   📍 Server URL: http://${MOCK_SERVER_HOST}:${MOCK_SERVER_PORT}`);
      console.log(`   🔌 WebSocket URL: ws://${MOCK_SERVER_HOST}:${MOCK_SERVER_PORT}`);
      console.log(`   🛡️  Security: Test environment only`);
      
      // Start simulated device updates if enabled
      if (process.env.ENABLE_MOCK_DEVICE_UPDATES === 'true') {
        console.log(`   📊 Device simulation: Enabled`);
        simulateDeviceUpdates();
      }
      
      console.log(`\n📋 Available endpoints:`);
      console.log(`   POST /index.php                    - Router login`);
      console.log(`   GET  /at_a_glance.php              - Router overview`);
      console.log(`   GET  /connected_devices_computers.php - Connected devices`);
      console.log(`   GET  /managed_devices.php          - All managed devices`);
      console.log(`   GET  /connection_status.php        - Connection status`);
      console.log(`   POST /block/:mac                   - Block device`);
      console.log(`   POST /unblock/:mac                 - Unblock device`);
      console.log(`   POST /device/:mac/name             - Update device name`);
      console.log(`   POST /restore_reboot.php           - Reboot router`);
      console.log(`   GET  /health                       - Health check`);
      console.log(`\n`);
      
      resolve();
    });
    
    server.on('error', (error) => {
      console.error('❌ Failed to start mock server:', error);
      reject(error);
    });
  });
}

// Server shutdown function
export function stopMockServer(): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => {
      console.log('🛑 Mock Router Server stopped');
      resolve();
    });
  });
}

// Get server configuration
export function getServerConfig() {
  return {
    host: MOCK_SERVER_HOST,
    port: MOCK_SERVER_PORT,
    baseUrl: `http://${MOCK_SERVER_HOST}:${MOCK_SERVER_PORT}`,
    wsUrl: `ws://${MOCK_SERVER_HOST}:${MOCK_SERVER_PORT}`,
    isRunning: server.listening,
  };
}

export { app, server, broadcast };
export default app;
