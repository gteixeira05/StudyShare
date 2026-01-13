import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(localStorage.getItem('token'))

  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`
          const response = await api.get('/auth/me')
          
          if (response.data?.user) {
            setUser(response.data.user)
          } else {
            throw new Error('Resposta inválida do servidor')
          }
        } catch (error) {
          // Erro ao carregar utilizador - token pode estar inválido ou expirado
          console.warn('Não foi possível carregar utilizador:', error.response?.status, error.message)
          
          // Só remover token se for erro 401 (não autorizado)
          // Outros erros podem ser temporários (servidor não disponível, etc)
          if (error.response?.status === 401) {
            localStorage.removeItem('token')
            setToken(null)
            setUser(null)
          }
        }
      }
      setLoading(false)
    }

    // Timeout para garantir que não bloqueia indefinidamente
    const timeout = setTimeout(() => {
      setLoading(false)
    }, 5000)

    loadUser().finally(() => {
      clearTimeout(timeout)
    })
  }, [token])

  const login = async (email, password) => {
    try {
      console.log('🔐 Iniciando login:', { email, passwordLength: password?.length || 0 })
      
      const response = await api.post('/auth/login', { email, password })
      
      console.log('✅ Resposta do servidor:', {
        status: response.status,
        hasToken: !!response.data?.token,
        hasUser: !!response.data?.user
      })
      
      const { token: newToken, user: userData } = response.data
      
      if (!newToken || !userData) {
        console.error('❌ Resposta de login inválida:', response.data)
        return {
          success: false,
          message: 'Resposta inválida do servidor'
        }
      }
      
      console.log('💾 Salvando token e dados do utilizador...')
      localStorage.setItem('token', newToken)
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
      setToken(newToken)
      setUser(userData)
      
      console.log('✅ Login bem-sucedido!')
      return { success: true }
    } catch (error) {
      console.error('❌ Erro no login:', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        data: error.response?.data
      })
      
      const errorMessage = error.response?.data?.message || error.message || 'Erro ao fazer login'
      
      return {
        success: false,
        message: errorMessage
      }
    }
  }

  const register = async (userData) => {
    try {
      const response = await api.post('/auth/register', userData)
      const { token: newToken, user: newUser } = response.data
      
      localStorage.setItem('token', newToken)
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
      setToken(newToken)
      setUser(newUser)
      
      return { success: true }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Erro ao criar conta',
        errors: error.response?.data?.errors
      }
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    delete api.defaults.headers.common['Authorization']
    setToken(null)
    setUser(null)
  }

  const loadUser = async () => {
    if (token) {
      try {
        const response = await api.get('/auth/me')
        setUser(response.data.user)
        return { success: true }
      } catch (error) {
        console.error('Erro ao recarregar utilizador:', error)
        return { success: false }
      }
    }
    return { success: false }
  }

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'Administrador',
    login,
    register,
    logout,
    loadUser
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

