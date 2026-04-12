import { useState, useEffect } from 'react';
import styles from './BossTimer.module.css';

// Data de l'examen PACFGM 2026 — actualitzar quan es confirmi
const EXAM_DATE = new Date('2026-05-20T09:00:00');

function getTimeLeft() {
  const now  = new Date();
  const diff = EXAM_DATE - now;
  if (diff <= 0) return { dies: 0, hores: 0, minuts: 0, urgent: false };

  const dies   = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hores  = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minuts = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return { dies, hores, minuts, urgent: dies < 30 };
}

export default function BossTimer() {
  const [time, setTime] = useState(getTimeLeft);

  useEffect(() => {
    const id = setInterval(() => setTime(getTimeLeft()), 60000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={`${styles.wrapper} ${time.urgent ? styles.urgent : ''}`}>
      <span className={styles.label}>BOSS</span>
      <div className={styles.countdown}>
        <span className={styles.value}>{time.dies}</span>
        <span className={styles.unit}>d</span>
        <span className={styles.sep}>:</span>
        <span className={styles.value}>{String(time.hores).padStart(2,'0')}</span>
        <span className={styles.unit}>h</span>
      </div>
    </div>
  );
}
