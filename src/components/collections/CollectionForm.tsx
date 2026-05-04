import { useForm } from 'react-hook-form';
import { FolderPlus } from 'lucide-react';
import type { Collection } from '../../types';

interface CollectionFormProps {
  onSubmit: (data: { name: string; description: string }) => void;
  onCancel: () => void;
  initial?: Collection;
}

interface FormValues {
  name: string;
  description: string;
}

export const CollectionForm = ({ onSubmit, onCancel, initial }: CollectionFormProps) => {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      name: initial?.name || '',
      description: initial?.description || '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Name</label>
        <input
          {...register('name', { required: 'Required' })}
          className="glass-input"
          placeholder="e.g. Users API"
          autoFocus
        />
        {errors.name && <p className="text-xs text-danger-400 mt-1">{errors.name.message}</p>}
      </div>
      <div>
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Description</label>
        <input
          {...register('description')}
          className="glass-input"
          placeholder="Optional description"
        />
      </div>
      <div className="flex items-center gap-3 pt-2">
        <button type="submit" className="btn-primary flex items-center gap-2">
          <FolderPlus className="w-4 h-4" />
          {initial ? 'Update' : 'Create'} Collection
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
};
