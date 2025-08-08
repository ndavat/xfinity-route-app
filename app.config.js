import 'dotenv/config';

export default {
  expo: {
    name: process.env.EXPO_PUBLIC_APP_NAME || "Xfinity Router App",
    slug: "xfinity-router-app",
    version: process.env.EXPO_PUBLIC_APP_VERSION || "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    sdkVersion: "53.0.0",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.ndavat.xfinityrouterapp",
      infoPlist: {
        NSLocalNetworkUsageDescription: "This app requires access to your local network to discover and connect to your Xfinity router for device management and monitoring.",
        NSBonjourServices: [
          "_http._tcp",
          "_https._tcp"
        ],
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: false,
          NSExceptionDomains: {
            "localhost": {
              NSExceptionAllowsInsecureHTTPLoads: true,
              NSExceptionMinimumTLSVersion: "TLSv1.0"
            }
          },
          NSAllowsLocalNetworking: true
        }
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.ndavat.xfinityrouterapp",
      permissions: [
        "INTERNET",
        "ACCESS_NETWORK_STATE",
        "ACCESS_WIFI_STATE"
      ],
      config: {
        googleMobileAdsAppId: false
      },
      // For E2E testing - ensure ACCESS_WIFI_STATE is available in test APK
      androidTestOnly: {
        permissions: [
          "ACCESS_WIFI_STATE"
        ]
      }
    },
    web: {
      favicon: "./assets/favicon.png",
      name: process.env.EXPO_PUBLIC_APP_NAME || "Xfinity Router App",
      bundler: "metro"
    },
    plugins: [
      [
        "@sentry/react-native/expo",
        {
          organization: "YOUR_SENTRY_ORG_SLUG", // TODO: Replace with your Sentry organization slug
          project: "YOUR_SENTRY_PROJECT_SLUG" // TODO: Replace with your Sentry project slug
        }
      ]
    ],
    extra: {
      // Environment variables available in the app
      EXPO_PUBLIC_DEFAULT_ROUTER_IP: process.env.EXPO_PUBLIC_DEFAULT_ROUTER_IP,
      EXPO_PUBLIC_DEFAULT_USERNAME: process.env.EXPO_PUBLIC_DEFAULT_USERNAME,
      EXPO_PUBLIC_DEFAULT_PASSWORD: process.env.EXPO_PUBLIC_DEFAULT_PASSWORD,
      EXPO_PUBLIC_API_TIMEOUT: process.env.EXPO_PUBLIC_API_TIMEOUT,
      EXPO_PUBLIC_CONNECTION_TIMEOUT: process.env.EXPO_PUBLIC_CONNECTION_TIMEOUT,
      EXPO_PUBLIC_APP_NAME: process.env.EXPO_PUBLIC_APP_NAME,
      EXPO_PUBLIC_APP_VERSION: process.env.EXPO_PUBLIC_APP_VERSION,
      EXPO_PUBLIC_DEBUG_MODE: process.env.EXPO_PUBLIC_DEBUG_MODE,
      EXPO_PUBLIC_MOCK_DATA_MODE: process.env.EXPO_PUBLIC_MOCK_DATA_MODE,
      EXPO_PUBLIC_ENABLE_DIAGNOSTICS: process.env.EXPO_PUBLIC_ENABLE_DIAGNOSTICS,
      EXPO_PUBLIC_ENABLE_ADVANCED_SETTINGS: process.env.EXPO_PUBLIC_ENABLE_ADVANCED_SETTINGS,
      EXPO_PUBLIC_ENABLE_HTTPS: process.env.EXPO_PUBLIC_ENABLE_HTTPS,
      EXPO_PUBLIC_VALIDATE_SSL: process.env.EXPO_PUBLIC_VALIDATE_SSL,
      EXPO_PUBLIC_MAX_RETRY_ATTEMPTS: process.env.EXPO_PUBLIC_MAX_RETRY_ATTEMPTS,
      EXPO_PUBLIC_RETRY_DELAY: process.env.EXPO_PUBLIC_RETRY_DELAY,
      EXPO_PUBLIC_ROUTER_CONFIG_KEY: process.env.EXPO_PUBLIC_ROUTER_CONFIG_KEY,
      EXPO_PUBLIC_DEVICE_NAMES_KEY: process.env.EXPO_PUBLIC_DEVICE_NAMES_KEY,
      eas: {
        projectId: "7dada0cb-17bc-4917-ae27-dd8f8edbb1e7"
      }
    }
  }
};
