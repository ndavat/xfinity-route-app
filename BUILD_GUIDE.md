# Xfinity Router App - APK Build Guide

This guide explains how to build the Android APK for the Xfinity Router App.

## Prerequisites

### System Requirements
- **Operating System**: Linux (x64), macOS, or Windows with WSL2
- **Architecture**: x64 (ARM64 has compatibility issues with Android build tools)
- **RAM**: At least 8GB recommended
- **Storage**: At least 10GB free space

### Required Software

1. **Node.js** (v18 or later)
   ```bash
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. **Java Development Kit** (JDK 17 or later)
   ```bash
   # Install OpenJDK 17
   sudo apt update
   sudo apt install openjdk-17-jdk
   
   # Set JAVA_HOME
   export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
   echo 'export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64' >> ~/.bashrc
   ```

3. **Android SDK**
   ```bash
   # Download Android Command Line Tools
   wget https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
   unzip commandlinetools-linux-11076708_latest.zip
   
   # Set up Android SDK
   mkdir -p ~/android-sdk/cmdline-tools
   mv cmdline-tools ~/android-sdk/cmdline-tools/latest
   
   # Set ANDROID_HOME
   export ANDROID_HOME=~/android-sdk
   export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools
   echo 'export ANDROID_HOME=~/android-sdk' >> ~/.bashrc
   echo 'export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools' >> ~/.bashrc
   
   # Install required SDK components
   sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0"
   ```

## Build Methods

### Method 1: Using the Build Script (Recommended)

1. **Clone and setup the project**:
   ```bash
   git clone <repository-url>
   cd xfinity-route-app
   npm install
   ```

2. **Run the build script**:
   ```bash
   # Build debug APK (for testing)
   ./build-apk.sh debug
   
   # Build release APK (for production)
   ./build-apk.sh release
   ```

3. **Find your APK**:
   - Debug: `xfinity-router-app-debug.apk`
   - Release: `xfinity-router-app-release.apk`

### Method 2: Manual Build Process

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Generate Android project** (if needed):
   ```bash
   npx expo prebuild --platform android
   ```

3. **Create local.properties**:
   ```bash
   echo "sdk.dir=$ANDROID_HOME" > android/local.properties
   ```

4. **Build the APK**:
   ```bash
   cd android
   
   # For debug build
   ./gradlew assembleDebug
   
   # For release build
   ./gradlew assembleRelease
   ```

5. **Find the APK**:
   - Debug: `android/app/build/outputs/apk/debug/app-debug.apk`
   - Release: `android/app/build/outputs/apk/release/app-release.apk`

### Method 3: Using EAS Build (Cloud Build)

1. **Install EAS CLI**:
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo**:
   ```bash
   eas login
   ```

3. **Build APK**:
   ```bash
   # Build APK using EAS
   eas build --platform android --profile apk
   ```

## Configuration Files

### app.json
The main configuration file for the Expo app:
- App name, version, and package identifier
- Android-specific settings
- Permissions and features

### eas.json
Configuration for EAS Build:
- Build profiles (development, preview, production)
- Platform-specific settings
- Build type (APK vs AAB)

### package.json
Contains build scripts:
- `build:android`: Local APK build
- `build:android-preview`: Preview build with EAS
- `build:android-production`: Production build with EAS

## Troubleshooting

### Common Issues

1. **AAPT2 Compatibility Issues on ARM64**
   - **Problem**: Build fails with AAPT2 syntax errors
   - **Solution**: Use x64 system or EAS Build cloud service

2. **Metro Cache Permission Errors**
   - **Problem**: Permission denied errors with Metro cache
   - **Solution**: 
     ```bash
     sudo rm -rf /tmp/metro-cache
     sudo chmod 777 /tmp
     ```

3. **Android SDK Not Found**
   - **Problem**: SDK location not found error
   - **Solution**: Ensure ANDROID_HOME is set and local.properties exists

4. **Java Version Issues**
   - **Problem**: Unsupported Java version
   - **Solution**: Install and use Java 17 or later

5. **Node.js Memory Issues**
   - **Problem**: JavaScript heap out of memory
   - **Solution**: 
     ```bash
     export NODE_OPTIONS="--max-old-space-size=8192"
     ```

### Build Environment Variables

Set these environment variables for optimal builds:

```bash
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export ANDROID_HOME=~/android-sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools
export NODE_OPTIONS="--max-old-space-size=8192"
```

## APK Installation

### Installing on Android Device

1. **Enable Developer Options**:
   - Go to Settings > About Phone
   - Tap "Build Number" 7 times

2. **Enable USB Debugging** (for ADB install):
   - Go to Settings > Developer Options
   - Enable "USB Debugging"

3. **Enable Unknown Sources**:
   - Go to Settings > Security
   - Enable "Install from Unknown Sources"

4. **Install APK**:
   ```bash
   # Via ADB (device connected)
   adb install xfinity-router-app-debug.apk
   
   # Or transfer APK to device and open it
   ```

## App Features

The built APK includes:
- Router connection and management
- Device monitoring and control
- Network diagnostics
- Router restart functionality
- Application logging and debugging
- Mock data mode for testing

## Security Notes

- Debug APKs are for testing only
- Release APKs should be signed for production
- The app requires network permissions to communicate with routers
- Ensure router credentials are handled securely

## Support

For build issues:
1. Check the troubleshooting section above
2. Verify all prerequisites are installed
3. Try cleaning and rebuilding
4. Use EAS Build for complex environments
