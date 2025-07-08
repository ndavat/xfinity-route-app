import AsyncStorage from '@react-native-async-storage/async-storage';
import { axiosInstance } from '../../utils/axiosConfig';
import { ErrorInfo, getLastError, clearLastError } from '../../utils/ErrorLogger';
import { 
  getCurrentNetworkState, 
  getStoredNetworkLogs, 
  refreshNetworkState,
  clearNetworkLogs 
} from './NetworkMonitor';
import {
  runDiagnostics,
  comprehensiveConnectionTest,
  testBasicConnectivity,
  testProtocols,
  testEndpoints,
  testAuthentication,
  detectRouterModel,
  checkAPIVersion
} from './ConnectionDiagnostics';
import { Config } from '../../utils/config';

// Type definitions
interface DebugSession {
  id: string;
  timestamp: string;
  description: string;
  routerIP: string;
  networkState: any;
  diagnosticsResult: any;
  lastError: ErrorInfo | null;
  networkLogs: any[];
  endpoints: any;
  notes: string[];
}

interface SystemHealth {
  network: {
    isConnected: boolean;
    type: string;
    details: any;
  };
  router: {
    isReachable: boolean;
    responseTime?: number;
    lastError?: string;
  };
  authentication: {
    isAuthenticated: boolean;
    lastAttempt?: string;
    sessionValid?: boolean;
  };
  api: {
    workingEndpoints: string[];
    failedEndpoints: string[];
    preferredProtocol: 'http' | 'https';
  };
  app: {
    debugMode: boolean;
    version: string;
    environment: string;
  };
}

// Storage keys
const DEBUG_SESSIONS_KEY = 'debug_sessions';
const CURRENT_SESSION_KEY = 'current_debug_session';

/**
 * Discover available router API endpoints
 */
export const discoverEndpoints = async (routerIP: string): Promise<{[key: string]: any}> => {
  console.log('🔍 Discovering router API endpoints...');
  
  const commonEndpoints = [
    // Authentication & Session
    '/login',
    '/check.php',
    '/logout',
    '/api/auth',
    '/api/login',
    '/api/session',
    
    // Device Management
    '/devices',
    '/api/devices',
    '/api/v1/devices',
    '/connected_devices.php',
    '/network/devices',
    '/status/devices',
    
    // Router Information
    '/status',
    '/api/status',
    '/system/info',
    '/api/system/info',
    '/network_setup.php',
    '/connection_status.php',
    '/router_status.php',
    
    // Network Configuration
    '/wifi',
    '/api/wifi',
    '/network',
    '/api/network',
    '/firewall',
    '/api/firewall',
    '/port_forwarding',
    '/api/port_forwarding',
    
    // Diagnostics
    '/diagnostics',
    '/api/diagnostics',
    '/ping',
    '/api/ping',
    '/traceroute',
    '/api/traceroute',
    
    // Legacy/Common Router Endpoints
    '/cgi-bin/status',
    '/xml/getter.xml',
    '/RgConnect.asp',
    '/admin/status',
    '/setup.cgi',
    '/Status.htm',
    '/BasicSettings.htm',
    
    // Admin/Management
    '/admin',
    '/management',
    '/settings',
    '/config',
    '/backup',
    '/restore',
    '/reboot',
    '/factory_reset'
  ];

  const endpointResults: {[key: string]: any} = {};
  
  // Test both HTTP and HTTPS
  const protocols = ['http', 'https'];
  
  for (const protocol of protocols) {
    console.log(`Testing ${protocol.toUpperCase()} endpoints...`);
    
    for (const endpoint of commonEndpoints) {
      const url = `${protocol}://${routerIP}${endpoint}`;
      
      try {
        const response = await axiosInstance.get(url, {
          timeout: 3000,
          validateStatus: (status) => status >= 200 && status < 500,
          httpsAgent: protocol === 'https' ? {
            rejectUnauthorized: false
          } : undefined
        });
        
        endpointResults[`${protocol}${endpoint}`] = {
          status: response.status,
          statusText: response.statusText,
          contentType: response.headers['content-type'],
          size: response.data.length,
          accessible: true,
          requiresAuth: response.status === 401 || response.status === 403,
          redirects: response.status >= 300 && response.status < 400
        };
        
        console.log(`✓ ${protocol.toUpperCase()} ${endpoint}: ${response.status}`);
        
      } catch (error: any) {
        endpointResults[`${protocol}${endpoint}`] = {
          accessible: false,
          error: error.message,
          code: error.code,
          status: error.response?.status
        };
        
        // Only log interesting failures
        if (error.code !== 'ECONNREFUSED' && error.response?.status !== 404) {
          console.log(`✗ ${protocol.toUpperCase()} ${endpoint}: ${error.message}`);
        }
      }
    }
  }
  
  console.log('✓ Endpoint discovery completed');
  return endpointResults;
};

