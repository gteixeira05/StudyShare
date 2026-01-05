import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocket } from '../contexts/SocketContext'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import { FiBell, FiX, FiMessageSquare, FiStar, FiHeart } from 'react-icons/fi'

const NotificationBell = () => {
  const { user } = useAuth()
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification, setNotifications, setUnreadCount } = useSocket()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const dropdownRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    // Carregar notificações do servidor
    const fetchNotifications = async () => {
      try {
        const response = await api.get('/notifications')
        setNotifications(response.data.notifications || [])
        setUnreadCount(response.data.unreadCount || 0)
      } catch (error) {
        console.error('Erro ao buscar notificações:', error)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchNotifications()
    }
  }, [user, setNotifications, setUnreadCount])

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      try {
        await api.put(`/notifications/${notification._id}/read`)
        markAsRead(notification._id)
      } catch (error) {
        console.error('Erro ao marcar notificação como lida:', error)
      }
    }
    setIsOpen(false)
    navigate(`/material/${notification.material._id || notification.material}`)
  }

  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all')
      markAllAsRead()
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error)
    }
  }

  const handleDeleteNotification = async (notificationId, e) => {
    e.stopPropagation()
    try {
      await api.delete(`/notifications/${notificationId}`)
      removeNotification(notificationId)
    } catch (error) {
      console.error('Erro ao eliminar notificação:', error)
    }
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'comment':
        return <FiMessageSquare className="w-5 h-5" />
      case 'rating':
        return <FiStar className="w-5 h-5" />
      case 'favorite':
        return <FiHeart className="w-5 h-5" />
      default:
        return <FiBell className="w-5 h-5" />
    }
  }

  const formatTime = (date) => {
    const now = new Date()
    const notificationDate = new Date(date)
    const diffInSeconds = Math.floor((now - notificationDate) / 1000)

    if (diffInSeconds < 60) return 'agora'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`
    return notificationDate.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 hover:bg-white rounded-xl transition-all shadow-sm hover:shadow-md group"
      >
        <FiBell className="w-5 h-5 text-gray-600 group-hover:text-primary-600 transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-[600px] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-bold text-gray-900">Notificações</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                >
                  Marcar todas como lidas
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiX className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <FiBell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Não tens notificações</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification._id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors relative ${
                      !notification.isRead ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 ${!notification.isRead ? 'text-primary-600' : 'text-gray-400'}`}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 font-medium line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatTime(notification.createdAt)}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-primary-600 rounded-full mt-2 flex-shrink-0"></div>
                      )}
                      <button
                        onClick={(e) => handleDeleteNotification(notification._id, e)}
                        className="p-1 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                      >
                        <FiX className="w-3 h-3 text-gray-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationBell

