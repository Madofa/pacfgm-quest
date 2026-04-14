import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import styles from './Login.module.css';

export default function ResetPassword() {
  const [searchParams]          = useSearchParams();
  const token                   = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [error, setError]       = useState('');
  const [done, setDone]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const navigate                = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirm) {
      setError('Les contrasenyes no coincideixen');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.auth.resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err.error || 'Enllaç invàlid o caducat');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={`${styles.logo} text-neon-green text-game`}><img src="/favicon.svg" alt="" style={{ height: '28px', marginRight: '12px', verticalAlign: 'middle', marginTop: '-3px' }} />PACFGM</div>
          <div className={`${styles.subtitle} text-game`}>QUEST</div>
        </div>

        <div className={`${styles.card} panel-rpg animate-panel-in`}>
          {done ? (
            <div className={styles.form}>
              <div className={styles.successBox}>
                <div className={styles.successIcon}>✓</div>
                <p>Contrasenya canviada correctament.</p>
              </div>
              <button className={styles.submitBtn} onClick={() => navigate('/login')}>
                ▶ ACCEDIR
              </button>
            </div>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.field}>
                <label className={styles.label}>NOVA CONTRASENYA</label>
                <input type="password" className={styles.input}
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Mínim 6 caràcters" required minLength={6} autoFocus />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>REPETEIX LA CONTRASENYA</label>
                <input type="password" className={styles.input}
                  value={confirm} onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••" required />
              </div>
              {error && <div className={styles.error}>{error}</div>}
              <button className={styles.submitBtn} type="submit" disabled={loading || !token}>
                {loading ? 'GUARDANT...' : '▶ CANVIAR CONTRASENYA'}
              </button>
              {!token && (
                <div className={styles.error}>Enllaç invàlid. Torna a sol·licitar la recuperació.</div>
              )}
            </form>
          )}
        </div>

        <p className={styles.footer}>PACFGM Quest · Sant Boi de Llobregat</p>
      </div>
    </div>
  );
}
