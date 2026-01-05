import express from 'express';
import User from '../models/User.model.js';
import Material from '../models/Material.model.js';
import { authMiddleware, adminOnly } from '../middleware/auth.middleware.js';
import { recalculateUserReputation } from '../utils/reputation.js';

const router = express.Router();

/**
 * @route   GET /api/users/me/materials
 * @desc    Obter materiais do utilizador autenticado (apenas ativos)
 * @access  Private
 */
router.get('/me/materials', authMiddleware, async (req, res) => {
  try {
    const materials = await Material.find({
      author: req.user._id,
      isActive: true // Apenas materiais ativos
    })
      .sort({ createdAt: -1 })
      .populate('author', 'name email avatar reputation');

    res.json({ materials });
  } catch (error) {
    console.error('Erro ao obter meus materiais:', error);
    res.status(500).json({
      message: 'Erro ao buscar materiais'
    });
  }
});

/**
 * @route   GET /api/users/:id
 * @desc    Obter perfil público de um utilizador
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user || !user.isActive) {
      return res.status(404).json({
        message: 'Utilizador não encontrado'
      });
    }

    // Contar materiais do utilizador
    const materialsCount = await Material.countDocuments({
      author: user._id,
      isActive: true,
      isApproved: true
    });

    res.json({
      user: user.toPublicJSON(),
      stats: {
        materialsUploaded: materialsCount,
        reputation: user.reputation
      }
    });
  } catch (error) {
    console.error('Erro ao obter perfil:', error);
    res.status(500).json({
      message: 'Erro ao buscar perfil'
    });
  }
});

/**
 * @route   GET /api/users/:id/materials
 * @desc    Obter materiais de um utilizador
 * @access  Public
 */
router.get('/:id/materials', async (req, res) => {
  try {
    const materials = await Material.find({
      author: req.params.id,
      isActive: true,
      isApproved: true
    })
      .sort({ createdAt: -1 })
      .populate('author', 'name email avatar reputation')
      .limit(50);

    res.json({ materials });
  } catch (error) {
    console.error('Erro ao obter materiais do utilizador:', error);
    res.status(500).json({
      message: 'Erro ao buscar materiais'
    });
  }
});

/**
 * @route   GET /api/users
 * @desc    Listar utilizadores (apenas admin)
 * @access  Private (Admin only)
 */
router.get('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const users = await User.find({ isActive: true })
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ users });
  } catch (error) {
    console.error('Erro ao listar utilizadores:', error);
    res.status(500).json({
      message: 'Erro ao buscar utilizadores'
    });
  }
});

/**
 * @route   GET /api/users/me/materials/count
 * @desc    Recalcular contador de materiais partilhados do utilizador autenticado
 * @access  Private
 */
router.get('/me/materials/count', authMiddleware, async (req, res) => {
  try {
    const actualCount = await Material.countDocuments({
      author: req.user._id,
      isActive: true
    });

    // Atualizar contador no utilizador
    await User.findByIdAndUpdate(req.user._id, {
      materialsUploaded: actualCount
    });

    res.json({
      materialsUploaded: actualCount,
      message: 'Contador atualizado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao recalcular contador:', error);
    res.status(500).json({
      message: 'Erro ao recalcular contador'
    });
  }
});

/**
 * @route   POST /api/users/me/reputation/recalculate
 * @desc    Recalcular reputação do utilizador autenticado
 * @access  Private
 */
router.post('/me/reputation/recalculate', authMiddleware, async (req, res) => {
  try {
    const reputation = await recalculateUserReputation(req.user._id);
    res.json({
      reputation,
      message: 'Reputação recalculada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao recalcular reputação:', error);
    res.status(500).json({
      message: 'Erro ao recalcular reputação'
    });
  }
});

export default router;

