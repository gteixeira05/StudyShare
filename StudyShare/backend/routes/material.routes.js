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
import { uploadBufferToCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Validar ano dinamicamente
const validateYear = async (year) => {
  try {
    const config = await SystemConfig.findOne({ key: 'availableYears' });
    if (config) {
      const validYears = config.values.filter(v => v.isActive).map(v => v.value);
      return validYears.includes(parseInt(year));
    }
    const yearNum = parseInt(year);
    return yearNum >= 1 && yearNum <= 5;
  } catch (error) {
    const yearNum = parseInt(year);
    return yearNum >= 1 && yearNum <= 5;
  }
};

// Validar tipo de material dinamicamente
const validateMaterialType = async (materialType) => {
  try {
    const config = await SystemConfig.findOne({ key: 'materialTypes' });
    if (config) {
      const validTypes = config.values.filter(v => v.isActive).map(v => v.value);
      return validTypes.includes(materialType);
    }
    const defaultTypes = ['Apontamento', 'Resumo', 'Exercícios', 'Exame', 'Slides'];
    return defaultTypes.includes(materialType);
  } catch (error) {
    const defaultTypes = ['Apontamento', 'Resumo', 'Exercícios', 'Exame', 'Slides'];
    return defaultTypes.includes(materialType);
  }
};

// Configurar multer para upload de ficheiros
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 25 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /\.(pdf|doc|docx|ppt|pptx|jpg|jpeg|png)$/i;
    if (allowedTypes.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de ficheiro não permitido. Apenas PDF, DOC, DOCX, PPT, PPTX, JPG, JPEG, PNG são aceites.'));
    }
  }
});

