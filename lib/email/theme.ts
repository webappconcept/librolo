// lib/email/theme.ts
// ⚠️ SYNC CON globals.css — se cambi un colore brand, aggiornalo anche qui

export const emailTheme = {
  bgPage: "#f5f0e8", // --brand-bg
  bgCard: "#fdfaf4", // --brand-surface
  border: "#ddd6c8", // --brand-border
  textPrimary: "#2c2416", // --brand-text
  textMuted: "#7a6e5f", // --brand-text-muted
  textLight: "#a89e8f", // --brand-text-light
  textLabel: "#5c5146", // --brand-label
  textInverse: "#ffffff",
  brandPrimary: "#e07a3a", // --brand-primary
  brandAccent: "#7dbe9e", // --brand-accent
  brandAccentLight: "#e8f5ee", // --brand-accent-light
  brandError: "#d94f3d", // --brand-destructive
  radiusMd: "8px",
  radiusLg: "12px",
  radiusXl: "16px",
} as const;
