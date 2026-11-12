import React from 'react';
import { Loader2 } from 'lucide-react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  message?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className = '', message }) => {
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-10 h-10',
  };

  return (
    <div className={`flex flex-col items-center justify-center p-8 gap-3 ${className}`}>
      <Loader2 className={`${sizeMap[size]} animate-spin text-brand-600`} />
      {message && <p className="text-xs text-slate-500 font-medium">{message}</p>}
    </div>
  );
};
