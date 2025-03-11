const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const Project = require('../models/Project');

/**
 * @desc    Processa e extrai dados de arquivos enviados
 * @route   POST /api/upload
 * @access  Private
 */
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum arquivo enviado'
      });
    }

    let extractedData = {};
    const filePath = req.file.path;
    const fileInfo = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype
    };

    // Processamento de acordo com o tipo de arquivo
    if (req.file.mimetype === 'application/pdf') {
      try {
        // Processamento de PDF
        const dataBuffer = fs.readFileSync(filePath);
        const pdfData = await pdfParse(dataBuffer);
        
        // Simulação de dados extraídos do PDF
        // Em uma implementação real, aqui teríamos algoritmos para extração de informações do PDF
        extractedData = {
          type: 'pdf',
          pageCount: pdfData.numpages,
          text: pdfData.text.substring(0, 500) + '...', // Texto parcial para visualização
          rooms: [
            { name: 'Sala', area: 450, complexity: 'Média' },
            { name: 'Quarto 1', area: 220, complexity: 'Baixa' },
            { name: 'Quarto 2', area: 220, complexity: 'Baixa' },
            { name: 'Quarto 3', area: 180, complexity: 'Baixa' },
            { name: 'Corredor', area: 180, complexity: 'Alta' }
          ],
          totalArea: 1250,
          materials: [
            { name: 'Piso Laminado', quantity: 1300, unit: 'm²', unitPrice: 45.90 },
            { name: 'Manta', quantity: 1300, unit: 'm²', unitPrice: 5.50 },
            { name: 'Rodapé', quantity: 230, unit: 'm', unitPrice: 15.75 },
            { name: 'Acabamentos', quantity: 12, unit: 'unidade', unitPrice: 22.90 }
          ]
        };
      } catch (error) {
        console.error('Erro ao processar PDF:', error);
        extractedData = {
          type: 'pdf',
          error: 'Falha ao processar conteúdo do PDF'
        };
      }
    } else if (req.file.mimetype.startsWith('image/')) {
      // Processamento de imagem
      // Em uma implementação real, aqui teríamos algoritmos de visão computacional
      extractedData = {
        type: 'image',
        rooms: [
          { name: 'Ambiente 1', area: 320, complexity: 'Média' },
          { name: 'Ambiente 2', area: 180, complexity: 'Baixa' }
        ],
        totalArea: 500,
        materials: [
          { name: 'Piso Laminado', quantity: 525, unit: 'm²', unitPrice: 45.90 },
          { name: 'Manta', quantity: 525, unit: 'm²', unitPrice: 5.50 },
          { name: 'Rodapé', quantity: 120, unit: 'm', unitPrice: 15.75 }
        ]
      };
    } else {
      // Outros tipos de arquivo (CAD, etc.)
      extractedData = {
        type: 'outro',
        message: 'Tipo de arquivo detectado, mas o processamento requer análise manual',
        rooms: [
          { name: 'Ambiente desconhecido', area: 0, complexity: 'Média' }
        ],
        totalArea: 0,
        materials: []
      };
    }

    res.json({ 
      success: true, 
      message: 'Arquivo processado com sucesso',
      fileInfo,
      data: extractedData
    });
  } catch (error) {
    console.error('Erro ao processar arquivo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar arquivo',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno'
    });
  }
};

/**
 * @desc    Anexa um arquivo a um projeto existente
 * @route   POST /api/upload/project/:id
 * @access  Private
 */
exports.uploadToProject = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum arquivo enviado'
      });
    }

    // Verificar se o projeto existe
    const project = await Project.findById(req.params.id);
    if (!project) {
      // Remover o arquivo carregado, já que o projeto não existe
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        success: false,
        message: 'Projeto não encontrado'
      });
    }

    // Verificar se o usuário é dono do projeto
    if (project.user.toString() !== req.user.id) {
      // Remover o arquivo carregado
      fs.unlinkSync(req.file.path);
      return res.status(403).json({
        success: false,
        message: 'Não autorizado a modificar este projeto'
      });
    }

    // Adicionar arquivo ao projeto
    const fileInfo = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype
    };

    project.files.push(fileInfo);
    await project.save();

    res.status(201).json({
      success: true,
      message: 'Arquivo adicionado ao projeto',
      project
    });
  } catch (error) {
    console.error('Erro ao anexar arquivo ao projeto:', error);
    // Tentar remover o arquivo em caso de erro
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Erro ao remover arquivo:', unlinkError);
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Erro ao anexar arquivo ao projeto',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno'
    });
  }
};

/**
 * @desc    Exclui um arquivo de um projeto
 * @route   DELETE /api/upload/project/:id/file/:fileId
 * @access  Private
 */
exports.deleteProjectFile = async (req, res) => {
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
        message: 'Não autorizado a modificar este projeto'
      });
    }

    // Encontrar o arquivo no projeto
    const fileIndex = project.files.findIndex(file => 
      file._id.toString() === req.params.fileId
    );

    if (fileIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Arquivo não encontrado no projeto'
      });
    }

    // Obter o arquivo a ser removido
    const fileToRemove = project.files[fileIndex];
    const filePath = fileToRemove.path;

    // Remover arquivo do sistema de arquivos
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remover arquivo do projeto
    project.files.splice(fileIndex, 1);
    await project.save();

    res.json({
      success: true,
      message: 'Arquivo removido com sucesso'
    });
  } catch (error) {
    console.error('Erro ao remover arquivo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao remover arquivo',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno'
    });
  }
};