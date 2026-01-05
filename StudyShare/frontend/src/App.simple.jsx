// Versão simplificada para teste - renomear para App.jsx temporariamente
import React from 'react'

function App() {
  return (
    <div style={{ 
      padding: '40px', 
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f7f8fa',
      minHeight: '100vh'
    }}>
      <h1 style={{ color: '#2563eb', fontSize: '2rem', marginBottom: '20px' }}>
        StudyShare - Teste
      </h1>
      <p style={{ fontSize: '1.2rem', color: '#333' }}>
        Se vês esta mensagem, o React está a funcionar corretamente!
      </p>
      <p style={{ marginTop: '20px', color: '#666' }}>
        O problema pode estar nos componentes ou no AuthContext.
      </p>
    </div>
  )
}

export default App

