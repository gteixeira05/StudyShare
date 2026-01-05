import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import api from '../services/api'
import { 
  FiFileText, 
  FiStar, 
  FiDownload, 
  FiUser, 
  FiCalendar,
  FiBook,
  FiEdit,
  FiFile,
  FiEdit3,
  FiClipboard,
  FiBarChart2,
  FiTrash2,
  FiHeart,
  FiFlag
} from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'

const MaterialCard = ({ material, onDelete, showDelete = false, isDeleting = false }) => {
  const { user, isAuthenticated } = useAuth()
  const { success, error: showError } = useToast()
  const navigate = useNavigate()
  const [isFavorite, setIsFavorite] = useState(false)
  const [favoriteLoading, setFavoriteLoading] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reporting, setReporting] = useState(false)
  
  const isOwner = user && material && material.author?._id === user._id

  // Verificar se está nos favoritos
  useEffect(() => {
    const checkFavorite = async () => {
      if (!isAuthenticated || !user) return
      try {
        const response = await api.get(`/favorites/check/${material._id}`)
        setIsFavorite(response.data.isFavorite)
      } catch (error) {
        console.error('Erro ao verificar favorito:', error)
      }
    }
    checkFavorite()
  }, [material._id, isAuthenticated, user])

  const handleFavoriteClick = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!isAuthenticated) {
      return
    }

    setFavoriteLoading(true)
    try {
      if (isFavorite) {
        await api.delete(`/favorites/${material._id}`)
        setIsFavorite(false)
      } else {
        await api.post(`/favorites/${material._id}`)
        setIsFavorite(true)
      }
    } catch (error) {
      console.error('Erro ao atualizar favorito:', error)
      showError(error.response?.data?.message || 'Erro ao atualizar favorito')
    } finally {
      setFavoriteLoading(false)
    }
  }

  const handleReportClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isAuthenticated) return
    setShowReportModal(true)
  }

  const handleSubmitReport = async (e) => {
    e.preventDefault()
    if (!reportReason.trim() || reportReason.length < 10) {
      showError('Por favor, fornece um motivo com pelo menos 10 caracteres')
      return
    }

    setReporting(true)
    try {
      await api.post(`/materials/${material._id}/report`, {
        reason: reportReason.trim()
      })
      success('Material reportado com sucesso. O administrador irá analisar.')
      setShowReportModal(false)
      setReportReason('')
    } catch (error) {
      showError(error.response?.data?.message || 'Erro ao reportar material')
    } finally {
      setReporting(false)
    }
  }
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const getMaterialIcon = (type) => {
    const icons = {
      'Apontamento': <FiEdit className="w-12 h-12" />,
      'Resumo': <FiFile className="w-12 h-12" />,
      'Exercícios': <FiEdit3 className="w-12 h-12" />,
      'Exame': <FiClipboard className="w-12 h-12" />,
      'Slides': <FiBarChart2 className="w-12 h-12" />
    }
    return icons[type] || <FiFileText className="w-12 h-12" />
  }

  const getMaterialIconSmall = (type) => {
    const icons = {
      'Apontamento': <FiEdit className="w-4 h-4" />,
      'Resumo': <FiFile className="w-4 h-4" />,
      'Exercícios': <FiEdit3 className="w-4 h-4" />,
      'Exame': <FiClipboard className="w-4 h-4" />,
      'Slides': <FiBarChart2 className="w-4 h-4" />
    }
    return icons[type] || <FiFileText className="w-4 h-4" />
  }

  const getMaterialColor = (type) => {
    const colors = {
      'Apontamento': 'from-blue-500 to-blue-600',
      'Resumo': 'from-purple-500 to-purple-600',
      'Exercícios': 'from-green-500 to-green-600',
      'Exame': 'from-red-500 to-red-600',
      'Slides': 'from-orange-500 to-orange-600'
    }
    return colors[type] || 'from-gray-500 to-gray-600'
  }

  const handleDeleteClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    onDelete?.(material._id)
  }

  return (
    <div className="relative h-full group">
      <Link to={`/material/${material._id}`}>
        <div className="card cursor-pointer h-full flex flex-col overflow-hidden hover:scale-[1.02] transition-all duration-300">
        {/* Header com gradiente */}
        <div className={`h-36 bg-gradient-to-br ${getMaterialColor(material.materialType)} flex items-center justify-center relative overflow-hidden`}>
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10 text-white">
            {getMaterialIcon(material.materialType)}
          </div>
          {/* Badge do ano no canto superior esquerdo */}
          <div className="absolute top-3 left-3 z-20">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-2 py-1">
              <span className="text-xs font-semibold text-white">{material.year}º Ano</span>
            </div>
          </div>
          {/* Botões no canto superior direito */}
          <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
            {/* Botão de editar (apenas para dono) */}
            {isOwner && (
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  navigate(`/material/${material._id}`)
                }}
                className="opacity-0 group-hover:opacity-100 hover:opacity-100 transition-all duration-300 transform hover:scale-110 active:scale-95 p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-lg hover:shadow-xl"
                title="Editar material"
              >
                <FiEdit className="w-4 h-4" />
              </button>
            )}
            {/* Botão de favoritos */}
            {isAuthenticated && (
              <button
                onClick={handleFavoriteClick}
                disabled={favoriteLoading}
                className="opacity-0 group-hover:opacity-100 hover:opacity-100 transition-all duration-300 transform hover:scale-110 active:scale-95 p-2 bg-white/20 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg shadow-lg hover:shadow-xl backdrop-blur-sm"
                title={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
              >
                {favoriteLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <FiHeart className={`w-4 h-4 ${isFavorite ? 'fill-white' : ''}`} />
                )}
              </button>
            )}
            {/* Botão de apagar */}
            {showDelete && onDelete && (
              <button
                onClick={handleDeleteClick}
                disabled={isDeleting}
                className="opacity-0 group-hover:opacity-100 hover:opacity-100 transition-all duration-300 transform hover:scale-110 active:scale-95 p-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg shadow-lg hover:shadow-xl"
                title="Apagar material"
              >
                {isDeleting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <FiTrash2 className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Conteúdo */}
        <div className="p-5 flex-1 flex flex-col">
          <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
            {material.title}
          </h3>

          <p className="text-sm text-gray-600 mb-4 line-clamp-2 flex-1 leading-relaxed">
            {material.description || 'Sem descrição disponível'}
          </p>

          {/* Meta informações */}
          <div className="space-y-3 mt-auto">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-gray-600">
                <FiBook className="w-3.5 h-3.5" />
                <span className="font-medium">{material.discipline}</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-500">
                <FiUser className="w-3.5 h-3.5" />
                <span>{material.author?.name || 'Anónimo'}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <div className="flex items-center gap-1.5">
                <FiStar className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span className="text-sm font-semibold text-gray-900">
                  {material.rating?.average?.toFixed(1) || '0.0'}
                </span>
                <span className="text-xs text-gray-500">
                  ({material.rating?.count || 0})
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                <FiDownload className="w-3.5 h-3.5" />
                <span>{material.downloads || 0}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-50 text-primary-700 text-xs font-semibold rounded-full">
                {getMaterialIconSmall(material.materialType)}
                <span>{material.materialType}</span>
              </span>
              <div className="flex items-center gap-2">
                {isAuthenticated && (
                  <button
                    onClick={handleReportClick}
                    className="opacity-0 group-hover:opacity-100 transition-all duration-300 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                    title="Reportar material"
                  >
                    <FiFlag className="w-3.5 h-3.5" />
                  </button>
                )}
                <div className="flex items-center gap-1 text-gray-400 text-xs">
                  <FiCalendar className="w-3.5 h-3.5" />
                  <span>{formatDate(material.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>

    {/* Modal de Report */}
    {showReportModal && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowReportModal(false)}>
        <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-xl font-bold text-gray-900 mb-4">Reportar Material</h3>
          <p className="text-sm text-gray-600 mb-4">
            Por favor, explica o motivo pelo qual estás a reportar este material:
          </p>
          <form onSubmit={handleSubmitReport}>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Ex: Conteúdo inadequado, spam, violação de direitos autorais..."
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all resize-none"
              rows={4}
              maxLength={500}
              required
            />
            <div className="flex justify-between items-center mt-2 mb-4">
              <span className="text-xs text-gray-400">{reportReason.length}/500</span>
              <span className="text-xs text-gray-400">Mínimo: 10 caracteres</span>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowReportModal(false)
                  setReportReason('')
                }}
                className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={reporting || reportReason.trim().length < 10}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {reporting ? 'A reportar...' : 'Reportar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    </div>
  )
}

export default MaterialCard
