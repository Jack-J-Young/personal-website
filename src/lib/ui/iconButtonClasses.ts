export type IconButtonSize = "sm" | "md";

const BASE =
    "inline-flex items-center justify-center rounded-sm border border-border bg-surface " +
    "text-text-muted transition-colors hover:border-accent hover:bg-surface-raised hover:text-text";

const SIZES: Record<IconButtonSize, string> = {
    sm: "h-9 w-9",
    md: "h-10 w-10",
};

// Shared by IconButton and SocialLink, which render different elements but must
// never look different.
export function iconButtonClasses(size: IconButtonSize): string {
    return `${BASE} ${SIZES[size]}`;
}
