import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.jsx';
import { api } from '../../services/api';
import { getMateriaConfig } from '../../data/skillTree';
import styles from './RepasPanel.module.css';

const OPCIONS_LLETRES = ['A', 'B', 'C', 'D'];

function getOpcioText(opcio) {
  return typeof opcio === 'string' ? opcio.replace(/^[A-D]\.\s*/, '') : String(opcio || '');
}

function stripMd(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1');
}

// ── Drawer lateral amb explicació detallada ──────────────────────────────────
function ExplicacioDrawer({ error, nodeId, onTancar }) {
  const [explicacio, setExplicacio] = useState('');
  const [carregant, setCarregant]   = useState(true);
  const cfg = getMateriaConfig(nodeId?.split('-')[0] || 'mates');

  // Index de la resposta correcta per obtenir el text complet
  const idxCorrecta = OPCIONS_LLETRES.indexOf(error.resposta_correcta);
  const textCorrecta = idxCorrecta >= 0 && error.opcions?.[idxCorrecta]
    ? getOpcioText(error.opcions[idxCorrecta])
    : error.resposta_correcta;

  useEffect(() => {
    setCarregant(true);
    api.pregunta.explicar(error.pregunta_text, error.opcions, error.resposta_correcta, nodeId)
      .then(data => {
        const text = data.explicacio_ampliada?.trim();
        setExplicacio(text || error.explicacio || 'Sense explicació disponible.');
      })
      .catch((err) => {
        console.warn('[explicar]', err);
        const fallback = error.explicacio;
        setExplicacio(fallback
          ? `${fallback}\n\n(L'explicació detallada no ha pogut carregar: ${err?.error || 'error de connexió'})`
          : `No s'ha pogut generar l'explicació. ${err?.error || 'Torna-ho a intentar.'}`
        );
      })
      .finally(() => setCarregant(false));
  }, [error.pregunta_text]);

  // Bloquejar scroll del fons mentre el drawer és obert
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

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

        {/* Pregunta + resposta correcta (compacte, sense opcions) */}
        <div className={styles.drawerPregunta}>
          <div className={styles.drawerPreguntaLabel}>PREGUNTA</div>
          <p className={styles.drawerPreguntaText}>{error.pregunta_text}</p>
          <div className={styles.drawerRespostaCorrecta} style={{ borderColor: cfg.color }}>
            <span className={styles.drawerRespostaLabel} style={{ color: cfg.color }}>RESPOSTA CORRECTA</span>
            <span className={styles.drawerRespostaVal}>{error.resposta_correcta}. {textCorrecta}</span>
          </div>
        </div>

        <div className={styles.drawerDivider} style={{ background: cfg.color }} />

        {/* Explicació — ara té molt més espai */}
        <div className={styles.drawerCos}>
          {carregant ? (
            <div className={styles.drawerCarregant}>
              <span className={styles.drawerSpinner}>⏳</span>
              <span>Buscant la millor explicació...</span>
            </div>
          ) : (
            <div className={styles.drawerExplicacio}>{stripMd(explicacio)}</div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Targeta d'error ───────────────────────────────────────────────────────────
function ErrorCard({ error, nodeId, onObrirDrawer, onDismiss }) {
  const cfg = getMateriaConfig(nodeId?.split('-')[0] || 'mates');

  const idxCorrecta = OPCIONS_LLETRES.indexOf(error.resposta_correcta);
  const textCorrecta = idxCorrecta >= 0 && error.opcions?.[idxCorrecta]
    ? getOpcioText(error.opcions[idxCorrecta])
    : error.resposta_correcta;

  return (
    <div className={styles.card} style={{ '--mat-color': cfg.color }}>
      {/* Capçalera card: pregunta + botó tancar */}
      <div className={styles.cardHeader}>
        <p className={styles.preguntaText}>{error.pregunta_text}</p>
        <button className={styles.cardDismiss} onClick={() => onDismiss(error.log_id)} title="Tancar">✕</button>
      </div>

      {/* Resposta correcta destacada */}
      <div className={styles.respostaDestacada} style={{ borderColor: cfg.color, background: `color-mix(in srgb, ${cfg.color} 8%, transparent)` }}>
        <span className={styles.respostaDestacadaLabel} style={{ color: cfg.color }}>RESPOSTA CORRECTA</span>
        <span className={styles.respostaDestacadaVal}>{error.resposta_correcta}. {textCorrecta}</span>
      </div>

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
              <span className={styles.opcioText}>{getOpcioText(opcio)}</span>
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

      {/* Anàlisi del desenvolupament (si existeix) */}
      {error.desenvolupament_text && (() => {
        let analisi = null;
        try { analisi = JSON.parse(error.desenvolupament_text); } catch {}
        if (!analisi) return null;
        return (
          <div className={styles.explicacioAmpliada} style={{ '--mat-color': cfg.color }}>
            <span className={styles.explicacioLabel}>📐 ANÀLISI DEL TEU DESENVOLUPAMENT</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
              <span style={{ fontFamily: 'var(--font-game)', fontSize: 10, color: analisi.correcte_resultat ? 'var(--color-neon-green)' : 'var(--color-neon-red)', letterSpacing: 1 }}>
                {analisi.correcte_resultat ? '✓ Resultat OK' : '✗ Resultat erroni'}
              </span>
              <span style={{ fontFamily: 'var(--font-game)', fontSize: 10, color: analisi.correcte_procediment ? 'var(--color-neon-green)' : 'var(--color-neon-orange)', letterSpacing: 1 }}>
                {analisi.correcte_procediment ? '✓ Procediment OK' : '⚠ Procediment amb errors'}
              </span>
            </div>
            {analisi.consell && (
              <div className={styles.explicacioText} style={{ fontSize: 12, borderLeft: '2px solid var(--color-gold)', paddingLeft: 8 }}>
                💡 {analisi.consell}
              </div>
            )}
          </div>
        );
      })()}

      {/* Botó obrir drawer */}
      <button
        className={styles.btnExplicar}
        style={{ '--mat-color': cfg.color }}
        onClick={() => onObrirDrawer(error, nodeId)}
      >
        EXPLICA'M MES
      </button>
    </div>
  );
}

// ── Grup per node ─────────────────────────────────────────────────────────────
function NodeGroup({ grup, onObrirDrawer, onDismiss, dismissed }) {
  const [obert, setObert] = useState(false);
  const cfg = getMateriaConfig(grup.node_id?.split('-')[0] || 'mates');

  const errorsVisibles = grup.errors.filter(e => !dismissed.has(e.log_id));
  if (errorsVisibles.length === 0) return null;

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
          {errorsVisibles.length} error{errorsVisibles.length > 1 ? 's' : ''}
        </span>
        <span className={styles.nodeChevron}>{obert ? '▲' : '▼'}</span>
      </button>

      {obert && (
        <div className={styles.nodeErrors}>
          {errorsVisibles.map((e, i) => (
            <ErrorCard key={e.log_id || i} error={e} nodeId={grup.node_id} onObrirDrawer={onObrirDrawer} onDismiss={onDismiss} />
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
  const [dismissed, setDismissed] = useState(new Set());
  const [revisionsPendents, setRevisionsPendents] = useState(0);

  useEffect(() => {
    api.progres.errorsRecents()
      .then(setGrups)
      .catch(err => setError(err.error || 'Error carregant errors'))
      .finally(() => setLoading(false));
    // Badge de revisions SR pendents
    api.progres.revisions()
      .then(data => setRevisionsPendents((data.revisions || []).length))
      .catch(() => {});
  }, []);

  const obrirDrawer = useCallback((error, nodeId) => {
    setDrawer({ error, nodeId });
  }, []);

  const tancarDrawer = useCallback(() => setDrawer(null), []);

  const dismissCard = useCallback((logId) => {
    setDismissed(prev => new Set([...prev, logId]));
  }, []);

  const totalErrors = grups.reduce((s, g) => {
    const visibles = g.errors.filter(e => !dismissed.has(e.log_id));
    return s + visibles.length;
  }, 0);
  const grupsVisibles = grups.filter(g => g.errors.some(e => !dismissed.has(e.log_id)));

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/')}>◄ INICI</button>
        <div className={styles.headerCenter}>
          <div className={`${styles.title} text-game`}>REPAS D'ERRORS</div>
          {revisionsPendents > 0 && (
            <div className={styles.revisionsBadge}>
              <span className={styles.revisionsBadgeNum}>{revisionsPendents}</span>
              <span className={styles.revisionsBadgeLabel}>SR pendents</span>
            </div>
          )}
        </div>
        <button className={styles.backBtn} onClick={logout}>SORTIR</button>
      </header>

      <main className={styles.main}>
        {loading ? (
          <div className={styles.loading}>Carregant errors recents...</div>
        ) : error ? (
          <div className={styles.errorMsg}>{error}</div>
        ) : grupsVisibles.length === 0 ? (
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
                <span className={styles.resumNum}>{totalErrors}</span> errors en {grupsVisibles.length} tema{grupsVisibles.length > 1 ? 'es' : ''}
              </span>
              <span className={styles.resumSub}>Últims 60 dies · Click per expandir</span>
            </div>

            <div className={styles.grups}>
              {grups.map(g => (
                <NodeGroup
                  key={g.node_id}
                  grup={g}
                  onObrirDrawer={obrirDrawer}
                  onDismiss={dismissCard}
                  dismissed={dismissed}
                />
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
