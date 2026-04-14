import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.jsx';
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
          placeholder="tu@email.com" required autoFocus
          autoComplete="email" />
      </div>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="password">CONTRASENYA</label>
        <input id="password" type="password" className={styles.input}
          value={password} onChange={e => setPassword(e.target.value)}
          placeholder="••••••••" required
          autoComplete="current-password" />
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

// ── Selector de rol ───────────────────────────────────────────────────────────
const ROLS = [
  {
    rol: 'alumne', subtipus: null,
    icon: '⚔',
    titol: 'ALUMNE',
    desc: 'Estic preparant la PACFGM',
    color: 'var(--color-neon-green)',
  },
  {
    rol: 'monitor', subtipus: 'pare',
    icon: '👨‍👩‍👧',
    titol: 'PARE / MARE',
    desc: 'Acompanyo el meu fill/a en la preparació',
    color: 'var(--color-gold)',
  },
  {
    rol: 'monitor', subtipus: 'professor',
    icon: '👨‍🏫',
    titol: 'PROFESSOR/A',
    desc: 'Faig seguiment dels meus alumnes',
    color: 'var(--color-neon-orange)',
  },
  {
    rol: 'monitor', subtipus: 'equip',
    icon: '🏫',
    titol: 'EQUIP / ACADÈMIA',
    desc: 'Grup de professors o centre educatiu',
    color: 'var(--color-neon-blue, #4fc3f7)',
  },
];

function RolSelector({ onSeleccionar }) {
  return (
    <div className={styles.rolSelector}>
      <p className={styles.rolPregunta}>Qui ets?</p>
      <div className={styles.rolGrid}>
        {ROLS.map(r => (
          <button
            key={r.subtipus || 'alumne'}
            type="button"
            className={styles.rolCard}
            style={{ '--rol-color': r.color }}
            onClick={() => onSeleccionar(r)}
          >
            <span className={styles.rolIcon}>{r.icon}</span>
            <span className={styles.rolTitol}>{r.titol}</span>
            <span className={styles.rolDesc}>{r.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Formulari registre ────────────────────────────────────────────────────────
function RegisterForm() {
  const [rolSelec, setRolSelec]       = useState(null); // objecte de ROLS o null
  const [nom, setNom]                 = useState('');
  const [alias, setAlias]             = useState('');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [password2, setPassword2]     = useState('');
  const [error, setError]             = useState('');
  const [pendent, setPendent]         = useState(false);
  const [loading, setLoading]         = useState(false);
  const [aliasEstat, setAliasEstat]   = useState(null); // null | 'comprovant' | 'disponible' | 'ocupat'
  const aliasTimer = useRef(null);

  useEffect(() => {
    if (alias.trim().length < 2) { setAliasEstat(null); return; }
    setAliasEstat('comprovant');
    clearTimeout(aliasTimer.current);
    aliasTimer.current = setTimeout(async () => {
      try {
        const data = await api.auth.checkAlias(alias.trim());
        setAliasEstat(data.disponible ? 'disponible' : 'ocupat');
      } catch { setAliasEstat(null); }
    }, 500);
    return () => clearTimeout(aliasTimer.current);
  }, [alias]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (aliasEstat === 'ocupat') { setError('Alias no disponible'); return; }
    if (password !== password2) {
      setError('Les contrasenyes no coincideixen');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.auth.register(nom, alias, email, password, rolSelec?.rol, rolSelec?.subtipus);
      setPendent(true);
    } catch (err) {
      setError(err.error || 'Error en el registre');
    } finally {
      setLoading(false);
    }
  }

  if (pendent) {
    return (
      <div className={styles.form}>
        <div className={styles.successBox}>
          <div className={styles.successIcon}>✉</div>
          <p>Hem enviat un correu de verificació a <strong>{email}</strong>.</p>
          <p className={styles.successHint}>Fes clic a l'enllaç del correu per activar el compte. Revisa també el correu no desitjat.</p>
        </div>
      </div>
    );
  }

  // Pas 1: triar rol
  if (!rolSelec) {
    return <RolSelector onSeleccionar={setRolSelec} />;
  }

  // Pas 2: formulari
  const esMonitor = rolSelec.rol === 'monitor';
  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {/* Indicador de rol seleccionat */}
      <div className={styles.rolActiu} style={{ '--rol-color': rolSelec.color }}>
        <span>{rolSelec.icon} {rolSelec.titol}</span>
        <button type="button" className={styles.rolCanviar} onClick={() => setRolSelec(null)}>
          Canviar
        </button>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>NOM COMPLET</label>
        <input type="text" className={styles.input}
          value={nom} onChange={e => setNom(e.target.value)}
          placeholder={esMonitor ? 'Ana Martínez' : 'Maria García'} required autoFocus />
      </div>
      {!esMonitor && (
        <div className={styles.field}>
          <label className={styles.label}>ÀLIES (NOM DE JOC)</label>
          <input type="text" className={`${styles.input} ${aliasEstat === 'ocupat' ? styles.inputError : aliasEstat === 'disponible' ? styles.inputOk : ''}`}
            value={alias} onChange={e => setAlias(e.target.value)}
            placeholder="DragonSlayer42" required />
          {aliasEstat === 'ocupat'     && <div className={styles.aliasMsg} style={{ color: 'var(--color-neon-red)' }}>Alias no disponible</div>}
          {aliasEstat === 'disponible' && <div className={styles.aliasMsg} style={{ color: 'var(--color-neon-green)' }}>Alias disponible</div>}
          {aliasEstat === 'comprovant' && <div className={styles.aliasMsg} style={{ color: 'var(--color-text-disabled)' }}>Comprovant...</div>}
        </div>
      )}
      {esMonitor && (
        <div className={styles.field}>
          <label className={styles.label}>NOM DEL GRUP / REFERÈNCIA</label>
          <input type="text" className={styles.input}
            value={alias} onChange={e => setAlias(e.target.value)}
            placeholder="Ex: Família Martínez / IES Miró" required />
        </div>
      )}
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
      <div className={styles.field}>
        <label className={styles.label}>REPETIR CONTRASENYA</label>
        <input type="password" className={styles.input}
          value={password2} onChange={e => setPassword2(e.target.value)}
          placeholder="Repeteix la contrasenya" required minLength={6} />
      </div>
      {error && <div className={styles.error}>{error}</div>}
      <button className={styles.submitBtn} type="submit" disabled={loading}
        style={esMonitor ? { background: rolSelec.color, color: 'var(--color-bg-deep)', border: 'none' } : {}}>
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
          <div className={`${styles.logo} text-neon-green text-game`}><img src="/favicon.svg" alt="" style={{ height: '28px', marginRight: '12px', verticalAlign: 'middle', marginTop: '-3px' }} />PACFGM</div>
          <div className={`${styles.subtitle} text-game`}>
            QUEST <span className={styles.beta}>BETA</span>
          </div>
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
