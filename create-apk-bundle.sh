#!/bin/bash

# Alternative APK creation using Expo export
# This creates a bundle that can be used to generate an APK

set -e

echo "📦 Creating Xfinity Router App Bundle..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "app.json" ]; then
    echo "❌ This script must be run from the root of the Xfinity Router App project"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
fi

# Clean previous exports
print_status "Cleaning previous exports..."
rm -rf dist/
rm -rf .expo/

# Set NODE_ENV for production
export NODE_ENV=production

# Create the bundle
print_status "Creating production bundle..."
npx expo export --platform android --output-dir dist/

if [ -d "dist" ]; then
    print_success "Bundle created successfully!"
    print_status "Bundle location: $(pwd)/dist/"
    
    # Create a simple HTML file to test the bundle
    cat > dist/index.html << EOF
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Xfinity Router App</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #0261C2; }
        .info { background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .success { background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 15px 0; }
        code { background: #f5f5f5; padding: 2px 5px; border-radius: 3px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Xfinity Router App Bundle</h1>
        
        <div class="success">
            <strong>✅ Bundle Created Successfully!</strong>
        </div>
        
        <div class="info">
            <h3>📱 Next Steps to Create APK:</h3>
            <ol>
                <li><strong>Use EAS Build (Recommended):</strong>
                    <br><code>npx eas build --platform android --profile apk</code>
                </li>
                <li><strong>Use Android Studio:</strong>
                    <br>Import the android/ folder and build from IDE
                </li>
                <li><strong>Use Gradle directly:</strong>
                    <br><code>cd android && ./gradlew assembleRelease</code>
                </li>
            </ol>
        </div>
        
        <div class="info">
            <h3>📋 Bundle Contents:</h3>
            <ul>
                <li>Compiled JavaScript bundle</li>
                <li>Assets and resources</li>
                <li>Metadata and configuration</li>
                <li>Platform-specific files</li>
            </ul>
        </div>
        
        <div class="info">
            <h3>🔧 App Features:</h3>
            <ul>
                <li>Router connection and management</li>
                <li>Device monitoring and control</li>
                <li>Network diagnostics</li>
                <li>Router restart functionality</li>
                <li>Application logging system</li>
                <li>Mock data mode for testing</li>
            </ul>
        </div>
        
        <div class="info">
            <h3>📖 Documentation:</h3>
            <p>See <code>BUILD_GUIDE.md</code> for detailed build instructions.</p>
        </div>
    </div>
</body>
</html>
EOF
    
    print_success "Bundle information page created: dist/index.html"
    
    # Create a README for the bundle
    cat > dist/README.md << EOF
# Xfinity Router App - Production Bundle

This directory contains the production bundle for the Xfinity Router App.

## Contents
- **_expo/**: Expo-specific files and metadata
- **assets/**: Application assets (images, fonts, etc.)
- **bundles/**: Compiled JavaScript bundles
- **metadata.json**: Bundle metadata
- **index.html**: Bundle information page

## Creating APK from Bundle

### Method 1: EAS Build (Recommended)
\`\`\`bash
npx eas build --platform android --profile apk
\`\`\`

### Method 2: Local Build
\`\`\`bash
cd ../android
./gradlew assembleRelease
\`\`\`

### Method 3: Android Studio
1. Open Android Studio
2. Import the ../android folder
3. Build > Generate Signed Bundle/APK

## Bundle Information
- **Platform**: Android
- **Environment**: Production
- **Build Date**: $(date)
- **Node Version**: $(node --version)
- **Expo Version**: $(npx expo --version)

## Installation
The resulting APK can be installed on Android devices by:
1. Enabling "Install from Unknown Sources"
2. Transferring the APK to the device
3. Opening the APK file to install

For development/testing, you can also use:
\`\`\`bash
adb install app-debug.apk
\`\`\`
EOF
    
    print_success "Bundle README created: dist/README.md"
    
    # Show bundle size
    BUNDLE_SIZE=$(du -sh dist/ | cut -f1)
    print_status "Bundle size: $BUNDLE_SIZE"
    
    echo ""
    print_success "Bundle creation completed!"
    print_warning "Note: This bundle needs to be compiled into an APK using one of the methods in BUILD_GUIDE.md"
    print_status "The bundle is ready for APK generation using EAS Build or local Android build tools."
    
else
    echo "❌ Bundle creation failed"
    exit 1
fi
