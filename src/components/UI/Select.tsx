import React from 'react';
import { ChevronDown, AlertCircle } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface SelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  required?: boolean;
  error?: string;
  disabled?: boolean;
}

const Select: React.FC<SelectProps> = ({
  label,
  value,
  onChange,
  options,
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
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          disabled={disabled}
          className={`ide-input w-full appearance-none bg-white ${
            error 
              ? 'border-ide-accent-400 bg-ide-accent-50 focus:border-ide-accent-500 focus:ring-ide-accent-200 text-ide-accent-900' 
              : disabled
              ? 'border-ide-gray-200 bg-ide-gray-50 text-ide-gray-500 cursor-not-allowed'
              : 'border-ide-gray-300 focus:border-ide-primary-500 focus:ring-ide-primary-200 text-ide-gray-900 hover:border-ide-gray-400'
          }`}
        >
          <option value="" className="text-ide-gray-500">Seçiniz...</option>
          {options.map((option) => (
            <option key={option.value} value={option.value} className="text-ide-gray-900">
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          {error ? (
            <AlertCircle className="h-5 w-5 text-ide-accent-500" />
          ) : (
            <ChevronDown className={`h-5 w-5 ${disabled ? 'text-ide-gray-400' : 'text-ide-gray-500'}`} />
          )}
        </div>
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

export default Select;