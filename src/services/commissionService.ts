export interface CommissionCollaborator {
  id: string;
  nome: string;
  percentage: number;
}

export interface CommissionSimulationParams {
  totalValue: number;
  collaborators: CommissionCollaborator[];
  taxPercentage: number;
}

export interface CommissionCollaboratorShare extends CommissionCollaborator {
  value: number;
}

export interface CommissionSimulationResult {
  totalValue: number;
  taxValue: number;
  grossRevenueAfterTaxes: number;
  collaboratorsShare: CommissionCollaboratorShare[];
  totalCollaboratorsValue: number;
  officeNetRevenue: number;
}

export const commissionService = {
  simulate: (params: CommissionSimulationParams): CommissionSimulationResult => {
    const { totalValue, collaborators, taxPercentage } = params;
    
    // 1. Calculate taxes based on gross value
    const taxValue = (totalValue * taxPercentage) / 100;
    
    const grossRevenueAfterTaxes = totalValue - taxValue;
    
    let totalCollaboratorsValue = 0;
    
    // 2. Calculate collaborator shares based on gross value
    const collaboratorsShare = collaborators.map(c => {
      const value = (totalValue * c.percentage) / 100;
      totalCollaboratorsValue += value;
      return { ...c, value };
    });
    
    // 3. Extrapolate final net revenue for the office
    const officeNetRevenue = totalValue - taxValue - totalCollaboratorsValue;

    return {
      totalValue,
      taxValue,
      grossRevenueAfterTaxes,
      collaboratorsShare,
      totalCollaboratorsValue,
      officeNetRevenue
    };
  },

  simulateInstallments: (params: CommissionSimulationParams, installments: number): CommissionSimulationResult[] => {
    const totalSim = commissionService.simulate(params);
    
    // Standard division (for exact cent distribution, the final array index can be adjusted for remainders)
    const baseValue = totalSim.totalValue / installments;
    
    return Array(installments).fill(null).map(() => commissionService.simulate({
      totalValue: baseValue,
      collaborators: params.collaborators,
      taxPercentage: params.taxPercentage
    }));
  }
};
