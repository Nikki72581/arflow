export type SectionAccent =
  | 'dashboard'
  | 'sales'
  | 'commissions'
  | 'reports'
  | 'my'
  | 'admin'
  | 'integrations'
  | 'settings'
  | 'help'

type AccentStyles = {
  cardBorder: string
  cardHover: string
  iconBg: string
  valueGradient: string
  divider: string
  callout: string
}

const ACCENT_STYLES: Record<SectionAccent, AccentStyles> = {
  dashboard: {
    cardBorder: 'border-blue-500/30',
    cardHover: 'hover:border-blue-500/50 hover:shadow-blue-500/10',
    iconBg: 'from-blue-500 to-blue-600',
    valueGradient: 'from-blue-600 to-blue-500',
    divider: 'bg-blue-500/20',
    callout: 'border-blue-500/20 bg-blue-500/5',
  },
  sales: {
    cardBorder: 'border-purple-500/30',
    cardHover: 'hover:border-purple-500/50 hover:shadow-purple-500/10',
    iconBg: 'from-purple-500 to-purple-600',
    valueGradient: 'from-purple-600 to-purple-500',
    divider: 'bg-purple-500/20',
    callout: 'border-purple-500/20 bg-purple-500/5',
  },
  commissions: {
    cardBorder: 'border-emerald-500/30',
    cardHover: 'hover:border-emerald-500/50 hover:shadow-emerald-500/10',
    iconBg: 'from-emerald-500 to-emerald-600',
    valueGradient: 'from-emerald-600 to-emerald-500',
    divider: 'bg-emerald-500/20',
    callout: 'border-emerald-500/20 bg-emerald-500/5',
  },
  reports: {
    cardBorder: 'border-cyan-500/30',
    cardHover: 'hover:border-cyan-500/50 hover:shadow-cyan-500/10',
    iconBg: 'from-cyan-500 to-cyan-600',
    valueGradient: 'from-cyan-600 to-cyan-500',
    divider: 'bg-cyan-500/20',
    callout: 'border-cyan-500/20 bg-cyan-500/5',
  },
  my: {
    cardBorder: 'border-pink-500/30',
    cardHover: 'hover:border-pink-500/50 hover:shadow-pink-500/10',
    iconBg: 'from-pink-500 to-pink-600',
    valueGradient: 'from-pink-600 to-pink-500',
    divider: 'bg-pink-500/20',
    callout: 'border-pink-500/20 bg-pink-500/5',
  },
  admin: {
    cardBorder: 'border-indigo-500/30',
    cardHover: 'hover:border-indigo-500/50 hover:shadow-indigo-500/10',
    iconBg: 'from-indigo-500 to-indigo-600',
    valueGradient: 'from-indigo-600 to-indigo-500',
    divider: 'bg-indigo-500/20',
    callout: 'border-indigo-500/20 bg-indigo-500/5',
  },
  integrations: {
    cardBorder: 'border-indigo-500/30',
    cardHover: 'hover:border-indigo-500/50 hover:shadow-indigo-500/10',
    iconBg: 'from-indigo-500 to-indigo-600',
    valueGradient: 'from-indigo-600 to-indigo-500',
    divider: 'bg-indigo-500/20',
    callout: 'border-indigo-500/20 bg-indigo-500/5',
  },
  settings: {
    cardBorder: 'border-indigo-500/30',
    cardHover: 'hover:border-indigo-500/50 hover:shadow-indigo-500/10',
    iconBg: 'from-indigo-500 to-indigo-600',
    valueGradient: 'from-indigo-600 to-indigo-500',
    divider: 'bg-indigo-500/20',
    callout: 'border-indigo-500/20 bg-indigo-500/5',
  },
  help: {
    cardBorder: 'border-muted-foreground/20',
    cardHover: 'hover:border-muted-foreground/40 hover:shadow-muted-foreground/10',
    iconBg: 'from-muted-foreground to-foreground',
    valueGradient: 'from-muted-foreground to-foreground',
    divider: 'bg-muted-foreground/20',
    callout: 'border-muted-foreground/20 bg-muted/40',
  },
}

export function getSectionAccent(accent: SectionAccent): AccentStyles {
  return ACCENT_STYLES[accent]
}
