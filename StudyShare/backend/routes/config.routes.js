import express from 'express';
import SystemConfig from '../models/SystemConfig.model.js';

const router = express.Router();

// Obter configuração do sistema
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    
    if (!['availableYears', 'materialTypes'].includes(key)) {
      return res.status(400).json({
        message: 'Chave de configuração inválida'
      });
    }

    let config = await SystemConfig.findOne({ key });
    
    // Se não existir, retornar valores padrão
    if (!config) {
      if (key === 'availableYears') {
        return res.json({
          key: 'availableYears',
          values: [
            { value: 1, label: '1º Ano' },
            { value: 2, label: '2º Ano' },
            { value: 3, label: '3º Ano' },
            { value: 4, label: '4º Ano' },
            { value: 5, label: '5º Ano' }
          ]
        });
      } else if (key === 'materialTypes') {
        return res.json({
          key: 'materialTypes',
          values: [
            { value: 'Apontamento', label: 'Apontamento' },
            { value: 'Resumo', label: 'Resumo' },
            { value: 'Exercícios', label: 'Exercícios' },
            { value: 'Exame', label: 'Exame' },
            { value: 'Slides', label: 'Slides' }
          ]
        });
      }
    }

    // Filtrar apenas valores ativos e ordenar
    const activeValues = config.values
      .filter(v => v.isActive)
      .sort((a, b) => a.order - b.order)
      .map(v => ({
        value: v.value,
        label: v.label
      }));

    res.json({
      key: config.key,
      values: activeValues
    });
  } catch (error) {
    console.error('Erro ao obter configuração:', error);
    res.status(500).json({
      message: 'Erro ao buscar configuração'
    });
  }
});

export default router;