// Listar materiais com filtros e pesquisa
router.get('/', [
  optionalAuth,
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

    const filters = {
      isActive: true,
      isApproved: true
    };

    if (discipline) filters.discipline = new RegExp(discipline, 'i');
    if (course) filters.course = new RegExp(course, 'i');
    if (year) filters.year = parseInt(year);
    if (materialType) filters.materialType = materialType;

    let query = Material.find(filters).populate('author', 'name email avatar reputation');

    if (search) {
      query = Material.find({
        ...filters,
        $text: { $search: search }
      }).populate('author', 'name email avatar reputation');
    }

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

    const skip = (parseInt(page) - 1) * parseInt(limit);
    query = query.skip(skip).limit(parseInt(limit));

    const materials = await query;
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

// Obter detalhes de um material
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

    if (!global.viewedMaterials) {
      global.viewedMaterials = new Map();
    }
    
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
    const thirtySeconds = 30 * 1000;
    
    for (const [key, timestamp] of global.viewedMaterials.entries()) {
      if (now - timestamp > 60 * 1000) {
        global.viewedMaterials.delete(key);
      }
    }
    
    const lastViewTime = global.viewedMaterials.get(viewKey);
    const canView = !lastViewTime || (now - lastViewTime) > thirtySeconds;
    
    let updatedMaterial;
    if (canView) {
      global.viewedMaterials.set(viewKey, now);
      updatedMaterial = await Material.findByIdAndUpdate(
        req.params.id, 
        { $inc: { views: 1 } },
        { new: true }
      )
        .populate('author', 'name email avatar reputation materialsUploaded')
        .populate('comments.user', 'name avatar')
        .populate('likes', 'name');
    } else {
      updatedMaterial = await Material.findById(req.params.id)
        .populate('author', 'name email avatar reputation materialsUploaded')
        .populate('comments.user', 'name avatar')
        .populate('likes', 'name');
    }

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

// Criar novo material com upload de ficheiro
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
      return res.status(400).json({
        message: 'Dados inválidos',
        errors: errors.array()
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: 'Ficheiro é obrigatório'
      });
    }

    const imageExtensions = /\.(jpg|jpeg|png)$/i;
    const resourceType = imageExtensions.test(req.file.originalname) ? 'image' : 'raw';

    const cloudinaryResult = await uploadBufferToCloudinary(req.file.buffer, {
      folder: 'materials',
      resource_type: resourceType,
      public_id: `material-${Date.now()}-${Math.round(Math.random() * 1E9)}`
    });

    const materialData = {
      title: req.body.title,
      description: req.body.description,
      discipline: req.body.discipline,
      course: req.body.course || undefined,
      year: parseInt(req.body.year),
      materialType: req.body.materialType,
      fileUrl: cloudinaryResult.url,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileType: req.file.mimetype,
      tags: req.body.tags ? (Array.isArray(req.body.tags) ? req.body.tags : JSON.parse(req.body.tags)) : [],
      author: req.user._id
    };

    const material = new Material(materialData);
    await material.save();

    await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { materialsUploaded: 1 } }
    );

    await material.populate('author', 'name email avatar reputation');

    res.status(201).json({
      message: 'Material criado com sucesso',
      material
    });
  } catch (error) {
    console.error('Erro ao criar material:', error);
    res.status(500).json({
      message: 'Erro ao criar material',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

// Atualizar material (apenas autor ou admin)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);

    if (!material) {
      return res.status(404).json({
        message: 'Material não encontrado'
      });
    }

    if (material.author.toString() !== req.user._id.toString() && req.user.role !== 'Administrador') {
      return res.status(403).json({
        message: 'Não tem permissão para editar este material'
      });
    }

    if (req.body.year !== undefined) {
      const isValidYear = await validateYear(req.body.year);
      if (!isValidYear) {
        return res.status(400).json({
          message: 'Ano inválido. Verifica os anos disponíveis nas configurações.'
        });
      }
    }

    if (req.body.materialType !== undefined) {
      const isValidType = await validateMaterialType(req.body.materialType);
      if (!isValidType) {
        return res.status(400).json({
          message: 'Tipo de material inválido. Verifica os tipos disponíveis nas configurações.'
        });
      }
    }

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

// Remover material permanentemente (apenas autor ou admin)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);

    if (!material) {
      return res.status(404).json({
        message: 'Material não encontrado'
      });
    }

    if (material.author.toString() !== req.user._id.toString() && req.user.role !== 'Administrador') {
      return res.status(403).json({
        message: 'Não tem permissão para remover este material'
      });
    }

    if (material.fileUrl && material.fileUrl.includes('cloudinary.com')) {
      try {
        await deleteFromCloudinary(material.fileUrl, 'auto');
        console.log('Ficheiro removido do Cloudinary:', material.fileUrl);
      } catch (fileError) {
        console.error('Erro ao remover ficheiro do Cloudinary:', fileError);
      }
    } else if (material.fileUrl && !material.fileUrl.startsWith('http')) {
      const filePath = path.join(__dirname, '..', material.fileUrl);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log('Ficheiro local removido:', filePath);
        } catch (fileError) {
          console.error('Erro ao remover ficheiro local:', fileError);
        }
      }
    }

    await Material.findByIdAndDelete(req.params.id);

    await User.findByIdAndUpdate(
      material.author,
      { $inc: { materialsUploaded: -1 } },
      { new: true }
    );
    
    const author = await User.findById(material.author);
    if (author.materialsUploaded < 0) {
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

// Pré-visualizar o ficheiro do material
router.get('/:id/preview', async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);

    if (!material || !material.isActive || !material.isApproved) {
      return res.status(404).json({
        message: 'Material não encontrado'
      });
    }

    if (material.fileUrl.startsWith('http://') || material.fileUrl.startsWith('https://')) {
      try {
        const fileResponse = await fetch(material.fileUrl);
        
        if (!fileResponse.ok) {
          throw new Error(`HTTP error! status: ${fileResponse.status}`);
        }

        const contentType = fileResponse.headers.get('content-type') || 'application/pdf';
        const contentLength = fileResponse.headers.get('content-length');
        const arrayBuffer = await fileResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const ext = path.extname(material.fileName || material.fileUrl).toLowerCase();
        const contentTypes = {
          '.pdf': 'application/pdf',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif',
          '.webp': 'image/webp',
          '.svg': 'image/svg+xml'
        };
        const finalContentType = contentTypes[ext] || contentType;
        
        res.setHeader('Content-Type', finalContentType);
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(material.fileName || 'file')}"`);
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        if (contentLength) {
          res.setHeader('Content-Length', contentLength);
        } else {
          res.setHeader('Content-Length', buffer.length);
        }

        res.end(buffer, 'binary');
        return;
      } catch (fetchError) {
        console.error('Erro ao fazer proxy do preview do Cloudinary:', fetchError);
        return res.redirect(302, material.fileUrl);
      }
    }

    try {
      let filePath;
      if (material.fileUrl.startsWith('/')) {
        filePath = path.join(__dirname, '..', material.fileUrl);
      } else {
        filePath = path.isAbsolute(material.fileUrl) 
          ? material.fileUrl 
          : path.join(__dirname, '..', material.fileUrl);
      }
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          message: 'Ficheiro não encontrado no servidor',
          fileUrl: material.fileUrl
        });
      }
      
      const stats = fs.statSync(filePath);
      const fileSize = stats.size;
      const ext = path.extname(material.fileName || filePath).toLowerCase();
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
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(material.fileName || 'file')}"`);
      res.setHeader('Content-Length', fileSize);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      
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

