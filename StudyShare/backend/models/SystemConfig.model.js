import mongoose from 'mongoose';

const systemConfigSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    enum: ['availableYears', 'materialTypes']
  },
  values: [{
    value: {
      type: mongoose.Schema.Types.Mixed, // Pode ser Number (anos) ou String (tipos)
      required: true
    },
    label: {
      type: String,
      required: true
    },
    order: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Nota: O índice único para 'key' já é criado automaticamente pelo 'unique: true' no campo
// Não é necessário criar um índice adicional

const SystemConfig = mongoose.model('SystemConfig', systemConfigSchema);

export default SystemConfig;

