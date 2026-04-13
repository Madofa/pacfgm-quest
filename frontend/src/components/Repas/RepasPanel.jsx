import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.jsx';
import { api } from '../../services/api';
import { getMateriaConfig } from '../../data/skillTree';
import styles from './RepasPanel.module.css';

const OPCIONS_LLETRES = ['A', 'B', 'C', 'D'];

// ── Drawer lateral amb explicació detallada ──────────────────────────────────
function ExplicacioDrawer({ error, nodeId, onTancar }) {
  const [explicacio, setExplicacio] = useState('');
  const [carregant, setCarregant]   = useState(true);
  const cfg = getMateriaConfig(nodeId?.split('-')[0] || 'mates');

  useEffect(() => {
    setCarregant(true);
    api.pregunta.explicar(error.pregunta_text, error.opcions, error.resposta_correcta, nodeId)
      .then(data => setExplicacio(data.explicacio_ampliada))
      .catch(() => setExplicacio('Error generant l\'explicació. Torna-ho a intentar.'))
      .finally(() => setCarregant(false));
  }, [error.pregunta_text]);

  // Tancar amb Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onTancar(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onTancar]);

  return (
    <>
      {/* Overlay */}
      <div className={styles.drawerOverlay} onClick={onTancar} />

      {/* Drawer */}
      <div className={styles.drawer} style={{ '--mat-color': cfg.color }}>
        <div className={styles.drawerHeader}>
          <div className={styles.drawerTitol} style={{ color: cfg.color }}>
            {cfg.icon} EXPLICACIÓ DETALLADA
          </div>
          <button className={styles.drawerClose} onClick={onTancar} title="Tancar (Esc)">✕</button>
        </div>

        {/* Pregunta resumida */}
        <div className={styles.drawerPregunta}>
          <div className={styles.drawerPreguntaLabel}>PREGUNTA</div>
          <p className={styles.drawerPreguntaText}>{error.pregunta_text}</p>
          <div className={styles.drawerResposta}>
            <span className={styles.drawerRespostaLabel}>RESPOSTA CORRECTA</span>
            <span className={styles.drawerRespostaVal} style={{ color: cfg.color }}>
              {error.resposta_correcta} — {error.opcions[OPCIONS_LLETRES.indexOf(error.resposta_correcta)]?.replace(/^[A-D]\.\s*/, '')}
            </span>
          </div>
        </div>

        <div className={styles.drawerDivider} style={{ background: cfg.color }} />

        {/* Explicació */}
        <div className={styles.drawerCos}>
          {carregant ? (
            <div className={styles.drawerCarregant}>
              <span className={styles.drawerSpinner}>⏳</span>
              <span>Gemini està pensant...</span>
            </div>
          ) : (
            <div className={styles.drawerExplicacio}>{explicacio}</div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Targeta d'error ───────────────────────────────────────────────────────────
function ErrorCard({ error, nodeId, onObrirDrawer }) {
  const cfg = getMateriaConfig(nodeId?.split('-')[0] || 'mates');

  return (
    <div className={styles.card} style={{ '--mat-color': cfg.color }}>
      {/* Pregunta */}
      <p className={styles.preguntaText}>{error.pregunta_text}</p>

      {/* Opcions */}
      <div className={styles.opcions}>
        {error.opcions.map((opcio, i) => {
          const lletra = OPCIONS_LLETRES[i];
          const esCorrecta = lletra === error.resposta_correcta;
          const esFallada  = lletra === error.resposta_alumne;
          return (
            <div
              key={lletra}
              className={`${styles.opcio} ${esCorrecta ? styles.opcioCorrecta : ''} ${esFallada && !esCorrecta ? styles.opcioFallada : ''}`}
            >
              <span className={styles.opcioLletra}>{lletra}</span>
              <span className={styles.opcioText}>{opcio.replace(/^[A-D]\.\s*/, '')}</span>
              {esCorrecta && <span className={styles.badge}>✓ CORRECTA</span>}
              {esFallada && !esCorrecta && <span className={styles.badgeError}>✗ LA TEVA</span>}
            </div>
          );
        })}
      </div>

      {/* Explicació base */}
      {error.explicacio && (
        <div className={styles.explicacioBase}>
          <span className={styles.explicacioLabel}>EXPLICACIÓ</span>
          <div className={styles.explicacioText}>{error.explicacio}</div>
        </div>
      )}

      {/* Botó obrir drawer */}
      <button
        className={styles.btnExplicar}
        style={{ '--mat-color': cfg.color }}
        onClick={() => onObrirDrawer(error, nodeId)}
      >
        💡 EXPLICA'M MÉS
      </button>
    </div>
  );
}

// ── Grup per node ─────────────────────────────────────────────────────────────
function NodeGroup({ grup, onObrirDrawer }) {
  const [obert, setObert] = useState(false);
  const cfg = getMateriaConfig(grup.node_id?.split('-')[0] || 'mates');

  return (
    <div className={styles.nodeGroup}>
      <button
        className={styles.nodeHeader}
        style={{ '--mat-color': cfg.color }}
        onClick={() => setObert(o => !o)}
      >
        <span className={styles.nodeIcon}>{cfg.icon}</span>
        <span className={styles.nodeTitol}>{grup.titol}</span>
        <span className={styles.nodeCount} style={{ color: cfg.color }}>
          {grup.errors.length} error{grup.errors.length > 1 ? 's' : ''}
        </span>
        <span className={styles.nodeChevron}>{obert ? '▲' : '▼'}</span>
      </button>

      {obert && (
        <div className={styles.nodeErrors}>
          {grup.errors.map((e, i) => (
            <ErrorCard key={e.log_id || i} error={e} nodeId={grup.node_id} onObrirDrawer={onObrirDrawer} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Component principal ───────────────────────────────────────────────────────
export default function RepasPanel() {
  const { logout } = useAuth();
  const navigate   = useNavigate();
  const [grups, setGrups]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [drawer, setDrawer]       = useState(null); // { error, nodeId }

  useEffect(() => {
    api.progres.errorsRecents()
      .then(setGrups)
      .catch(err => setError(err.error || 'Error carregant errors'))
      .finally(() => setLoading(false));
  }, []);

  const obrirDrawer = useCallback((error, nodeId) => {
    setDrawer({ error, nodeId });
  }, []);

  const tancarDrawer = useCallback(() => setDrawer(null), []);

  const totalErrors = grups.reduce((s, g) => s + g.errors.length, 0);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/')}>◄ INICI</button>
        <div className={`${styles.title} text-game`}>REPÀS D'ERRORS</div>
        <button className={styles.backBtn} onClick={logout}>SORTIR</button>
      </header>

      <main className={styles.main}>
        {loading ? (
          <div className={styles.loading}>Carregant errors recents...</div>
        ) : error ? (
          <div className={styles.errorMsg}>{error}</div>
        ) : grups.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🏆</div>
            <div className={styles.emptyTitle}>Sense errors recents!</div>
            <p className={styles.emptyText}>No has fallat cap pregunta en els últims 60 dies. Continua així!</p>
            <button className={styles.btnPrimary} onClick={() => navigate('/skill-tree')}>
              SEGUIR ENTRENANT
            </button>
          </div>
        ) : (
          <>
            <div className={styles.resum}>
              <span className={styles.resumTotal}>
                <span className={styles.resumNum}>{totalErrors}</span> errors en {grups.length} tema{grups.length > 1 ? 'es' : ''}
              </span>
              <span className={styles.resumSub}>Últims 60 dies · Click per expandir</span>
            </div>

            <div className={styles.grups}>
              {grups.map(g => (
                <NodeGroup key={g.node_id} grup={g} onObrirDrawer={obrirDrawer} />
              ))}
            </div>
          </>
        )}
      </main>

      {/* Drawer lateral */}
      {drawer && (
        <ExplicacioDrawer
          error={drawer.error}
          nodeId={drawer.nodeId}
          onTancar={tancarDrawer}
        />
      )}
    </div>
  );
}
