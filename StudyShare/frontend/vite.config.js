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
        ws: true, // Habilitar WebSocket proxying
        secure: false,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            // Silenciar erros de conexão durante desenvolvimento (servidor a reiniciar)
            if (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET') {
              // Erro esperado quando o servidor está a reiniciar - não mostrar
              return
            }
            // Mostrar outros erros de proxy
            console.error('⚠️ Erro de proxy:', err.message)
          })
        }
      }
    }
  }
})