/**
 * Get current system health status
 */
export const getSystemHealth = async (): Promise<SystemHealth> => {
  console.log('🏥 Checking system health...');
  
  const health: SystemHealth = {
    network: {
      isConnected: false,
      type: 'unknown',
      details: {}
    },
    router: {
      isReachable: false
    },
    authentication: {
      isAuthenticated: false
    },
    api: {
      workingEndpoints: [],
      failedEndpoints: [],
      preferredProtocol: 'http'
    },
    app: {
      debugMode: Config.app.debugMode,
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    }
  };

  // Check network state
  try {
    const networkState = getCurrentNetworkState() || await refreshNetworkState();
    if (networkState) {
      health.network = {
        isConnected: networkState.isConnected,
        type: networkState.type,
        details: networkState.details
      };
    }
  } catch (error) {
    console.error('Failed to get network state:', error);
  }

  // Check router connectivity
  try {
    const routerConfig = await AsyncStorage.getItem('router_config');
    const config = routerConfig ? JSON.parse(routerConfig) : { ip: '10.0.0.1' };
    
    const startTime = Date.now();
    const isReachable = await testBasicConnectivity(config.ip);
    const responseTime = Date.now() - startTime;
    
    health.router = {
      isReachable,
      responseTime: isReachable ? responseTime : undefined
    };
  } catch (error: any) {
    health.router = {
      isReachable: false,
      lastError: error.message
    };
  }

  return health;
};

/**
 * Run comprehensive debug session
 */
export const runDebugSession = async (
  routerIP: string, 
  credentials?: {username: string, password: string},
  description: string = 'Automated debug session'
): Promise<DebugSession> => {
  console.log('🐛 Starting comprehensive debug session...');
  
  const sessionId = `debug_${Date.now()}`;
  const startTime = new Date().toISOString();
  
  const session: DebugSession = {
    id: sessionId,
    timestamp: startTime,
    description,
    routerIP,
    networkState: null,
    diagnosticsResult: null,
    lastError: null,
    networkLogs: [],
    endpoints: {},
    notes: []
  };

  try {
    // 1. Get current network state
    console.log('📡 Checking network state...');
    session.networkState = getCurrentNetworkState() || await refreshNetworkState();
    session.notes.push(`Network: ${session.networkState?.isConnected ? 'Connected' : 'Disconnected'} (${session.networkState?.type})`);

    // 2. Get network logs
    console.log('📋 Collecting network logs...');
    session.networkLogs = await getStoredNetworkLogs();
    session.notes.push(`Network logs: ${session.networkLogs.length} entries`);

    // 3. Get last error
    console.log('❌ Checking last error...');
    session.lastError = await getLastError();
    if (session.lastError) {
      session.notes.push(`Last error: ${session.lastError.message} (${session.lastError.context})`);
    }

    // 4. Run diagnostics
    console.log('🔍 Running connection diagnostics...');
    try {
      session.diagnosticsResult = await runDiagnostics(routerIP, credentials);
      session.notes.push(`Diagnostics: ${session.diagnosticsResult.basicConnectivity ? 'Basic connectivity OK' : 'Connectivity failed'}`);
    } catch (error: any) {
      session.notes.push(`Diagnostics failed: ${error.message}`);
    }

    // 5. Discover endpoints
    console.log('🔍 Discovering endpoints...');
    try {
      session.endpoints = await discoverEndpoints(routerIP);
      const accessibleEndpoints = Object.entries(session.endpoints)
        .filter(([_, result]: [string, any]) => result.accessible)
        .length;
      session.notes.push(`Endpoints: ${accessibleEndpoints} accessible out of ${Object.keys(session.endpoints).length} tested`);
    } catch (error: any) {
      session.notes.push(`Endpoint discovery failed: ${error.message}`);
    }

    console.log('✅ Debug session completed successfully');
    
    // Store the session
    await storeDebugSession(session);
    
  } catch (error: any) {
    console.error('Debug session failed:', error);
    session.notes.push(`Session failed: ${error.message}`);
  }

  return session;
};

