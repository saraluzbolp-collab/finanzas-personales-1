import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Edit3,
  Trash2,
  Save,
  X,
  ShoppingCart,
  Bus,
  Clapperboard,
  Coffee,
  Lightbulb,
  User,
  Banknote,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Movement, Category, IncomeCategory } from '@/src/types';

interface MovementDetailProps {
  movement: Movement | null;
  onBack: () => void;
  onUpdate: (
    id: string,
    updates: Partial<Pick<Movement, 'amount' | 'category' | 'date' | 'description' | 'paymentMethod' | 'observations'>>
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  initialEditing?: boolean;
}

const EXPENSE_CATEGORIES = [
  'Alimentación',
  'Transporte',
  'Entretenimiento',
  'Servicios',
  'Ropa',
  'Salud',
  'Hogar',
  'Otros',
];

const INCOME_CATEGORIES: IncomeCategory[] = [
  'Salario',
  'Trabajo independiente',
  'Negocio',
  'Inversiones',
  'Regalo',
  'Bonificación',
  'Reembolso',
  'Otro',
];

const PAYMENT_METHODS = ['Efectivo', 'Cuenta bancaria', 'Nequi', 'Daviplata', 'Tarjeta', 'Otro'];

const SPANISH_MONTHS: Record<string, number> = {
  ene: 0,
  feb: 1,
  mar: 2,
  abr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  ago: 7,
  sep: 8,
  sept: 8,
  oct: 9,
  nov: 10,
  dic: 11,
};

function toDateInputValue(dateStr: string): string {
  const trimmed = (dateStr || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const parts = trimmed
    .toLowerCase()
    .replace(/\./g, '')
    .split(/\s+/)
    .filter((p) => p !== 'de');
  if (parts.length >= 3) {
    const day = parseInt(parts[0], 10);
    const month = SPANISH_MONTHS[parts[1]];
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && month !== undefined && !isNaN(year)) {
      return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return new Date().toLocaleDateString('en-CA');
}

function extractReadableError(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : String(err || '');
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.error) return String(parsed.error);
  } catch {
    // Not JSON
  }
  return raw || fallback;
}

const CategoryIcon = ({
  category,
  type,
}: {
  category: Category | IncomeCategory | string;
  type?: 'expense' | 'income';
}) => {
  if (type === 'income') return <Banknote className="w-6 h-6 text-emerald-600" />;

  switch (category) {
    case 'Alimentación':
      return <ShoppingCart className="w-6 h-6 text-orange-600" />;
    case 'Transporte':
      return <Bus className="w-6 h-6 text-blue-600" />;
    case 'Entretenimiento':
      return <Clapperboard className="w-6 h-6 text-purple-600" />;
    case 'Servicios':
      return <Lightbulb className="w-6 h-6 text-yellow-600" />;
    case 'Ropa':
      return <User className="w-6 h-6 text-pink-600" />;
    default:
      return <Coffee className="w-6 h-6 text-slate-600" />;
  }
};

export default function MovementDetail({
  movement,
  onBack,
  onUpdate,
  onDelete,
  initialEditing = false,
}: MovementDetailProps) {
  const [isEditing, setIsEditing] = useState(initialEditing);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const lastMovementIdRef = useRef<string | null>(null);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [observations, setObservations] = useState('');

  const syncFormFromMovement = (m: Movement) => {
    setDescription(m.description || '');
    setAmount(String(m.amount ?? ''));
    setCategory(m.category || '');
    setDate(toDateInputValue(m.date));
    setPaymentMethod(m.paymentMethod || '');
    setObservations(m.observations || '');
  };

  useEffect(() => {
    if (movement) {
      syncFormFromMovement(movement);
      if (lastMovementIdRef.current !== movement.id) {
        lastMovementIdRef.current = movement.id;
        setIsEditing(initialEditing);
        setConfirmingDelete(false);
        setError(null);
        setSuccessMessage(null);
      }
    } else {
      lastMovementIdRef.current = null;
    }
  }, [movement, initialEditing]);

  useEffect(() => {
    if (!successMessage) return;
    const timer = window.setTimeout(() => setSuccessMessage(null), 4500);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  if (!movement) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl mx-auto h-[400px] flex items-center justify-center text-center"
      >
        <p className="text-slate-400 font-bold text-lg italic">
          Selecciona un gasto en Movimientos para ver el detalle
        </p>
      </motion.div>
    );
  }

  const categories = movement.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const availableCategories = categories.includes(category as any)
    ? categories
    : [category, ...categories].filter(Boolean);
  const availablePaymentMethods =
    paymentMethod && !PAYMENT_METHODS.includes(paymentMethod)
      ? [paymentMethod, ...PAYMENT_METHODS]
      : PAYMENT_METHODS;

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const parsedAmount = Number(amount);
    if (!description.trim()) {
      setError('La descripción no puede estar vacía.');
      return;
    }
    if (!category.trim()) {
      setError('Selecciona una categoría válida.');
      return;
    }
    if (!amount.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('El monto debe ser numérico y mayor a $0.');
      return;
    }
    if (parsedAmount > 1_000_000_000_000) {
      setError('El monto supera el límite permitido.');
      return;
    }
    if (!date) {
      setError('Selecciona una fecha válida.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onUpdate(movement.id, {
        description: description.trim(),
        amount: parsedAmount,
        category: category.trim() as Category | IncomeCategory,
        date,
        paymentMethod: paymentMethod.trim() || undefined,
        observations: observations.trim() || undefined,
      });
      setIsEditing(false);
      setSuccessMessage('Cambios guardados correctamente.');
    } catch (err) {
      setError(extractReadableError(err, 'No se pudieron guardar los cambios.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await onDelete(movement.id);
    } catch (err) {
      setError(extractReadableError(err, 'No se pudo eliminar el movimiento.'));
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-2xl mx-auto"
    >
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors mb-8 font-bold"
      >
        <ArrowLeft className="w-5 h-5" />
        Volver
      </button>

      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-sm transition-colors duration-200">
        <div className="flex justify-between items-start gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div
              className={`p-4 rounded-2xl ${
                movement.type === 'income' ? 'bg-emerald-50 dark:bg-emerald-500/15' : 'bg-slate-50 dark:bg-slate-800'
              }`}
            >
              <CategoryIcon category={movement.category} type={movement.type} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                {isEditing ? 'Editar movimiento' : movement.description}
              </h2>
              <p className="text-slate-400 dark:text-slate-400 font-bold uppercase tracking-widest text-xs mt-1">
                {movement.category} • {movement.type === 'income' ? 'Ingreso' : 'Gasto'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                type="button"
                onClick={() => {
                  syncFormFromMovement(movement);
                  setIsEditing(true);
                  setConfirmingDelete(false);
                  setError(null);
                  setSuccessMessage(null);
                }}
                title="Editar movimiento"
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-[#5B3DF5] dark:hover:text-indigo-400 transition-colors text-xs font-bold"
              >
                <Edit3 className="w-4 h-4" />
                <span>Editar</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setConfirmingDelete((prev) => !prev);
                setIsEditing(false);
              }}
              title="Eliminar movimiento"
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-600 dark:hover:text-rose-400 transition-colors text-xs font-bold"
            >
              <Trash2 className="w-4 h-4" />
              <span>Borrar</span>
            </button>
          </div>
        </div>

        {successMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-100 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {confirmingDelete && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div>
              <p className="font-black text-rose-900 dark:text-rose-200 text-sm">
                ¿Eliminar este {movement.type === 'income' ? 'ingreso' : 'gasto'}?
              </p>
              <p className="text-xs text-rose-700 dark:text-rose-300 font-medium mt-0.5">
                Se borrará de forma permanente y se actualizará tu saldo disponible.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setConfirmingDelete(false)}
                className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-rose-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-black hover:bg-rose-700 flex items-center gap-1.5 disabled:opacity-60"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Sí, eliminar
              </button>
            </div>
          </motion.div>
        )}

        {isEditing ? (
          <form noValidate onSubmit={handleSaveEdit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Descripción
              </label>
              <input
                type="text"
                required
                maxLength={200}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-[#5B3DF5] focus:bg-white dark:focus:bg-slate-800 p-4 rounded-2xl outline-none font-bold text-slate-800 dark:text-white transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Monto (COP)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">$</span>
                  <input
                    type="number"
                    min={1}
                    step="any"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-[#5B3DF5] focus:bg-white dark:focus:bg-slate-800 p-4 pl-9 rounded-2xl outline-none font-black text-slate-900 dark:text-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Fecha
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-[#5B3DF5] focus:bg-white dark:focus:bg-slate-800 p-4 rounded-2xl outline-none font-bold text-slate-700 dark:text-slate-100 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Categoría
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-[#5B3DF5] focus:bg-white dark:focus:bg-slate-800 p-4 rounded-2xl outline-none font-bold text-slate-700 dark:text-slate-100 transition-all"
                >
                  {availableCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Medio de pago (Opcional)
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-[#5B3DF5] focus:bg-white dark:focus:bg-slate-800 p-4 rounded-2xl outline-none font-bold text-slate-700 dark:text-slate-100 transition-all"
                >
                  <option value="">Sin especificar</option>
                  {availablePaymentMethods.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Observaciones (Opcional)
              </label>
              <textarea
                rows={3}
                maxLength={500}
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Notas adicionales..."
                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-[#5B3DF5] focus:bg-white dark:focus:bg-slate-800 p-4 rounded-2xl outline-none font-medium text-slate-700 dark:text-slate-100 transition-all resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  syncFormFromMovement(movement);
                  setIsEditing(false);
                  setError(null);
                }}
                className="px-5 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 rounded-2xl bg-[#5B3DF5] text-white font-black text-sm shadow-lg shadow-indigo-100 dark:shadow-none hover:bg-[#4a32c8] transition-all flex items-center gap-2 disabled:opacity-60"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar cambios
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Monto Total</p>
                <p
                  className={`text-3xl font-black ${
                    movement.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                  }`}
                >
                  {movement.type === 'income' ? '+' : ''} $ {movement.amount.toLocaleString('es-CO')} COP
                </p>
              </div>
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                  Fecha de Registro
                </p>
                <p className="text-xl font-bold text-slate-700 dark:text-slate-200">{movement.date}</p>
              </div>
            </div>

            {movement.paymentMethod && (
              <div className="pt-8 border-t border-slate-50 dark:border-slate-800">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                  Medio de Pago
                </p>
                <p className="text-lg font-bold text-slate-700 dark:text-slate-200">{movement.paymentMethod}</p>
              </div>
            )}

            {movement.observations && (
              <div className="pt-8 border-t border-slate-50 dark:border-slate-800">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                  Observaciones
                </p>
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl text-slate-600 dark:text-slate-300 font-medium">
                  {movement.observations}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
