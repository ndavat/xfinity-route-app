/**
 * Step 4 Implementation Example: Fetch connected devices page
 * 
 * This example demonstrates how to use the fetchConnectedDevicesPage method
 * that implements the requirements from Step 4:
 * - After successful login call api.get('/connected_devices_computers.php')
 * - If response.status is 302, follow redirect automatically (axios handles)
 * - Store the raw HTML string for parsing
 */

import { LiveDeviceService } from '../services/LiveDeviceService';
import { MockDeviceService } from '../services/MockDeviceService';
import { ServiceFactory } from '../services/ServiceInterfaces';
import { Config } from '../utils/config';

/**
 * Example function showing how to use Step 4 implementation
 */
export async function demonstrateStep4Implementation() {
  console.log('=== Step 4 Implementation Demo ===');
  
  try {
    // Create the appropriate device service based on app mode
    const isMockMode = Config.app.mockDataMode;
    const deviceService = ServiceFactory.createDeviceService(isMockMode);
    
    console.log(`Using ${isMockMode ? 'Mock' : 'Live'} device service for demonstration`);
    
    // Step 4: Fetch connected devices page and store raw HTML
    console.log('Step 4: Fetching connected devices page...');
    const rawHtmlString = await deviceService.fetchConnectedDevicesPage();
    
    console.log('Step 4 completed successfully!');
    console.log(`Raw HTML length: ${rawHtmlString.length} characters`);
    
    // Log first 500 characters of the raw HTML for demonstration
    console.log('Raw HTML preview (first 500 chars):');
    console.log(rawHtmlString.substring(0, 500) + '...');
    
    // The raw HTML is now stored and can be used for parsing
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
}

/**
 * Example showing how the stored raw HTML can be used in subsequent steps
 */
export async function useStoredHtmlForParsing() {
  console.log('=== Using Stored HTML for Parsing ===');
  
  try {
    const deviceService = ServiceFactory.createDeviceService();
    
    // Fetch the raw HTML (Step 4)
    const rawHtmlString = await deviceService.fetchConnectedDevicesPage();
    
    // Now the raw HTML can be parsed (this would be part of a subsequent step)
    console.log('Raw HTML fetched and stored, ready for parsing in next steps');
    console.log(`HTML contains ${rawHtmlString.includes('online-private') ? 'expected' : 'unexpected'} content structure`);
    
    // Example: Count how many devices are in the HTML
    const deviceMatches = rawHtmlString.match(/headers="host-name"/g);
    const deviceCount = deviceMatches ? deviceMatches.length : 0;
    console.log(`Found ${deviceCount} devices in the raw HTML`);
    
    return {
      success: true,
      rawHtml: rawHtmlString,
      deviceCount
    };
    
  } catch (error: any) {
    console.error('Failed to use stored HTML:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Example showing redirect handling (302 status)
 */
export async function demonstrateRedirectHandling() {
  console.log('=== Redirect Handling Demo ===');
  
  try {
    // The fetchConnectedDevicesPage method automatically handles redirects
    // including 302 status codes using the fetch API's redirect: 'follow' option
    const deviceService = new LiveDeviceService();
    
    console.log('Making request that may result in 302 redirect...');
    const rawHtml = await deviceService.fetchConnectedDevicesPage();
    
    console.log('✅ Request completed - redirects were handled automatically');
    console.log(`Final HTML length: ${rawHtml.length} characters`);
    
    return {
      success: true,
      redirectHandled: true,
      htmlLength: rawHtml.length
    };
    
  } catch (error: any) {
    console.error('❌ Redirect handling failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Export for use in other parts of the application
export default {
  demonstrateStep4Implementation,
  useStoredHtmlForParsing,
  demonstrateRedirectHandling
};
