import express from 'express';
import { body, validationResult } from 'express-validator';
import Material from '../models/Material.model.js';
import User from '../models/User.model.js';
import { authMiddleware, adminOnly } from '../middleware/auth.middleware.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

/**
 * @route   GET /api/admin/users
 * @desc    Listar todos os utilizadores (apenas admin)
 * @access  Private (Admin only)
 */
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

/**
 * @route   PUT /api/admin/users/:id/role
 * @desc    Promover/remover admin de um utilizador (apenas admin)
 * @access  Private (Admin only)
 */
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

/**
 * @route   GET /api/admin/reports
 * @desc    Listar todos os reports (apenas admin)
 * @access  Private (Admin only)
 */
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

/**
 * @route   POST /api/admin/reports/:reportId/resolve
 * @desc    Resolver um report (remover material ou ignorar)
 * @access  Private (Admin only)
 */
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
        // Remover ficheiro físico se existir
        if (material.fileUrl && !material.fileUrl.startsWith('http')) {
          const filePath = path.join(__dirname, '..', material.fileUrl);
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
            } catch (fileError) {
              console.error('Erro ao remover ficheiro:', fileError);
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

/**
 * @route   GET /api/admin/stats
 * @desc    Obter estatísticas gerais (apenas admin)
 * @access  Private (Admin only)
 */
router.get('/stats', authMiddleware, adminOnly, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalAdmins = await User.countDocuments({ role: 'Administrador' });
    const totalMaterials = await Material.countDocuments({ 
      isActive: true, 
      isApproved: true 
    });
    const totalReports = await Material.aggregate([
      { $project: { reportCount: { $size: '$reports' } } },
      { $group: { _id: null, total: { $sum: '$reportCount' } } }
    ]);

    res.json({
      stats: {
        totalUsers,
        totalAdmins,
        totalStudents: totalUsers - totalAdmins,
        totalMaterials,
        totalReports: totalReports[0]?.total || 0,
        pendingReports: await Material.countDocuments({ 
          'reports.0': { $exists: true },
          isActive: true 
        })
      }
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    res.status(500).json({
      message: 'Erro ao obter estatísticas'
    });
  }
});

export default router;

