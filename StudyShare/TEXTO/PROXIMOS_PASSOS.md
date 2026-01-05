# 🚀 Próximos Passos - StudyShare

## ✅ Estado Atual
- ✅ Dependências instaladas
- ✅ MongoDB Atlas configurado e conectado
- ✅ Backend a funcionar

## 📋 Próximos Passos

### 1. Criar Utilizador Administrador (Opcional mas Recomendado)

Cria um administrador para ter acesso a funcionalidades de moderação:

```bash
npm run seed:admin
```

Isto cria um administrador padrão:
- **Email**: `admin@studyshare.pt`
- **Password**: `admin123`

⚠️ **IMPORTANTE**: Depois do primeiro login, muda a password!

### 2. Iniciar a Aplicação Completa

Agora podes iniciar tanto o backend quanto o frontend:

```bash
npm run dev
```

Isto inicia:
- **Backend**: http://localhost:5000
- **Frontend**: http://localhost:5173

### 3. Aceder à Aplicação

1. Abre o browser e vai a: **http://localhost:5173**
2. Deves ver a página inicial do StudyShare

### 4. Criar a Primeira Conta

1. Clica em **"Registo"** (ou vai a http://localhost:5173/register)
2. Preenche os dados:
   - Nome completo
   - Email (usa um email válido)
   - Password (mínimo 6 caracteres)
   - Curso e Ano (opcional)
3. Clica em **"Criar Conta"**

### 5. Explorar a Aplicação

Agora podes:

#### Como Utilizador:
- ✅ Ver materiais na página inicial
- ✅ Pesquisar e filtrar materiais
- ✅ Ver detalhes de materiais
- ✅ Fazer upload de materiais (precisa estar autenticado)
- ✅ Ver o teu perfil

#### Como Administrador (se criaste o seed):
- ✅ Todas as funcionalidades de utilizador
- ✅ Moderação de conteúdos (quando implementado)
- ✅ Gestão de utilizadores (quando implementado)

### 6. Testar Funcionalidades Principais

#### Teste 1: Pesquisa e Filtros
- Usa a barra de pesquisa
- Testa os filtros na sidebar (Ano, Curso, Disciplina, Tipo)

#### Teste 2: Upload de Material (Requer Login)
1. Faz login
2. Clica em **"+ Upload Material"** na sidebar
3. Preenche o formulário:
   - Título
   - Disciplina
   - Ano
   - Tipo de Material
   - Descrição (opcional)
   - Ficheiro (por agora é simulado)
4. Clica em **"Submeter Material"**

⚠️ **Nota**: O upload de ficheiros reais ainda não está implementado (precisa de Multer configurado). Por agora, o sistema aceita o formulário mas não faz upload real.

#### Teste 3: Ver Detalhes de Material
- Clica em qualquer card de material
- Vê os detalhes, comentários, avaliações

### 7. Verificar API (Opcional)

Podes testar a API diretamente:

- **Health Check**: http://localhost:5000/api/health
- **Listar Materiais**: http://localhost:5000/api/materials
- **Registo**: POST http://localhost:5000/api/auth/register
- **Login**: POST http://localhost:5000/api/auth/login

## 🎯 Checklist de Funcionalidades

- [ ] Backend a correr (porta 5000)
- [ ] Frontend a correr (porta 5173)
- [ ] MongoDB conectado
- [ ] Conta de utilizador criada
- [ ] Login funcional
- [ ] Página inicial a mostrar
- [ ] Pesquisa e filtros funcionais
- [ ] Upload de material testado (formulário)

## 🔧 Próximas Melhorias (Para Implementar)

1. **Upload Real de Ficheiros**
   - Configurar Multer
   - Criar pasta de uploads
   - Implementar validação de ficheiros

2. **Sistema de Avaliações**
   - Permitir utilizadores avaliarem materiais
   - Calcular média de avaliações

3. **Sistema de Comentários**
   - Implementar criação de comentários
   - Mostrar comentários em tempo real

4. **Notificações (Socket.IO)**
   - Notificações em tempo real
   - Alertas de novos materiais

5. **Funcionalidades de Administrador**
   - Painel de moderação
   - Gestão de utilizadores
   - Aprovação/remoção de materiais

## 🐛 Troubleshooting

### Frontend não inicia
```bash
cd frontend
npm install
npm run dev
```

### Erro de CORS
- Verifica se `CLIENT_URL` no `.env` está correto: `http://localhost:5173`

### Erro de autenticação
- Verifica se o token está a ser guardado no localStorage
- Verifica se o JWT_SECRET no `.env` está definido

### Erro ao fazer upload
- Por agora, o upload é simulado. Para implementar upload real, precisa configurar Multer.

## 🎉 Pronto para Desenvolver!

A aplicação está funcional e pronta para desenvolvimento. Podes começar a adicionar funcionalidades e melhorar a interface.

**Boa sorte com o projeto! 🚀**

