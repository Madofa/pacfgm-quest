import styles from './CharacterPanel.module.css';

const RANG_LABELS = {
  novici:   'NOVICI',
  aprenent: 'APRENENT',
  guerrer:  'GUERRER',
  campió:   'CAMPIO',
  mestre:   'MESTRE',
};

const RANG_COLORS = {
  novici:   'var(--color-text-secondary)',
  aprenent: 'var(--color-ciencies)',
  guerrer:  'var(--color-neon-green)',
  campió:   'var(--color-gold)',
  mestre:   'var(--color-neon-orange)',
};

// Sprite placeholder fins tenir els PNGs reals
function SpritePlaceholder({ rang }) {
  const color = RANG_COLORS[rang] || 'var(--color-text-secondary)';
  return (
    <div className={styles.spritePlaceholder} style={{ borderColor: color, boxShadow: `0 0 12px ${color}40` }}>
      <svg width="48" height="64" viewBox="0 0 12 16" style={{ imageRendering: 'pixelated' }}>
        {/* Cap */}
        <rect x="4" y="0" width="4" height="4" fill={color} />
        {/* Cos */}
        <rect x="3" y="4" width="6" height="5" fill={color} opacity="0.8" />
        {/* Braços */}
        <rect x="1" y="4" width="2" height="4" fill={color} opacity="0.6" />
        <rect x="9" y="4" width="2" height="4" fill={color} opacity="0.6" />
        {/* Cames */}
        <rect x="3" y="9" width="2" height="5" fill={color} opacity="0.7" />
        <rect x="7" y="9" width="2" height="5" fill={color} opacity="0.7" />
      </svg>
    </div>
  );
}

export default function CharacterPanel({ usuari }) {
  const rang = usuari?.rang || 'novici';
  const rangColor = RANG_COLORS[rang];

  return (
    <div className={styles.wrapper}>
      <div className={styles.spriteArea}>
        <SpritePlaceholder rang={rang} />
      </div>
      <div className={styles.info}>
        <div className={styles.alias}>{usuari?.alias || '???'}</div>
        <div className={styles.rang} style={{ color: rangColor, textShadow: `0 0 6px ${rangColor}` }}>
          {RANG_LABELS[rang]}
        </div>
        <div className={styles.nivell}>
          LVL <span style={{ color: rangColor }}>{usuari?.nivell || 1}</span>
        </div>
      </div>
    </div>
  );
}
