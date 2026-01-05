import Notification from '../models/Notification.model.js';
import User from '../models/User.model.js';
import Material from '../models/Material.model.js';

// Importar io de forma dinâmica para evitar circular dependency
let io = null;
export function setIO(ioInstance) {
  io = ioInstance;
}

/**
 * Emitir evento de novo comentário em tempo real
 */
export function emitNewComment(materialId, comment) {
  if (io) {
    io.to(`material_${materialId}`).emit('new_comment', comment);
  }
}

/**
 * Enviar notificação e emitir via Socket.IO
 */
export async function sendNotification(notificationData) {
  try {
    const notification = new Notification(notificationData);
    await notification.save();

    // Popular dados para enviar via Socket.IO
    await notification.populate('material', 'title');
    await notification.populate('fromUser', 'name avatar');

    // Emitir notificação em tempo real via Socket.IO
    if (io) {
      io.to(`user_${notification.user}`).emit('new_notification', notification);
    }

    return notification;
  } catch (error) {
    console.error('Erro ao enviar notificação:', error);
    return null;
  }
}

/**
 * Notificar sobre novo comentário
 * Notifica: dono do material + users que têm o material nos favoritos
 */
export async function notifyNewComment(materialId, commentAuthorId, commentText) {
  try {
    const material = await Material.findById(materialId).populate('author');
    if (!material) return;

    // Encontrar todos os users que têm este material nos favoritos
    const usersWithFavorite = await User.find({
      favorites: materialId
    }).select('_id');

    // Lista de users para notificar (dono + favoritos)
    const usersToNotify = new Set();
    
    // Adicionar dono do material (se não for o próprio autor do comentário)
    if (material.author._id.toString() !== commentAuthorId.toString()) {
      usersToNotify.add(material.author._id.toString());
    }

    // Adicionar users com favorito (exceto o autor do comentário)
    usersWithFavorite.forEach(user => {
      if (user._id.toString() !== commentAuthorId.toString()) {
        usersToNotify.add(user._id.toString());
      }
    });

    // Obter nome do autor do comentário
    const commentAuthor = await User.findById(commentAuthorId).select('name');
    const authorName = commentAuthor?.name || 'Alguém';

    // Criar notificações para cada user
    const notifications = [];
    for (const userId of usersToNotify) {
      const notification = await sendNotification({
        user: userId,
        type: 'comment',
        material: materialId,
        fromUser: commentAuthorId,
        message: `${authorName} comentou no material "${material.title}"`,
        metadata: {
          commentText: commentText.substring(0, 100) // Primeiros 100 caracteres
        }
      });
      if (notification) notifications.push(notification);
    }

    return notifications;
  } catch (error) {
    console.error('Erro ao notificar sobre comentário:', error);
    return [];
  }
}

/**
 * Notificar sobre nova avaliação
 * Notifica: dono do material
 */
export async function notifyNewRating(materialId, ratingAuthorId, rating) {
  try {
    const material = await Material.findById(materialId).populate('author');
    if (!material) return;

    // Não notificar se o autor da avaliação for o dono do material
    if (material.author._id.toString() === ratingAuthorId.toString()) {
      return null;
    }

    // Obter nome do autor da avaliação
    const ratingAuthor = await User.findById(ratingAuthorId).select('name');
    const authorName = ratingAuthor?.name || 'Alguém';

    // Criar notificação para o dono
    const notification = await sendNotification({
      user: material.author._id,
      type: 'rating',
      material: materialId,
      fromUser: ratingAuthorId,
      message: `${authorName} avaliou o teu material "${material.title}" com ${rating} estrelas`,
      metadata: {
        rating: rating
      }
    });

    return notification;
  } catch (error) {
    console.error('Erro ao notificar sobre avaliação:', error);
    return null;
  }
}

