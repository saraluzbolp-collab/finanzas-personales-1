/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PiggyBank, LogOut, MessageSquare, Loader2 } from 'lucide-react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '@/src/firebase';
import {
  UserBudgetProfile,
  resolveDisplayName,
  saveInitialUserBudget,
  updateUserMonthlyBudget,
  createUserMovement,
  updateUserMovement,
  deleteUserMovement,
} from '@/src/lib/firestoreBudget';
import SummaryCards from '@/src/components/SummaryCards';
import QuickActions from '@/src/components/QuickActions';
import ExpensesChart from '@/src/components/ExpensesChart';
import RecentMovements from '@/src/components/RecentMovements';
import MovementsList from '@/src/components/MovementsList';
import MovementDetail from '@/src/components/MovementDetail';
import RegisterExpense from '@/src/components/RegisterExpense';
import RegisterIncome from '@/src/components/RegisterIncome';
import AssistantDrawer from '@/src/components/AssistantDrawer';
import AuthScreen from '@/src/components/AuthScreen';
import BudgetOnboarding from '@/src/components/BudgetOnboarding';
import ThemeToggle from '@/src/components/ThemeToggle';
import { View, Movement, BudgetData } from '@/src/types';

interface StoredMovement extends Movement {
  createdAtMs: number;
}

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

