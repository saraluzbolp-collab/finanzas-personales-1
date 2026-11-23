import { useState, FormEvent } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Save, Banknote, Calendar, CreditCard, AlignLeft, CheckCircle2 } from 'lucide-react';
import { Movement, IncomeCategory } from '@/src/types';

interface RegisterIncomeProps {
  onBack: () => void;
  onSave: (m: Omit<Movement, 'id'>) => void;
}

const INCOME_CATEGORIES: IncomeCategory[] = [
  'Salario', 'Trabajo independiente', 'Negocio', 'Inversiones', 
  'Regalo', 'Bonificación', 'Reembolso', 'Otro'
];

const PAYMENT_METHODS = [
  'Efectivo', 'Cuenta bancaria', 'Nequi', 'Daviplata', 'Tarjeta', 'Otro'
];

export default function RegisterIncome({ onBack, onSave }: RegisterIncomeProps) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<IncomeCategory>('Salario');
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [observations, setObservations] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !category || !paymentMethod || !date) return;
    
    if (Number(amount) <= 0) {
      alert('El valor del ingreso debe ser mayor a cero');
      return;
    }

    if (!isVerifying) {
      setIsVerifying(true);
      return;
    }

    const d = new Date(date);
    const formattedDate = `${d.getDate()} ${d.toLocaleString('es-CO', { month: 'short' })} ${d.getFullYear()}`;
    
    onSave({
      description,
      amount: Number(amount),
      category,
      date: formattedDate,
      type: 'income',
      paymentMethod,
      observations
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
          <div className="p-3 bg-emerald-50 dark:bg-emerald-500/15 rounded-2xl">
            <Banknote className="w-6 h-6 text-emerald-500 dark:text-emerald-400" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">Registrar nuevo ingreso</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {!isVerifying ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Banknote className="w-3 h-3" /> Valor del ingreso (COP)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-lg">$</span>
                    <input 
                      autoFocus
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0"
                      className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800 p-4 pl-10 rounded-2xl outline-none font-black text-slate-900 dark:text-white text-xl transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">¿Qué ingreso es?</label>
                  <input 
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ej. Salario Junio"
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800 p-4 rounded-2xl outline-none font-bold text-slate-700 dark:text-white transition-all"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Calendar className="w-3 h-3" /> Fecha
                  </label>
                  <input 
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800 p-4 rounded-2xl outline-none font-bold text-slate-700 dark:text-slate-100 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <CreditCard className="w-3 h-3" /> Medio de pago
                  </label>
                  <select 
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800 p-4 rounded-2xl outline-none font-bold text-slate-700 dark:text-slate-100 transition-all appearance-none cursor-pointer"
                  >
                    {PAYMENT_METHODS.map(method => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Categoría</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {INCOME_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`p-2.5 rounded-xl text-[10px] font-bold border-2 transition-all text-center ${
                        category === cat 
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300' 
                        : 'border-transparent bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <AlignLeft className="w-3 h-3" /> Observaciones (Opcional)
                </label>
                <textarea 
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Detalles adicionales..."
                  rows={3}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800 p-4 rounded-2xl outline-none font-medium text-slate-700 dark:text-slate-100 transition-all resize-none"
                />
              </div>
            </>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-50 dark:bg-emerald-950/40 p-6 rounded-2xl border-2 border-emerald-100 dark:border-emerald-800/60 mb-8"
            >
              <div className="flex items-center gap-3 mb-4 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
                <p className="font-black">Confirma el ingreso</p>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold text-xs uppercase">Descripción</span>
                  <span className="text-slate-700 dark:text-slate-200 font-black">{description}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold text-xs uppercase">Monto</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-black text-xl">$ {Number(amount).toLocaleString('es-CO')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold text-xs uppercase">Categoría</span>
                  <span className="text-slate-700 dark:text-slate-200 font-bold">{category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold text-xs uppercase">Medio de Pago</span>
                  <span className="text-slate-700 dark:text-slate-200 font-bold">{paymentMethod}</span>
                </div>
              </div>
            </motion.div>
          )}

          <div className="flex flex-col gap-3">
            <button 
              type="submit"
              className="w-full p-5 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 shadow-lg bg-emerald-500 text-white shadow-emerald-100 dark:shadow-none hover:bg-emerald-600"
            >
              <Save className="w-6 h-6" />
              {isVerifying ? 'Confirmar y Guardar' : 'Guardar Ingreso'}
            </button>
            <button 
              type="button"
              onClick={onBack}
              className="w-full p-4 rounded-2xl font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all text-sm"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
