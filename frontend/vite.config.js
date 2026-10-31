import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { transform } from 'lightningcss'

function legacyCssFallbackPlugin() {
  return {
    name: 'legacy-css-fallback',
    enforce: 'post',
    generateBundle(_, bundle) {
      for (const fileName in bundle) {
        if (fileName.endsWith('.css')) {
          const chunk = bundle[fileName];
          if (typeof chunk.source === 'string' || Buffer.isBuffer(chunk.source)) {
            const raw = chunk.source.toString();
            try {
              const transpiled = transform({
                filename: fileName,
                code: Buffer.from(raw),
                targets: {
                  chrome: 80 << 16,
                  edge: 80 << 16,
                  firefox: 78 << 16,
                  safari: 13 << 16
                }
              });
              chunk.source = transpiled.code.toString();
              console.log(`[legacy-css-fallback] Transpiled ${fileName} for Windows 7 / Chrome 80+ compatibility.`);
            } catch (err) {
              console.warn('[legacy-css-fallback] Error transpiling CSS:', err.message);
            }
          }
        }
      }
    }
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendUrl = env.VITE_BACKEND_URL || `http://127.0.0.1:${env.PORT || 5000}`

  return {
    plugins: [react(), legacyCssFallbackPlugin()],
    build: {
      target: ['chrome80', 'edge80', 'firefox78', 'safari13', 'es2018'],
      cssTarget: 'chrome80'
    },
    server: {
      port: 3000,
      host: true,
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true
        }
      }
    }
  }
})
