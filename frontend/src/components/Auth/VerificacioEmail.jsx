import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import styles from './Login.module.css';

export default function VerificacioEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { updateUsuari } = useAuth();
  const [estat, setEstat] = useState('verificant'); // 'verificant' | 'ok' | 'error'
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setEstat('error');
      setErrorMsg('Enllaç invàlid');
      return;
    }

    api.auth.verificarEmail(token)
      .then(data => {
        localStorage.setItem('token', data.token);
        updateUsuari(data.usuari);
        setEstat('ok');
        setTimeout(() => navigate('/'), 2000);
      })
      .catch(err => {
        setEstat('error');
        setErrorMsg(err.error || 'Enllaç invàlid o caducat');
      });
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={`${styles.logo} text-neon-green text-game`}><img src="/favicon.svg" alt="" style={{ height: '28px', marginRight: '12px', verticalAlign: 'middle', marginTop: '-3px' }} />PACFGM</div>
          <div className={`${styles.subtitle} text-game`}>QUEST</div>
        </div>
        <div className={`${styles.card} panel-rpg animate-panel-in`}>
          <div className={styles.form} style={{ textAlign: 'center', padding: '32px 0' }}>
            {estat === 'verificant' && (
              <p style={{ fontFamily: 'var(--font-game)', color: 'var(--color-text-secondary)', letterSpacing: 2 }}>
                VERIFICANT...
              </p>
            )}
            {estat === 'ok' && (
              <>
                <div style={{ fontSize: 40, marginBottom: 16 }}>✓</div>
                <p style={{ fontFamily: 'var(--font-game)', color: 'var(--color-neon-green)', letterSpacing: 2 }}>
                  COMPTE ACTIVAT
                </p>
                <p style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-secondary)', fontSize: 13, marginTop: 8 }}>
                  Entrant al joc...
                </p>
              </>
            )}
            {estat === 'error' && (
              <>
                <div style={{ fontSize: 40, marginBottom: 16 }}>✗</div>
                <p style={{ fontFamily: 'var(--font-game)', color: 'var(--color-neon-red)', letterSpacing: 2 }}>
                  ENLLAÇ INVÀLID
                </p>
                <p style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-secondary)', fontSize: 13, marginTop: 8 }}>
                  {errorMsg}
                </p>
                <button
                  className={styles.linkBtn}
                  style={{ marginTop: 24 }}
                  onClick={() => navigate('/login')}
                >
                  ← Tornar a l'accés
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
