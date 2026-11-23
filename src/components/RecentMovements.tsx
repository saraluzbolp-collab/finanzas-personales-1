import { motion } from 'motion/react';
import { ShoppingCart, Bus, Clapperboard, Coffee, ChevronRight, Banknote } from 'lucide-react';
import { BudgetData, Category, IncomeCategory } from '@/src/types';

interface RecentMovementsProps {
  data: BudgetData;
}

const CategoryIcon = ({ category, type }: { category: Category | IncomeCategory, type?: 'expense' | 'income' }) => {
  if (type === 'income') return <Banknote className="w-4 h-4 text-emerald-600" />;
  
  switch (category) {
    case 'Alimentación': return <ShoppingCart className="w-4 h-4 text-orange-600" />;
    case 'Transporte': return <Bus className="w-4 h-4 text-blue-600" />;
    case 'Entretenimiento': return <Clapperboard className="w-4 h-4 text-purple-600" />;
    default: return <Coffee className="w-4 h-4 text-slate-600" />;
  }
};

export default function RecentMovements({ data, onRegisterExpense, onViewAll, onSelect }: RecentMovementsProps & { onRegisterExpense: () => void, onViewAll: () => void, onSelect: (m: any) => void }) {
  const hasExpenses = data.recentMovements.some(m => m.type === 'expense');
  const totalRecent = data.recentMovements.reduce((sum, m) => sum + m.amount, 0);

  if (!hasExpenses) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-3xl p-10 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center h-full min-h-[400px] transition-colors duration-200"
      >
        <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-3xl mb-6">
          <ShoppingCart className="w-12 h-12 text-slate-300 dark:text-slate-500" />
        </div>
        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Aún no hay gastos este mes</h3>
        <p className="text-slate-400 dark:text-slate-400 font-medium mb-8 max-w-[280px]">Registra el primero y empieza a ver en qué se va la plata</p>
        <button 
          onClick={onRegisterExpense}
          className="bg-[#5B3DF5] text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-indigo-100 dark:shadow-none hover:bg-[#4a32c8] transition-all flex items-center gap-2"
        >
          <ShoppingCart className="w-5 h-5" />
          Registrar tu primer gasto
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 h-full flex flex-col transition-colors duration-200"
    >
      <div className="mb-8 flex justify-between items-center">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Últimos Gastos</h3>
        <button 
          onClick={onViewAll}
          className="flex items-center gap-1 text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white transition-colors text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg"
        >
          Ver todos
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      <div className="flex-grow overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest border-b border-slate-50 dark:border-slate-800">
              <th className="pb-4 font-bold">Descripción</th>
              <th className="pb-4 font-bold text-right">Monto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
            {data.recentMovements.slice(0, 5).map((movement, index) => (
              <motion.tr 
                key={movement.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                onClick={() => onSelect(movement)}
                className="group cursor-pointer"
              >
                <td className="py-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg transition-colors ${movement.type === 'income' ? 'bg-emerald-50 dark:bg-emerald-500/15 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-500/25' : 'bg-slate-50 dark:bg-slate-800 group-hover:bg-yellow-50 dark:group-hover:bg-yellow-500/15'}`}>
                      <CategoryIcon category={movement.category} type={movement.type} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{movement.description}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase">
                        {movement.category} {movement.type === 'income' && <span className="text-emerald-500 ml-1">• Ingreso</span>}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-4 text-right font-bold transition-colors">
                  <span className={movement.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}>
                    {movement.type === 'income' ? '+' : '-'} $ {movement.amount.toLocaleString('es-CO')}
                  </span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Total últimos</span>
        <span className="text-lg font-black text-slate-900 dark:text-white">$ {totalRecent.toLocaleString('es-CO')}</span>
      </div>
    </motion.div>
  );
}
