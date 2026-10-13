/** Color values for APIs that require concrete strings (e.g. theme-color and inline Reader props).
 * Must remain in sync with sapphire-tokens.css; scripts/audit-v612-colors.mjs verifies it. */
export const SAPPHIRE_PALETTE = {
  light: {
    background: '#F4F8FD', surface: '#FFFFFF', raised: '#E9F2FC',
    text: '#172C48', muted: '#506781', border: '#D5E3F2',
    accent: '#235DB4', onAccent: '#FFFFFF', accentHover: '#19498F', selection: '#D5E8FF',
  },
  dark: {
    background: '#081425', surface: '#10243D', raised: '#173251',
    text: '#EFF6FF', muted: '#B2C5DA', border: '#294665',
    accent: '#9BC9FF', onAccent: '#081425', accentHover: '#C4E1FF', selection: '#294665',
  },
} as const;
