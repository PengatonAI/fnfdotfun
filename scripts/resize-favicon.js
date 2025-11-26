const sharp = require('sharp');
const toIco = require('to-ico');
const fs = require('fs');
const path = require('path');

async function resizeFavicon() {
  const sourcePath = 'C:\\Users\\lango\\Downloads\\fnfdotfun_logo_v_2-removebg-preview.png';
  const outputPngPath = path.join(__dirname, '..', 'public', 'favicon.png');
  const outputIcoPath = path.join(__dirname, '..', 'public', 'favicon.ico');

  try {
    // Resize to 64x64px and save as PNG
    await sharp(sourcePath)
      .resize(64, 64, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
      })
      .png()
      .toFile(outputPngPath);

    console.log('✓ Created favicon.png (64x64px)');

    // Read the PNG buffer to convert to ICO
    const pngBuffer = fs.readFileSync(outputPngPath);
    const icoBuffer = await toIco([pngBuffer]);
    fs.writeFileSync(outputIcoPath, icoBuffer);

    console.log('✓ Created favicon.ico');
    console.log('✓ Favicon files created successfully!');
  } catch (error) {
    console.error('Error resizing favicon:', error);
    process.exit(1);
  }
}

resizeFavicon();

