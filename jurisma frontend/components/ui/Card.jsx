import React from "react";
import { badgeStyles } from "../../styles.js";

export const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>
    {children}
  </div>
);

export const Textarea = ({ label, placeholder, className = "", value, onChange, onKeyDown, rows = 4 }) => (
  <div className={`space-y-1 ${className}`}>
    {label && <label className="block text-sm font-medium text-slate-700">{label}</label>}
    <textarea
      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-colors"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      rows={rows}
    />
  </div>
);

export const Badge = ({ children, variant = 'blue' }) => {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeStyles[variant]}`}>
      {children}
    </span>
  );
};

export const Input = ({ label, type = "text", placeholder, className = "", value, onChange, onKeyDown }) => (
  <div className={`space-y-1 ${className}`}>
    {label && <label className="block text-sm font-medium text-slate-700">{label}</label>}
    <input
      type={type}
      className={`w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-colors text-slate-900 bg-white placeholder:text-slate-400 ${className}`}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
    />
  </div>
);
