import express from 'express';
import { body, validationResult } from 'express-validator';
import Material from '../models/Material.model.js';
import User from '../models/User.model.js';
import SystemConfig from '../models/SystemConfig.model.js';
import { authMiddleware, adminOnly } from '../middleware/auth.middleware.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { deleteFromCloudinary } from '../utils/cloudinary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Listar todos os utilizadores (apenas admin)
router.get('/users', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Erro ao listar utilizadores:', error);
    res.status(500).json({
      message: 'Erro ao listar utilizadores'
    });
  }
});

// Promover/remover admin de um utilizador
router.put('/users/:id/role', authMiddleware, adminOnly, [
  body('role')
    .isIn(['Estudante', 'Administrador'])
    .withMessage('Role inválida. Deve ser "Estudante" ou "Administrador"')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Dados inválidos',
        errors: errors.array()
      });
    }

    const { role } = req.body;
    const userId = req.params.id;

    // Não permitir que o admin remova o seu próprio acesso
    if (userId === req.user._id.toString() && role === 'Estudante') {
      return res.status(400).json({
        message: 'Não podes remover o teu próprio acesso de administrador'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: 'Utilizador não encontrado'
      });
    }

    user.role = role;
    await user.save();

    res.json({
      message: `Utilizador ${role === 'Administrador' ? 'promovido a' : 'removido de'} administrador com sucesso`,
      user: user.toPublicJSON()
    });
  } catch (error) {
    console.error('Erro ao atualizar role:', error);
    res.status(500).json({
      message: 'Erro ao atualizar role do utilizador'
    });
  }
});

// Listar todos os reports (apenas admin)
router.get('/reports', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'pending' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Buscar materiais com reports
    const materialQuery = { 'reports.0': { $exists: true } };
    if (status === 'resolved') {
      materialQuery.isActive = false;
    } else {
      materialQuery.isActive = true;
    }

    const materials = await Material.find(materialQuery)
      .populate('author', 'name email')
      .populate('reports.user', 'name email');

    // Formatar reports de materiais
    const reports = [];
    materials.forEach(material => {
      material.reports.forEach(report => {
        reports.push({
          _id: report._id,
          type: 'material',
          material: {
            _id: material._id,
            title: material.title,
            author: material.author
          },
          reportedBy: report.user,
          reason: report.reason,
          createdAt: report.createdAt,
          status: material.isActive ? 'pending' : 'resolved'
        });
      });
    });

    // Buscar reports de comentários
    const commentMaterialsQuery = { 'comments.reports.0': { $exists: true } };
    if (status === 'resolved') {
      commentMaterialsQuery.isActive = false;
    } else {
      commentMaterialsQuery.isActive = true;
    }

    const materialsWithCommentReports = await Material.find(commentMaterialsQuery)
      .populate('author', 'name email');

    // Formatar reports de comentários
    for (const material of materialsWithCommentReports) {
      // Popular users dos comentários e reports
      await material.populate({
        path: 'comments.user',
        select: 'name email'
      });
      
      for (const comment of material.comments) {
        if (comment.reports && comment.reports.length > 0) {
          // Popular users dos reports
          const reportUserIds = comment.reports.map(r => r.user);
          const reportUsers = await User.find({ _id: { $in: reportUserIds } }).select('name email');
          const usersMap = new Map(reportUsers.map(u => [u._id.toString(), u]));
          
          comment.reports.forEach(report => {
            reports.push({
              _id: report._id,
              type: 'comment',
              material: {
                _id: material._id,
                title: material.title,
                author: material.author
              },
              comment: {
                _id: comment._id,
                text: comment.text.substring(0, 100), // Primeiros 100 caracteres
                author: comment.user
              },
              reportedBy: usersMap.get(report.user.toString()) || report.user,
              reason: report.reason,
              createdAt: report.createdAt,
              status: material.isActive ? 'pending' : 'resolved'
            });
          });
        }
      }
    }

    // Ordenar por data mais recente
    reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = reports.length;

    res.json({
      reports: reports.slice(skip, skip + parseInt(limit)),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Erro ao listar reports:', error);
    res.status(500).json({
      message: 'Erro ao listar reports'
    });
  }
});

