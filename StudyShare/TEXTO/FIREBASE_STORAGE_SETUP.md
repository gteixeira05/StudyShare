# Guia de Integração - Firebase Storage

## 📋 Pré-requisitos

1. Conta Google (gratuita)
2. Projeto criado no Firebase Console (https://console.firebase.google.com/)

## 🚀 Passo 1: Criar Projeto no Firebase

1. Aceder a https://console.firebase.google.com/
2. Clicar em "Adicionar projeto"
3. Dar nome ao projeto (ex: "studyshare-storage")
4. Desativar Google Analytics (opcional, para manter gratuito)
5. Clicar em "Criar projeto"

## 🔐 Passo 2: Ativar Plano de Faturamento (Obrigatório)

**⚠️ IMPORTANTE**: O Firebase Storage requer um plano de faturamento ativado, mesmo para usar o plano gratuito (Spark).

1. No Firebase Console, clicar no ícone de engrenagem (⚙️) no canto superior esquerdo
2. Selecionar "Utilização e faturação" ou "Usage and billing"
3. Clicar em "Selecionar plano" ou "Select plan"
4. Escolher o **plano Blaze (Pay as you go)** - este é o plano que permite uso gratuito dentro dos limites
5. **Adicionar método de pagamento** (cartão de crédito/débito)
   - ⚠️ **Não será cobrado** se ficar dentro dos limites gratuitos (5 GB, 1 GB/dia download)
   - O Firebase só cobra se ultrapassar os limites gratuitos
   - Pode configurar alertas de orçamento para ser avisado antes

**Nota**: Se já tiver um plano ativado, pode saltar este passo.

## 🔐 Passo 3: Ativar Firebase Storage

1. No menu lateral, expandir a secção "Criação" (se não estiver já expandida)
2. Clicar em "Storage" (ícone de pasta) dentro da secção "Criação"
3. Clicar em "Começar" ou "Iniciar" (agora já não aparecerá a mensagem de upgrade)
4. Escolher "Modo de produção" (regras de segurança mais restritivas)
5. Escolher localização (ex: `europe-west1` - Bélgica, ou mais próximo de si)
6. Clicar em "Concluído" ou "Concluir"

## 🔑 Passo 4: Obter Credenciais

### Opção A: Service Account (Recomendado para Backend)

1. No Firebase Console, ir para "Configurações do projeto" (ícone de engrenagem)
2. Ir para o separador "Contas de serviço"
3. Clicar em "Gerar nova chave privada"
4. Descarregar o ficheiro JSON (ex: `studyshare-firebase-adminsdk.json`)
5. **IMPORTANTE**: Não fazer commit deste ficheiro no Git!

### Opção B: Config do Web App (Para referência)

1. No Firebase Console, ir para "Configurações do projeto"
2. No separador "Geral", descer até "Os seus apps"
3. Clicar no ícone web `</>`
4. Dar nome à app (ex: "StudyShare Web")
5. Copiar as configurações (não precisa registar)

## 📦 Passo 5: Instalar Dependências

No diretório do backend:

```bash
npm install firebase-admin
```

## 🔧 Passo 6: Configurar Variáveis de Ambiente

Adicionar ao ficheiro `.env` (na raiz do projeto):

```env
# Firebase Storage
FIREBASE_PROJECT_ID=seu-project-id
FIREBASE_STORAGE_BUCKET=seu-project-id.appspot.com
FIREBASE_CREDENTIALS_PATH=./backend/config/firebase-service-account.json

# OU usar variável de ambiente JSON (melhor para produção):
# FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
```

## 📁 Passo 7: Estrutura de Pastas

Criar pasta para credenciais:

```bash
mkdir -p backend/config
```

Mover o ficheiro JSON descarregado para `backend/config/firebase-service-account.json`

**⚠️ IMPORTANTE**: Adicionar ao `.gitignore`:

```
backend/config/firebase-service-account.json
backend/config/*.json
.env
```

## 🔒 Passo 8: Configurar Regras de Segurança

No Firebase Console > Storage > Regras:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Materiais: qualquer pessoa pode ler, apenas autenticados podem escrever
    match /materials/{materialId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Avatares: qualquer pessoa pode ler, apenas o próprio utilizador pode escrever
    match /avatars/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

**Nota**: Como estamos a usar Service Account no backend, estas regras aplicam-se principalmente se usarmos Firebase SDK no frontend.

## 📝 Passo 9: Implementação no Backend

Ver `FIREBASE_STORAGE_IMPLEMENTATION.md` para código detalhado.

## 🌐 Passo 10: Deploy no Render/Vercel

### Render (Backend):

1. Adicionar variáveis de ambiente no painel do Render:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_STORAGE_BUCKET`
   - `FIREBASE_SERVICE_ACCOUNT` (JSON completo como string)

2. **NÃO** fazer upload do ficheiro JSON - usar variável de ambiente

### Vercel (Frontend):

- Nenhuma configuração especial necessária (Firebase Storage acessado via backend)

## 💰 Limites do Plano Gratuito

- **Armazenamento**: 5 GB
- **Downloads**: 1 GB/dia
- **Uploads**: 20.000/dia
- **Operações**: 50.000 downloads/dia

## 📊 Monitorização

No Firebase Console > Storage > Utilização, pode ver:
- Espaço utilizado
- Transferências diárias
- Operações de leitura/escrita

## ⚠️ Considerações Importantes

1. **Plano de Faturamento Obrigatório**: 
   - O Firebase Storage requer plano Blaze (Pay as you go) ativado
   - Precisa adicionar cartão de crédito/débito
   - **Não será cobrado** se ficar dentro dos limites gratuitos (5 GB, 1 GB/dia)

2. **Configurar Alertas de Orçamento** (Recomendado):
   - No Firebase Console > Utilização e faturação > Alertas
   - Configurar alerta para $1 ou $5 para ser avisado antes de custos

3. **Limites Gratuitos**:
   - 5 GB de armazenamento total
   - 1 GB de downloads/dia
   - 20.000 uploads/dia
   - 50.000 downloads/dia

4. **Custos**: Se ultrapassar os limites gratuitos, será cobrado automaticamente
   - Armazenamento: ~$0.026/GB/mês
   - Downloads: ~$0.12/GB

5. **Backup**: Firebase Storage tem redundância automática, mas considere backup para dados críticos

6. **CDN**: Firebase Storage usa CDN global (mais rápido)

7. **Segurança**: Sempre validar ficheiros no backend antes de upload

