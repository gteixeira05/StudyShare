import { useState, useEffect, useRef, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import api from '../services/api'
import Sidebar from '../components/Sidebar'
import MaterialCard from '../components/MaterialCard'
import Avatar from '../components/Avatar'
import ConfirmModal from '../components/ConfirmModal'
import { FiCamera, FiLock, FiX, FiLoader, FiCheck, FiArrowLeft, FiBell, FiStar, FiMessageCircle, FiFlag, FiHeart, FiAlertCircle } from 'react-icons/fi'

const ProfilePage = () => {
  const { user, logout, loadUser } = useAuth()
  const { success, error: showError } = useToast()
  const navigate = useNavigate()
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(null)
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    type: 'danger'
  })
  const [notificationPreferences, setNotificationPreferences] = useState({
    rating: true,
    commentOnMyMaterial: true,
    commentOnFavorite: true,
    report: true
  })
  const [loadingPreferences, setLoadingPreferences] = useState(false)
  const [savingPreferences, setSavingPreferences] = useState(false)
  const fileInputRef = useRef(null)

  const fetchMyMaterials = async () => {
    try {
      setLoading(true)
      const response = await api.get('/users/me/materials')
      setMaterials(response.data.materials)
    } catch (error) {
      console.error('Erro ao buscar materiais:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMyMaterials()
    fetchNotificationPreferences()
  }, [])

  const fetchNotificationPreferences = async () => {
    try {
      setLoadingPreferences(true)
      const response = await api.get('/users/me/notification-preferences')
      setNotificationPreferences(response.data.preferences || {
        rating: true,
        commentOnMyMaterial: true,
        commentOnFavorite: true,
        report: true
      })
    } catch (error) {
      console.error('Erro ao buscar preferências de notificações:', error)
    } finally {
      setLoadingPreferences(false)
    }
  }

  const handleTogglePreference = async (preferenceKey) => {
    try {
      setSavingPreferences(true)
      const newValue = !notificationPreferences[preferenceKey]
      const updatedPreferences = {
        ...notificationPreferences,
        [preferenceKey]: newValue
      }
      
      await api.put('/users/me/notification-preferences', {
        [preferenceKey]: newValue
      })
      
      setNotificationPreferences(updatedPreferences)
      success(`Preferência de notificação ${newValue ? 'ativada' : 'desativada'} com sucesso`)
    } catch (error) {
      console.error('Erro ao atualizar preferência:', error)
      showError(error.response?.data?.message || 'Erro ao atualizar preferência')
    } finally {
      setSavingPreferences(false)
    }
  }

  const handleDeleteMaterial = (materialId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Material',
      message: 'Tens a certeza que queres apagar este material? Esta ação não pode ser desfeita.',
      type: 'danger',
      onConfirm: async () => {
        try {
          setDeleting(materialId)
          await api.delete(`/materials/${materialId}`)
          // Remover material da lista
          setMaterials(prev => prev.filter(m => m._id !== materialId))
          // Recarregar dados do utilizador para atualizar contador
          if (loadUser) {
            await loadUser()
          }
        } catch (error) {
          console.error('Erro ao apagar material:', error)
          showError(error.response?.data?.message || 'Erro ao apagar material')
        } finally {
          setDeleting(null)
        }
      }
    })
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validar tipo de ficheiro
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      showError('Tipo de ficheiro não permitido. Apenas imagens (JPG, JPEG, PNG, GIF, WEBP) são aceites.')
      return
    }

    // Validar tamanho (2MB)
    if (file.size > 2 * 1024 * 1024) {
      showError('O ficheiro é demasiado grande. O tamanho máximo é 2MB.')
      return
    }

    setUploadingAvatar(true)
    try {
      const formData = new FormData()
      formData.append('avatar', file)

      const response = await api.post('/auth/me/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      // Atualizar dados do utilizador
      if (loadUser) {
        await loadUser()
      }
      setShowAvatarModal(false)
      success('Avatar atualizado com sucesso!')
    } catch (error) {
      console.error('Erro ao fazer upload do avatar:', error)
      showError(error.response?.data?.message || 'Erro ao fazer upload do avatar')
    } finally {
      setUploadingAvatar(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Validador de password em tempo real
  const passwordRequirements = useMemo(() => {
    const password = passwordData.newPassword
    return {
      minLength: password.length >= 6,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      matches: password === passwordData.confirmPassword && password.length > 0
    }
  }, [passwordData.newPassword, passwordData.confirmPassword])

  const allRequirementsMet = Object.values(passwordRequirements).every(req => req === true)

  const handlePasswordChange = async (e) => {
    e.preventDefault()

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showError('As passwords não coincidem')
      return
    }

    if (!allRequirementsMet) {
      showError('A password não cumpre todos os requisitos')
      return
    }

    setChangingPassword(true)
    try {
      await api.put('/auth/me/password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      })

      success('Password alterada com sucesso!')
      setShowPasswordModal(false)
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    } catch (error) {
      console.error('Erro ao alterar password:', error)
      showError(error.response?.data?.message || 'Erro ao alterar password')
    } finally {
      setChangingPassword(false)
    }
  }

  // Recalcular reputação ao carregar o perfil (apenas uma vez)
  useEffect(() => {
    let isMounted = true
    const recalculateReputation = async () => {
      if (user?._id && loadUser) {
        try {
          await api.post('/users/me/reputation/recalculate')
          if (isMounted && loadUser) {
            await loadUser() // Recarregar dados do utilizador
          }
        } catch (error) {
          console.error('Erro ao recalcular reputação:', error)
        }
      }
    }
    recalculateReputation()
    
    return () => {
      isMounted = false
    }
  }, []) // Executar apenas uma vez ao montar o componente

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar filters={{}} onFilterChange={() => {}} />

      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Botão de Voltar */}
          <button
            onClick={() => navigate(-1)}
            className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors group"
          >
            <FiArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span>Voltar</span>
          </button>

          {/* Profile Header */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <Avatar user={user} size="xl" className="border-4 border-blue-600" />
                  <button
                    onClick={() => setShowAvatarModal(true)}
                    className="absolute bottom-0 right-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-primary-700 hover:scale-110 transition-all border-2 border-white"
                    title="Alterar foto de perfil"
                  >
                    <FiCamera className="w-4 h-4" />
                  </button>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-800">{user?.name}</h1>
                  <p className="text-gray-600">{user?.email}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                      {user?.role}
                    </span>
                    {user?.course && (
                      <span className="text-gray-600 text-sm">{user.course}</span>
                    )}
                    {user?.year && (
                      <span className="text-gray-600 text-sm">{user.year}º Ano</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium flex items-center gap-2"
                  title="Alterar password"
                >
                  <FiLock className="w-4 h-4" />
                  <span>Alterar Password</span>
                </button>
                <button
                  onClick={logout}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                >
                  Sair
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6 mt-8 pt-8 border-t border-gray-200">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-800">{user?.materialsUploaded || materials.length}</div>
                <div className="text-sm text-gray-600">Materiais Partilhados</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-800">{user?.materialsDownloaded || 0}</div>
                <div className="text-sm text-gray-600">Materiais Descarregados</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-800">
                  {user?.reputation ? `${user.reputation.toFixed(1)}/5` : '0.0/5'}
                </div>
                <div className="text-sm text-gray-600">Reputação (estrelas)</div>
              </div>
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="card p-8 lg:p-10 mb-10">
            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-200">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                <FiBell className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Preferências de Notificações</h2>
                <p className="text-sm text-gray-500 mt-1">Escolhe que tipos de notificações queres receber</p>
              </div>
            </div>

            {loadingPreferences ? (
              <div className="flex items-center justify-center py-12">
                <FiLoader className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : (
              <div className="space-y-3">
                {/* Rating Notifications */}
                <div className="flex items-center justify-between p-5 bg-gradient-to-r from-white to-gray-50 rounded-xl border border-gray-200 hover:border-yellow-300 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-xl shadow-sm">
                      <FiStar className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Avaliações nos Meus Materiais</h3>
                      <p className="text-sm text-gray-600">Receber notificações quando alguém avalia um dos teus materiais</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleTogglePreference('rating')}
                    disabled={savingPreferences}
                    className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      notificationPreferences.rating ? 'bg-blue-600' : 'bg-gray-300'
                    } ${savingPreferences ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        notificationPreferences.rating ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Comment on My Material Notifications */}
                <div className="flex items-center justify-between p-5 bg-gradient-to-r from-white to-gray-50 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-sm">
                      <FiMessageCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Comentários nos Meus Materiais</h3>
                      <p className="text-sm text-gray-600">Receber notificações quando alguém comenta num dos teus materiais</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleTogglePreference('commentOnMyMaterial')}
                    disabled={savingPreferences}
                    className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      notificationPreferences.commentOnMyMaterial ? 'bg-blue-600' : 'bg-gray-300'
                    } ${savingPreferences ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        notificationPreferences.commentOnMyMaterial ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Comment on Favorite Notifications */}
                <div className="flex items-center justify-between p-5 bg-gradient-to-r from-white to-gray-50 rounded-xl border border-gray-200 hover:border-pink-300 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl shadow-sm">
                      <FiHeart className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Comentários em Favoritos</h3>
                      <p className="text-sm text-gray-600">Receber notificações quando alguém comenta num material dos teus favoritos</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleTogglePreference('commentOnFavorite')}
                    disabled={savingPreferences}
                    className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      notificationPreferences.commentOnFavorite ? 'bg-blue-600' : 'bg-gray-300'
                    } ${savingPreferences ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        notificationPreferences.commentOnFavorite ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Report Notifications (Only for Admins) */}
                {user?.role === 'Administrador' && (
                  <div className="flex items-center justify-between p-5 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl border-2 border-red-200 hover:border-red-400 hover:shadow-lg transition-all duration-200">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-sm">
                        <FiAlertCircle className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">Reports</h3>
                        <p className="text-sm text-gray-600">Receber notificações quando há novos reports para analisar</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleTogglePreference('report')}
                      disabled={savingPreferences}
                      className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        notificationPreferences.report ? 'bg-blue-600' : 'bg-gray-300'
                      } ${savingPreferences ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          notificationPreferences.report ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* My Materials */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Os Meus Materiais</h2>
              <Link
                to="/upload"
                className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl hover:shadow-green-500/50 transform hover:-translate-y-0.5"
              >
                + Novo Material
              </Link>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : materials.length === 0 ? (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <p className="text-gray-500 text-lg mb-4">Ainda não partilhaste nenhum material.</p>
                <Link
                  to="/upload"
                  className="inline-block px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-medium"
                >
                  Partilhar Primeiro Material
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {materials.map((material) => (
                  <MaterialCard 
                    key={material._id} 
                    material={material}
                    onDelete={handleDeleteMaterial}
                    showDelete={true}
                    isDeleting={deleting === material._id}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal de Upload de Avatar */}
      {showAvatarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Alterar Foto de Perfil</h2>
              <button
                onClick={() => setShowAvatarModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={handleAvatarUpload}
                className="hidden"
                id="avatar-upload"
              />
              <label
                htmlFor="avatar-upload"
                className="block w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-500 transition-colors text-center"
              >
                {uploadingAvatar ? (
                  <div className="flex items-center justify-center gap-2">
                    <FiLoader className="w-5 h-5 animate-spin text-primary-600" />
                    <span className="text-gray-600">A fazer upload...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <FiCamera className="w-8 h-8 text-gray-400" />
                    <span className="text-gray-600">Clica para selecionar uma imagem</span>
                    <span className="text-xs text-gray-500">JPG, PNG, GIF ou WEBP (máx. 2MB)</span>
                  </div>
                )}
              </label>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAvatarModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                disabled={uploadingAvatar}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Alteração de Password */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Alterar Password</h2>
              <button
                onClick={() => {
                  setShowPasswordModal(false)
                  setPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                  })
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handlePasswordChange}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password Atual
                  </label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                    disabled={changingPassword}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nova Password
                  </label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      passwordData.newPassword && !allRequirementsMet
                        ? 'border-red-300 focus:ring-red-500'
                        : passwordData.newPassword && allRequirementsMet
                        ? 'border-green-300 focus:ring-green-500'
                        : 'border-gray-300'
                    }`}
                    required
                    disabled={changingPassword}
                  />
                  {passwordData.newPassword && (
                    <div className="mt-2 space-y-1.5">
                      <div className={`flex items-center gap-2 text-xs ${
                        passwordRequirements.minLength ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                          passwordRequirements.minLength ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          {passwordRequirements.minLength && <FiCheck className="w-3 h-3" />}
                        </div>
                        Pelo menos 6 caracteres
                      </div>
                      <div className={`flex items-center gap-2 text-xs ${
                        passwordRequirements.hasUpperCase ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                          passwordRequirements.hasUpperCase ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          {passwordRequirements.hasUpperCase && <FiCheck className="w-3 h-3" />}
                        </div>
                        Pelo menos uma letra maiúscula
                      </div>
                      <div className={`flex items-center gap-2 text-xs ${
                        passwordRequirements.hasLowerCase ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                          passwordRequirements.hasLowerCase ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          {passwordRequirements.hasLowerCase && <FiCheck className="w-3 h-3" />}
                        </div>
                        Pelo menos uma letra minúscula
                      </div>
                      <div className={`flex items-center gap-2 text-xs ${
                        passwordRequirements.hasNumber ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                          passwordRequirements.hasNumber ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          {passwordRequirements.hasNumber && <FiCheck className="w-3 h-3" />}
                        </div>
                        Pelo menos um número
                      </div>
                      <div className={`flex items-center gap-2 text-xs ${
                        passwordRequirements.hasSpecialChar ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                          passwordRequirements.hasSpecialChar ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          {passwordRequirements.hasSpecialChar && <FiCheck className="w-3 h-3" />}
                        </div>
                        Pelo menos um caractere especial (!@#$%^&*...)
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmar Nova Password
                  </label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      passwordData.confirmPassword && !passwordRequirements.matches
                        ? 'border-red-300 focus:ring-red-500'
                        : passwordData.confirmPassword && passwordRequirements.matches
                        ? 'border-green-300 focus:ring-green-500'
                        : 'border-gray-300 focus:ring-primary-500'
                    }`}
                    required
                    disabled={changingPassword}
                  />
                  {passwordData.confirmPassword && !passwordRequirements.matches && (
                    <p className="mt-1 text-xs text-red-600">As passwords não coincidem</p>
                  )}
                  {passwordData.confirmPassword && passwordRequirements.matches && (
                    <p className="mt-1 text-xs text-green-600">As passwords coincidem</p>
                  )}
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false)
                    setPasswordData({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: ''
                    })
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                  disabled={changingPassword}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={changingPassword || !allRequirementsMet}
                >
                  {changingPassword ? (
                    <>
                      <FiLoader className="w-4 h-4 animate-spin" />
                      A alterar...
                    </>
                  ) : (
                    <>
                      <FiCheck className="w-4 h-4" />
                      Alterar Password
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm || (() => {})}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText="Eliminar"
      />
    </div>
  )
}

export default ProfilePage

