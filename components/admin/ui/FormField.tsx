interface FormFieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormField({ label, htmlFor, required, error, hint, children, className }: FormFieldProps) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <label
        htmlFor={htmlFor}
        className="text-xs font-semibold text-foreground"
      >
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p className="text-[11px] text-red-500">{error}</p>
      )}
    </div>
  );
}
