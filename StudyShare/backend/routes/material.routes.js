import express from 'express';
import { body, query, validationResult } from 'express-validator';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import Material from '../models/Material.model.js';
import User from '../models/User.model.js';
import SystemConfig from '../models/SystemConfig.model.js';
import { authMiddleware, optionalAuth } from '../middleware/auth.middleware.js';
import { notifyNewComment, notifyNewRating, emitNewComment, emitRatingUpdate, notifyAdminsNewReport } from '../utils/notifications.js';
import { updateMaterialAuthorReputation, recalculateUserReputation } from '../utils/reputation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Helper para validar ano dinamicamente
const validateYear = async (year) => {
  try {
    const config = await SystemConfig.findOne({ key: 'availableYears' });
    if (config) {
      const validYears = config.values.filter(v => v.isActive).map(v => v.value);
      return validYears.includes(parseInt(year));
    }
    // Fallback para validação padrão (1-5)
    const yearNum = parseInt(year);
    return yearNum >= 1 && yearNum <= 5;
  } catch (error) {
    // Fallback para validação padrão
    const yearNum = parseInt(year);
    return yearNum >= 1 && yearNum <= 5;
  }
};

// Helper para validar tipo de material dinamicamente
const validateMaterialType = async (materialType) => {
  try {
    const config = await SystemConfig.findOne({ key: 'materialTypes' });
    if (config) {
      const validTypes = config.values.filter(v => v.isActive).map(v => v.value);
      return validTypes.includes(materialType);
    }
    // Fallback para tipos padrão
    const defaultTypes = ['Apontamento', 'Resumo', 'Exercícios', 'Exame', 'Slides'];
    return defaultTypes.includes(materialType);
  } catch (error) {
    // Fallback para tipos padrão
    const defaultTypes = ['Apontamento', 'Resumo', 'Exercícios', 'Exame', 'Slides'];
    return defaultTypes.includes(materialType);
  }
};

// Configurar multer para upload de ficheiros
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Gerar nome único: timestamp + nome original
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB
  },
  fileFilter: (req, file, cb) => {
    // Aceitar apenas certos tipos de ficheiro
    const allowedTypes = /\.(pdf|doc|docx|ppt|pptx|jpg|jpeg|png)$/i;
    if (allowedTypes.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de ficheiro não permitido. Apenas PDF, DOC, DOCX, PPT, PPTX, JPG, JPEG, PNG são aceites.'));
    }
  }
});

/**
 * @route   GET /api/materials
 * @desc    Listar materiais com filtros e pesquisa
 * @access  Public
 */
