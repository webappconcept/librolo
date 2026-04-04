// ⚠️ Tieni sincronizzato con globals.css — CSS variables

export const theme = {
  colors: {
    // Palette sabbia + menta + arancio
    bg: "#F5F0E8", // sabbia calda
    surface: "#FDFAF4", // carta/crema
    surfaceCard: "#FFFFFF",

    primary: "#E07A3A", // arancio caldo
    primaryHover: "#C9642A",
    primaryText: "#E07A3A",

    accent: "#7DBE9E", // verde menta
    accentHover: "#5EA882",
    accentLight: "#E8F5EE",

    error: "#D94F3D",
    errorLight: "#FDECEA",
    errorBorder: "#E07A7A",

    success: "#5EA882",
    successLight: "#E8F5EE",
    successBorder: "#7DBE9E",

    border: "#DDD6C8",
    borderFocus: "#7DBE9E",

    text: "#2C2416",
    textMuted: "#7A6E5F",
    textLight: "#A89E8F",

    label: "#5C5146",
  },

  radius: {
    input: "rounded-xl",
    button: "rounded-xl",
    card: "rounded-2xl",
  },
} as const;
