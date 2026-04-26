import React from "react";
import { buttonBaseStyles, buttonVariants } from "../../styles.js";

export const Button = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  onClick, 
  icon: Icon, 
  disabled = false 
}) => {
  return (
    <button 
      onClick={onClick}
      className={`${buttonBaseStyles} ${buttonVariants[variant]} ${className}`}
      disabled={disabled}
    >
      {Icon && <Icon size={18} className="mr-2" />}
      {children}
    </button>
  );
};
export default Button;