router.get('/', [
  optionalAuth, // Autenticação opcional para personalização
  query('search').optional().trim(),
  query('discipline').optional().trim(),
  query('course').optional().trim(),
  query('year').optional(),
  query('materialType').optional(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('sort').optional().isIn(['recent', 'rating', 'downloads', 'views'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Parâmetros inválidos',
        errors: errors.array()
      });
    }

    const {
      search,
      discipline,
      course,
      year,
      materialType,
      page = 1,
      limit = 20,
      sort = 'recent'
    } = req.query;

    // Construir filtros
    const filters = {
      isActive: true,
      isApproved: true
    };

    if (discipline) filters.discipline = new RegExp(discipline, 'i');
    if (course) filters.course = new RegExp(course, 'i');
    if (year) filters.year = parseInt(year);
    if (materialType) filters.materialType = materialType;

    // Construir query
    let query = Material.find(filters).populate('author', 'name email avatar reputation');

    // Pesquisa por texto
    if (search) {
      query = Material.find({
        ...filters,
        $text: { $search: search }
      }).populate('author', 'name email avatar reputation');
    }

    // Ordenação
    switch (sort) {
      case 'rating':
        query = query.sort({ 'rating.average': -1, createdAt: -1 });
        break;
      case 'downloads':
        query = query.sort({ downloads: -1, createdAt: -1 });
        break;
      case 'views':
        query = query.sort({ views: -1, createdAt: -1 });
        break;
      case 'recent':
      default:
        query = query.sort({ createdAt: -1 });
        break;
    }

    // Paginação
    const skip = (parseInt(page) - 1) * parseInt(limit);
    query = query.skip(skip).limit(parseInt(limit));

    const materials = await query;

    // Total de documentos
    const total = await Material.countDocuments(filters);

    res.json({
      materials,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Erro ao listar materiais:', error);
    res.status(500).json({
      message: 'Erro ao buscar materiais'
    });
  }
});

/**
 * @route   GET /api/materials/:id
 * @desc    Obter detalhes de um material
 * @access  Public
 */
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const material = await Material.findById(req.params.id)
      .populate('author', 'name email avatar reputation materialsUploaded')
      .populate('comments.user', 'name avatar')
      .populate('likes', 'name');

    if (!material || !material.isActive || !material.isApproved) {
      return res.status(404).json({
        message: 'Material não encontrado'
      });
    }

    // Obter avaliação do utilizador atual (se autenticado)
    let userRating = null;
    if (req.user) {
      const userRatingObj = material.userRatings.find(
        ur => {
          const userId = ur.user?.toString ? ur.user.toString() : ur.user;
          return userId === req.user._id.toString();
        }
      );
      userRating = userRatingObj ? userRatingObj.rating : null;
    }

    // Incrementar visualizações com rastreamento por user ID ou IP
    // Permitir uma visualização a cada 30 segundos do mesmo user/IP
    if (!global.viewedMaterials) {
      global.viewedMaterials = new Map();
    }
    
    // Criar chave única baseada em user ID (se autenticado) ou IP
    let viewKey;
    if (req.user && req.user._id) {
      viewKey = `user_${req.user._id}_material_${req.params.id}`;
    } else {
      const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || 
                      req.connection?.remoteAddress || 
                      req.socket?.remoteAddress || 
                      'unknown';
      viewKey = `ip_${clientIp}_material_${req.params.id}`;
    }
    
    const now = Date.now();
    const thirtySeconds = 30 * 1000; // 30 segundos
    
    // Limpar entradas antigas (mais de 1 minuto)
    for (const [key, timestamp] of global.viewedMaterials.entries()) {
      if (now - timestamp > 60 * 1000) {
        global.viewedMaterials.delete(key);
      }
    }
    
    const lastViewTime = global.viewedMaterials.get(viewKey);
    const canView = !lastViewTime || (now - lastViewTime) > thirtySeconds;
    
    let updatedMaterial;
    if (canView) {
      // Marcar como visualizado agora
      global.viewedMaterials.set(viewKey, now);
      
      // Incrementar visualizações usando $inc para evitar race conditions
      updatedMaterial = await Material.findByIdAndUpdate(
        req.params.id, 
        { $inc: { views: 1 } },
        { new: true }
      )
        .populate('author', 'name email avatar reputation materialsUploaded')
        .populate('comments.user', 'name avatar')
        .populate('likes', 'name');
    } else {
      // Ainda não passaram 30 segundos, apenas buscar sem incrementar
      updatedMaterial = await Material.findById(req.params.id)
        .populate('author', 'name email avatar reputation materialsUploaded')
        .populate('comments.user', 'name avatar')
        .populate('likes', 'name');
    }

    // Converter para objeto e adicionar userRating
    const materialObj = updatedMaterial.toObject();
    materialObj.userRating = userRating;

    res.json({ material: materialObj });
  } catch (error) {
    console.error('Erro ao obter material:', error);
    res.status(500).json({
      message: 'Erro ao buscar material'
    });
  }
});

/**
 * @route   POST /api/materials
 * @desc    Criar novo material com upload de ficheiro
 * @access  Private (apenas utilizadores autenticados)
 */
