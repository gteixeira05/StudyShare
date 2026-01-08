import mongoose from 'mongoose';

const materialSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Título é obrigatório'],
    trim: true,
    maxlength: [200, 'Título não pode exceder 200 caracteres']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Descrição não pode exceder 2000 caracteres']
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  discipline: {
    type: String,
    required: [true, 'Disciplina é obrigatória'],
    trim: true
  },
  course: {
    type: String,
    trim: true
  },
  year: {
    type: Number,
    required: [true, 'Ano é obrigatório'],
    min: 1
    // Removido max: 5 para permitir anos dinâmicos
  },
  materialType: {
    type: String,
    required: [true, 'Tipo de material é obrigatório']
    // Removido enum para permitir tipos dinâmicos (validação é feita nas rotas)
  },
  fileUrl: {
    type: String,
    required: [true, 'URL do ficheiro é obrigatória']
  },
  fileName: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number, // em bytes
    required: true
  },
  fileType: {
    type: String,
    required: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    },
    breakdown: {
      five: { type: Number, default: 0 },
      four: { type: Number, default: 0 },
      three: { type: Number, default: 0 },
      two: { type: Number, default: 0 },
      one: { type: Number, default: 0 }
    }
  },
  userRatings: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  downloads: {
    type: Number,
    default: 0
  },
  views: {
    type: Number,
    default: 0
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: true,
      maxlength: [1000, 'Comentário não pode exceder 1000 caracteres']
    },
    likes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    dislikes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    reports: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      reason: {
        type: String,
        required: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  reports: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    reason: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  isApproved: {
    type: Boolean,
    default: true // Administradores podem modificar
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para pesquisa
materialSchema.index({ title: 'text', description: 'text', tags: 'text' });
materialSchema.index({ discipline: 1, year: 1, materialType: 1 });
materialSchema.index({ author: 1 });
materialSchema.index({ 'rating.average': -1 });
materialSchema.index({ createdAt: -1 });

// Virtual para popular author
materialSchema.virtual('authorDetails', {
  ref: 'User',
  localField: 'author',
  foreignField: '_id',
  justOne: true
});

const Material = mongoose.model('Material', materialSchema);

export default Material;

