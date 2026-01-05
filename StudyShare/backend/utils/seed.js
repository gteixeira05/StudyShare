import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.model.js';

dotenv.config();

/**
 * Script para criar utilizador administrador inicial
 * Executar: node backend/utils/seed.js
 */
const createAdmin = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/studyshare';
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado ao MongoDB');

    // Verificar se já existe admin
    const existingAdmin = await User.findOne({ email: 'admin@studyshare.pt' });
    
    if (existingAdmin) {
      console.log('⚠️  Administrador já existe');
      process.exit(0);
    }

    // Criar administrador
    const admin = new User({
      name: 'Administrador',
      email: 'admin@studyshare.pt',
      password: 'admin123', // Mudar após primeiro login
      role: 'Administrador'
    });

    await admin.save();
    console.log('✅ Administrador criado com sucesso!');
    console.log('📧 Email: admin@studyshare.pt');
    console.log('🔑 Password: admin123');
    console.log('⚠️  IMPORTANTE: Altera a password após o primeiro login!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao criar administrador:', error);
    process.exit(1);
  }
};

createAdmin();

