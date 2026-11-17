import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// 注册离线预缓存 Service Worker，保障手机桌面快捷方式秒开
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // 忽略本地非 HTTPS 环境注册失败
    })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)

// 开屏动画播放完毕后顺滑淡出移除
const splash = document.getElementById('app-splash')
if (splash) {
  window.setTimeout(() => {
    splash.classList.add('is-leaving')
    window.setTimeout(() => splash.remove(), 260)
  }, 500)
}