/**
 * Store debug session
 */
export const storeDebugSession = async (session: DebugSession): Promise<void> => {
  try {
    // Get existing sessions
    const existingSessions = await getStoredDebugSessions();
    
    // Add new session
    existingSessions.push(session);
    
    // Keep only last 10 sessions
    const recentSessions = existingSessions.slice(-10);
    
    // Store updated sessions
    await AsyncStorage.setItem(DEBUG_SESSIONS_KEY, JSON.stringify(recentSessions));
    await AsyncStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(session));
    
    console.log(`Stored debug session: ${session.id}`);
  } catch (error) {
    console.error('Failed to store debug session:', error);
  }
};

/**
 * Get stored debug sessions
 */
export const getStoredDebugSessions = async (): Promise<DebugSession[]> => {
  try {
    const sessions = await AsyncStorage.getItem(DEBUG_SESSIONS_KEY);
    return sessions ? JSON.parse(sessions) : [];
  } catch (error) {
    console.error('Failed to get stored debug sessions:', error);
    return [];
  }
};

/**
 * Get current debug session
 */
export const getCurrentDebugSession = async (): Promise<DebugSession | null> => {
  try {
    const session = await AsyncStorage.getItem(CURRENT_SESSION_KEY);
    return session ? JSON.parse(session) : null;
  } catch (error) {
    console.error('Failed to get current debug session:', error);
    return null;
  }
};

/**
 * Clear all debug data
 */
export const clearAllDebugData = async (): Promise<void> => {
  try {
    await Promise.all([
      AsyncStorage.removeItem(DEBUG_SESSIONS_KEY),
      AsyncStorage.removeItem(CURRENT_SESSION_KEY),
      clearLastError(),
      clearNetworkLogs()
    ]);
    console.log('All debug data cleared');
  } catch (error) {
    console.error('Failed to clear debug data:', error);
  }
};

/**
 * Generate debug report
 */
