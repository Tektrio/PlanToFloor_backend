const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose');
const fs = require('fs');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Carregando variáveis de ambiente
dotenv.config();

// Validação de variáveis de ambiente necessárias
const requiredEnvVars = ['PORT', 'JWT_SECRET', 'MONGODB_URI'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error(`Erro: Variáveis de ambiente ausentes: ${missingEnvVars.join(', ')}`);
  console.error('Crie um arquivo .env baseado no .env.example e configure as variáveis necessárias');
  process.exit(1);
}

// Obter URI do MongoDB das variáveis de ambiente
const MONGODB_URI = 'mongodb+srv://tektrio2023:lETNUPLMUijVaA58@plantofloor.me129.mongodb.net/plantofloor?retryWrites=true&w=majority&appName=PlanToFloor';

// Conexão com o MongoDB
console.log('Tentando conectar ao MongoDB...');
mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 5000, // Timeout após 5 segundos
  maxPoolSize: 10, // Máximo de 10 conexões no pool
})
  .then(() => console.log('Conectado ao MongoDB com sucesso!'))
  .catch(err => {
    console.error('Erro ao conectar ao MongoDB:', err.message);
    console.warn('O servidor continuará funcionando, mas com funcionalidade limitada');
    console.warn('Configure uma conexão MongoDB válida para funcionalidade completa');
  });

// Importação das rotas
const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Criando diretório de uploads se não existir
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(compression()); // Compressão de resposta
app.use(helmet()); // Segurança de cabeçalhos HTTP
app.use(bodyParser.json({ limit: '10mb' })); // Reduzindo limite para 10MB
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting para proteção contra brute force
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // limite de 100 requisições por janela
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Muitas requisições, tente novamente mais tarde'
  }
});

// Aplicar limite de taxa a todas as requisições de API
app.use('/api/', apiLimiter);

// Rate limiting mais rigoroso para rotas de autenticação
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // limite de 10
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Muitas tentativas de login, tente novamente mais tarde'
  }
});

// Servindo arquivos de upload estáticos - com segurança
app.use('/uploads', (req, res, next) => {
  // Evitar directory traversal attacks
  const normalizedPath = path.normalize(req.path).replace(/^(\.\.[\/\\])+/, '');
  req.url = normalizedPath;
  next();
}, express.static(path.join(__dirname, '../uploads')));

// Configuração das rotas
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/upload', uploadRoutes);

// Rota para servir arquivos estáticos do frontend em produção
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/dist', 'index.html'));
  });
}

// Middleware para erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Erro interno do servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Rota para 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Rota não encontrada'
  });
});

// Inicialização do servidor
const server = app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

// Lidando com shutdown elegante
process.on('SIGTERM', () => {
  console.log('Recebido SIGTERM, fechando servidor...');
  server.close(() => {
    console.log('Servidor fechado');
    process.exit(0);
  });
});

module.exports = app; // Para testes