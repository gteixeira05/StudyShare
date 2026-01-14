import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import api from '../services/api'
import Sidebar from '../components/Sidebar'
import MaterialCard from '../components/MaterialCard'
import { FiHeart, FiLoader, FiArrowLeft } from 'react-icons/fi'

const FavoritesPage = () => {
  const { user } = useAuth()
  const { error: showError } = useToast()
  const navigate = useNavigate()
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchFavorites = async () => {
    try {
      setLoading(true)
      const response = await api.get('/favorites')
      setFavorites(response.data.favorites || [])
    } catch (error) {
      console.error('Erro ao buscar favoritos:', error)
      showError(error.response?.data?.message || 'Erro ao carregar favoritos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFavorites()
    
    // Recarregar favoritos quando a página ganha foco (ex: quando volta de outra página)
    const handleFocus = () => {
      fetchFavorites()
    }
    window.addEventListener('focus', handleFocus)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  return (
    <div className="flex min-h-screen">
      <Sidebar filters={{}} onFilterChange={() => {}} />

      <main className="flex-1 p-6 lg:p-8 bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => navigate(-1)}
              className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors duration-200 group"
            >
              <FiArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-200" />
              <span className="font-medium">Voltar</span>
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                <FiHeart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Os Meus Favoritos</h1>
                <p className="text-gray-600 mt-1">Materiais que guardaste para mais tarde</p>
              </div>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4">
                <FiLoader className="w-12 h-12 text-primary-600 animate-spin" />
                <p className="text-gray-600 font-medium">A carregar favoritos...</p>
              </div>
            </div>
          ) : favorites.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="max-w-md mx-auto">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiHeart className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhum favorito ainda</h3>
                <p className="text-gray-600 mb-6">Guarda materiais que te interessam para os encontrares facilmente mais tarde.</p>
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl hover:shadow-green-500/50 transform hover:-translate-y-0.5"
                >
                  Explorar Materiais
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6 flex items-center justify-between">
                <p className="text-gray-600">
                  <span className="font-semibold text-gray-900">{favorites.length}</span>{' '}
                  {favorites.length === 1 ? 'material favorito' : 'materiais favoritos'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {favorites.map((material) => (
                  <MaterialCard 
                    key={material._id} 
                    material={material}
                    showDelete={false}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default FavoritesPage

