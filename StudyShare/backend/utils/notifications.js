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
 * Emitir evento de atualização de avaliação em tempo real
 */
export function emitRatingUpdate(materialId, ratingData) {
  if (io) {
    io.to(`material_${materialId}`).emit('rating_updated', ratingData);
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
    }).select('_id notificationPreferences');

    // Obter nome do autor do comentário
    const commentAuthor = await User.findById(commentAuthorId).select('name');
    const authorName = commentAuthor?.name || 'Alguém';

    // Criar notificações para cada user
    const notifications = [];
    
    // Notificar dono do material (se tiver preferência ativa)
    if (material.author._id.toString() !== commentAuthorId.toString()) {
      const materialOwner = await User.findById(material.author._id).select('notificationPreferences');
      const ownerPrefs = materialOwner?.notificationPreferences || {};
      
      if (ownerPrefs.commentOnMyMaterial !== false) { // Default true se não existir
        const notification = await sendNotification({
          user: material.author._id,
          type: 'comment',
          material: materialId,
          fromUser: commentAuthorId,
          message: `${authorName} comentou no material "${material.title}"`,
          metadata: {
            commentText: commentText.substring(0, 100)
          }
        });
        if (notification) notifications.push(notification);
      }
    }

    // Notificar users com favorito (se tiverem preferência ativa)
    for (const user of usersWithFavorite) {
      if (user._id.toString() === commentAuthorId.toString()) continue;
      if (user._id.toString() === material.author._id.toString()) continue; // Já foi notificado acima
      
      const userPrefs = user.notificationPreferences || {};
      if (userPrefs.commentOnFavorite !== false) { // Default true se não existir
        const notification = await sendNotification({
          user: user._id,
          type: 'comment',
          material: materialId,
          fromUser: commentAuthorId,
          message: `${authorName} comentou no material "${material.title}"`,
          metadata: {
            commentText: commentText.substring(0, 100)
          }
        });
        if (notification) notifications.push(notification);
      }
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

    // Verificar preferências de notificação do dono do material
    const materialOwner = await User.findById(material.author._id).select('notificationPreferences');
    const ownerPrefs = materialOwner?.notificationPreferences || {};
    
    // Se a preferência estiver desativada, não enviar notificação
    if (ownerPrefs.rating === false) {
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

/**
 * Notificar todos os administradores sobre novo report
 * Notifica: todos os administradores (que tenham preferência ativa)
 */
export async function notifyAdminsNewReport(materialId, reportType, reportedBy, reason) {
  try {
    const material = await Material.findById(materialId).select('title');
    if (!material) return;

    // Encontrar todos os administradores com suas preferências
    const admins = await User.find({ role: 'Administrador' }).select('_id notificationPreferences');
    
    if (admins.length === 0) return [];

    // Obter nome de quem reportou
    const reporter = await User.findById(reportedBy).select('name');
    const reporterName = reporter?.name || 'Alguém';

    // Criar mensagem baseada no tipo de report
    let message = '';
    const materialTitle = material.title || 'Material';
    if (reportType === 'material') {
      message = `${reporterName} reportou o material "${materialTitle}"`;
    } else if (reportType === 'comment') {
      message = `${reporterName} reportou um comentário no material "${materialTitle}"`;
    }

    // Criar notificações apenas para administradores com preferência ativa
    const notifications = [];
    for (const admin of admins) {
      const adminPrefs = admin.notificationPreferences || {};
      // Se a preferência estiver desativada, não enviar notificação
      if (adminPrefs.report === false) {
        continue;
      }

      const notification = await sendNotification({
        user: admin._id,
        type: 'report',
        material: materialId,
        fromUser: reportedBy,
        message: message,
        metadata: {
          reportType: reportType,
          reason: reason.substring(0, 200) // Primeiros 200 caracteres
        }
      });
      if (notification) notifications.push(notification);
    }

    return notifications;
  } catch (error) {
    console.error('Erro ao notificar administradores sobre report:', error);
    return [];
  }
}

