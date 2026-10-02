export const colors = {
  bg: '#F2F4F3',
  card: '#FFFFFF',
  text: '#16211C',
  muted: '#6A7A72',
  faint: '#9AA8A1',
  border: '#E2E8E4',
  primary: '#17624A',
  primaryDark: '#0F4634',
  primarySoft: '#E2F0EA',
  income: '#178A57',
  incomeSoft: '#E1F3E9',
  expense: '#C2412D',
  expenseSoft: '#FBE8E4',
  warn: '#A86A12',
  warnSoft: '#FCF1DE',
  info: '#2F5D8A',
  infoSoft: '#E5EEF7',
};

export const radius = { sm: 10, md: 14, lg: 20, pill: 999 };

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

export const font = {
  h1: { fontSize: 30, fontWeight: '800' as const, letterSpacing: -0.5 },
  h2: { fontSize: 20, fontWeight: '700' as const },
  h3: { fontSize: 16, fontWeight: '700' as const },
  body: { fontSize: 15 },
  small: { fontSize: 13 },
  tiny: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.6, textTransform: 'uppercase' as const },
};
