# Puppeteer/Chrome Setup Guide

This guide explains how to set up Puppeteer and Chrome for PDF generation in the TMS application.

## Overview

Puppeteer requires Chrome/Chromium browser to generate PDFs. The browser needs to be installed along with various system dependencies that Chrome depends on to run properly on Linux servers.

## Installation Steps

### 1. Install Chrome Browser

Chrome is automatically installed via the `postinstall` script in `package.json`:

```bash
npx puppeteer browsers install chrome
```

This script runs automatically when you install npm/pnpm dependencies:

```bash
pnpm install
```

### 2. Install System Dependencies

Chrome requires various system libraries to run on Linux. These are **not** installed automatically and must be installed manually on the server.

#### Option A: Using the Installation Script (Recommended)

We provide an automated script that detects your Linux distribution and installs the appropriate packages:

```bash
sudo bash api/scripts/install-puppeteer-deps.sh
```

The script supports:
- Ubuntu/Debian
- CentOS/RHEL/Fedora
- Alpine Linux

#### Option B: Manual Installation

If the script doesn't work or you prefer manual installation, follow the instructions below for your distribution.

##### Ubuntu/Debian

```bash
sudo apt-get update
sudo apt-get install -y \
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
```

##### CentOS/RHEL/Fedora

```bash
# For systems with dnf (Fedora, newer RHEL/CentOS)
sudo dnf install -y \
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

# For systems with yum (older CentOS/RHEL)
sudo yum install -y \
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
```

##### Alpine Linux

```bash
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
```

### 3. Restart Application

After installing dependencies, restart your application:

```bash
# If using PM2
pm2 restart tms-api

# Or restart your application service as appropriate
```

## Verification

After installation, check your application logs. You should see:

```
[PdfGeneratorService] Puppeteer browser launched successfully
```

If you see errors, refer to the Troubleshooting section below.

## Troubleshooting

### Error: "error while loading shared libraries: libatk-1.0.so.0"

**Cause**: Missing system dependencies.

**Solution**: 
1. Run the installation script: `sudo bash api/scripts/install-puppeteer-deps.sh`
2. Or install packages manually for your distribution (see Manual Installation above)
3. Restart the application

### Error: "Could not find Chrome"

**Cause**: Chrome browser is not installed.

**Solution**:
1. Run: `npx puppeteer browsers install chrome`
2. Verify the postinstall script ran during `pnpm install`
3. Check disk space availability

### Error: "Failed to launch the browser process"

**Possible causes**:
- Missing system dependencies (see above)
- Insufficient permissions
- Insufficient memory/resources
- Chrome binary doesn't have execute permissions

**Solutions**:
1. Install system dependencies (see Installation Steps)
2. Check file permissions: `chmod +x ~/.cache/puppeteer/chrome/*/chrome-linux64/chrome`
3. Check available memory: `free -h`
4. Verify system resources are adequate

### Error: "Code: 127" with shared library errors

**Cause**: Missing shared libraries required by Chrome.

**Solution**: Install system dependencies (see Installation Steps above).

## Why These Dependencies Are Needed

Chrome/Chromium is a complex application that depends on many system libraries:

- **ATK/AT-SPI**: Accessibility toolkit for screen readers and assistive technologies
- **CUPS**: Printing support
- **DRM/GBM**: Graphics and rendering support
- **X11 libraries**: Window system support (even in headless mode)
- **ALSA**: Audio support
- **Pango/Cairo**: Text rendering and graphics
- **GTK+3**: UI toolkit components
- **NSS**: Network Security Service for SSL/TLS
- **Fonts**: Liberation fonts for consistent text rendering

Even though Puppeteer runs Chrome in headless mode, these libraries are still required for Chrome to function properly.

## Production Deployment

For production deployments:

1. **Include dependency installation in your deployment process**:
   - Add the installation script to your deployment pipeline
   - Or document the manual installation steps for your DevOps team

2. **Verify installation**:
   - Test PDF generation after deployment
   - Monitor application logs for Puppeteer errors

3. **Consider Docker**:
   - If using Docker, include dependency installation in your Dockerfile
   - Use a base image that includes these dependencies, or install them during build

## Additional Resources

- [Puppeteer Troubleshooting Guide](https://pptr.dev/troubleshooting)
- [Chrome Headless Documentation](https://developer.chrome.com/docs/chromium/headless/)
- [Puppeteer Configuration Guide](https://pptr.dev/guides/configuration)

## Support

If you continue to experience issues after following this guide:

1. Check application logs for detailed error messages
2. Verify all dependencies are installed: `ldd ~/.cache/puppeteer/chrome/*/chrome-linux64/chrome`
3. Ensure Chrome binary is executable
4. Check system resources (memory, disk space)
5. Review Puppeteer troubleshooting documentation
