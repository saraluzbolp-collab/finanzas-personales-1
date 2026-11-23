import { motion } from 'motion/react';
import { ShoppingCart, Banknote } from 'lucide-react';

interface QuickActionsProps {
  onRegisterExpense: () => void;
  onRegisterIncome: () => void;
}

export default function QuickActions({ onRegisterExpense, onRegisterIncome }: QuickActionsProps) {
  return (
    <div className="flex flex-col items-center justify-center w-full my-8 md:my-10">
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-[1px] flex-1 bg-slate-100 dark:bg-slate-800"></div>
          <span className="text-[10px] font-black text-slate-300 dark:text-slate-500 uppercase tracking-[0.2em]">Acciones rápidas</span>
          <div className="h-[1px] flex-1 bg-slate-100 dark:bg-slate-800"></div>
        </div>
        
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 w-full">
          <motion.button 
            whileHover={{ y: -2, shadow: '0 20px 25px -5px rgb(16 185 129 / 0.1), 0 8px 10px -6px rgb(16 185 129 / 0.1)' }}
            whileTap={{ scale: 0.98 }}
            onClick={onRegisterIncome}
            className="flex-1 w-full md:w-auto h-16 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black flex items-center justify-center gap-3 transition-all shadow-lg shadow-emerald-100 dark:shadow-none group"
          >
            <div className="p-2 bg-white/20 rounded-xl group-hover:scale-110 transition-transform">
              <Banknote className="w-5 h-5" />
            </div>
            <span className="text-base tracking-tight">Registrar Ingreso</span>
          </motion.button>

          <motion.button 
            whileHover={{ y: -2, shadow: '0 20px 25px -5px rgb(91 61 245 / 0.1), 0 8px 10px -6px rgb(91 61 245 / 0.1)' }}
            whileTap={{ scale: 0.98 }}
            onClick={onRegisterExpense}
            className="flex-1 w-full md:w-auto h-16 bg-[#5B3DF5] hover:bg-[#4a32c8] text-white rounded-2xl font-black flex items-center justify-center gap-3 transition-all shadow-lg shadow-indigo-100 dark:shadow-none group"
          >
            <div className="p-2 bg-white/20 rounded-xl group-hover:scale-110 transition-transform">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <span className="text-base tracking-tight">Registrar Gasto</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
}
