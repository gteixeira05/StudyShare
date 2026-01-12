import express from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import User from '../models/User.model.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { uploadBufferToCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'studyshare_secret_key_change_in_production';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

// Configurar multer para upload de avatares em memória (para Cloudinary)
const avatarStorage = multer.memoryStorage();

const avatarUpload = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /\.(jpg|jpeg|png|gif|webp)$/i;
    if (allowedTypes.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de ficheiro não permitido. Apenas imagens (JPG, JPEG, PNG, GIF, WEBP) são aceites.'));
    }
  }
});

// Gerar JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRE
  });
};

/**
 * @route   POST /api/auth/register
 * @desc    Registo de novo utilizador
 * @access  Public
 */
router.post('/register', [
  body('name')
    .trim()
    .notEmpty().withMessage('Nome é obrigatório')
    .isLength({ max: 100 }).withMessage('Nome não pode exceder 100 caracteres'),
  body('email')
    .isEmail().withMessage('Email inválido')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 }).withMessage('Password deve ter pelo menos 6 caracteres'),
  body('role')
    .optional()
    .isIn(['Estudante', 'Administrador']).withMessage('Role inválida'),
  body('course')
    .optional()
    .trim(),
  body('year')
    .optional()
    .isInt({ min: 1, max: 5 }).withMessage('Ano deve estar entre 1 e 5')
], async (req, res) => {
  try {
    // Verificar erros de validação
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Dados inválidos',
        errors: errors.array()
      });
    }

    const { name, email, password, role, course, year } = req.body;

    // Verificar se o email já existe
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        message: 'Email já registado. Utilize outro email ou faça login.'
      });
    }

    // Criar novo utilizador (apenas Estudante por padrão, Administrador só por seed/manual)
    const userData = {
      name,
      email,
      password,
      role: role || 'Estudante',
      ...(course && { course }),
      ...(year && { year })
    };

    const user = new User(userData);
    await user.save();

    // Gerar token
    const token = generateToken(user._id);

    // Retornar dados do utilizador (sem password)
    res.status(201).json({
      message: 'Registo realizado com sucesso',
      token,
      user: user.toPublicJSON()
    });
  } catch (error) {
    console.error('Erro no registo:', error);
    res.status(500).json({
      message: 'Erro ao criar conta',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login de utilizador
 * @access  Public
 */
router.post('/login', [
  body('email')
    .isEmail().withMessage('Email inválido')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password é obrigatória')
], async (req, res) => {
  try {
    // Verificar erros de validação
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Dados inválidos',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Buscar utilizador com password
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        message: 'Email ou password incorretos'
      });
    }

    // Verificar se a conta está ativa
    if (!user.isActive) {
      return res.status(403).json({
        message: 'Conta desativada. Contacte o administrador.'
      });
    }

    // Verificar password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: 'Email ou password incorretos'
      });
    }

    // Gerar token
    const token = generateToken(user._id);

    // Retornar dados do utilizador (sem password)
    res.json({
      message: 'Login realizado com sucesso',
      token,
      user: user.toPublicJSON()
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({
      message: 'Erro ao fazer login',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Obter dados do utilizador autenticado
 * @access  Private
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    res.json({
      user: req.user.toPublicJSON()
    });
  } catch (error) {
    console.error('Erro ao obter perfil:', error);
    res.status(500).json({
      message: 'Erro ao obter perfil'
    });
  }
});

/**
 * @route   PUT /api/auth/me
 * @desc    Atualizar perfil do utilizador autenticado
 * @access  Private
 */
router.put('/me', [
  authMiddleware,
  body('name')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Nome não pode exceder 100 caracteres'),
  body('course')
    .optional()
    .trim(),
  body('year')
    .optional()
    .isInt({ min: 1, max: 5 }).withMessage('Ano deve estar entre 1 e 5')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Dados inválidos',
        errors: errors.array()
      });
    }

    const { name, course, year } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (course !== undefined) updateData.course = course;
    if (year !== undefined) updateData.year = year;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      message: 'Perfil atualizado com sucesso',
      user: user.toPublicJSON()
    });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({
      message: 'Erro ao atualizar perfil'
    });
  }
});

/**
 * @route   POST /api/auth/me/avatar
 * @desc    Upload de avatar do utilizador
 * @access  Private
 */
router.post('/me/avatar', authMiddleware, avatarUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: 'Nenhum ficheiro enviado'
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        message: 'Utilizador não encontrado'
      });
    }

    // Remover avatar antigo do Cloudinary se existir
    if (user.avatar && user.avatar.includes('cloudinary.com')) {
      try {
        await deleteFromCloudinary(user.avatar, 'image');
      } catch (error) {
        console.error('Erro ao remover avatar antigo do Cloudinary:', error);
      }
    } else if (user.avatar && !user.avatar.startsWith('http')) {
      // Fallback: remover avatar local se ainda existir (migração)
      const oldAvatarPath = path.join(__dirname, '..', user.avatar);
      if (fs.existsSync(oldAvatarPath)) {
        try {
          fs.unlinkSync(oldAvatarPath);
        } catch (error) {
          console.error('Erro ao remover avatar local antigo:', error);
        }
      }
    }

    // Upload para Cloudinary
    const cloudinaryResult = await uploadBufferToCloudinary(req.file.buffer, {
      folder: 'avatars',
      resource_type: 'image',
      public_id: `avatar-${req.user._id}-${Date.now()}`
    });

    // Atualizar avatar no utilizador
    user.avatar = cloudinaryResult.url;
    await user.save();

    res.json({
      message: 'Avatar atualizado com sucesso',
      user: user.toPublicJSON()
    });
  } catch (error) {
    console.error('Erro ao fazer upload do avatar:', error);
    res.status(500).json({
      message: 'Erro ao fazer upload do avatar'
    });
  }
});

/**
 * @route   PUT /api/auth/me/password
 * @desc    Alterar password do utilizador
 * @access  Private
 */
router.put('/me/password', [
  authMiddleware,
  body('currentPassword')
    .notEmpty().withMessage('Password atual é obrigatória'),
  body('newPassword')
    .isLength({ min: 6 }).withMessage('Nova password deve ter pelo menos 6 caracteres')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Dados inválidos',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Buscar utilizador com password
    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({
        message: 'Utilizador não encontrado'
      });
    }

    // Verificar password atual
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({
        message: 'Password atual incorreta'
      });
    }

    // Atualizar password
    user.password = newPassword;
    await user.save();

    res.json({
      message: 'Password alterada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao alterar password:', error);
    res.status(500).json({
      message: 'Erro ao alterar password'
    });
  }
});

export default router;

