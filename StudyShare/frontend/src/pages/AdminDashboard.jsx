import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import api from '../services/api'
import Sidebar from '../components/Sidebar'
import Avatar from '../components/Avatar'
import {
  FiUsers,
  FiFileText,
  FiFlag,
  FiShield,
  FiCheck,
  FiX,
  FiTrash2,
  FiLoader,
  FiAlertCircle,
  FiTrendingUp,
  FiSearch,
  FiArrowLeft
} from 'react-icons/fi'

const AdminDashboard = () => {
  const { user } = useAuth()
  const { success, error: showError } = useToast()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('stats')
  const [stats, setStats] = useState(null)
  const [reports, setReports] = useState([])
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [userSearch, setUserSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [reportsLoading, setReportsLoading] = useState(false)
  const [usersLoading, setUsersLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)

  useEffect(() => {
    if (!user || user.role !== 'Administrador') {
      navigate('/')
      return
    }
    fetchStats()
  }, [user, navigate])

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchReports()
    } else if (activeTab === 'users') {
      fetchUsers()
    }
  }, [activeTab])

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/stats')
      setStats(response.data.stats)
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchReports = async () => {
    setReportsLoading(true)
    try {
      const response = await api.get('/admin/reports', {
        params: { status: 'pending', page: 1, limit: 50 }
      })
      setReports(response.data.reports)
    } catch (error) {
      console.error('Erro ao buscar reports:', error)
      showError('Erro ao carregar reports')
    } finally {
      setReportsLoading(false)
    }
  }

  const fetchUsers = async () => {
    setUsersLoading(true)
    try {
      const response = await api.get('/admin/users', {
        params: { page: 1, limit: 50 }
      })
      setUsers(response.data.users)
      setFilteredUsers(response.data.users)
    } catch (error) {
      console.error('Erro ao buscar utilizadores:', error)
      showError('Erro ao carregar utilizadores')
    } finally {
      setUsersLoading(false)
    }
  }

  // Filtrar utilizadores baseado na pesquisa
  useEffect(() => {
    if (userSearch.trim() === '') {
      setFilteredUsers(users)
    } else {
      const searchLower = userSearch.toLowerCase()
      const filtered = users.filter(u => 
        u.name.toLowerCase().includes(searchLower) ||
        u.email.toLowerCase().includes(searchLower) ||
        u.role.toLowerCase().includes(searchLower)
      )
      setFilteredUsers(filtered)
    }
  }, [userSearch, users])

  const handleResolveReport = async (reportId, action) => {
    setActionLoading(reportId)
    try {
      await api.post(`/admin/reports/${reportId}/resolve`, { action })
      success(action === 'delete' ? 'Material eliminado com sucesso' : 'Report ignorado com sucesso')
      fetchReports()
      fetchStats()
    } catch (error) {
      showError(error.response?.data?.message || 'Erro ao resolver report')
    } finally {
      setActionLoading(null)
    }
  }

  const handleToggleUserRole = async (userId, currentRole) => {
    if (!window.confirm(`Tens a certeza que queres ${currentRole === 'Administrador' ? 'remover' : 'promover'} este utilizador?`)) {
      return
    }

    setActionLoading(userId)
    try {
      const newRole = currentRole === 'Administrador' ? 'Estudante' : 'Administrador'
      await api.put(`/admin/users/${userId}/role`, { role: newRole })
      success(`Utilizador ${newRole === 'Administrador' ? 'promovido a' : 'removido de'} administrador com sucesso`)
      fetchUsers()
      fetchStats()
    } catch (error) {
      showError(error.response?.data?.message || 'Erro ao atualizar role')
    } finally {
      setActionLoading(null)
    }
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20">
        <Sidebar filters={{}} onFilterChange={() => {}} />
        <main className="flex-1 p-8 flex items-center justify-center">
          <FiLoader className="w-12 h-12 text-primary-600 animate-spin" />
        </main>
      </div>
    )
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

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Painel de Administração</h1>
          <p className="text-gray-600">Gerir utilizadores, materiais e reports</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-6 py-3 font-semibold transition-all border-b-2 ${
              activeTab === 'stats'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Estatísticas
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-6 py-3 font-semibold transition-all border-b-2 relative ${
              activeTab === 'reports'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Reports
            {stats?.pendingReports > 0 && (
              <span className="absolute top-1 right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {stats.pendingReports}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 font-semibold transition-all border-b-2 ${
              activeTab === 'users'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Utilizadores
          </button>
        </div>

        {/* Conteúdo das Tabs */}
        {activeTab === 'stats' && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <FiUsers className="w-6 h-6 text-blue-600" />
                </div>
                <FiTrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.totalUsers}</h3>
              <p className="text-gray-600 text-sm">Total de Utilizadores</p>
              <p className="text-xs text-gray-500 mt-2">{stats.totalAdmins} administradores, {stats.totalStudents} estudantes</p>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <FiFileText className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.totalMaterials}</h3>
              <p className="text-gray-600 text-sm">Total de Materiais</p>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-red-100 rounded-xl">
                  <FiFlag className="w-6 h-6 text-red-600" />
                </div>
                {stats.pendingReports > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {stats.pendingReports} pendentes
                  </span>
                )}
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.totalReports}</h3>
              <p className="text-gray-600 text-sm">Total de Reports</p>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-4">
            {reportsLoading ? (
              <div className="flex justify-center py-12">
                <FiLoader className="w-8 h-8 text-primary-600 animate-spin" />
              </div>
            ) : reports.length === 0 ? (
              <div className="card p-12 text-center">
                <FiAlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Não há reports pendentes</p>
              </div>
            ) : (
              reports.map((report) => (
                <div key={report._id} className="card p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-red-100 rounded-lg">
                          <FiFlag className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {report.material.title}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Por: {report.reportedBy?.name || 'Anónimo'}
                          </p>
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 mb-3">
                        <p className="text-sm text-gray-700">{report.reason}</p>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Material de: {report.material.author?.name || 'Anónimo'}</span>
                        <span>•</span>
                        <span>{formatDate(report.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => navigate(`/material/${report.material._id}`)}
                        className="px-4 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                      >
                        Ver Material
                      </button>
                      <button
                        onClick={() => handleResolveReport(report._id, 'delete')}
                        disabled={actionLoading === report._id}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {actionLoading === report._id ? (
                          <FiLoader className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <FiTrash2 className="w-4 h-4" />
                            Eliminar
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleResolveReport(report._id, 'ignore')}
                        disabled={actionLoading === report._id}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {actionLoading === report._id ? (
                          <FiLoader className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <FiX className="w-4 h-4" />
                            Ignorar
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Barra de Pesquisa */}
            <div className="card p-4">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Pesquisar por nome, email ou role..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {usersLoading ? (
              <div className="flex justify-center py-12">
                <FiLoader className="w-8 h-8 text-primary-600 animate-spin" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="card p-12 text-center">
                <FiUsers className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  {userSearch ? 'Nenhum utilizador encontrado com essa pesquisa' : 'Não há utilizadores'}
                </p>
              </div>
            ) : (
              <div className="card overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Nome</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Materiais</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredUsers.map((u) => (
                      <tr key={u._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar user={u} size="md" />
                            <span className="font-medium text-gray-900">{u.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{u.email}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                            u.role === 'Administrador'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {u.role === 'Administrador' && <FiShield className="w-3 h-3" />}
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{u.materialsUploaded || 0}</td>
                        <td className="px-6 py-4">
                          {u._id !== user._id && (
                            <button
                              onClick={() => handleToggleUserRole(u._id, u.role)}
                              disabled={actionLoading === u._id}
                              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all disabled:opacity-50 flex items-center gap-2 ${
                                u.role === 'Administrador'
                                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                  : 'bg-green-100 text-green-700 hover:bg-green-200'
                              }`}
                            >
                              {actionLoading === u._id ? (
                                <FiLoader className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  {u.role === 'Administrador' ? (
                                    <>
                                      <FiX className="w-4 h-4" />
                                      Remover Admin
                                    </>
                                  ) : (
                                    <>
                                      <FiCheck className="w-4 h-4" />
                                      Promover Admin
                                    </>
                                  )}
                                </>
                              )}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default AdminDashboard