// Resolver report
router.post('/reports/:reportId/resolve', authMiddleware, adminOnly, [
  body('action')
    .isIn(['delete', 'ignore'])
    .withMessage('Ação inválida. Deve ser "delete" ou "ignore"')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Dados inválidos',
        errors: errors.array()
      });
    }

    const { action } = req.body;
    const reportId = req.params.reportId;

    // Tentar encontrar material com este report (report de material)
    let material = await Material.findOne({ 'reports._id': reportId })
      .populate('author');

    if (material) {
      // É um report de material
      if (action === 'delete') {
        // Remover ficheiro do Cloudinary se for URL do Cloudinary
        if (material.fileUrl && material.fileUrl.includes('cloudinary.com')) {
          try {
            await deleteFromCloudinary(material.fileUrl, 'auto');
            console.log('Ficheiro removido do Cloudinary:', material.fileUrl);
          } catch (fileError) {
            console.error('Erro ao remover ficheiro do Cloudinary:', fileError);
          }
        } else if (material.fileUrl && !material.fileUrl.startsWith('http')) {
          // Fallback: remover ficheiro local se ainda existir (migração)
          const filePath = path.join(__dirname, '..', material.fileUrl);
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
            } catch (fileError) {
              console.error('Erro ao remover ficheiro local:', fileError);
            }
          }
        }

        // Eliminar material da base de dados
        await Material.findByIdAndDelete(material._id);

        // Decrementar contador de materiais do autor
        await User.findByIdAndUpdate(
          material.author._id,
          { $inc: { materialsUploaded: -1 } }
        );

        res.json({
          message: 'Material eliminado com sucesso'
        });
      } else {
        // Ignorar report - remover apenas este report específico
        material.reports = material.reports.filter(
          r => r._id.toString() !== reportId
        );
        await material.save();

        res.json({
          message: 'Report ignorado com sucesso'
        });
      }
    } else {
      // Tentar encontrar como report de comentário
      material = await Material.findOne({ 'comments.reports._id': reportId })
        .populate('author');

      if (!material) {
        return res.status(404).json({
          message: 'Report não encontrado'
        });
      }

      // É um report de comentário
      const comment = material.comments.find(c => 
        c.reports.some(r => r._id.toString() === reportId)
      );

      if (!comment) {
        return res.status(404).json({
          message: 'Comentário não encontrado'
        });
      }

      if (action === 'delete') {
        // Remover comentário
        material.comments = material.comments.filter(
          c => c._id.toString() !== comment._id.toString()
        );
        await material.save();

        res.json({
          message: 'Comentário eliminado com sucesso'
        });
      } else {
        // Ignorar report - remover apenas este report específico do comentário
        comment.reports = comment.reports.filter(
          r => r._id.toString() !== reportId
        );
        await material.save();

        res.json({
          message: 'Report ignorado com sucesso'
        });
      }
    }
  } catch (error) {
    console.error('Erro ao resolver report:', error);
    res.status(500).json({
      message: 'Erro ao resolver report'
    });
  }
});

// Obter estatísticas do sistema
router.get('/stats', authMiddleware, adminOnly, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalAdmins = await User.countDocuments({ role: 'Administrador' });
    const totalMaterials = await Material.countDocuments({ 
      isActive: true, 
      isApproved: true 
    });
    
    // Contar reports de materiais
    const materialReports = await Material.aggregate([
      { $project: { reportCount: { $size: '$reports' } } },
      { $group: { _id: null, total: { $sum: '$reportCount' } } }
    ]);
    const materialReportsCount = materialReports[0]?.total || 0;
    
    // Contar reports de comentários
    const commentReports = await Material.aggregate([
      { $unwind: '$comments' },
      { $project: { commentReportCount: { $size: { $ifNull: ['$comments.reports', []] } } } },
      { $group: { _id: null, total: { $sum: '$commentReportCount' } } }
    ]);
    const commentReportsCount = commentReports[0]?.total || 0;
    
    // Total de reports (materiais + comentários)
    const totalReports = materialReportsCount + commentReportsCount;
    
    // Contar reports pendentes de materiais (apenas em materiais ativos)
    const pendingMaterialReports = await Material.aggregate([
      { $match: { isActive: true, 'reports.0': { $exists: true } } },
      { $project: { reportCount: { $size: '$reports' } } },
      { $group: { _id: null, total: { $sum: '$reportCount' } } }
    ]);
    const pendingMaterialReportsCount = pendingMaterialReports[0]?.total || 0;
    
    // Contar reports pendentes de comentários (apenas em materiais ativos)
    const pendingCommentReports = await Material.aggregate([
      { $match: { isActive: true, 'comments.reports.0': { $exists: true } } },
      { $unwind: '$comments' },
      { $match: { 'comments.reports.0': { $exists: true } } },
      { $project: { commentReportCount: { $size: { $ifNull: ['$comments.reports', []] } } } },
      { $group: { _id: null, total: { $sum: '$commentReportCount' } } }
    ]);
    const pendingCommentReportsCount = pendingCommentReports[0]?.total || 0;
    
    // Total de reports pendentes (materiais + comentários)
    const pendingReports = pendingMaterialReportsCount + pendingCommentReportsCount;

    res.json({
      stats: {
        totalUsers,
        totalAdmins,
        totalStudents: totalUsers - totalAdmins,
        totalMaterials,
        totalReports,
        pendingReports: pendingReports
      }
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    res.status(500).json({
      message: 'Erro ao obter estatísticas'
    });
  }
});

