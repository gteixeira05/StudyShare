import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import Sidebar from '../components/Sidebar'
import { FiArrowLeft } from 'react-icons/fi'

const UploadPage = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [availableYears, setAvailableYears] = useState([])
  const [materialTypes, setMaterialTypes] = useState([])
  const [loadingConfigs, setLoadingConfigs] = useState(true)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    discipline: '',
    course: '',
    year: '',
    materialType: '',
    file: null
  })

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
      } finally {
        setLoadingConfigs(false)
      }
    }
    fetchConfigs()
  }, [])

  const handleChange = (e) => {
    if (e.target.name === 'file') {
      setFormData(prev => ({
        ...prev,
        file: e.target.files[0]
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [e.target.name]: e.target.value
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    if (!formData.file) {
      setError('Por favor, seleciona um ficheiro')
      return
    }

    setLoading(true)

    try {
      // Criar FormData para enviar o ficheiro
      const uploadFormData = new FormData()
      uploadFormData.append('file', formData.file)
      uploadFormData.append('title', formData.title)
      uploadFormData.append('description', formData.description)
      uploadFormData.append('discipline', formData.discipline)
      if (formData.course) {
        uploadFormData.append('course', formData.course)
      }
      uploadFormData.append('year', formData.year)
      uploadFormData.append('materialType', formData.materialType)

      const response = await api.post('/materials', uploadFormData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      
      // Recarregar dados do utilizador para atualizar contador
      if (window.location.pathname === '/profile') {
        window.location.reload()
      } else {
        navigate(`/material/${response.data.material._id}`)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao fazer upload do material')
      if (err.response?.data?.errors) {
        const errorMessages = err.response.data.errors.map(e => e.msg).join(', ')
        setError(errorMessages)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar filters={{}} onFilterChange={() => {}} />

      <main className="flex-1 p-8 max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Botão de Voltar */}
          <button
            onClick={() => navigate(-1)}
            className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors group"
          >
            <FiArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span>Voltar</span>
          </button>

          <h1 className="text-3xl font-bold text-gray-800 mb-2">Partilhar Material</h1>
          <p className="text-gray-600 mb-8">Preenche os dados abaixo para ajudar a comunidade</p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Título do Material *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: Resumo de Álgebra Linear - Cap 1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Disciplina *
                </label>
                <input
                  type="text"
                  name="discipline"
                  value={formData.discipline}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ano *
                </label>
                <select
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecionar...</option>
                  {loadingConfigs ? (
                    <option value="">A carregar...</option>
                  ) : (
                    availableYears.map((year) => (
                      <option key={year.value} value={year.value}>
                        {year.label}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Curso (opcional)
                </label>
                <input
                  type="text"
                  name="course"
                  value={formData.course}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Material *
                </label>
                <select
                  name="materialType"
                  value={formData.materialType}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecionar...</option>
                  {loadingConfigs ? (
                    <option value="">A carregar...</option>
                  ) : (
                    materialTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descrição
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Descreve brevemente o conteúdo do ficheiro, ano letivo ou professor..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ficheiro *
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
                <input
                  type="file"
                  name="file"
                  onChange={handleChange}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png"
                  className="hidden"
                  id="file-input"
                  required
                />
                <label htmlFor="file-input" className="cursor-pointer">
                  {formData.file ? (
                    <div>
                      <p className="text-blue-600 font-medium">{formData.file.name}</p>
                      <p className="text-sm text-gray-500 mt-2">
                        {(formData.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <div>
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="mt-2 text-sm text-gray-600">
                        Clica para selecionar ou arrasta o ficheiro aqui
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        PDF, DOC, DOCX, PPT, PPTX, JPG, JPEG, PNG (Máx 25MB)
                      </p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'A submeter...' : 'Submeter Material'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}

export default UploadPage

