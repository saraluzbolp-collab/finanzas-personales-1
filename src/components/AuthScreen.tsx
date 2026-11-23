import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  PiggyBank,
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth, googleProvider } from '@/src/firebase';
import ThemeToggle from './ThemeToggle';

type AuthMode = 'login' | 'register';

function mapAuthError(err: any): string {
  const code = err?.code || '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Correo o contraseña incorrectos. Verifica tus datos e intenta de nuevo.';
    case 'auth/email-already-in-use':
      return 'Ya existe una cuenta registrada con este correo electrónico.';
    case 'auth/invalid-email':
      return 'El formato del correo electrónico no es válido.';
    case 'auth/weak-password':
      return 'La contraseña debe tener al menos 6 caracteres.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos fallidos. Espera unos minutos antes de volver a intentar.';
    case 'auth/popup-closed-by-user':
      return 'Se cerró la ventana de Google antes de completar el acceso.';
    case 'auth/popup-blocked':
      return 'El navegador bloqueó la ventana emergente de Google. Permite las ventanas emergentes e intenta de nuevo.';
    case 'auth/operation-not-allowed':
      return 'El inicio de sesión con correo y contraseña aún no está activado en Firebase Authentication (Authentication > Sign-in method).';
    case 'auth/network-request-failed':
      return 'Error de red. Verifica tu conexión a internet e intenta de nuevo.';
    default:
      return err?.message || 'No se pudo completar la autenticación. Intenta de nuevo.';
  }
}

export default function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Ingresa tu correo electrónico y contraseña.');
      return;
    }

    if (mode === 'register' && password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, trimmedEmail, password);
      } else {
        const credential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
        const displayName = name.trim() || trimmedEmail.split('@')[0];
        if (credential.user && displayName) {
          await updateProfile(credential.user, { displayName: displayName.slice(0, 100) });
        }
      }
    } catch (err: any) {
      setError(mapAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setInfoMessage(null);
    setIsGoogleLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      setError(mapAuthError(err));
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    setError(null);
    setInfoMessage(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Escribe tu correo electrónico arriba para enviarte el enlace de recuperación.');
      return;
    }
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      setInfoMessage('Te enviamos un correo para restablecer tu contraseña. Revisa tu bandeja de entrada.');
    } catch (err: any) {
      setError(mapAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const busy = isLoading || isGoogleLoading;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 flex flex-col justify-center items-center p-6 relative transition-colors">
      <div className="fixed top-4 right-4 z-20">
        <ThemeToggle />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        {/* Brand Header */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="bg-[#5B3DF5] p-3.5 rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-indigo-950/50">
            <PiggyBank className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">Mi Presupuesto</h1>
            <p className="text-[11px] text-slate-400 dark:text-slate-400 font-black uppercase tracking-widest">
              Control Financiero Personal
            </p>
          </div>
        </div>

        {/* Auth Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl shadow-slate-200/60 dark:shadow-none border border-slate-100 dark:border-slate-800">
          {/* Mode Tabs */}
          <div className="grid grid-cols-2 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-700 mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
                setInfoMessage(null);
              }}
              className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                mode === 'login'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm border border-slate-100 dark:border-slate-700'
                  : 'text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
                setInfoMessage(null);
              }}
              className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                mode === 'register'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm border border-slate-100 dark:border-slate-700'
                  : 'text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              Crear cuenta
            </button>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              {mode === 'login' ? 'Bienvenido de vuelta' : 'Crea tu cuenta personal'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
              {mode === 'login'
                ? 'Accede a tu presupuesto y movimientos privados.'
                : 'Empieza desde cero y guarda tus finanzas de forma segura.'}
            </p>
          </div>

          {/* Google Fast Login */}
          <button
            type="button"
            disabled={busy}
            onClick={handleGoogleSignIn}
            className="w-full py-3.5 px-4 rounded-2xl border-2 border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 hover:border-slate-200 dark:hover:border-slate-600 transition-all flex items-center justify-center gap-3 font-bold text-slate-700 dark:text-slate-100 text-sm shadow-sm disabled:opacity-60"
          >
            {isGoogleLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-[#5B3DF5]" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                />
              </svg>
            )}
            <span>Entrar rápido con Google</span>
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100 dark:border-slate-800" />
            </div>
            <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
              <span className="bg-white dark:bg-slate-900 px-3 text-slate-400">o con tu correo</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-100 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {infoMessage && (
            <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{infoMessage}</span>
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Tu nombre
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Sara López"
                    maxLength={100}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-[#5B3DF5] focus:bg-white dark:focus:bg-slate-800 py-3.5 pl-11 pr-4 rounded-2xl outline-none font-bold text-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nombre@correo.com"
                  className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-[#5B3DF5] focus:bg-white dark:focus:bg-slate-800 py-3.5 pl-11 pr-4 rounded-2xl outline-none font-bold text-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Contraseña
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    disabled={busy}
                    className="text-[11px] font-bold text-[#5B3DF5] dark:text-indigo-400 hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-[#5B3DF5] focus:bg-white dark:focus:bg-slate-800 py-3.5 pl-11 pr-12 rounded-2xl outline-none font-bold text-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                  aria-label="Mostrar u ocultar contraseña"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-[#5B3DF5] text-white py-4 rounded-2xl font-black text-sm shadow-lg shadow-indigo-100 dark:shadow-indigo-950/50 hover:bg-[#4a32c8] transition-all flex items-center justify-center gap-2 disabled:opacity-60 mt-2"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>{mode === 'login' ? 'Entrar a mi cuenta' : 'Crear cuenta y empezar'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-slate-400 dark:text-slate-500 font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Tus datos financieros son privados y se guardan solo para tu cuenta</span>
        </div>
      </motion.div>
    </div>
  );
}
