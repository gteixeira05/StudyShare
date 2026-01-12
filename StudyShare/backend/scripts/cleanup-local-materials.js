import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Material from '../models/Material.model.js';
import User from '../models/User.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config({ path: path.join(path.dirname(__dirname), '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/studyshare';

async function cleanupLocalMaterials() {
  try {
    console.log('🔄 A conectar ao MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado ao MongoDB');

    // Encontrar todos os materiais com URLs locais (que não começam com http)
    console.log('🔍 A procurar materiais com URLs locais...');
    const localMaterials = await Material.find({
      fileUrl: { $not: /^https?:\/\// },
      isActive: true
    }).populate('author', '_id');

    if (localMaterials.length === 0) {
      console.log('✅ Não existem materiais com URLs locais para eliminar');
      await mongoose.connection.close();
      process.exit(0);
    }

    console.log(`📦 Encontrados ${localMaterials.length} materiais com URLs locais`);
    
    // Mostrar alguns exemplos
    console.log('\n📋 Exemplos de materiais que serão eliminados:');
    localMaterials.slice(0, 5).forEach((m, i) => {
      console.log(`  ${i + 1}. ${m.title} - ${m.fileUrl}`);
    });
    if (localMaterials.length > 5) {
      console.log(`  ... e mais ${localMaterials.length - 5} materiais`);
    }

    const materialIds = localMaterials.map(m => m._id);
    const authorIds = [...new Set(localMaterials.map(m => m.author._id.toString()))];

    // Eliminar todos os materiais
    console.log('\n🗑️  A eliminar materiais...');
    const deleteResult = await Material.deleteMany({
      _id: { $in: materialIds }
    });

    console.log(`✅ ${deleteResult.deletedCount} materiais eliminados`);

    // Atualizar contadores de materiais dos autores
    console.log('\n🔄 A atualizar contadores dos utilizadores...');
    for (const authorId of authorIds) {
      const actualCount = await Material.countDocuments({
        author: authorId,
        isActive: true
      });
      
      await User.findByIdAndUpdate(authorId, {
        materialsUploaded: actualCount
      });
    }

    console.log(`✅ Contadores atualizados para ${authorIds.length} utilizadores`);

    console.log('\n✅ Limpeza concluída com sucesso!');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

cleanupLocalMaterials();

