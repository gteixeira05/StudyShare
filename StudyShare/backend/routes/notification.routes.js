import express from 'express';
import Notification from '../models/Notification.model.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * @route   GET /api/notifications
 * @desc    Obter notificações do utilizador autenticado
 * @access  Private
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { limit = 50, unreadOnly = false } = req.query;
    
    const filter = { user: req.user._id };
    if (unreadOnly === 'true') {
      filter.isRead = false;
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('material', 'title')
      .populate('fromUser', 'name avatar');

    const unreadCount = await Notification.countDocuments({
      user: req.user._id,
      isRead: false
    });

    res.json({
      notifications,
      unreadCount
    });
  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    res.status(500).json({
      message: 'Erro ao buscar notificações'
    });
  }
});

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Marcar notificação como lida
 * @access  Private
 */
router.put('/:id/read', authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!notification) {
      return res.status(404).json({
        message: 'Notificação não encontrada'
      });
    }

    notification.isRead = true;
    await notification.save();

    res.json({
      message: 'Notificação marcada como lida',
      notification
    });
  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error);
    res.status(500).json({
      message: 'Erro ao atualizar notificação'
    });
  }
});

/**
 * @route   PUT /api/notifications/read-all
 * @desc    Marcar todas as notificações como lidas
 * @access  Private
 */
router.put('/read-all', authMiddleware, async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { isRead: true }
    );

    res.json({
      message: 'Todas as notificações foram marcadas como lidas'
    });
  } catch (error) {
    console.error('Erro ao marcar todas as notificações como lidas:', error);
    res.status(500).json({
      message: 'Erro ao atualizar notificações'
    });
  }
});

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Eliminar notificação
 * @access  Private
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!notification) {
      return res.status(404).json({
        message: 'Notificação não encontrada'
      });
    }

    res.json({
      message: 'Notificação eliminada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao eliminar notificação:', error);
    res.status(500).json({
      message: 'Erro ao eliminar notificação'
    });
  }
});

export default router;

