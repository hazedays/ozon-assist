#!/usr/bin/env node

/**
 * 为 macOS 生成 .icns 文件
 * 需要在 macOS 上运行或使用 iconutil
 */

const sharp = require('sharp')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const os = require('os')

const resourceDir = path.join(__dirname, '../resources')
const svgPath = path.join(resourceDir, 'logo.svg')
const tempDir = path.join(os.tmpdir(), 'ozon-icns-temp')
const iconsetDir = path.join(tempDir, 'AppIcon.iconset')

async function generateMacOSIcon() {
  try {
    console.log('开始为 macOS 生成 .icns 文件...')

    // 检查平台
    if (os.platform() !== 'darwin') {
      console.warn('⚠️  警告: 此脚本最适合在 macOS 上运行')
      console.log('在非 macOS 系统上，将生成 PNG 图标用于开发')
      return
    }

    // 检查 SVG 文件
    if (!fs.existsSync(svgPath)) {
      console.error(`错误: 找不到 SVG 文件 ${svgPath}`)
      process.exit(1)
    }

    // 创建临时目录
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true })
    }
    fs.mkdirSync(iconsetDir, { recursive: true })

    // 读取 SVG
    const svgBuffer = fs.readFileSync(svgPath)

    // macOS iconset 需要的尺寸
    const sizes = [
      { size: 16, scale: 1, name: 'icon_16x16' },
      { size: 16, scale: 2, name: 'icon_16x16@2x' },
      { size: 32, scale: 1, name: 'icon_32x32' },
      { size: 32, scale: 2, name: 'icon_32x32@2x' },
      { size: 64, scale: 1, name: 'icon_64x64' },
      { size: 64, scale: 2, name: 'icon_64x64@2x' },
      { size: 128, scale: 1, name: 'icon_128x128' },
      { size: 128, scale: 2, name: 'icon_128x128@2x' },
      { size: 256, scale: 1, name: 'icon_256x256' },
      { size: 256, scale: 2, name: 'icon_256x256@2x' },
      { size: 512, scale: 1, name: 'icon_512x512' },
      { size: 512, scale: 2, name: 'icon_512x512@2x' }
    ]

    console.log('生成 PNG 图标...')

    // 生成各种尺寸的 PNG
    for (const { size, scale, name } of sizes) {
      const actualSize = size * scale
      const outputPath = path.join(iconsetDir, `${name}.png`)

      await sharp(svgBuffer)
        .resize(actualSize, actualSize, {
          fit: 'fill'
        })
        .png()
        .toFile(outputPath)

      console.log(`  ✓ ${name}.png (${actualSize}x${actualSize})`)
    }

    // 使用 iconutil 转换为 .icns
    console.log('转换为 .icns 格式...')
    const icnsPath = path.join(resourceDir, 'icon.icns')
    execSync(`iconutil -c icns "${iconsetDir}" -o "${icnsPath}"`)

    console.log(`✓ 生成: icon.icns`)

    // 清理临时目录
    fs.rmSync(tempDir, { recursive: true })

    console.log('\n✅ macOS .icns 文件生成完成！')
  } catch (error) {
    console.error('生成失败:', error.message)
    process.exit(1)
  }
}

generateMacOSIcon()
