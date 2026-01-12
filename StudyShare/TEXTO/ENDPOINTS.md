# 📡 API Endpoints - StudyShare

Documentação completa de todos os endpoints da API.

**Base URL**: `http://localhost:5000/api` (desenvolvimento) ou `https://seu-backend.onrender.com/api` (produção)

---

## 🔐 Autenticação (`/api/auth`)

| Método | Endpoint | Descrição | Acesso |
|--------|----------|-----------|--------|
| `POST` | `/api/auth/register` | Registar novo utilizador | Público |
| `POST` | `/api/auth/login` | Login de utilizador | Público |
| `GET` | `/api/auth/me` | Obter dados do utilizador autenticado | Autenticado |
| `PUT` | `/api/auth/me` | Atualizar perfil do utilizador | Autenticado |
| `POST` | `/api/auth/me/avatar` | Upload de avatar | Autenticado |
| `PUT` | `/api/auth/me/password` | Alterar password | Autenticado |

---

## 📄 Materiais (`/api/materials`)

| Método | Endpoint | Descrição | Acesso |
|--------|----------|-----------|--------|
| `GET` | `/api/materials` | Listar materiais (com filtros e pesquisa) | Público |
| `GET` | `/api/materials/:id` | Obter detalhes de um material | Público |
| `POST` | `/api/materials` | Criar novo material | Autenticado |
| `PUT` | `/api/materials/:id` | Atualizar material | Autenticado (proprietário) |
| `DELETE` | `/api/materials/:id` | Eliminar material | Autenticado (proprietário/admin) |
| `GET` | `/api/materials/:id/preview` | Preview do ficheiro | Público |
| `GET` | `/api/materials/:id/download` | Download do ficheiro | Autenticado |
| `POST` | `/api/materials/:id/comments` | Adicionar comentário | Autenticado |
| `POST` | `/api/materials/:id/comments/:commentId/like` | Gostar comentário | Autenticado |
| `POST` | `/api/materials/:id/comments/:commentId/dislike` | Não gostar comentário | Autenticado |
| `POST` | `/api/materials/:id/comments/:commentId/report` | Reportar comentário | Autenticado |
| `POST` | `/api/materials/:id/rating` | Avaliar material | Autenticado |
| `GET` | `/api/materials/:id/rating/user` | Obter avaliação do utilizador | Autenticado |
| `POST` | `/api/materials/:id/report` | Reportar material | Autenticado |

**Query Parameters para GET `/api/materials`:**
- `search` - Pesquisa por texto
- `discipline` - Filtrar por disciplina
- `course` - Filtrar por curso
- `year` - Filtrar por ano
- `materialType` - Filtrar por tipo
- `page` - Número da página
- `limit` - Itens por página
- `sort` - Ordenação (`recent`, `rating`, `downloads`, `views`)

---

## 👤 Utilizadores (`/api/users`)

| Método | Endpoint | Descrição | Acesso |
|--------|----------|-----------|--------|
| `GET` | `/api/users/me/materials` | Obter materiais do utilizador autenticado | Autenticado |
| `GET` | `/api/users/:id` | Obter perfil de um utilizador | Público |
| `GET` | `/api/users/:id/materials` | Obter materiais de um utilizador | Público |
| `GET` | `/api/users` | Listar todos os utilizadores | Admin |
| `GET` | `/api/users/me/materials/count` | Contar materiais do utilizador | Autenticado |
| `POST` | `/api/users/me/reputation/recalculate` | Recalcular reputação | Autenticado |
| `GET` | `/api/users/me/notification-preferences` | Obter preferências de notificações | Autenticado |
| `PUT` | `/api/users/me/notification-preferences` | Atualizar preferências de notificações | Autenticado |

---

## 🔔 Notificações (`/api/notifications`)

| Método | Endpoint | Descrição | Acesso |
|--------|----------|-----------|--------|
| `GET` | `/api/notifications` | Obter notificações do utilizador | Autenticado |
| `PUT` | `/api/notifications/:id/read` | Marcar notificação como lida | Autenticado |
| `PUT` | `/api/notifications/read-all` | Marcar todas como lidas | Autenticado |
| `DELETE` | `/api/notifications/:id` | Eliminar notificação | Autenticado |

---

## ⭐ Favoritos (`/api/favorites`)

| Método | Endpoint | Descrição | Acesso |
|--------|----------|-----------|--------|
| `POST` | `/api/favorites/:materialId` | Adicionar aos favoritos | Autenticado |
| `DELETE` | `/api/favorites/:materialId` | Remover dos favoritos | Autenticado |
| `GET` | `/api/favorites` | Obter favoritos do utilizador | Autenticado |
| `GET` | `/api/favorites/check/:materialId` | Verificar se material está nos favoritos | Autenticado |

---

## ⚙️ Configuração (`/api/config`)

| Método | Endpoint | Descrição | Acesso |
|--------|----------|-----------|--------|
| `GET` | `/api/config/:key` | Obter configuração (anos ou tipos de material) | Público |

**Keys disponíveis:**
- `availableYears` - Anos disponíveis
- `materialTypes` - Tipos de material disponíveis

---

## 🔧 Admin (`/api/admin`)

| Método | Endpoint | Descrição | Acesso |
|--------|----------|-----------|--------|
| `GET` | `/api/admin/users` | Listar utilizadores | Admin |
| `PUT` | `/api/admin/users/:id/role` | Alterar role de utilizador | Admin |
| `GET` | `/api/admin/reports` | Listar reports | Admin |
| `POST` | `/api/admin/reports/:reportId/resolve` | Resolver report | Admin |
| `GET` | `/api/admin/stats` | Obter estatísticas | Admin |
| `GET` | `/api/admin/config/:key` | Obter configuração completa (incluindo inativos) | Admin |
| `POST` | `/api/admin/config/:key/values` | Adicionar valor à configuração | Admin |
| `PUT` | `/api/admin/config/:key/values/:valueId` | Atualizar valor da configuração | Admin |
| `DELETE` | `/api/admin/config/:key/values/:valueId` | Desativar valor da configuração | Admin |
| `DELETE` | `/api/admin/config/:key/values/:valueId/permanent` | Eliminar permanentemente valor | Admin |
| `DELETE` | `/api/admin/materials/cleanup-local-files` | Limpar materiais com URLs locais | Admin |

---

## 🏥 Health Check

| Método | Endpoint | Descrição | Acesso |
|--------|----------|-----------|--------|
| `GET` | `/api/health` | Verificar se a API está a funcionar | Público |

---

## 📝 Notas

### Autenticação
- Endpoints marcados como **"Autenticado"** requerem um token JWT no header:
  ```
  Authorization: Bearer <token>
  ```
- O token é obtido através de `/api/auth/login` ou `/api/auth/register`

### Paginação
- Endpoints de listagem suportam paginação via query parameters:
  - `page` - Número da página (padrão: 1)
  - `limit` - Itens por página (padrão: 20)

### Filtros
- Múltiplos filtros podem ser combinados
- Filtros são opcionais

### Upload de Ficheiros
- Materiais: Máximo 25MB
- Avatares: Máximo 2MB

---

## 🔗 Ficheiros de Rotas

Todos os endpoints estão definidos em:
- `backend/routes/auth.routes.js` - Autenticação
- `backend/routes/material.routes.js` - Materiais
- `backend/routes/user.routes.js` - Utilizadores
- `backend/routes/notification.routes.js` - Notificações
- `backend/routes/favorite.routes.js` - Favoritos
- `backend/routes/config.routes.js` - Configuração
- `backend/routes/admin.routes.js` - Admin
- `backend/server.js` - Health check e registro de rotas

