# ✅ Checklist de Preparação para Deploy

## 📋 Alterações Realizadas

### ✅ Backend (Render)

#### 1. Variáveis de Ambiente
- [x] `PORT` - Usa `process.env.PORT` (Render define automaticamente)
- [x] `NODE_ENV` - Configurado para `production` no Render
- [x] `MONGODB_URI` - Configurado no Render
- [x] `JWT_SECRET` - Configurado no Render
- [x] `CLIENT_URL` - URL do frontend (Vercel)
- [x] `BACKEND_URL` - URL do backend (Render)
- [x] `CLOUDINARY_*` - Todas as credenciais configuradas

#### 2. Configurações do Servidor
- [x] Porta: `process.env.PORT || 5000` (fallback para dev)
- [x] Host: `0.0.0.0` (aceita conexões de qualquer IP)
- [x] CORS: Configurado para aceitar URLs de produção
- [x] Socket.IO: CORS configurado para produção

#### 3. Scripts
- [x] `npm start` adicionado ao `package.json` (para Render)
- [x] `main` apontando para `backend/server.js`

#### 4. Código
- [x] Nenhuma URL hardcoded
- [x] Todas as configurações usam variáveis de ambiente
- [x] Cloudinary configurado corretamente

---

### ✅ Frontend (Vercel)

#### 1. Variáveis de Ambiente (Vite)
- [x] `VITE_API_URL` - URL do backend API
- [x] `VITE_BACKEND_URL` - URL do backend (para downloads/avatars)

#### 2. Configurações
- [x] `api.js` - Usa `VITE_API_URL` ou `/api` (fallback)
- [x] `SocketContext.jsx` - Usa `VITE_API_URL`
- [x] `Avatar.jsx` - Usa `VITE_BACKEND_URL`
- [x] `MaterialDetailsPage.jsx` - Usa `VITE_BACKEND_URL`

#### 3. Build
- [x] Script `build` no `package.json`
- [x] Vite configurado corretamente
- [x] Proxy apenas em desenvolvimento (não usado em produção)

---

## 🔍 Verificações Finais

### Backend

```bash
# Verificar que o servidor inicia
npm start

# Verificar health check
curl http://localhost:5000/api/health
```

### Frontend

```bash
# Verificar build
cd frontend
npm run build

# Verificar preview
npm run preview
```

---

## 📝 Variáveis de Ambiente Necessárias

### Backend (.env ou Render Environment Variables)

```env
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=...
JWT_EXPIRE=7d
CLIENT_URL=https://seu-app.vercel.app
BACKEND_URL=https://seu-backend.onrender.com
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

### Frontend (Vercel Environment Variables)

```env
VITE_API_URL=https://seu-backend.onrender.com
VITE_BACKEND_URL=https://seu-backend.onrender.com
```

---

## 🚀 Comandos de Deploy

### Render (Backend)
- Build Command: `npm install`
- Start Command: `npm start`
- Root Directory: (vazio - raiz do repo)

### Vercel (Frontend)
- Framework Preset: `Vite`
- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `dist`

---

## ✅ Testes Pós-Deploy

### Backend
1. Health check: `https://seu-backend.onrender.com/api/health`
2. MongoDB conectado (ver logs)
3. CORS funcionando
4. Socket.IO funcionando

### Frontend
1. Página carrega
2. Login funciona
3. Upload funciona (Cloudinary)
4. Socket.IO conecta

---

## ⚠️ Notas Importantes

1. **Render Free Tier**: Serviços "dormem" após 15 min de inatividade
2. **Variáveis de Ambiente**: Atualizar após obter URLs de produção
3. **CORS**: Deve aceitar a URL exata do frontend (sem trailing slash)
4. **Socket.IO**: Usa `VITE_API_URL` no frontend

---

## 🔗 URLs Após Deploy

- Backend: `https://seu-backend.onrender.com`
- Frontend: `https://seu-app.vercel.app`
- Health: `https://seu-backend.onrender.com/api/health`

---

✅ **Tudo pronto para deploy!**

