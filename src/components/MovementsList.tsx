import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  ShoppingCart,
  Bus,
  Clapperboard,
  Coffee,
  Lightbulb,
  User,
  ChevronRight,
  Banknote,
  Edit3,
  Trash2,
  Loader2,
  Save,
  X,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Movement, Category, IncomeCategory } from '@/src/types';

interface MovementsListProps {
  movements: Movement[];
  onBack: () => void;
  onSelectMovement: (m: Movement, editMode?: boolean) => void;
  onRegisterExpense: () => void;
  onUpdateMovement: (
    id: string,
    updates: Partial<Pick<Movement, 'amount' | 'category' | 'date' | 'description' | 'paymentMethod' | 'observations'>>
  ) => Promise<void>;
  onDeleteMovement: (id: string) => Promise<void>;
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
  if (type === 'income') return <Banknote className="w-4 h-4 text-emerald-600" />;

  switch (category) {
    case 'Alimentación':
      return <ShoppingCart className="w-4 h-4 text-orange-600" />;
    case 'Transporte':
      return <Bus className="w-4 h-4 text-blue-600" />;
    case 'Entretenimiento':
      return <Clapperboard className="w-4 h-4 text-purple-600" />;
    case 'Servicios':
      return <Lightbulb className="w-4 h-4 text-yellow-600" />;
    case 'Ropa':
      return <User className="w-4 h-4 text-pink-600" />;
    default:
      return <Coffee className="w-4 h-4 text-slate-600" />;
  }
};

