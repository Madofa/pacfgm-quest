import { useState, useEffect } from 'react';
import styles from './BossTimer.module.css';

const DEFAULT_DATE = '2026-05-13';
const STORAGE_KEY  = 'examDate';

function getTimeLeft(dateStr) {
  const target = new Date(`${dateStr}T09:00:00`);
  const now    = new Date();
  const diff   = target - now;
  if (diff <= 0) return { dies: 0, hores: 0, minuts: 0, urgent: false, passat: true };

  const dies   = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hores  = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minuts = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return { dies, hores, minuts, urgent: dies < 30, passat: false };
}

export default function BossTimer() {
  const [examDate, setExamDate] = useState(
    () => localStorage.getItem(STORAGE_KEY) || DEFAULT_DATE
  );
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(examDate);
  const [time,    setTime]    = useState(() => getTimeLeft(examDate));

  useEffect(() => {
    setTime(getTimeLeft(examDate));
    const id = setInterval(() => setTime(getTimeLeft(examDate)), 60000);
    return () => clearInterval(id);
  }, [examDate]);

  function saveDate() {
    if (draft) {
      localStorage.setItem(STORAGE_KEY, draft);
      setExamDate(draft);
    }
    setEditing(false);
  }

  const dateLabel = new Date(`${examDate}T12:00:00`).toLocaleDateString('ca-ES', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  if (time.passat) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.bossIcon}>💀</div>
        <span className={styles.done}>EXAMEN PASSAT</span>
      </div>
    );
  }

  return (
    <div className={`${styles.wrapper} ${time.urgent ? styles.urgent : ''}`}>
      <div className={styles.countdown}>
        <div className={styles.row}>
          <span className={styles.value}>{time.dies}</span>
          <span className={styles.unit}>DIES</span>
        </div>
        <div className={styles.rowSep} />
        <div className={styles.row}>
          <span className={styles.value}>{String(time.hores).padStart(2,'0')}</span>
          <span className={styles.unit}>HORES</span>
        </div>
      </div>

      {editing ? (
        <div className={styles.editWrap}>
          <input
            type="date"
            className={styles.dateInput}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveDate()}
            autoFocus
          />
          <button className={styles.saveBtn} onClick={saveDate}>OK</button>
        </div>
      ) : (
        <button className={styles.dateBtn} onClick={() => { setDraft(examDate); setEditing(true); }}>
          {dateLabel} ✎
        </button>
      )}
    </div>
  );
}
