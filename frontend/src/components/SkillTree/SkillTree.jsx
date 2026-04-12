import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useProgress } from '../../hooks/useProgress';
import { MATERIES, getMateriaConfig } from '../../data/skillTree';
import SkillNode from './SkillNode';
import styles from './SkillTree.module.css';

export default function SkillTree() {
  const { logout } = useAuth();
  const { skillTree, loading } = useProgress();
  const navigate = useNavigate();
  const [materiaActiva, setMateriaActiva] = useState('mates');

  // Agrupar nodes per materia
  const nodesByMateria = {};
  MATERIES.forEach(m => { nodesByMateria[m.key] = []; });
  skillTree.forEach(n => {
    if (nodesByMateria[n.materia]) nodesByMateria[n.materia].push(n);
  });

  // Ordenar nodes de cada materia per cadena (pare → fills)
  function sortNodes(nodes) {
    if (!nodes.length) return [];
    const root = nodes.find(n => !n.pare || !nodes.find(p => p.node_id === n.pare));
    if (!root) return nodes;

    const ordered = [];
    let current = root;
    while (current) {
      ordered.push(current);
      current = nodes.find(n => n.node_id === current.fills?.[0]);
    }
    return ordered;
  }

  const cfg = getMateriaConfig(materiaActiva);
  const nodesActius = sortNodes(nodesByMateria[materiaActiva] || []);

  const statsMateria = MATERIES.map(m => {
    const ns = nodesByMateria[m.key] || [];
    const completats = ns.filter(n => n.estat === 'completat' || n.estat === 'dominat').length;
    return { ...m, completats, total: ns.length };
  });

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/')}>◄ DASHBOARD</button>
        <div className={`${styles.title} text-game`}>ÁRBOL DE HABILIDADES</div>
        <button className={styles.backBtn} onClick={logout}>SALIR</button>
      </header>

      <main className={styles.main}>
        {/* Selector de materia */}
        <nav className={styles.materiaNav}>
          {statsMateria.map(m => (
            <button
              key={m.key}
              className={`${styles.materiaBtn} ${materiaActiva === m.key ? styles.actiu : ''}`}
              style={{ '--mat-color': m.color }}
              onClick={() => setMateriaActiva(m.key)}
            >
              <span className={styles.materiaIcon}>{m.icon}</span>
              <span className={styles.materiaAbbr}>{m.abbr}</span>
              <span className={styles.materiaProgress}>
                {m.completats}/{m.total}
              </span>
            </button>
          ))}
        </nav>

        {/* Cadena de nodes */}
        <section className={styles.chainSection}>
          <div className={styles.materiaHeader}>
            <span className={styles.materiaFullLabel} style={{ color: cfg.color, textShadow: `0 0 8px ${cfg.color}` }}>
              {cfg.icon} {cfg.label.toUpperCase()}
            </span>
            <span className={styles.materiaStats}>
              {nodesActius.filter(n => n.estat === 'completat' || n.estat === 'dominat').length} / {nodesActius.length} completados
            </span>
          </div>

          {loading ? (
            <div className={styles.loading}>Cargando...</div>
          ) : (
            <div className={styles.chain}>
              {nodesActius.map((node, i) => (
                <div key={node.node_id} className={styles.nodeWrapper}>
                  <SkillNode node={node} color={cfg.color} />
                  {i < nodesActius.length - 1 && (
                    <div
                      className={`${styles.connector} ${
                        node.estat === 'completat' || node.estat === 'dominat' ? styles.connectorActive : ''
                      }`}
                      style={{ '--mat-color': cfg.color }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Leyenda */}
        <div className={styles.legend}>
          {[
            { estat: 'bloquejat',  label: 'Bloqueado' },
            { estat: 'disponible', label: 'Disponible' },
            { estat: 'completat',  label: 'Completado' },
            { estat: 'dominat',    label: 'Dominado'   },
          ].map(({ estat, label }) => (
            <div key={estat} className={styles.legendItem}>
              <span className={`${styles.legendDot} ${styles[`dot_${estat}`]}`} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
