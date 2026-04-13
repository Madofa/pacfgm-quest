// StatsPanel — 4 visualitzacions seleccionables per l'usuari
// Modes: 'donut' (defecte), 'bars', 'hex', 'cards'

import styles from './StatsPanel.module.css';

const MATERIES = [
  { key: 'mates',      label: 'Matemàtiques', icon: '🔢', color: 'var(--color-mates)' },
  { key: 'catala',     label: 'Català',        icon: '📖', color: 'var(--color-catala)' },
  { key: 'castella',   label: 'Castellà',      icon: '📝', color: 'var(--color-castella)' },
  { key: 'angles',     label: 'Anglès',        icon: '🇬🇧', color: 'var(--color-angles)' },
  { key: 'ciencies',   label: 'Ciències',      icon: '🔬', color: 'var(--color-ciencies)' },
  { key: 'tecnologia', label: 'Tecnologia',    icon: '⚙️', color: 'var(--color-tecnologia)' },
  { key: 'social',     label: 'Socials',       icon: '🌍', color: 'var(--color-social)' },
];

// pct = 70% retencio SR (decau amb el temps) + 30% nodes completats (assoliment estàtic)
// Si no hi ha SR data: el pes recau al 100% sobre nodes completats
function calcStats(nodes = [], retencio = {}) {
  const nodeStats = {};
  MATERIES.forEach(m => { nodeStats[m.key] = { completats: 0, total: 0 }; });
  nodes.forEach(n => {
    const mat = n.node_id?.split('-')[0];
    if (nodeStats[mat]) {
      nodeStats[mat].total++;
      if (n.estat === 'completat' || n.estat === 'dominat') nodeStats[mat].completats++;
    }
  });

  return MATERIES.map(m => {
    const ns = nodeStats[m.key];
    const nodePct = ns.total > 0 ? Math.round((ns.completats / ns.total) * 100) : 0;
    const ret = retencio[m.key];

    let pct;
    let caducades = 0;
    let fresques = 0;
    let totalSR = 0;

    if (ret && ret.total > 0) {
      // Tenim dades SR — combinem
      const srPct = ret.pct; // % de preguntes fresques
      pct = Math.round(srPct * 0.7 + nodePct * 0.3);
      caducades = ret.caducades;
      fresques  = ret.fresques;
      totalSR   = ret.total;
    } else {
      // Sense SR — només nodes completats (però limitat al 40% màx per animar a practicar)
      pct = Math.round(nodePct * 0.4);
      caducades = 0;
      fresques  = 0;
      totalSR   = 0;
    }

    return {
      ...m,
      completats: ns.completats,
      total:      ns.total,
      nodePct,
      pct:        Math.min(100, Math.max(0, pct)),
      caducades,
      fresques,
      totalSR,
    };
  });
}

// ── Opció 1: Barres horitzontals ──────────────────────────────────────────────
function BarresView({ data }) {
  return (
    <div className={styles.barresList}>
      {data.map(m => (
        <div key={m.key} className={styles.barRow}>
          <div className={styles.barHeader}>
            <span className={styles.barName}>{m.icon} {m.label}</span>
            <span className={styles.barPct} style={{ color: m.color }}>{m.pct}%</span>
          </div>
          <div className={styles.barTrack}>
            <div
              className={styles.barFill}
              style={{ width: `${m.pct}%`, background: m.color, boxShadow: `0 0 6px ${m.color}80` }}
            />
          </div>
          {m.caducades > 0 && (
            <div className={styles.decayHint}>
              ⚠ {m.caducades} preg. per repassar
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Opció 2: Hexàgons ─────────────────────────────────────────────────────────
function HexView({ data }) {
  return (
    <div className={styles.hexGrid}>
      {data.map(m => (
        <div key={m.key} className={styles.hexWrap}>
          <div className={styles.hex} style={{ '--hex-color': m.color }}>
            <div className={styles.hexBg} />
            <div className={styles.hexGlow} style={{ background: `${m.color}22` }} />
            <div className={styles.hexContent}>
              <span className={styles.hexIcon}>{m.icon}</span>
              <span className={styles.hexPct} style={{ color: m.color }}>{m.pct}%</span>
            </div>
          </div>
          <span className={styles.hexName} style={{ color: m.color }}>{m.label.split(' ')[0]}</span>
        </div>
      ))}
    </div>
  );
}

// ── Opció 3: Donuts ───────────────────────────────────────────────────────────
const R = 24;
const CIRC = 2 * Math.PI * R;

function DonutView({ data }) {
  return (
    <div className={styles.donutGrid}>
      {data.map(m => {
        const offset = CIRC - (m.pct / 100) * CIRC;
        return (
          <div key={m.key} className={styles.donutItem}>
            <svg width="64" height="64" viewBox="0 0 64 64" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="32" cy="32" r={R} fill="none" stroke="var(--color-bg-panel-2)" strokeWidth="8" />
              <circle
                cx="32" cy="32" r={R}
                fill="none"
                stroke={m.color}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={offset}
                style={{ filter: m.pct > 0 ? `drop-shadow(0 0 4px ${m.color})` : 'none', transition: 'stroke-dashoffset 0.6s ease' }}
              />
              <text
                x="32" y="32"
                textAnchor="middle"
                dominantBaseline="middle"
                fill={m.pct > 0 ? m.color : 'var(--color-text-secondary)'}
                style={{ fontFamily: 'var(--font-game)', fontSize: '8px', transform: 'rotate(90deg)', transformOrigin: '32px 32px' }}
              >{m.pct}%</text>
            </svg>
            <span className={styles.donutName} style={{ color: m.pct > 0 ? m.color : 'var(--color-text-secondary)' }}>
              {m.label.split(' ')[0]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Opció 4: Tarjetes compactes ───────────────────────────────────────────────
function CardsView({ data }) {
  return (
    <div className={styles.cardsList}>
      {data.map(m => (
        <div key={m.key} className={styles.statCard} style={{ '--card-color': m.color }}>
          <span className={styles.cardIcon}>{m.icon}</span>
          <div className={styles.cardInfo}>
            <div className={styles.cardTop}>
              <span className={styles.cardMateria} style={{ color: m.color }}>{m.label}</span>
              <span className={styles.cardVal} style={{ color: m.color }}>{m.completats}/{m.total}</span>
            </div>
            <div className={styles.miniBar}>
              <div className={styles.miniFill}
                style={{ width: `${m.pct}%`, background: m.color, boxShadow: `0 0 4px ${m.color}80` }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Component principal ───────────────────────────────────────────────────────
const MODES = [
  { key: 'bars',  label: '▬ BARRES' },
  { key: 'hex',   label: '⬡ HEX' },
  { key: 'cards', label: '▤ TARJETES' },
];

export default function StatsPanel({ nodes = [], retencio = {}, mode, onModeChange }) {
  const data = calcStats(nodes, retencio);

  return (
    <div className={styles.wrapper}>
      {mode === 'bars'  && <BarresView data={data} />}
      {mode === 'hex'   && <HexView   data={data} />}
      {mode === 'donut' && <DonutView data={data} />}
      {mode === 'cards' && <CardsView data={data} />}
    </div>
  );
}

export { MODES };
