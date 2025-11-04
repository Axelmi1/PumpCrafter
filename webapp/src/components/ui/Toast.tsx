import { useAppStore } from '../../store/app';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

export function Toast() {
  const toast = useAppStore((state) => state.toast);
  const hideToast = useAppStore((state) => state.hideToast);

  if (!toast) return null;

  const icons = {
    success: CheckCircle,
    error: XCircle,
    info: Info,
  };

  const colors = {
    success: 'bg-green-500/10 border-green-500/50 text-green-500',
    error: 'bg-red-500/10 border-red-500/50 text-red-500',
    info: 'bg-blue-500/10 border-blue-500/50 text-blue-500',
  };

  const Icon = icons[toast.type];

  return (
    <div className="fixed top-4 left-4 right-4 z-50 animate-in slide-in-from-top">
      <div
        className={`flex items-center gap-3 p-4 rounded-lg border ${colors[toast.type]}`}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        <p className="flex-1 text-sm font-medium">{toast.message}</p>
        <button
          onClick={hideToast}
          className="flex-shrink-0 hover:opacity-70 transition-opacity"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

