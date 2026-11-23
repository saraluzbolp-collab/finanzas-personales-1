export type Category = 'Alimentación' | 'Transporte' | 'Servicios' | 'Ropa' | 'Entretenimiento';

export type IncomeCategory = 'Salario' | 'Trabajo independiente' | 'Negocio' | 'Inversiones' | 'Regalo' | 'Bonificación' | 'Reembolso' | 'Otro';

export type View = 'dashboard' | 'movements' | 'detail' | 'register' | 'register-income';

export interface Movement {
  id: string;
  amount: number;
  category: Category | IncomeCategory;
  date: string;
  description: string;
  type: 'expense' | 'income';
  paymentMethod?: string;
  observations?: string;
}

export interface BudgetData {
  monthlyBudget: number;
  totalSpent: number;
  availableBalance: number;
  recentMovements: Movement[];
  dailyExpenses: { day: string; amount: number; average: number }[];
}

export const MOCK_DATA: BudgetData = {
  monthlyBudget: 3500000,
  totalSpent: 0,
  availableBalance: 3500000,
  recentMovements: [],
  dailyExpenses: []
};
