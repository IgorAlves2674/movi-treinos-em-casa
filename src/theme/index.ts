// Tema claro do Movi (único tema na v1). Valores tirados do protótipo da tela inicial.
export const colors = {
  primary: '#0F7A58', // botões e textos de destaque
  primaryDark: '#0B5F44',
  primarySoft: '#E4F4EE', // fundo de ícones em destaque
  primaryOnDark: '#7FE0BE', // texto verde sobre fundo escuro
  muscle: '#1D9E75', // músculo em destaque no boneco
  figure: '#6B6866', // corpo do boneco

  background: '#F5F6F4',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF0ED',
  border: '#E6E8E5',
  borderStrong: '#E3E5E2',

  text: '#16181A',
  textSecondary: '#5F646A',
  textOnDark: '#FFFFFF',
  textOnDarkSecondary: '#C9CDD1',

  dark: '#16181A', // card "Treino de hoje"
  darkChip: '#2A2D30',

  danger: '#C2410C',
} as const;

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 } as const;

export const radius = { sm: 12, md: 14, lg: 18, xl: 22, pill: 999 } as const;

export const type = {
  logo: { fontFamily: fonts.extrabold, fontSize: 26, letterSpacing: -0.5 },
  h1: { fontFamily: fonts.bold, fontSize: 26, letterSpacing: -0.4 },
  h2: { fontFamily: fonts.bold, fontSize: 22, letterSpacing: -0.3 },
  title: { fontFamily: fonts.semibold, fontSize: 15 },
  body: { fontFamily: fonts.regular, fontSize: 14 },
  label: { fontFamily: fonts.semibold, fontSize: 14 },
  caption: { fontFamily: fonts.regular, fontSize: 12 },
  overline: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 0.3 },
  button: { fontFamily: fonts.bold, fontSize: 16 },
} as const;

export const theme = { colors, fonts, spacing, radius, type };
