import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar .env (garantir que está carregado antes de configurar)
// O .env está na raiz do projeto (um nível acima de backend/)
const envPath = path.join(path.dirname(path.dirname(__dirname)), '.env');
dotenv.config({ path: envPath });

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true // Usar HTTPS
});

/**
 * Upload de ficheiro para Cloudinary
 * @param {Buffer|string} file - Ficheiro (buffer ou caminho)
 * @param {Object} options - Opções de upload
 * @param {string} options.folder - Pasta no Cloudinary (ex: 'materials', 'avatars')
 * @param {string} options.resource_type - Tipo de recurso: 'auto', 'image', 'raw' (para PDFs, DOCX, etc)
 * @param {string} options.public_id - ID público (nome do ficheiro sem extensão)
 * @returns {Promise<Object>} Resultado do upload com URL, public_id, etc
 */
export const uploadToCloudinary = async (file, options = {}) => {
  try {
    const {
      folder = 'uploads',
      resource_type = 'auto', // 'auto' detecta automaticamente (imagem, vídeo, raw)
      public_id = null,
      ...otherOptions
    } = options;

    const uploadOptions = {
      folder,
      resource_type,
      ...otherOptions
    };

    // Se public_id for fornecido, usar
    if (public_id) {
      uploadOptions.public_id = public_id;
    }

    // Upload
    const result = await cloudinary.uploader.upload(file, uploadOptions);

    return {
      url: result.secure_url, // URL HTTPS
      public_id: result.public_id,
      format: result.format,
      resource_type: result.resource_type,
      bytes: result.bytes,
      created_at: result.created_at
    };
  } catch (error) {
    console.error('Erro ao fazer upload para Cloudinary:', error);
    throw error;
  }
};

/**
 * Upload de ficheiro a partir de buffer (para multer)
 * @param {Buffer} buffer - Buffer do ficheiro
 * @param {Object} options - Opções de upload
 * @returns {Promise<Object>} Resultado do upload
 */
export const uploadBufferToCloudinary = async (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: options.folder || 'uploads',
      resource_type: options.resource_type || 'auto',
      ...options
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve({
            url: result.secure_url,
            public_id: result.public_id,
            format: result.format,
            resource_type: result.resource_type,
            bytes: result.bytes,
            created_at: result.created_at
          });
        }
      }
    );

    uploadStream.end(buffer);
  });
};

/**
 * Eliminar ficheiro do Cloudinary
 * @param {string} publicId - ID público do ficheiro (ou URL completa)
 * @param {string} resourceType - Tipo: 'image', 'raw', 'video', 'auto'
 * @returns {Promise<Object>} Resultado da eliminação
 */
export const deleteFromCloudinary = async (publicId, resourceType = 'auto') => {
  try {
    // Se for URL, extrair public_id
    let actualPublicId = publicId;
    if (publicId.startsWith('http')) {
      // Extrair public_id da URL do Cloudinary
      // Exemplo: https://res.cloudinary.com/dbp4blq5m/image/upload/v1234567890/materials/file.pdf
      // Extrair: materials/file
      const urlParts = publicId.split('/');
      const uploadIndex = urlParts.findIndex(part => part === 'upload');
      if (uploadIndex !== -1 && urlParts.length > uploadIndex + 2) {
        // Pegar tudo depois de 'upload/v.../'
        actualPublicId = urlParts.slice(uploadIndex + 2).join('/');
        // Remover extensão se houver
        actualPublicId = actualPublicId.replace(/\.[^/.]+$/, '');
      } else {
        throw new Error('URL do Cloudinary inválida');
      }
    }

    const result = await cloudinary.uploader.destroy(actualPublicId, {
      resource_type: resourceType
    });
    return result;
  } catch (error) {
    console.error('Erro ao eliminar do Cloudinary:', error);
    throw error;
  }
};

/**
 * Obter URL de um ficheiro (útil para gerar URLs assinadas ou transformadas)
 * @param {string} publicId - ID público do ficheiro
 * @param {Object} options - Opções (transformações, etc)
 * @returns {string} URL do ficheiro
 */
export const getCloudinaryUrl = (publicId, options = {}) => {
  return cloudinary.url(publicId, options);
};

export default cloudinary;

