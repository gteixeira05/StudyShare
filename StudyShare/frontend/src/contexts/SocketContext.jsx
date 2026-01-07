import { createContext, useContext, useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'

const SocketContext = createContext(null)

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket deve ser usado dentro de SocketProvider')
  }
  return context
}

export const SocketProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth()
  const [socket, setSocket] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (isAuthenticated && user?._id) {
      // Conectar ao Socket.IO
      const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:5001', {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
      })

      newSocket.on('connect', () => {
        console.log('✅ Conectado ao Socket.IO')
        // Juntar-se à sala do utilizador
        newSocket.emit('join_user_room', user._id)
      })

      newSocket.on('disconnect', () => {
        console.log('❌ Desconectado do Socket.IO')
      })

      // Escutar novas notificações
      newSocket.on('new_notification', (notification) => {
        setNotifications(prev => [notification, ...prev])
        setUnreadCount(prev => prev + 1)
      })

      setSocket(newSocket)

      return () => {
        newSocket.close()
        setSocket(null)
      }
    } else {
      if (socket) {
        socket.close()
        setSocket(null)
      }
    }
  }, [isAuthenticated, user?._id]) // Usar apenas user._id em vez do objeto user completo

  const addNotification = (notification) => {
    setNotifications(prev => [notification, ...prev])
    setUnreadCount(prev => prev + 1)
  }

  const markAsRead = (notificationId) => {
    setNotifications(prev =>
      prev.map(n => n._id === notificationId ? { ...n, isRead: true } : n)
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    setUnreadCount(0)
  }

  const removeNotification = (notificationId) => {
    setNotifications(prev => {
      const notification = prev.find(n => n._id === notificationId)
      if (notification && !notification.isRead) {
        setUnreadCount(prevCount => Math.max(0, prevCount - 1))
      }
      return prev.filter(n => n._id !== notificationId)
    })
  }

  const value = {
    socket,
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    setNotifications,
    setUnreadCount
  }

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
}