export default function MovementsList({
  movements,
  onBack,
  onSelectMovement,
  onRegisterExpense,
  onUpdateMovement,
  onDeleteMovement,
}: MovementsListProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState('');
  const [editObservations, setEditObservations] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!feedbackMessage) return;
    const timer = window.setTimeout(() => setFeedbackMessage(null), 4500);
    return () => window.clearTimeout(timer);
  }, [feedbackMessage]);

  const startEditing = (m: Movement) => {
    setConfirmDeleteId(null);
    setEditError(null);
    setFeedbackMessage(null);
    setEditingId(m.id);
    setEditDescription(m.description || '');
    setEditAmount(String(m.amount ?? ''));
    setEditCategory(m.category || '');
    setEditDate(toDateInputValue(m.date));
    setEditPaymentMethod(m.paymentMethod || '');
    setEditObservations(m.observations || '');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent, m: Movement) => {
    e.preventDefault();
    setEditError(null);

    const trimmedDesc = editDescription.trim();
    const trimmedCategory = editCategory.trim();
    const parsedAmount = Number(editAmount);

    if (!trimmedDesc) {
      setEditError('La descripción del movimiento es obligatoria.');
      return;
    }
    if (!trimmedCategory) {
      setEditError('Selecciona una categoría válida.');
      return;
    }
    if (!editAmount.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setEditError('El valor del movimiento debe ser numérico y mayor que cero.');
      return;
    }
    if (parsedAmount > 1_000_000_000_000) {
      setEditError('El valor ingresado supera el límite permitido.');
      return;
    }
    if (!editDate) {
      setEditError('La fecha del movimiento es obligatoria.');
      return;
    }

    setIsSavingEdit(true);
    try {
      await onUpdateMovement(m.id, {
        description: trimmedDesc,
        amount: parsedAmount,
        category: trimmedCategory as Category | IncomeCategory,
        date: editDate,
        paymentMethod: editPaymentMethod.trim() || undefined,
        observations: editObservations.trim() || undefined,
      });
      setEditingId(null);
      setFeedbackMessage(`Cambios guardados correctamente en "${trimmedDesc}".`);
    } catch (err) {
      setEditError(extractReadableError(err, 'No se pudieron guardar los cambios. Intenta de nuevo.'));
    } finally {
      setIsSavingEdit(false);
    }
  };

  if (movements.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-4xl mx-auto"
      >
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors mb-8 font-bold"
        >
          <ArrowLeft className="w-5 h-5" />
          Dashboard
        </button>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-16 border border-slate-100 dark:border-slate-800 shadow-xl flex flex-col items-center justify-center text-center transition-colors duration-200">
          <div className="bg-slate-50 dark:bg-slate-800 p-8 rounded-full mb-8">
            <ShoppingCart className="w-16 h-16 text-slate-300 dark:text-slate-500" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4">Tus gastos van a vivir aquí</h2>
          <p className="text-slate-400 dark:text-slate-400 font-bold text-lg mb-10 max-w-md">
            cada vez que pagues algo, lo registras y aparece en esta lista
          </p>
          <button
            onClick={onRegisterExpense}
            className="bg-[#5B3DF5] text-white px-10 py-5 rounded-2xl font-black text-lg shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-[#4a32c8] transition-all flex items-center gap-3"
          >
            <ShoppingCart className="w-6 h-6" />
            Registrar gasto
          </button>
        </div>
      </motion.div>
    );
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDeleteMovement(id);
      setConfirmDeleteId(null);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="max-w-4xl mx-auto"
    >
      <div className="flex justify-between items-center mb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors font-bold"
        >
          <ArrowLeft className="w-5 h-5" />
          Dashboard
        </button>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">Historial de Movimientos</h2>
      </div>

      {feedbackMessage && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            aria-label="Cerrar aviso"
            className="p-1 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden transition-colors duration-200">
        <div className="divide-y divide-slate-50 dark:divide-slate-800">
          {movements.map((m, i) => {
            const isConfirming = confirmDeleteId === m.id;
            const isDeleting = deletingId === m.id;
            const isEditing = editingId === m.id;

            const baseCategories = m.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
            const availableCategories = baseCategories.includes(editCategory as any)
              ? baseCategories
              : [editCategory, ...baseCategories].filter(Boolean);
            const availablePaymentMethods =
              editPaymentMethod && !PAYMENT_METHODS.includes(editPaymentMethod)
                ? [editPaymentMethod, ...PAYMENT_METHODS]
                : PAYMENT_METHODS;

            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => {
                  if (!isEditing) onSelectMovement(m, false);
                }}
                className={`p-5 sm:p-6 transition-colors ${
                  isEditing
                    ? 'bg-slate-50/70 dark:bg-slate-800/40'
                    : 'flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer group'
                }`}
              >
                {isEditing ? (
                  <form
                    noValidate
                    onSubmit={(e) => handleSaveEdit(e, m)}
                    onClick={(e) => e.stopPropagation()}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2.5 rounded-2xl ${
                            m.type === 'income' ? 'bg-emerald-50 dark:bg-emerald-500/15' : 'bg-white dark:bg-slate-800'
                          }`}
                        >
                          <CategoryIcon category={editCategory || m.category} type={m.type} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 dark:text-white">
                            Editar {m.type === 'income' ? 'ingreso' : 'gasto'}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Modifica los datos y guarda los cambios
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={isSavingEdit}
                        onClick={cancelEditing}
                        aria-label="Cancelar edición"
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {editError && (
                      <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-100 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{editError}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                          Descripción
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={200}
                          disabled={isSavingEdit}
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          placeholder="Nombre o descripción del movimiento"
                          className="w-full bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 focus:border-[#5B3DF5] px-3.5 py-2.5 rounded-xl outline-none font-bold text-sm text-slate-800 dark:text-white transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                          Valor (COP)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-slate-400 text-sm">
                            $
                          </span>
                          <input
                            type="number"
                            min={1}
                            step="any"
                            required
                            disabled={isSavingEdit}
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 focus:border-[#5B3DF5] py-2.5 pl-8 pr-3.5 rounded-xl outline-none font-black text-sm text-slate-900 dark:text-white transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                          Categoría
                        </label>
                        <select
                          disabled={isSavingEdit}
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 focus:border-[#5B3DF5] px-3.5 py-2.5 rounded-xl outline-none font-bold text-sm text-slate-700 dark:text-slate-100 transition-all"
                        >
                          {availableCategories.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                          Fecha
                        </label>
                        <input
                          type="date"
                          required
                          disabled={isSavingEdit}
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 focus:border-[#5B3DF5] px-3.5 py-2.5 rounded-xl outline-none font-bold text-sm text-slate-700 dark:text-slate-100 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                          Medio de pago (Opcional)
                        </label>
                        <select
                          disabled={isSavingEdit}
                          value={editPaymentMethod}
                          onChange={(e) => setEditPaymentMethod(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 focus:border-[#5B3DF5] px-3.5 py-2.5 rounded-xl outline-none font-bold text-sm text-slate-700 dark:text-slate-100 transition-all"
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
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                        Observaciones (Opcional)
                      </label>
                      <textarea
                        rows={2}
                        maxLength={500}
                        disabled={isSavingEdit}
                        value={editObservations}
                        onChange={(e) => setEditObservations(e.target.value)}
                        placeholder="Notas adicionales..."
                        className="w-full bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 focus:border-[#5B3DF5] px-3.5 py-2.5 rounded-xl outline-none font-medium text-sm text-slate-700 dark:text-slate-100 transition-all resize-none"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2.5 pt-1">
                      <button
                        type="button"
                        disabled={isSavingEdit}
                        onClick={cancelEditing}
                        className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5"
                      >
                        <X className="w-3.5 h-3.5" />
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingEdit}
                        className="px-5 py-2 rounded-xl bg-[#5B3DF5] text-white text-xs font-black shadow-md shadow-indigo-100 dark:shadow-none hover:bg-[#4a32c8] transition-all flex items-center gap-1.5 disabled:opacity-60"
                      >
                        {isSavingEdit ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Save className="w-3.5 h-3.5" />
                        )}
                        Guardar
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-3 rounded-2xl group-hover:bg-white dark:group-hover:bg-slate-700 transition-colors ${
                          m.type === 'income' ? 'bg-emerald-50 dark:bg-emerald-500/15' : 'bg-slate-50 dark:bg-slate-800'
                        }`}
                      >
                        <CategoryIcon category={m.category} type={m.type} />
                      </div>
                      <div>
                        <p className="font-black text-slate-900 dark:text-white">{m.description}</p>
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest mt-1">
                          {m.category} • {m.date}
                        </p>
                      </div>
                    </div>

                    <div
                      className="flex items-center justify-between sm:justify-end gap-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span
                        className={`text-lg font-black ${
                          m.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {m.type === 'income' ? '+' : ''} $ {m.amount.toLocaleString('es-CO')}
                      </span>

                      {isConfirming ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={() => handleDelete(m.id)}
                            className="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-black hover:bg-rose-700 flex items-center gap-1"
                          >
                            {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Eliminar'}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => startEditing(m)}
                            title="Editar"
                            aria-label={`Editar ${m.description}`}
                            className="p-2 rounded-xl text-slate-400 hover:text-[#5B3DF5] dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(m.id)}
                            title="Eliminar"
                            aria-label={`Eliminar ${m.description}`}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onSelectMovement(m, false)}
                            title="Ver detalle"
                            aria-label={`Ver detalle de ${m.description}`}
                            className="p-1 text-slate-300 dark:text-slate-600 group-hover:text-slate-900 dark:group-hover:text-white transition-colors"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
