import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth.jsx';
import { api } from '../../services/api';
import styles from './CharacterPanel.module.css';

const RANG_LABELS = {
  novici:   'NOVICI',
  aprenent: 'APRENENT',
  guerrer:  'GUERRER',
  campió:   'CAMPIO',
  mestre:   'MESTRE',
};

const RANG_COLORS = {
  novici:   'var(--color-text-secondary)',
  aprenent: 'var(--color-ciencies)',
  guerrer:  'var(--color-neon-green)',
  campió:   'var(--color-gold)',
  mestre:   'var(--color-neon-orange)',
};

// Filtre CSS complet per rang — canvia color + brillantor + ombra
const RANG_FILTER = {
  novici:   'grayscale(70%) brightness(0.85)',
  aprenent: 'hue-rotate(170deg) saturate(1.4) brightness(1.1) drop-shadow(0 0 5px #4fc3f7) drop-shadow(0 0 14px #4fc3f788)',
  guerrer:  'hue-rotate(90deg) saturate(1.6) brightness(1.1) drop-shadow(0 0 5px #39ff14) drop-shadow(0 0 14px #39ff1488)',
  campió:   'sepia(100%) saturate(4) hue-rotate(10deg) brightness(1.15) drop-shadow(0 0 6px #ffd700) drop-shadow(0 0 18px #ffd70088)',
  mestre:   'hue-rotate(310deg) saturate(2) brightness(1.2) drop-shadow(0 0 6px #ff6600) drop-shadow(0 0 20px #ff660099)',
};

const IDLE_FRAMES = [
  '/sprites/adventurer/adventurer-idle-00.png',
  '/sprites/adventurer/adventurer-idle-01.png',
  '/sprites/adventurer/adventurer-idle-02.png',
  '/sprites/adventurer/adventurer-idle-03.png',
];

const ATTACK_FRAMES = [
  '/sprites/adventurer/adventurer-attack1-00.png',
  '/sprites/adventurer/adventurer-attack1-01.png',
  '/sprites/adventurer/adventurer-attack1-02.png',
  '/sprites/adventurer/adventurer-attack1-03.png',
  '/sprites/adventurer/adventurer-attack1-04.png',
];

const IDLE_FPS   = 150; // ms per frame
const ATTACK_FPS = 90;  // ms per frame (ataque més ràpid)
const SCALE      = 4;   // 50×37 → 200×148px

function AdventurerSprite({ rang, isHovered }) {
  const [frameIdx, setFrameIdx] = useState(0);
  const [mode, setMode] = useState('idle'); // 'idle' | 'attack'
  const intervalRef = useRef(null);

  // Canvia a mode ataque quan hi ha hover
  useEffect(() => {
    if (isHovered && mode !== 'attack') {
      setMode('attack');
      setFrameIdx(0);
    } else if (!isHovered && mode === 'attack') {
      setMode('idle');
      setFrameIdx(0);
    }
  }, [isHovered]);

  // Bucle d'animació
  useEffect(() => {
    const frames = mode === 'attack' ? ATTACK_FRAMES : IDLE_FRAMES;
    const fps    = mode === 'attack' ? ATTACK_FPS   : IDLE_FPS;

    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setFrameIdx(prev => {
        const next = (prev + 1) % frames.length;
        // Quan l'atac acaba, torna a idle
        if (mode === 'attack' && next === 0 && !isHovered) {
          setMode('idle');
        }
        return next;
      });
    }, fps);

    return () => clearInterval(intervalRef.current);
  }, [mode, isHovered]);

  const frames = mode === 'attack' ? ATTACK_FRAMES : IDLE_FRAMES;
  const src    = frames[frameIdx];

  return (
    <img
      src={src}
      alt="character"
      className={styles.spriteImg}
      style={{
        width:  `${50 * SCALE}px`,
        height: `${37 * SCALE}px`,
        imageRendering: 'pixelated',
        filter: RANG_FILTER[rang] || 'none',
      }}
      draggable={false}
    />
  );
}

export default function CharacterPanel({ usuari }) {
  const { updateUsuari } = useAuth();
  const rang      = usuari?.rang || 'novici';
  const rangColor = RANG_COLORS[rang];
  const [hovered, setHovered]     = useState(false);
  const [editant, setEditant]     = useState(false);
  const [nouAlias, setNouAlias]   = useState('');
  const [error, setError]         = useState('');
  const [guardant, setGuardant]   = useState(false);
  const inputRef = useRef(null);

  function iniciarEdicio() {
    setNouAlias(usuari?.alias || '');
    setError('');
    setEditant(true);
    setTimeout(() => inputRef.current?.select(), 50);
  }

  function cancelar() {
    setEditant(false);
    setError('');
  }

  async function desar() {
    const aliasNet = nouAlias.trim();
    if (aliasNet.length < 2) { setError('Mínim 2 caràcters'); return; }
    if (aliasNet === usuari?.alias) { setEditant(false); return; }
    setGuardant(true);
    try {
      const data = await api.auth.perfil(aliasNet);
      updateUsuari({ alias: data.usuari.alias });
      setEditant(false);
      setError('');
    } catch (err) {
      setError(err.error || 'Error en desar');
    } finally {
      setGuardant(false);
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter') desar();
    if (e.key === 'Escape') cancelar();
  }

  return (
    <div className={styles.wrapper}>
      <div
        className={styles.spriteArea}
        data-rang={rang}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ cursor: 'pointer' }}
      >
        <AdventurerSprite rang={rang} isHovered={hovered} />
      </div>
      <div className={styles.info}>
        {editant ? (
          <div className={styles.aliasEdit}>
            <input
              ref={inputRef}
              className={styles.aliasInput}
              value={nouAlias}
              onChange={e => setNouAlias(e.target.value)}
              onKeyDown={onKeyDown}
              maxLength={20}
              autoFocus
              disabled={guardant}
            />
            <div className={styles.aliasActions}>
              <button className={styles.aliasOk} onClick={desar} disabled={guardant} title="Desar">✓</button>
              <button className={styles.aliasCancel} onClick={cancelar} disabled={guardant} title="Cancel·lar">✗</button>
            </div>
            {error && <div className={styles.aliasError}>{error}</div>}
          </div>
        ) : (
          <button className={styles.aliasBtn} onClick={iniciarEdicio} title="Canviar nom del personatge">
            <span className={styles.alias}>{usuari?.alias || '???'}</span>
            <span className={styles.editIcon}>✎</span>
          </button>
        )}
        <div className={styles.rang} style={{ color: rangColor, textShadow: `0 0 6px ${rangColor}` }}>
          {RANG_LABELS[rang]}
        </div>
        <div className={styles.nivell}>
          LVL <span style={{ color: rangColor }}>{usuari?.nivell || 1}</span>
        </div>
      </div>
    </div>
  );
}
