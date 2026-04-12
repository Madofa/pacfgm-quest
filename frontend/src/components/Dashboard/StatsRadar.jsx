import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import styles from './StatsRadar.module.css';

const MATERIES = [
  { key: 'mates',      label: 'FOR',  color: 'var(--color-mates)' },
  { key: 'ciencies',   label: 'INT',  color: 'var(--color-ciencies)' },
  { key: 'tecnologia', label: 'TEC',  color: 'var(--color-tecnologia)' },
  { key: 'catala',     label: 'CAT',  color: 'var(--color-catala)' },
  { key: 'castella',   label: 'CAS',  color: 'var(--color-castella)' },
  { key: 'angles',     label: 'ANG',  color: 'var(--color-angles)' },
  { key: 'social',     label: 'SOC',  color: 'var(--color-social)' },
];

function calcStats(nodes = []) {
  const stats = {};
  MATERIES.forEach(m => { stats[m.key] = { completats: 0, total: 0 }; });

  nodes.forEach(n => {
    const mat = n.node_id?.split('-')[0];
    if (stats[mat]) {
      stats[mat].total++;
      if (n.estat === 'completat' || n.estat === 'dominat') stats[mat].completats++;
    }
  });

  return MATERIES.map(m => ({
    materia: m.label,
    valor: stats[m.key].total > 0
      ? Math.round((stats[m.key].completats / stats[m.key].total) * 10)
      : 0,
    fullMark: 10,
  }));
}

const CustomTick = ({ x, y, payload }) => {
  const mat = MATERIES.find(m => m.label === payload.value);
  return (
    <text
      x={x} y={y}
      fill={mat?.color || 'var(--color-text-secondary)'}
      textAnchor="middle"
      dominantBaseline="middle"
      style={{ fontFamily: 'var(--font-game)', fontSize: '7px' }}
    >
      {payload.value}
    </text>
  );
};

export default function StatsRadar({ nodes = [] }) {
  const data = calcStats(nodes);

  return (
    <div className={styles.wrapper}>
      <ResponsiveContainer width="100%" height={200}>
        <RadarChart data={data} margin={{ top: 16, right: 24, bottom: 16, left: 24 }}>
          <PolarGrid
            stroke="var(--color-border)"
            strokeOpacity={0.6}
          />
          <PolarAngleAxis dataKey="materia" tick={<CustomTick />} />
          <Radar
            name="Stats"
            dataKey="valor"
            stroke="var(--color-neon-green)"
            fill="var(--color-neon-green)"
            fillOpacity={0.15}
            strokeWidth={1.5}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
