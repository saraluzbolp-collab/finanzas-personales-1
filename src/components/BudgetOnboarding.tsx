import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Wallet, ArrowRight, Loader2, LogOut, Sparkles, User as UserIcon } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

interface BudgetOnboardingProps {
  initialName: string;
  email?: string | null;
  onSaveBudget: (budget: number, displayName: string) => Promise<void>;
  onSignOut: () => Promise<void>;
}

const SUGGESTED_BUDGETS = [1500000, 2500000, 3500000, 5000000];

export default function BudgetOnboarding({
  initialName,
  email,
  onSaveBudget,
  onSignOut,
}: BudgetOnboardingProps) {
  const [displayName, setDisplayName] = useState(initialName);
  const [budget, setBudget] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsed = Number(budget);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Ingresa un presupuesto mensual válido mayor a $0.');
      return;
    }

    setIsSaving(true);
    try {
      await onSaveBudget(parsed, displayName.trim() || initialName);
    } catch (err: any) {
      setError(err?.message || 'No se pudo guardar tu presupuesto. Intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 flex flex-col justify-center items-center p-6 transition-colors">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-8 md:p-10 shadow-xl shadow-slate-200/60 dark:shadow-none border border-slate-100 dark:border-slate-800"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="p-3.5 bg-yellow-50 dark:bg-yellow-500/15 rounded-2xl">
            <Wallet className="w-7 h-7 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              type="button"
              onClick={onSignOut}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Cambiar de cuenta
            </button>
          </div>
        </div>

        <div className="mb-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-[#5B3DF5] dark:text-indigo-300 text-[10px] font-black uppercase tracking-widest mb-3">
            <Sparkles className="w-3 h-3" />
            Cuenta nueva desde cero
          </span>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            ¡Hola, {displayName || 'bienvenido'}!
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-2">
            Tu historial comienza limpio sin gastos ni movimientos previos. ¿Cuál es tu{' '}
            <strong className="text-slate-800 dark:text-slate-200">presupuesto mensual</strong> para este mes?
          </p>
          {email && (
            <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-1">{email}</p>
          )}
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-100 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              ¿Cómo quieres que te llamemos?
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                maxLength={100}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Tu nombre"
                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-[#5B3DF5] focus:bg-white dark:focus:bg-slate-800 py-3.5 pl-11 pr-4 rounded-2xl outline-none font-bold text-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Presupuesto mensual (COP)
            </label>
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-slate-400 text-2xl">
                $
              </span>
              <input
                autoFocus
                type="number"
                min={1}
                step="any"
                required
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="Ej. 2500000"
                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-[#5B3DF5] focus:bg-white dark:focus:bg-slate-800 p-5 pl-12 rounded-2xl outline-none font-black text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-2xl transition-all"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
              {SUGGESTED_BUDGETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setBudget(preset.toString())}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                    Number(budget) === preset
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border-[#5B3DF5] text-[#5B3DF5] dark:text-indigo-300'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  $ {(preset / 1000000).toFixed(1).replace('.0', '')}M
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full bg-[#5B3DF5] text-white py-4 rounded-2xl font-black text-base shadow-lg shadow-indigo-100 dark:shadow-indigo-950/50 hover:bg-[#4a32c8] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isSaving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>Guardar presupuesto y comenzar</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
