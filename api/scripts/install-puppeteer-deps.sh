#!/bin/bash

# Puppeteer/Chrome System Dependencies Installation Script
# This script installs required system libraries for Puppeteer/Chrome on Ubuntu 24.04

set -e

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly NC='\033[0m' # No Color

echo -e "${GREEN}Installing Puppeteer/Chrome system dependencies...${NC}\n"

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: This script must be run as root or with sudo${NC}"
    echo "Usage: sudo bash install-puppeteer-deps.sh"
    exit 1
fi

# Detect Linux distribution
if [ -f /etc/os-release ]; then
    # shellcheck source=/dev/null
    . /etc/os-release
    readonly OS=$ID
    readonly OS_VERSION=$VERSION_ID
else
    echo -e "${RED}Error: Cannot detect Linux distribution${NC}"
    exit 1
fi

echo -e "${YELLOW}Detected OS: $OS $OS_VERSION${NC}\n"

# Check if running on Ubuntu 24.04
if [ "$OS" != "ubuntu" ]; then
    echo -e "${RED}Error: This script is designed for Ubuntu 24.04${NC}"
    echo -e "${YELLOW}Detected: $OS $OS_VERSION${NC}"
    echo -e "${YELLOW}Please install dependencies manually or use a different script.${NC}"
    exit 1
fi

UBUNTU_MAJOR_VERSION=$(echo "$OS_VERSION" | cut -d. -f1 2>/dev/null || echo "0")
if [ "$UBUNTU_MAJOR_VERSION" -lt 24 ] 2>/dev/null; then
    echo -e "${YELLOW}Warning: This script is optimized for Ubuntu 24.04${NC}"
    echo -e "${YELLOW}Detected: Ubuntu $OS_VERSION${NC}"
    echo -e "${YELLOW}Package names may differ. Proceeding anyway...${NC}\n"
fi

# Install packages for Ubuntu 24.04
echo -e "${GREEN}Installing packages for Ubuntu 24.04...${NC}\n"

apt-get update

apt-get install -y \
    libatk1.0-0t64 \
    libatk-bridge2.0-0t64 \
    libcups2t64 \
    libdrm2 \
    libgbm1 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libasound2t64 \
    libpango-1.0-0 \
    libcairo2 \
    libatspi2.0-0t64 \
    libgtk-3-0t64 \
    libnss3 \
    libxss1 \
    fonts-liberation \
    libappindicator3-1 \
    xdg-utils

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Installation completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}\n"
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Restart your application (e.g., pm2 restart tms-api)"
echo "2. Verify Puppeteer can launch Chrome successfully"
echo "3. Check application logs for any remaining issues"
echo ""
