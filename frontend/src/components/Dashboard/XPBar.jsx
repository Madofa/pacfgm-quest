import styles from './XPBar.module.css';

const XP_PER_NIVELL = (n) => 50 + (n - 1) * 50;

const RANGS = [
  { min: 1,  max: 10, rang: 'novici',   label: 'NOVICI'   },
  { min: 11, max: 20, rang: 'aprenent', label: 'APRENENT' },
  { min: 21, max: 30, rang: 'guerrer',  label: 'GUERRER'  },
  { min: 31, max: 40, rang: 'campió',   label: 'CAMPIO'   },
  { min: 41, max: 50, rang: 'mestre',   label: 'MESTRE'   },
];

function getRang(nivell) {
  return RANGS.find(r => nivell >= r.min && nivell <= r.max) || RANGS[RANGS.length - 1];
}

function xpAlNivell(xp_total) {
  let nivell = 1, acumulat = 0;
  while (nivell < 50) {
    const needed = XP_PER_NIVELL(nivell + 1);
    if (acumulat + needed > xp_total) break;
    acumulat += needed;
    nivell++;
  }
  const xpNivellActual = xp_total - acumulat;
  const xpNivellSeguent = XP_PER_NIVELL(nivell + 1);
  return { nivell, xpNivellActual, xpNivellSeguent };
}

export default function XPBar({ xp_total = 0 }) {
  const { nivell, xpNivellActual, xpNivellSeguent } = xpAlNivell(xp_total);
  const pct = Math.min((xpNivellActual / xpNivellSeguent) * 100, 100);
  const seguent = Math.min(nivell + 1, 50);

  const rangActual  = getRang(nivell);
  const rangSeguent = getRang(seguent);
  const canviaRang  = rangActual.rang !== rangSeguent.rang;

  return (
    <div className={styles.wrapper}>
      <div className={styles.labels}>
        <span className={styles.label}>
          LVL {nivell}
          {canviaRang && (
            <span className={styles.rangCanvi}> → {rangSeguent.label}</span>
          )}
        </span>
        <span className={styles.values}>{xpNivellActual.toLocaleString()} / {xpNivellSeguent.toLocaleString()} XP</span>
      </div>
      <div className={styles.track}>
        <div
          className={styles.fill}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={xpNivellActual}
          aria-valuemax={xpNivellSeguent}
        />
        <div className={styles.nextLabel}>LVL {seguent}</div>
      </div>
      <div className={styles.remaining}>
        Falten <span className={styles.remainingVal}>{(xpNivellSeguent - xpNivellActual).toLocaleString()} XP</span> per al LVL {seguent}
        {canviaRang && <span className={styles.rangLabel}> · pròxim rang: {rangSeguent.label}</span>}
      </div>
    </div>
  );
}
