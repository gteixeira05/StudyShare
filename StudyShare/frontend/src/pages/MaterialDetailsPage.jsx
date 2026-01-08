import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import mammoth from 'mammoth'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useSocket } from '../contexts/SocketContext'
import Sidebar from '../components/Sidebar'
import Avatar from '../components/Avatar'
import ConfirmModal from '../components/ConfirmModal'
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
  FiArrowUp,
  FiArrowDown,
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
  const [commentPage, setCommentPage] = useState(1)
  const [commentsPerPage] = useState(5) // Mostrar 5 comentários por página
  const [showCommentReportModal, setShowCommentReportModal] = useState(false)
  const [availableYears, setAvailableYears] = useState([])
  const [materialTypes, setMaterialTypes] = useState([])
  const [commentReportReason, setCommentReportReason] = useState('')
  const [reportingComment, setReportingComment] = useState(null)
  const [reportingCommentLoading, setReportingCommentLoading] = useState(false)
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    type: 'danger'
  })
  const [imagePreviewError, setImagePreviewError] = useState(false)
  const [wordPreviewHtml, setWordPreviewHtml] = useState(null)
  const [loadingWordPreview, setLoadingWordPreview] = useState(false)
  const [showWordPreview, setShowWordPreview] = useState(false)
  const [showPdfPreview, setShowPdfPreview] = useState(false)
  const [showImagePreview, setShowImagePreview] = useState(false)
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
    setImagePreviewError(false) // Reset erro de preview quando material muda
    setWordPreviewHtml(null) // Reset preview Word quando material muda
    setShowWordPreview(false) // Reset estado de mostrar preview
    setShowPdfPreview(false) // Reset estado de mostrar preview PDF
    setShowImagePreview(false) // Reset estado de mostrar preview imagem
  }, [id])

  // Função para carregar preview de Word quando o utilizador clicar
  const loadWordPreview = async () => {
    if (!material || wordPreviewHtml || loadingWordPreview) return
    
    const fileExt = (material.fileName || '').split('.').pop()?.toLowerCase() || ''
    const isWord = fileExt === 'docx' || fileExt === 'doc'
    
    if (!isWord || !material.fileUrl) return
    
    setLoadingWordPreview(true)
    setShowWordPreview(true)
    
    try {
      // Obter URL do ficheiro
      const previewUrl = material.fileUrl?.startsWith('http') 
        ? material.fileUrl 
        : `/api/materials/${material._id}/preview`
      
      // Carregar ficheiro como array buffer
      const response = await fetch(previewUrl)
      if (!response.ok) {
        throw new Error('Erro ao carregar ficheiro')
      }
      
      const arrayBuffer = await response.arrayBuffer()
      
      // Converter DOCX para HTML usando mammoth
      const result = await mammoth.convertToHtml({ arrayBuffer }, {
        styleMap: [
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
          "p[style-name='Heading 4'] => h4:fresh",
        ]
      })
      
      setWordPreviewHtml(result.value)
      
      // Mostrar avisos se houver
      if (result.messages.length > 0) {
        console.warn('Avisos do mammoth:', result.messages)
      }
    } catch (error) {
      console.error('Erro ao carregar preview Word:', error)
      showError('Erro ao carregar preview do documento')
      setShowWordPreview(false)
      setWordPreviewHtml(null)
    } finally {
      setLoadingWordPreview(false)
    }
  }

  // Buscar configurações de anos e tipos de material
  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const [yearsRes, typesRes] = await Promise.all([
          api.get('/config/availableYears'),
          api.get('/config/materialTypes')
        ])
        setAvailableYears(yearsRes.data.values || [])
        setMaterialTypes(typesRes.data.values || [])
      } catch (error) {
        console.error('Erro ao buscar configurações:', error)
        // Fallback para valores padrão
        setAvailableYears([
          { value: 1, label: '1º Ano' },
          { value: 2, label: '2º Ano' },
          { value: 3, label: '3º Ano' },
          { value: 4, label: '4º Ano' },
          { value: 5, label: '5º Ano' }
        ])
        setMaterialTypes([
          { value: 'Apontamento', label: 'Apontamento' },
          { value: 'Resumo', label: 'Resumo' },
          { value: 'Exercícios', label: 'Exercícios' },
          { value: 'Exame', label: 'Exame' },
          { value: 'Slides', label: 'Slides' }
        ])
      }
    }
    fetchConfigs()
  }, [])

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

    // Escutar atualizações de avaliação
    const handleRatingUpdate = (ratingData) => {
      setMaterial(prevMaterial => {
        if (!prevMaterial) return prevMaterial
        
        return {
          ...prevMaterial,
          rating: {
            ...prevMaterial.rating,
            average: ratingData.average,
            count: ratingData.count,
            breakdown: ratingData.breakdown
          }
        }
      })
    }

    socket.on('new_comment', handleNewComment)
    socket.on('rating_updated', handleRatingUpdate)

    // Limpar quando sair da página
    return () => {
      socket.emit('leave_material_room', id)
      socket.off('new_comment', handleNewComment)
      socket.off('rating_updated', handleRatingUpdate)
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
          const backendUrl = 'http://localhost:5000'
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
    
    let sorted;
    switch (commentSortBy) {
      case 'likes':
        sorted = comments.sort((a, b) => {
          const aLikes = a.likes?.length || 0
          const bLikes = b.likes?.length || 0
          return bLikes - aLikes
        })
        break
      case 'dislikes':
        sorted = comments.sort((a, b) => {
          const aDislikes = a.dislikes?.length || 0
          const bDislikes = b.dislikes?.length || 0
          return bDislikes - aDislikes
        })
        break
      case 'popularity':
        sorted = comments.sort((a, b) => {
          const aScore = (a.likes?.length || 0) - (a.dislikes?.length || 0)
          const bScore = (b.likes?.length || 0) - (b.dislikes?.length || 0)
          return bScore - aScore
        })
        break
      case 'date':
      default:
        sorted = comments.sort((a, b) => {
          return new Date(b.createdAt) - new Date(a.createdAt)
        })
    }
    
    return sorted
  }

  const getPaginatedComments = () => {
    const sorted = getSortedComments()
    const startIndex = (commentPage - 1) * commentsPerPage
    const endIndex = startIndex + commentsPerPage
    return sorted.slice(startIndex, endIndex)
  }

  const totalCommentPages = Math.ceil((material?.comments?.length || 0) / commentsPerPage)

  // Reset para página 1 quando mudar ordenação
  useEffect(() => {
    setCommentPage(1)
  }, [commentSortBy])

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

  const handleDelete = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Material',
      message: 'Tens a certeza que queres eliminar este material? Esta ação não pode ser desfeita.',
      type: 'danger',
      onConfirm: async () => {
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
    })
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
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

              {/* Preview do Documento */}
              {(() => {
                const fileType = material.fileType?.toLowerCase() || ''
                const fileName = material.fileName || ''
                const fileExt = fileName.split('.').pop()?.toLowerCase() || ''
                const isPDF = fileType.includes('pdf') || fileExt === 'pdf'
                const isImage = fileType.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fileExt)
                const isOffice = ['docx', 'doc', 'pptx', 'ppt', 'xlsx', 'xls'].includes(fileExt) || 
                                fileType.includes('office') || 
                                fileType.includes('presentation') || 
                                fileType.includes('word') || 
                                fileType.includes('excel')
                const previewUrl = material.fileUrl?.startsWith('http') 
                  ? material.fileUrl 
                  : `/api/materials/${material._id}/preview`

                // Para PDFs
                if (isPDF) {
                  // Se preview estiver ativado, mostrar iframe
                  if (showPdfPreview) {
                    return (
                      <div className="rounded-xl border-2 border-gray-200 bg-gray-50 overflow-hidden mb-6">
                        <div className="bg-gradient-to-r from-red-500 to-red-600 px-4 py-2 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-white">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                            </svg>
                            <span className="font-semibold text-sm">PDF Preview</span>
                          </div>
                          <a
                            href={previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white hover:bg-red-700 px-3 py-1 rounded text-sm font-medium transition-colors"
                          >
                            Abrir em Nova Janela
                          </a>
                        </div>
                        <div className="bg-gray-100" style={{ minHeight: '600px' }}>
                          <iframe
                            src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                            className="w-full"
                            style={{ height: '600px', border: 'none' }}
                            title="PDF Preview"
                          />
                        </div>
                      </div>
                    )
                  }
                  
                  // Se preview não estiver ativado, mostrar botão
                  return (
                    <div className="rounded-xl border-2 border-gray-200 bg-gray-50 overflow-hidden mb-6">
                      <div className="bg-gradient-to-r from-red-500 to-red-600 px-4 py-3 flex items-center">
                        <div className="flex items-center gap-3 text-white flex-1">
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                          </svg>
                          <div>
                            <span className="font-semibold text-sm block">PDF Document</span>
                            <span className="text-xs opacity-90 truncate max-w-md">{material.fileName}</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white p-8">
                        <div className="flex flex-col items-center justify-center py-12">
                          <div className="p-6 bg-red-100 rounded-2xl mb-6">
                            <svg className="w-20 h-20 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 mb-2">PDF Document</h3>
                          <p className="text-gray-600 text-sm mb-4">
                            {material.fileType} • {formatFileSize(material.fileSize)}
                          </p>
                          <p className="text-gray-500 text-sm text-center max-w-md mb-6">
                            Podes ver uma pré-visualização do documento ou descarregá-lo para abrir com o teu leitor de PDF preferido.
                          </p>
                          <div className="flex gap-3">
                            <button
                              onClick={() => setShowPdfPreview(true)}
                              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
                            >
                              <FiEye className="w-5 h-5" />
                              <span>Ver Preview</span>
                            </button>
                            <button
                              onClick={handleDownload}
                              disabled={downloading || !user}
                              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                              {downloading ? (
                                <>
                                  <FiLoader className="w-5 h-5 animate-spin" />
                                  <span>A descarregar...</span>
                                </>
                              ) : (
                                <>
                                  <FiDownload className="w-5 h-5" />
                                  <span>Descarregar</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                }

                // Para Imagens
                if (isImage) {
                  // Se preview estiver ativado, mostrar imagem
                  if (showImagePreview) {
                    return (
                      <div className="rounded-xl border-2 border-gray-200 bg-gray-50 overflow-hidden mb-6">
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 flex items-center">
                          <div className="flex items-center gap-2 text-white">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                            </svg>
                            <span className="font-semibold text-sm">Image Preview</span>
                          </div>
                        </div>
                        <div className="bg-gray-900 p-4 flex items-center justify-center" style={{ minHeight: '400px' }}>
                          {!imagePreviewError ? (
                            <img
                              src={previewUrl}
                              alt={material.title}
                              className="max-w-full max-h-[600px] object-contain rounded-lg shadow-lg"
                              onError={() => setImagePreviewError(true)}
                              onLoad={() => setImagePreviewError(false)}
                            />
                          ) : (
                            <div className="flex items-center justify-center h-[400px] text-gray-400 flex-col gap-2">
                              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <p className="text-sm">Erro ao carregar imagem</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  }
                  
                  // Se preview não estiver ativado, mostrar botão
                  return (
                    <div className="rounded-xl border-2 border-gray-200 bg-gray-50 overflow-hidden mb-6">
                      <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3 flex items-center">
                        <div className="flex items-center gap-3 text-white flex-1">
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                          </svg>
                          <div>
                            <span className="font-semibold text-sm block">Image</span>
                            <span className="text-xs opacity-90 truncate max-w-md">{material.fileName}</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white p-8">
                        <div className="flex flex-col items-center justify-center py-12">
                          <div className="p-6 bg-blue-100 rounded-2xl mb-6">
                            <svg className="w-20 h-20 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 mb-2">Image</h3>
                          <p className="text-gray-600 text-sm mb-4">
                            {material.fileType} • {formatFileSize(material.fileSize)}
                          </p>
                          <p className="text-gray-500 text-sm text-center max-w-md mb-6">
                            Podes ver uma pré-visualização da imagem ou descarregá-la.
                          </p>
                          <div className="flex gap-3">
                            <button
                              onClick={() => setShowImagePreview(true)}
                              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
                            >
                              <FiEye className="w-5 h-5" />
                              <span>Ver Preview</span>
                            </button>
                            <button
                              onClick={handleDownload}
                              disabled={downloading || !user}
                              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                              {downloading ? (
                                <>
                                  <FiLoader className="w-5 h-5 animate-spin" />
                                  <span>A descarregar...</span>
                                </>
                              ) : (
                                <>
                                  <FiDownload className="w-5 h-5" />
                                  <span>Descarregar</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                }

                // Para ficheiros Office (Word, PowerPoint, Excel)
                // Nota: PowerPoint não pode ser visualizado diretamente no navegador sem software adicional
                if (isOffice) {
                  const isPowerPoint = fileExt === 'pptx' || fileExt === 'ppt'
                  const isWord = fileExt === 'docx' || fileExt === 'doc'
                  const isExcel = fileExt === 'xlsx' || fileExt === 'xls'
                  const officeTypeName = isPowerPoint ? 'PowerPoint' : isWord ? 'Word' : isExcel ? 'Excel' : 'Documento'
                  
                  // Determinar classes de cor baseado no tipo
                  let headerGradient = 'bg-gradient-to-r from-gray-500 to-gray-600'
                  let iconBg = 'bg-gray-100'
                  let iconColor = 'text-gray-600'
                  
                  if (isPowerPoint) {
                    headerGradient = 'bg-gradient-to-r from-orange-500 to-orange-600'
                    iconBg = 'bg-orange-100'
                    iconColor = 'text-orange-600'
                  } else if (isWord) {
                    headerGradient = 'bg-gradient-to-r from-blue-500 to-blue-600'
                    iconBg = 'bg-blue-100'
                    iconColor = 'text-blue-600'
                  } else if (isExcel) {
                    headerGradient = 'bg-gradient-to-r from-green-500 to-green-600'
                    iconBg = 'bg-green-100'
                    iconColor = 'text-green-600'
                  }
                  
                  // Para Word, mostrar preview se foi carregado
                  if (isWord && showWordPreview && wordPreviewHtml) {
                    return (
                      <div className="rounded-xl border-2 border-gray-200 bg-gray-50 overflow-hidden mb-6">
                        <div className={`${headerGradient} px-4 py-3 flex items-center`}>
                          <div className="flex items-center gap-3 text-white flex-1">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                            </svg>
                            <div>
                              <span className="font-semibold text-sm block">Word Document Preview</span>
                              <span className="text-xs opacity-90 truncate max-w-md">{material.fileName}</span>
                            </div>
                          </div>
                        </div>
                        <div className="bg-white p-6 lg:p-8">
                          <div 
                            className="word-preview"
                            dangerouslySetInnerHTML={{ __html: wordPreviewHtml }}
                            style={{
                              maxHeight: '600px',
                              overflowY: 'auto',
                              padding: '1.5rem',
                              backgroundColor: '#fff',
                              border: '1px solid #e5e7eb',
                              borderRadius: '0.5rem',
                              lineHeight: '1.6'
                            }}
                          />
                        </div>
                      </div>
                    )
                  }
                  
                  // Para Word, mostrar botão para carregar preview
                  if (isWord && !showWordPreview) {
                    return (
                      <div className="rounded-xl border-2 border-gray-200 bg-gray-50 overflow-hidden mb-6">
                        <div className={`${headerGradient} px-4 py-3 flex items-center`}>
                          <div className="flex items-center gap-3 text-white flex-1">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                            </svg>
                            <div>
                              <span className="font-semibold text-sm block">Word Document</span>
                              <span className="text-xs opacity-90 truncate max-w-md">{material.fileName}</span>
                            </div>
                          </div>
                        </div>
                        <div className="bg-white p-8">
                          <div className="flex flex-col items-center justify-center py-12">
                            <div className={`p-6 ${iconBg} rounded-2xl mb-6`}>
                              <svg className={`w-20 h-20 ${iconColor}`} fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Word Document</h3>
                            <p className="text-gray-600 text-sm mb-4">
                              {material.fileType} • {formatFileSize(material.fileSize)}
                            </p>
                            <p className="text-gray-500 text-sm text-center max-w-md mb-6">
                              Podes ver uma pré-visualização do documento ou descarregá-lo para abrir com o Microsoft Word.
                            </p>
                            <div className="flex gap-3">
                              <button
                                onClick={loadWordPreview}
                                disabled={loadingWordPreview}
                                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                              >
                                {loadingWordPreview ? (
                                  <>
                                    <FiLoader className="w-5 h-5 animate-spin" />
                                    <span>A carregar preview...</span>
                                  </>
                                ) : (
                                  <>
                                    <FiEye className="w-5 h-5" />
                                    <span>Ver Preview</span>
                                  </>
                                )}
                              </button>
                              <button
                                onClick={handleDownload}
                                disabled={downloading || !user}
                                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                              >
                                {downloading ? (
                                  <>
                                    <FiLoader className="w-5 h-5 animate-spin" />
                                    <span>A descarregar...</span>
                                  </>
                                ) : (
                                  <>
                                    <FiDownload className="w-5 h-5" />
                                    <span>Descarregar</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  }
                  
                  // Para Word a carregar (enquanto mostra loading)
                  if (isWord && showWordPreview && loadingWordPreview) {
                    return (
                      <div className="rounded-xl border-2 border-gray-200 bg-gray-50 overflow-hidden mb-6">
                        <div className={`${headerGradient} px-4 py-3 flex items-center`}>
                          <div className="flex items-center gap-3 text-white flex-1">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                            </svg>
                            <div>
                              <span className="font-semibold text-sm block">Word Document</span>
                              <span className="text-xs opacity-90 truncate max-w-md">{material.fileName}</span>
                            </div>
                          </div>
                        </div>
                        <div className="bg-white p-8">
                          <div className="flex flex-col items-center justify-center py-12">
                            <div className="flex flex-col items-center gap-4">
                              <FiLoader className="w-12 h-12 text-blue-600 animate-spin" />
                              <p className="text-gray-600">A carregar preview...</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  }
                  
                  // Para outros tipos Office (PowerPoint, Excel)
                  return (
                    <div className="rounded-xl border-2 border-gray-200 bg-gray-50 overflow-hidden mb-6">
                      <div className={`${headerGradient} px-4 py-3 flex items-center`}>
                        <div className="flex items-center gap-3 text-white flex-1">
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                          </svg>
                          <div>
                            <span className="font-semibold text-sm block">{officeTypeName} Document</span>
                            <span className="text-xs opacity-90 truncate max-w-md">{material.fileName}</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white p-8">
                        <div className="flex flex-col items-center justify-center py-12">
                          <div className={`p-6 ${iconBg} rounded-2xl mb-6`}>
                            <svg className={`w-20 h-20 ${iconColor}`} fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 mb-2">{officeTypeName} {isPowerPoint ? 'Presentation' : isExcel ? 'Spreadsheet' : 'File'}</h3>
                          <p className="text-gray-600 text-sm mb-4">
                            {material.fileType} • {formatFileSize(material.fileSize)}
                          </p>
                          <p className="text-gray-500 text-sm text-center max-w-md mb-6">
                            Para visualizar este ficheiro, descarrega-o e abre-o com o Microsoft {officeTypeName} 
                            ou outro software compatível instalado no teu computador.
                          </p>
                          <button
                            onClick={handleDownload}
                            disabled={downloading || !user}
                            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {downloading ? (
                              <>
                                <FiLoader className="w-5 h-5 animate-spin" />
                                <span>A descarregar...</span>
                              </>
                            ) : (
                              <>
                                <FiDownload className="w-5 h-5" />
                                <span>Descarregar Ficheiro</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                }

                // Para outros tipos - mostrar informações detalhadas
                const getFileIcon = () => {
                  if (fileExt === 'zip' || fileExt === 'rar') {
                    return (
                      <svg className="w-16 h-16 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                      </svg>
                    )
                  }
                  return (
                    <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  )
                }

                return (
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-12 text-center mb-6 border-2 border-gray-200">
                    {getFileIcon()}
                    <p className="mt-4 text-gray-700 font-semibold text-lg">{material.fileName}</p>
                    <p className="mt-2 text-gray-500 text-sm">
                      {material.fileType} • {formatFileSize(material.fileSize)}
                    </p>
                    <p className="mt-6 text-gray-600 text-sm max-w-md mx-auto">
                      Pré-visualização não disponível para este tipo de ficheiro. 
                      Descarrega o ficheiro para visualizar o conteúdo completo.
                    </p>
                  </div>
                )
              })()}

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
                <>
                  <div className="space-y-5 mb-6">
                    {getPaginatedComments().map((commentItem, idx) => {
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

                  {/* Paginação de Comentários */}
                  {totalCommentPages > 1 && (
                    <div className="mt-6 pt-6 border-t border-gray-200 flex flex-col items-center gap-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCommentPage(prev => Math.max(1, prev - 1))}
                          disabled={commentPage === 1}
                          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:shadow-sm transition-all font-medium bg-white text-sm"
                        >
                          <FiArrowUp className="w-4 h-4 rotate-[-90deg]" />
                          <span>Anterior</span>
                        </button>
                        
                        {/* Números das páginas */}
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(5, totalCommentPages) }, (_, i) => {
                            let pageNum;
                            if (totalCommentPages <= 5) {
                              pageNum = i + 1;
                            } else if (commentPage <= 3) {
                              pageNum = i + 1;
                            } else if (commentPage >= totalCommentPages - 2) {
                              pageNum = totalCommentPages - 4 + i;
                            } else {
                              pageNum = commentPage - 2 + i;
                            }
                            
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setCommentPage(pageNum)}
                                className={`min-w-[36px] px-3 py-1.5 rounded-lg font-medium text-sm transition-all ${
                                  commentPage === pageNum
                                    ? 'bg-primary-600 text-white shadow-md'
                                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:shadow-sm'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>
                        
                        <button
                          onClick={() => setCommentPage(prev => Math.min(totalCommentPages, prev + 1))}
                          disabled={commentPage === totalCommentPages}
                          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:shadow-sm transition-all font-medium bg-white text-sm"
                        >
                          <span>Seguinte</span>
                          <FiArrowDown className="w-4 h-4 rotate-[-90deg]" />
                        </button>
                      </div>
                      
                      <div className="text-xs text-gray-500">
                        Página <span className="font-semibold text-gray-700">{commentPage}</span> de <span className="font-semibold text-gray-700">{totalCommentPages}</span>
                        {' • '}
                        A mostrar <span className="font-semibold text-gray-700">
                          {((commentPage - 1) * commentsPerPage) + 1}
                        </span> - <span className="font-semibold text-gray-700">
                          {Math.min(commentPage * commentsPerPage, material.comments.length)}
                        </span> de <span className="font-semibold text-gray-700">{material.comments.length}</span> comentários
                      </div>
                    </div>
                  )}
                </>
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
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{material.author?.name || 'Anónimo'}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1">
                      <FiStar className="w-4 h-4 text-yellow-500 fill-current" />
                      <span className="text-sm font-medium text-gray-700">
                        {material.author?.reputation ? material.author.reputation.toFixed(1) : '0.0'}
                      </span>
                    </div>
                    <span className="text-gray-400">•</span>
                    <p className="text-sm text-gray-600">
                      {material.author?.materialsUploaded || 0} materiais
                    </p>
                  </div>
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
                    {availableYears.map((year) => (
                      <option key={year.value} value={year.value}>
                        {year.label}
                      </option>
                    ))}
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
                    {materialTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
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

export default MaterialDetailsPage
