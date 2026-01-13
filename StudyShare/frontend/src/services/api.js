import axios from 'axios'

// Em desenvolvimento, usar proxy do Vite ('/api')
// Em produção, usar VITE_API_URL + '/api' se definido, senão '/api'
const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

// Log para debug (apenas em desenvolvimento)
if (import.meta.env.DEV) {
  console.log('🔗 API Base URL:', baseURL)
  console.log('🔗 VITE_API_URL:', import.meta.env.VITE_API_URL)
}

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000 // 30 segundos de timeout
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
      // Não redirecionar se estiver em rotas de autenticação (login/register)
      const url = error.config?.url || ''
      const isAuthRoute = url.includes('/auth/login') || url.includes('/auth/register')
      
      // Remover token apenas se não for rota de autenticação
      if (!isAuthRoute) {
        localStorage.removeItem('token')
        // Evitar redirecionamento em loop - verificar se já não está em /login
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          window.location.href = '/login'
        }
      }
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

