import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal = ({
  open,
  title,
  description,
  confirmLabel = 'Eliminar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
}: ConfirmModalProps) => {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-sm glass-card z-10"
          >
            <div className="flex items-center justify-between p-5 pb-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-danger-500/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4 text-danger-400" />
                </div>
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h2>
              </div>
              <button
                onClick={onCancel}
                className="p-1.5 rounded-lg hover:bg-[var(--border-color)] transition-colors text-[var(--text-muted)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {description && (
              <p className="px-5 pt-3 text-xs text-[var(--text-secondary)] leading-relaxed">
                {description}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 p-5 pt-4">
              <button
                onClick={onCancel}
                className="btn-secondary text-sm py-2 px-4"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                className="text-sm py-2 px-4 rounded-lg font-medium bg-danger-500 hover:bg-danger-600 text-white transition-colors"
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
