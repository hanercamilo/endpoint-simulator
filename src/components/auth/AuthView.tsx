import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Server, ArrowRight, Mail, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';

interface AuthFormValues {
  email: string;
  password: string;
}

interface AuthViewProps {
  onComplete: () => void;
}

export const AuthView = ({ onComplete }: AuthViewProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { signIn, signUp } = useAuth();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<AuthFormValues>();

  const onSubmit = async (data: AuthFormValues) => {
    setError(null);
    const result = isLogin
      ? await signIn(data.email, data.password)
      : await signUp(data.email, data.password);

    if (result.error) {
      setError(result.error);
    } else {
      onComplete();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8 max-w-md w-full"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center">
            <Server className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-[var(--text-primary)]">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-xs text-[var(--text-muted)]">
              {isLogin ? 'Sign in to sync your data' : 'Register to get started'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-danger-500/10 border border-danger-500/20 text-xs text-danger-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                {...register('email', {
                  required: 'Email is required',
                  pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' },
                })}
                className="glass-input pl-10"
                placeholder="you@example.com"
              />
            </div>
            {errors.email && <p className="text-xs text-danger-400 mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 6, message: 'Min 6 characters' },
                })}
                type="password"
                className="glass-input pl-10"
                placeholder="Min 6 characters"
              />
            </div>
            {errors.password && <p className="text-xs text-danger-400 mt-1">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? 'Loading...' : <> {isLogin ? 'Sign In' : 'Create Account'} <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => { setIsLogin(!isLogin); setError(null); }}
            className="text-xs text-[var(--text-secondary)] hover:text-accent-400 transition-colors"
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>

      </motion.div>
    </div>
  );
};
