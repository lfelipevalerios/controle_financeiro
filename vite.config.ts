import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  server: { port: Number(process.env.PORT) || 5173 },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt', // RF-42: o usuário escolhe quando atualizar
      injectRegister: false,
      includeAssets: ['icons/*.png', 'icons/*.svg', 'robots.txt'],
      manifest: {
        id: '/',
        name: 'Baldinhos — orçamento da família',
        short_name: 'Baldinhos',
        description: 'Limites de gastos da família por baldinho, com planejado x realizado do mês.',
        lang: 'pt-BR',
        start_url: '/?origem=pwa',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#155E75',
        background_color: '#EEF2F0',
        categories: ['finance', 'productivity'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          {
            name: 'Lançar gasto',
            short_name: 'Lançar',
            url: '/lancar?origem=atalho',
            icons: [{ src: '/icons/shortcut-lancar-96.png', sizes: '96x96', type: 'image/png' }],
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,ico}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [], // dados NÃO passam pelo service worker (ADR-07)
      },
      devOptions: { enabled: false },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
