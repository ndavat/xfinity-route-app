# 🌐 Browser Authentication Feature

## 🎯 Overview

The Browser Authentication feature allows users to authenticate with their router through the router's web interface and extract authentication tokens for use in the mobile app. This provides secure access to protected router features and APIs.

## ✨ Features

### 🔐 **Authentication Methods**
1. **Automatic Token Extraction** - Attempts to automatically extract tokens from router responses
2. **Manual Token Entry** - Users can manually enter tokens found in browser developer tools
3. **Browser Integration** - Opens router login page directly in device browser
4. **Token Management** - Secure storage and management of authentication tokens

### 🛡️ **Security Features**
- **Token Expiration** - Automatic token expiration handling (24 hours default)
- **Secure Storage** - Tokens stored securely using AsyncStorage
- **Router-Specific Tokens** - Tokens are tied to specific router IP addresses
- **Automatic Cleanup** - Invalid tokens are automatically cleared

### 🎨 **User Experience**
- **Visual Status Indicators** - Clear authentication status display
- **Step-by-Step Guidance** - Intuitive authentication flow
- **Error Handling** - Comprehensive error messages and recovery
- **One-Click Access** - Easy browser login integration

## 🏗️ Architecture

### **Core Services**

#### **BrowserAuthService.ts**
```typescript
// Main authentication service
class BrowserAuthService {
  // Open router login in browser
  static async openRouterLogin(routerIP: string): Promise<void>
  
  // Extract tokens from router responses
  static extractAuthToken(html: string, cookies: string[]): AuthToken | null
  
  // Attempt automatic token extraction
  static async attemptTokenExtraction(routerIP: string, username: string, password: string): Promise<AuthResult>
  
  // Token management
  static async saveAuthToken(token: AuthToken): Promise<void>
  static async loadAuthToken(): Promise<AuthToken | null>
  static async clearAuthToken(): Promise<void>
  
  // Authentication headers for API calls
  static async getAuthHeaders(routerIP?: string): Promise<Record<string, string>>
}
```

#### **Enhanced RouterConnectionService.ts**
```typescript
// New authenticated request method
static async makeAuthenticatedRequest(
  url: string, 
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  data?: any,
  routerIP?: string
): Promise<any>

// Authentication status checking
static async checkAuthenticationStatus(routerIP: string): Promise<{
  requiresAuth: boolean;
  hasValidToken: boolean;
  canProceed: boolean;
  message: string;
}>
```

### **UI Components**

#### **BrowserAuthModal.tsx**
- **Multi-step authentication flow**
- **Browser integration**
- **Manual token entry**
- **Auto-extraction attempts**
- **Success/error handling**

#### **Enhanced HomeScreen.tsx**
- **Authentication status display**
- **Login/logout buttons**
- **Token management UI**
- **Visual status indicators**

## 🚀 How It Works

### **Authentication Flow**

1. **Status Check**
   ```typescript
   // Check if router requires authentication
   const authStatus = await RouterConnectionService.checkAuthenticationStatus(routerIP);
   ```

2. **Browser Login**
   ```typescript
   // Open router login page
   await BrowserAuthService.openRouterLogin(routerIP);
   ```

3. **Token Extraction**
   ```typescript
   // Automatic extraction
   const result = await BrowserAuthService.attemptTokenExtraction(routerIP, username, password);
   
   // Or manual entry
   const result = await BrowserAuthService.setManualToken(tokenString, routerIP);
   ```

