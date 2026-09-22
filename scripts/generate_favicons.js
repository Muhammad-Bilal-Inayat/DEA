import fs from 'fs';
import path from 'path';
import { Resvg } from '@resvg/resvg-js';

const svgPath = path.resolve('./public/favicon.svg');
const svgBuffer = fs.readFileSync(svgPath);

function renderPng(size, outputPath) {
  const resvg = new Resvg(svgBuffer, {
    fitTo: {
      mode: 'width',
      value: size,
    },
  });
  const image = resvg.render();
  const pngBuffer = image.asPng();
  fs.writeFileSync(outputPath, pngBuffer);
  console.log(`Generated ${outputPath} (${size}x${size})`);
}

// Generate PWA icons
renderPng(192, path.resolve('./public/pwa-192x192.png'));
renderPng(512, path.resolve('./public/pwa-512x512.png'));
renderPng(512, path.resolve('./public/pwa-maskable-512x512.png'));

// Copy to dist if dist directory exists
if (fs.existsSync('./dist')) {
  renderPng(192, path.resolve('./dist/pwa-192x192.png'));
  renderPng(512, path.resolve('./dist/pwa-512x512.png'));
  renderPng(512, path.resolve('./dist/pwa-maskable-512x512.png'));
}

console.log('Favicons generated successfully.');
