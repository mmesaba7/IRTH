type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = {
  children: React.ReactNode;
  variant?: ButtonVariant;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
};

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-espresso)] text-[var(--color-ivory)] hover:bg-[var(--color-copper)]",
  secondary:
    "border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--color-espresso)] hover:border-[var(--color-copper)]",
  ghost:
    "bg-transparent text-[var(--color-espresso)] hover:bg-[var(--color-ivory)]",
};

export default function Button({
  children,
  variant = "primary",
  type = "button",
  onClick,
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`inline-flex min-h-12 items-center justify-center rounded-[var(--radius-md)] px-7 py-3 text-sm font-medium transition-colors duration-200 ${variantStyles[variant]}`}
    >
      {children}
    </button>
  );
}