# Guia de Integração - Cloudinary

## 📋 Pré-requisitos

1. Conta Cloudinary (gratuita, sem cartão de crédito)
2. Projeto criado no Cloudinary Console

## 🚀 Passo 1: Criar Conta no Cloudinary

1. Aceder a https://cloudinary.com/
2. Clicar em "Sign Up For Free" ou "Começar Grátis"
3. Preencher o formulário (nome, email, password)
4. Confirmar email (se necessário)
5. Fazer login na Dashboard

## 🔑 Passo 2: Obter Credenciais

1. No Dashboard do Cloudinary, vai ver automaticamente as credenciais:
   - **Cloud Name** (ex: `dxyz123abc`)
   - **API Key** (ex: `123456789012345`)
   - **API Secret** (ex: `abcdefghijklmnopqrstuvwxyz`)

2. **IMPORTANTE**: Guardar estas credenciais em local seguro
3. Estas credenciais são necessárias para autenticar uploads no backend

**Nota**: Para ver as credenciais depois, ir a: Dashboard > Account Details

## 📦 Passo 3: Instalar Dependências

No diretório do backend:

```bash
npm install cloudinary
```

## 🔧 Passo 4: Configurar Variáveis de Ambiente

Adicionar ao ficheiro `.env` (na raiz do projeto):

```env
# Cloudinary
CLOUDINARY_CLOUD_NAME=seu-cloud-name
CLOUDINARY_API_KEY=sua-api-key
CLOUDINARY_API_SECRET=sua-api-secret
```

**⚠️ IMPORTANTE**: Adicionar ao `.gitignore`:
```
.env
```

## 📝 Passo 5: Implementação no Backend

### 5.1. Criar módulo Cloudinary

Criar ficheiro: `backend/utils/cloudinary.js`

```javascript
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar .env da raiz do projeto
dotenv.config({ path: path.join(path.dirname(__dirname), '..', '.env') });

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
 * Eliminar ficheiro do Cloudinary
 * @param {string} publicId - ID público do ficheiro
 * @param {string} resourceType - Tipo: 'image', 'raw', 'video', 'auto'
 * @returns {Promise<Object>} Resultado da eliminação
 */
export const deleteFromCloudinary = async (publicId, resourceType = 'auto') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
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
```

### 5.2. Modificar Rotas de Upload

Ver `CLOUDINARY_IMPLEMENTATION.md` para código detalhado das rotas.

## 🌐 Passo 6: Deploy no Render/Vercel

### Render (Backend):

1. Adicionar variáveis de ambiente no painel do Render:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`

2. **NÃO** fazer commit das credenciais no código

### Vercel (Frontend):

- Nenhuma configuração especial necessária (Cloudinary acessado via backend)

## 💰 Limites do Plano Gratuito (Free)

- **Armazenamento**: 25 GB
- **Bandwidth**: 25 GB/mês
- **Transformações**: 25.000/mês
- **Uploads**: Ilimitados
- **Sem cartão de crédito necessário**

## 📊 Monitorização

No Cloudinary Dashboard > Media Library, pode ver:
- Todos os ficheiros uploadados
- Espaço utilizado
- Estatísticas de uso

No Dashboard > Usage, pode ver:
- Bandwidth utilizado
- Transformações utilizadas
- Espaço de armazenamento

## ⚠️ Considerações Importantes

1. **Segurança das Credenciais**:
   - **NUNCA** fazer commit de `CLOUDINARY_API_SECRET` no Git
   - Usar sempre variáveis de ambiente
   - No backend, nunca expor API Secret ao frontend

2. **Tipos de Ficheiros Suportados**:
   - ✅ Imagens: JPG, PNG, GIF, WEBP, etc.
   - ✅ Documentos: PDF, DOC, DOCX, PPT, PPTX, etc.
   - ✅ Vídeos: MP4, MOV, etc.
   - ❌ Executáveis bloqueados: EXE, BAT, SH, etc. (por segurança)

3. **Resource Type**:
   - `auto`: Cloudinary detecta automaticamente
   - `image`: Para imagens (permite transformações)
   - `raw`: Para documentos PDF, DOCX, PPTX (sem transformações)
   - `video`: Para vídeos

4. **URLs**:
   - Cloudinary retorna URLs HTTPS por padrão
   - URLs são públicas (qualquer pessoa com o link pode acessar)
   - Para privar ficheiros, usar Signed URLs (configuração avançada)

5. **Organização**:
   - Usar `folder` para organizar ficheiros (ex: `materials/`, `avatars/`)
   - Exemplo: `materials/file.pdf`, `avatars/user123.jpg`

6. **Transformações de Imagem** (Bónus):
   - Cloudinary permite transformações automáticas de imagens
   - Útil para gerar thumbnails, redimensionar, etc.
   - Exemplo: `https://res.cloudinary.com/cloud/image/upload/w_200,h_200/avatar.jpg`

## 🔒 Boas Práticas

1. **Validar ficheiros antes de upload** (tamanho, tipo, etc.)
2. **Usar folders** para organizar ficheiros
3. **Guardar `public_id` no MongoDB** para facilitar eliminação
4. **Limpar ficheiros** quando eliminar materiais
5. **Monitorizar uso** no Dashboard para não ultrapassar limites gratuitos