function parseMovementDate(dateStr: string, fallbackMs: number): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
    const [y, m, d] = dateStr.trim().split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const parts = dateStr.trim().toLowerCase().replace(/\./g, '').split(/\s+/);
  if (parts.length >= 3) {
    const day = parseInt(parts[0], 10);
    const month = SPANISH_MONTHS[parts[1]];
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && month !== undefined && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  return new Date(fallbackMs || Date.now());
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profile, setProfile] = useState<UserBudgetProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [movements, setMovements] = useState<StoredMovement[]>([]);
  const [asyncError, setAsyncError] = useState<Error | null>(null);

  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [detailBackView, setDetailBackView] = useState<View>('movements');
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null);
  const [isEditingDetail, setIsEditingDetail] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  // Throw Firestore listener errors so ErrorBoundary catches them cleanly
  if (asyncError) {
    throw asyncError;
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
      setProfile(null);
      setProfileLoaded(false);
      setMovements([]);
      setSelectedMovement(null);
      setCurrentView('dashboard');
      setIsAssistantOpen(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authReady || !user) return;

    const userPath = `users/${user.uid}`;
    const unsubProfile = onSnapshot(
      doc(db, 'users', user.uid),
      (snapshot) => {
        if (snapshot.exists()) {
          setProfile(snapshot.data() as UserBudgetProfile);
        } else {
          setProfile(null);
        }
        setProfileLoaded(true);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.GET, userPath);
        } catch (err) {
          setAsyncError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    );

    const movementsPath = `users/${user.uid}/movements`;
    const movementsQuery = query(
      collection(db, 'users', user.uid, 'movements'),
      where('uid', '==', user.uid)
    );

    const unsubMovements = onSnapshot(
      movementsQuery,
      (snapshot) => {
        const items: StoredMovement[] = snapshot.docs.map((d) => {
          const data = d.data();
          const createdAtVal = data.createdAt as Timestamp | undefined;
          const createdAtMs =
            createdAtVal && typeof createdAtVal.toMillis === 'function'
              ? createdAtVal.toMillis()
              : Date.now();
          return {
            id: d.id,
            amount: Number(data.amount) || 0,
            category: data.category,
            date: data.date,
            description: data.description,
            type: data.type === 'income' ? 'income' : 'expense',
            paymentMethod: data.paymentMethod,
            observations: data.observations,
            createdAtMs,
          };
        });
        items.sort((a, b) => b.createdAtMs - a.createdAtMs);
        setMovements(items);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, movementsPath);
        } catch (err) {
          setAsyncError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    );

    return () => {
      unsubProfile();
      unsubMovements();
    };
  }, [authReady, user]);

  const budgetData: BudgetData = useMemo(() => {
    const baseBudget = profile?.monthlyBudget ?? 0;

    const totalSpent = movements
      .filter((m) => m.type === 'expense')
      .reduce((sum, m) => sum + m.amount, 0);

    const totalIncome = movements
      .filter((m) => m.type === 'income')
      .reduce((sum, m) => sum + m.amount, 0);

    const adjustedBudget = baseBudget + totalIncome;

    const expenseMovements = movements.filter((m) => m.type === 'expense');
    const dailyMap = new Map<string, { label: string; timestamp: number; amount: number }>();

    expenseMovements.forEach((m) => {
      const d = parseMovementDate(m.date, m.createdAtMs);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
      const label = `${d.getDate()} ${d.toLocaleString('es-CO', { month: 'short' })}`;
      const existing = dailyMap.get(key);
      if (existing) {
        existing.amount += m.amount;
      } else {
        dailyMap.set(key, { label, timestamp: d.getTime(), amount: m.amount });
      }
    });

    const sortedDays = Array.from(dailyMap.values()).sort((a, b) => a.timestamp - b.timestamp);
    const dailyAvg =
      sortedDays.length > 0
        ? Math.round(sortedDays.reduce((acc, item) => acc + item.amount, 0) / sortedDays.length)
        : 0;

    const dailyExpenses = sortedDays.map((item) => ({
      day: item.label,
      amount: item.amount,
      average: dailyAvg,
    }));

    return {
      monthlyBudget: adjustedBudget,
      totalSpent,
      availableBalance: adjustedBudget - totalSpent,
      recentMovements: movements,
      dailyExpenses,
    };
  }, [movements, profile]);

  const handleSaveInitialBudget = async (budget: number, displayName: string) => {
    if (!user) return;
    await saveInitialUserBudget(user, budget, displayName, Boolean(profile));
  };

  const handleUpdateBudget = async (newBudget: number) => {
    if (!user) return;
    try {
      await updateUserMonthlyBudget(user, newBudget);
    } catch (err) {
      setAsyncError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  const handleSaveMovement = async (newMovement: Omit<Movement, 'id'>) => {
    if (!user) return;
    try {
      await createUserMovement(user, newMovement);
      setCurrentView('dashboard');
    } catch (err) {
      setAsyncError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  const handleUpdateMovement = async (
    movementId: string,
    updates: Partial<Pick<Movement, 'amount' | 'category' | 'date' | 'description' | 'paymentMethod' | 'observations'>>
  ) => {
    if (!user) {
      throw new Error('Debes iniciar sesión para editar movimientos.');
    }
    await updateUserMovement(user, movementId, updates);
  };

  const handleDeleteMovement = async (movementId: string) => {
    if (!user) return;
    await deleteUserMovement(user, movementId);
    if (selectedMovement?.id === movementId) {
      setSelectedMovement(null);
      setIsEditingDetail(false);
      if (currentView === 'detail') {
        setCurrentView(detailBackView);
      }
    }
  };

  const handleSelectMovement = (m: Movement, editMode = false, backTo: View = 'movements') => {
    setSelectedMovement(m);
    setIsEditingDetail(editMode);
    setDetailBackView(backTo);
    setCurrentView('detail');
  };

  const activeSelectedMovement = selectedMovement
    ? movements.find((m) => m.id === selectedMovement.id) ?? selectedMovement
    : null;

  const handleSignOut = async () => {
    await signOut(auth);
  };

  if (!authReady || (user && !profileLoaded)) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 flex flex-col items-center justify-center gap-4 transition-colors duration-200">
        <div className="bg-[#5B3DF5] p-4 rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none">
          <PiggyBank className="w-8 h-8 text-white" />
        </div>
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-bold text-sm">
          <Loader2 className="w-4 h-4 animate-spin text-[#5B3DF5]" />
          <span>Cargando tu presupuesto...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  const displayName = profile?.displayName || resolveDisplayName(user);

  if (!profile || !profile.hasConfiguredBudget) {
    return (
      <BudgetOnboarding
        initialName={displayName}
        email={user.email}
        onSaveBudget={handleSaveInitialBudget}
        onSignOut={handleSignOut}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 pb-12 transition-colors duration-200">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 py-4 mb-8 sticky top-0 z-50 transition-colors duration-200">
        <div className="max-w-[1400px] mx-auto px-6 md:px-8 flex items-center justify-between gap-4">
          <div
            className="flex items-center gap-4 cursor-pointer group"
            onClick={() => setCurrentView('dashboard')}
          >
            <div className="bg-[#5B3DF5] p-3 rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none group-hover:scale-105 transition-transform">
              <PiggyBank className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white leading-tight">Mi Presupuesto</h1>
              <p className="text-[10px] text-slate-400 dark:text-slate-400 font-black uppercase tracking-widest">
                Dashboard Financiero
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            <div className="hidden md:flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/60 rounded-full border border-emerald-100 dark:border-emerald-800/60">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                Sincronizado
              </span>
            </div>

            <ThemeToggle />

            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/80 pl-3 pr-2 py-1.5 rounded-2xl border border-slate-200/70 dark:border-slate-700">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-black text-slate-800 dark:text-slate-100 leading-tight">{displayName}</p>
                {user.email && (
                  <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-400 truncate max-w-[160px]">
                    {user.email}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                title="Cerrar sesión"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all shadow-sm"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 md:px-8">
        <AnimatePresence mode="wait">
          {currentView === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <SummaryCards data={budgetData} onUpdateBudget={handleUpdateBudget} />

              <QuickActions
                onRegisterExpense={() => setCurrentView('register')}
                onRegisterIncome={() => setCurrentView('register-income')}
              />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                {movements.some((m) => m.type === 'expense') && (
                  <section className="lg:col-span-7">
                    <ExpensesChart data={budgetData} />
                  </section>
                )}
                <section
                  className={
                    movements.some((m) => m.type === 'expense') ? 'lg:col-span-5' : 'lg:col-span-12'
                  }
                >
                  <RecentMovements
                    data={budgetData}
                    onRegisterExpense={() => setCurrentView('register')}
                    onViewAll={() => setCurrentView('movements')}
                    onSelect={(m) => handleSelectMovement(m, false, 'dashboard')}
                  />
                </section>
              </div>
            </motion.div>
          )}

          {currentView === 'movements' && (
            <motion.div
              key="movements"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <MovementsList
                movements={movements}
                onBack={() => setCurrentView('dashboard')}
                onSelectMovement={(m, editMode) => handleSelectMovement(m, Boolean(editMode), 'movements')}
                onRegisterExpense={() => setCurrentView('register')}
                onUpdateMovement={handleUpdateMovement}
                onDeleteMovement={handleDeleteMovement}
              />
            </motion.div>
          )}

          {currentView === 'detail' && (
            <motion.div
              key="detail"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <MovementDetail
                movement={activeSelectedMovement}
                onBack={() => {
                  setIsEditingDetail(false);
                  setCurrentView(detailBackView);
                }}
                onUpdate={handleUpdateMovement}
                onDelete={handleDeleteMovement}
                initialEditing={isEditingDetail}
              />
            </motion.div>
          )}

          {currentView === 'register' && (
            <motion.div
              key="register"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <RegisterExpense
                onBack={() => setCurrentView('dashboard')}
                onSave={handleSaveMovement}
              />
            </motion.div>
          )}

          {currentView === 'register-income' && (
            <motion.div
              key="register-income"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <RegisterIncome
                onBack={() => setCurrentView('dashboard')}
                onSave={handleSaveMovement}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating AI Assistant Trigger */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsAssistantOpen(true)}
        className="fixed bottom-8 right-8 bg-[#5B3DF5] text-white p-4 rounded-2xl shadow-2xl shadow-indigo-200 dark:shadow-indigo-950/60 z-50 flex items-center gap-3 group"
      >
        <div className="bg-white/20 p-2 rounded-xl">
          <MessageSquare className="w-6 h-6" />
        </div>
        <span className="font-black text-sm pr-2">Asistente AI</span>
      </motion.button>

      {/* Assistant Drawer (isolated per accountId) */}
      <AssistantDrawer
        accountId={user.uid}
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        onRegisterExpense={handleSaveMovement}
        onUpdateExpense={handleUpdateMovement}
        onDeleteExpense={handleDeleteMovement}
        expenses={movements.filter((m) => m.type === 'expense')}
        availableBalance={budgetData.availableBalance}
        userName={displayName}
      />

      <footer className="mt-16 text-center">
        <p className="text-[10px] text-slate-300 dark:text-slate-600 font-black tracking-[0.2em] uppercase">
          Mi Presupuesto Mensual • Dashboard Financiero
        </p>
      </footer>
    </div>
  );
}
