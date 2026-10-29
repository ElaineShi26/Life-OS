import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'

export default defineConfig({
  plugins: [preact()],
  // 源码在 src/，构建产物输出到 dist/，再由 scripts/publish.sh 同步到仓库根，
  // 这样 GitHub Pages 用「分支 / 根目录」就能直接发布，不需要改任何设置。
  root: 'src',
  base: './',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    target: 'es2020',
    cssCodeSplit: false,
  },
})
