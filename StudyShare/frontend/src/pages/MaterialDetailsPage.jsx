import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useSocket } from '../contexts/SocketContext'
import Sidebar from '../components/Sidebar'
import Avatar from '../components/Avatar'
import { 
  FiDownload, 
  FiLoader, 
  FiStar, 
  FiSend,
  FiMessageCircle,
  FiUser,
  FiCalendar,
  FiEye,
  FiArrowLeft,
  FiHeart,
  FiFlag,
  FiEdit,
  FiTrash2,
  FiThumbsUp,
  FiThumbsDown,
  FiFilter
} from 'react-icons/fi'

const MaterialDetailsPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { success, error: showError, warning } = useToast()
  const { socket } = useSocket()
  const [material, setMaterial] = useState(null)
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [submittingRating, setSubmittingRating] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const [favoriteLoading, setFavoriteLoading] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reporting, setReporting] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editFormData, setEditFormData] = useState({})
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [commentSortBy, setCommentSortBy] = useState('date') // 'date', 'likes', 'dislikes', 'popularity'
  const [showCommentReportModal, setShowCommentReportModal] = useState(false)
  const [commentReportReason, setCommentReportReason] = useState('')
  const [reportingComment, setReportingComment] = useState(null)
  const [reportingCommentLoading, setReportingCommentLoading] = useState(false)
  const hasFetchedRef = useRef(false)

  useEffect(() => {
    let isMounted = true
    
    const fetchMaterial = async () => {
      // Evitar múltiplas chamadas simultâneas (React StrictMode)
      if (hasFetchedRef.current) {
        return
      }
      hasFetchedRef.current = true
      
      try {
        // Fazer pedido normal - o backend vai decidir se conta a visualização
        const response = await api.get(`/materials/${id}`)
        if (isMounted) {
          const materialData = response.data.material
          setMaterial(materialData)
          if (materialData.userRating) {
            setRating(materialData.userRating)
          }
        }
      } catch (error) {
        console.error('Erro ao buscar material:', error)
      } finally {
        if (isMounted) {
          setLoading(false)
          // Reset após um pequeno delay para permitir novas visualizações
          setTimeout(() => {
            hasFetchedRef.current = false
          }, 500)
        }
      }
    }

    fetchMaterial()
    
    return () => {
      isMounted = false
    }
  }, [id])
  
  // Reset quando o ID muda
  useEffect(() => {
    hasFetchedRef.current = false
  }, [id])

  // Socket.IO: Entrar na sala do material e escutar novos comentários
  useEffect(() => {
    if (!socket || !id) return

    // Entrar na sala do material
    socket.emit('join_material_room', id)

    // Escutar novos comentários
    const handleNewComment = (newComment) => {
      setMaterial(prevMaterial => {
        if (!prevMaterial) return prevMaterial
        
        // Verificar se o comentário já existe (evitar duplicados)
        const commentExists = prevMaterial.comments?.some(
          c => c._id === newComment._id
        )
        
        if (commentExists) {
          return prevMaterial
        }

        return {
          ...prevMaterial,
          comments: [...(prevMaterial.comments || []), newComment]
        }
      })
    }

    socket.on('new_comment', handleNewComment)

    // Limpar quando sair da página
    return () => {
      socket.emit('leave_material_room', id)
      socket.off('new_comment', handleNewComment)
    }
  }, [socket, id])

  // Verificar se está nos favoritos
  useEffect(() => {
    const checkFavorite = async () => {
      if (!user) return
      try {
        const response = await api.get(`/favorites/check/${id}`)
        setIsFavorite(response.data.isFavorite)
      } catch (error) {
        console.error('Erro ao verificar favorito:', error)
      }
    }
    checkFavorite()
  }, [id, user])

  const handleFavoriteToggle = async () => {
    if (!user) {
      navigate('/login')
      return
    }

    setFavoriteLoading(true)
    try {
      if (isFavorite) {
        await api.delete(`/favorites/${id}`)
        setIsFavorite(false)
      } else {
        await api.post(`/favorites/${id}`)
        setIsFavorite(true)
      }
    } catch (error) {
      console.error('Erro ao atualizar favorito:', error)
      showError(error.response?.data?.message || 'Erro ao atualizar favorito')
    } finally {
      setFavoriteLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!user) {
      navigate('/login')
      return
    }

    try {
      setDownloading(true)
      
      // Obter token para autenticação
      const token = localStorage.getItem('token')
      const apiBaseUrl = '/api'
      
      // Usar fetch diretamente para evitar problemas com axios e blob
      const response = await fetch(`${apiBaseUrl}/materials/${id}/download`, {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Accept': '*/*'
        }
      })
      
      // Verificar se a resposta é OK
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      // Verificar o tipo de conteúdo
      const contentType = response.headers.get('content-type') || ''
      
      // Verificar se a resposta é binária (blob) ou JSON
      let blob, fileName
      
      if (contentType.includes('application/json')) {
        // Resposta JSON - verificar se é erro ou URL para download
        const responseData = await response.json()
        
        // Se for erro 404, mostrar mensagem
        if (response.status === 404 || responseData.message?.includes('não encontrado')) {
          showError(`Ficheiro não encontrado: ${responseData.fileName || 'desconhecido'}. O ficheiro pode ter sido removido ou o caminho está incorreto.`)
          setDownloading(false)
          return
        }
        
        const { fileUrl, fileName: fn, isExternal } = responseData
        fileName = fn || material?.fileName || 'material'
        
        if (!fileUrl) {
          throw new Error('URL do ficheiro não disponível')
        }
        
        // Se for URL local (não externa), adicionar base URL do backend
        let downloadUrl = fileUrl
        if (!isExternal && !fileUrl.startsWith('http')) {
          // URL local - usar URL completa do backend
          const backendUrl = 'http://localhost:5001'
          downloadUrl = fileUrl.startsWith('/') 
            ? `${backendUrl}${fileUrl}` 
            : `${backendUrl}/${fileUrl}`
        }
        
        // Sempre tentar fazer download direto da URL
        try {
          const fileResponse = await fetch(downloadUrl, { 
            mode: 'cors',
            credentials: 'omit'
          })
          
          if (fileResponse.ok) {
            blob = await fileResponse.blob()
            // Continuar para fazer download do blob
          } else {
            // Se for 404, mostrar mensagem específica
            if (fileResponse.status === 404) {
              showError(`Ficheiro não encontrado no servidor. Verifica se o ficheiro existe.`)
              setDownloading(false)
              return
            }
            throw new Error(`HTTP error! status: ${fileResponse.status}`)
          }
        } catch (fetchError) {
          // Se for erro de rede/CORS, tentar abrir diretamente
          if (fetchError.message.includes('404')) {
            showError(`Ficheiro não encontrado: ${fileName}. O ficheiro pode ter sido removido.`)
          } else {
            // Para outros erros, abrir diretamente
            window.open(downloadUrl, '_blank')
          }
          setDownloading(false)
          return
        }
      } else {
        // Resposta binária - download direto do backend
        blob = await response.blob()
        
        // Tentar obter o nome do ficheiro dos headers
        const contentDisposition = response.headers.get('content-disposition') || ''
        if (contentDisposition) {
          // Tentar extrair filename (pode estar em formato RFC 5987)
          // Formato: attachment; filename="file.pdf"; filename*=UTF-8''file.pdf
          const filenameMatch = contentDisposition.match(/filename\*?=['"]?([^'";]+)['"]?/i)
          if (filenameMatch) {
            // Decodificar se estiver em formato UTF-8''
            let decodedName = filenameMatch[1]
            if (decodedName.includes("UTF-8''")) {
              decodedName = decodeURIComponent(decodedName.split("UTF-8''")[1])
            } else if (decodedName.startsWith('"') && decodedName.endsWith('"')) {
              decodedName = decodedName.slice(1, -1)
            }
            fileName = decodedName || material?.fileName || 'material'
          } else {
            fileName = material?.fileName || 'material'
          }
        } else {
          fileName = material?.fileName || 'material'
        }
        
        // Garantir extensão correta baseada no tipo de conteúdo
        if (!fileName.includes('.')) {
          if (contentType.includes('pdf')) {
            fileName += '.pdf'
          } else if (contentType.includes('powerpoint') || contentType.includes('presentation') || contentType.includes('vnd.ms-powerpoint')) {
            fileName += '.pptx'
          } else if (contentType.includes('word') || contentType.includes('msword')) {
            fileName += '.docx'
          } else if (contentType.includes('zip')) {
            fileName += '.zip'
          }
        }
      }

      if (!blob) {
        throw new Error('Não foi possível obter o ficheiro')
      }

      // Criar link de download e forçar download
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      
      // Limpar após um pequeno delay
      setTimeout(() => {
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      }, 100)

      // Atualizar contador de downloads no material
      const updatedMaterial = { ...material }
      updatedMaterial.downloads = (material.downloads || 0) + 1
      setMaterial(updatedMaterial)
    } catch (error) {
      console.error('Erro ao fazer download:', error)
      // Se falhar completamente, mostrar mensagem e tentar abrir diretamente como último recurso
      const shouldOpenDirectly = window.confirm(
        'Não foi possível fazer download automático. Deseja abrir o ficheiro numa nova janela?'
      )
      if (shouldOpenDirectly && material?.fileUrl) {
        window.open(material.fileUrl, '_blank')
      } else if (!shouldOpenDirectly) {
        warning('Download cancelado. Se o problema persistir, verifica a ligação à internet e tenta novamente.')
      }
    } finally {
      setDownloading(false)
    }
  }

  const handleSubmitComment = async (e) => {
    e.preventDefault()
    if (!comment.trim() || !user) return

    try {
      setSubmittingComment(true)
      const response = await api.post(`/materials/${id}/comments`, {
        text: comment.trim()
      })

      // Não precisa atualizar aqui porque o Socket.IO vai emitir o evento
      // Mas atualizamos localmente para feedback imediato
      setComment('')
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error)
      showError(error.response?.data?.message || 'Erro ao adicionar comentário')
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleCommentLike = async (commentId) => {
    if (!user) return

    try {
      const response = await api.post(`/materials/${id}/comments/${commentId}/like`)
      
      // Atualizar comentário no material
      setMaterial(prevMaterial => {
        if (!prevMaterial) return prevMaterial
        
        const updatedComments = prevMaterial.comments.map(comment => {
          if (comment._id === commentId) {
            return response.data.comment
          }
          return comment
        })
        
        return {
          ...prevMaterial,
          comments: updatedComments
        }
      })
    } catch (error) {
      console.error('Erro ao dar like no comentário:', error)
      showError(error.response?.data?.message || 'Erro ao dar like no comentário')
    }
  }

  const handleCommentDislike = async (commentId) => {
    if (!user) return

    try {
      const response = await api.post(`/materials/${id}/comments/${commentId}/dislike`)
      
      // Atualizar comentário no material
      setMaterial(prevMaterial => {
        if (!prevMaterial) return prevMaterial
        
        const updatedComments = prevMaterial.comments.map(comment => {
          if (comment._id === commentId) {
            return response.data.comment
          }
          return comment
        })
        
        return {
          ...prevMaterial,
          comments: updatedComments
        }
      })
    } catch (error) {
      console.error('Erro ao dar dislike no comentário:', error)
      showError(error.response?.data?.message || 'Erro ao dar dislike no comentário')
    }
  }

  const handleCommentReportClick = (commentId) => {
    if (!user) return
    setReportingComment(commentId)
    setShowCommentReportModal(true)
  }

  const handleSubmitCommentReport = async (e) => {
    e.preventDefault()
    if (!commentReportReason.trim() || commentReportReason.length < 10) {
      showError('Por favor, fornece um motivo com pelo menos 10 caracteres')
      return
    }

    if (!reportingComment) return

    setReportingCommentLoading(true)
    try {
      await api.post(`/materials/${id}/comments/${reportingComment}/report`, {
        reason: commentReportReason.trim()
      })
      success('Comentário reportado com sucesso. O administrador irá analisar.')
      setShowCommentReportModal(false)
      setCommentReportReason('')
      setReportingComment(null)
    } catch (error) {
      showError(error.response?.data?.message || 'Erro ao reportar comentário')
    } finally {
      setReportingCommentLoading(false)
    }
  }

  // Função para ordenar comentários
  const getSortedComments = () => {
    if (!material?.comments) return []
    
    const comments = [...material.comments]
    
    switch (commentSortBy) {
      case 'likes':
        return comments.sort((a, b) => {
          const aLikes = a.likes?.length || 0
          const bLikes = b.likes?.length || 0
          return bLikes - aLikes
        })
      case 'dislikes':
        return comments.sort((a, b) => {
          const aDislikes = a.dislikes?.length || 0
          const bDislikes = b.dislikes?.length || 0
          return bDislikes - aDislikes
        })
      case 'popularity':
        return comments.sort((a, b) => {
          const aScore = (a.likes?.length || 0) - (a.dislikes?.length || 0)
          const bScore = (b.likes?.length || 0) - (b.dislikes?.length || 0)
          return bScore - aScore
        })
      case 'date':
      default:
        return comments.sort((a, b) => {
          return new Date(b.createdAt) - new Date(a.createdAt)
        })
    }
  }

  const handleSubmitRating = async (ratingValue) => {
    if (!user) {
      navigate('/login')
      return
    }

    if (submittingRating) return

    try {
      setSubmittingRating(true)
      const response = await api.post(`/materials/${id}/rating`, {
        rating: ratingValue
      })

      // Atualizar material com nova avaliação
      const updatedMaterial = { ...material }
      updatedMaterial.rating = response.data.rating
      updatedMaterial.userRating = response.data.rating.userRating
      setMaterial(updatedMaterial)
      setRating(response.data.rating.userRating) // Manter a avaliação do utilizador
      setHoveredRating(0) // Reset hover
    } catch (error) {
      console.error('Erro ao avaliar:', error)
      showError(error.response?.data?.message || 'Erro ao avaliar material')
    } finally {
      setSubmittingRating(false)
    }
  }

  const handleReportClick = () => {
    if (!user) {
      navigate('/login')
      return
    }
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
      await api.post(`/materials/${id}/report`, {
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

  const handleEditClick = () => {
    if (!user) return
    setEditFormData({
      title: material.title,
      description: material.description || '',
      discipline: material.discipline,
      course: material.course || '',
      year: material.year,
      materialType: material.materialType
    })
    setShowEditModal(true)
  }

  const handleSubmitEdit = async (e) => {
    e.preventDefault()
    setEditing(true)
    try {
      const response = await api.put(`/materials/${id}`, editFormData)
      setMaterial(response.data.material)
      setShowEditModal(false)
      success('Material atualizado com sucesso!')
    } catch (error) {
      showError(error.response?.data?.message || 'Erro ao atualizar material')
    } finally {
      setEditing(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Tens a certeza que queres eliminar este material? Esta ação não pode ser desfeita.')) {
      return
    }

    setDeleting(true)
    try {
      await api.delete(`/materials/${id}`)
      success('Material eliminado com sucesso')
      navigate('/')
    } catch (error) {
      showError(error.response?.data?.message || 'Erro ao eliminar material')
      setDeleting(false)
    }
  }

  const isAdmin = user?.role === 'Administrador'
  const isOwner = user && material && material.author?._id === user._id

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20">
        <Sidebar filters={{}} onFilterChange={() => {}} />
        <main className="flex-1 p-8 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <FiLoader className="w-12 h-12 text-primary-600 animate-spin" />
            <p className="text-gray-600 font-medium">A carregar material...</p>
          </div>
        </main>
      </div>
    )
  }

  if (!material) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20">
        <Sidebar filters={{}} onFilterChange={() => {}} />
        <main className="flex-1 p-8">
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm">
            <p className="text-gray-500 text-lg mb-4">Material não encontrado.</p>
            <Link to="/" className="text-primary-600 hover:text-primary-700 font-medium inline-flex items-center gap-2">
              <FiArrowLeft className="w-4 h-4" />
              <span>Voltar ao início</span>
            </Link>
          </div>
        </main>
      </div>
    )
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  const renderStars = (average, interactive = false, onRatingClick = null) => {
    const stars = []
    const fullStars = Math.floor(average)
    const hasHalfStar = average % 1 >= 0.5

    for (let i = 1; i <= 5; i++) {
      if (interactive) {
        // Para avaliação interativa, usar hoveredRating ou rating atual do utilizador
        const currentRating = hoveredRating || (material?.userRating || rating)
        stars.push(
          <button
            key={i}
            type="button"
            onClick={() => onRatingClick && onRatingClick(i)}
            onMouseEnter={() => setHoveredRating(i)}
            onMouseLeave={() => setHoveredRating(0)}
            className={`transition-all transform ${
              i <= currentRating
                ? 'text-yellow-500 scale-110'
                : 'text-gray-300 hover:text-yellow-400 hover:scale-105'
            }`}
            disabled={submittingRating}
          >
            <FiStar className={`w-6 h-6 ${i <= currentRating ? 'fill-current' : ''}`} />
          </button>
        )
      } else {
        stars.push(
          <FiStar
            key={i}
            className={`w-5 h-5 ${
              i <= fullStars
                ? 'text-yellow-500 fill-yellow-500'
                : i === fullStars + 1 && hasHalfStar
                ? 'text-yellow-500 fill-yellow-500 opacity-50'
                : 'text-gray-300'
            }`}
          />
        )
      }
    }
    return stars
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20">
      <Sidebar filters={{}} onFilterChange={() => {}} />

      <main className="flex-1 p-6 lg:p-8">
        {/* Botão de Voltar */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors group"
        >
          <FiArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span>Voltar</span>
        </button>

        {/* Breadcrumbs */}
        <div className="mb-6 text-sm text-gray-600 flex items-center gap-2">
          <Link to="/" className="hover:text-primary-600 transition-colors">Início</Link>
          <span>/</span>
          <span>{material.discipline}</span>
          <span>/</span>
          <span className="text-gray-800 font-medium">{material.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna Esquerda - Conteúdo Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Preview Card */}
            <div className="card p-6 lg:p-8">
              <div className="flex items-start justify-between gap-4 mb-4">
                <h1 className="text-3xl font-bold text-gray-900 flex-1">{material.title}</h1>
                <div className="flex items-center gap-2">
                  {(isAdmin || isOwner) && (
                    <>
                      <button
                        onClick={handleEditClick}
                        className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                        title="Editar material"
                      >
                        <FiEdit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                        title="Eliminar material"
                      >
                        {deleting ? (
                          <FiLoader className="w-5 h-5 animate-spin" />
                        ) : (
                          <FiTrash2 className="w-5 h-5" />
                        )}
                      </button>
                    </>
                  )}
                  {user && !isOwner && !isAdmin && (
                    <button
                      onClick={handleReportClick}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title="Reportar material"
                    >
                      <FiFlag className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="px-3 py-1.5 bg-primary-100 text-primary-700 text-sm font-semibold rounded-full">
                  {material.materialType}
                </span>
                <span className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-full">
                  {material.year}º Ano
                </span>
                {material.tags?.map((tag, idx) => (
                  <span key={idx} className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>

              <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-16 text-center mb-6">
                <svg className="mx-auto h-20 w-20 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <p className="mt-4 text-gray-600 font-medium">Pré-visualização do documento</p>
              </div>

              {material.description && (
                <div className="border-t border-gray-200 pt-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">Sobre este material</h2>
                  <p className="text-gray-600 leading-relaxed">{material.description}</p>
                </div>
              )}
            </div>

            {/* Comentários */}
            <div className="card p-6 lg:p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <FiMessageCircle className="w-6 h-6 text-primary-600" />
                  <h2 className="text-xl font-semibold text-gray-900">
                    Comentários ({material.comments?.length || 0})
                  </h2>
                </div>
                
                {/* Ordenação */}
                {material.comments && material.comments.length > 0 && (
                  <div className="flex items-center gap-2">
                    <FiFilter className="w-4 h-4 text-gray-500" />
                    <select
                      value={commentSortBy}
                      onChange={(e) => setCommentSortBy(e.target.value)}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="date">Mais Recentes</option>
                      <option value="likes">Mais Likes</option>
                      <option value="dislikes">Mais Dislikes</option>
                      <option value="popularity">Mais Populares</option>
                    </select>
                  </div>
                )}
              </div>

              {material.comments && material.comments.length > 0 ? (
                <div className="space-y-5 mb-6">
                  {getSortedComments().map((commentItem, idx) => {
                    const userLiked = user && commentItem.likes?.some(likeId => likeId.toString() === user._id || (typeof likeId === 'object' && likeId._id?.toString() === user._id))
                    const userDisliked = user && commentItem.dislikes?.some(dislikeId => dislikeId.toString() === user._id || (typeof dislikeId === 'object' && dislikeId._id?.toString() === user._id))
                    const likesCount = commentItem.likes?.length || 0
                    const dislikesCount = commentItem.dislikes?.length || 0

                    return (
                      <div key={commentItem._id || idx} className="border-b border-gray-100 pb-5 last:border-0 last:pb-0">
                        <div className="flex items-start gap-4">
                          <Avatar user={commentItem.user} size="lg" className="flex-shrink-0" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-gray-900">{commentItem.user?.name || 'Anónimo'}</h4>
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <FiCalendar className="w-3 h-3" />
                                {formatDate(commentItem.createdAt)}
                              </span>
                            </div>
                            <p className="text-gray-700 leading-relaxed mb-3">{commentItem.text}</p>
                            
                            {/* Botões de Like/Dislike */}
                            {user && (
                              <div className="flex items-center gap-4">
                                <button
                                  onClick={() => handleCommentLike(commentItem._id)}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                                    userLiked
                                      ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                                      : 'text-gray-500 hover:bg-gray-100 hover:text-blue-600'
                                  }`}
                                >
                                  <FiThumbsUp className={`w-4 h-4 ${userLiked ? 'fill-current' : ''}`} />
                                  <span className="text-sm font-medium">{likesCount}</span>
                                </button>
                                <button
                                  onClick={() => handleCommentDislike(commentItem._id)}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                                    userDisliked
                                      ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                      : 'text-gray-500 hover:bg-gray-100 hover:text-red-600'
                                  }`}
                                >
                                  <FiThumbsDown className={`w-4 h-4 ${userDisliked ? 'fill-current' : ''}`} />
                                  <span className="text-sm font-medium">{dislikesCount}</span>
                                </button>
                              </div>
                            )}
                            {!user && (
                              <div className="flex items-center gap-4 text-gray-400 text-sm">
                                <div className="flex items-center gap-1.5">
                                  <FiThumbsUp className="w-4 h-4" />
                                  <span>{likesCount}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <FiThumbsDown className="w-4 h-4" />
                                  <span>{dislikesCount}</span>
                                </div>
                              </div>
                            )}
                            
                            {/* Botão de reportar */}
                            {user && commentItem.user?._id !== user._id && (
                              <button
                                onClick={() => handleCommentReportClick(commentItem._id)}
                                className="ml-auto text-gray-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-all text-sm flex items-center gap-1"
                                title="Reportar comentário"
                              >
                                <FiFlag className="w-3.5 h-3.5" />
                                <span className="text-xs">Reportar</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 mb-6">
                  <FiMessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Seja o primeiro a comentar!</p>
                </div>
              )}

              {user ? (
                <form onSubmit={handleSubmitComment} className="flex gap-3">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Escreve um comentário..."
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all bg-white"
                      maxLength={1000}
                    />
                    <span className="absolute bottom-2 right-3 text-xs text-gray-400">
                      {comment.length}/1000
                    </span>
                  </div>
                  <button
                    type="submit"
                    disabled={!comment.trim() || submittingComment}
                    className="btn-primary flex items-center gap-2 px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submittingComment ? (
                      <FiLoader className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <FiSend className="w-5 h-5" />
                        <span>Enviar</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <div className="text-center py-4 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="text-gray-600 text-sm mb-2">Precisas de estar autenticado para comentar</p>
                  <Link to="/login" className="text-primary-600 hover:text-primary-700 font-semibold text-sm">
                    Inicia sessão
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Coluna Direita - Sidebar de Ações */}
          <div className="space-y-6">
            {/* Download Card */}
            <div className="card p-6">
              <div className="space-y-4">
                <button
                  onClick={handleDownload}
                  disabled={downloading || !user}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-4 px-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {downloading ? (
                    <>
                      <FiLoader className="w-5 h-5 animate-spin" />
                      <span>A descarregar...</span>
                    </>
                  ) : (
                    <>
                      <FiDownload className="w-5 h-5" />
                      <span>DESCARREGAR GRÁTIS</span>
                    </>
                  )}
                </button>
                {user && (
                  <button
                    onClick={handleFavoriteToggle}
                    disabled={favoriteLoading}
                    className={`w-full font-semibold py-4 px-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                      isFavorite
                        ? 'bg-red-500 hover:bg-red-600 text-white'
                        : 'bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-300'
                    }`}
                    title={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                  >
                    {favoriteLoading ? (
                      <>
                        <FiLoader className="w-5 h-5 animate-spin" />
                        <span>A processar...</span>
                      </>
                    ) : (
                      <>
                        <FiHeart className={`w-5 h-5 ${isFavorite ? 'fill-white' : ''}`} />
                        <span>{isFavorite ? 'NOS FAVORITOS' : 'ADICIONAR AOS FAVORITOS'}</span>
                      </>
                    )}
                  </button>
                )}
                {user && !isOwner && (
                  <button
                    onClick={handleReportClick}
                    className="w-full font-semibold py-4 px-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 bg-white hover:bg-red-50 text-red-600 border-2 border-red-300 hover:border-red-400"
                  >
                    <FiFlag className="w-5 h-5" />
                    <span>REPORTAR MATERIAL</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6 mb-6">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{material.downloads || 0}</div>
                  <div className="text-xs text-gray-600 mt-1">Downloads</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900 flex items-center justify-center gap-1">
                    <FiEye className="w-5 h-5" />
                    {material.views || 0}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Visualizações</div>
                </div>
              </div>

              {/* Avaliação */}
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-semibold text-gray-900">Avaliação</span>
                  <div className="flex items-center gap-1">
                    {renderStars(material.rating?.average || 0)}
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-3xl font-bold text-gray-900">
                    {material.rating?.average?.toFixed(1) || '0.0'}
                  </span>
                  <span className="text-gray-600">/ 5.0</span>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  {material.rating?.count || 0} avaliações
                </p>

                {user ? (
                  <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                    {material.userRating ? (
                      <>
                        <p className="text-sm font-semibold text-gray-700 mb-2">A tua avaliação:</p>
                        <div className="flex items-center gap-2 justify-center mb-3">
                          {renderStars(material.userRating, true, handleSubmitRating)}
                        </div>
                        <p className="text-xs text-center text-green-600 font-medium">
                          ✓ Já avaliaste este material ({material.userRating} estrelas)
                        </p>
                        <p className="text-xs text-center text-gray-500 mt-1">
                          Clica nas estrelas para alterar a tua avaliação
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-gray-700 mb-3">Avalia este material:</p>
                        <div className="flex items-center gap-2 justify-center">
                          {renderStars(0, true, handleSubmitRating)}
                        </div>
                        {hoveredRating > 0 && (
                          <p className="text-xs text-center text-gray-500 mt-2">
                            Clica para avaliar com {hoveredRating} {hoveredRating === 1 ? 'estrela' : 'estrelas'}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 p-4 bg-gray-50 rounded-xl text-center">
                    <p className="text-sm text-gray-600 mb-2">Precisas de estar autenticado para avaliar</p>
                    <Link to="/login" className="text-primary-600 hover:text-primary-700 font-semibold text-sm">
                      Inicia sessão
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Author Card */}
            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Autor</h3>
              <div className="flex items-center gap-3">
                <Avatar user={material.author} size="xl" />
                <div>
                  <h4 className="font-semibold text-gray-900">{material.author?.name || 'Anónimo'}</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {material.author?.materialsUploaded || 0} materiais partilhados
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

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

      {/* Modal de Reportar Comentário */}
      {showCommentReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => {
          setShowCommentReportModal(false)
          setCommentReportReason('')
          setReportingComment(null)
        }}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Reportar Comentário</h3>
            <p className="text-sm text-gray-600 mb-4">
              Por favor, explica o motivo pelo qual estás a reportar este comentário:
            </p>
            <form onSubmit={handleSubmitCommentReport}>
              <textarea
                value={commentReportReason}
                onChange={(e) => setCommentReportReason(e.target.value)}
                placeholder="Ex: Comentário ofensivo, spam, conteúdo inadequado..."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all resize-none"
                rows={4}
                maxLength={500}
                required
              />
              <div className="flex justify-between items-center mt-2 mb-4">
                <span className="text-xs text-gray-400">{commentReportReason.length}/500</span>
                <span className="text-xs text-gray-400">Mínimo: 10 caracteres</span>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCommentReportModal(false)
                    setCommentReportReason('')
                    setReportingComment(null)
                  }}
                  className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={reportingCommentLoading || commentReportReason.trim().length < 10}
                  className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {reportingCommentLoading ? 'A reportar...' : 'Reportar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Editar */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Editar Material</h3>
            <form onSubmit={handleSubmitEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Título *</label>
                <input
                  type="text"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
                <textarea
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                  rows={4}
                  maxLength={2000}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Disciplina *</label>
                  <input
                    type="text"
                    value={editFormData.discipline}
                    onChange={(e) => setEditFormData({ ...editFormData, discipline: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ano *</label>
                  <select
                    value={editFormData.year}
                    onChange={(e) => setEditFormData({ ...editFormData, year: parseInt(e.target.value) })}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  >
                    <option value={1}>1º Ano</option>
                    <option value={2}>2º Ano</option>
                    <option value={3}>3º Ano</option>
                    <option value={4}>4º Ano</option>
                    <option value={5}>5º Ano</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Material *</label>
                <select
                  value={editFormData.materialType}
                  onChange={(e) => setEditFormData({ ...editFormData, materialType: e.target.value })}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                >
                  <option value="Apontamento">Apontamento</option>
                  <option value="Resumo">Resumo</option>
                  <option value="Exercícios">Exercícios</option>
                  <option value="Exame">Exame</option>
                  <option value="Slides">Slides</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Curso</label>
                <input
                  type="text"
                  value={editFormData.course || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, course: e.target.value })}
                  placeholder="Ex: Eng. Informática"
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editing}
                  className="flex-1 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {editing ? 'A guardar...' : 'Guardar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default MaterialDetailsPage
