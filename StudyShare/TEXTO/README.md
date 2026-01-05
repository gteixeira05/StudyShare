# StudyShare - Plataforma de Partilha de Materiais Académicos

Plataforma colaborativa para partilha de apontamentos, resumos e materiais didáticos entre estudantes.

## 🚀 Stack Tecnológica

- **Backend**: Node.js, Express, Socket.IO
- **Database**: MongoDB (Mongoose)
- **Frontend**: React (Vite) + Tailwind CSS
- **Autenticação**: JWT (JSON Web Tokens) + Bcrypt

## 📋 Pré-requisitos

- Node.js (v18 ou superior)
- MongoDB (local ou Atlas)
- npm ou yarn

## 🛠️ Instalação

1. **Instalar dependências** (backend e frontend):
   ```bash
   npm run install-all
   ```

2. **Configurar variáveis de ambiente**:
   - Criar ficheiro `.env` na raiz do projeto
   - Copiar conteúdo de `.env.example` e ajustar valores:
     ```env
     PORT=5000
     NODE_ENV=development
     MONGODB_URI=mongodb://localhost:27017/studyshare
     JWT_SECRET=your_secret_key_here
     JWT_EXPIRE=7d
     CLIENT_URL=http://localhost:5173
     ```

3. **Iniciar MongoDB** (se local):
   ```bash
   mongod
   ```

## 🏃 Executar o Projeto

### Desenvolvimento (Backend + Frontend simultaneamente):
```bash
npm run dev
```

### Apenas Backend:
```bash
npm run server
```

### Apenas Frontend:
```bash
npm run client
```

O servidor backend estará disponível em: `http://localhost:5000`
O frontend estará disponível em: `http://localhost:5173`

## 📁 Estrutura do Projeto

```
studyshare/
├── backend/
│   ├── models/          # Schemas Mongoose
│   │   ├── User.model.js
│   │   └── Material.model.js
│   ├── routes/          # Rotas da API
│   │   ├── auth.routes.js
│   │   ├── material.routes.js
│   │   └── user.routes.js
│   ├── middleware/      # Middlewares
│   │   └── auth.middleware.js
│   └── server.js        # Servidor principal
├── frontend/
│   ├── src/
│   │   ├── components/  # Componentes React
│   │   ├── contexts/    # Context API
│   │   ├── pages/       # Páginas
│   │   ├── services/    # Serviços (API calls)
│   │   └── App.jsx
│   └── ...
└── package.json
```

## 🔐 Autenticação

O sistema utiliza JWT para autenticação:

- **Registo**: `POST /api/auth/register`
- **Login**: `POST /api/auth/login`
- **Perfil**: `GET /api/auth/me` (protegido)

Tokens devem ser enviados no header:
```
Authorization: Bearer <token>
```

## 👥 Perfis de Utilizador

- **Estudante**: Perfil padrão, pode partilhar e descarregar materiais
- **Administrador**: Permissões adicionais para moderar conteúdos

## 📚 Funcionalidades Principais

- ✅ Autenticação com JWT
- ✅ Upload e gestão de materiais
- ✅ Pesquisa e filtros (Ano, Curso, Disciplina, Tipo)
- ✅ Sistema de avaliações e comentários
- ✅ Perfis de utilizador
- ✅ Design moderno com Tailwind CSS

## 🔒 Segurança

- Passwords encriptadas com Bcrypt
- Tokens JWT com expiração
- Middleware de autenticação em rotas protegidas
- Validação de dados com express-validator

## 📝 Notas

- Upload de ficheiros ainda não implementado (usar multer)
- Socket.IO configurado mas não utilizado ainda
- Pronto para extensão com funcionalidades avançadas

## 👨‍💻 Desenvolvido por

Gonçalo Teixeira – 31396 | Diogo Monteiro – 32428
Engenharia Informática – Turma D

