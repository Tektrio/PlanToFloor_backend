const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Gera um token JWT
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

/**
 * @desc    Registra um novo usuário
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Verifica se todos os campos foram fornecidos
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Por favor, forneça todos os campos obrigatórios'
      });
    }

    // Modo de demonstração (quando MongoDB não está disponível)
    if (process.env.NODE_ENV === 'development') {
      // Simula um ID de usuário
      const mockUserId = 'usr_' + Date.now();
      
      // Gera o token
      const token = generateToken(mockUserId);

      // Retorna os dados do usuário simulado
      return res.status(201).json({
        success: true,
        token,
        user: {
          id: mockUserId,
          name,
          email,
          role: 'user'
        },
        mode: 'demo'
      });
    }

    // Código real para MongoDB quando disponível
    try {
      // Verifica se o usuário já existe
      const userExists = await User.findOne({ email });
      if (userExists) {
        return res.status(400).json({
          success: false,
          message: 'Usuário já existe'
        });
      }

      // Cria o usuário
      const user = await User.create({
        name,
        email,
        password
      });

      if (user) {
        // Gera o token
        const token = generateToken(user._id);

        // Retorna os dados do usuário
        res.status(201).json({
          success: true,
          token,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Dados de usuário inválidos'
        });
      }
    } catch (dbError) {
      console.error('Erro de banco de dados:', dbError);
      throw new Error('Falha ao acessar banco de dados');
    }
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao registrar usuário',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Autentica um usuário
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Verifica se email e senha foram fornecidos
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Por favor, forneça email e senha'
      });
    }

    // Modo de demonstração (quando MongoDB não está disponível)
    if (process.env.NODE_ENV === 'development') {
      // Credenciais de demonstração
      if (email === 'demo@example.com' && password === 'senha123') {
        // Simula um ID de usuário - usando um ObjectId válido para o MongoDB
        const mockUserId = '64f0f1a84bf8dd2a0a7acdc1';
        
        // Gera o token
        const token = generateToken(mockUserId);

        // Retorna os dados do usuário simulado
        return res.json({
          success: true,
          token,
          user: {
            id: mockUserId,
            name: 'Usuário Demo',
            email: 'demo@example.com',
            role: 'user'
          },
          mode: 'demo'
        });
      } else {
        return res.status(401).json({
          success: false,
          message: 'Credenciais inválidas'
        });
      }
    }

    // Código real para MongoDB quando disponível
    try {
      // Busca o usuário no banco de dados
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Credenciais inválidas'
        });
      }

      // Verifica se a senha é válida
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Credenciais inválidas'
        });
      }

      // Gera o token
      const token = generateToken(user._id);

      // Retorna os dados do usuário
      res.json({
        success: true,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    } catch (dbError) {
      console.error('Erro de banco de dados:', dbError);
      throw new Error('Falha ao acessar banco de dados');
    }
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao autenticar usuário',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Obtém os dados do usuário atual
 * @route   GET /api/auth/me
 * @access  Private
 */
exports.getMe = async (req, res) => {
  try {
    // Modo de demonstração (quando MongoDB não está disponível)
    if (process.env.NODE_ENV === 'development' && req.user && req.user.id.startsWith('usr_')) {
      return res.json({
        success: true,
        user: {
          id: req.user.id,
          name: req.user.id === 'usr_demo' ? 'Usuário Demo' : 'Usuário Registrado',
          email: req.user.id === 'usr_demo' ? 'demo@example.com' : 'usuario@example.com',
          role: 'user',
          createdAt: new Date().toISOString()
        },
        mode: 'demo'
      });
    }

    // Código real para MongoDB quando disponível
    try {
      const user = await User.findById(req.user.id).select('-password');
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }
      
      res.json({
        success: true,
        user
      });
    } catch (dbError) {
      console.error('Erro de banco de dados:', dbError);
      throw new Error('Falha ao acessar banco de dados');
    }
  } catch (error) {
    console.error('Erro ao obter dados do usuário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter dados do usuário',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Atualiza os dados do usuário
 * @route   PUT /api/auth/update
 * @access  Private
 */
exports.updateUser = async (req, res) => {
  try {
    const { name, email } = req.body;
    
    // Verifica se os campos foram fornecidos
    if (!name && !email) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum dado fornecido para atualização'
      });
    }

    // Prepara os dados para atualização
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;

    // Atualiza o usuário
    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar usuário',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};