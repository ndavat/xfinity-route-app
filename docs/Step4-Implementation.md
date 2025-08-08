# Step 4 Implementation: Fetch Connected Devices Page

## Overview

This document describes the implementation of Step 4 in the broader plan for handling connected devices data from the Xfinity router interface.

## Task Requirements

**Step 4: Fetch connected devices page**

After successful login call `api.get('/connected_devices_computers.php')`.  
If response.status is 302, follow redirect automatically (axios handles).  
Store the raw HTML string for parsing.

## Implementation Details

### Files Modified

1. **`services/LiveDeviceService.ts`**
   - Added `fetchConnectedDevicesPage()` method
   - Implements the core functionality for fetching raw HTML from the connected devices endpoint
   - Handles 302 redirects automatically using `redirect: 'follow'`
   - Returns raw HTML string for subsequent parsing

2. **`services/MockDeviceService.ts`**
   - Added `fetchConnectedDevicesPage()` method
   - Provides mock HTML response for development/testing
   - Maintains interface compatibility

3. **`services/ServiceInterfaces.ts`**
   - Updated `DeviceService` interface to include `fetchConnectedDevicesPage(): Promise<string>`
   - Ensures both Live and Mock services implement the method consistently

### Key Features

#### 1. Automatic Redirect Handling
```typescript
const response = await fetch(`${this.baseUrl}${Config.router.deviceEndpoint}`, {
  headers: {
    'Authorization': `Basic ${btoa(`${this.username}:${Config.router.defaultPassword}`)}`,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  signal: this.createTimeoutSignal(),
  redirect: 'follow' // Automatically follow redirects including 302
});
```

#### 2. Raw HTML Storage
```typescript
// Store and return the raw HTML string for parsing
const rawHtmlString = await response.text();

if (Config.app.debugMode) {
  console.log(`[LiveDeviceService] Connected devices page fetched successfully:`, {
    url: `${this.baseUrl}${Config.router.deviceEndpoint}`,
    status: response.status,
    redirected: response.redirected,
    finalUrl: response.url,
    htmlLength: rawHtmlString.length
  });
}

return rawHtmlString;
```

#### 3. Error Handling
```typescript
if (!response.ok) {
  throw new Error(`HTTP ${response.status}: ${response.statusText}`);
}
```

### Configuration

The implementation uses the existing configuration system:

- Endpoint: `Config.router.deviceEndpoint` (defaults to `/connected_devices_computers.php`)
- Base URL: `Config.router.defaultIp` (defaults to `10.0.0.1`)
- Authentication: Basic auth using `Config.router.defaultUsername` and `Config.router.defaultPassword`
- Timeout: `Config.api.timeout` (defaults to 15 seconds)

### Usage Examples

#### Basic Usage
```typescript
import { ServiceFactory } from '../services/ServiceInterfaces';
import { Config } from '../utils/config';

// Create device service
const deviceService = ServiceFactory.createDeviceService(Config.app.mockDataMode);

// Step 4: Fetch connected devices page
const rawHtmlString = await deviceService.fetchConnectedDevicesPage();

console.log(`Raw HTML length: ${rawHtmlString.length} characters`);
```

#### With Error Handling
```typescript
try {
  const rawHtmlString = await deviceService.fetchConnectedDevicesPage();
  
  // HTML is now stored and ready for parsing in subsequent steps
  console.log('✅ Step 4: Raw HTML string stored successfully for parsing');
  
  return {
    success: true,
    htmlLength: rawHtmlString.length,
    rawHtml: rawHtmlString
  };
  
} catch (error: any) {
  console.error('❌ Step 4 failed:', error.message);
  
  return {
    success: false,
    error: error.message
  };
}
```

### Debug Information

When `Config.app.debugMode` is enabled, the implementation provides detailed logging:

- Request URL and headers
- Response status and redirect information
- Final URL after any redirects
- HTML content length
- Success/failure status

### Mock Mode Support

The MockDeviceService provides a complete HTML simulation for development:

```typescript
async fetchConnectedDevicesPage(): Promise<string> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Return mock HTML with actual device data structure
  const mockHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Connected Devices - Mock</title>
</head>
<body>
  <div id="online-private">
    <table class="data">
      <!-- Device rows with actual mock data -->
    </table>
  </div>
</body>
</html>`;
  
  return mockHtml;
}
```

### Integration with Existing Code

The new `fetchConnectedDevicesPage()` method is used internally by the existing `getDevices()` method:

```typescript
async getDevices(): Promise<Device[]> {
  try {
    // Use the new method to fetch raw HTML
    const responseText = await this.fetchConnectedDevicesPage();
    const root = parse(responseText);
    
    // Continue with existing parsing logic...
  }
  // ...
}
```

This ensures backward compatibility while providing the new Step 4 functionality.

### Next Steps

The raw HTML string returned by `fetchConnectedDevicesPage()` is ready for use in subsequent steps of the plan:

1. **Step 5**: Parse the HTML to extract device information
2. **Step 6**: Transform the data into the required format
3. **Step 7**: Store or cache the processed device data

### Testing

Example tests can be found in `examples/Step4Example.ts`, which demonstrates:

- Basic Step 4 functionality
- Redirect handling
- Error scenarios
- Integration with both Live and Mock services

## Conclusion

Step 4 has been successfully implemented with:

✅ API call to `/connected_devices_computers.php`  
✅ Automatic 302 redirect handling  
✅ Raw HTML string storage  
✅ Error handling and logging  
✅ Mock mode support  
✅ Integration with existing codebase  
✅ Debug information and monitoring
