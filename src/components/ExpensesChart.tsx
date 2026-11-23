import { motion } from 'motion/react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronDown } from 'lucide-react';
import { BudgetData } from '@/src/types';
import { useTheme } from '@/src/hooks/useTheme';

interface ExpensesChartProps {
  data: BudgetData;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-xl border border-slate-100 dark:border-slate-700">
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{payload[0].payload.day}</p>
        <p className="text-sm font-bold text-slate-900 dark:text-white">
          {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

export default function ExpensesChart({ data }: ExpensesChartProps) {
  const { isDark } = useTheme();

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors duration-200"
    >
      <div className="flex justify-between items-start mb-8">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Gastos Diarios</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Visualización del comportamiento de gastos durante el mes</p>
        </div>
        <button className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          Últimos 30 días
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-6 mb-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-[#FCD34D] rounded-full" />
          <span className="text-slate-500 dark:text-slate-400 font-medium text-xs">Gastado (COP)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-0 border-t-2 border-dashed border-slate-400" />
          <span className="text-slate-500 dark:text-slate-400 font-medium text-xs">Promedio diario</span>
        </div>
      </div>
      
      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data.dailyExpenses} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#1e293b' : '#f1f5f9'} />
            <XAxis 
              dataKey="day" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
              tickFormatter={(value) => value === 0 ? '0' : `${value / 1000}K`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: isDark ? '#1e293b' : '#f8fafc' }} />
            <Bar 
              dataKey="amount" 
              fill="#FCD34D" 
              radius={[4, 4, 0, 0]} 
              barSize={12}
            />
            <Line 
              type="monotone" 
              dataKey="average" 
              stroke="#94a3b8" 
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 3, fill: '#64748b', strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
