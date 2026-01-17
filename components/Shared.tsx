
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
  variant?: 'default' | 'health' | 'todo' | 'notes' | 'finance';
}> = ({ children, className = "", onClick, variant = 'default' }) => {
  const variantStyles = {
    default: 'bg-white border-turmeric-100/40',
    health: 'bg-gradient-to-br from-plum-50 to-plum-100/70 border-plum-200/50',
    todo: 'bg-gradient-to-br from-turmeric-50 to-turmeric-100/70 border-turmeric-200/50',
    notes: 'bg-gradient-to-br from-saffron to-parchment border-turmeric-100/50',
    finance: 'bg-gradient-to-br from-coral-50 to-coral-100/70 border-coral-200/50',
  };

  return (
    <div
      onClick={onClick}
      className={`card-spice rounded-3xl border transition-all duration-300 ${variantStyles[variant]} ${onClick ? 'cursor-pointer hover:shadow-warm-lg hover:-translate-y-1' : ''} ${className}`}
    >
      {children}
    </div>
  );
};

// --- Button ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'icon' | 'danger' | 'plum';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = "",
  ...props
}) => {
  const baseStyle = "rounded-2xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-gradient-to-br from-[#E87777] to-[#D45B5B] text-white shadow-[0_4px_12px_rgba(232,119,119,0.3)] hover:shadow-[0_8px_20px_rgba(232,119,119,0.4)] hover:-translate-y-0.5 active:translate-y-0",
    secondary: "bg-brown-50 text-brown-700 hover:bg-brown-100 border border-brown-200",
    ghost: "bg-transparent text-brown-600 hover:bg-brown-50",
    danger: "bg-coral-50 text-coral-700 hover:bg-coral-100 border border-coral-200",
    plum: "bg-gradient-to-br from-plum-400 to-plum-500 text-white shadow-warm hover:shadow-glow-plum hover:-translate-y-0.5",
    icon: "bg-transparent text-brown-500 hover:bg-turmeric-50 hover:text-turmeric-600 rounded-full p-2",
  };

  const sizes = {
    sm: "text-sm px-4 py-2",
    md: "text-base px-5 py-2.5",
    lg: "text-lg px-7 py-3.5",
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
export const Badge: React.FC<{ text: string; color?: string; variant?: 'default' | 'turmeric' | 'plum' | 'coral' }> = ({
  text,
  color,
  variant = 'default'
}) => {
  const variantStyles = {
    default: "bg-brown-100 text-brown-600",
    turmeric: "bg-turmeric-100 text-turmeric-700",
    plum: "bg-plum-100 text-plum-700",
    coral: "bg-coral-100 text-coral-700",
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${color || variantStyles[variant]}`}>
      {text}
    </span>
  );
};

// --- Avatar ---
export const Avatar: React.FC<{
  src?: string | null;
  alt: string;
  size?: string;
  className?: string;
  glowOnHover?: boolean;
}> = ({ src, alt, size = "w-10 h-10", className = "", glowOnHover = false }) => {
  const glowClass = glowOnHover ? 'avatar-glow' : '';

  if (!src) {
    return (
      <div className={`${size} rounded-full bg-gradient-to-br from-turmeric-200 to-turmeric-300 flex items-center justify-center border-3 border-white shadow-[0_4px_12px_rgba(0,0,0,0.08)] ring-4 ring-white/60 transition-all duration-300 ${glowClass} ${className}`}>
        <span className="text-turmeric-700 font-bold text-xl">{alt.charAt(0).toUpperCase()}</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className={`${size} rounded-full object-cover border-3 border-white shadow-[0_4px_12px_rgba(0,0,0,0.08)] ring-4 ring-white/60 transition-all duration-300 ${glowClass} hover:scale-105 hover:shadow-[0_10px_30px_rgba(249,168,37,0.25)] ${className}`}
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
      <div className="absolute inset-0 bg-brown-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white rounded-4xl shadow-warm-xl w-full max-w-lg relative z-10 animate-fade-in-up flex flex-col max-h-[90vh] border border-turmeric-100">
        <div className="p-6 border-b border-turmeric-100 flex items-center justify-between bg-gradient-to-r from-cream to-saffron rounded-t-4xl">
          <h3 className="text-xl font-bold text-brown-800 heading-display">{title}</h3>
          <Button variant="icon" onClick={onClose}><Icon name="close" /></Button>
        </div>
        <div className="p-6 overflow-y-auto bg-cream">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- Toggle ---
export const Toggle: React.FC<{ checked: boolean; onChange: (val: boolean) => void; label?: string }> = ({ checked, onChange, label }) => (
  <div className="flex items-center gap-3 cursor-pointer" onClick={() => onChange(!checked)}>
    <div className={`w-12 h-7 rounded-full p-1 transition-all duration-300 ${checked ? 'bg-gradient-to-r from-turmeric-400 to-turmeric-500 shadow-glow-turmeric' : 'bg-brown-200'}`}>
      <div className={`w-5 h-5 bg-white rounded-full shadow-warm transition-transform duration-300 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </div>
    {label && <span className="text-sm font-medium text-brown-700">{label}</span>}
  </div>
);

// --- Input ---
export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string }> = ({ label, className = "", ...props }) => (
  <div className="w-full">
    {label && <label className="block text-xs font-bold text-brown-500 uppercase tracking-wider mb-2">{label}</label>}
    <input
      className={`w-full bg-cream border-2 border-brown-100 rounded-2xl px-4 py-3 text-brown-800 placeholder:text-brown-300 focus:outline-none focus:border-turmeric-400 focus:ring-4 focus:ring-turmeric-100 transition-all ${className}`}
      {...props}
    />
  </div>
);

// --- TextArea ---
export const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }> = ({ label, className = "", ...props }) => (
  <div className="w-full">
    {label && <label className="block text-xs font-bold text-brown-500 uppercase tracking-wider mb-2">{label}</label>}
    <textarea
      className={`w-full bg-cream border-2 border-brown-100 rounded-2xl px-4 py-3 text-brown-800 placeholder:text-brown-300 focus:outline-none focus:border-turmeric-400 focus:ring-4 focus:ring-turmeric-100 transition-all min-h-[120px] resize-y ${className}`}
      {...props}
    />
  </div>
);

// --- Divider ---
export const Divider: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`h-px bg-gradient-to-r from-transparent via-turmeric-200 to-transparent my-4 ${className}`} />
);

// --- Skeleton Loader ---
export const Skeleton: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`skeleton ${className}`} />
);

// --- Empty State ---
export const EmptyState: React.FC<{
  icon: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-turmeric-100 to-turmeric-200 flex items-center justify-center mb-5 animate-float">
      <Icon name={icon} className="text-4xl text-turmeric-500" />
    </div>
    <h3 className="text-lg font-bold text-brown-800 mb-2 heading-display">{title}</h3>
    <p className="text-brown-500 text-sm max-w-xs mb-6">{description}</p>
    {action}
  </div>
);
