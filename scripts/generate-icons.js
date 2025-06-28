const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '..', 'assets');

// Ensure assets directory exists
if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR);
}

// Generate icons with different sizes and configurations
async function generateIcons() {
  const iconSvg = fs.readFileSync(path.join(ASSETS_DIR, 'xfinity_router_icon.svg'));

  // Regular icon (1024x1024)
  await sharp(iconSvg)
    .resize(1024, 1024)
    .png()
    .toFile(path.join(ASSETS_DIR, 'icon.png'));

  // Adaptive icon (1024x1024)
  await sharp(iconSvg)
    .resize(1024, 1024)
    .png()
    .toFile(path.join(ASSETS_DIR, 'adaptive-icon.png'));

  // Favicon (196x196)
  await sharp(iconSvg)
    .resize(196, 196)
    .png()
    .toFile(path.join(ASSETS_DIR, 'favicon.png'));

  // Splash icon (2048x2048)
  await sharp(iconSvg)
    .resize(2048, 2048)
    .png()
    .toFile(path.join(ASSETS_DIR, 'splash-icon.png'));

  console.log('All icons generated successfully!');
}

generateIcons().catch(console.error);