export const generateDebugReport = async (session?: DebugSession): Promise<string> => {
  const currentSession = session || await getCurrentDebugSession();
  
  if (!currentSession) {
    return 'No debug session available. Please run a debug session first.';
  }

  const report = `
# Xfinity Router App Debug Report
Generated: ${new Date().toISOString()}
Session ID: ${currentSession.id}
Description: ${currentSession.description}

## Summary
Router IP: ${currentSession.routerIP}
Session Time: ${currentSession.timestamp}
Notes: ${currentSession.notes.join(', ')}

## Network State
Connected: ${currentSession.networkState?.isConnected ? 'Yes' : 'No'}
Type: ${currentSession.networkState?.type || 'Unknown'}
Details: ${JSON.stringify(currentSession.networkState?.details || {}, null, 2)}

## Router Diagnostics
${currentSession.diagnosticsResult ? `
Basic Connectivity: ${currentSession.diagnosticsResult.basicConnectivity ? '✅ PASS' : '❌ FAIL'}
Protocol Support: ${JSON.stringify(currentSession.diagnosticsResult.protocolSupport, null, 2)}
Authentication: ${currentSession.diagnosticsResult.authentication ? '✅ PASS' : '❌ FAIL'}
API Version: ${currentSession.diagnosticsResult.apiVersion || 'Unknown'}
Router Model: ${currentSession.diagnosticsResult.routerModel?.model || 'Unknown'}
Errors: ${currentSession.diagnosticsResult.errors.length > 0 ? currentSession.diagnosticsResult.errors.join(', ') : 'None'}
` : 'Diagnostics not available'}

## Endpoint Discovery
${Object.keys(currentSession.endpoints).length > 0 ? `
Tested Endpoints: ${Object.keys(currentSession.endpoints).length}
Accessible: ${Object.entries(currentSession.endpoints).filter(([_, result]: [string, any]) => result.accessible).length}

Accessible Endpoints:
${Object.entries(currentSession.endpoints)
  .filter(([_, result]: [string, any]) => result.accessible)
  .map(([endpoint, result]: [string, any]) => `- ${endpoint}: ${result.status} (${result.contentType})`)
  .join('\n')}
` : 'No endpoint data available'}

## Last Error
${currentSession.lastError ? `
Message: ${currentSession.lastError.message}
Context: ${currentSession.lastError.context}
Status: ${currentSession.lastError.status || 'N/A'}
URL: ${currentSession.lastError.config?.url || 'N/A'}
Time: ${currentSession.lastError.timestamp}
` : 'No recent errors'}

## Network Logs
Recent entries: ${currentSession.networkLogs.length}
${currentSession.networkLogs.slice(-5).map((log: any) => 
  `- ${log.timestamp}: ${log.event} (${log.currentState.isConnected ? 'Connected' : 'Disconnected'})`
).join('\n')}

## Recommendations
${generateRecommendations(currentSession)}
`;

  return report.trim();
};

/**
 * Generate recommendations based on debug session
 */
const generateRecommendations = (session: DebugSession): string => {
  const recommendations: string[] = [];

  // Network connectivity recommendations
  if (!session.networkState?.isConnected) {
    recommendations.push('- Check device network connection');
    recommendations.push('- Ensure device is connected to the same network as the router');
  }

  // Router connectivity recommendations
  if (session.diagnosticsResult && !session.diagnosticsResult.basicConnectivity) {
    recommendations.push('- Verify router IP address is correct');
    recommendations.push('- Check if router is powered on and responsive');
    recommendations.push('- Try common router IPs: 192.168.1.1, 192.168.0.1, 10.0.0.1');
  }

  // Authentication recommendations
  if (session.diagnosticsResult && !session.diagnosticsResult.authentication) {
    recommendations.push('- Verify router username and password');
    recommendations.push('- Check if router requires different authentication method');
  }

  // Protocol recommendations
  if (session.diagnosticsResult?.protocolSupport?.https?.success && !session.diagnosticsResult?.protocolSupport?.http?.success) {
    recommendations.push('- Router may require HTTPS connection');
  }

  // Environment-specific recommendations
  if (typeof (globalThis as any).window !== 'undefined' && (globalThis as any).window.location?.protocol === 'https:') {
    recommendations.push('- Use mobile app or local development server for router connection');
    recommendations.push('- HTTPS to HTTP requests are blocked in browser environments');
  }

  return recommendations.length > 0 ? recommendations.join('\n') : '- No specific recommendations at this time';
};

/**
 * Export all debugging utilities
 */
export default {
  discoverEndpoints,
  getSystemHealth,
  runDebugSession,
  storeDebugSession,
  getStoredDebugSessions,
  getCurrentDebugSession,
  clearAllDebugData,
  generateDebugReport
};
