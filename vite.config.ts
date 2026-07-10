import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// Tauri(데스크톱) 빌드는 상대 경로, 웹(GitHub Pages)은 리포 경로 사용
const isTauri = !!process.env.TAURI_ENV_PLATFORM

export default defineConfig({
  base: isTauri ? './' : '/Calculator_Mechanical-Engineering/',
  plugins: [react(), tailwindcss()],
  clearScreen: false,
})
