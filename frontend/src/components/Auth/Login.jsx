import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import styles from './Login.module.css';

// ── Formulari login ───────────────────────────────────────────────────────────
function LoginForm({ onForgot }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.error || 'Credencials incorrectes');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="email">EMAIL</label>
        <input id="email" type="email" className={styles.input}
          value={email} onChange={e => setEmail(e.target.value)}
          placeholder="tu@email.com" required autoFocus />
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="password">CONTRASENYA</label>
        <input id="password" type="password" className={styles.input}
          value={password} onChange={e => setPassword(e.target.value)}
          placeholder="••••••••" required />
      </div>
      {error && <div className={styles.error}>{error}</div>}
      <button className={styles.submitBtn} type="submit" disabled={loading}>
        {loading ? 'CONNECTANT...' : '▶ INICIAR SESSIÓ'}
      </button>
      <button type="button" className={styles.linkBtn} onClick={onForgot}>
        He oblidat la contrasenya
      </button>
    </form>
  );
}

// ── Formulari registre ────────────────────────────────────────────────────────
function RegisterForm() {
  const [nom, setNom]           = useState('');
  const [alias, setAlias]       = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [ok, setOk]             = useState(false);
  const [loading, setLoading]   = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.auth.register(nom, alias, email, password);
      // Auto-login després del registre
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.error || 'Error en el registre');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label className={styles.label}>NOM COMPLET</label>
        <input type="text" className={styles.input}
          value={nom} onChange={e => setNom(e.target.value)}
          placeholder="Maria García" required autoFocus />
      </div>
      <div className={styles.field}>
        <label className={styles.label}>ÀLIES (NOM DE JOC)</label>
        <input type="text" className={styles.input}
          value={alias} onChange={e => setAlias(e.target.value)}
          placeholder="DragonSlayer42" required />
      </div>
      <div className={styles.field}>
        <label className={styles.label}>EMAIL</label>
        <input type="email" className={styles.input}
          value={email} onChange={e => setEmail(e.target.value)}
          placeholder="tu@email.com" required />
      </div>
      <div className={styles.field}>
        <label className={styles.label}>CONTRASENYA</label>
        <input type="password" className={styles.input}
          value={password} onChange={e => setPassword(e.target.value)}
          placeholder="Mínim 6 caràcters" required minLength={6} />
      </div>
      {error && <div className={styles.error}>{error}</div>}
      <button className={styles.submitBtn} type="submit" disabled={loading}>
        {loading ? 'CREANT COMPTE...' : '▶ CREAR COMPTE'}
      </button>
    </form>
  );
}

// ── Formulari recuperació ─────────────────────────────────────────────────────
function ForgotForm({ onBack }) {
  const [email, setEmail]   = useState('');
  const [sent, setSent]     = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.auth.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.error || 'Error enviant el correu');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className={styles.form}>
        <div className={styles.successBox}>
          <div className={styles.successIcon}>✓</div>
          <p>Si l'email existeix, rebràs un correu amb l'enllaç per canviar la contrasenya.</p>
          <p className={styles.successHint}>Revisa també la carpeta de correu no desitjat.</p>
        </div>
        <button type="button" className={styles.linkBtn} onClick={onBack}>
          ← Tornar a l'accés
        </button>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <p className={styles.forgotDesc}>
        Introdueix el teu email i t'enviarem un enllaç per crear una nova contrasenya.
      </p>
      <div className={styles.field}>
        <label className={styles.label}>EMAIL</label>
        <input type="email" className={styles.input}
          value={email} onChange={e => setEmail(e.target.value)}
          placeholder="tu@email.com" required autoFocus />
      </div>
      {error && <div className={styles.error}>{error}</div>}
      <button className={styles.submitBtn} type="submit" disabled={loading}>
        {loading ? 'ENVIANT...' : '▶ ENVIAR CORREU'}
      </button>
      <button type="button" className={styles.linkBtn} onClick={onBack}>
        ← Tornar a l'accés
      </button>
    </form>
  );
}

// ── Component principal ───────────────────────────────────────────────────────
export default function Login() {
  const [tab, setTab] = useState('login'); // 'login' | 'register' | 'forgot'

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={`${styles.logo} text-neon-green text-game`}>PACFGM</div>
          <div className={`${styles.subtitle} text-game`}>QUEST</div>
          <p className={styles.tagline}>Entrena. Puja de nivell. Aprova.</p>
        </div>

        <div className={`${styles.card} panel-rpg animate-panel-in`}>
          {tab !== 'forgot' && (
            <div className={styles.tabs}>
              <button
                className={`${styles.tab} ${tab === 'login' ? styles.tabActive : ''}`}
                onClick={() => setTab('login')}
              >ACCÉS</button>
              <button
                className={`${styles.tab} ${tab === 'register' ? styles.tabActive : ''}`}
                onClick={() => setTab('register')}
              >NOU COMPTE</button>
            </div>
          )}

          {tab === 'login'    && <LoginForm onForgot={() => setTab('forgot')} />}
          {tab === 'register' && <RegisterForm />}
          {tab === 'forgot'   && <ForgotForm onBack={() => setTab('login')} />}
        </div>

        <p className={styles.footer}>PACFGM Quest · Sant Boi de Llobregat</p>
      </div>
    </div>
  );
}
