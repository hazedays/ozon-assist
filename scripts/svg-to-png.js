#!/usr/bin/env node

/**
 * SVG 转 PNG 转换脚本
 * 需要安装: npm install sharp
 */

const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

const sizes = [
  { size: 16, name: 'icon-16x16' },
  { size: 32, name: 'icon-32x32' },
  { size: 64, name: 'icon-64x64' },
  { size: 128, name: 'icon-128x128' },
  { size: 256, name: 'icon-256x256' },
  { size: 512, name: 'icon-512x512' },
  { size: 1024, name: 'icon-1024x1024' }
]

const resourceDir = path.join(__dirname, '../resources')
const svgPath = path.join(resourceDir, 'logo.svg')

async function convertSvgToPng() {
  try {
    console.log('开始转换 SVG 为 PNG...')

    // 检查 SVG 文件是否存在
    if (!fs.existsSync(svgPath)) {
      console.error(`错误: 找不到 SVG 文件 ${svgPath}`)
      process.exit(1)
    }

    // 读取 SVG 文件
    const svgBuffer = fs.readFileSync(svgPath)

    // 转换为不同尺寸的 PNG
    for (const { size, name } of sizes) {
      const outputPath = path.join(resourceDir, `${name}.png`)

      await sharp(svgBuffer)
        .resize(size, size, {
          fit: 'fill'
        })
        .png()
        .toFile(outputPath)

      console.log(`✓ 生成: ${name}.png (${size}x${size})`)
    }

    // 同时生成 icon.png（替换原有的）
    const iconPath = path.join(resourceDir, 'icon.png')
    await sharp(svgBuffer)
      .resize(512, 512, {
        fit: 'fill'
      })
      .png()
      .toFile(iconPath)

    console.log(`✓ 生成: icon.png (512x512)`)
    console.log('\n✅ 所有 PNG 文件生成完成！')
  } catch (error) {
    console.error('转换失败:', error)
    process.exit(1)
  }
}

convertSvgToPng()
