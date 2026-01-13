import { useMemo, useState } from 'react'

const Avatar = ({ user, size = 'md', className = '' }) => {
  const [imageError, setImageError] = useState(false)
  
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-20 h-20 text-3xl'
  }

  const getAvatarUrl = (avatar) => {
    if (!avatar) return null
    if (avatar.startsWith('http')) {
      return avatar
    }
    // Em produção, usar VITE_BACKEND_URL. Em desenvolvimento, usar localhost
    const backendUrl = import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '')
    return backendUrl ? `${backendUrl}${avatar}` : avatar
  }

  const avatarUrl = useMemo(() => {
    if (user?.avatar && !imageError) {
      return getAvatarUrl(user.avatar)
    }
    return null
  }, [user?.avatar, imageError])

  const initials = useMemo(() => {
    if (user?.name) {
      return user.name.charAt(0).toUpperCase()
    }
    return 'A'
  }, [user?.name])

  const sizeClass = sizeClasses[size] || sizeClasses.md

  if (avatarUrl && !imageError) {
    return (
      <img
        src={avatarUrl}
        alt={user?.name || 'User'}
        className={`${sizeClass} rounded-full object-cover border-2 border-gray-200 ${className}`}
        onError={() => setImageError(true)}
      />
    )
  }

  return (
    <div
      className={`${sizeClass} bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-semibold shadow-md ${className}`}
    >
      {initials}
    </div>
  )
}

export default Avatar

