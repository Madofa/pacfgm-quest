import { useState, useEffect } from 'react';
import styles from './BossTimer.module.css';

// Data de l'examen PACFGM 2026 (convocatòria oficial)
const EXAM_DATE = new Date('2026-05-13T16:00:00');

function getTimeLeft() {
  const now  = new Date();
  const diff = EXAM_DATE - now;
  if (diff <= 0) return { dies: 0, hores: 0, minuts: 0, urgent: false, passat: true };

  const dies   = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hores  = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minuts = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return { dies, hores, minuts, urgent: dies < 30, passat: false };
}

export default function BossTimer() {
  const [time, setTime] = useState(getTimeLeft);

  useEffect(() => {
    const id = setInterval(() => setTime(getTimeLeft()), 60000);
    return () => clearInterval(id);
  }, []);

  if (time.passat) {
    return (
      <div className={styles.wrapper}>
        <span className={styles.label}>JEFE FINAL</span>
        <span className={styles.done}>COMPLETAT</span>
      </div>
    );
  }

  return (
    <div className={`${styles.wrapper} ${time.urgent ? styles.urgent : ''}`}>
      <span className={styles.label}>JEFE FINAL</span>
      <div className={styles.countdown}>
        <div className={styles.block}>
          <span className={styles.value}>{time.dies}</span>
          <span className={styles.unit}>dies</span>
        </div>
        <span className={styles.sep}>:</span>
        <div className={styles.block}>
          <span className={styles.value}>{String(time.hores).padStart(2,'0')}</span>
          <span className={styles.unit}>hores</span>
        </div>
      </div>
      <span className={styles.date}>13 maig 2026</span>
    </div>
  );
}
