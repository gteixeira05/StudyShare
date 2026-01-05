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
          setUser(response.data.user)
        } catch (error) {
          // Erro silencioso - pode ser que o backend não esteja a correr ainda
          console.warn('Não foi possível carregar utilizador:', error.message)
          localStorage.removeItem('token')
          setToken(null)
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
      const response = await api.post('/auth/login', { email, password })
      const { token: newToken, user: userData } = response.data
      
      localStorage.setItem('token', newToken)
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
      setToken(newToken)
      setUser(userData)
      
      return { success: true }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Erro ao fazer login'
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

