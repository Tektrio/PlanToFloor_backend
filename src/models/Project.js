const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Nome do cômodo é obrigatório'],
    trim: true
  },
  area: {
    type: Number,
    required: [true, 'Área do cômodo é obrigatória'],
    min: [0.1, 'Área deve ser maior que 0']
  },
  complexity: {
    type: String,
    enum: ['Baixa', 'Média', 'Alta'],
    default: 'Média'
  },
  dimensions: {
    width: Number,
    length: Number
  }
});

const MaterialSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Nome do material é obrigatório'],
    trim: true
  },
  quantity: {
    type: Number,
    required: [true, 'Quantidade é obrigatória'],
    min: [0.1, 'Quantidade deve ser maior que 0']
  },
  unit: {
    type: String,
    required: [true, 'Unidade é obrigatória'],
    enum: ['m²', 'unidade', 'pacote', 'kg', 'l']
  },
  unitPrice: {
    type: Number,
    required: [true, 'Preço unitário é obrigatório'],
    min: [0, 'Preço unitário não pode ser negativo']
  }
});

const FileSchema = new mongoose.Schema({
  filename: {
    type: String, 
    required: true
  },
  originalName: String,
  path: String,
  size: Number,
  mimetype: String,
  uploadDate: {
    type: Date,
    default: Date.now
  }
});

const ProjectSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Nome do projeto é obrigatório'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  totalArea: {
    type: Number,
    required: [true, 'Área total é obrigatória'],
    min: [0.1, 'Área total deve ser maior que 0']
  },
  type: {
    type: String,
    required: [true, 'Tipo do projeto é obrigatório'],
    enum: ['Residencial', 'Comercial', 'Industrial', 'Outro']
  },
  mainMaterial: {
    type: String,
    required: [true, 'Material principal é obrigatório']
  },
  status: {
    type: String,
    enum: ['Em andamento', 'Concluído', 'Cancelado'],
    default: 'Em andamento'
  },
  budget: {
    type: Number,
    min: [0, 'Orçamento não pode ser negativo']
  },
  deadline: {
    type: Date
  },
  rooms: [RoomSchema],
  materials: [MaterialSchema],
  files: [FileSchema],
  notes: [{ 
    text: String, 
    date: { 
      type: Date, 
      default: Date.now 
    } 
  }]
}, { 
  timestamps: true 
});

// Método para calcular custo total do projeto
ProjectSchema.methods.calculateTotalCost = function() {
  return this.materials.reduce((total, material) => {
    return total + (material.quantity * material.unitPrice);
  }, 0);
};

module.exports = mongoose.model('Project', ProjectSchema);