const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { protect, checkProjectOwnership } = require('../middleware/auth');
const Project = require('../models/Project');

// Todas as rotas de projetos são protegidas por autenticação
router.use(protect);

// Rotas de projetos
router.get('/', projectController.getProjects);
router.post('/', projectController.createProject);
router.get('/:id', checkProjectOwnership(Project), projectController.getProject);
router.put('/:id', checkProjectOwnership(Project), projectController.updateProject);
router.delete('/:id', checkProjectOwnership(Project), projectController.deleteProject);

// Rotas para gerenciar cômodos e materiais
router.post('/:id/rooms', checkProjectOwnership(Project), projectController.addRoom);
router.post('/:id/materials', checkProjectOwnership(Project), projectController.addMaterial);

module.exports = router;