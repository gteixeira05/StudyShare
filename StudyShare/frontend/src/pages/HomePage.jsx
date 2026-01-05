import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import api from '../services/api'
import Sidebar from '../components/Sidebar'
import MaterialCard from '../components/MaterialCard'
import NotificationBell from '../components/NotificationBell'
import Avatar from '../components/Avatar'
import { 
  FiSearch, 
  FiUser, 
  FiLogIn, 
  FiUserPlus,
  FiArrowUp,
  FiArrowDown,
  FiLoader,
  FiLogOut
} from 'react-icons/fi'

const HomePage = () => {
  const { user, logout } = useAuth()
  const { success, error: showError } = useToast()
  const navigate = useNavigate()
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)
  const isAdmin = user?.role === 'Administrador'
  const [filters, setFilters] = useState({
    search: '',
    year: '',
    course: '',
    discipline: '',
    materialType: '',
    sort: 'recent'
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  })

  const fetchMaterials = async () => {
    try {
      setLoading(true)
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        sort: filters.sort
      }

      if (filters.search) params.search = filters.search
      if (filters.year) params.year = filters.year
      if (filters.course) params.course = filters.course
      if (filters.discipline) params.discipline = filters.discipline
      if (filters.materialType) params.materialType = filters.materialType

      const response = await api.get('/materials', { params })
      setMaterials(response.data.materials)
      setPagination(response.data.pagination)
    } catch (error) {
      console.error('Erro ao buscar materiais:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMaterials()
  }, [filters, pagination.page])

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handleSearch = (e) => {
    e.preventDefault()
    fetchMaterials()
  }

  const handleDelete = async (materialId) => {
    if (!window.confirm('Tens a certeza que queres eliminar este material? Esta ação não pode ser desfeita.')) {
      return
    }

    setDeletingId(materialId)
    try {
      await api.delete(`/materials/${materialId}`)
      // Remover material da lista
      setMaterials(prev => prev.filter(m => m._id !== materialId))
      // Atualizar paginação se necessário
      setPagination(prev => ({ ...prev, total: prev.total - 1 }))
      success('Material eliminado com sucesso')
    } catch (error) {
      showError(error.response?.data?.message || 'Erro ao eliminar material')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar filters={filters} onFilterChange={handleFilterChange} />

      <main className="flex-1 p-6 lg:p-8 bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20">
        {/* Topbar */}
        <div className="mb-8">
          <form onSubmit={handleSearch} className="flex gap-4 items-center mb-6">
            <div className="flex-1 max-w-2xl relative">
              <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Pesquisar materiais, disciplinas, cursos..."
                className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent shadow-sm hover:shadow-md transition-all"
              />
            </div>
            <button
              type="submit"
              className="btn-primary flex items-center gap-2 px-6 py-3.5"
            >
              <FiSearch className="w-5 h-5" />
              <span>Pesquisar</span>
            </button>

            <div className="flex items-center gap-3 ml-auto">
              {user && (
                <>
                  <NotificationBell />
                  <Link
                    to="/profile"
                    className="flex items-center gap-3 hover:bg-white px-4 py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md group"
                  >
                    <Avatar user={user} size="md" className="shadow-md group-hover:shadow-lg transition-all" />
                    <div className="hidden md:block">
                      <div className="font-semibold text-gray-900">{user.name}</div>
                      <div className="text-xs text-gray-500">{user.role}</div>
                    </div>
                  </Link>
                  <button
                    onClick={() => {
                      logout()
                      navigate('/')
                    }}
                    className="flex items-center gap-2 hover:bg-white px-4 py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md text-gray-700 hover:text-red-600 font-medium"
                    title="Sair"
                  >
                    <FiLogOut className="w-5 h-5" />
                    <span className="hidden md:inline">Sair</span>
                  </button>
                </>
              )}
              {!user && (
                <div className="flex gap-2">
                  <Link
                    to="/login"
                    className="flex items-center gap-2 px-4 py-2.5 text-gray-700 hover:text-primary-600 font-medium hover:bg-white rounded-xl transition-all"
                  >
                    <FiLogIn className="w-4 h-4" />
                    <span>Login</span>
                  </Link>
                  <Link
                    to="/register"
                    className="btn-primary flex items-center gap-2"
                  >
                    <FiUserPlus className="w-4 h-4" />
                    <span>Registo</span>
                  </Link>
                </div>
              )}
            </div>
          </form>

          <div className="flex items-center justify-between bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <span>Ordenar por:</span>
              </label>
              <select
                value={filters.sort}
                onChange={(e) => handleFilterChange('sort', e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-sm font-medium"
              >
              <option value="recent">Mais Recentes</option>
              <option value="rating">Melhor Avaliados</option>
              <option value="downloads">Mais Descarregados</option>
              <option value="views">Mais Visualizados</option>
              </select>
            </div>
            {pagination.total > 0 && (
              <div className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{pagination.total}</span> materiais encontrados
              </div>
            )}
          </div>
        </div>

        {/* Materials Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <FiLoader className="w-12 h-12 text-primary-600 animate-spin" />
              <p className="text-gray-600 font-medium">A carregar materiais...</p>
            </div>
          </div>
        ) : materials.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiSearch className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhum material encontrado</h3>
              <p className="text-gray-600 mb-6">Tenta ajustar os filtros ou pesquisar por outros termos.</p>
              {user && (
                <Link
                  to="/upload"
                  className="btn-success inline-flex items-center gap-2"
                >
                  <FiArrowUp className="w-5 h-5" />
                  <span>Partilhar Primeiro Material</span>
                </Link>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {materials.map((material) => (
                <MaterialCard 
                  key={material._id} 
                  material={material}
                  showDelete={isAdmin || (user && material.author?._id === user._id)}
                  onDelete={handleDelete}
                  isDeleting={deletingId === material._id}
                />
              ))}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="mt-8 flex justify-center items-center gap-3">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white hover:shadow-md transition-all font-medium"
                >
                  <FiArrowUp className="w-4 h-4 rotate-[-90deg]" />
                  <span>Anterior</span>
                </button>
                <div className="px-6 py-2 bg-white rounded-lg border border-gray-200 shadow-sm font-medium">
                  Página <span className="text-primary-600 font-semibold">{pagination.page}</span> de <span className="text-primary-600 font-semibold">{pagination.pages}</span>
                </div>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page === pagination.pages}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white hover:shadow-md transition-all font-medium"
                >
                  <span>Seguinte</span>
                  <FiArrowDown className="w-4 h-4 rotate-[-90deg]" />
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default HomePage
