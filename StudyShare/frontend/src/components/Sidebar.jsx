import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { 
  FiHome, 
  FiUpload, 
  FiFilter, 
  FiBook, 
  FiFileText,
  FiSearch,
  FiShield,
  FiHeart
} from 'react-icons/fi'

const Sidebar = ({ filters, onFilterChange }) => {
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'Administrador'

  return (
    <aside className="w-72 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white p-6 shadow-2xl min-h-screen flex flex-col border-r border-slate-700">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-3 mb-8 group">
        <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-primary-500/50 transition-all">
          <FiBook className="w-6 h-6" />
        </div>
        <span className="text-2xl font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
          StudyShare
        </span>
      </Link>

      <nav className="flex-1 space-y-6">
        {/* Botão Upload */}
        {isAuthenticated && (
          <div className="space-y-3">
            <Link
              to="/upload"
              className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3.5 px-4 rounded-xl text-center transition-all duration-200 shadow-lg hover:shadow-xl hover:shadow-green-500/50 transform hover:-translate-y-0.5"
            >
              <FiUpload className="w-5 h-5" />
              <span>Upload Material</span>
            </Link>
            <Link
              to="/favorites"
              className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-semibold py-3.5 px-4 rounded-xl text-center transition-all duration-200 shadow-lg hover:shadow-xl hover:shadow-red-500/50 transform hover:-translate-y-0.5"
            >
              <FiHeart className="w-5 h-5" />
              <span>Favoritos</span>
            </Link>
            {isAdmin && (
              <Link
                to="/admin"
                className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold py-3.5 px-4 rounded-xl text-center transition-all duration-200 shadow-lg hover:shadow-xl hover:shadow-purple-500/50 transform hover:-translate-y-0.5"
              >
                <FiShield className="w-5 h-5" />
                <span>Painel Admin</span>
              </Link>
            )}
          </div>
        )}

        {/* Filtros */}
        <div className="space-y-4 pt-4 border-t border-slate-700">
          <div className="flex items-center gap-2 text-slate-400 text-sm font-medium mb-4">
            <FiFilter className="w-4 h-4" />
            <span>Filtros</span>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2.5 flex items-center gap-2">
              <FiBook className="w-4 h-4" />
              Ano
            </label>
            <select
              value={filters.year || ''}
              onChange={(e) => onFilterChange('year', e.target.value)}
              className="w-full bg-slate-700/50 hover:bg-slate-700 text-white px-4 py-2.5 rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
            >
              <option value="">Todos os anos</option>
              <option value="1">1º Ano</option>
              <option value="2">2º Ano</option>
              <option value="3">3º Ano</option>
              <option value="4">4º Ano</option>
              <option value="5">5º Ano</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2.5">
              Curso
            </label>
            <input
              type="text"
              value={filters.course || ''}
              onChange={(e) => onFilterChange('course', e.target.value)}
              placeholder="Ex: Eng. Informática"
              className="w-full bg-slate-700/50 hover:bg-slate-700 text-white placeholder-slate-400 px-4 py-2.5 rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2.5">
              Disciplina
            </label>
            <input
              type="text"
              value={filters.discipline || ''}
              onChange={(e) => onFilterChange('discipline', e.target.value)}
              placeholder="Ex: Álgebra Linear"
              className="w-full bg-slate-700/50 hover:bg-slate-700 text-white placeholder-slate-400 px-4 py-2.5 rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2.5 flex items-center gap-2">
              <FiFileText className="w-4 h-4" />
              Tipo de Material
            </label>
            <select
              value={filters.materialType || ''}
              onChange={(e) => onFilterChange('materialType', e.target.value)}
              className="w-full bg-slate-700/50 hover:bg-slate-700 text-white px-4 py-2.5 rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
            >
              <option value="">Todos os tipos</option>
              <option value="Apontamento">Apontamento</option>
              <option value="Resumo">Resumo</option>
              <option value="Exercícios">Exercícios</option>
              <option value="Exame">Exame</option>
              <option value="Slides">Slides</option>
            </select>
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="pt-6 border-t border-slate-700">
        <p className="text-xs text-slate-400 text-center">
          © 2025 StudyShare
        </p>
      </div>
    </aside>
  )
}

export default Sidebar
