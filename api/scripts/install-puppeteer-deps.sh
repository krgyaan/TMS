#!/bin/bash

# Puppeteer/Chrome System Dependencies Installation Script
# This script installs required system libraries for Puppeteer/Chrome to run on Linux

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Installing Puppeteer/Chrome system dependencies...${NC}\n"

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Error: This script must be run as root or with sudo${NC}"
    echo "Usage: sudo bash install-puppeteer-deps.sh"
    exit 1
fi

# Detect Linux distribution
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    OS_VERSION=$VERSION_ID
else
    echo -e "${RED}Error: Cannot detect Linux distribution${NC}"
    exit 1
fi

echo -e "${YELLOW}Detected OS: $OS $OS_VERSION${NC}\n"

# Function to install packages for Ubuntu/Debian
install_debian() {
    echo -e "${GREEN}Installing packages for Debian/Ubuntu...${NC}\n"
    
    apt-get update
    
    apt-get install -y \
        libatk1.0-0 \
        libatk-bridge2.0-0 \
        libcups2 \
        libdrm2 \
        libgbm1 \
        libxkbcommon0 \
        libxcomposite1 \
        libxdamage1 \
        libxfixes3 \
        libxrandr2 \
        libasound2 \
        libpango-1.0-0 \
        libcairo2 \
        libatspi2.0-0 \
        libgtk-3-0 \
        libnss3 \
        libxss1 \
        libgconf-2-4 \
        fonts-liberation \
        libappindicator3-1 \
        xdg-utils
    
    echo -e "\n${GREEN}Packages installed successfully!${NC}"
}

# Function to install packages for CentOS/RHEL/Fedora
install_redhat() {
    echo -e "${GREEN}Installing packages for CentOS/RHEL/Fedora...${NC}\n"
    
    # Determine package manager
    if command -v dnf &> /dev/null; then
        PKG_MANAGER="dnf"
    elif command -v yum &> /dev/null; then
        PKG_MANAGER="yum"
    else
        echo -e "${RED}Error: Neither dnf nor yum found${NC}"
        exit 1
    fi
    
    $PKG_MANAGER install -y \
        atk \
        at-spi2-atk \
        cups-libs \
        libdrm \
        libgbm \
        libxkbcommon \
        libXcomposite \
        libXdamage \
        libXfixes \
        libXrandr \
        alsa-lib \
        pango \
        cairo \
        at-spi2-core \
        gtk3 \
        nss \
        libXScrnSaver \
        GConf2 \
        liberation-fonts \
        xorg-x11-utils
    
    echo -e "\n${GREEN}Packages installed successfully!${NC}"
}

# Function to install packages for Alpine
install_alpine() {
    echo -e "${GREEN}Installing packages for Alpine Linux...${NC}\n"
    
    apk add --no-cache \
        at-spi2-atk \
        atk \
        cups-libs \
        libdrm \
        libgbm \
        libxkbcommon \
        libxcomposite \
        libxdamage \
        libxfixes \
        libxrandr \
        alsa-lib \
        pango \
        cairo \
        gtk+3.0 \
        nss \
        ttf-liberation \
        xdg-utils
    
    echo -e "\n${GREEN}Packages installed successfully!${NC}"
}

# Install based on detected OS
case $OS in
    ubuntu|debian)
        install_debian
        ;;
    centos|rhel|fedora|rocky|almalinux)
        install_redhat
        ;;
    alpine)
        install_alpine
        ;;
    *)
        echo -e "${RED}Error: Unsupported Linux distribution: $OS${NC}"
        echo -e "${YELLOW}Please install the following packages manually:${NC}"
        echo "  - ATK accessibility toolkit (libatk1.0-0 or atk)"
        echo "  - ATK bridge (libatk-bridge2.0-0 or at-spi2-atk)"
        echo "  - CUPS (libcups2 or cups-libs)"
        echo "  - DRM (libdrm2 or libdrm)"
        echo "  - GBM (libgbm1 or libgbm)"
        echo "  - X11 libraries (libxkbcommon, libxcomposite, libxdamage, libxfixes, libxrandr)"
        echo "  - ALSA (libasound2 or alsa-lib)"
        echo "  - Pango (libpango-1.0-0 or pango)"
        echo "  - Cairo (libcairo2 or cairo)"
        echo "  - GTK+3 (libgtk-3-0 or gtk+3.0)"
        echo "  - NSS (libnss3 or nss)"
        echo "  - XSS (libxss1 or libXScrnSaver)"
        exit 1
        ;;
esac

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Installation completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}\n"
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Restart your application (e.g., pm2 restart tms-api)"
echo "2. Verify Puppeteer can launch Chrome successfully"
echo "3. Check application logs for any remaining issues"
echo ""
