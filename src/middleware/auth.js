const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware para verificar se o usuário está autenticado
 */
exports.protect = async (req, res, next) => {
  let token;

  // Verifica se existe o token no header Authorization
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Extrai o token
      token = req.headers.authorization.split(' ')[1];

      // Verifica o token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Suporte para modo de demonstração para o usuário específico
      if (process.env.NODE_ENV === 'development' && decoded.id === '64f0f1a84bf8dd2a0a7acdc1') {
        req.user = {
          id: decoded.id,
          name: 'Usuário Demo',
          role: 'user',
          mode: 'demo'
        };
        return next();
      }

      // Tenta obter o usuário do banco de dados
      try {
        req.user = await User.findById(decoded.id).select('-password');
        if (!req.user) {
          throw new Error('Usuário não encontrado');
        }
      } catch (dbError) {
        console.error('Erro de banco de dados:', dbError);
        
        // Modo alternativo se o MongoDB não estiver disponível
        if (process.env.NODE_ENV === 'development') {
          console.warn('Modo de demonstração ativado devido a falha no banco de dados');
          req.user = {
            id: decoded.id,
            name: 'Usuário do Sistema',
            role: 'user',
            mode: 'demo'
          };
          return next();
        } else {
          throw new Error('Falha ao verificar usuário');
        }
      }

      next();
    } catch (error) {
      console.error('Erro na autenticação:', error);
      return res.status(401).json({
        success: false,
        message: 'Não autorizado, token inválido'
      });
    }
  } else if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Não autorizado, token não fornecido'
    });
  }
};

/**
 * Middleware para verificar permissões de usuário
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Usuário não tem permissão para acessar este recurso'
      });
    }

    next();
  };
};

/**
 * Middleware para verificar se o projeto pertence ao usuário
 */
exports.checkProjectOwnership = (model) => async (req, res, next) => {
  try {
    const project = await model.findById(req.params.id);
    
    // Verifica se o projeto existe
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projeto não encontrado'
      });
    }

    // Verifica se o usuário é dono do projeto
    if (project.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Não autorizado a acessar este projeto'
      });
    }

    // Adiciona o projeto ao request
    req.project = project;
    next();
  } catch (error) {
    console.error('Erro ao verificar propriedade:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao verificar propriedade do projeto'
    });
  }
};