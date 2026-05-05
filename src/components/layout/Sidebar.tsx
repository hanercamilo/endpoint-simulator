import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderOpen,
  Plus,
  ChevronRight,
  Server,
  Moon,
  Sun,
  LogOut,
  Settings,
  Download,
  Upload,
  Trash2,
  X,
} from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import type { Collection } from '../../types';

interface SidebarProps {
  collections: Collection[];
  activeCollectionId: string | null;
  onSelectCollection: (id: string) => void;
  onCreateCollection: () => void;
  onExportProject: () => void;
  onImportProject: () => void;
  onClearData: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar = ({
  collections,
  activeCollectionId,
  onSelectCollection,
  onCreateCollection,
  onExportProject,
  onImportProject,
  onClearData,
  isOpen,
  onClose,
}: SidebarProps) => {
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const [showMore, setShowMore] = useState(false);

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <aside 
        className={`fixed md:sticky top-0 left-0 z-50 w-64 h-screen flex flex-col glass border-r border-[var(--border-color)] shrink-0 transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5 border-b border-[var(--border-color)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center">
              <Server className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-[var(--text-primary)]">EndpointSim</h1>
              <p className="text-[11px] text-[var(--text-muted)]">Dynamic API Simulator</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg hover:bg-[var(--border-color)] text-[var(--text-muted)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

      <div className="p-3">
        <button
          onClick={onCreateCollection}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--border-color)] transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Collection
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-3 pb-3">
        <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Collections
        </p>
        {collections.length === 0 && (
          <p className="px-3 py-4 text-xs text-[var(--text-muted)] text-center">
            No collections yet
          </p>
        )}
        {collections.map(col => (
          <button
            key={col.id}
            onClick={() => {
              onSelectCollection(col.id);
              if (window.innerWidth < 768) onClose();
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all group ${
              activeCollectionId === col.id
                ? 'bg-accent-500/10 text-accent-400'
                : 'text-[var(--text-secondary)] hover:bg-[var(--border-color)]'
            }`}
          >
            <FolderOpen className="w-4 h-4 shrink-0" />
            <span className="truncate flex-1 text-left">{col.name}</span>
            {activeCollectionId === col.id && (
              <ChevronRight className="w-3.5 h-3.5 text-accent-400" />
            )}
          </button>
        ))}
      </div>

      <div className="border-t border-[var(--border-color)] p-3">
        {user && (
          <div className="px-3 py-2 mb-2">
            <p className="text-xs font-medium text-[var(--text-primary)] truncate">{user.email}</p>
          </div>
        )}

        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs text-[var(--text-secondary)] hover:bg-[var(--border-color)] transition-colors"
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setShowMore(!showMore)}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs text-[var(--text-secondary)] hover:bg-[var(--border-color)] transition-colors"
            title="More options"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
          {user ? (
            <button
              onClick={signOut}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs text-[var(--text-secondary)] hover:bg-[var(--border-color)] transition-colors"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => {
                window.location.reload();
              }}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:text-accent-400 hover:bg-[var(--border-color)] transition-colors"
              title="Sign in"
            >
              Login
            </button>
          )}
        </div>

        <AnimatePresence>
          {showMore && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-2 space-y-0.5">
                <button
                  onClick={onExportProject}
                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-[var(--text-secondary)] hover:bg-[var(--border-color)] transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Export Project
                </button>
                <button
                  onClick={onImportProject}
                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-[var(--text-secondary)] hover:bg-[var(--border-color)] transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" /> Import Project
                </button>
                <button
                  onClick={onClearData}
                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-danger-400 hover:bg-danger-500/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear Local Data
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </aside>
    </>
  );
};
