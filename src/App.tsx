import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import { isSupabaseConfigured } from './lib/supabase';
import { AuthView } from './components/auth/AuthView';
import { Dashboard } from './pages/Dashboard';
import { EndpointViewer } from './components/endpoints/EndpointViewer';
import { EndpointRaw } from './components/endpoints/EndpointRaw';

type AppStep = 'auth' | 'app';

const AppRouter = () => {
  const { user, loading } = useAuth();
  const [step, setStep] = useState<AppStep>(() => {
    if (!localStorage.getItem('skipped_auth')) return 'auth';
    return 'app';
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="animate-pulse text-[var(--text-muted)] text-sm">Loading...</div>
      </div>
    );
  }

  // Si no está configurado Supabase en el .env, avisamos al usuario
  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="glass-card p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-bold text-[var(--text-primary)] mb-4">Falta Configuración</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            No se encontró la configuración de Supabase. Por favor, asegúrate de haber creado el archivo <code>.env</code> en la raíz del proyecto con tus variables <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code>.
          </p>
        </div>
      </div>
    );
  }

  if (step === 'auth' && !user) {
    return (
      <AuthView
        onComplete={() => {
          localStorage.removeItem('skipped_auth');
          setStep('app');
        }}
        onSkip={() => {
          localStorage.setItem('skipped_auth', 'true');
          setStep('app');
        }}
      />
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/e/:slug" element={<EndpointRaw />} />
        <Route path="/preview/:slug" element={<EndpointViewer />} />
        <Route path="/" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
