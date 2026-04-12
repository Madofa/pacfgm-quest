// Copia del backend para el frontend — single source of truth está en el backend
// Este fichero solo define labels y colores para la UI

export const MATERIES = [
  { key: 'mates',      label: 'Matemáticas',  icon: '⚔',  color: 'var(--color-mates)',      abbr: 'FOR' },
  { key: 'ciencies',   label: 'Ciencias',      icon: '🧪', color: 'var(--color-ciencies)',   abbr: 'INT' },
  { key: 'tecnologia', label: 'Tecnología',    icon: '⚙',  color: 'var(--color-tecnologia)', abbr: 'TEC' },
  { key: 'catala',     label: 'Català',        icon: '📖', color: 'var(--color-catala)',     abbr: 'CAT' },
  { key: 'castella',   label: 'Castellano',    icon: '📝', color: 'var(--color-castella)',   abbr: 'CAS' },
  { key: 'angles',     label: 'Inglés',        icon: '🌐', color: 'var(--color-angles)',     abbr: 'ANG' },
  { key: 'social',     label: 'Social',        icon: '🏛',  color: 'var(--color-social)',     abbr: 'SOC' },
];

export function getMateriaConfig(key) {
  return MATERIES.find(m => m.key === key) || MATERIES[0];
}

export const ESTAT_CONFIG = {
  bloquejat:  { label: '🔒', color: 'var(--color-text-disabled)',  glow: false },
  disponible: { label: '▶',  color: 'var(--color-neon-green)',     glow: true  },
  completat:  { label: '✓',  color: 'var(--color-gold)',           glow: true  },
  dominat:    { label: '★',  color: 'var(--color-neon-orange)',    glow: true  },
};
