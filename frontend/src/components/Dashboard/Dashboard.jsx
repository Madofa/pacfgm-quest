import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useProgress } from '../../hooks/useProgress';
import { api } from '../../services/api';
import CharacterPanel from './CharacterPanel';
import XPBar from './XPBar';
import BossTimer from './BossTimer';
import StreakCounter from './StreakCounter';
import StatsPanel, { MODES } from './StatsPanel';
import styles from './Dashboard.module.css';

const SR_COLORS = ['#ff3860', '#ff9100', '#ffdd57', '#69f0ae', '#00ff9f'];
const SR_INTERVALS = [1, 3, 7, 14, 30];
const SR_LABELS = ['demà', '+3d', '+7d', '+14d', '★ 30d'];

function MilloresSR({ dades }) {
  if (!dades) return null;
  const { millores, sessio } = dades;
  if (!millores || millores.length === 0) return null;

  const dominades = millores.filter(m => m.correcte && m.nivell_sr >= 4).length;
  const pujades   = millores.filter(m => m.correcte && m.nivell_sr < 4).length;
  const fallades  = millores.filter(m => !m.correcte).length;

  return (
    <div className={styles.milloraWrap}>
      <div className={styles.panelTitle} style={{ color: 'var(--color-neon-green)' }}>
        ⚡ MILLORA DE MEMÒRIA — ÚLTIMA SESSIÓ
      </div>

      <div className={styles.milloraLlista}>
        {millores.map((m, i) => (
          <div key={i} className={styles.milloraRow} style={{ borderColor: m.correcte ? `${SR_COLORS[m.nivell_sr]}44` : '#ff386033' }}>
            <span className={styles.milloraPregunta}>{m.pregunta}</span>
            <div className={styles.milloraArrow}>
              <span className={styles.millloraPip} style={{ background: SR_COLORS[m.correcte ? Math.max(0, m.nivell_sr - 1) : 0] }} />
              <span style={{ color: 'var(--color-text-disabled)', fontSize: 10 }}>{m.correcte ? '→' : '↓'}</span>
              <span className={styles.millloraPip} style={{ background: SR_COLORS[m.nivell_sr] }} />
            </div>
            <span className={styles.milloraDies} style={{ color: m.correcte ? SR_COLORS[m.nivell_sr] : '#ff3860' }}>
              {m.correcte ? SR_LABELS[m.nivell_sr] : 'demà'}
            </span>
          </div>
        ))}
      </div>

      <div className={styles.milloraResum}>
        {dominades > 0 && (
          <div className={styles.milloraPill}>
            <span className={styles.milloraPillNum} style={{ color: '#00ff9f' }}>{dominades}</span>
            <span className={styles.milloraPillLabel}>nova dominada</span>
          </div>
        )}
        <div className={styles.milloraPill}>
          <span className={styles.milloraPillNum} style={{ color: '#ffdd57' }}>{pujades}</span>
          <span className={styles.milloraPillLabel}>han pujat</span>
        </div>
        {fallades > 0 && (
          <div className={styles.milloraPill}>
            <span className={styles.milloraPillNum} style={{ color: '#ff3860' }}>{fallades}</span>
            <span className={styles.milloraPillLabel}>per repassar</span>
          </div>
        )}
      </div>
    </div>
  );
}

const SR_NIVELLS = [
  { key: 'dominades',   label: 'Dominades',    color: '#00ff9f' },
  { key: 'quasi',       label: 'Quasi (14d)',   color: '#69f0ae' },
  { key: 'consolidant', label: 'Consolidant',   color: '#ffdd57' },
  { key: 'aprenent',    label: 'Aprenent',      color: '#ff9100' },
  { key: 'pendents',    label: 'Pendents',      color: '#ff3860' },
];

