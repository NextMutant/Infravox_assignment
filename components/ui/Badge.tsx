import * as React from "react";

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "warning" | "error" | "info" | "accent";
}

export const Badge = ({ className = "", variant = "default", ...props }: BadgeProps) => {
  const baseStyles = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium";
  
  const variants = {
    default: "bg-surface-secondary text-text-secondary",
    success: "bg-success-lightest text-success-foreground",
    warning: "bg-warning-lightest text-warning-foreground",
    error: "bg-error-lightest text-error-foreground",
    info: "bg-info-lightest text-info-foreground",
    accent: "bg-accent-light text-accent",
  };

  return (
    <div
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    />
  );
};
