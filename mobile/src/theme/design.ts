// Sistema de Diseño U-Ride
// Fuente: Outfit (Google Fonts) — moderna, redondeada, premium
// Iconos: @expo/vector-icons (Ionicons)

export const FONTS = {
  regular:   'Outfit_400Regular',
  medium:    'Outfit_500Medium',
  semiBold:  'Outfit_600SemiBold',
  bold:      'Outfit_700Bold',
  extraBold: 'Outfit_800ExtraBold',
  black:     'Outfit_900Black',
};

export const COLORS = {
  primary:    '#6366F1',   // Indigo vibrante
  primaryDk:  '#4338CA',
  secondary:  '#10B981',   // Emerald
  danger:     '#EF4444',
  warning:    '#F59E0B',
  dark:       '#0F172A',
  gray:       '#64748B',
  lightGray:  '#94A3B8',
  border:     '#E2E8F0',
  bg:         '#F8FAFC',
  card:       '#FFFFFF',
  surface:    '#F1F5F9',
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const SHADOW = {
  sm: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  md: { shadowColor: '#6366F1', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  lg: { shadowColor: '#6366F1', shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
};