router.post('/', [
  authMiddleware,
  upload.single('file'), // Middleware multer para processar o ficheiro
  body('title')
    .trim()
    .notEmpty().withMessage('Título é obrigatório')
    .isLength({ max: 200 }).withMessage('Título não pode exceder 200 caracteres'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Descrição não pode exceder 2000 caracteres'),
  body('discipline')
    .trim()
    .notEmpty().withMessage('Disciplina é obrigatória'),
  body('year')
    .custom(async (value) => {
      const isValid = await validateYear(value);
      if (!isValid) {
        throw new Error('Ano inválido. Verifica os anos disponíveis nas configurações.');
      }
      return true;
    }),
  body('materialType')
    .custom(async (value) => {
      const isValid = await validateMaterialType(value);
      if (!isValid) {
        throw new Error('Tipo de material inválido. Verifica os tipos disponíveis nas configurações.');
      }
      return true;
    }),
  body('tags')
    .optional()
    .isArray().withMessage('Tags deve ser um array'),
  body('course')
    .optional()
    .trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Se houver erros de validação e um ficheiro foi enviado, removê-lo
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        message: 'Dados inválidos',
        errors: errors.array()
      });
    }

    // Verificar se o ficheiro foi enviado
    if (!req.file) {
      return res.status(400).json({
        message: 'Ficheiro é obrigatório'
      });
    }

    // Construir dados do material
    const materialData = {
      title: req.body.title,
      description: req.body.description,
      discipline: req.body.discipline,
      course: req.body.course || undefined,
      year: parseInt(req.body.year),
      materialType: req.body.materialType,
      fileUrl: `/uploads/${req.file.filename}`, // Caminho relativo do ficheiro
      fileName: req.file.originalname, // Nome original do ficheiro
      fileSize: req.file.size,
      fileType: req.file.mimetype,
      tags: req.body.tags ? (Array.isArray(req.body.tags) ? req.body.tags : JSON.parse(req.body.tags)) : [],
      author: req.user._id
    };

    const material = new Material(materialData);
    await material.save();

    // Incrementar contador de materiais do autor
    await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { materialsUploaded: 1 } }
    );

    // Popular author para resposta
    await material.populate('author', 'name email avatar reputation');

    res.status(201).json({
      message: 'Material criado com sucesso',
      material
    });
  } catch (error) {
    console.error('Erro ao criar material:', error);
    // Se houver erro e um ficheiro foi enviado, removê-lo
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      message: 'Erro ao criar material',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

/**
 * @route   PUT /api/materials/:id
 * @desc    Atualizar material (apenas autor ou admin)
 * @access  Private
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);

    if (!material) {
      return res.status(404).json({
        message: 'Material não encontrado'
      });
    }

    // Verificar se é o autor ou administrador
    if (material.author.toString() !== req.user._id.toString() && req.user.role !== 'Administrador') {
      return res.status(403).json({
        message: 'Não tem permissão para editar este material'
      });
    }

    // Validar ano se fornecido
    if (req.body.year !== undefined) {
      const isValidYear = await validateYear(req.body.year);
      if (!isValidYear) {
        return res.status(400).json({
          message: 'Ano inválido. Verifica os anos disponíveis nas configurações.'
        });
      }
    }

    // Validar tipo de material se fornecido
    if (req.body.materialType !== undefined) {
      const isValidType = await validateMaterialType(req.body.materialType);
      if (!isValidType) {
        return res.status(400).json({
          message: 'Tipo de material inválido. Verifica os tipos disponíveis nas configurações.'
        });
      }
    }

    // Campos permitidos para atualização
    const allowedUpdates = ['title', 'description', 'discipline', 'course', 'year', 'materialType', 'tags'];
    const updates = Object.keys(req.body).filter(key => allowedUpdates.includes(key));
    
    updates.forEach(update => {
      material[update] = req.body[update];
    });

    await material.save();
    await material.populate('author', 'name email avatar reputation');

    res.json({
      message: 'Material atualizado com sucesso',
      material
    });
  } catch (error) {
    console.error('Erro ao atualizar material:', error);
    res.status(500).json({
      message: 'Erro ao atualizar material'
    });
  }
});

/**
 * @route   DELETE /api/materials/:id
 * @desc    Remover material permanentemente (apenas autor ou admin)
 * @access  Private
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);

    if (!material) {
      return res.status(404).json({
        message: 'Material não encontrado'
      });
    }

    // Verificar se é o autor ou administrador
    if (material.author.toString() !== req.user._id.toString() && req.user.role !== 'Administrador') {
      return res.status(403).json({
        message: 'Não tem permissão para remover este material'
      });
    }

    // Hard delete - eliminar permanentemente
    // Remover ficheiro físico se existir
    if (material.fileUrl && !material.fileUrl.startsWith('http')) {
      const filePath = path.join(__dirname, '..', material.fileUrl);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log('Ficheiro removido:', filePath);
        } catch (fileError) {
          console.error('Erro ao remover ficheiro:', fileError);
          // Continuar mesmo se o ficheiro não for encontrado
        }
      }
    }

    // Eliminar material da base de dados
    await Material.findByIdAndDelete(req.params.id);

    // Decrementar contador de materiais do autor (garantir que não fica negativo)
    await User.findByIdAndUpdate(
      material.author,
      { $inc: { materialsUploaded: -1 } },
      { new: true }
    );
    
    // Garantir que o contador não fica negativo - recalcular se necessário
    const author = await User.findById(material.author);
    if (author.materialsUploaded < 0) {
      // Recalcular contador baseado nos materiais reais
      const actualCount = await Material.countDocuments({
        author: material.author,
        isActive: true
      });
      author.materialsUploaded = actualCount;
      await author.save();
    }

    res.json({
      message: 'Material eliminado permanentemente com sucesso'
    });
  } catch (error) {
    console.error('Erro ao remover material:', error);
    res.status(500).json({
      message: 'Erro ao remover material'
    });
  }
});

/**
 * @route   GET /api/materials/:id/preview
 * @desc    Pré-visualizar o ficheiro do material (sem autenticação, apenas visualização)
 * @access  Public
 */
router.get('/:id/preview', async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);

    if (!material || !material.isActive || !material.isApproved) {
      return res.status(404).json({
        message: 'Material não encontrado'
      });
    }

    // Se fileUrl é uma URL externa (http/https), redirecionar
    if (material.fileUrl.startsWith('http://') || material.fileUrl.startsWith('https://')) {
      return res.redirect(material.fileUrl);
    }

    // Para URLs locais, servir o ficheiro diretamente
    try {
      // Construir caminho completo do ficheiro
      let filePath;
      if (material.fileUrl.startsWith('/')) {
        filePath = path.join(__dirname, '..', material.fileUrl);
      } else {
        filePath = path.isAbsolute(material.fileUrl) 
          ? material.fileUrl 
          : path.join(__dirname, '..', material.fileUrl);
      }
      
      // Verificar se o ficheiro existe
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          message: 'Ficheiro não encontrado no servidor',
          fileUrl: material.fileUrl
        });
      }
      
      // Obter informações do ficheiro
      const stats = fs.statSync(filePath);
      const fileSize = stats.size;
      const ext = path.extname(material.fileName || filePath).toLowerCase();
      
      // Determinar content-type baseado na extensão
      const contentTypes = {
        '.pdf': 'application/pdf',
        '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        '.ppt': 'application/vnd.ms-powerpoint',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.doc': 'application/msword',
        '.zip': 'application/zip',
        '.txt': 'text/plain',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml'
      };
      const contentType = contentTypes[ext] || 'application/octet-stream';
      
      // Headers para visualização (inline, não download)
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(material.fileName || 'file')}"`);
      res.setHeader('Content-Length', fileSize);
      
      // Headers para permitir CORS e embedding em iframes
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('X-Frame-Options', 'SAMEORIGIN'); // Permitir embedding no mesmo domínio
      
      // Ler e enviar o ficheiro
      const fileStream = fs.createReadStream(filePath);
      
      fileStream.on('error', (error) => {
        console.error('Erro ao ler ficheiro para preview:', error);
        if (!res.headersSent) {
          res.status(500).json({
            message: 'Erro ao ler ficheiro',
            error: error.message
          });
        }
      });
      
      fileStream.pipe(res);
      return;
    } catch (error) {
      console.error('Erro ao servir ficheiro local para preview:', error);
      if (error.code === 'ENOENT') {
        return res.status(404).json({
          message: 'Ficheiro não encontrado no servidor'
        });
      }
      return res.status(500).json({
        message: 'Erro ao servir ficheiro'
      });
    }
  } catch (error) {
    console.error('Erro ao servir preview:', error);
    res.status(500).json({
      message: 'Erro ao servir preview'
    });
  }
});

