// Генерирует PNG-иконки для PWA из public/favicon.svg.
// Запуск: node scripts/gen-icons.js
import { Buffer } from 'node:buffer'
import { readFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'public', 'icons')
mkdirSync(outDir, { recursive: true })

const favicon = readFileSync(join(root, 'public', 'favicon.svg'), 'utf8')
// Достаём внутренности <svg>…</svg>, чтобы вложить их в обёртку
const inner = favicon.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')

const BG = '#0d0d11'
const LOGO_RATIO = 46 / 48 // viewBox favicon — 48x46

function wrapper(size, logoWidth) {
  const w = logoWidth
  const h = logoWidth * LOGO_RATIO
  const x = (size - w) / 2
  const y = (size - h) / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" fill="${BG}"/>
  <svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 48 46">${inner}</svg>
</svg>`
}

const targets = [
  { file: 'icon-192.png', size: 192, logo: 112 },
  { file: 'icon-512.png', size: 512, logo: 300 },
  { file: 'icon-maskable-512.png', size: 512, logo: 230 }, // безопасная зона 80%
  { file: 'apple-touch-icon.png', size: 180, logo: 100 },
]

for (const t of targets) {
  await sharp(Buffer.from(wrapper(t.size, t.logo))).png().toFile(join(outDir, t.file))
  console.log('ok', t.file)
}