4. **Authenticated Requests**
   ```typescript
   // Use token for API calls
   const response = await RouterConnectionService.makeAuthenticatedRequest(
     `http://${routerIP}/api/status`,
     'GET',
     undefined,
     routerIP
   );
   ```

### **Token Patterns Supported**

The service recognizes various token patterns:
- **Xfinity/Comcast**: `token`, `sessionToken`, `authToken`, `X-Xsrf-Token`
- **Generic**: `csrf_token`, `session_id`, `auth_key`
- **Cookie-based**: Session cookies and CSRF tokens
- **Custom**: Extensible pattern matching

## 🎨 User Interface

### **Authentication Status Card**
```jsx
{isConnected && (
  <View style={styles.authCard}>
    <View style={styles.authHeader}>
      <MaterialIcons 
        name={hasAuthToken ? "verified-user" : "security"} 
        size={20} 
        color={hasAuthToken ? "#4caf50" : "#ff9800"} 
      />
      <Text style={styles.authTitle}>
        Authentication: {hasAuthToken ? 'Authenticated' : 'Not Authenticated'}
      </Text>
    </View>
    
    <View style={styles.authActions}>
      {!hasAuthToken ? (
        <TouchableOpacity onPress={handleOpenBrowserAuth}>
          <Text>Login via Browser</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={handleClearAuthToken}>
          <Text>Clear Token</Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
)}
```

### **Browser Authentication Modal**
- **Instructions Screen**: Step-by-step guidance
- **Browser Integration**: One-click router login
- **Auto-Extraction**: Automatic token detection
- **Manual Entry**: Developer tools guidance
- **Success Screen**: Confirmation and next steps

## 🔧 Configuration

### **Token Storage**
```typescript
interface AuthToken {
  token: string;           // Main authentication token
  sessionId?: string;      // Session identifier
  csrfToken?: string;      // CSRF protection token
  expires?: number;        // Expiration timestamp
  routerIP: string;        // Associated router IP
  timestamp: number;       // Creation timestamp
}
```

### **Authentication Headers**
```typescript
const headers = {
  'Authorization': `Bearer ${token.token}`,
  'X-Auth-Token': token.token,
  'X-Session-ID': token.sessionId,      // If available
  'X-CSRF-Token': token.csrfToken,      // If available
  'X-Xsrf-Token': token.csrfToken       // Alternative CSRF header
};
```

## 📱 Usage Examples

### **Check Authentication Status**
```typescript
const authStatus = await RouterConnectionService.checkAuthenticationStatus('10.0.0.1');
console.log(authStatus.message); // "Authentication required - please login through browser"
```

### **Open Browser Login**
```typescript
await BrowserAuthService.openRouterLogin('10.0.0.1');
// Opens http://10.0.0.1 in device browser
```

### **Make Authenticated API Call**
```typescript
const response = await RouterConnectionService.makeAuthenticatedRequest(
  'http://10.0.0.1/api/devices',
  'GET',
  undefined,
  '10.0.0.1'
);
```

### **Manual Token Entry**
```typescript
const result = await BrowserAuthService.setManualToken(
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  '10.0.0.1'
);
```

## 🛡️ Security Considerations

### **Token Security**
- **Secure Storage**: Tokens stored in AsyncStorage (encrypted on device)
- **Expiration**: Automatic token expiration (24 hours default)
- **Validation**: Token validation before each use
- **Cleanup**: Automatic cleanup of invalid tokens

### **Network Security**
- **HTTPS Support**: Ready for HTTPS router interfaces
- **CSRF Protection**: Automatic CSRF token handling
- **Session Management**: Proper session cookie handling

### **Error Handling**
- **401/403 Responses**: Automatic token cleanup on auth failure
- **Network Errors**: Graceful degradation
- **Invalid Tokens**: Clear error messages and recovery

## 🎯 Benefits

### **For Users**
- **Seamless Authentication**: One-time browser login
- **Full Feature Access**: Access to protected router features
- **Secure**: Industry-standard token-based authentication
- **User-Friendly**: Clear status and easy management

### **For Developers**
- **Extensible**: Easy to add new router types
- **Maintainable**: Clean separation of concerns
- **Testable**: Comprehensive error handling
- **Scalable**: Supports multiple router types and auth methods

## 🚀 Future Enhancements

- **OAuth 2.0 Support**: For routers supporting OAuth
- **Biometric Authentication**: Device-level security
- **Multi-Router Support**: Manage tokens for multiple routers
- **Token Refresh**: Automatic token renewal
- **Advanced Token Patterns**: Support for more router types

---

**The Browser Authentication feature provides a secure, user-friendly way to access protected router features while maintaining the highest security standards!** 🔐