/**
 * @route   GET /api/materials/:id/download
 * @desc    Fazer download do ficheiro do material (proxy para URLs externas)
 * @access  Private
 */
router.get('/:id/download', authMiddleware, async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);

    if (!material || !material.isActive || !material.isApproved) {
      return res.status(404).json({
        message: 'Material não encontrado'
      });
    }

    // Incrementar contador de downloads
    material.downloads += 1;
    await material.save();

    // Atualizar reputação do autor do material
    updateMaterialAuthorReputation(req.params.id).catch(err => {
      console.error('Erro ao atualizar reputação:', err);
    });

    // Incrementar contador de downloads do utilizador
    await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { materialsDownloaded: 1 } }
    );

    // Se fileUrl é uma URL externa (http/https), fazer proxy do download
    if (material.fileUrl.startsWith('http://') || material.fileUrl.startsWith('https://')) {
      try {
        // Fazer fetch do ficheiro externo (Node.js 18+ tem fetch nativo)
        const fileResponse = await fetch(material.fileUrl);
        
        if (!fileResponse.ok) {
          throw new Error(`HTTP error! status: ${fileResponse.status}`);
        }

        // Obter o tipo de conteúdo
        const contentType = fileResponse.headers.get('content-type') || 'application/octet-stream';
        const contentLength = fileResponse.headers.get('content-length');
        
        // Obter o buffer do ficheiro como arrayBuffer
        const arrayBuffer = await fileResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Nome do ficheiro com encoding correto (RFC 5987)
        const fileName = material.fileName || 'material';
        const encodedFileName = encodeURIComponent(fileName);
        const asciiFileName = fileName.replace(/[^\x00-\x7F]/g, ''); // Fallback ASCII
        
        // Definir headers para forçar download
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${asciiFileName}"; filename*=UTF-8''${encodedFileName}`);
        res.setHeader('Content-Transfer-Encoding', 'binary');
        if (contentLength) {
          res.setHeader('Content-Length', contentLength);
        } else {
          res.setHeader('Content-Length', buffer.length);
        }

        // Enviar o ficheiro como binário
        res.end(buffer, 'binary');
        return; // Importante: não continuar após enviar o ficheiro
      } catch (fetchError) {
        console.error('Erro ao fazer proxy do download:', fetchError);
        // Se falhar, retornar URL para o frontend tentar
        res.status(200).json({
          message: 'Download registado',
          fileUrl: material.fileUrl,
          fileName: material.fileName,
          isExternal: true,
          useDirectDownload: true
        });
        return;
      }
    } else {
      // Para URLs locais, servir o ficheiro diretamente
      try {
        // Construir caminho completo do ficheiro
        let filePath;
        if (material.fileUrl.startsWith('/')) {
          // Caminho relativo a partir da raiz do projeto (ex: /uploads/file.pdf)
          filePath = path.join(__dirname, '..', material.fileUrl);
        } else {
          // Caminho absoluto ou relativo
          filePath = path.isAbsolute(material.fileUrl) 
            ? material.fileUrl 
            : path.join(__dirname, '..', material.fileUrl);
        }
        
        // Verificar se o ficheiro existe
        if (!fs.existsSync(filePath)) {
          res.status(404).json({
            message: 'Ficheiro não encontrado no servidor',
            fileUrl: material.fileUrl,
            fileName: material.fileName,
            attemptedPath: filePath
          });
          return;
        }
        
        // Obter informações do ficheiro
        const stats = fs.statSync(filePath);
        const fileSize = stats.size;
        const ext = path.extname(material.fileName || filePath).toLowerCase();
        
        // Determinar content-type baseado na extensão
        const contentTypes = {
          '.pdf': 'application/pdf',
          '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          '.ppt': 'application/vnd.ms-powerpoint',
          '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          '.doc': 'application/msword',
          '.zip': 'application/zip',
          '.txt': 'text/plain'
        };
        const contentType = contentTypes[ext] || 'application/octet-stream';
        
        // Nome do ficheiro com encoding correto
        const fileName = material.fileName || path.basename(filePath);
        const encodedFileName = encodeURIComponent(fileName);
        const asciiFileName = fileName.replace(/[^\x00-\x7F]/g, '');
        
        // Definir headers para forçar download
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${asciiFileName}"; filename*=UTF-8''${encodedFileName}`);
        res.setHeader('Content-Transfer-Encoding', 'binary');
        res.setHeader('Content-Length', fileSize);
        
        // Ler e enviar o ficheiro
        const fileStream = fs.createReadStream(filePath);
        
        fileStream.on('error', (error) => {
          console.error('Erro ao ler ficheiro:', error);
          if (!res.headersSent) {
            res.status(500).json({
              message: 'Erro ao ler ficheiro',
              error: error.message
            });
          }
        });
        
        fileStream.pipe(res);
        return; // Importante: não continuar após enviar o ficheiro
      } catch (error) {
        console.error('Erro ao servir ficheiro local:', error);
        console.error('Caminho tentado:', material.fileUrl);
        // Se o ficheiro não existir, retornar erro 404
        if (error.message.includes('não encontrado') || error.code === 'ENOENT') {
          res.status(404).json({
            message: 'Ficheiro não encontrado no servidor',
            fileUrl: material.fileUrl,
            fileName: material.fileName
          });
          return;
        }
        // Se falhar por outro motivo, retornar JSON com URL completa do backend
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:5001';
        res.status(200).json({
          message: 'Download registado',
          fileUrl: material.fileUrl.startsWith('http') 
            ? material.fileUrl 
            : `${backendUrl}${material.fileUrl.startsWith('/') ? '' : '/'}${material.fileUrl}`,
          fileName: material.fileName,
          isExternal: false
        });
      }
    }
  } catch (error) {
    console.error('Erro ao registar download:', error);
    res.status(500).json({
      message: 'Erro ao registar download'
    });
  }
});

