import { useState } from 'react';
import { api } from '../../services/api';
import styles from './FeedbackWidget.module.css';

const TIPUS = [
  { key: 'bug',         label: '🐛 Bug' },
  { key: 'suggeriment', label: '💡 Suggeriment' },
  { key: 'pregunta',    label: '❓ Pregunta' },
];

export default function FeedbackWidget() {
  const [obert, setObert]       = useState(false);
  const [tipus, setTipus]       = useState('bug');
  const [text, setText]         = useState('');
  const [enviant, setEnviant]   = useState(false);
  const [enviat, setEnviat]     = useState(false);
  const [error, setError]       = useState('');

  async function enviar() {
    if (text.trim().length < 5) { setError('Descriu el problema amb una mica més de detall'); return; }
    setEnviant(true); setError('');
    try {
      await api.feedback.enviar(tipus, text.trim(), window.location.pathname);
      setEnviat(true);
      setText('');
      setTimeout(() => { setObert(false); setEnviat(false); }, 2500);
    } catch {
      setError('Error en enviar. Torna-ho a intentar.');
    } finally {
      setEnviant(false);
    }
  }

  return (
    <div className={styles.wrap}>
      {obert && (
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <span className={styles.panelTitle}>REPORTAR</span>
            <button className={styles.closeBtn} onClick={() => setObert(false)}>✕</button>
          </div>

          {enviat ? (
            <div className={styles.success}>✓ Rebut! Gràcies.</div>
          ) : (
            <>
              <div className={styles.tipusRow}>
                {TIPUS.map(t => (
                  <button
                    key={t.key}
                    className={`${styles.tipusBtn} ${tipus === t.key ? styles.tipusActiu : ''}`}
                    onClick={() => setTipus(t.key)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <textarea
                className={styles.textarea}
                placeholder="Descriu el problema o suggeriment..."
                value={text}
                onChange={e => setText(e.target.value)}
                rows={4}
                maxLength={1000}
              />
              {error && <div className={styles.error}>{error}</div>}
              <button className={styles.sendBtn} onClick={enviar} disabled={enviant}>
                {enviant ? 'ENVIANT...' : 'ENVIAR'}
              </button>
            </>
          )}
        </div>
      )}

      <button
        className={`${styles.fab} ${obert ? styles.fabObert : ''}`}
        onClick={() => setObert(o => !o)}
        title="Reportar problema o suggeriment"
      >
        {obert ? '✕' : '⚑'}
      </button>
    </div>
  );
}
