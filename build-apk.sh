#!/bin/bash

# Xfinity Router App - APK Build Script
# This script builds the Android APK for the Xfinity Router App

set -e

echo "🚀 Building Xfinity Router App APK..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "app.json" ]; then
    print_error "This script must be run from the root of the Xfinity Router App project"
    exit 1
fi

# Check for required tools
print_status "Checking for required tools..."

if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

if ! command -v java &> /dev/null; then
    print_error "Java is not installed. Please install Java 17 or later."
    exit 1
fi

# Check Java version
JAVA_VERSION=$(java -version 2>&1 | head -n1 | cut -d'"' -f2 | cut -d'.' -f1)
if [ "$JAVA_VERSION" -lt 17 ]; then
    print_error "Java 17 or later is required. Current version: $JAVA_VERSION"
    exit 1
fi

print_success "All required tools are available"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
    print_success "Dependencies installed"
fi

# Check for Android SDK
if [ -z "$ANDROID_HOME" ]; then
    print_error "ANDROID_HOME environment variable is not set"
    print_error "Please set ANDROID_HOME to your Android SDK path"
    exit 1
fi

if [ ! -d "$ANDROID_HOME" ]; then
    print_error "Android SDK not found at $ANDROID_HOME"
    exit 1
fi

print_success "Android SDK found at $ANDROID_HOME"

# Set up environment
export JAVA_HOME=${JAVA_HOME:-$(dirname $(dirname $(readlink -f $(which java))))}
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools

print_status "Environment configured"
print_status "JAVA_HOME: $JAVA_HOME"
print_status "ANDROID_HOME: $ANDROID_HOME"

# Clean previous builds
print_status "Cleaning previous builds..."
rm -rf android/app/build/outputs/apk/
rm -rf /tmp/metro-cache/
print_success "Cleaned previous builds"

# Build type selection
BUILD_TYPE=${1:-debug}
if [ "$BUILD_TYPE" != "debug" ] && [ "$BUILD_TYPE" != "release" ]; then
    print_error "Invalid build type: $BUILD_TYPE"
    print_error "Usage: $0 [debug|release]"
    exit 1
fi

print_status "Building $BUILD_TYPE APK..."

# Create local.properties if it doesn't exist
if [ ! -f "android/local.properties" ]; then
    print_status "Creating android/local.properties..."
    echo "sdk.dir=$ANDROID_HOME" > android/local.properties
    print_success "Created android/local.properties"
fi

# Build the APK
cd android

if [ "$BUILD_TYPE" = "release" ]; then
    print_status "Building release APK..."
    ./gradlew assembleRelease
    APK_PATH="app/build/outputs/apk/release/app-release.apk"
    OUTPUT_NAME="xfinity-router-app-release.apk"
else
    print_status "Building debug APK..."
    ./gradlew assembleDebug
    APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
    OUTPUT_NAME="xfinity-router-app-debug.apk"
fi

cd ..

# Check if APK was created
if [ -f "android/$APK_PATH" ]; then
    # Copy APK to root directory with a better name
    cp "android/$APK_PATH" "$OUTPUT_NAME"
    
    # Get APK info
    APK_SIZE=$(du -h "$OUTPUT_NAME" | cut -f1)
    
    print_success "APK built successfully!"
    print_success "Location: $(pwd)/$OUTPUT_NAME"
    print_success "Size: $APK_SIZE"
    
    # Show installation instructions
    echo ""
    print_status "Installation Instructions:"
    echo "1. Transfer the APK to your Android device"
    echo "2. Enable 'Install from Unknown Sources' in Android settings"
    echo "3. Open the APK file on your device to install"
    echo ""
    print_status "ADB Installation (if device is connected):"
    echo "adb install $OUTPUT_NAME"
    
else
    print_error "APK build failed - output file not found"
    exit 1
fi

print_success "Build process completed!"