/**
 * @route   POST /api/materials/:id/comments
 * @desc    Adicionar comentário a um material
 * @access  Private
 */
router.post('/:id/comments', [
  authMiddleware,
  body('text')
    .trim()
    .notEmpty().withMessage('O comentário não pode estar vazio')
    .isLength({ max: 1000 }).withMessage('Comentário não pode exceder 1000 caracteres')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Dados inválidos',
        errors: errors.array()
      });
    }

    const material = await Material.findById(req.params.id);

    if (!material || !material.isActive || !material.isApproved) {
      return res.status(404).json({
        message: 'Material não encontrado'
      });
    }

    const newComment = {
      user: req.user._id,
      text: req.body.text
    };

    material.comments.push(newComment);
    await material.save();

    // Atualizar reputação do autor do material
    updateMaterialAuthorReputation(req.params.id).catch(err => {
      console.error('Erro ao atualizar reputação:', err);
    });

    // Popular o comentário com dados do utilizador
    await material.populate('comments.user', 'name avatar');

    const addedComment = material.comments[material.comments.length - 1];

    // Emitir evento Socket.IO para atualização em tempo real
    emitNewComment(req.params.id, addedComment);

    // Enviar notificações sobre o novo comentário
    notifyNewComment(req.params.id, req.user._id, req.body.text).catch(err => {
      console.error('Erro ao enviar notificações de comentário:', err);
    });

    res.status(201).json({
      message: 'Comentário adicionado com sucesso',
      comment: addedComment
    });
  } catch (error) {
    console.error('Erro ao adicionar comentário:', error);
    res.status(500).json({
      message: 'Erro ao adicionar comentário'
    });
  }
});

