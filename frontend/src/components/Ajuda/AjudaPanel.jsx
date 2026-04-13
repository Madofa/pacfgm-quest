import { useNavigate } from 'react-router-dom';
import styles from './AjudaPanel.module.css';

const SECCIONS = [
  {
    id: 'com-funciona',
    icon: '⚔',
    titol: 'Com funciona el joc',
    contingut: [
      {
        subtitol: 'Batallas (sessions d\'estudi)',
        text: 'Cada cop que entres a un tema, fas 5 preguntes de tipus test. Les preguntes les genera la IA (Gemini) adaptades al contingut oficial del PACFGM. Tens temps limitat per respondre cada pregunta (pots desactivar el cronòmetre als ajustos).',
      },
      {
        subtitol: 'Desbloquejar temes',
        text: 'L\'arbre d\'habilitats funciona en cadena: has de superar un tema per desbloquejar el següent. Per superar un tema necessites encertar almenys 3 de 5 preguntes (60%).',
      },
      {
        subtitol: 'Estat dels temes',
        text: '🔒 Bloquejat — Encara no pots accedir-hi.\n⚡ Disponible — Pots practicar-lo.\n✅ Completat — L\'has superat almenys un cop.\n👑 Dominat — Has tret ≥80% en les últimes 3 sessions.',
      },
    ],
  },
  {
    id: 'xp-nivells',
    icon: '⭐',
    titol: 'XP i nivells',
    contingut: [
      {
        subtitol: 'Com guanyes XP',
        text: 'Cada sessió completada dona XP base + bonus:\n\n• Base: 50 XP per completar la sessió\n• Per encert: +10 XP per cada resposta correcta (màx +50 XP)\n• Bonus velocitat: +10 XP si respons de mitjana en menys de 20 segons\n• Bonus ratxa: ×1,10 si portes 3+ dies seguits, ×1,25 si portes 7+ dies',
      },
      {
        subtitol: 'Rangs',
        text: 'El teu rang canvia automàticament en pujar de nivell:\n\n🟤 NOVICI — Nivells 1–10\n🔵 APRENENT — Nivells 11–20\n🟢 GUERRER — Nivells 21–30\n🟡 CAMPIÓ — Nivells 31–40\n🔴 MESTRE — Nivells 41–50\n\nQuant més pràctiques, més XP guanyes i més ràpid puges.',
      },
      {
        subtitol: 'Multiplicador per matèria',
        text: 'Algunes matèries donen més XP perquè son més difícils o pesen més a l\'examen. El multiplicador s\'aplica automàticament al total de XP de la sessió.',
      },
    ],
  },
  {
    id: 'memoria-sr',
    icon: '🧠',
    titol: 'Sistema de memòria (repetició espaïada)',
    contingut: [
      {
        subtitol: 'Què és la repetició espaïada?',
        text: 'Estudis científics demostren que recordem millor quan repassem en moments concrets: just quan estem a punt d\'oblidar. PACFGM Quest ho fa automàticament per cada pregunta que has contestat.',
      },
      {
        subtitol: 'Com funciona',
        text: 'Cada pregunta té el seu propi nivell de memòria (0–4):\n\n• Nivel 0 (Pendent) — Tornarà demà\n• Nivell 1 (Aprenent) — Tornarà en 3 dies\n• Nivell 2 (Consolidant) — Tornarà en 7 dies\n• Nivell 3 (Quasi) — Tornarà en 14 dies\n• Nivell 4 (Dominada) — Tornarà en 30 dies\n\nSi encerites: puja un nivell → interval més llarg.\nSi falles: torna al nivell 0 → tornarà demà.',
      },
      {
        subtitol: 'Repàs d\'errors',
        text: 'Al panell de "REPÀS" pots veure totes les preguntes que has fallat en els últims 60 dies, agrupades per tema. Pots demanar una explicació detallada de per què la resposta correcta és la correcta.',
      },
      {
        subtitol: 'Avís de repàs pendent',
        text: 'Quan tens preguntes amb la data de repàs passada, apareix un avís taronja al dashboard: "⏰ REPÀS PENDENT". Fes clic per repassar directament aquell tema i recuperar els punts de memòria.',
      },
    ],
  },
  {
    id: 'atributs',
    icon: '📊',
    titol: 'Atributs i retencio',
    contingut: [
      {
        subtitol: 'Què mostren els atributs',
        text: 'Els atributs del dashboard (Matemàtiques, Català, Castellà…) mostren la teva retencio real en cada matèria. No és simplement "quants temes has completat" — és "quant en recordes ara mateix".',
      },
      {
        subtitol: 'Per què baixen si no repasses',
        text: 'El % de cada atribut es calcula amb:\n\n70% × (preguntes fresques / total preguntes vistes)\n+ 30% × (temes completats / total temes)\n\nUna pregunta és "fresca" si la seva data de repàs encara no ha passat. Si deixes de practicar, les preguntes van caducant i el % baixa sol.\n\nAixò reflecteix la corba de l\'oblit: si no repasses, oblides.',
      },
      {
        subtitol: 'Com pugen els atributs',
        text: 'Fes batallas i encerites → les preguntes pugen de nivell SR → intervals de repàs més llargs → el % es manté alt durant més temps.\n\nSi practiques cada dia (ratxa activa), guanyes bonus XP i mantens els atributs alts amb menys esforç.',
      },
    ],
  },
  {
    id: 'consells',
    icon: '💡',
    titol: 'Consells per aprofitar al màxim',
    contingut: [
      {
        subtitol: 'Per a l\'alumne',
        text: '✓ Practica cada dia, encara que sigui 1 sessió — la ratxa et dona bonus XP.\n✓ Quan aparegui "REPÀS PENDENT", fes-lo primer que res.\n✓ Utilitza el panell de Repàs d\'errors per entendre per on fallen.\n✓ Si no entens una explicació, clica "EXPLICA\'M MÉS" per una explicació detallada de la IA.',
      },
      {
        subtitol: 'Per al monitor/professor',
        text: '✓ Crea un grup des del teu panell i comparteix el codi als alumnes.\n✓ El panell de monitor mostra el progrés de cada alumne en temps real.\n✓ Fixa\'t en qui té els atributs baixant — vol dir que no estan repassant.\n✓ Anima la ratxa: els que porten 7+ dies consecutius guanyen un 25% més de XP.',
      },
    ],
  },
];

