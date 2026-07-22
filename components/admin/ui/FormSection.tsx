interface FormSectionProps {
  title?: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <div className={className}>
      {(title || description) && (
        <div className="mb-3">
          {title && (
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{title}</p>
          )}
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