// Fazer download do ficheiro do material
router.get('/:id/download', authMiddleware, async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);

    if (!material || !material.isActive || !material.isApproved) {
      return res.status(404).json({
        message: 'Material não encontrado'
      });
    }

    material.downloads += 1;
    await material.save();

    updateMaterialAuthorReputation(req.params.id).catch(err => {
      console.error('Erro ao atualizar reputação:', err);
    });

    await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { materialsDownloaded: 1 } }
    );

    if (material.fileUrl.startsWith('http://') || material.fileUrl.startsWith('https://')) {
      try {
        const fileResponse = await fetch(material.fileUrl);
        
        if (!fileResponse.ok) {
          throw new Error(`HTTP error! status: ${fileResponse.status}`);
        }

        const contentType = fileResponse.headers.get('content-type') || 'application/octet-stream';
        const contentLength = fileResponse.headers.get('content-length');
        const arrayBuffer = await fileResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const fileName = material.fileName || 'material';
        const encodedFileName = encodeURIComponent(fileName);
        const asciiFileName = fileName.replace(/[^\x00-\x7F]/g, '');
        
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${asciiFileName}"; filename*=UTF-8''${encodedFileName}`);
        res.setHeader('Content-Transfer-Encoding', 'binary');
        if (contentLength) {
          res.setHeader('Content-Length', contentLength);
        } else {
          res.setHeader('Content-Length', buffer.length);
        }

        res.end(buffer, 'binary');
        return;
      } catch (fetchError) {
        console.error('Erro ao fazer proxy do download:', fetchError);
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
      try {
        let filePath;
        if (material.fileUrl.startsWith('/')) {
          filePath = path.join(__dirname, '..', material.fileUrl);
        } else {
          filePath = path.isAbsolute(material.fileUrl) 
            ? material.fileUrl 
            : path.join(__dirname, '..', material.fileUrl);
        }
        
        if (!fs.existsSync(filePath)) {
          res.status(404).json({
            message: 'Ficheiro não encontrado no servidor',
            fileUrl: material.fileUrl,
            fileName: material.fileName,
            attemptedPath: filePath
          });
          return;
        }
        
        const stats = fs.statSync(filePath);
        const fileSize = stats.size;
        const ext = path.extname(material.fileName || filePath).toLowerCase();
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
        const fileName = material.fileName || path.basename(filePath);
        const encodedFileName = encodeURIComponent(fileName);
        const asciiFileName = fileName.replace(/[^\x00-\x7F]/g, '');
        
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${asciiFileName}"; filename*=UTF-8''${encodedFileName}`);
        res.setHeader('Content-Transfer-Encoding', 'binary');
        res.setHeader('Content-Length', fileSize);
        
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
        return;
      } catch (error) {
        console.error('Erro ao servir ficheiro local:', error);
        console.error('Caminho tentado:', material.fileUrl);
        if (error.message.includes('não encontrado') || error.code === 'ENOENT') {
          res.status(404).json({
            message: 'Ficheiro não encontrado no servidor',
            fileUrl: material.fileUrl,
            fileName: material.fileName
          });
          return;
        }
        const backendUrl = process.env.BACKEND_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000');
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

// Adicionar comentário a um material
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

    updateMaterialAuthorReputation(req.params.id).catch(err => {
      console.error('Erro ao atualizar reputação:', err);
    });

    await material.populate('comments.user', 'name avatar');
    const addedComment = material.comments[material.comments.length - 1];

    emitNewComment(req.params.id, addedComment);
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

// Dar like ou remover like de um comentário
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

    const likeIndex = comment.likes.findIndex(
      likeId => likeId.toString() === userIdStr
    );

    const dislikeIndex = comment.dislikes.findIndex(
      dislikeId => dislikeId.toString() === userIdStr
    );
    if (dislikeIndex !== -1) {
      comment.dislikes.splice(dislikeIndex, 1);
    }

    if (likeIndex !== -1) {
      comment.likes.splice(likeIndex, 1);
    } else {
      comment.likes.push(userId);
    }

    await material.save();
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

// Dar dislike ou remover dislike de um comentário
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

    const dislikeIndex = comment.dislikes.findIndex(
      dislikeId => dislikeId.toString() === userIdStr
    );

    const likeIndex = comment.likes.findIndex(
      likeId => likeId.toString() === userIdStr
    );
    if (likeIndex !== -1) {
      comment.likes.splice(likeIndex, 1);
    }

    if (dislikeIndex !== -1) {
      comment.dislikes.splice(dislikeIndex, 1);
    } else {
      comment.dislikes.push(userId);
    }

    await material.save();
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

// Reportar um comentário
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

    const existingReport = comment.reports.find(
      report => report.user.toString() === userIdStr
    );

    if (existingReport) {
      return res.status(400).json({
        message: 'Já reportaste este comentário'
      });
    }

    comment.reports.push({
      user: userId,
      reason: req.body.reason.trim()
    });

    await material.save();
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

// Avaliar um material (1-5 estrelas)
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

    const existingRatingIndex = material.userRatings.findIndex(
      ur => {
        const urUserId = ur.user?.toString ? ur.user.toString() : (ur.user?._id ? ur.user._id.toString() : ur.user);
        return urUserId === userId;
      }
    );

    if (existingRatingIndex !== -1) {
      material.userRatings[existingRatingIndex].rating = ratingValue;
      material.userRatings[existingRatingIndex].createdAt = new Date();
    } else {
      material.userRatings.push({
        user: userId,
        rating: ratingValue
      });
    }

    const breakdown = { one: 0, two: 0, three: 0, four: 0, five: 0 };
    material.userRatings.forEach(ur => {
      const key = ['one', 'two', 'three', 'four', 'five'][ur.rating - 1];
      breakdown[key]++;
    });
    material.rating.breakdown = breakdown;

    const totalRatings = material.userRatings.length;
    const sumRatings = material.userRatings.reduce((sum, ur) => sum + ur.rating, 0);
    material.rating.average = totalRatings > 0 ? sumRatings / totalRatings : 0;
    material.rating.count = totalRatings;

    await material.save();

    updateMaterialAuthorReputation(req.params.id).catch(err => {
      console.error('Erro ao atualizar reputação:', err);
    });

    emitRatingUpdate(req.params.id, {
      average: material.rating.average,
      count: material.rating.count,
      breakdown: material.rating.breakdown
    });

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

// Obter avaliação do utilizador atual para este material
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

// Reportar um material
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

    const existingReport = material.reports.find(
      r => r.user.toString() === req.user._id.toString()
    );

    if (existingReport) {
      return res.status(400).json({
        message: 'Já reportaste este material anteriormente'
      });
    }

    material.reports.push({
      user: req.user._id,
      reason: req.body.reason
    });

    await material.save();
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

