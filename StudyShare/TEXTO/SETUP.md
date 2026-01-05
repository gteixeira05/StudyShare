# Guia de Configuração - StudyShare

## 📦 Passo 1: Instalar Dependências

```bash
npm run install-all
```

Este comando instala as dependências tanto do backend quanto do frontend.

## 🔧 Passo 2: Configurar Variáveis de Ambiente

1. Criar ficheiro `.env` na raiz do projeto:
   ```bash
   cp env.example .env
   ```

2. Editar `.env` e ajustar os valores:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/studyshare
   JWT_SECRET=your_very_secret_key_here_change_in_production
   JWT_EXPIRE=7d
   CLIENT_URL=http://localhost:5173
   ```

## 🗄️ Passo 3: Iniciar MongoDB

**Opção A - MongoDB Local:**
```bash
mongod
```

**Opção B - MongoDB Atlas:**
- Criar conta em https://www.mongodb.com/cloud/atlas
- Obter connection string
- Atualizar `MONGODB_URI` no `.env`

## 🚀 Passo 4: Criar Administrador (Opcional)

```bash
npm run seed:admin
```

Isto cria um administrador padrão:
- Email: `admin@studyshare.pt`
- Password: `admin123`

⚠️ **IMPORTANTE**: Mudar a password após o primeiro login!

## ▶️ Passo 5: Iniciar Aplicação

```bash
npm run dev
```

Isto inicia tanto o backend (porta 5000) quanto o frontend (porta 5173).

### Ou iniciar separadamente:

**Backend apenas:**
```bash
npm run server
```

**Frontend apenas:**
```bash
npm run client
```

## 🌐 Acessar Aplicação

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000/api
- Health Check: http://localhost:5000/api/health

## 🔐 Primeiros Passos

1. Aceder a http://localhost:5173
2. Criar uma conta (ou usar admin@studyshare.pt se criou o seed)
3. Fazer login
4. Começar a partilhar materiais!

## ⚠️ Troubleshooting

### Erro de conexão MongoDB
- Verificar se MongoDB está a correr
- Verificar `MONGODB_URI` no `.env`

### Erro de porta já em uso
- Mudar `PORT` no `.env`
- Ou terminar processo que está a usar a porta

### Erro de módulos não encontrados
- Executar `npm run install-all` novamente
- Verificar Node.js versão (v18+)

