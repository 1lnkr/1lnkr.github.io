// Generates the default social image, the apple-touch icon and the demo featured images
// as PNGs (social networks don't accept SVG previews). Run: npm run generate:images
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const W = 1200;
const H = 630;

const linkIcon = (x, y, s, color) => `
  <g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round">
    <path d="M28 36a9 9 0 0 0 12.7 0l7.1-7.1a9 9 0 0 0-12.7-12.7l-2.4 2.4"/>
    <path d="M36 28a9 9 0 0 0-12.7 0l-7.1 7.1a9 9 0 0 0 12.7 12.7l2.4-2.4"/>
  </g>`;

const card = ({ from, to, eyebrow, title, subtitle }) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>
    </linearGradient>
    <pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="2" fill="#ffffff" fill-opacity="0.12"/>
    </pattern>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <rect width="${W}" height="${H}" fill="url(#dots)"/>
  <circle cx="1040" cy="120" r="260" fill="#ffffff" fill-opacity="0.07"/>
  <circle cx="1120" cy="560" r="180" fill="#ffffff" fill-opacity="0.06"/>
  <rect x="80" y="80" width="88" height="88" rx="22" fill="#ffffff" fill-opacity="0.16"/>
  ${linkIcon(92, 92, 1, '#ffffff')}
  <text x="80" y="300" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="30" font-weight="700" letter-spacing="4" fill="#ffffff" fill-opacity="0.8">${eyebrow}</text>
  <text x="80" y="388" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="76" font-weight="800" fill="#ffffff">${title}</text>
  <text x="80" y="456" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="34" fill="#ffffff" fill-opacity="0.85">${subtitle}</text>
</svg>`;

const images = [
  {
    file: 'public/images/site/social-default.png',
    svg: card({ from: '#3451d1', to: '#1b2a7a', eyebrow: 'SHORT LINKS', title: 'Lnkrs', subtitle: 'Personal short links, curated by the site owner.' }),
  },
  {
    file: 'public/images/uploads/astro-docs.png',
    svg: card({ from: '#7c3aed', to: '#3b0f8c', eyebrow: 'DOCUMENTATION', title: 'Astro Docs', subtitle: 'Guides and reference for the Astro web framework.' }),
  },
  {
    file: 'public/images/uploads/decap-guide.png',
    svg: card({ from: '#c2410c', to: '#7c2d12', eyebrow: 'GUIDE', title: 'Decap CMS Guide', subtitle: 'Git-based content management, step by step.' }),
  },
  {
    file: 'public/images/uploads/github-pages.png',
    svg: card({ from: '#15803d', to: '#14532d', eyebrow: 'HOSTING', title: 'GitHub Pages', subtitle: 'Free static hosting straight from a repository.' }),
  },
];

mkdirSync('public/images/site', { recursive: true });
mkdirSync('public/images/uploads', { recursive: true });

for (const { file, svg } of images) {
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: true, quality: 90 }).toFile(file);
  console.log('wrote', file);
}

const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#3451d1"/>${linkIcon(0, 0, 1, '#ffffff')}</svg>`;
await sharp(Buffer.from(icon)).resize(180, 180).png().toFile('public/images/site/apple-touch-icon.png');
console.log('wrote public/images/site/apple-touch-icon.png');
