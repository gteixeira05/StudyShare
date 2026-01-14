import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar variáveis de ambiente
const envPath = path.join(path.dirname(path.dirname(__dirname)), '.env');
dotenv.config({ path: envPath });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Upload de ficheiro para Cloudinary
export const uploadToCloudinary = async (file, options = {}) => {
  try {
    const {
      folder = 'uploads',
      resource_type = 'auto',
      public_id = null,
      ...otherOptions
    } = options;

    const uploadOptions = {
      folder,
      resource_type,
      ...otherOptions
    };

    if (public_id) {
      uploadOptions.public_id = public_id;
    }

    const result = await cloudinary.uploader.upload(file, uploadOptions);

    return {
      url: result.secure_url,
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

// Upload de ficheiro a partir de buffer
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

// Eliminar ficheiro do Cloudinary
export const deleteFromCloudinary = async (publicId, resourceType = 'auto') => {
  try {
    let actualPublicId = publicId;
    if (publicId.startsWith('http')) {
      const urlParts = publicId.split('/');
      const uploadIndex = urlParts.findIndex(part => part === 'upload');
      if (uploadIndex !== -1 && urlParts.length > uploadIndex + 2) {
        actualPublicId = urlParts.slice(uploadIndex + 2).join('/');
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

// Obter URL de um ficheiro
export const getCloudinaryUrl = (publicId, options = {}) => {
  return cloudinary.url(publicId, options);
};

export default cloudinary;

