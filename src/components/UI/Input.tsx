import React from 'react';
import { AlertCircle } from 'lucide-react';

interface InputProps {
  label: string;
  type?: 'text' | 'email' | 'password' | 'number';
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
}

const Input: React.FC<InputProps> = ({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  error,
  disabled = false
}) => {
  return (
    <div className="mb-4">
      <label className="block text-sm font-semibold text-ide-gray-800 mb-2">
        {label} {required && <span className="text-ide-accent-600 ml-1">*</span>}
      </label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={`ide-input w-full ${
            error 
              ? 'border-ide-accent-400 bg-ide-accent-50 focus:border-ide-accent-500 focus:ring-ide-accent-200 text-ide-accent-900 placeholder-ide-accent-400' 
              : disabled
              ? 'border-ide-gray-200 bg-ide-gray-50 text-ide-gray-500 cursor-not-allowed'
              : 'border-ide-gray-300 bg-white focus:border-ide-primary-500 focus:ring-ide-primary-200 text-ide-gray-900 placeholder-ide-gray-500 hover:border-ide-gray-400'
          }`}
        />
        {error && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <AlertCircle className="h-5 w-5 text-ide-accent-500" />
          </div>
        )}
      </div>
      {error && (
        <div className="mt-2 flex items-start space-x-2">
          <AlertCircle className="h-4 w-4 text-ide-accent-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm font-medium text-ide-accent-700">{error}</p>
        </div>
      )}
    </div>
  );
};

export default Input;