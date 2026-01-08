import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Nome é obrigatório'],
    trim: true,
    maxlength: [100, 'Nome não pode exceder 100 caracteres']
  },
  email: {
    type: String,
    required: [true, 'Email é obrigatório'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'Por favor, forneça um email válido'
    ]
  },
  password: {
    type: String,
    required: [true, 'Password é obrigatória'],
    minlength: [6, 'Password deve ter pelo menos 6 caracteres'],
    select: false // Não retornar password por padrão
  },
  role: {
    type: String,
    enum: ['Estudante', 'Administrador'],
    default: 'Estudante',
    required: true
  },
  course: {
    type: String,
    trim: true
  },
  year: {
    type: Number,
    min: 1,
    max: 5
  },
  reputation: {
    type: Number,
    default: 0,
    min: 0,
    max: 5 // Reputação é uma média de 0 a 5 estrelas
  },
  materialsUploaded: {
    type: Number,
    default: 0,
    min: 0
  },
  materialsDownloaded: {
    type: Number,
    default: 0
  },
  avatar: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  favorites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Material'
  }],
  notificationPreferences: {
    rating: {
      type: Boolean,
      default: true // Notificações quando alguém avalia um material teu
    },
    commentOnMyMaterial: {
      type: Boolean,
      default: true // Notificações quando comentam num material teu
    },
    commentOnFavorite: {
      type: Boolean,
      default: true // Notificações quando comentam num material dos teus favoritos
    },
    report: {
      type: Boolean,
      default: true // Notificações de reports (apenas para administradores)
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Hash password antes de salvar
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Método para comparar password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Método para obter perfil público (sem dados sensíveis)
userSchema.methods.toPublicJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

// Índices
// email já tem índice único definido no schema (unique: true)
userSchema.index({ role: 1 });

const User = mongoose.model('User', userSchema);

export default User;

