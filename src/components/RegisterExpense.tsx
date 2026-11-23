import { useState, FormEvent } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Save, ShoppingCart, Bus, Clapperboard, Lightbulb, User, Coffee, CheckCircle2 } from 'lucide-react';
import { Movement, Category } from '@/src/types';

interface RegisterExpenseProps {
  onBack: () => void;
  onSave: (m: Omit<Movement, 'id'>) => void;
}

const CATEGORIES: Category[] = ['Alimentación', 'Transporte', 'Entretenimiento', 'Servicios', 'Ropa'];

export default function RegisterExpense({ onBack, onSave }: RegisterExpenseProps) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Category>('Alimentación');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!description || !amount) return;
    
    if (!isVerifying) {
      setIsVerifying(true);
      return;
    }

    const today = new Date();
    const formattedDate = `${today.getDate()} ${today.toLocaleString('es-CO', { month: 'short' })} ${today.getFullYear()}`;
    
    onSave({
      description,
      amount: Number(amount),
      category,
      date: formattedDate,
      type: 'expense'
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-xl mx-auto"
    >
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors mb-8 font-bold"
      >
        <ArrowLeft className="w-5 h-5" />
        Cancelar
      </button>

      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-xl transition-colors duration-200">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-500/15 rounded-2xl">
            <ShoppingCart className="w-6 h-6 text-[#5B3DF5] dark:text-indigo-400" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">Registrar nuevo gasto</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {!isVerifying ? (
            <>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">¿En qué gastaste?</label>
                <input 
                  autoFocus
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ej. Supermercado, Almuerzo..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-[#5B3DF5] focus:bg-white dark:focus:bg-slate-800 p-4 rounded-2xl outline-none font-bold text-slate-700 dark:text-white transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Monto (COP)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-lg">$</span>
                  <input 
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-[#5B3DF5] focus:bg-white dark:focus:bg-slate-800 p-4 pl-10 rounded-2xl outline-none font-black text-slate-900 dark:text-white text-xl transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Categoría</label>
                <div className="grid grid-cols-3 gap-3">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`p-3 rounded-xl text-xs font-bold border-2 transition-all flex flex-col items-center gap-2 ${
                        category === cat 
                        ? 'border-[#5B3DF5] bg-indigo-50 dark:bg-indigo-950/60 text-[#5B3DF5] dark:text-indigo-300' 
                        : 'border-transparent bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-indigo-50 dark:bg-indigo-950/40 p-6 rounded-2xl border-2 border-indigo-100 dark:border-indigo-800/60 mb-8"
            >
              <div className="flex items-center gap-3 mb-4 text-[#5B3DF5] dark:text-indigo-400">
                <CheckCircle2 className="w-6 h-6" />
                <p className="font-black">Verifica los datos</p>
              </div>
              <div className="space-y-2">
                <p className="text-slate-600 dark:text-slate-200 font-bold"><span className="text-slate-400">Gasto:</span> {description}</p>
                <p className="text-slate-600 dark:text-slate-200 font-bold"><span className="text-slate-400">Monto:</span> $ {Number(amount).toLocaleString('es-CO')}</p>
                <p className="text-slate-600 dark:text-slate-200 font-bold"><span className="text-slate-400">Categoría:</span> {category}</p>
              </div>
            </motion.div>
          )}

          <button 
            type="submit"
            className="w-full p-5 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 shadow-lg bg-[#5B3DF5] text-white shadow-indigo-100 dark:shadow-none hover:bg-[#4a32c8]"
          >
            <Save className="w-6 h-6" />
            {isVerifying ? 'Confirmar y Guardar' : 'Revisar Gasto'}
          </button>
        </form>
      </div>
    </motion.div>
  );
}
