export type ButtonVariant = "primary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
    "inline-flex items-center justify-center gap-2 rounded font-medium transition-colors " +
    "disabled:cursor-not-allowed disabled:opacity-50";

const VARIANTS: Record<ButtonVariant, string> = {
    primary: "bg-accent text-accent-contrast hover:bg-accent-hover",
    ghost: "border border-border bg-surface text-text hover:bg-surface-raised hover:border-accent",
};

const SIZES: Record<ButtonSize, string> = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-5 py-2.5 text-base",
    lg: "px-7 py-3.5 text-lg",
};

// Shared by Button and ButtonLink, which render different elements but must
// never look different.
export function buttonClasses(variant: ButtonVariant, size: ButtonSize): string {
    return `${BASE} ${VARIANTS[variant]} ${SIZES[size]}`;
}