function MemoriaBlock({ memoria }) {
  if (!memoria) return <div className={styles.memoriaLoading}>...</div>;

  const max = Math.max(memoria.dominades, memoria.quasi, memoria.consolidant, memoria.aprenent, memoria.pendents, 1);

  return (
    <div className={styles.memoriaWrap}>
      {/* Resum top */}
      <div className={styles.memoriaStats}>
        <div className={styles.memStat}>
          <span className={styles.memIcon} style={{ color: '#00ff9f' }}>■</span>
          <span className={styles.memNum} style={{ color: '#00ff9f' }}>{memoria.dominades}</span>
          <span className={styles.memLabel}>dominades</span>
        </div>
        <div className={styles.memStat}>
          <span className={styles.memIcon} style={{ color: '#ffdd57' }}>■</span>
          <span className={styles.memNum} style={{ color: '#ffdd57' }}>{memoria.consolidant}</span>
          <span className={styles.memLabel}>consolidant</span>
        </div>
        <div className={styles.memStat}>
          <span className={styles.memIcon} style={{ color: '#ff3860' }}>■</span>
          <span className={styles.memNum} style={{ color: '#ff3860' }}>{memoria.pendents}</span>
          <span className={styles.memLabel}>repàs pendent</span>
        </div>
      </div>

      {/* Barres per nivell */}
      <div className={styles.memoriaBarres}>
        {SR_NIVELLS.map(n => (
          <div key={n.key} className={styles.memoriaBarRow}>
            <span className={styles.memoriaBarLabel} style={{ color: n.color }}>{n.label}</span>
            <div className={styles.memoriaBarTrack}>
              <div
                className={styles.memoriaBarFill}
                style={{ width: `${Math.round((memoria[n.key] / max) * 100)}%`, background: n.color, boxShadow: `0 0 4px ${n.color}80` }}
              />
            </div>
            <span className={styles.memoriaBarVal} style={{ color: n.color }}>{memoria[n.key]}</span>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className={styles.memoriaTotal}>
        {memoria.vistes} vistes · {memoria.total_banc} al banc
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { usuari, logout } = useAuth();
  const { progres, skillTree, revisions, retencio, loading } = useProgress();
  const navigate = useNavigate();
  const [timerEnabled, setTimerEnabled] = useState(
    localStorage.getItem('timerEnabled') !== 'false'
  );
  const [statsMode, setStatsMode] = useState(() => {
    const saved = localStorage.getItem('statsMode');
    if (!saved || saved === 'donut') {
      localStorage.setItem('statsMode', 'bars');
      return 'bars';
    }
    return saved;
  });

  function toggleTimer() {
    const nou = !timerEnabled;
    setTimerEnabled(nou);
    localStorage.setItem('timerEnabled', String(nou));
  }

  function cycleStatsMode() {
    const idx = MODES.findIndex(m => m.key === statsMode);
    const nou = MODES[(idx + 1) % MODES.length].key;
    setStatsMode(nou);
    localStorage.setItem('statsMode', nou);
  }

  const nodesCompletats = skillTree.filter(n => n.estat === 'completat' || n.estat === 'dominat').length;
  const totalNodes = skillTree.length;

  // Memòria SR
  const [memoria, setMemoria] = useState(null);
  useEffect(() => {
    api.progres.memoria().then(setMemoria).catch(() => {});
  }, []);

  // Millores SR última sessió
  const [milloresSR, setMilloresSR] = useState(null);
  useEffect(() => {
    api.progres.ultimesMillores().then(setMilloresSR).catch(() => {});
  }, []);

  // Grup de l'alumne
  const [grups, setGrups]           = useState(null);
  const [codiGrup, setCodiGrup]     = useState('');
  const [unintGrup, setUnintGrup]   = useState(false);
  const [errorGrup, setErrorGrup]   = useState('');

  useEffect(() => {
    api.grup.meus().then(setGrups).catch(() => setGrups([]));
  }, []);

  async function unirGrup() {
    if (codiGrup.trim().length < 4) return;
    setErrorGrup('');
    try {
      const data = await api.grup.unir(codiGrup.trim());
      setGrups([{ ...data.grup, num_alumnes: 0, num_monitors: 0 }]);
      setUnintGrup(true);
    } catch (err) { setErrorGrup(err.error || 'Codi incorrecte'); }
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={`${styles.logo} text-neon-green text-game`}>
          PACFGM QUEST <span className={styles.betaBadge}>BETA</span>
        </div>
        <nav className={styles.nav}>
          <button className={styles.navBtn} onClick={() => navigate('/skill-tree')}>ARBRE</button>
          <button className={styles.navBtn} onClick={() => navigate('/leaderboard')}>RÀNQUING</button>
          <button className={styles.navBtn} onClick={() => navigate('/repas')}>REPÀS</button>
          <button className={styles.navBtn} onClick={() => navigate('/ajuda')}>?</button>
          <button className={`${styles.navBtn} ${styles.navBtnDanger}`} onClick={logout}>SORTIR</button>
        </nav>
      </header>

      <main className={styles.main}>
        {/* Columna esquerra — personatge */}
        <aside className={`${styles.sidePanel} panel-rpg animate-panel-in`}>
          <CharacterPanel usuari={usuari} />
          <div className={styles.divider} />
          <div className={styles.statBlock}>
            <span className={styles.statLabel}>MEMÒRIA</span>
            <MemoriaBlock memoria={memoria} />
          </div>
        </aside>

        {/* Columna central — stats */}
        <section className={styles.centerPanel}>
          {/* XP */}
          <div className={`panel-rpg ${styles.xpPanel} animate-panel-in`} style={{ animationDelay: '0.05s' }}>
            <div className={styles.panelTitle}>EXPERIÈNCIA</div>
            <XPBar xp_total={progres?.xp_total || 0} nivell={usuari?.nivell || 1} />
            <div className={styles.xpTotal}>
              Total: <span className="text-gold text-game">{(progres?.xp_total || 0).toLocaleString()} XP</span>
            </div>
          </div>

          {/* Radar */}
          <div className={`panel-rpg ${styles.radarPanel} animate-panel-in`} style={{ animationDelay: '0.1s' }}>
            <div className={styles.panelTitle}>ATRIBUTS</div>
            {loading ? (
              <div className={styles.loading}>Carregant...</div>
            ) : (
              <StatsPanel nodes={skillTree} retencio={retencio} mode={statsMode} />
            )}
          </div>

          {/* Revisions pendents */}
          {revisions.length > 0 && (
            <div className={`panel-rpg ${styles.revisionsPanel} animate-panel-in`} style={{ animationDelay: '0.12s' }}>
              <div className={styles.panelTitle} style={{ color: 'var(--color-neon-orange)' }}>
                ⏰ REPÀS PENDENT — {revisions.length} {revisions.length === 1 ? 'NODE' : 'NODES'}
              </div>
              <div className={styles.revisionsList}>
                {revisions.slice(0, 4).map(r => (
                  <button
                    key={r.node_id}
                    className={styles.revisionItem}
                    onClick={() => navigate(`/battle/${r.node_id}`)}
                  >
                    <span className={styles.revisionTitol}>{r.titol}</span>
                    <span className={styles.revisionBadge}>REPASSAR</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Millores SR última sessió */}
          {milloresSR?.millores?.length > 0 && (
            <div className={`panel-rpg animate-panel-in`} style={{ animationDelay: '0.14s', padding: 'var(--spacing-xl)' }}>
              <MilloresSR dades={milloresSR} />
            </div>
          )}

          {/* CTA */}
          <button
            className={`${styles.ctaBtn} animate-panel-in`}
            style={{ animationDelay: '0.15s' }}
            onClick={() => navigate('/skill-tree')}
          >
            <span className={styles.ctaIcon}>⚔</span>
            <span>{nodesCompletats === 0 ? 'COMEÇAR ENTRENAMENT' : 'CONTINUAR ENTRENANT'}</span>
          </button>
        </section>

        {/* Columna dreta — estadístiques */}
        <aside className={`${styles.rightPanel} panel-rpg animate-panel-in`} style={{ animationDelay: '0.08s' }}>
          <div className={styles.statBlock}>
            <span className={styles.statLabel}>RATXA</span>
            <StreakCounter dies={progres?.racha_dies || 0} />
          </div>

          <div className={styles.divider} />

          <div className={styles.bossBlock}>
            <span className={styles.bossBlockLabel}>⚔ JEFE FINAL</span>
            <BossTimer />
          </div>

          <div className={styles.divider} />

          <div className={styles.statBlock}>
            <span className={styles.statLabel}>PROGRÉS</span>
            <span className={styles.nodeCount}>
              <span className="text-neon-green text-game">{nodesCompletats}</span>
              <span className={styles.nodeTotal}> / {totalNodes}</span>
            </span>
            <span className={styles.statSub}>temes completats</span>
          </div>

          <div className={styles.divider} />

          <div className={styles.statBlock}>
            <span className={styles.statLabel}>GRUP</span>
            {grups === null ? (
              <span className={styles.statSub}>...</span>
            ) : grups.length > 0 && !grups[0].pendent ? (
              <span className={styles.statSub} style={{ color: 'var(--color-neon-green)' }}>
                {grups[0].nom}
              </span>
            ) : grups.length > 0 && grups[0].pendent ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span className={styles.statSub} style={{ color: 'var(--color-neon-orange)', fontSize: 10 }}>
                  ⏳ {grups[0].nom}
                </span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 9, color: 'var(--color-text-disabled)', lineHeight: 1.3 }}>
                  Pendent d'aprovació pel tutor
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <input
                  className={styles.grupInput}
                  placeholder="Codi del grup"
                  value={codiGrup}
                  onChange={e => setCodiGrup(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && unirGrup()}
                  maxLength={8}
                />
                <button className={styles.toggleBtn} style={{ borderColor: 'var(--color-neon-green)', color: 'var(--color-neon-green)' }} onClick={unirGrup}>
                  UNIR-ME
                </button>
                {errorGrup && <span style={{ fontSize: 10, color: 'var(--color-neon-red)', fontFamily: 'var(--font-body)' }}>{errorGrup}</span>}
              </div>
            )}
          </div>

          <div className={styles.divider} />

          <div className={styles.statBlock}>
            <span className={styles.statLabel}>AJUSTOS</span>
            <button className={`${styles.toggleBtn} ${timerEnabled ? styles.toggleOn : styles.toggleOff}`} onClick={toggleTimer}>
              ⏱ TEMPS {timerEnabled ? 'ON' : 'OFF'}
            </button>
            <button className={`${styles.toggleBtn} ${styles.toggleOn}`} onClick={cycleStatsMode} style={{ marginTop: 4 }}>
              {MODES.find(m => m.key === statsMode)?.label}
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}
