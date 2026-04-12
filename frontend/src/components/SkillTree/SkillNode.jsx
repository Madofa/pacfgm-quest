import { useNavigate } from 'react-router-dom';
import { ESTAT_CONFIG } from '../../data/skillTree';
import styles from './SkillNode.module.css';

export default function SkillNode({ node, color }) {
  const navigate = useNavigate();
  const cfg = ESTAT_CONFIG[node.estat] || ESTAT_CONFIG.bloquejat;
  const clickable = node.estat === 'disponible' || node.estat === 'completat' || node.estat === 'dominat';

  function handleClick() {
    if (clickable) navigate(`/battle/${node.node_id}`);
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
      title={node.estat === 'bloquejat' ? 'Completa el node anterior primer' : node.titol}
    >
      <span className={styles.estat}>{cfg.label}</span>
      <span className={styles.titol}>{node.titol}</span>
      {node.millor_puntuacio > 0 && (
        <span className={styles.score}>{node.millor_puntuacio}%</span>
      )}
    </button>
  );
}