/**
 * @route   POST /api/materials/:id/comments/:commentId/like
 * @desc    Dar like ou remover like de um comentário
 * @access  Private
 */
router.post('/:id/comments/:commentId/like', authMiddleware, async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);

    if (!material || !material.isActive || !material.isApproved) {
      return res.status(404).json({
        message: 'Material não encontrado'
      });
    }

    const comment = material.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({
        message: 'Comentário não encontrado'
      });
    }

    const userId = req.user._id;
    const userIdStr = userId.toString();

    // Verificar se já deu like
    const likeIndex = comment.likes.findIndex(
      likeId => likeId.toString() === userIdStr
    );

    // Remover dislike se existir
    const dislikeIndex = comment.dislikes.findIndex(
      dislikeId => dislikeId.toString() === userIdStr
    );
    if (dislikeIndex !== -1) {
      comment.dislikes.splice(dislikeIndex, 1);
    }

    if (likeIndex !== -1) {
      // Remover like
      comment.likes.splice(likeIndex, 1);
    } else {
      // Adicionar like
      comment.likes.push(userId);
    }

    await material.save();

    // Popular o comentário atualizado
    await material.populate('comments.user', 'name avatar');
    const updatedComment = material.comments.id(req.params.commentId);

    res.json({
      message: likeIndex !== -1 ? 'Like removido' : 'Like adicionado',
      comment: updatedComment
    });
  } catch (error) {
    console.error('Erro ao dar like no comentário:', error);
    res.status(500).json({
      message: 'Erro ao dar like no comentário'
    });
  }
});

/**
 * @route   POST /api/materials/:id/comments/:commentId/dislike
 * @desc    Dar dislike ou remover dislike de um comentário
 * @access  Private
 */
