# StudyShare

Plataforma de partilha de materiais académicos desenvolvida para estudantes universitários.

## 📋 Descrição

StudyShare é uma aplicação web que permite aos estudantes partilharem e acederem a materiais académicos (apontamentos, resumos, exercícios, exames, slides). A plataforma inclui sistema de avaliações, comentários, favoritos, notificações em tempo real e sistema de reputação.

## 🛠️ Stack Tecnológica

### Frontend
- **React 18** - Biblioteca JavaScript para interfaces
- **Vite** - Build tool e dev server
- **React Router DOM** - Roteamento
- **Axios** - Cliente HTTP
- **Socket.IO Client** - Comunicação em tempo real
- **Tailwind CSS** - Framework CSS
- **React Icons** - Ícones

### Backend
- **Node.js** - Runtime JavaScript
- **Express** - Framework web
- **MongoDB** - Base de dados NoSQL
- **Mongoose** - ODM para MongoDB
- **Socket.IO** - WebSockets para tempo real
- **JWT** - Autenticação
- **Multer** - Upload de ficheiros
- **Cloudinary** - Armazenamento de ficheiros
- **Bcrypt** - Hash de passwords
- **Express Validator** - Validação de dados

### Serviços
- **MongoDB Atlas** - Base de dados em cloud
- **Cloudinary** - Armazenamento de ficheiros
- **Render** - Deploy do backend
- **Vercel** - Deploy do frontend

## ✨ Funcionalidades

- 🔐 Autenticação (registo, login, JWT)
- 📤 Upload de materiais (PDF, DOC, DOCX, PPT, PPTX, imagens)
- 🔍 Pesquisa e filtros (disciplina, curso, ano, tipo)
- ⭐ Sistema de avaliações (1-5 estrelas)
- 💬 Comentários com likes/dislikes
- ❤️ Favoritos
- 🔔 Notificações em tempo real
- 👤 Perfis de utilizador com reputação
- 🛡️ Painel administrativo
- 📊 Sistema de reputação baseado em avaliações

## 🚀 Como Correr Localmente

### Pré-requisitos
- Node.js 18+
- MongoDB (local ou Atlas)
- Conta Cloudinary (opcional para produção)

### Instalação

1. Clonar o repositório
```bash
git clone <repository-url>
cd StudyShare/StudyShare
```

2. Instalar dependências
```bash
npm run install-all
```

3. Configurar variáveis de ambiente
```bash
cp env.example .env
```

Editar `.env` com as suas configurações:
```
MONGODB_URI=mongodb://localhost:27017/studyshare
JWT_SECRET=seu_secret_key_aqui
CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_API_KEY=sua_api_key
CLOUDINARY_API_SECRET=seu_api_secret
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

4. Criar utilizador administrador (opcional)
```bash
npm run seed:admin
```

5. Iniciar servidor
```bash
npm run dev
```

O frontend estará disponível em `http://localhost:5173` e o backend em `http://localhost:5000`.

## 📦 Deploy

### Backend (Render)
- Conectar repositório GitHub
- Configurar variáveis de ambiente
- Build command: `cd backend && npm install`
- Start command: `cd backend && npm start`

### Frontend (Vercel)
- Conectar repositório GitHub
- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`
- Configurar variável `VITE_API_URL` com URL do backend

## 🌐 Produção

**Site em produção:** [Adicionar URL quando disponível]

## 📁 Estrutura do Projeto

```
StudyShare/
├── backend/
│   ├── middleware/     # Middlewares (auth, etc)
│   ├── models/         # Modelos MongoDB
│   ├── routes/         # Rotas da API
│   ├── scripts/        # Scripts utilitários
│   ├── utils/          # Funções auxiliares
│   └── server.js       # Servidor principal
├── frontend/
│   ├── src/
│   │   ├── components/ # Componentes React
│   │   ├── contexts/   # Contextos (Auth, Socket, Toast)
│   │   ├── pages/      # Páginas da aplicação
│   │   └── services/   # Serviços (API)
│   └── ...
└── env.example         # Exemplo de variáveis de ambiente
```

## 📝 Licença

ISC

