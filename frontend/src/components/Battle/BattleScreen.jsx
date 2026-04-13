import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { getMateriaConfig } from '../../data/skillTree';
import styles from './BattleScreen.module.css';

const OPCIONS = ['A', 'B', 'C', 'D'];
const TEMPS_LIMIT = 30; // segons

const SR_COLORS  = ['#ff3860', '#ff9100', '#ffdd57', '#69f0ae', '#00ff9f'];
const SR_LABELS  = ['Pendent', 'Aprenent', 'Consolidant', 'Quasi', 'Dominada'];
const SR_DIES_LABEL = [1, 3, 7, 14, 30];

function getTimerEnabled() {
  return localStorage.getItem('timerEnabled') !== 'false';
}

export default function BattleScreen() {
  const { nodeId }  = useParams();
  const navigate    = useNavigate();
  const materia     = nodeId?.split('-')[0] || 'mates';
  const cfg         = getMateriaConfig(materia);

  const [fase, setFase]               = useState('carregant'); // carregant | pregunta | resultat | final
  const [sessioId, setSessioId]       = useState(null);
  const [pregunta, setPregunta]       = useState(null);
  const [numeroPregunta, setNumeroPregunta] = useState(1);
  const [respostaSelec, setRespostaSelec]   = useState(null);
  const [feedback, setFeedback]       = useState(null); // { correcte, correcta, explicacio }
  const [resultatFinal, setResultatFinal]   = useState(null);
  const [temps, setTemps]             = useState(TEMPS_LIMIT);
  const [tempsInici, setTempsInici]   = useState(null);
  const [error, setError]             = useState('');
  const [timerEnabled]                = useState(getTimerEnabled);

  // Cargar primera pregunta
  useEffect(() => { carregarPregunta(); }, [nodeId]);

  // Timer (només si està activat)
  useEffect(() => {
    if (fase !== 'pregunta' || !timerEnabled) return;
    const id = setInterval(() => {
      setTemps(t => {
        if (t <= 1) { clearInterval(id); respondre(null); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [fase, numeroPregunta, timerEnabled]);

  async function carregarPregunta() {
    setFase('carregant');
    setRespostaSelec(null);
    setFeedback(null);
    setError('');
    try {
      const data = await api.pregunta.generar(nodeId, 'catala');
      setSessioId(data.sessio_id);
      setPregunta(data);
      setNumeroPregunta(data.numero_pregunta);
      setTemps(TEMPS_LIMIT);
      setTempsInici(Date.now());
      setFase('pregunta');
    } catch (err) {
      setError(err.error || 'Error carregant la pregunta');
      setFase('error');
    }
  }

  async function respondre(opcio) {
    if (fase !== 'pregunta' || respostaSelec) return;
    const tempsMsResposta = tempsInici ? Date.now() - tempsInici : 0;
    setRespostaSelec(opcio || 'X');

    try {
      const data = await api.pregunta.resposta(sessioId, opcio || 'X', tempsMsResposta);
      setFeedback({
        correcte:   data.correcte,
        correcta:   data.resposta_correcta,
        explicacio: data.explicacio,
        progres:    data.progres_sessio,
      });
      setFase('resultat');
    } catch (err) {
      setError(err.error || 'Error en respondre');
    }
  }

  async function seguentPregunta() {
    if (feedback?.progres?.respostes_fetes >= 5) {
      await finalitzar();
    } else {
      carregarPregunta();
    }
  }

  async function finalitzar() {
    setFase('carregant');
    try {
      const data = await api.pregunta.finalitzar(sessioId);
      setResultatFinal(data);
      setFase('final');
    } catch (err) {
      setError(err.error || 'Error en finalitzar');
      setFase('error');
    }
  }

  const pctTemps = (temps / TEMPS_LIMIT) * 100;
  const colorTemps = temps > 15 ? 'var(--color-neon-green)' : temps > 7 ? 'var(--color-gold)' : 'var(--color-neon-red)';

  // ── PANTALLA CARGANDO ───────────────────────────────
  if (fase === 'carregant') {
    return (
      <div className={styles.fullCenter}>
        <div className={styles.loadingText} style={{ color: cfg.color }}>GENERANT PREGUNTA...</div>
        <div className={styles.loadingDots}>
          <span /><span /><span />
        </div>
      </div>
    );
  }

  // ── PANTALLA ERROR ──────────────────────────────────
  if (fase === 'error') {
    return (
      <div className={styles.fullCenter}>
        <div className={styles.errorText}>{error}</div>
        <button className={styles.btnSecondary} onClick={() => navigate('/skill-tree')}>Tornar a l'arbre</button>
      </div>
    );
  }

  // ── PANTALLA RESULTADO FINAL ────────────────────────
  if (fase === 'final' && resultatFinal) {
    const superat = resultatFinal.superat;
    return (
      <div className={`${styles.page} ${styles.pageFinal} ${superat ? styles.pageVictoria : styles.pageDerrota}`}>
        <div className={styles.finalCard}>
          <div className={styles.finalIcon}>{superat ? '⭐' : '💀'}</div>
          <div className={styles.finalTitle} style={{ color: superat ? 'var(--color-neon-green)' : 'var(--color-neon-red)' }}>
            {superat ? 'VICTÒRIA!' : 'DERROTA'}
          </div>
          <div className={styles.finalScore}>{resultatFinal.puntuacio}%</div>

          <div className={styles.finalStats}>
            <div className={styles.finalStat}>
              <span className={styles.finalStatLabel}>XP GUANYAT</span>
              <span className={styles.finalStatVal} style={{ color: 'var(--color-gold)' }}>+{resultatFinal.xp_guanyat}</span>
            </div>
            {resultatFinal.rang_nou && (
              <div className={styles.finalStat}>
                <span className={styles.finalStatLabel}>NOU RANG</span>
                <span className={styles.finalStatVal} style={{ color: 'var(--color-neon-orange)' }}>{resultatFinal.rang_nou.toUpperCase()}</span>
              </div>
            )}
            {resultatFinal.nodes_desbloquejats?.length > 0 && (
              <div className={styles.finalStat}>
                <span className={styles.finalStatLabel}>DESBLOQUEJAT</span>
                <span className={styles.finalStatVal} style={{ color: 'var(--color-neon-green)' }}>
                  {resultatFinal.nodes_desbloquejats.length} tema{resultatFinal.nodes_desbloquejats.length > 1 ? 'es' : ''} nou{resultatFinal.nodes_desbloquejats.length > 1 ? 's' : ''}
                </span>
              </div>
            )}
            <div className={styles.finalStat}>
              <span className={styles.finalStatLabel}>RATXA</span>
              <span className={styles.finalStatVal} style={{ color: 'var(--color-gold)' }}>🔥 {resultatFinal.nova_racha} dies</span>
            </div>
            {resultatFinal.propera_revisio && (
              <div className={styles.finalStat}>
                <span className={styles.finalStatLabel}>PROPER REPÀS</span>
                <span className={styles.finalStatVal} style={{ color: 'var(--color-neon-orange)' }}>
                  {resultatFinal.propera_revisio}
                </span>
              </div>
            )}
          </div>
          {/* Resum SR per pregunta */}
          {resultatFinal.sr_preguntes?.length > 0 && (
            <div className={styles.srResum}>
              <div className={styles.srResumTitle}>MEMÒRIA</div>
              {resultatFinal.sr_preguntes.map((p, i) => (
                <div key={i} className={styles.srRow}>
                  <span className={`${styles.srCheck} ${p.correcte ? styles.srOk : styles.srKo}`}>
                    {p.correcte ? '✓' : '✗'}
                  </span>
                  <span className={styles.srText}>{p.text.length > 55 ? p.text.slice(0, 55) + '…' : p.text}</span>
                  <span
                    className={styles.srDot}
                    style={{
                      background: SR_COLORS[p.sr_level],
                      boxShadow: p.sr_level >= 3 ? `0 0 5px ${SR_COLORS[p.sr_level]}` : 'none',
                    }}
                    title={SR_LABELS[p.sr_level]}
                  />
                  <span className={styles.srInterval}>{p.interval}d</span>
                </div>
              ))}
            </div>
          )}

          <div className={styles.finalBtns}>
            {!superat && (
              <button className={styles.btnPrimary} style={{ '--btn-color': cfg.color }} onClick={carregarPregunta}>
                TORNAR A INTENTAR
              </button>
            )}
            <button className={styles.btnSecondary} onClick={() => navigate('/skill-tree')}>
              ARBRE
            </button>
            <button className={styles.btnSecondary} onClick={() => navigate('/')}>
              INICI
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── PANTALLA PREGUNTA / RESULTADO ───────────────────
  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/skill-tree')}>◄</button>
        <div className={styles.headerCenter}>
          <span className={styles.nodeLabel} style={{ color: cfg.color }}>{cfg.icon} {pregunta?.node_id?.split('-').slice(1).join(' ').toUpperCase()}</span>
          <div className={styles.bullets}>
            {[1,2,3,4,5].map(i => (
              <span
                key={i}
                className={`${styles.bullet} ${i < numeroPregunta ? styles.bulletDone : ''} ${i === numeroPregunta ? styles.bulletActual : ''}`}
                style={{ '--cfg-color': cfg.color }}
              />
            ))}
          </div>
        </div>
        <div className={styles.pregNum} style={{ color: cfg.color }}>
          {numeroPregunta}/5
        </div>
      </header>

      {/* Timer (opcional) */}
      {timerEnabled && (
        <>
          <div className={styles.timerBar}>
            <div
              className={styles.timerFill}
              style={{ width: `${pctTemps}%`, background: colorTemps, boxShadow: `0 0 8px ${colorTemps}` }}
            />
          </div>
          <div className={styles.timerNum} style={{ color: colorTemps }}>{temps}s</div>
        </>
      )}

      <main className={styles.main}>
        {/* Pregunta */}
        <div className={`${styles.questionCard} panel-rpg`} style={{ borderColor: cfg.color + '40' }}>
          <p className={styles.questionText}>{pregunta?.pregunta}</p>
        </div>

        {/* Opciones */}
        <div className={styles.options}>
          {OPCIONS.map((opcio, i) => {
            const textOpcio = pregunta?.opcions?.[i] || '';
            let btnState = '';
            if (fase === 'resultat') {
              if (opcio === feedback?.correcta) btnState = 'correcta';
              else if (opcio === respostaSelec && !feedback?.correcte) btnState = 'incorrecta';
              else btnState = 'neutra';
            }

            return (
              <button
                key={opcio}
                className={`${styles.optionBtn} ${styles[btnState]}`}
                style={{ '--cfg-color': cfg.color }}
                onClick={() => respondre(opcio)}
                disabled={fase !== 'pregunta'}
              >
                <span className={styles.optionLetter}>{opcio}</span>
                <span className={styles.optionText}>{textOpcio.replace(/^[A-D]\.\s*/, '')}</span>
              </button>
            );
          })}
        </div>

        {/* Feedback */}
        {fase === 'resultat' && feedback && (
          <div className={`${styles.feedback} ${feedback.correcte ? styles.feedbackOk : styles.feedbackKo}`}>
            <div className={styles.feedbackIcon}>{feedback.correcte ? '✓' : '✗'}</div>
            <div className={styles.feedbackText}>
              <strong>{feedback.correcte ? 'Correcte!' : `Incorrecte — la resposta era ${feedback.correcta}`}</strong>
              {feedback.explicacio && <p className={styles.feedbackExpl}>{feedback.explicacio}</p>}
            </div>
            <button
              className={styles.btnNext}
              style={{ '--cfg-color': cfg.color }}
              onClick={seguentPregunta}
            >
              {feedback.progres?.respostes_fetes >= 5 ? 'VEURE RESULTAT ▶' : 'SEGÜENT ▶'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