router.post('/:id/comments/:commentId/dislike', authMiddleware, async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);

    if (!material || !material.isActive || !material.isApproved) {
      return res.status(404).json({
        message: 'Material não encontrado'
      });
    }

    const comment = material.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({
        message: 'Comentário não encontrado'
      });
    }

    const userId = req.user._id;
    const userIdStr = userId.toString();

    // Verificar se já deu dislike
    const dislikeIndex = comment.dislikes.findIndex(
      dislikeId => dislikeId.toString() === userIdStr
    );

    // Remover like se existir
    const likeIndex = comment.likes.findIndex(
      likeId => likeId.toString() === userIdStr
    );
    if (likeIndex !== -1) {
      comment.likes.splice(likeIndex, 1);
    }

    if (dislikeIndex !== -1) {
      // Remover dislike
      comment.dislikes.splice(dislikeIndex, 1);
    } else {
      // Adicionar dislike
      comment.dislikes.push(userId);
    }

    await material.save();

    // Popular o comentário atualizado
    await material.populate('comments.user', 'name avatar');
    const updatedComment = material.comments.id(req.params.commentId);

    res.json({
      message: dislikeIndex !== -1 ? 'Dislike removido' : 'Dislike adicionado',
      comment: updatedComment
    });
  } catch (error) {
    console.error('Erro ao dar dislike no comentário:', error);
    res.status(500).json({
      message: 'Erro ao dar dislike no comentário'
    });
  }
});

/**
 * @route   POST /api/materials/:id/comments/:commentId/report
 * @desc    Reportar um comentário
 * @access  Private
 */
router.post('/:id/comments/:commentId/report', [
  authMiddleware,
  body('reason')
    .trim()
    .notEmpty().withMessage('Motivo do report é obrigatório')
    .isLength({ min: 10, max: 500 }).withMessage('Motivo deve ter entre 10 e 500 caracteres')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Dados inválidos',
        errors: errors.array()
      });
    }

    const material = await Material.findById(req.params.id);

    if (!material || !material.isActive || !material.isApproved) {
      return res.status(404).json({
        message: 'Material não encontrado'
      });
    }

    const comment = material.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({
        message: 'Comentário não encontrado'
      });
    }

    const userId = req.user._id;
    const userIdStr = userId.toString();

    // Verificar se já reportou este comentário
    const existingReport = comment.reports.find(
      report => report.user.toString() === userIdStr
    );

    if (existingReport) {
      return res.status(400).json({
        message: 'Já reportaste este comentário'
      });
    }

    // Adicionar report
    comment.reports.push({
      user: userId,
      reason: req.body.reason.trim()
    });

    await material.save();

    // Notificar todos os administradores
    notifyAdminsNewReport(req.params.id, 'comment', userId, req.body.reason.trim()).catch(err => {
      console.error('Erro ao notificar administradores sobre report:', err);
    });

    res.json({
      message: 'Comentário reportado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao reportar comentário:', error);
    res.status(500).json({
      message: 'Erro ao reportar comentário'
    });
  }
});

/**
 * @route   POST /api/materials/:id/rating
 * @desc    Avaliar um material (1-5 estrelas) - apenas uma vez por utilizador
 * @access  Private
 */
