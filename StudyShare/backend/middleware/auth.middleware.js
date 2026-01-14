import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';

// Middleware para validar JWT token
export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Token não fornecido. Faça login para aceder a este recurso.'
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'studyshare_secret_key_change_in_production');
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({
        message: 'Token inválido. Utilizador não encontrado.'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        message: 'Conta desativada. Contacte o administrador.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        message: 'Token inválido.'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: 'Token expirado. Faça login novamente.'
      });
    }
    
    console.error('Erro no authMiddleware:', error);
    res.status(500).json({
      message: 'Erro ao verificar autenticação.'
    });
  }
};

// Middleware opcional - verifica se o utilizador está autenticado
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'studyshare_secret_key_change_in_production');
      const user = await User.findById(decoded.userId).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    next();
  }
};

// Middleware para verificar se o utilizador é Administrador
export const adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      message: 'Autenticação necessária.'
    });
  }

  if (req.user.role !== 'Administrador') {
    return res.status(403).json({
      message: 'Acesso negado. Apenas administradores podem realizar esta ação.'
    });
  }

  next();
};

