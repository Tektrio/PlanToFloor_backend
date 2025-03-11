const Project = require('../models/Project');

/**
 * @desc    Obtém todos os projetos do usuário
 * @route   GET /api/projects
 * @access  Private
 */
exports.getProjects = async (req, res) => {
  try {
    // Parâmetros de paginação e ordenação
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    
    // Parâmetros de filtro
    const filterType = req.query.type;
    const filterStatus = req.query.status;
    const searchQuery = req.query.search;
    
    // Modo de demonstração (quando MongoDB não está disponível)
    if (false && process.env.NODE_ENV === 'development' && req.user.mode === 'demo') {
      // Projetos simulados para demonstração
      const mockProjects = [
        {
          _id: 'proj_demo_1',
          user: req.user.id,
          name: 'Apartamento Residencial',
          description: 'Projeto de reforma para apartamento',
          totalArea: 120,
          type: 'Residencial',
          mainMaterial: 'Piso Laminado',
          status: 'Em andamento',
          budget: 15000,
          rooms: [
            { name: 'Sala', area: 45, complexity: 'Média' },
            { name: 'Quarto 1', area: 25, complexity: 'Baixa' },
            { name: 'Quarto 2', area: 20, complexity: 'Baixa' },
            { name: 'Cozinha', area: 15, complexity: 'Alta' },
            { name: 'Banheiro', area: 8, complexity: 'Alta' }
          ],
          materials: [
            { name: 'Piso Laminado 7mm', quantity: 120, unit: 'm²', unitPrice: 45.90 },
            { name: 'Manta', quantity: 120, unit: 'm²', unitPrice: 5.50 },
            { name: 'Rodapé', quantity: 85, unit: 'm', unitPrice: 15.75 }
          ],
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          _id: 'proj_demo_2',
          user: req.user.id,
          name: 'Escritório Comercial',
          description: 'Projeto para novo escritório',
          totalArea: 80,
          type: 'Comercial',
          mainMaterial: 'Piso Vinílico',
          status: 'Concluído',
          budget: 12000,
          rooms: [
            { name: 'Recepção', area: 20, complexity: 'Média' },
            { name: 'Sala 1', area: 15, complexity: 'Baixa' },
            { name: 'Sala 2', area: 15, complexity: 'Baixa' },
            { name: 'Sala de Reuniões', area: 25, complexity: 'Média' },
            { name: 'Copa', area: 5, complexity: 'Baixa' }
          ],
          materials: [
            { name: 'Piso Vinílico Colado', quantity: 80, unit: 'm²', unitPrice: 89.90 },
            { name: 'Adesivo', quantity: 20, unit: 'kg', unitPrice: 25.00 },
            { name: 'Perfil de Acabamento', quantity: 35, unit: 'm', unitPrice: 18.50 }
          ],
          createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];
      
      // Filtrar projetos mockados
      let filteredProjects = [...mockProjects];
      
      if (filterType) {
        filteredProjects = filteredProjects.filter(p => p.type === filterType);
      }
      
      if (filterStatus) {
        filteredProjects = filteredProjects.filter(p => p.status === filterStatus);
      }
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredProjects = filteredProjects.filter(p => 
          p.name.toLowerCase().includes(query) || 
          p.description.toLowerCase().includes(query) ||
          p.mainMaterial.toLowerCase().includes(query)
        );
      }
      
      // Simular paginação
      const totalCount = filteredProjects.length;
      const totalPages = Math.ceil(totalCount / limit);
      const paginatedProjects = filteredProjects.slice(skip, skip + limit);

      return res.json({
        success: true,
        count: totalCount,
        projects: paginatedProjects,
        pagination: {
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        },
        mode: 'demo'
      });
    }

    // Código real para MongoDB quando disponível
    try {
      // Log para depuração
      console.log('Usuário atual:', req.user);
      
      // Em modo de demonstração, não usamos filtro de usuário para ver todos os projetos
      let filter = req.user.mode === 'demo' ? {} : { user: req.user.id };
      
      if (filterType) {
        filter.type = filterType;
      }
      
      if (filterStatus) {
        filter.status = filterStatus;
      }
      
      if (searchQuery) {
        filter.$or = [
          { name: { $regex: searchQuery, $options: 'i' } },
          { description: { $regex: searchQuery, $options: 'i' } },
          { mainMaterial: { $regex: searchQuery, $options: 'i' } }
        ];
      }
      
      // Contar total de documentos para paginação
      const totalCount = await Project.countDocuments(filter);
      const totalPages = Math.ceil(totalCount / limit);
      
      // Buscar projetos paginados
      const projects = await Project.find(filter)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit);

      res.json({
        success: true,
        count: totalCount,
        projects,
        pagination: {
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      });
    } catch (dbError) {
      console.warn('Erro de banco de dados:', dbError);
      throw new Error('Falha ao buscar projetos no banco de dados');
    }
  } catch (error) {
    console.error('Erro ao buscar projetos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar projetos',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Obtém um projeto específico
 * @route   GET /api/projects/:id
 * @access  Private
 */
exports.getProject = async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projeto não encontrado'
      });
    }

    res.json({
      success: true,
      project
    });
  } catch (error) {
    console.error('Erro ao buscar projeto:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar projeto',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Cria um novo projeto
 * @route   POST /api/projects
 * @access  Private
 */
exports.createProject = async (req, res) => {
  try {
    const { 
      name, 
      description, 
      totalArea, 
      type, 
      mainMaterial, 
      budget,
      deadline,
      rooms,
      materials
    } = req.body;

    // Verificar campos obrigatórios
    if (!name || !totalArea || !type || !mainMaterial) {
      return res.status(400).json({
        success: false,
        message: 'Por favor, forneça todos os campos obrigatórios'
      });
    }

    // Modo de demonstração (quando MongoDB não está disponível)
    if (process.env.NODE_ENV === 'development' && req.user.mode === 'demo') {
      // Criar ID baseado em timestamp e um valor aleatório
      const projectId = 'proj_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      
      // Criar objeto de projeto simulado
      const mockProject = {
        _id: projectId,
        user: req.user.id,
        name,
        description: description || '',
        totalArea,
        type,
        mainMaterial,
        status: 'Em andamento',
        budget: budget || 0,
        deadline: deadline || null,
        rooms: rooms || [],
        materials: materials || [],
        files: [],
        notes: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Responder com projeto simulado
      return res.status(201).json({
        success: true,
        project: mockProject,
        mode: 'demo'
      });
    }

    // Código real para MongoDB quando disponível
    try {
      // Criar o projeto
      const project = await Project.create({
        user: req.user.id,
        name,
        description,
        totalArea,
        type,
        mainMaterial,
        budget,
        deadline,
        rooms: rooms || [],
        materials: materials || []
      });

      res.status(201).json({
        success: true,
        project
      });
    } catch (dbError) {
      console.warn('Erro ao criar projeto:', dbError);
      throw new Error('Falha ao criar projeto no banco de dados');
    }
  } catch (error) {
    console.error('Erro ao criar projeto:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar projeto',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Atualiza um projeto
 * @route   PUT /api/projects/:id
 * @access  Private
 */
exports.updateProject = async (req, res) => {
  try {
    const { 
      name, 
      description, 
      totalArea, 
      type, 
      mainMaterial,
      status,
      budget,
      deadline,
      rooms,
      materials
    } = req.body;

    // Construir objeto de atualização
    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (totalArea) updateData.totalArea = totalArea;
    if (type) updateData.type = type;
    if (mainMaterial) updateData.mainMaterial = mainMaterial;
    if (status) updateData.status = status;
    if (budget !== undefined) updateData.budget = budget;
    if (deadline) updateData.deadline = deadline;
    if (rooms) updateData.rooms = rooms;
    if (materials) updateData.materials = materials;

    // Verificar se o projeto existe
    let project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projeto não encontrado'
      });
    }

    // Verificar se o usuário é dono do projeto
    if (project.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Não autorizado a atualizar este projeto'
      });
    }

    // Atualizar o projeto
    project = await Project.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      project
    });
  } catch (error) {
    console.error('Erro ao atualizar projeto:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar projeto',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Deleta um projeto
 * @route   DELETE /api/projects/:id
 * @access  Private
 */
exports.deleteProject = async (req, res) => {
  try {
    // Verificar se o projeto existe
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projeto não encontrado'
      });
    }

    // Verificar se o usuário é dono do projeto
    if (project.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Não autorizado a deletar este projeto'
      });
    }

    // Deletar o projeto
    await project.deleteOne();

    res.json({
      success: true,
      message: 'Projeto deletado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao deletar projeto:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar projeto',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Adiciona um cômodo a um projeto
 * @route   POST /api/projects/:id/rooms
 * @access  Private
 */
exports.addRoom = async (req, res) => {
  try {
    const { name, area, complexity, dimensions } = req.body;

    // Verificar campos obrigatórios
    if (!name || !area) {
      return res.status(400).json({
        success: false,
        message: 'Por favor, forneça nome e área do cômodo'
      });
    }

    // Verificar se o projeto existe
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projeto não encontrado'
      });
    }

    // Verificar se o usuário é dono do projeto
    if (project.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Não autorizado a modificar este projeto'
      });
    }

    // Adicionar cômodo
    project.rooms.push({
      name,
      area,
      complexity: complexity || 'Média',
      dimensions
    });

    // Salvar projeto
    await project.save();

    res.status(201).json({
      success: true,
      project
    });
  } catch (error) {
    console.error('Erro ao adicionar cômodo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao adicionar cômodo ao projeto',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Adiciona um material a um projeto
 * @route   POST /api/projects/:id/materials
 * @access  Private
 */
exports.addMaterial = async (req, res) => {
  try {
    const { name, quantity, unit, unitPrice } = req.body;

    // Verificar campos obrigatórios
    if (!name || !quantity || !unit || !unitPrice) {
      return res.status(400).json({
        success: false,
        message: 'Por favor, forneça todos os campos do material'
      });
    }

    // Verificar se o projeto existe
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projeto não encontrado'
      });
    }

    // Verificar se o usuário é dono do projeto
    if (project.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Não autorizado a modificar este projeto'
      });
    }

    // Adicionar material
    project.materials.push({
      name,
      quantity,
      unit,
      unitPrice
    });

    // Salvar projeto
    await project.save();

    res.status(201).json({
      success: true,
      project
    });
  } catch (error) {
    console.error('Erro ao adicionar material:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao adicionar material ao projeto',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};