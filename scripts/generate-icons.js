const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '..', 'assets');

// Ensure assets directory exists
if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR);
}

// Create a base SVG for the Xfinity Router App icon
const createBaseSVG = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0072D2;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#00A8E1;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#grad)"/>
  <g transform="translate(${size * 0.2}, ${size * 0.2}) scale(${size * 0.006})">
    <path fill="white" d="M80 20v-6h2v-2h-6v2h2v6h-2v2h6v-2h-2zm-4-4h2v2h-2v-2zm8-6V8h2V6h-6v2h2v2h-2v2h6v-2h-2zM28 64h-8v2h2v2h2v-2h2v2h2v-2h2v-2h-2zm-4-4h2v2h-2v-2zm24-28v-2h-2v-2h-2v2h-2v2h2v2h2v-2h2zm36-8h-4v2h2v2h2v-2h2v-2h-2zm-4 36h-4v2h2v2h2v-2h2v-2h-2zm-8-20h4v-2h-2v-2h-2v2h-2v2h2zm-4 16h-4v2h2v2h2v-2h2v-2h-2zm-36-16h4v-2h-2v-2h-2v2h-2v2h2zm-8 12h4v-2h-2v-2h-2v2h-2v2h2zm36-8h4v-2h-2v-2h-2v2h-2v2h2z"/>
  </g>
</svg>`;

// Generate icons with different sizes and configurations
async function generateIcons() {
  // Regular icon (1024x1024)
  const iconSvg = createBaseSVG(1024);
  await sharp(Buffer.from(iconSvg))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(ASSETS_DIR, 'icon.png'));

  // Adaptive icon (1024x1024)
  const adaptiveIconSvg = createBaseSVG(1024);
  await sharp(Buffer.from(adaptiveIconSvg))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(ASSETS_DIR, 'adaptive-icon.png'));

  // Favicon (196x196)
  const faviconSvg = createBaseSVG(196);
  await sharp(Buffer.from(faviconSvg))
    .resize(196, 196)
    .png()
    .toFile(path.join(ASSETS_DIR, 'favicon.png'));

  // Splash icon (2048x2048)
  const splashSvg = createBaseSVG(2048);
  await sharp(Buffer.from(splashSvg))
    .resize(2048, 2048)
    .png()
    .toFile(path.join(ASSETS_DIR, 'splash-icon.png'));

  console.log('All icons generated successfully!');
}

generateIcons().catch(console.error);
