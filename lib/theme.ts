// Unified theme system for consistent styling across the app

export const theme = {
  // Background gradients
  backgrounds: {
    page: 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950',
    card: 'glass-card border border-border/50',
    cardHover: 'hover:border-primary/50 hover:bg-slate-800/80',
    header: 'glass-card border-b border-border/50 backdrop-blur-xl',
    sidebar: 'glass-card border-r border-border/50',
  },

  // Role-based badges
  badges: {
    admin: {
      bg: 'bg-purple-500/20',
      border: 'border-purple-500/30',
      text: 'text-purple-400',
      icon: 'text-purple-400',
    },
    vip: {
      bg: 'bg-yellow-500/20',
      border: 'border-yellow-500/30',
      text: 'text-yellow-400',
      icon: 'text-yellow-400',
    },
    user: {
      bg: 'bg-blue-500/20',
      border: 'border-blue-500/30',
      text: 'text-blue-400',
      icon: 'text-blue-400',
    },
  },

  // Button styles
  buttons: {
    primary: 'px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent hover:from-primary/80 hover:to-accent/80 text-white font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-primary/30',
    secondary: 'px-4 py-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-border/50 text-foreground font-semibold transition-all',
    danger: 'px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 font-semibold transition-colors',
    success: 'px-4 py-2.5 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 font-semibold transition-colors',
    icon: 'w-10 h-10 rounded-xl glass-card border border-border/50 flex items-center justify-center hover:border-primary/50 hover:scale-105 transition-all',
  },

  // Input styles
  inputs: {
    base: 'w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors',
    search: 'w-full px-4 py-3 pl-12 rounded-xl bg-slate-800/50 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors',
  },

  // Status indicators
  status: {
    online: 'bg-green-500/20 border border-green-500/30 text-green-400',
    offline: 'bg-red-500/20 border border-red-500/30 text-red-400',
    loading: 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-400',
  },

  // Animation classes
  animations: {
    fadeIn: 'animate-in fade-in duration-300',
    slideIn: 'animate-in slide-in-from-bottom-4 duration-300',
    spin: 'animate-spin',
    pulse: 'animate-pulse',
  },

  // Typography
  typography: {
    h1: 'text-3xl md:text-4xl font-bold text-foreground',
    h2: 'text-2xl md:text-3xl font-bold text-foreground',
    h3: 'text-xl md:text-2xl font-bold text-foreground',
    h4: 'text-lg md:text-xl font-bold text-foreground',
    body: 'text-sm md:text-base text-foreground',
    small: 'text-xs md:text-sm text-muted-foreground',
    label: 'text-xs font-semibold text-muted-foreground uppercase tracking-wider',
  },

  // Spacing utilities
  spacing: {
    section: 'p-6 md:p-8 lg:p-10',
    card: 'p-4 md:p-6',
    container: 'max-w-7xl mx-auto',
  },
} as const

// Helper function to get role badge classes
export function getRoleBadge(role: 'admin' | 'vip' | 'user') {
  return theme.badges[role]
}

// Helper function to combine theme classes
export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}
