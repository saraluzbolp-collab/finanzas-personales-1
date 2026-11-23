import React from 'react';
import { AlertTriangle, RefreshCw, LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth, firebaseConfig } from '@/src/firebase';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
  isQuotaError: boolean;
}

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState;
  declare props: { children: React.ReactNode };

  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = {
      hasError: false,
      message: '',
      isQuotaError: false,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let message = error.message || 'Ocurrió un error inesperado.';
    let isQuotaError = false;

    try {
      const parsed = JSON.parse(message);
      if (parsed?.error) {
        message = parsed.error;
      }
    } catch {
      // Plain error string
    }

    if (
      message.toLowerCase().includes('quota exceeded') ||
      message.toLowerCase().includes('resource-exhausted')
    ) {
      isQuotaError = true;
    }

    return {
      hasError: true,
      message,
      isQuotaError,
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleSignOut = async () => {
    try {
      await signOut(auth);
    } finally {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      const upgradeUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/databases/${firebaseConfig.firestoreDatabaseId}/data?openUpgradeDialog=true`;

      return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full border border-slate-100 dark:border-slate-800 shadow-xl text-center space-y-5">
            <div className="w-14 h-14 bg-rose-50 dark:bg-rose-950/50 text-rose-500 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">
                {this.state.isQuotaError
                  ? 'Límite diario de base de datos alcanzado'
                  : 'Algo salió mal al cargar tus datos'}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium break-words">
                {this.state.isQuotaError
                  ? 'Se superó la cuota gratuita diaria de lecturas en Firestore. La cuota se restablece al día siguiente.'
                  : this.state.message}
              </p>
              {this.state.isQuotaError && (
                <a
                  href={upgradeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block mt-3 text-xs font-bold text-[#5B3DF5] dark:text-indigo-400 underline"
                >
                  Ver detalles de la base de datos en Firebase Console
                </a>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 bg-[#5B3DF5] text-white py-3 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-[#4a32c8] transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Reintentar
              </button>
              <button
                onClick={this.handleSignOut}
                className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Salir
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