router.post('/:id/rating', [
  authMiddleware,
  body('rating')
    .isInt({ min: 1, max: 5 }).withMessage('Avaliação deve ser entre 1 e 5')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Dados inválidos',
        errors: errors.array()
      });
    }

    const material = await Material.findById(req.params.id);

    if (!material || !material.isActive || !material.isApproved) {
      return res.status(404).json({
        message: 'Material não encontrado'
      });
    }

    const ratingValue = parseInt(req.body.rating);
    const userId = req.user._id.toString();

    // Verificar se o utilizador já avaliou
    const existingRatingIndex = material.userRatings.findIndex(
      ur => {
        const urUserId = ur.user?.toString ? ur.user.toString() : (ur.user?._id ? ur.user._id.toString() : ur.user);
        return urUserId === userId;
      }
    );

    let oldRating = null;
    if (existingRatingIndex !== -1) {
      // Utilizador já avaliou - atualizar avaliação existente
      oldRating = material.userRatings[existingRatingIndex].rating;
      material.userRatings[existingRatingIndex].rating = ratingValue;
      material.userRatings[existingRatingIndex].createdAt = new Date();
    } else {
      // Nova avaliação
      material.userRatings.push({
        user: userId,
        rating: ratingValue
      });
    }

    // Recalcular breakdown baseado em todas as avaliações
    const breakdown = { one: 0, two: 0, three: 0, four: 0, five: 0 };
    material.userRatings.forEach(ur => {
      const key = ['one', 'two', 'three', 'four', 'five'][ur.rating - 1];
      breakdown[key]++;
    });
    material.rating.breakdown = breakdown;

    // Recalcular média
    const totalRatings = material.userRatings.length;
    const sumRatings = material.userRatings.reduce((sum, ur) => sum + ur.rating, 0);

    material.rating.average = totalRatings > 0 ? sumRatings / totalRatings : 0;
    material.rating.count = totalRatings;

    await material.save();

    // Atualizar reputação do autor do material
    updateMaterialAuthorReputation(req.params.id).catch(err => {
      console.error('Erro ao atualizar reputação:', err);
    });

    // Emitir evento Socket.IO para atualização em tempo real
    emitRatingUpdate(req.params.id, {
      average: material.rating.average,
      count: material.rating.count,
      breakdown: material.rating.breakdown
    });

    // Enviar notificação sobre a nova avaliação (apenas se for uma nova avaliação, não atualização)
    if (existingRatingIndex === -1) {
      notifyNewRating(req.params.id, req.user._id, ratingValue).catch(err => {
        console.error('Erro ao enviar notificação de avaliação:', err);
      });
    }

    res.json({
      message: existingRatingIndex !== -1 
        ? 'Avaliação atualizada com sucesso' 
        : 'Avaliação registada com sucesso',
      rating: {
        average: material.rating.average,
        count: material.rating.count,
        breakdown: material.rating.breakdown,
        userRating: ratingValue
      }
    });
  } catch (error) {
    console.error('Erro ao avaliar material:', error);
    res.status(500).json({
      message: 'Erro ao avaliar material'
    });
  }
});

/**
 * @route   GET /api/materials/:id/rating/user
 * @desc    Obter avaliação do utilizador atual para este material
 * @access  Private
 */
router.get('/:id/rating/user', authMiddleware, async (req, res) => {
  try {
    const material = await Material.findById(req.params.id).select('userRatings');

    if (!material) {
      return res.status(404).json({
        message: 'Material não encontrado'
      });
    }

    const userRating = material.userRatings.find(
      ur => ur.user.toString() === req.user._id.toString()
    );

    res.json({
      userRating: userRating ? userRating.rating : null
    });
  } catch (error) {
    console.error('Erro ao obter avaliação do utilizador:', error);
    res.status(500).json({
      message: 'Erro ao obter avaliação'
    });
  }
});

/**
 * @route   POST /api/materials/:id/report
 * @desc    Reportar um material
 * @access  Private
 */
router.post('/:id/report', [
  authMiddleware,
  body('reason')
    .trim()
    .notEmpty().withMessage('Motivo do report é obrigatório')
    .isLength({ min: 10, max: 500 }).withMessage('Motivo deve ter entre 10 e 500 caracteres')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Dados inválidos',
        errors: errors.array()
      });
    }

    const material = await Material.findById(req.params.id);

    if (!material || !material.isActive) {
      return res.status(404).json({
        message: 'Material não encontrado'
      });
    }

    // Verificar se o utilizador já reportou este material
    const existingReport = material.reports.find(
      r => r.user.toString() === req.user._id.toString()
    );

    if (existingReport) {
      return res.status(400).json({
        message: 'Já reportaste este material anteriormente'
      });
    }

    // Adicionar report
    material.reports.push({
      user: req.user._id,
      reason: req.body.reason
    });

    await material.save();

    // Notificar todos os administradores
    notifyAdminsNewReport(req.params.id, 'material', req.user._id, req.body.reason).catch(err => {
      console.error('Erro ao notificar administradores sobre report:', err);
    });

    res.status(201).json({
      message: 'Material reportado com sucesso. O administrador irá analisar.'
    });
  } catch (error) {
    console.error('Erro ao reportar material:', error);
    res.status(500).json({
      message: 'Erro ao reportar material'
    });
  }
});

export default router;

