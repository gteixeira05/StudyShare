import User from '../models/User.model.js';
import Material from '../models/Material.model.js';

// Atualizar reputação do autor de um material
export async function updateMaterialAuthorReputation(materialId) {
  try {
    const material = await Material.findById(materialId);
    if (!material || !material.author) return;

    await recalculateUserReputation(material.author);
    return true;
  } catch (error) {
    console.error('Erro ao atualizar reputação:', error);
    return false;
  }
}

// Recalcular reputação total de um utilizador
export async function recalculateUserReputation(userId) {
  try {
    const materials = await Material.find({
      author: userId,
      isActive: true,
      isApproved: true
    });

    if (materials.length === 0) {
      await User.findByIdAndUpdate(userId, {
        reputation: 0
      });
      return 0;
    }

    let totalRating = 0;
    let materialsWithRatings = 0;

    for (const material of materials) {
      if (material.rating && material.rating.average > 0 && material.rating.count > 0) {
        totalRating += material.rating.average;
        materialsWithRatings++;
      }
    }

    let averageReputation = 0;
    if (materialsWithRatings > 0) {
      averageReputation = totalRating / materialsWithRatings;
    }

    averageReputation = Math.round(averageReputation * 100) / 100;

    await User.findByIdAndUpdate(userId, {
      reputation: averageReputation
    });

    return averageReputation;
  } catch (error) {
    console.error('Erro ao recalcular reputação:', error);
    return 0;
  }
}

