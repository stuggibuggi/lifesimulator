import React, { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalShellProps {
  title: string;
  subtitle: string;
  icon: string | ReactNode;
  iconBgColor?: string;
  onClose: () => void;
  children: ReactNode;
  maxWidthClass?: string;
  headerActions?: ReactNode;
}

export const ModalShell: React.FC<ModalShellProps> = ({
  title,
  subtitle,
  icon,
  iconBgColor = 'bg-amber-100 text-amber-800',
  onClose,
  children,
  maxWidthClass = 'max-w-4xl',
  headerActions,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div
        className={`bg-white rounded-3xl md:rounded-4xl ${maxWidthClass} w-full shadow-2xl border-4 border-[#f0e7d5] flex flex-col max-h-[88vh] overflow-hidden relative`}
      >
        {/* Sticky Fixed Header */}
        <div className="flex items-center justify-between px-6 py-4 md:px-8 md:py-5 border-b border-gray-100 bg-white/95 backdrop-blur-md shrink-0 z-20">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div
              className={`w-11 h-11 md:w-12 md:h-12 rounded-2xl ${iconBgColor} flex items-center justify-center text-xl md:text-2xl shadow-xs shrink-0`}
            >
              {icon}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg md:text-2xl font-black text-gray-900 tracking-tight truncate">
                {title}
              </h2>
              <p className="text-[11px] md:text-xs text-gray-500 font-bold truncate">
                {subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {headerActions}
            <button
              onClick={onClose}
              type="button"
              aria-label="Schließen"
              className="p-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 transition-all active:scale-95 shadow-2xs cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body with inset custom scrollbar */}
        <div className="flex-1 overflow-y-auto px-6 py-5 md:px-8 md:py-6 custom-scrollbar overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
};
