# 🔍 Troubleshooting - Página Branca

## Passos para Diagnosticar

### 1. Verificar Consola do Browser

**IMPORTANTE**: Abre a consola do browser (F12 ou Clique Direito > Inspecionar > Console) e verifica se há erros em vermelho.

**Como fazer:**
1. Abre http://localhost:5173
2. Pressiona **F12** (ou Clique Direito > Inspecionar)
3. Vai ao separador **"Console"**
4. Procura por erros em **vermelho**

**Envia-me os erros que aparecem!**

### 2. Verificar Terminal do Frontend

No terminal onde executaste `npm run dev`, verifica:
- Há mensagens de erro?
- Diz "Local: http://localhost:5173"?
- Há avisos sobre módulos não encontrados?

### 3. Verificar se o Backend está a Correr

O frontend precisa do backend para algumas funcionalidades. Verifica:
- Backend está a correr na porta 5000?
- Vê http://localhost:5000/api/health no browser
- Deve retornar: `{"status":"ok","message":"StudyShare API está a funcionar"}`

### 4. Problemas Comuns

#### Erro: "Cannot find module" ou "Failed to resolve"
**Solução**: Reinstalar dependências
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

#### Erro: "React is not defined"
**Solução**: Verificar imports no App.jsx

#### Erro: "useAuth must be used within AuthProvider"
**Solução**: Verificar se AuthProvider está a envolver tudo no App.jsx

#### Erro de CORS
**Solução**: Verificar se CLIENT_URL no .env está correto

### 5. Teste Simples

Tenta substituir temporariamente o App.jsx por uma versão simples:

```jsx
function App() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Teste - Se vês isto, React funciona!</h1>
    </div>
  )
}

export default App
```

Se isto funcionar, o problema está nos componentes.

### 6. Verificar Vite 7.3.0

O Vite 7.3.0 pode ter breaking changes. Se nada funcionar, tenta reverter:

```bash
cd frontend
npm install vite@^5.1.0 --save-dev
```

## 🔧 Solução Rápida

1. **Para tudo** (Ctrl+C em todos os terminais)
2. **Limpa cache do Vite**:
   ```bash
   cd frontend
   rm -rf node_modules/.vite
   ```
3. **Reinstala dependências**:
   ```bash
   cd frontend
   npm install
   ```
4. **Reinicia**:
   ```bash
   npm run dev
   ```

## 📋 Informação para Enviar

Se ainda não funcionar, envia-me:
1. **Erros da consola do browser** (F12 > Console)
2. **Erros do terminal** onde corre o `npm run dev`
3. **Versão do Node.js**: `node --version`
4. **Versão do npm**: `npm --version`

