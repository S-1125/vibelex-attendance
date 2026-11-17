import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/** 构建结束后自动将 dist/ 下的静态资源清单注入 dist/sw.js，实现桌面快捷方式 0ms 秒开 */
function swPrecachePlugin(): Plugin {
  return {
    name: 'sw-precache-manifest',
    closeBundle() {
      const distDir = path.resolve(process.cwd(), 'dist')
      const swPath = path.join(distDir, 'sw.js')
      if (!fs.existsSync(swPath)) return

      const assets: string[] = ['/']
      const walk = (dir: string, prefix = '') => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          if (entry.name === 'sw.js' || entry.name === 'wrangler.json' || entry.name === '.assetsignore') {
            continue
          }
          const rel = `${prefix}/${entry.name}`
          if (entry.isDirectory()) {
            walk(path.join(dir, entry.name), rel)
          } else {
            assets.push(rel)
          }
        }
      }
      walk(distDir)

      const content = fs
        .readFileSync(swPath, 'utf-8')
        .replace('__CACHE_VERSION__', `vibelex-clock-${Date.now()}`)
        .replace('__PRECACHE_ASSETS__', JSON.stringify(assets))
      fs.writeFileSync(swPath, content, 'utf-8')
    },
  }
}

// Vite 构建配置，集成 React、Tailwind CSS v4 与离线预缓存插件
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react(), tailwindcss(), swPrecachePlugin()],
})