// Obter configuração do sistema
router.get('/config/:key', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { key } = req.params;
    
    if (!['availableYears', 'materialTypes'].includes(key)) {
      return res.status(400).json({
        message: 'Chave de configuração inválida'
      });
    }

    let config = await SystemConfig.findOne({ key });
    
    // Se não existir, criar com valores padrão
    if (!config) {
      if (key === 'availableYears') {
        config = new SystemConfig({
          key: 'availableYears',
          values: [
            { value: 1, label: '1º Ano', order: 1, isActive: true },
            { value: 2, label: '2º Ano', order: 2, isActive: true },
            { value: 3, label: '3º Ano', order: 3, isActive: true },
            { value: 4, label: '4º Ano', order: 4, isActive: true },
            { value: 5, label: '5º Ano', order: 5, isActive: true }
          ],
          updatedBy: req.user._id
        });
      } else if (key === 'materialTypes') {
        config = new SystemConfig({
          key: 'materialTypes',
          values: [
            { value: 'Apontamento', label: 'Apontamento', order: 1, isActive: true },
            { value: 'Resumo', label: 'Resumo', order: 2, isActive: true },
            { value: 'Exercícios', label: 'Exercícios', order: 3, isActive: true },
            { value: 'Exame', label: 'Exame', order: 4, isActive: true },
            { value: 'Slides', label: 'Slides', order: 5, isActive: true }
          ],
          updatedBy: req.user._id
        });
      }
      await config.save();
    }

    // Filtrar apenas valores ativos e ordenar
    const activeValues = config.values
      .filter(v => v.isActive)
      .sort((a, b) => a.order - b.order);

    res.json({
      key: config.key,
      values: activeValues,
      allValues: config.values.sort((a, b) => a.order - b.order)
    });
  } catch (error) {
    console.error('Erro ao obter configuração:', error);
    res.status(500).json({
      message: 'Erro ao buscar configuração'
    });
  }
});

// Adicionar valor a configuração
router.post('/config/:key/values', [
  authMiddleware,
  adminOnly,
  body('value').notEmpty().withMessage('Valor é obrigatório'),
  body('label').trim().notEmpty().withMessage('Label é obrigatório')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Dados inválidos',
        errors: errors.array()
      });
    }

    const { key } = req.params;
    const { value, label, order } = req.body;

    if (!['availableYears', 'materialTypes'].includes(key)) {
      return res.status(400).json({
        message: 'Chave de configuração inválida'
      });
    }

    let config = await SystemConfig.findOne({ key });
    
    // Criar se não existir
    if (!config) {
      config = new SystemConfig({
        key,
        values: [],
        updatedBy: req.user._id
      });
    }

    // Verificar se já existe
    const exists = config.values.some(
      v => (key === 'availableYears' ? v.value === parseInt(value) : v.value === value)
    );

    if (exists) {
      return res.status(400).json({
        message: 'Este valor já existe'
      });
    }

    // Adicionar novo valor
    const newOrder = order || (config.values.length > 0 
      ? Math.max(...config.values.map(v => v.order)) + 1 
      : 1);

    config.values.push({
      value: key === 'availableYears' ? parseInt(value) : value,
      label: label.trim(),
      order: newOrder,
      isActive: true
    });

    config.updatedBy = req.user._id;
    await config.save();

    res.json({
      message: 'Valor adicionado com sucesso',
      config: {
        key: config.key,
        values: config.values.sort((a, b) => a.order - b.order)
      }
    });
  } catch (error) {
    console.error('Erro ao adicionar valor:', error);
    res.status(500).json({
      message: 'Erro ao adicionar valor'
    });
  }
});

// Atualizar valor de configuração
router.put('/config/:key/values/:valueId', [
  authMiddleware,
  adminOnly,
  body('label').optional().trim().notEmpty().withMessage('Label não pode estar vazio'),
  body('order').optional().isInt({ min: 0 }),
  body('isActive').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Dados inválidos',
        errors: errors.array()
      });
    }

    const { key, valueId } = req.params;
    const { label, order, isActive } = req.body;

    if (!['availableYears', 'materialTypes'].includes(key)) {
      return res.status(400).json({
        message: 'Chave de configuração inválida'
      });
    }

    const config = await SystemConfig.findOne({ key });
    if (!config) {
      return res.status(404).json({
        message: 'Configuração não encontrada'
      });
    }

    const valueIndex = config.values.findIndex(v => v._id.toString() === valueId);
    if (valueIndex === -1) {
      return res.status(404).json({
        message: 'Valor não encontrado'
      });
    }

    // Atualizar campos
    if (label !== undefined) config.values[valueIndex].label = label.trim();
    if (order !== undefined) config.values[valueIndex].order = order;
    if (isActive !== undefined) config.values[valueIndex].isActive = isActive;

    config.updatedBy = req.user._id;
    await config.save();

    res.json({
      message: 'Valor atualizado com sucesso',
      config: {
        key: config.key,
        values: config.values.sort((a, b) => a.order - b.order)
      }
    });
  } catch (error) {
    console.error('Erro ao atualizar valor:', error);
    res.status(500).json({
      message: 'Erro ao atualizar valor'
    });
  }
});

