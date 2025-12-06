
import React, { Fragment } from 'react';

// --- Icons ---
export const Icon: React.FC<{ name: string; className?: string }> = ({ name, className = "" }) => (
  <span className={`material-symbols-rounded ${className} select-none`}>
    {name}
  </span>
);

// --- Card ---
export const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}> = ({ children, className = "", onClick }) => (
  <div
    onClick={onClick}
    className={`bg-white rounded-2xl shadow-sm border border-stone-100 p-4 transition-all duration-300 ${onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-1' : ''} ${className}`}
  >
    {children}
  </div>
);

// --- Button ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'icon' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = "",
  ...props
}) => {
  const baseStyle = "rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-stone-800 text-white hover:bg-stone-900 shadow-sm",
    secondary: "bg-stone-100 text-stone-700 hover:bg-stone-200",
    ghost: "bg-transparent text-stone-600 hover:bg-stone-50",
    danger: "bg-rose-50 text-rose-600 hover:bg-rose-100",
    icon: "bg-transparent text-stone-500 hover:bg-stone-100 hover:text-stone-800 rounded-full p-2",
  };

  const sizes = {
    sm: "text-sm px-3 py-1.5",
    md: "text-base px-4 py-2",
    lg: "text-lg px-6 py-3",
  };

  const finalClass = variant === 'icon'
    ? `${baseStyle} ${variants.icon} ${className}`
    : `${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`;

  return (
    <button className={finalClass} {...props}>
      {children}
    </button>
  );
};

// --- Badge ---
export const Badge: React.FC<{ text: string; color?: string }> = ({ text, color = "bg-stone-100 text-stone-600" }) => (
  <span className={`px-2 py-0.5 rounded-md text-xs font-medium uppercase tracking-wider ${color}`}>
    {text}
  </span>
);

// --- Avatar ---
// --- Avatar ---
export const Avatar: React.FC<{ src?: string | null; alt: string; size?: string; className?: string }> = ({ src, alt, size = "w-10 h-10", className = "" }) => {
  if (!src) {
    return (
      <div className={`${size} rounded-full bg-stone-200 flex items-center justify-center border-2 border-white shadow-sm ${className}`}>
        <span className="text-stone-500 font-bold text-xl">{alt.charAt(0).toUpperCase()}</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className={`${size} rounded-full object-cover border-2 border-white shadow-sm ${className}`}
    />
  );
};

// --- Modal ---
export const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg relative z-10 animate-fade-in-up flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-cream rounded-t-3xl">
          <h3 className="text-xl font-bold text-stone-800">{title}</h3>
          <Button variant="icon" onClick={onClose}><Icon name="close" /></Button>
        </div>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- Toggle ---
export const Toggle: React.FC<{ checked: boolean; onChange: (val: boolean) => void; label?: string }> = ({ checked, onChange, label }) => (
  <div className="flex items-center gap-3 cursor-pointer" onClick={() => onChange(!checked)}>
    <div className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 ${checked ? 'bg-emerald-500' : 'bg-stone-200'}`}>
      <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </div>
    {label && <span className="text-sm font-medium text-stone-700">{label}</span>}
  </div>
);

// --- Input ---
export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string }> = ({ label, className = "", ...props }) => (
  <div className="w-full">
    {label && <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">{label}</label>}
    <input
      className={`w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-800/10 focus:border-stone-400 transition-all ${className}`}
      {...props}
    />
  </div>
);

// --- TextArea ---
export const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }> = ({ label, className = "", ...props }) => (
  <div className="w-full">
    {label && <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">{label}</label>}
    <textarea
      className={`w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-800/10 focus:border-stone-400 transition-all min-h-[100px] resize-y ${className}`}
      {...props}
    />
  </div>
);
