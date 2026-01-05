# ⚠️ IMPORTANTE: Verificar Connection String do MongoDB Atlas

## O Problema

O servidor está a tentar conectar a `localhost:27017` em vez do MongoDB Atlas. Isto significa que o ficheiro `.env` ainda não tem a connection string correta do Atlas.

## ✅ Solução

### 1. Abrir o ficheiro `.env`

O ficheiro `.env` está na raiz do projeto: `C:\UNIVERSIDADE\SIR_CURSOR\.env`

### 2. Verificar a linha MONGODB_URI

Deve estar algo como:
```env
MONGODB_URI=mongodb://localhost:27017/studyshare
```

### 3. Substituir pela Connection String do Atlas

Substitui essa linha pela connection string que copiaste do MongoDB Atlas. Deve ser algo como:

```env
MONGODB_URI=mongodb+srv://TEU_USERNAME:TU_PASSWORD@cluster0.xxxxx.mongodb.net/studyshare?retryWrites=true&w=majority
```

**IMPORTANTE:**
- Substitui `TEU_USERNAME` pelo username que criaste no Atlas
- Substitui `TU_PASSWORD` pela password que criaste no Atlas
- Substitui `cluster0.xxxxx.mongodb.net` pela URL do teu cluster
- **NÃO ESQUEÇAS** de adicionar `/studyshare` antes do `?` para especificar o nome da base de dados

### 4. Exemplo Completo

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb+srv://studyshare_user:MinhaPassword123@cluster0.abc123.mongodb.net/studyshare?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=studyshare_secret_key_change_in_production
JWT_EXPIRE=7d

# Client URL
CLIENT_URL=http://localhost:5173
```

### 5. Como Obter a Connection String (se ainda não tens)

1. Vai ao MongoDB Atlas: https://cloud.mongodb.com
2. Clica em **"Connect"** no teu cluster
3. Escolhe **"Connect your application"**
4. Copia a connection string
5. Substitui `<password>` pela tua password
6. Adiciona `/studyshare` antes do `?`

### 6. Reiniciar o Servidor

Depois de atualizar o `.env`, o servidor deve reiniciar automaticamente (nodemon). Se não reiniciar:

1. Para o servidor (Ctrl+C)
2. Inicia novamente: `npm run server`

### 7. Verificar Sucesso

Se tudo estiver correto, verás:
```
✅ MongoDB conectado com sucesso
🚀 Servidor a correr na porta 5000
```

## 🔍 Checklist

- [ ] Ficheiro `.env` existe na raiz do projeto
- [ ] `MONGODB_URI` tem a connection string do Atlas (não localhost)
- [ ] Username e password estão corretos na connection string
- [ ] Nome da base de dados (`/studyshare`) está incluído
- [ ] Servidor reiniciado após alterações

