#!/bin/bash

# Xfinity Router App - Build Environment Setup Script
# This script sets up the build environment for creating APKs

set -e

echo "🔧 Setting up Xfinity Router App build environment..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check architecture
ARCH=$(uname -m)
if [ "$ARCH" != "x86_64" ]; then
    print_error "This script requires x86_64 architecture. Current: $ARCH"
    print_warning "For ARM64 systems, use EAS Build: npm run build:android"
    exit 1
fi

print_success "Architecture check passed: $ARCH"

# Check OS
OS=$(uname -s)
print_status "Operating System: $OS"

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    print_status "Installing Node.js..."
    if [ "$OS" = "Linux" ]; then
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif [ "$OS" = "Darwin" ]; then
        if command -v brew &> /dev/null; then
            brew install node
        else
            print_error "Please install Homebrew first or install Node.js manually"
            exit 1
        fi
    fi
    print_success "Node.js installed"
else
    NODE_VERSION=$(node --version)
    print_success "Node.js already installed: $NODE_VERSION"
fi

# Install Java if not present
if ! command -v java &> /dev/null; then
    print_status "Installing Java 17..."
    if [ "$OS" = "Linux" ]; then
        sudo apt update
        sudo apt install -y openjdk-17-jdk
        export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
        echo 'export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64' >> ~/.bashrc
    elif [ "$OS" = "Darwin" ]; then
        if command -v brew &> /dev/null; then
            brew install openjdk@17
            export JAVA_HOME=$(/usr/libexec/java_home -v 17)
            echo 'export JAVA_HOME=$(/usr/libexec/java_home -v 17)' >> ~/.zshrc
        else
            print_error "Please install Homebrew first or install Java manually"
            exit 1
        fi
    fi
    print_success "Java installed"
else
    JAVA_VERSION=$(java -version 2>&1 | head -n1 | cut -d'"' -f2)
    print_success "Java already installed: $JAVA_VERSION"
fi

# Set up Android SDK
if [ -z "$ANDROID_HOME" ] || [ ! -d "$ANDROID_HOME" ]; then
    print_status "Setting up Android SDK..."
    
    SDK_DIR="$HOME/android-sdk"
    mkdir -p "$SDK_DIR"
    
    # Download command line tools
    if [ "$OS" = "Linux" ]; then
        TOOLS_URL="https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip"
    elif [ "$OS" = "Darwin" ]; then
        TOOLS_URL="https://dl.google.com/android/repository/commandlinetools-mac-11076708_latest.zip"
    fi
    
    cd "$HOME"
    wget -q "$TOOLS_URL" -O cmdline-tools.zip
    unzip -q cmdline-tools.zip
    mkdir -p "$SDK_DIR/cmdline-tools"
    mv cmdline-tools "$SDK_DIR/cmdline-tools/latest"
    rm cmdline-tools.zip
    
    # Set environment variables
    export ANDROID_HOME="$SDK_DIR"
    export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools"
    
    # Add to shell profile
    if [ "$OS" = "Linux" ]; then
        echo "export ANDROID_HOME=$SDK_DIR" >> ~/.bashrc
        echo 'export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools' >> ~/.bashrc
    elif [ "$OS" = "Darwin" ]; then
        echo "export ANDROID_HOME=$SDK_DIR" >> ~/.zshrc
        echo 'export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools' >> ~/.zshrc
    fi
    
    # Install SDK components
    print_status "Installing Android SDK components..."
    yes | sdkmanager --licenses > /dev/null 2>&1
    sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0" > /dev/null
    
    print_success "Android SDK installed at $SDK_DIR"
else
    print_success "Android SDK already configured: $ANDROID_HOME"
fi

# Install project dependencies
if [ -f "package.json" ]; then
    print_status "Installing project dependencies..."
    npm install
    print_success "Dependencies installed"
fi

# Install EAS CLI
if ! command -v eas &> /dev/null; then
    print_status "Installing EAS CLI..."
    npm install -g eas-cli
    print_success "EAS CLI installed"
else
    EAS_VERSION=$(eas --version)
    print_success "EAS CLI already installed: $EAS_VERSION"
fi

# Create local.properties for Android
if [ -f "android/local.properties" ]; then
    print_status "Android local.properties already exists"
else
    print_status "Creating android/local.properties..."
    echo "sdk.dir=$ANDROID_HOME" > android/local.properties
    print_success "Created android/local.properties"
fi

# Final setup verification
print_status "Verifying build environment..."

CHECKS_PASSED=0
TOTAL_CHECKS=5

# Check Node.js
if command -v node &> /dev/null; then
    print_success "✓ Node.js: $(node --version)"
    ((CHECKS_PASSED++))
else
    print_error "✗ Node.js not found"
fi

# Check Java
if command -v java &> /dev/null; then
    print_success "✓ Java: $(java -version 2>&1 | head -n1 | cut -d'"' -f2)"
    ((CHECKS_PASSED++))
else
    print_error "✗ Java not found"
fi

# Check Android SDK
if [ -n "$ANDROID_HOME" ] && [ -d "$ANDROID_HOME" ]; then
    print_success "✓ Android SDK: $ANDROID_HOME"
    ((CHECKS_PASSED++))
else
    print_error "✗ Android SDK not configured"
fi

# Check EAS CLI
if command -v eas &> /dev/null; then
    print_success "✓ EAS CLI: $(eas --version)"
    ((CHECKS_PASSED++))
else
    print_error "✗ EAS CLI not found"
fi

# Check project dependencies
if [ -d "node_modules" ]; then
    print_success "✓ Project dependencies installed"
    ((CHECKS_PASSED++))
else
    print_error "✗ Project dependencies not installed"
fi

echo ""
if [ $CHECKS_PASSED -eq $TOTAL_CHECKS ]; then
    print_success "🎉 Build environment setup complete! ($CHECKS_PASSED/$TOTAL_CHECKS checks passed)"
    echo ""
    print_status "You can now build APKs using:"
    echo "  • Local build: ./build-apk.sh debug"
    echo "  • EAS build: npm run build:android"
    echo "  • Manual build: cd android && ./gradlew assembleDebug"
    echo ""
    print_warning "Remember to restart your terminal to load new environment variables!"
else
    print_error "Setup incomplete ($CHECKS_PASSED/$TOTAL_CHECKS checks passed)"
    print_status "Please fix the issues above and run this script again"
    exit 1
fi
