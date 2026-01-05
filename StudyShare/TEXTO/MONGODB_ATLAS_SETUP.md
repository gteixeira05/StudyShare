# Guia de Configuração MongoDB Atlas

## 📋 Passos para Configurar MongoDB Atlas

### 1. Criar um Cluster (se ainda não criaste)

1. **Login no MongoDB Atlas**: https://www.mongodb.com/cloud/atlas
2. **Criar um novo cluster**:
   - Clica em **"Create"** ou **"Build a Database"**
   - Escolhe o plano **FREE (M0)** - suficiente para desenvolvimento
   - Escolhe a região mais próxima (ex: `eu-west-1` para Portugal)
   - Dá um nome ao cluster (ex: "Cluster0")
   - Clica em **"Create Cluster"**
   - Aguarda 3-5 minutos para o cluster ser criado

### 2. Configurar Acesso à Base de Dados

#### 2.1. Criar Utilizador da Base de Dados

1. No menu lateral, vai a **"Database Access"** (ou **"Security" > "Database Access"**)
2. Clica em **"Add New Database User"**
3. Escolhe **"Password"** como método de autenticação
4. Preenche:
   - **Username**: `studyshare_user` (ou outro nome)
   - **Password**: Cria uma password forte (guarda-a bem!)
5. Em **"Database User Privileges"**, escolhe **"Read and write to any database"**
6. Clica em **"Add User"**

#### 2.2. Configurar Network Access (Whitelist de IPs)

1. No menu lateral, vai a **"Network Access"** (ou **"Security" > "Network Access"**)
2. Clica em **"Add IP Address"**
3. Para desenvolvimento local, escolhe uma das opções:
   - **"Add Current IP Address"** - adiciona o teu IP atual
   - **"Allow Access from Anywhere"** - `0.0.0.0/0` (menos seguro, mas útil para desenvolvimento)
4. Clica em **"Confirm"**

⚠️ **Nota de Segurança**: Em produção, NUNCA uses `0.0.0.0/0`. Adiciona apenas IPs específicos.

### 3. Obter Connection String

1. No menu lateral, vai a **"Database"** (ou **"Clusters"**)
2. Clica no botão **"Connect"** no teu cluster
3. Escolhe **"Connect your application"**
4. Escolhe:
   - **Driver**: `Node.js`
   - **Version**: `5.5 or later` (ou a mais recente)
5. **Copia a connection string** que aparece (algo como):
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

### 4. Atualizar o Ficheiro .env

1. Abre o ficheiro `.env` na raiz do projeto
2. Substitui a linha `MONGODB_URI` com a connection string que copiaste
3. **IMPORTANTE**: Substitui `<username>` e `<password>` pelos valores que criaste:
   ```env
   MONGODB_URI=mongodb+srv://studyshare_user:TU_PASSWORD_AQUI@cluster0.xxxxx.mongodb.net/studyshare?retryWrites=true&w=majority
   ```

   **Nota**: Adiciona `/studyshare` antes do `?` para especificar o nome da base de dados.

### 5. Exemplo Completo do .env

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

### 6. Testar a Conexão

1. Inicia o servidor:
   ```bash
   npm run server
   ```

2. Se tudo estiver correto, verás:
   ```
   ✅ MongoDB conectado com sucesso
   🚀 Servidor a correr na porta 5000
   ```

3. Se houver erro, verifica:
   - ✅ Username e password estão corretos
   - ✅ IP está na whitelist
   - ✅ Connection string está completa
   - ✅ Nome da base de dados está correto

## 🔍 Troubleshooting

### Erro: "Authentication failed"
- Verifica se o username e password estão corretos no `.env`
- Certifica-te que substituíste `<username>` e `<password>` na connection string

### Erro: "IP not whitelisted"
- Vai a **"Network Access"** no Atlas
- Adiciona o teu IP atual ou usa `0.0.0.0/0` temporariamente para desenvolvimento

### Erro: "Connection timeout"
- Verifica a tua ligação à internet
- Verifica se o cluster está ativo (não pausado)
- Tenta usar uma região mais próxima

### Erro: "Invalid connection string"
- Verifica se a connection string está completa
- Certifica-te que não há espaços extras
- Verifica se o nome da base de dados está correto

## ✅ Checklist Final

- [ ] Cluster criado e ativo
- [ ] Utilizador da base de dados criado
- [ ] IP adicionado à whitelist
- [ ] Connection string copiada
- [ ] `.env` atualizado com connection string completa
- [ ] Servidor inicia sem erros de conexão

## 🎉 Pronto!

Agora podes iniciar a aplicação completa:
```bash
npm run dev
```

