import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Import routes
import authRoutes from './routes/auth.routes.js';
import materialRoutes from './routes/material.routes.js';
import userRoutes from './routes/user.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
// Carregar .env da raiz do projeto (um nível acima de backend/)
dotenv.config({ path: path.join(path.dirname(__dirname), '.env') });

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? (process.env.CLIENT_URL || 'http://localhost:5173')
      : true, // Em desenvolvimento, permitir todas as origens
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Middleware
// Em desenvolvimento, permitir acesso de qualquer origem (incluindo IPs locais)
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? [process.env.CLIENT_URL || 'http://localhost:5173']
  : [
      'http://localhost:5173',
      /^http:\/\/192\.168\.\d+\.\d+:5173$/, // Permitir IPs locais
      /^http:\/\/10\.\d+\.\d+\.\d+:5173$/,  // Permitir IPs privados
      /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+:5173$/ // Permitir IPs privados
    ];

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requisições sem origin (mobile apps, Postman, etc)
    if (!origin) return callback(null, true);
    
    // Verificar se a origem está permitida
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return origin === allowedOrigin;
      } else if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });
    
    if (isAllowed || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir ficheiros estáticos da pasta uploads
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Criar pasta de avatares se não existir
const avatarsDir = path.join(__dirname, 'uploads', 'avatars');
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/studyshare';

mongoose.connect(MONGODB_URI)
.then(() => {
  console.log('✅ MongoDB conectado com sucesso');
})
.catch((error) => {
  console.error('❌ Erro ao conectar ao MongoDB:', error);
  process.exit(1);
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('🔌 Utilizador conectado:', socket.id);

  // Quando um utilizador faz login, junta-se à sua sala personalizada
  socket.on('join_user_room', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`👤 Utilizador ${userId} juntou-se à sua sala de notificações`);
  });

  // Quando um utilizador entra numa página de material, junta-se à sala do material
  socket.on('join_material_room', (materialId) => {
    socket.join(`material_${materialId}`);
    console.log(`📄 Socket ${socket.id} juntou-se à sala do material ${materialId}`);
  });

  // Quando um utilizador sai de uma página de material
  socket.on('leave_material_room', (materialId) => {
    socket.leave(`material_${materialId}`);
    console.log(`📄 Socket ${socket.id} saiu da sala do material ${materialId}`);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Utilizador desconectado:', socket.id);
  });
});

// Import additional routes
import notificationRoutes from './routes/notification.routes.js';
import favoriteRoutes from './routes/favorite.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { setIO } from './utils/notifications.js';

// Configurar io para notificações
setIO(io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'StudyShare API está a funcionar' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Erro:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Erro interno do servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Rota não encontrada' });
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor a correr na porta ${PORT}`);
  console.log(`📡 Socket.IO ativo`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📱 Acessível em: http://192.168.1.72:${PORT} (ou outro IP da tua rede)`);
});

export { io };

