# Debugging and Fixing "Router Connection Failed" in a React Native Application

## 1. Issue Overview

The React Native application fails to connect to an Xfinity router after the user switches from "Mock Mode" to "Live Mode." The error displayed is "Router Connection Failed," which indicates a problem with network connectivity, configuration, or the authentication process with the router.

## 2. Debugging Checklist for the AI Agent

Here is a systematic approach to diagnose and resolve the issue.

### 2.1. Verify Network Permissions

Ensure the application has the necessary permissions to access the network.

**File: `android/app/src/main/AndroidManifest.xml`**

```xml
<manifest ...>
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    ...
</manifest>
```

**File: `ios/[YourAppName]/Info.plist`**

Add the `NSLocalNetworkUsageDescription` key to allow local network access.

```xml
<key>NSLocalNetworkUsageDescription</key>
<string>This app connects to your Xfinity router to manage its settings.</string>
```

### 2.2. Implement Dynamic Network State Checking

Hardcoding the router's IP address and assuming network availability is unreliable. Use `@react-native-community/netinfo` to check the device's connection status.

**Installation:**
```bash
npm install @react-native-community/netinfo
cd ios && pod install
```

**Usage:**
```javascript
import NetInfo from "@react-native-community/netinfo";

const checkNetworkState = async () => {
  const state = await NetInfo.fetch();
  console.log("--- Network State ---");
  console.log("Is connected?", state.isConnected);
  console.log("Connection type", state.type);
  if (state.details) {
    console.log("IP Address", state.details.ipAddress);
    console.log("Subnet", state.details.subnet);
    console.log("Is Connection Expensive?", state.details.isConnectionExpensive);
  }
  console.log("---------------------");
  return state;
};
```
* **Action:** Call this function before attempting a connection to the router. Ensure `state.isConnected` is true.

### 2.3. Dynamically Find the Router's IP Address

The default gateway is the router's IP. The hardcoded `10.0.0.1` might be incorrect if the user has a different network configuration. Use a library to get the gateway address.

**Library:** `react-native-network-info`

**Installation:**
```bash
npm install react-native-network-info
cd ios && pod install
```

**Usage:**
```javascript
import { NetworkInfo } from "react-native-network-info";

const getGatewayIp = async () => {
  try {
    const gatewayIpAddress = await NetworkInfo.getGatewayIPAddress();
    console.log("Discovered Gateway IP:", gatewayIpAddress);
    return gatewayIpAddress;
  } catch (error) {
    console.error("Error getting gateway IP:", error);
    return '10.0.0.1'; // Fallback to default
  }
};
```
* **Action:** Replace the hardcoded IP address with the result from this function.

### 2.4. Enhance HTTP Request Logic and Error Handling

The connection logic needs to be robust. Use `axios` for better error handling and request management.

**Installation:**
```bash
npm install axios
```

**Refactored Connection Logic:**
```javascript
import axios from 'axios';

const connectToRouter = async (ip, username, password) => {
  try {
    const response = await axios.get(`http://${ip}/`, {
      // It's possible the router requires basic auth or a specific endpoint for login
      // auth: { username, password }, 
      timeout: 5000 // 5-second timeout
    });

    // This is a simplified check. You will need to inspect the actual
    // HTML of the router's page to see what a successful login looks like.
    if (response.status === 200 && response.data.includes("Xfinity")) {
      console.log("Successfully connected to router.");
      return { success: true, data: response.data };
    } else {
      console.warn("Connection attempt returned non-success status or invalid data.");
      return { success: false, error: "Invalid response from router." };
    }

  } catch (error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error("Router Error Response:", error.response.status, error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error("No response from router:", error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error("Request setup error:", error.message);
    }
    return { success: false, error: "Router is unreachable." };
  }
};
```
* **Action:** Integrate this improved connection logic. The key is to analyze the actual HTML `response.data` to confirm a successful connection.

## 3. Research on Xfinity Router Interaction

There is **no official public API** from Comcast/Xfinity for direct router interaction. The application must simulate a user's interaction with the router's web administration portal. This technique is known as **web scraping**.

### Key Challenges & Solutions:

* **Authentication:** The app must perform a login. This usually involves a `POST` request to a specific login endpoint (e.g., `/check.jst`, `/login.php`). You must inspect the router's web interface in a browser with developer tools to find this endpoint and the required form data (e.g., `username`, `password`, `login_button_pressed`).
* **Session Management:** After a successful login, the router will likely return a session cookie. This cookie must be stored and sent with all subsequent requests to maintain the authenticated state. `axios` can manage cookies automatically if configured correctly with a cookie jar library like `axios-cookiejar-support`.
* **Parsing HTML:** To get data (like uptime, connected devices), the application will need to parse the HTML returned from the router. A library like `cheerio` is excellent for this.

**Recommended Library: `cheerio`**
```bash
npm install cheerio
```

**Example Parsing:**
```javascript
import * as cheerio from 'cheerio';

const parseRouterStatus = (html) => {
  const $ = cheerio.load(html);
  // NOTE: These selectors are EXAMPLES. You MUST inspect the router's HTML
  // to find the correct selectors for the data you need.
  const uptime = $('#uptime-element-id').text();
  const connectedDevicesCount = $('#device-count-id').text();

  return { uptime, connectedDevicesCount };
};
```

## 4. Summary of Tasks for the AI Coding Agent

1.  **Integrate `@react-native-community/netinfo`:** Add a network status check before any connection attempt.
2.  **Integrate `react-native-network-info`:** Replace the hardcoded `10.0.0.1` IP address with a call to `NetworkInfo.getGatewayIPAddress()`.
3.  **Refactor the Connection Logic:**
    * Use `axios` for making HTTP requests.
    * Implement detailed `try...catch` blocks to log specific network errors.
    * Set a reasonable request timeout.
4.  **Implement Web Scraping for Router Data:**
    * Advise on the necessity of inspecting the router's web admin panel to identify the correct endpoints and HTML element selectors.
    * Integrate `cheerio` to parse the HTML responses from the router to extract the required data.
5.  **Review State Management:** Ensure that when switching from "Mock Mode" to "Live Mode," the application state (IP address, credentials, connection status) is updated correctly and triggers the connection logic. Use `useEffect` hooks with appropriate dependencies.