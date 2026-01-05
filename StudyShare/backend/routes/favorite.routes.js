import express from 'express';
import User from '../models/User.model.js';
import Material from '../models/Material.model.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * @route   POST /api/favorites/:materialId
 * @desc    Adicionar material aos favoritos
 * @access  Private
 */
router.post('/:materialId', authMiddleware, async (req, res) => {
  try {
    const material = await Material.findById(req.params.materialId);

    if (!material || !material.isActive) {
      return res.status(404).json({
        message: 'Material não encontrado'
      });
    }

    const user = await User.findById(req.user._id);

    if (user.favorites.includes(material._id)) {
      return res.status(400).json({
        message: 'Material já está nos favoritos'
      });
    }

    user.favorites.push(material._id);
    await user.save();

    res.json({
      message: 'Material adicionado aos favoritos',
      favorites: user.favorites
    });
  } catch (error) {
    console.error('Erro ao adicionar aos favoritos:', error);
    res.status(500).json({
      message: 'Erro ao adicionar aos favoritos'
    });
  }
});

/**
 * @route   DELETE /api/favorites/:materialId
 * @desc    Remover material dos favoritos
 * @access  Private
 */
router.delete('/:materialId', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user.favorites.includes(req.params.materialId)) {
      return res.status(400).json({
        message: 'Material não está nos favoritos'
      });
    }

    user.favorites = user.favorites.filter(
      fav => fav.toString() !== req.params.materialId
    );
    await user.save();

    res.json({
      message: 'Material removido dos favoritos',
      favorites: user.favorites
    });
  } catch (error) {
    console.error('Erro ao remover dos favoritos:', error);
    res.status(500).json({
      message: 'Erro ao remover dos favoritos'
    });
  }
});

/**
 * @route   GET /api/favorites
 * @desc    Obter materiais favoritos do utilizador
 * @access  Private
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'favorites',
        match: { isActive: true },
        populate: {
          path: 'author',
          select: 'name email avatar reputation'
        }
      });

    res.json({
      favorites: user.favorites || []
    });
  } catch (error) {
    console.error('Erro ao buscar favoritos:', error);
    res.status(500).json({
      message: 'Erro ao buscar favoritos'
    });
  }
});

/**
 * @route   GET /api/favorites/check/:materialId
 * @desc    Verificar se material está nos favoritos
 * @access  Private
 */
router.get('/check/:materialId', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const isFavorite = user.favorites.some(
      fav => fav.toString() === req.params.materialId
    );

    res.json({
      isFavorite
    });
  } catch (error) {
    console.error('Erro ao verificar favorito:', error);
    res.status(500).json({
      message: 'Erro ao verificar favorito'
    });
  }
});

export default router;

