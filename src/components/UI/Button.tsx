import React from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'secondary' | 'danger' | 'ide-primary' | 'ide-secondary' | 'ide-accent';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  icon?: LucideIcon;
  className?: string;
}

const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  icon: Icon,
  className = ''
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none transform hover:scale-[1.02] active:scale-[0.98] focus-enhanced';
  
  const variants = {
    // ESKİ RENKLERİ GERİ GETİRDİK - KAYDET BUTONU GÖRÜNÜR OLACAK
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 shadow-sm hover:shadow-md',
    secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200 focus:ring-gray-500 border border-gray-300 hover:border-gray-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm hover:shadow-md',
    // İDE kurumsal renkleri ayrı varyant olarak korundu
    'ide-primary': 'btn-ide-primary',
    'ide-secondary': 'btn-ide-secondary', 
    'ide-accent': 'btn-ide-accent'
  };
  
  const sizes = {
    // CRITICAL: Mobile-friendly sizes with proper touch targets
    sm: 'px-4 py-3 text-sm min-h-[44px] btn-touch', // Mobile-friendly
    md: 'px-5 py-3.5 text-sm min-h-[48px] btn-touch', // Mobile-friendly
    lg: 'px-6 py-4 text-base min-h-[52px] btn-touch' // Mobile-friendly
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className} touch-enhanced`}
    >
      {Icon && <Icon size={size === 'sm' ? 18 : size === 'lg' ? 22 : 20} className="mr-2 flex-shrink-0" />}
      <span className="truncate">{children}</span>
    </button>
  );
};

export default Button;