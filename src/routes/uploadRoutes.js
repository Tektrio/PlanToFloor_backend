const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware/auth');
const uploadController = require('../controllers/uploadController');

// Configuração de upload de arquivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // Remover caracteres problemáticos do nome do arquivo
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, uniqueSuffix + '-' + sanitizedName);
  }
});

// Definir limites para uploads
const fileSize = 20 * 1024 * 1024; // 20MB

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: fileSize
  },
  fileFilter: function (req, file, cb) {
    // Aceitar apenas alguns tipos de arquivo
    if (
      file.mimetype === 'application/pdf' || 
      file.mimetype === 'image/jpeg' || 
      file.mimetype === 'image/png' || 
      file.mimetype === 'image/webp' ||
      file.mimetype === 'image/svg+xml' ||
      file.mimetype === 'application/octet-stream' || // Para DWG/DXF
      file.mimetype === 'application/dxf' || 
      file.mimetype === 'application/dwg'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não suportado! Permitidos: PDF, JPEG, PNG, SVG, DWG e DXF.'), false);
    }
  }
});

// Middleware para tratar erros do multer
const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: `O arquivo excede o tamanho máximo permitido de ${fileSize / (1024 * 1024)}MB`
      });
    }
    return res.status(400).json({
      success: false,
      message: `Erro no upload: ${err.message}`
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  next();
};

// Todas as rotas de upload são protegidas
router.use(protect);

// Rota para processar upload de arquivos (análise)
router.post('/', upload.single('file'), handleUploadErrors, uploadController.uploadFile);

// Rota para adicionar arquivo a um projeto
router.post('/project/:id', upload.single('file'), handleUploadErrors, uploadController.uploadToProject);

// Rota para excluir arquivo de um projeto
router.delete('/project/:id/file/:fileId', uploadController.deleteProjectFile);

module.exports = router;