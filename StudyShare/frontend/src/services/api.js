import axios from 'axios'

// Em desenvolvimento, usar proxy do Vite ('/api')
// Em produção, usar VITE_API_URL se definido, senão '/api' (assume mesmo domínio ou reverse proxy)
const baseURL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Interceptor para adicionar token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    // Não definir Content-Type para downloads (deixar o browser definir)
    if (config.responseType === 'blob') {
      delete config.headers['Content-Type']
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Interceptor para lidar com erros de autenticação e conexão
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Erro de autenticação
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
      return Promise.reject(error)
    }
    
    // Erro de conexão (servidor não disponível)
    if (!error.response) {
      // ECONNREFUSED ou timeout - servidor pode estar a reiniciar
      if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
        console.warn('⚠️ Servidor não disponível. Pode estar a reiniciar...')
        // Não mostrar erro ao utilizador, apenas log
      }
    }
    
    return Promise.reject(error)
  }
)

export default api

