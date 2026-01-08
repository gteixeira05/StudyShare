import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import api from '../services/api'
import Sidebar from '../components/Sidebar'
import Avatar from '../components/Avatar'
import ConfirmModal from '../components/ConfirmModal'
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
  FiArrowLeft,
  FiSettings,
  FiPlus,
  FiEdit2
} from 'react-icons/fi'

const AdminDashboard = () => {
  const { user } = useAuth()
  const { success, error: showError } = useToast()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'stats')
  const [stats, setStats] = useState(null)
  const [reports, setReports] = useState([])
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [userSearch, setUserSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [reportsLoading, setReportsLoading] = useState(false)
  const [usersLoading, setUsersLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)
  
  // Config states
  const [availableYears, setAvailableYears] = useState([])
  const [materialTypes, setMaterialTypes] = useState([])
  const [configLoading, setConfigLoading] = useState(false)
  const [editingConfig, setEditingConfig] = useState(null)
  const [newConfigValue, setNewConfigValue] = useState({ value: '', label: '' })
  const [showAddModal, setShowAddModal] = useState(false)
  const [currentConfigKey, setCurrentConfigKey] = useState(null)
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    type: 'warning'
  })

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
    } else if (activeTab === 'config') {
      fetchConfigs()
    }
  }, [activeTab])

  // Sincronizar activeTab com query params
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab')
    if (tabFromUrl && ['stats', 'reports', 'users', 'config'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl)
    }
  }, [searchParams])

  // Atualizar query params quando activeTab mudar
  const handleTabChange = (tab) => {
    setActiveTab(tab)
    if (tab === 'stats') {
      setSearchParams({})
    } else {
      setSearchParams({ tab })
    }
  }

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

  const handleToggleUserRole = (userId, currentRole) => {
    const isRemoving = currentRole === 'Administrador'
    setConfirmModal({
      isOpen: true,
      title: isRemoving ? 'Remover Administrador' : 'Promover a Administrador',
      message: `Tens a certeza que queres ${isRemoving ? 'remover' : 'promover'} este utilizador?`,
      type: isRemoving ? 'danger' : 'warning',
      onConfirm: async () => {
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
    })
  }

  const fetchConfigs = async () => {
    setConfigLoading(true)
    try {
      const [yearsRes, typesRes] = await Promise.all([
        api.get('/admin/config/availableYears'),
        api.get('/admin/config/materialTypes')
      ])
      setAvailableYears(yearsRes.data.allValues || [])
      setMaterialTypes(typesRes.data.allValues || [])
    } catch (error) {
      console.error('Erro ao buscar configurações:', error)
      showError('Erro ao carregar configurações')
    } finally {
      setConfigLoading(false)
    }
  }

  const handleAddConfig = async (key) => {
    if (!newConfigValue.value || !newConfigValue.label) {
      showError('Por favor, preenche todos os campos')
      return
    }

    setActionLoading('add')
    try {
      await api.post(`/admin/config/${key}/values`, {
        value: key === 'availableYears' ? parseInt(newConfigValue.value) : newConfigValue.value,
        label: newConfigValue.label
      })
      success('Valor adicionado com sucesso')
      setNewConfigValue({ value: '', label: '' })
      setShowAddModal(false)
      setCurrentConfigKey(null)
      fetchConfigs()
    } catch (error) {
      showError(error.response?.data?.message || 'Erro ao adicionar valor')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteConfig = (key, valueId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Desativar Valor',
      message: 'Tens a certeza que queres desativar este valor? Ele não aparecerá mais nas opções, mas materiais existentes não serão afetados.',
      type: 'warning',
      confirmText: 'Desativar',
      onConfirm: async () => {
        setActionLoading(valueId)
        try {
          await api.delete(`/admin/config/${key}/values/${valueId}`)
          success('Valor desativado com sucesso')
          fetchConfigs()
        } catch (error) {
          showError(error.response?.data?.message || 'Erro ao desativar valor')
        } finally {
          setActionLoading(null)
        }
      }
    })
  }

  const handleReactivateConfig = async (key, valueId) => {
    setActionLoading(valueId)
    try {
      await api.put(`/admin/config/${key}/values/${valueId}`, {
        isActive: true
      })
      success('Valor reativado com sucesso')
      fetchConfigs()
    } catch (error) {
      showError(error.response?.data?.message || 'Erro ao reativar valor')
    } finally {
      setActionLoading(null)
    }
  }

  const handlePermanentDeleteConfig = (key, valueId, valueLabel) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Permanentemente',
      message: `Tens a certeza que queres eliminar permanentemente "${valueLabel}"? Esta ação não pode ser desfeita. Nota: Só será possível eliminar se não houver materiais a usar este valor.`,
      type: 'danger',
      confirmText: 'Eliminar Permanentemente',
      onConfirm: async () => {
        setActionLoading(`delete-${valueId}`)
        try {
          await api.delete(`/admin/config/${key}/values/${valueId}/permanent`)
          success('Valor eliminado permanentemente com sucesso')
          fetchConfigs()
        } catch (error) {
          showError(error.response?.data?.message || 'Erro ao eliminar valor. Verifica se existem materiais a usar este valor.')
        } finally {
          setActionLoading(null)
        }
      }
    })
  }

  const handleUpdateConfig = async (key, valueId, updates) => {
    setActionLoading(valueId)
    try {
      await api.put(`/admin/config/${key}/values/${valueId}`, updates)
      success('Valor atualizado com sucesso')
      setEditingConfig(null)
      fetchConfigs()
    } catch (error) {
      showError(error.response?.data?.message || 'Erro ao atualizar valor')
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
            onClick={() => handleTabChange('stats')}
            className={`px-6 py-3 font-semibold transition-all border-b-2 ${
              activeTab === 'stats'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Estatísticas
          </button>
          <button
            onClick={() => handleTabChange('reports')}
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
            onClick={() => handleTabChange('users')}
            className={`px-6 py-3 font-semibold transition-all border-b-2 ${
              activeTab === 'users'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Utilizadores
          </button>
          <button
            onClick={() => handleTabChange('config')}
            className={`px-6 py-3 font-semibold transition-all border-b-2 ${
              activeTab === 'config'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Configurações
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

        {activeTab === 'config' && (
          <div className="space-y-6">
            {configLoading ? (
              <div className="flex justify-center py-12">
                <FiLoader className="w-8 h-8 text-primary-600 animate-spin" />
              </div>
            ) : (
              <>
                {/* Anos Disponíveis */}
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <FiFileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">Anos Disponíveis</h3>
                    </div>
                    <button
                      onClick={() => {
                        setCurrentConfigKey('availableYears')
                        setShowAddModal(true)
                        setNewConfigValue({ value: '', label: '' })
                      }}
                      className="btn-primary flex items-center gap-2"
                    >
                      <FiPlus className="w-4 h-4" />
                      Adicionar Ano
                    </button>
                  </div>
                  <div className="space-y-2">
                    {availableYears.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">Nenhum ano configurado</p>
                    ) : (
                      availableYears.map((year) => (
                        <div
                          key={year._id}
                          className={`flex items-center justify-between p-4 rounded-lg border ${
                            year.isActive ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200 opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {editingConfig === year._id ? (
                              <input
                                id={`year-label-${year._id}`}
                                type="text"
                                defaultValue={year.label}
                                className="px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                              />
                            ) : (
                              <span className="font-medium text-gray-900">{year.label}</span>
                            )}
                            {!year.isActive && (
                              <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded">Desativado</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {year.isActive ? (
                              <>
                                <button
                                  onClick={() => {
                                    if (editingConfig === year._id) {
                                      handleUpdateConfig('availableYears', year._id, {
                                        label: document.getElementById(`year-label-${year._id}`).value
                                      })
                                    } else {
                                      setEditingConfig(year._id)
                                    }
                                  }}
                                  disabled={actionLoading === year._id || actionLoading === `delete-${year._id}`}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                  {actionLoading === year._id ? (
                                    <FiLoader className="w-4 h-4 animate-spin" />
                                  ) : editingConfig === year._id ? (
                                    <FiCheck className="w-4 h-4" />
                                  ) : (
                                    <FiEdit2 className="w-4 h-4" />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleDeleteConfig('availableYears', year._id)}
                                  disabled={actionLoading === year._id || actionLoading === `delete-${year._id}`}
                                  className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                  title="Desativar"
                                >
                                  <FiX className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handlePermanentDeleteConfig('availableYears', year._id, year.label)}
                                  disabled={actionLoading === year._id || actionLoading === `delete-${year._id}`}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Eliminar Permanentemente"
                                >
                                  {actionLoading === `delete-${year._id}` ? (
                                    <FiLoader className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <FiTrash2 className="w-4 h-4" />
                                  )}
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleReactivateConfig('availableYears', year._id)}
                                  disabled={actionLoading === year._id || actionLoading === `delete-${year._id}`}
                                  className="px-3 py-1.5 text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors text-sm font-medium flex items-center gap-1.5"
                                  title="Reativar"
                                >
                                  {actionLoading === year._id ? (
                                    <FiLoader className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <>
                                      <FiCheck className="w-4 h-4" />
                                      Reativar
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => handlePermanentDeleteConfig('availableYears', year._id, year.label)}
                                  disabled={actionLoading === year._id || actionLoading === `delete-${year._id}`}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Eliminar Permanentemente"
                                >
                                  {actionLoading === `delete-${year._id}` ? (
                                    <FiLoader className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <FiTrash2 className="w-4 h-4" />
                                  )}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Tipos de Material */}
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <FiFileText className="w-5 h-5 text-purple-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">Tipos de Material</h3>
                    </div>
                    <button
                      onClick={() => {
                        setCurrentConfigKey('materialTypes')
                        setShowAddModal(true)
                        setNewConfigValue({ value: '', label: '' })
                      }}
                      className="btn-primary flex items-center gap-2"
                    >
                      <FiPlus className="w-4 h-4" />
                      Adicionar Tipo
                    </button>
                  </div>
                  <div className="space-y-2">
                    {materialTypes.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">Nenhum tipo configurado</p>
                    ) : (
                      materialTypes.map((type) => (
                        <div
                          key={type._id}
                          className={`flex items-center justify-between p-4 rounded-lg border ${
                            type.isActive ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200 opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            {editingConfig === type._id ? (
                              <input
                                id={`type-label-${type._id}`}
                                type="text"
                                defaultValue={type.label}
                                className="px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                              />
                            ) : (
                              <span className="font-medium text-gray-900">{type.label}</span>
                            )}
                            {!type.isActive && (
                              <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded">Desativado</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {type.isActive ? (
                              <>
                                <button
                                  onClick={() => {
                                    if (editingConfig === type._id) {
                                      handleUpdateConfig('materialTypes', type._id, {
                                        label: document.getElementById(`type-label-${type._id}`).value
                                      })
                                    } else {
                                      setEditingConfig(type._id)
                                    }
                                  }}
                                  disabled={actionLoading === type._id || actionLoading === `delete-${type._id}`}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                  {actionLoading === type._id ? (
                                    <FiLoader className="w-4 h-4 animate-spin" />
                                  ) : editingConfig === type._id ? (
                                    <FiCheck className="w-4 h-4" />
                                  ) : (
                                    <FiEdit2 className="w-4 h-4" />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleDeleteConfig('materialTypes', type._id)}
                                  disabled={actionLoading === type._id || actionLoading === `delete-${type._id}`}
                                  className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                  title="Desativar"
                                >
                                  <FiX className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handlePermanentDeleteConfig('materialTypes', type._id, type.label)}
                                  disabled={actionLoading === type._id || actionLoading === `delete-${type._id}`}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Eliminar Permanentemente"
                                >
                                  {actionLoading === `delete-${type._id}` ? (
                                    <FiLoader className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <FiTrash2 className="w-4 h-4" />
                                  )}
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleReactivateConfig('materialTypes', type._id)}
                                  disabled={actionLoading === type._id || actionLoading === `delete-${type._id}`}
                                  className="px-3 py-1.5 text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors text-sm font-medium flex items-center gap-1.5"
                                  title="Reativar"
                                >
                                  {actionLoading === type._id ? (
                                    <FiLoader className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <>
                                      <FiCheck className="w-4 h-4" />
                                      Reativar
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => handlePermanentDeleteConfig('materialTypes', type._id, type.label)}
                                  disabled={actionLoading === type._id || actionLoading === `delete-${type._id}`}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Eliminar Permanentemente"
                                >
                                  {actionLoading === `delete-${type._id}` ? (
                                    <FiLoader className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <FiTrash2 className="w-4 h-4" />
                                  )}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* Modal para Adicionar Config */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Adicionar {currentConfigKey === 'availableYears' ? 'Ano' : 'Tipo de Material'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {currentConfigKey === 'availableYears' ? 'Número do Ano' : 'Nome do Tipo'} *
                </label>
                <input
                  type={currentConfigKey === 'availableYears' ? 'number' : 'text'}
                  value={newConfigValue.value}
                  onChange={(e) => setNewConfigValue({ ...newConfigValue, value: e.target.value })}
                  placeholder={currentConfigKey === 'availableYears' ? 'Ex: 6' : 'Ex: Livro'}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Label (Texto Exibido) *</label>
                <input
                  type="text"
                  value={newConfigValue.label}
                  onChange={(e) => setNewConfigValue({ ...newConfigValue, label: e.target.value })}
                  placeholder={currentConfigKey === 'availableYears' ? 'Ex: 6º Ano' : 'Ex: Livro'}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setNewConfigValue({ value: '', label: '' })
                  setCurrentConfigKey(null)
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleAddConfig(currentConfigKey)}
                disabled={actionLoading === 'add' || !newConfigValue.value || !newConfigValue.label}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {actionLoading === 'add' ? (
                  <FiLoader className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <FiPlus className="w-4 h-4" />
                    Adicionar
                  </>
                )}
              </button>
            </div>
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
        confirmText={confirmModal.confirmText || (confirmModal.type === 'danger' ? 'Remover' : 'Confirmar')}
      />
    </div>
  )
}

export default AdminDashboard

