import { useState } from 'react';
import { motion } from 'motion/react';
import { Wallet, TrendingDown, Landmark } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { BudgetData } from '@/src/types';

interface SummaryCardsProps {
  data: BudgetData;
  onUpdateBudget: (value: number) => void;
}

const DotPattern = () => (
  <div className="absolute top-4 right-4 grid grid-cols-4 gap-1 opacity-20">
    {[...Array(16)].map((_, i) => (
      <div key={i} className="w-1 h-1 bg-slate-400 rounded-full" />
    ))}
  </div>
);

export default function SummaryCards({ data, onUpdateBudget }: SummaryCardsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempBudget, setTempBudget] = useState(data.monthlyBudget.toString());
  const spentPercentage = data.monthlyBudget > 0 ? (data.totalSpent / data.monthlyBudget) * 100 : 0;
  const isPositive = data.availableBalance >= 0;

  const handleBudgetSubmit = () => {
    const val = parseFloat(tempBudget);
    if (!isNaN(val) && val > 0) {
      onUpdateBudget(val);
    }
    setIsEditing(false);
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Monthly Budget Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between relative overflow-hidden h-48 group transition-colors duration-200"
      >
        <DotPattern />
        <div className="flex items-center gap-4 mb-auto">
          <div className="p-3 bg-yellow-50 dark:bg-yellow-500/15 rounded-2xl">
            <Wallet className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-slate-500 dark:text-slate-400 font-semibold text-base">Presupuesto Mensual</span>
            <span className="text-[10px] text-slate-300 dark:text-slate-500 font-bold uppercase tracking-widest">Click para editar</span>
          </div>
        </div>
        <div>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-slate-400">$</span>
              <input 
                autoFocus
                type="number"
                value={tempBudget}
                onChange={(e) => setTempBudget(e.target.value)}
                onBlur={handleBudgetSubmit}
                onKeyDown={(e) => e.key === 'Enter' && handleBudgetSubmit()}
                className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight bg-slate-50 dark:bg-slate-800 border-b-2 border-yellow-400 outline-none w-full"
              />
            </div>
          ) : (
            <div 
              onClick={() => {
                setTempBudget(data.monthlyBudget.toString());
                setIsEditing(true);
              }}
              className="text-3xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight cursor-pointer hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors"
            >
              $ {data.monthlyBudget.toLocaleString('es-CO')} COP
            </div>
          )}
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, spentPercentage)}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="bg-yellow-400 h-full rounded-full"
            />
          </div>
        </div>
      </motion.div>

      {/* Total Spent Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between relative overflow-hidden h-48 transition-colors duration-200"
      >
        <DotPattern />
        <div className="flex items-center gap-4 mb-auto">
          <div className="p-3 bg-yellow-50 dark:bg-yellow-500/15 rounded-2xl">
            <TrendingDown className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          </div>
          <span className="text-slate-500 dark:text-slate-400 font-semibold text-base">Total Gastado</span>
        </div>
        <div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mb-1 tracking-tight">
            $ {data.totalSpent.toLocaleString('es-CO')} COP
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden mt-4">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, spentPercentage)}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="bg-yellow-400 h-full rounded-full"
            />
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-400 mt-2 text-center font-medium">
            {spentPercentage.toFixed(1)}% del presupuesto
          </div>
        </div>
      </motion.div>

      {/* Available Balance Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className={cn(
          "p-8 rounded-3xl shadow-xl flex flex-col justify-between relative overflow-hidden h-48 border transition-all duration-500",
          isPositive 
            ? "bg-[#FCD34D] dark:bg-amber-400 shadow-yellow-100 dark:shadow-none border-yellow-300 dark:border-amber-300" 
            : "bg-rose-500 dark:bg-rose-600 shadow-rose-100 dark:shadow-none border-rose-600 dark:border-rose-500"
        )}
      >
        <DotPattern />
        <div className="flex items-center justify-between mb-auto">
          <div className="flex items-center gap-4">
            <div className={cn(
              "p-3 rounded-2xl",
              isPositive ? "bg-white/40" : "bg-white/20"
            )}>
              <Landmark className={cn("w-5 h-5", isPositive ? "text-slate-800" : "text-white")} />
            </div>
            <span className={cn("font-bold text-base", isPositive ? "text-slate-800" : "text-white")}>
              Saldo Disponible
            </span>
          </div>
          <div className={cn(
            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
            isPositive ? "bg-emerald-500 text-white" : "bg-white text-rose-600 animate-pulse"
          )}>
            {isPositive ? 'Balance positivo' : 'Balance negativo'}
          </div>
        </div>
        <div className={cn(
          "text-4xl font-black tracking-tight",
          isPositive ? "text-slate-900" : "text-white"
        )}>
          $ {data.availableBalance.toLocaleString('es-CO')} COP
        </div>
      </motion.div>
    </div>
  );
}