export default function AjudaPanel() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/')}>◄ INICI</button>
        <div className={`${styles.title} text-game`}>COM FUNCIONA</div>
        <div style={{ width: 80 }} />
      </header>

      <main className={styles.main}>
        <div className={styles.intro}>
          <p>Guia completa del sistema de puntuació, XP, rangs i memòria de <strong>PACFGM Quest</strong>.</p>
        </div>

        {/* Índex */}
        <nav className={styles.index}>
          {SECCIONS.map(s => (
            <a key={s.id} href={`#${s.id}`} className={styles.indexItem}>
              <span>{s.icon}</span>
              <span>{s.titol}</span>
            </a>
          ))}
        </nav>

        {/* Seccions */}
        {SECCIONS.map(s => (
          <section key={s.id} id={s.id} className={`${styles.seccio} panel-rpg`}>
            <div className={styles.seccioHeader}>
              <span className={styles.seccioIcon}>{s.icon}</span>
              <h2 className={styles.seccioTitol}>{s.titol.toUpperCase()}</h2>
            </div>
            <div className={styles.seccioCos}>
              {s.contingut.map((bloc, i) => (
                <div key={i} className={styles.bloc}>
                  <h3 className={styles.blocTitol}>{bloc.subtitol}</h3>
                  <p className={styles.blocText}>{bloc.text}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
