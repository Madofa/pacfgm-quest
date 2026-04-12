import styles from './XPBar.module.css';

const XP_PER_NIVELL = (n) => 50 + (n - 1) * 50;

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

export default function XPBar({ xp_total = 0, nivell }) {
  const { xpNivellActual, xpNivellSeguent } = xpAlNivell(xp_total);
  const pct = Math.min((xpNivellActual / xpNivellSeguent) * 100, 100);

  return (
    <div className={styles.wrapper}>
      <div className={styles.labels}>
        <span className={styles.label}>XP</span>
        <span className={styles.values}>{xpNivellActual.toLocaleString()} / {xpNivellSeguent.toLocaleString()}</span>
      </div>
      <div className={styles.track}>
        <div
          className={styles.fill}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={xpNivellActual}
          aria-valuemax={xpNivellSeguent}
        />
      </div>
    </div>
  );
}
