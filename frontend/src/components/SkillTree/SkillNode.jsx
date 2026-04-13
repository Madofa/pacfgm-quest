import { ESTAT_CONFIG } from '../../data/skillTree';
import styles from './SkillNode.module.css';

// Colors per nivell SR (0=pendent, 1=aprenent, 2=consolidant, 3=quasi, 4=dominat)
const SR_COLORS = ['#ff3860', '#ff9100', '#ffdd57', '#69f0ae', '#00ff9f'];
const SR_LABELS = ['Pendent', 'Aprenent', 'Consolidant', 'Quasi', 'Dominada'];
const MAX_DOTS = 15;

function SrDots({ dots = [], showEmpty = false }) {
  const sorted = [...dots].sort((a, b) => b - a);
  const shown  = sorted.slice(0, MAX_DOTS);
  const unseenShown = Math.max(0, MAX_DOTS - shown.length);

  // Nodes completats sense cap pregunta SR: mostrar grisos placeholder
  if (shown.length === 0 && !showEmpty) return null;

  return (
    <div className={styles.srWrap}>
      <div className={styles.srDots}>
        {shown.map((lvl, i) => (
          <span
            key={i}
            className={styles.srDot}
            style={{ background: SR_COLORS[lvl], boxShadow: lvl >= 3 ? `0 0 4px ${SR_COLORS[lvl]}` : 'none' }}
            title={SR_LABELS[lvl]}
          />
        ))}
        {Array.from({ length: unseenShown }).map((_, i) => (
          <span key={`u${i}`} className={styles.srDotUnseen} />
        ))}
      </div>
    </div>
  );
}

export default function SkillNode({ node, color, srDots = [], onBattle }) {
  const cfg = ESTAT_CONFIG[node.estat] || ESTAT_CONFIG.bloquejat;
  const clickable = node.estat === 'disponible' || node.estat === 'completat' || node.estat === 'dominat';

  function handleClick() {
    if (clickable && onBattle) onBattle(node.node_id);
  }

  return (
    <button
      className={`${styles.node} ${styles[node.estat]} ${clickable ? styles.clickable : ''}`}
      style={{
        '--node-color': cfg.color,
        '--mat-color': color,
        borderColor: cfg.glow ? cfg.color : 'var(--color-text-disabled)',
        boxShadow: cfg.glow ? `0 0 10px ${cfg.color}60` : 'none',
      }}
      onClick={handleClick}
      disabled={!clickable}
      title={node.estat === 'bloquejat' ? 'Completa el tema anterior primer' : node.titol}
    >
      <span className={styles.estat}>{cfg.label}</span>
      <span className={styles.titol}>{node.titol}</span>
      {node.millor_puntuacio > 0 && (
        <span className={styles.score}>{node.millor_puntuacio}%</span>
      )}
      <SrDots dots={srDots} showEmpty={node.estat === 'completat' || node.estat === 'dominat'} />
    </button>
  );
}
