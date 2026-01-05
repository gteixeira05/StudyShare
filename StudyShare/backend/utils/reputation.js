import User from '../models/User.model.js';
import Material from '../models/Material.model.js';

/**
 * Atualizar reputação do autor de um material
 * Recalcula a reputação total do autor baseado em todos os seus materiais
 * Reputação = média das avaliações (estrelas) de todos os materiais
 */
export async function updateMaterialAuthorReputation(materialId) {
  try {
    const material = await Material.findById(materialId);
    if (!material || !material.author) return;

    // Recalcular reputação total do autor
    await recalculateUserReputation(material.author);
    
    return true;
  } catch (error) {
    console.error('Erro ao atualizar reputação:', error);
    return false;
  }
}

/**
 * Recalcular reputação total de um utilizador baseado em todos os seus materiais
 * Reputação = média das avaliações (estrelas) de todos os materiais
 */
export async function recalculateUserReputation(userId) {
  try {
    const materials = await Material.find({
      author: userId,
      isActive: true,
      isApproved: true
    });

    if (materials.length === 0) {
      // Se não tem materiais, reputação é 0
      await User.findByIdAndUpdate(userId, {
        reputation: 0
      });
      return 0;
    }

    // Calcular a média das avaliações de todos os materiais
    let totalRating = 0;
    let materialsWithRatings = 0;

    for (const material of materials) {
      // Se o material tem avaliações, adicionar à média
      if (material.rating && material.rating.average > 0 && material.rating.count > 0) {
        totalRating += material.rating.average;
        materialsWithRatings++;
      }
    }

    // Calcular média geral (se houver materiais com avaliações)
    let averageReputation = 0;
    if (materialsWithRatings > 0) {
      averageReputation = totalRating / materialsWithRatings;
    }

    // Arredondar para 2 casas decimais
    averageReputation = Math.round(averageReputation * 100) / 100;

    // Atualizar reputação do utilizador
    await User.findByIdAndUpdate(userId, {
      reputation: averageReputation
    });

    return averageReputation;
  } catch (error) {
    console.error('Erro ao recalcular reputação:', error);
    return 0;
  }
}

