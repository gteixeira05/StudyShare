# 🚀 Guia de Deploy - StudyShare

Guia completo para fazer deploy do StudyShare no **Render** (backend) e **Vercel** (frontend).

---

## 📋 Pré-requisitos

- Conta no [Render](https://render.com) (gratuita)
- Conta no [Vercel](https://vercel.com) (gratuita)
- MongoDB Atlas configurado (ou MongoDB local)
- Cloudinary configurado

---

## 🔧 Parte 1: Preparação do Código

### ✅ Checklist Pré-Deploy

- [x] Todas as URLs hardcoded foram substituídas por variáveis de ambiente
- [x] CORS configurado para aceitar URLs de produção
- [x] Scripts `start` adicionados ao `package.json`
- [x] Ficheiro `.env.example` atualizado

---

## 🌐 Parte 2: Deploy do Backend (Render)

### Passo 1: Preparar Repositório

1. Fazer commit e push de todas as alterações:
   ```bash
   git add .
   git commit -m "Preparar para deploy"
   git push
   ```

### Passo 2: Criar Serviço no Render

1. Aceder a https://dashboard.render.com
2. Clicar em **"New +"** → **"Web Service"**
3. Conectar o repositório GitHub/GitLab
4. Selecionar o repositório do StudyShare

### Passo 3: Configurar o Serviço

**Configurações básicas:**
- **Name**: `studyshare-backend` (ou outro nome)
- **Environment**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Root Directory**: (deixar vazio - raiz do repo)

### Passo 4: Variáveis de Ambiente no Render

No painel do Render, ir a **"Environment"** e adicionar:

```env
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://usuario:senha@cluster0.xxxxx.mongodb.net/studyshare?retryWrites=true&w=majority
JWT_SECRET=seu_jwt_secret_muito_seguro_aqui
JWT_EXPIRE=7d
CLIENT_URL=https://seu-app.vercel.app
BACKEND_URL=https://seu-backend.onrender.com
CLOUDINARY_CLOUD_NAME=dbp4blq5m
CLOUDINARY_API_KEY=sua-api-key
CLOUDINARY_API_SECRET=sua-api-secret
```

**⚠️ IMPORTANTE:**
- `PORT` deve ser `10000` (Render usa esta porta por padrão, mas também aceita `process.env.PORT`)
- `CLIENT_URL` será a URL do Vercel (adicionar depois do deploy do frontend)
- `BACKEND_URL` será a URL do Render (ex: `https://studyshare-backend.onrender.com`)

### Passo 5: Deploy

1. Clicar em **"Create Web Service"**
2. Aguardar o build e deploy (pode demorar alguns minutos)
3. Copiar a URL gerada (ex: `https://studyshare-backend.onrender.com`)

### Passo 6: Verificar Deploy

1. Aceder a: `https://seu-backend.onrender.com/api/health`
2. Deve retornar: `{"status":"ok","message":"StudyShare API está a funcionar"}`

---

## 🎨 Parte 3: Deploy do Frontend (Vercel)

### Passo 1: Preparar Frontend

O frontend já está preparado! Apenas precisa configurar as variáveis de ambiente.

### Passo 2: Criar Projeto no Vercel

1. Aceder a https://vercel.com
2. Clicar em **"Add New..."** → **"Project"**
3. Importar o repositório GitHub
4. Selecionar o repositório do StudyShare

### Passo 3: Configurar o Projeto

**Configurações do projeto:**
- **Framework Preset**: `Vite`
- **Root Directory**: `frontend`
- **Build Command**: `npm run build` (ou deixar automático)
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### Passo 4: Variáveis de Ambiente no Vercel

No painel do Vercel, ir a **"Settings"** → **"Environment Variables"** e adicionar:

```env
VITE_API_URL=https://seu-backend.onrender.com
VITE_BACKEND_URL=https://seu-backend.onrender.com
```

**⚠️ IMPORTANTE:**
- Substituir `seu-backend.onrender.com` pela URL real do backend no Render
- Estas variáveis são públicas (podem ser vistas no código do cliente)
- **NÃO** adicionar secrets ou chaves privadas aqui

### Passo 5: Deploy

1. Clicar em **"Deploy"**
2. Aguardar o build (pode demorar alguns minutos)
3. Copiar a URL gerada (ex: `https://studyshare.vercel.app`)

### Passo 6: Atualizar Backend com URL do Frontend

1. Voltar ao Render
2. Ir a **"Environment"** do backend
3. Atualizar `CLIENT_URL` com a URL do Vercel:
   ```
   CLIENT_URL=https://seu-app.vercel.app
   ```
4. Salvar (o Render vai reiniciar automaticamente)

---

## 🔄 Parte 4: Atualizar URLs Após Deploy

### Backend (Render)

Após obter a URL do frontend, atualizar no Render:
- `CLIENT_URL` = URL do Vercel

### Frontend (Vercel)

Após obter a URL do backend, atualizar no Vercel:
- `VITE_API_URL` = URL do Render
- `VITE_BACKEND_URL` = URL do Render

**Nota**: Após alterar variáveis de ambiente, fazer novo deploy:
- **Render**: Reinicia automaticamente
- **Vercel**: Fazer "Redeploy" na última deploy

---

## ✅ Parte 5: Verificações Pós-Deploy

### Backend (Render)

1. ✅ Health Check: `https://seu-backend.onrender.com/api/health`
2. ✅ MongoDB conectado (ver logs no Render)
3. ✅ CORS funcionando (testar requisição do frontend)
4. ✅ Socket.IO funcionando (ver logs)

### Frontend (Vercel)

1. ✅ Página carrega sem erros
2. ✅ Login funciona
3. ✅ Upload de ficheiros funciona (Cloudinary)
4. ✅ Socket.IO conecta (notificações em tempo real)

---

## 🐛 Troubleshooting

### Backend não inicia no Render

**Erro**: "Port already in use"
- **Solução**: O código já usa `process.env.PORT` corretamente. Render define automaticamente.

**Erro**: "MongoDB connection failed"
- **Solução**: Verificar `MONGODB_URI` no Render. Garantir que IP 0.0.0.0/0 está permitido no MongoDB Atlas.

**Erro**: "CORS error"
- **Solução**: Verificar `CLIENT_URL` no Render. Deve ser a URL exata do Vercel (sem trailing slash).

### Frontend não conecta ao backend

**Erro**: "Network Error" ou "CORS Error"
- **Solução**: 
  1. Verificar `VITE_API_URL` no Vercel
  2. Verificar `CLIENT_URL` no Render (deve ser a URL do Vercel)
  3. Fazer redeploy após alterar variáveis

**Erro**: "Socket.IO não conecta"
- **Solução**: Verificar `VITE_API_URL` no Vercel (deve ser a URL do backend)

### Uploads não funcionam

**Erro**: "Cloudinary upload failed"
- **Solução**: Verificar credenciais do Cloudinary no Render:
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`

---

## 📝 Checklist Final

### Backend (Render)
- [ ] Serviço criado e deployado
- [ ] Todas as variáveis de ambiente configuradas
- [ ] Health check funciona
- [ ] MongoDB conectado
- [ ] CORS configurado corretamente
- [ ] URL copiada e guardada

### Frontend (Vercel)
- [ ] Projeto criado e deployado
- [ ] Variáveis de ambiente configuradas
- [ ] URL do backend correta
- [ ] Página carrega sem erros
- [ ] Login funciona
- [ ] Upload funciona
- [ ] Socket.IO conecta

### Integração
- [ ] Backend sabe a URL do frontend (`CLIENT_URL`)
- [ ] Frontend sabe a URL do backend (`VITE_API_URL`)
- [ ] CORS permite comunicação
- [ ] Tudo funciona end-to-end

---

## 🔒 Segurança

### Variáveis Sensíveis (NUNCA no Git)

- `JWT_SECRET` - Backend apenas
- `MONGODB_URI` - Backend apenas
- `CLOUDINARY_API_SECRET` - Backend apenas

### Variáveis Públicas (OK no código)

- `VITE_API_URL` - Frontend (pública, aparece no código)
- `VITE_BACKEND_URL` - Frontend (pública)

---

## 🎯 Resumo das URLs

Após o deploy, terá:

- **Backend**: `https://seu-backend.onrender.com`
- **Frontend**: `https://seu-app.vercel.app`
- **API Health**: `https://seu-backend.onrender.com/api/health`

---

## 📚 Recursos Úteis

- [Render Documentation](https://render.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [Cloudinary Documentation](https://cloudinary.com/documentation)

---

## ⚠️ Notas Importantes

1. **Render Free Tier**:
   - Serviços "dormem" após 15 minutos de inatividade
   - Primeira requisição pode demorar ~30 segundos (wake up)
   - Upgrade para pago remove este limite

2. **Vercel Free Tier**:
   - Excelente para frontend
   - Sem limites relevantes para este projeto

3. **MongoDB Atlas Free Tier**:
   - 512 MB de armazenamento
   - Suficiente para desenvolvimento e testes

4. **Cloudinary Free Tier**:
   - 25 GB de armazenamento
   - 25 GB bandwidth/mês
   - Suficiente para desenvolvimento e testes

---

## ✅ Pronto para Produção!

Após seguir este guia, a aplicação estará:

- ✅ Funcionando em produção
- ✅ Acessível publicamente
- ✅ Com todas as funcionalidades preservadas
- ✅ Segura (variáveis sensíveis protegidas)
- ✅ Escalável (fácil upgrade quando necessário)

Boa sorte com o deploy! 🚀

