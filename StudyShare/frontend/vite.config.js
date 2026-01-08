import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // Permite acesso de outros dispositivos na rede
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        ws: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', () => {
            // Request iniciado - silenciar erros de conexão
          })
          proxy.on('error', (err, req, res) => {
            // Silenciar apenas erros ECONNREFUSED e ECONNRESET
            if (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET' || err.message?.includes('ECONNREFUSED')) {
              // Servidor não disponível ou a reiniciar - não mostrar erro
              return
            }
            // Para outros erros, verificar se já foi enviada resposta
            if (!res.headersSent) {
              console.error('⚠️ Erro de proxy:', err.message)
            }
          })
          proxy.on('proxyRes', () => {
            // Response recebido - tudo OK
          })
        }
      }
    }
  }
})

