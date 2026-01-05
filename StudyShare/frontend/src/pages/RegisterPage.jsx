import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { 
  FiUser, 
  FiMail, 
  FiLock, 
  FiBook, 
  FiBookOpen,
  FiUserPlus,
  FiArrowLeft,
  FiLoader,
  FiEye,
  FiEyeOff,
  FiCheck
} from 'react-icons/fi'

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    course: '',
    year: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  
  const { register } = useAuth()
  const navigate = useNavigate()

  // Validador de password em tempo real
  const passwordRequirements = useMemo(() => {
    const password = formData.password
    return {
      minLength: password.length >= 6,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      matches: password === formData.confirmPassword && password.length > 0
    }
  }, [formData.password, formData.confirmPassword])

  const allRequirementsMet = Object.values(passwordRequirements).every(req => req === true)

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
    // Limpar erros quando o utilizador começa a escrever
    if (errors[e.target.name]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[e.target.name]
        return newErrors
      })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setErrors({})

    if (!allRequirementsMet) {
      setError('A password não cumpre todos os requisitos')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('As passwords não coincidem')
      return
    }

    setLoading(true)

    const { confirmPassword, ...registerData } = formData
    const result = await register(registerData)

    if (result.success) {
      navigate('/')
    } else {
      setError(result.message)
      if (result.errors) {
        const errorObj = {}
        result.errors.forEach(err => {
          errorObj[err.path] = err.msg
        })
        setErrors(errorObj)
      }
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50/30 flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full">
        {/* Logo e Header */}
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-600 to-primary-700 rounded-3xl shadow-xl mb-6 hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <FiBook className="w-10 h-10 text-white" />
          </Link>
          <h1 className="text-5xl font-bold text-gray-900 mb-3 tracking-tight">StudyShare</h1>
          <p className="text-gray-500 text-lg">Cria a tua conta e começa a partilhar</p>
        </div>

        {/* Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-gray-100/50 p-10">
          {error && (
            <div className="mb-6 p-4 bg-red-50/80 border border-red-200 text-red-700 rounded-xl flex items-start gap-3 animate-in fade-in">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2.5">
                Nome Completo
              </label>
              <div className="relative group">
                <FiUser className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-primary-600 transition-colors" />
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className={`w-full pl-12 pr-4 py-3.5 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all bg-white/50 backdrop-blur-sm ${
                    errors.name 
                      ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500' 
                      : 'border-gray-200 focus:ring-primary-500/20 focus:border-primary-500'
                  }`}
                  placeholder="João Silva"
                />
              </div>
              {errors.name && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
                  <span>•</span> {errors.name}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2.5">
                Email
              </label>
              <div className="relative group">
                <FiMail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-primary-600 transition-colors" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className={`w-full pl-12 pr-4 py-3.5 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all bg-white/50 backdrop-blur-sm ${
                    errors.email 
                      ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500' 
                      : 'border-gray-200 focus:ring-primary-500/20 focus:border-primary-500'
                  }`}
                  placeholder="seu.email@universidade.pt"
                />
              </div>
              {errors.email && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
                  <span>•</span> {errors.email}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="course" className="block text-sm font-semibold text-gray-700 mb-2.5">
                  Curso (opcional)
                </label>
                <div className="relative group">
                  <FiBookOpen className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-primary-600 transition-colors" />
                  <input
                    id="course"
                    name="course"
                    type="text"
                    value={formData.course}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all bg-white/50 backdrop-blur-sm"
                    placeholder="Ex: Eng. Informática"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="year" className="block text-sm font-semibold text-gray-700 mb-2.5">
                  Ano (opcional)
                </label>
                <select
                  id="year"
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all bg-white/50 backdrop-blur-sm text-gray-700"
                >
                  <option value="">Selecionar ano</option>
                  <option value="1">1º Ano</option>
                  <option value="2">2º Ano</option>
                  <option value="3">3º Ano</option>
                  <option value="4">4º Ano</option>
                  <option value="5">5º Ano</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2.5">
                Password
              </label>
              <div className="relative group">
                <FiLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-primary-600 transition-colors" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className={`w-full pl-12 pr-12 py-3.5 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all bg-white/50 backdrop-blur-sm ${
                    errors.password 
                      ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500' 
                      : formData.password && !allRequirementsMet
                      ? 'border-yellow-400 focus:ring-yellow-400/20 focus:border-yellow-400'
                      : formData.password && allRequirementsMet
                      ? 'border-green-500 focus:ring-green-500/20 focus:border-green-500'
                      : 'border-gray-200 focus:ring-primary-500/20 focus:border-primary-500'
                  }`}
                  placeholder="Cria uma password segura"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                </button>
              </div>

              {/* Validador de Password em Tempo Real */}
              {formData.password && (
                <div className="mt-4 p-4 bg-gray-50/80 rounded-xl border border-gray-200">
                  <p className="text-xs font-semibold text-gray-700 mb-3">Requisitos de password:</p>
                  <div className="space-y-2">
                    <div className={`flex items-center gap-2 text-sm transition-all ${
                      passwordRequirements.minLength ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                        passwordRequirements.minLength 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-200 text-gray-400'
                      }`}>
                        {passwordRequirements.minLength && <FiCheck className="w-3 h-3" />}
                      </div>
                      <span>Mínimo 6 caracteres</span>
                    </div>
                    <div className={`flex items-center gap-2 text-sm transition-all ${
                      passwordRequirements.hasUpperCase ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                        passwordRequirements.hasUpperCase 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-200 text-gray-400'
                      }`}>
                        {passwordRequirements.hasUpperCase && <FiCheck className="w-3 h-3" />}
                      </div>
                      <span>Uma letra maiúscula</span>
                    </div>
                    <div className={`flex items-center gap-2 text-sm transition-all ${
                      passwordRequirements.hasLowerCase ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                        passwordRequirements.hasLowerCase 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-200 text-gray-400'
                      }`}>
                        {passwordRequirements.hasLowerCase && <FiCheck className="w-3 h-3" />}
                      </div>
                      <span>Uma letra minúscula</span>
                    </div>
                    <div className={`flex items-center gap-2 text-sm transition-all ${
                      passwordRequirements.hasNumber ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                        passwordRequirements.hasNumber 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-200 text-gray-400'
                      }`}>
                        {passwordRequirements.hasNumber && <FiCheck className="w-3 h-3" />}
                      </div>
                      <span>Um número</span>
                    </div>
                    <div className={`flex items-center gap-2 text-sm transition-all ${
                      passwordRequirements.hasSpecialChar ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                        passwordRequirements.hasSpecialChar 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-200 text-gray-400'
                      }`}>
                        {passwordRequirements.hasSpecialChar && <FiCheck className="w-3 h-3" />}
                      </div>
                      <span>Um carácter especial (!@#$%...)</span>
                    </div>
                  </div>
                </div>
              )}
              {errors.password && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
                  <span>•</span> {errors.password}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2.5">
                Confirmar Password
              </label>
              <div className="relative group">
                <FiLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-primary-600 transition-colors" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className={`w-full pl-12 pr-12 py-3.5 border-2 rounded-xl focus:outline-none focus:ring-2 transition-all bg-white/50 backdrop-blur-sm ${
                    formData.confirmPassword && passwordRequirements.matches
                      ? 'border-green-500 focus:ring-green-500/20 focus:border-green-500'
                      : formData.confirmPassword && !passwordRequirements.matches
                      ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500'
                      : 'border-gray-200 focus:ring-primary-500/20 focus:border-primary-500'
                  }`}
                  placeholder="Confirma a tua password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showConfirmPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                </button>
              </div>
              {formData.confirmPassword && !passwordRequirements.matches && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
                  <span>•</span> As passwords não coincidem
                </p>
              )}
              {formData.confirmPassword && passwordRequirements.matches && (
                <p className="mt-2 text-sm text-green-600 flex items-center gap-1.5">
                  <FiCheck className="w-4 h-4" />
                  <span>As passwords coincidem</span>
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !allRequirementsMet}
              className="w-full bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base"
            >
              {loading ? (
                <>
                  <FiLoader className="w-5 h-5 animate-spin" />
                  <span>A criar conta...</span>
                </>
              ) : (
                <>
                  <FiUserPlus className="w-5 h-5" />
                  <span>Criar Conta</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-gray-600 text-sm">
              Já tens conta?{' '}
              <Link to="/login" className="text-primary-600 hover:text-primary-700 font-semibold transition-colors hover:underline">
                Inicia sessão aqui
              </Link>
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <Link 
              to="/" 
              className="flex items-center justify-center gap-2 text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors group"
            >
              <FiArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span>Voltar ao início</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