// Desativar valor de configuração
router.delete('/config/:key/values/:valueId', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { key, valueId } = req.params;

    if (!['availableYears', 'materialTypes'].includes(key)) {
      return res.status(400).json({
        message: 'Chave de configuração inválida'
      });
    }

    const config = await SystemConfig.findOne({ key });
    if (!config) {
      return res.status(404).json({
        message: 'Configuração não encontrada'
      });
    }

    const valueIndex = config.values.findIndex(v => v._id.toString() === valueId);
    if (valueIndex === -1) {
      return res.status(404).json({
        message: 'Valor não encontrado'
      });
    }

    // Desativar em vez de remover (para manter histórico)
    config.values[valueIndex].isActive = false;
    config.updatedBy = req.user._id;
    await config.save();

    res.json({
      message: 'Valor desativado com sucesso',
      config: {
        key: config.key,
        values: config.values.sort((a, b) => a.order - b.order)
      }
    });
  } catch (error) {
    console.error('Erro ao remover valor:', error);
    res.status(500).json({
      message: 'Erro ao remover valor'
    });
  }
});

// Eliminar permanentemente valor de configuração
router.delete('/config/:key/values/:valueId/permanent', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { key, valueId } = req.params;

    if (!['availableYears', 'materialTypes'].includes(key)) {
      return res.status(400).json({
        message: 'Chave de configuração inválida'
      });
    }

    const config = await SystemConfig.findOne({ key });
    if (!config) {
      return res.status(404).json({
        message: 'Configuração não encontrada'
      });
    }

    const valueObj = config.values.find(v => v._id.toString() === valueId);
    if (!valueObj) {
      return res.status(404).json({
        message: 'Valor não encontrado'
      });
    }

    // Verificar se existem materiais usando este valor
    let materialsUsingValue = 0;
    if (key === 'availableYears') {
      materialsUsingValue = await Material.countDocuments({
        year: valueObj.value,
        isActive: true
      });
    } else if (key === 'materialTypes') {
      materialsUsingValue = await Material.countDocuments({
        materialType: valueObj.value,
        isActive: true
      });
    }

    if (materialsUsingValue > 0) {
      return res.status(400).json({
        message: `Não é possível eliminar este valor. Existem ${materialsUsingValue} material(is) a usar este ${key === 'availableYears' ? 'ano' : 'tipo'}.`,
        materialsCount: materialsUsingValue
      });
    }

    // Remover permanentemente
    config.values = config.values.filter(v => v._id.toString() !== valueId);
    config.updatedBy = req.user._id;
    await config.save();

    res.json({
      message: 'Valor eliminado permanentemente com sucesso',
      config: {
        key: config.key,
        values: config.values.sort((a, b) => a.order - b.order)
      }
    });
  } catch (error) {
    console.error('Erro ao eliminar valor permanentemente:', error);
    res.status(500).json({
      message: 'Erro ao eliminar valor'
    });
  }
});

// Limpar ficheiros locais antigos
router.delete('/materials/cleanup-local-files', authMiddleware, adminOnly, async (req, res) => {
  try {
    // Encontrar todos os materiais com URLs locais (que não começam com http)
    const localMaterials = await Material.find({
      fileUrl: { $not: /^https?:\/\// },
      isActive: true
    }).populate('author', '_id');

    if (localMaterials.length === 0) {
      return res.json({
        message: 'Não existem materiais com URLs locais para eliminar',
        deletedCount: 0
      });
    }

    const materialIds = localMaterials.map(m => m._id);
    const authorIds = [...new Set(localMaterials.map(m => m.author._id.toString()))];

    // Eliminar todos os materiais
    const deleteResult = await Material.deleteMany({
      _id: { $in: materialIds }
    });

    // Atualizar contadores de materiais dos autores
    for (const authorId of authorIds) {
      const actualCount = await Material.countDocuments({
        author: authorId,
        isActive: true
      });
      
      await User.findByIdAndUpdate(authorId, {
        materialsUploaded: actualCount
      });
    }

    res.json({
      message: `${deleteResult.deletedCount} material(is) com URLs locais eliminado(s) com sucesso`,
      deletedCount: deleteResult.deletedCount,
      materialsDeleted: materialIds.length
    });
  } catch (error) {
    console.error('Erro ao eliminar materiais locais:', error);
    res.status(500).json({
      message: 'Erro ao eliminar materiais locais'
    });
  }
});

export default router;

