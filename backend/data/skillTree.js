// ─────────────────────────────────────────────────────────────────────────────
// SKILL TREE — PACFGM (Prova d'Accés als Cicles Formatius de Grau Mitjà)
// Basat en el currículum oficial del Departament d'Educació de la Generalitat
// de Catalunya. 35 nodes distribuïts en 7 matèries.
// ─────────────────────────────────────────────────────────────────────────────

const NODES = {

  // ══════════════════════════════════════════════════════════════════════════
  // MATEMÀTIQUES — 25% del pes total, multiplicador XP ×1.5
  // ══════════════════════════════════════════════════════════════════════════

  'mates-nombres': {
    id: 'mates-nombres',
    titol: 'Nombres i operacions',
    materia: 'mates',
    pare: null,
    fills: ['mates-fraccions'],
    temari: `Nombres enters positius i negatius: signe, valor absolut, comparació i ordenació. Nombres decimals: lectura, escriptura, arrodoniment i truncament. Potències de nombres naturals: base i exponent, potències de 10. Arrels quadrades exactes i aproximades. Prioritat de les operacions: parèntesis, potències, multiplicació/divisió, suma/resta. Nombres molt grans i molt petits en contextos quotidians (distàncies astronòmiques, escales microscòpiques).`,
  },

  'mates-fraccions': {
    id: 'mates-fraccions',
    titol: 'Fraccions i decimals',
    materia: 'mates',
    pare: 'mates-nombres',
    fills: ['mates-percentatges'],
    temari: `Fraccions: numerador, denominador, fracció pròpia i impròpia. Fraccions equivalents: amplificació i simplificació. Reducció a comú denominador (mcm). Operacions amb fraccions: suma, resta, multiplicació, divisió i potència. Nombres mixtos: conversió a fracció i viceversa. Relació entre fraccions i nombres decimals: pas de fracció a decimal i de decimal a fracció. Decimals exactes i periòdics (purs i mixtos).`,
  },

  'mates-percentatges': {
    id: 'mates-percentatges',
    titol: 'Percentatges',
    materia: 'mates',
    pare: 'mates-fraccions',
    fills: ['mates-proporcionalitat'],
    temari: `Càlcul de percentatges: trobar el tant per cent d'una quantitat, trobar la quantitat total donada la part i el percentatge. Augments percentuals: preu final = preu inicial × (1 + p/100). Disminucions percentuals: preu final = preu inicial × (1 − p/100). Aplicacions reals: IVA (21%, 10%, 4%), descomptes, rebaixes, interessos bancaris simples, propines. Percentatge d'error. Comparació de percentatges en taules i gràfiques.`,
  },

  'mates-proporcionalitat': {
    id: 'mates-proporcionalitat',
    titol: 'Proporcionalitat',
    materia: 'mates',
    pare: 'mates-percentatges',
    fills: ['mates-equacions'],
    temari: `Raó i proporció: propietat fonamental (producte de mitjans = producte d'extrems). Proporcionalitat directa: a major x, major y; regla de tres directa. Proporcionalitat inversa: a major x, menor y; regla de tres inversa. Regla de tres composta: problemes amb dues o més variables. Repartiments proporcionals directes i inversos. Aplicacions: velocitat/temps/distància, conversió de monedes, receptes de cuina, mapes i escales.`,
  },

  'mates-equacions': {
    id: 'mates-equacions',
    titol: 'Equacions',
    materia: 'mates',
    pare: 'mates-proporcionalitat',
    fills: ['mates-mesures'],
    temari: `Equacions de primer grau amb una incògnita: resolució pas a pas, transposició de termes, simplificació. Plantejament de problemes amb equació: traducció d'un enunciat a una equació i resolució. Comprovació de la solució. Sistemes de dues equacions amb dues incògnites: mètode de substitució, igualació i reducció. Equacions senzilles de segon grau (discriminant positiu): fórmula general, dues solucions, una solució o cap solució real.`,
  },

  'mates-mesures': {
    id: 'mates-mesures',
    titol: 'Magnituds i mesures',
    materia: 'mates',
    pare: 'mates-equacions',
    fills: ['mates-geometria'],
    temari: `Sistema Internacional d'Unitats (SI): unitats bàsiques i derivades. Longitud: km, hm, dam, m, dm, cm, mm; conversions. Massa: t, kg, g, mg; conversions. Capacitat: kl, l, dl, cl, ml; equivalència amb dm³ i cm³. Temps: anys, mesos, setmanes, dies, hores, minuts, segons; conversions. Superfície: km², ha, a, ca, m², dm², cm², mm². Volum: m³, dm³ (litre), cm³ (ml). Escales numèriques: càlcul de distàncies reals i representades en mapes i plànols.`,
  },

  'mates-geometria': {
    id: 'mates-geometria',
    titol: 'Geometria',
    materia: 'mates',
    pare: 'mates-mesures',
    fills: ['mates-estadistica'],
    temari: `Figures planes: triangle (àrees i perímetres de qualsevol triangle), quadrilàters (quadrat, rectangle, rombe, romboide, trapezi), polígons regulars, cercle (circumferència, àrea, arc, sector). Teorema de Pitàgores: aplicació per calcular costats d'un triangle rectangle. Figures compostes: descomposició i càlcul d'àrees. Cossos geomètrics: prisma (àrea lateral, total i volum), cilindre (àrees i volum), piràmide (àrea lateral i volum), con (àrees i volum), esfera (àrea i volum). Semblança: raó de semblança, escales, relació entre àrees i volums de figures semblants.`,
  },

  'mates-estadistica': {
    id: 'mates-estadistica',
    titol: 'Estadística',
    materia: 'mates',
    pare: 'mates-geometria',
    fills: [],
    temari: `Conceptes bàsics: població, mostra, individu, variable estadística (qualitativa i quantitativa). Taules de freqüències: freqüència absoluta (n_i), freqüència relativa (f_i = n_i/N), freqüència acumulada. Paràmetres de centralització: mitjana aritmètica (suma de valors / nombre de valors), mediana (valor central ordenat), moda (valor més freqüent). Gràfiques estadístiques: diagrama de barres, histograma, polígon de freqüències, diagrama de sectors (pastís). Interpretació crítica de gràfiques i taules estadístiques. Presa de decisions a partir de la comparació de dades.`,
  },


  // ══════════════════════════════════════════════════════════════════════════
  // CATALÀ — 15% del pes total, multiplicador XP ×1.0
  // ══════════════════════════════════════════════════════════════════════════

  'catala-comprensio': {
    id: 'catala-comprensio',
    titol: 'Comprensió de textos',
    materia: 'catala',
    pare: null,
    fills: ['catala-tipologies'],
    temari: `Comprensió i interpretació de textos escrits en català de la vida quotidiana i dels mitjans de comunicació. Identificació de la idea principal i les idees secundàries. Diferenciació entre informació i opinió. Reconeixement de les intencions de l'emissor. Jerarquització d'idees en un text. Identificació del registre comunicatiu: formal, informal, col·loquial, estàndard. Extracció de conclusions a partir del text. Vocabulari en context: deducció del significat per context.`,
  },

  'catala-tipologies': {
    id: 'catala-tipologies',
    titol: 'Tipologies textuals',
    materia: 'catala',
    pare: 'catala-comprensio',
    fills: ['catala-gramatica'],
    temari: `Text descriptiu: caracterització de persones, llocs, objectes i processos; ús d'adjectius i comparacions. Text narratiu: relat d'esdeveniments en ordre temporal; ús de connectors temporals (primer, després, finalment). Text expositiu: presentació objectiva i ordenada d'informació sobre un tema; estructura (introducció, desenvolupament, conclusió). Text instructiu: seqüència d'accions ordenades (receptes, instruccions, normes); ús de l'imperatiu. Gèneres periodístics: notícia (qui, què, on, quan, com, per què), crònica, reportatge, entrevista, article d'opinió. Reconeixement i producció de resums.`,
  },

  'catala-gramatica': {
    id: 'catala-gramatica',
    titol: 'Gramàtica catalana',
    materia: 'catala',
    pare: 'catala-tipologies',
    fills: ['catala-ortografia'],
    temari: `Categories gramaticals variables: substantiu (gènere i nombre), adjectiu (concordança), determinants (articles, demostratius, possessius, numerals, indefinits, interrogatius), pronoms (personals forts i febles, relatius), verb (conjugació dels verbs regulars i irregulars més comuns en present, passat i futur). Categories invariables: adverbi, preposició, conjunció, interjecció. Processos morfològics: flexió (gènere i nombre), derivació (prefixació i sufixació), composició. Anàlisi sintàctica bàsica: subjecte, predicat (verbal i nominal), complement directe, complement indirecte, complement circumstancial.`,
  },

  'catala-ortografia': {
    id: 'catala-ortografia',
    titol: 'Ortografia i expressió',
    materia: 'catala',
    pare: 'catala-gramatica',
    fills: [],
    temari: `Ortografia normativa catalana: accentuació (accent agut, greu, dièresi), apòstrof, guionet, l·l, ŀl, ny, ix, tx, ig. Puntuació: punt, coma, punt i coma, dos punts, punts suspensius, signes d'interrogació i exclamació, cometes, parèntesi. Connectors textuals: addició (a més, també, a part), contrast (però, tanmateix, en canvi), causa (perquè, ja que, atès que), conseqüència (per tant, per això, doncs), ordre (primer, després, finalment). Relacions semàntiques: sinonímia, antonímia, polisèmia, homonímia. Frases fetes i locucions catalanes freqüents.`,
  },


  // ══════════════════════════════════════════════════════════════════════════
  // CASTELLÀ — 15% del pes total, multiplicador XP ×1.0
  // ══════════════════════════════════════════════════════════════════════════

  'castella-comprensio': {
    id: 'castella-comprensio',
    titol: 'Comprensión de textos',
    materia: 'castella',
    pare: null,
    fills: ['castella-tipologies'],
    temari: `Comprensión e interpretación de textos escritos en castellano de la vida cotidiana y de los medios de comunicación. Identificación de la idea principal e ideas secundarias. Diferenciación entre información y opinión. Reconocimiento de las intenciones del emisor. Jerarquización de ideas. Identificación del registro comunicativo: formal, informal, coloquial, estándar. Extracción de conclusiones. Vocabulario en contexto: deducción del significado por contexto. Sinónimos, antónimos y palabras polisémicas frecuentes.`,
  },

  'castella-tipologies': {
    id: 'castella-tipologies',
    titol: 'Tipologías textuales',
    materia: 'castella',
    pare: 'castella-comprensio',
    fills: ['castella-gramatica'],
    temari: `Texto descriptivo: caracterización de personas, lugares, objetos y procesos; uso de adjetivos y comparaciones. Texto narrativo: relato de hechos con orden temporal; conectores temporales (primero, luego, después, finalmente). Texto expositivo: presentación objetiva de información; estructura (introducción, desarrollo, conclusión). Texto instructivo: secuencia de acciones ordenadas; uso del imperativo. Texto argumentativo: expresión de opiniones con argumentos y contraargumentos. Géneros periodísticos: noticia, crónica, reportaje, entrevista, artículo de opinión. Elaboración de resúmenes y síntesis.`,
  },

  'castella-gramatica': {
    id: 'castella-gramatica',
    titol: 'Gramática castellana',
    materia: 'castella',
    pare: 'castella-tipologies',
    fills: ['castella-ortografia'],
    temari: `Categorías gramaticales variables: sustantivo (género y número), adjetivo (concordancia, grados: positivo, comparativo, superlativo), determinantes (artículos, demostrativos, posesivos, numerales, indefinidos, interrogativos), pronombres (personales, relativos, interrogativos), verbo (conjugación de verbos regulares e irregulares más comunes en presente, pretérito imperfecto, pretérito indefinido, pretérito perfecto compuesto y futuro simple). Categorías invariables: adverbio, preposición, conjunción, interjección. Análisis sintáctico: sujeto, predicado, complemento directo, complemento indirecto, complemento circunstancial, atributo, complemento predicativo.`,
  },

  'castella-ortografia': {
    id: 'castella-ortografia',
    titol: 'Ortografía y expresión',
    materia: 'castella',
    pare: 'castella-gramatica',
    fills: [],
    temari: `Ortografía normativa del castellano: uso de b/v, g/j, h, ll/y, r/rr, c/z/s, mayúsculas. Acentuación: palabras agudas, llanas, esdrújulas y sobreesdrújulas; diptongos, triptongos, hiatos; tilde diacrítica. Signos de puntuación: punto, coma, punto y coma, dos puntos, puntos suspensivos, signos de interrogación y exclamación, comillas, guion y raya. Conectores textuales: adición, contraste, causa, consecuencia, orden temporal. Relaciones semánticas: sinonimia, antonimia, polisemia, homonimia, campo semántico. Locuciones y frases hechas frecuentes.`,
  },


  // ══════════════════════════════════════════════════════════════════════════
  // ANGLÈS — 10% del pes total, multiplicador XP ×1.0
  // ══════════════════════════════════════════════════════════════════════════

  'angles-comprensio': {
    id: 'angles-comprensio',
    titol: 'Reading comprehension',
    materia: 'angles',
    pare: null,
    fills: ['angles-gramatica'],
    temari: `Reading and understanding everyday and media texts in English: news articles, advertisements, instructions, informal emails, signs and notices. Identifying main idea and specific information. Deducing meaning of unknown vocabulary from context. Understanding different text types and their purpose. Recognising formal and informal registers. Selecting specific information from a text. Comprehension of instructions for tasks. Understanding simple and compound sentences with familiar vocabulary. Level: A2-B1 (CEFR), equivalent to end of ESO.`,
  },

  'angles-gramatica': {
    id: 'angles-gramatica',
    titol: 'Grammar & structures',
    materia: 'angles',
    pare: 'angles-comprensio',
    fills: ['angles-expressio'],
    temari: `Verb tenses: present simple (habits, facts), present continuous (actions happening now), past simple regular and irregular verbs (completed actions), future with will (predictions, spontaneous decisions) and going to (plans, intentions). Modal verbs: can/can't (ability), must/mustn't (obligation/prohibition), should/shouldn't (advice), may/might (possibility). Question forms: yes/no questions and wh-questions. Articles: a/an vs. the vs. zero article. Prepositions of time (at, in, on) and place (at, in, on, next to, between, opposite). Connectors: and, but, because, so, although, however. Comparatives and superlatives. There is/there are. Passive voice (present and past simple).`,
  },

  'angles-expressio': {
    id: 'angles-expressio',
    titol: 'Vocabulary & writing',
    materia: 'angles',
    pare: 'angles-gramatica',
    fills: [],
    temari: `Everyday vocabulary topics: family, daily routines, jobs and workplaces, food and health, transport, shopping, leisure and sports, technology and internet, environment and weather, town and city. Common expressions and fixed phrases. False friends between English and Catalan/Spanish (library/librería, eventually/eventualmente, sensible/sensible). Writing short texts: informal emails and messages, notes and notices, simple descriptions of people and places. Formal vs. informal register differences. Basic letter format. Phrasal verbs: look for, give up, find out, turn on/off, get up, look after, carry out.`,
  },


  // ══════════════════════════════════════════════════════════════════════════
  // CIÈNCIES — Competència d'Interacció amb el Món Físic
  // 12.5% del pes total, multiplicador XP ×1.3
  // ══════════════════════════════════════════════════════════════════════════

  'ciencies-materia': {
    id: 'ciencies-materia',
    titol: 'La matèria',
    materia: 'ciencies',
    pare: null,
    fills: ['ciencies-essers-vius'],
    temari: `Propietats de la matèria: massa, volum, densitat (d = m/V), càlcul i diferenciació de materials per densitat. Estats de la matèria: sòlid, líquid i gas; propietats de cadascun (forma, volum, compressibilitat). Canvis d'estat: fusió, solidificació, vaporització, condensació, sublimació; temperatura de canvi d'estat. Mescles heterogènies (components visibles: sorra+aigua), col·loides (llet, fum) i solucions/mescles homogènies (sal+aigua). Substàncies pures: elements i compostos. Tècniques de separació: filtració, decantació, destil·lació, cristal·lització. Pressió de gasos: llei de Boyle (qualitativa). Radiacions: tipus (ionitzants i no ionitzants), aplicacions mèdiques i industrials, efectes en organismes i mesures preventives.`,
  },

  'ciencies-essers-vius': {
    id: 'ciencies-essers-vius',
    titol: 'Éssers vius i ecosistemes',
    materia: 'ciencies',
    pare: 'ciencies-materia',
    fills: ['ciencies-energia'],
    temari: `Característiques comunes dels éssers vius: nutrició (autòtrofa i heteròtrofa), relació (resposta a estímuls) i reproducció (sexual i asexual). Estructura cel·lular: cèl·lula procariota (bacteris) vs. eucariota (animals, plantes, fongs). Orgànuls cel·lulars i funcions bàsiques (nucli, mitocondri, cloroplast). Biodiversitat: regnes de la naturalesa (Monera, Protista, Fungi, Plantae, Animalia) i criteris de classificació. Ecosistemes: biotop i biocenosi. Cadenes i xarxes tròfiques: productors primaris, consumidors (1r, 2n, 3r ordre), descomponedors. Flux d'energia i matèria en l'ecosistema. Impactes de l'activitat humana: contaminació atmosfèrica i hídrica, pèrdua de biodiversitat, espècies invasores, deforestació.`,
  },

  'ciencies-energia': {
    id: 'ciencies-energia',
    titol: "L'energia",
    materia: 'ciencies',
    pare: 'ciencies-essers-vius',
    fills: ['ciencies-forces'],
    temari: `Concepte d'energia i relació amb el canvi (tèrmic, lluminós, mecànic, químic, elèctric). Formes d'energia: cinètica (moviment), potencial gravitatòria (posició), tèrmica (calor), elèctrica, química, lluminosa, nuclear. Transformació d'energia: principi de conservació de l'energia; el treball com a transferència d'energia. Fonts d'energia renovables: solar (fotovoltaica i tèrmica), eòlica, hidràulica, biomassa, geotèrmica, mareomotriu. Fonts d'energia no renovables: petroli, gas natural, carbó, energia nuclear (fissió). Avantatges, inconvenients i impacte ambiental de cada font. Estalvi i eficiència energètica. Màquines simples: palanca, pla inclinat, politja; multiplicació de forces.`,
  },

  'ciencies-forces': {
    id: 'ciencies-forces',
    titol: 'Forces i moviment',
    materia: 'ciencies',
    pare: 'ciencies-energia',
    fills: ['ciencies-quimica'],
    temari: `Forces en la vida quotidiana: gravetat (pes = massa × g), normal, tensió, empenta, fricció/fregament. Efectes de les forces: deformació, canvi de moviment. Representació gràfica d'una força: punt d'aplicació, direcció, sentit i mòdul. Composició de forces (qualitativa). Magnituds del moviment: posició, desplaçament, temps, velocitat (v = d/t), acceleració. Moviment rectilini uniforme (MRU): velocitat constant, gràfica posició-temps (recta). Moviment accelerat: canvi de velocitat. Relació força-moviment (Newton qualitativament): a major força, major acceleració; a major massa, menor acceleració. Fregament: factors que l'influencien; avantatges i inconvenients.`,
  },

  'ciencies-quimica': {
    id: 'ciencies-quimica',
    titol: 'Reaccions químiques',
    materia: 'ciencies',
    pare: 'ciencies-forces',
    fills: ['ciencies-geologia'],
    temari: `Canvis físics vs. canvis químics: com diferenciar-los. Reaccions químiques en la vida quotidiana: oxidació (metalls que s'oxiden, greixos rancis), combustió (flames, motors), àcid-base (vinagre+bicarbonat, netejavidres), descomposició (oxigenada sobre una ferida), fermentació (pa, iogurt, vi), putrefacció (aliments en mal estat). Representació d'una reacció química: reactius → productes. Llei de conservació de la massa (Lavoisier). Càlcul senzill de masses de reactius i productes. Reaccions químiques en l'elaboració de materials: ciment (CaCO3 → CaO + CO2), metalls, plàstics. Problemes ambientals derivats: pluja àcida, capa d'ozó, gasos d'efecte hivernacle.`,
  },

  'ciencies-geologia': {
    id: 'ciencies-geologia',
    titol: 'Geologia i Terra',
    materia: 'ciencies',
    pare: 'ciencies-quimica',
    fills: [],
    temari: `Estructura interna de la Terra: escorça (continental i oceànica), mantell i nucli (intern i extern). Geodinàmica interna: moviment de les plaques tectòniques, tipus de límits (divergent, convergent, transformant). Vulcanisme: causes, tipus d'erupcions (efusives i explosives), productes volcànics (lava, cendra, gasos). Sismicitat: causes, ones sísmiques, epicentre i hipocentre, mesura (escala Richter i Mercalli). Distribució del vulcanisme i sismicitat: zones de risc (Anell de Foc, falla de Sant Andreu). Geodinàmica externa: meteorització (física i química), erosió, transport i sedimentació. Tipus de roques: magmàtiques (granit, basalt), sedimentàries (calcària, arenisca) i metamòrfiques (marbre, pissarra); propietats i usos. Recursos energètics fòssils: formació, extracció i impacte ambiental.`,
  },


  // ══════════════════════════════════════════════════════════════════════════
  // TECNOLOGIA — Competència en Tecnologies
  // 12.5% del pes total, multiplicador XP ×1.1
  // ══════════════════════════════════════════════════════════════════════════

  'tecnologia-materials': {
    id: 'tecnologia-materials',
    titol: 'Materials i eines',
    materia: 'tecnologia',
    pare: null,
    fills: ['tecnologia-electricitat'],
    temari: `Distinció entre eines (accionades manualment) i màquines (motor propi). Propietats mecàniques dels materials: duresa (resistència al ratllat), tenacitat (resistència a l'esquerda), resistència mecànica, elasticitat, plasticitat. Propietats físiques: conductivitat tèrmica i elèctrica, densitat, punt de fusió. Propietats tecnològiques: soldabilitat, maquinabilitat, ductilitat, mal·leabilitat. Tipus de materials tècnics: metalls i aliatges (acer, ferro colat, alumini, coure, bronze, llautó), materials plàstics (termoplàstics: PE, PP, PVC; termoestables: epoxi, baquelita), fustes (massissa, contraxapat, aglomerat), materials ceràmics i materials compostos. Esforços als quals se sotmeten els materials: tracció, compressió, flexió, torsió, talladura. Normes de seguretat al taller: EPI, ordre, emergències.`,
  },

  'tecnologia-electricitat': {
    id: 'tecnologia-electricitat',
    titol: 'Electricitat i circuits',
    materia: 'tecnologia',
    pare: 'tecnologia-materials',
    fills: ['tecnologia-maquines'],
    temari: `Elements d'un circuit elèctric: generadors (piles, bateries, alternadors), conductors (cables), receptors (bombetes, resistències, motors), aparells de comandament (interruptors, commutadors, polsadors). Simbologia normalitzada de circuits elèctrics. Corrent continu (CC) vs. corrent altern (CA). Magnituds elèctriques: tensió o voltatge (V, en volts), intensitat de corrent (I, en amperes), resistència elèctrica (R, en ohms). Llei d'Ohm: V = I · R; càlculs en circuits simples. Circuits en sèrie: Req = R1 + R2 + ...; la intensitat és la mateixa en tots els elements. Circuits en paral·lel: 1/Req = 1/R1 + 1/R2 + ...; la tensió és la mateixa en tots els elements. Potència elèctrica: P = V · I = I² · R (en watts). Energia elèctrica: E = P · t (en joules o kWh). Efectes del corrent elèctric: efecte tèrmic, efecte lluminós, efecte mecànic, efecte magnètic. Generació d'electricitat: centrals elèctriques (tèrmiques, hidràuliques, nuclears, eòliques, fotovoltaiques).`,
  },

  'tecnologia-maquines': {
    id: 'tecnologia-maquines',
    titol: 'Màquines i mecanismes',
    materia: 'tecnologia',
    pare: 'tecnologia-electricitat',
    fills: ['tecnologia-habitatge'],
    temari: `Mecanismes de transmissió del moviment de rotació: politges i corretges (relació de transmissió i = n1/n2 = d2/d1), engranatges (i = n1/n2 = N2/N1, nombre de dents), cadenes i pinyons. Mecanismes de transformació del moviment: maneta-manovella (rotació → alternant), lleva (rotació → alternatiu), cremallera (rotació → translació), cargol sense fi (reducció de velocitat gran). Relació de transmissió: càlcul de velocitats de sortida i d'entrada. Màquines simples: palanca (tipus 1, 2 i 3), politja fixa i mòbil, pla inclinat; avantatge mecànic. Motors elèctrics: principi de funcionament (camp magnètic + corrent → força); motors de CC i de CA. Rendiment d'una màquina: η = P_útil / P_absorbida × 100%.`,
  },

  'tecnologia-habitatge': {
    id: 'tecnologia-habitatge',
    titol: "L'habitatge",
    materia: 'tecnologia',
    pare: 'tecnologia-maquines',
    fills: ['tecnologia-tic'],
    temari: `Elements estructurals d'un habitatge: fonamentació, estructura (pilars, bigues, forjats), tancaments (façana, coberta, envans). Instal·lacions domèstiques: elèctrica (quadre general de protecció, circuits interiors, preses de terra), aigua (canonades d'AFS i ACS, desguassos, claus de pas), gas (comptador, canonades, vàlvules de seguretat), telecomunicacions (antena, fibra òptica, router). Mesures de seguretat: magnetotèrmic, diferencial (ID), connexió a terra; clau de gas d'emergència; vàlvula de seguretat de caldera. Protocol d'accés a l'habitatge: compra (nota simple, escriptura, hipoteca), lloguer (contracte, fiança, IBI). Costos d'instal·lacions i serveis bàsics (factura de la llum, factura de l'aigua). Estratègies d'estalvi d'energia: aïllament tèrmic, finestres doble vidre, LED, electrodomèstics classe A. Estalvi d'aigua: cisternes amb doble descàrrega, difusors, detectors de fuites.`,
  },

  'tecnologia-tic': {
    id: 'tecnologia-tic',
    titol: 'TIC i Internet',
    materia: 'tecnologia',
    pare: 'tecnologia-habitatge',
    fills: [],
    temari: `Dispositius d'informació i comunicació: ordinadors (components: CPU, memòria RAM, disc dur, targeta gràfica, placa base), tablets, smartphones, càmeres digitals. Hardware vs. Software: diferència i exemples. Sistema operatiu: funcions (gestió de recursos, interfície). Programes i aplicacions: processadors de text, fulls de càlcul, presentacions, navegadors web. Internet: estructura (xarxa de xarxes), terminologia (URL, IP, DNS, HTTP/HTTPS, HTML). Cerca d'informació: motors de cerca, filtres, avaluació de fonts. Comunicació digital: correu electrònic (format i etiqueta), xarxes socials, xat, videoconferència. Seguretat digital: contrasenyes segures, phishing, virus i malware, còpies de seguretat, privacitat de dades. Comunicació cablejada (fibra, ethernet) i sense fil (WiFi, Bluetooth, 4G/5G). Ús responsable i ètic de les TIC.`,
  },


  // ══════════════════════════════════════════════════════════════════════════
  // SOCIAL — Competència Social i Ciutadana
  // 10% del pes total, multiplicador XP ×1.0
  // ══════════════════════════════════════════════════════════════════════════

  'social-paisatge': {
    id: 'social-paisatge',
    titol: 'Paisatge i medi natural',
    materia: 'social',
    pare: null,
    fills: ['social-demografia'],
    temari: `Distribució dels continents i oceans. Unitats de relleu principals al món: serralades (Alps, Himàlaia, Andes, Rocalloses), grans planes (pampes, praderies), grans depressions i planes al·luvials. Relleu d'Espanya: Meseta Central (Sistema Central, Sistema Ibèric), serralades perifèriques (Pirineus, Serralada Cantàbrica, Serralada Penibètica), depressions (de l'Ebre i del Guadalquivir). Relleu de Catalunya: Pirineus, Pre-Pirineus, Serralada Litoral i Prelitoral, Depressió Central. Hidrografia: rius principals d'Espanya (Ebre, Tajo, Guadalquivir, Duero, Miño) i Catalunya (Llobregat, Besòs, Ter, Ebre). Recursos naturals renovables (sòl, aigua, boscos, biodiversitat) i no renovables (minerals, combustibles fòssils). Impactes mediambientals: desertificació, incendis forestals, contaminació de rius, pluja àcida. Cartografia: llegenda, escala, punts cardinals, coordenades geogràfiques (latitud i longitud).`,
  },

  'social-demografia': {
    id: 'social-demografia',
    titol: 'Població i societat',
    materia: 'social',
    pare: 'social-paisatge',
    fills: ['social-historia-s19'],
    temari: `Indicadors demogràfics: taxa de natalitat (nascuts per cada 1.000 habitants/any), taxa de mortalitat, creixement vegetatiu (natalitat − mortalitat), esperança de vida, taxa de fecunditat, saldo migratori (immigrats − emigrats), creixement total. Tendències demogràfiques actuals: envelliment de la població en països desenvolupats, alta natalitat en països en vies de desenvolupament, baixa fecunditat a Espanya i Catalunya. Moviments migratoris: migracions internes (camp-ciutat, industrialització) i externes (emigracions i immigracions). Causes de la migració: econòmiques (recerca de feina), polítiques (refugiats), catàstrofes naturals. Conseqüències per als països d'origen i de destinació: demogràfiques, econòmiques, culturals. Estructura de la població per edats i sexes: piràmides de població (progressiva, estacionària, regressiva); interpretació. Institucionalització del poder a Catalunya: Generalitat, Parlament de Catalunya, Ajuntaments. Organització territorial d'Espanya: municipis, provincies, comunitats autònomes.`,
  },

  'social-historia-s19': {
    id: 'social-historia-s19',
    titol: 'Arrels del món contemporani',
    materia: 'social',
    pare: 'social-demografia',
    fills: ['social-conflictes-s20'],
    temari: `L'Antic Règim: monarquia absoluta, societat estamental (noblesa, clergat, poble), economia agrícola. Canvis de l'Estat liberal: sobirania nacional, separació de poders, constitucions, sufragi (primer censatari, després universal). Revolucions del s.XVIII: Revolució Americana (1776) i Revolució Francesa (1789); ideals d'igualtat, llibertat i fraternitat; Declaració dels Drets de l'Home. Revolució Industrial (s.XIX): vapot com a font d'energia, màquines (teler mecànic, locomotora a vapor), factory system, urbanització, èxode rural. Canvis socials de la industrialització: sorgiment del proletariat i la burgesia, condicions laborals precàries, treball infantil, moviment obrer (sindicats, marxisme, anarquisme). Catalunya i la industrialització: primer focus industrial de la Península (tèxtil, Terrassa, Sabadell, Manresa). Imperialisme i colonialisme europeu a Àfrica i Àsia (s.XIX): causes econòmiques i polítiques.`,
  },

  'social-conflictes-s20': {
    id: 'social-conflictes-s20',
    titol: 'Grans conflictes del s.XX',
    materia: 'social',
    pare: 'social-historia-s19',
    fills: ['social-mon-actual'],
    temari: `Primera Guerra Mundial (1914-1918): causes (nacionalismes, imperialisme, aliances, assassinat de Sarajevo), bàndols (Triple Aliança vs. Triple Entesa), conseqüències (Tractat de Versalles, mapa d'Europa reformat, crisi econòmica). Entreguerres: crisi del 1929 (Crack de Wall Street, atur massiu), auge dels feixismes (Mussolini a Itàlia, Hitler a Alemanya) i el comunisme a la URSS (Lenin, Stalin). A Espanya: la Segona República (1931-1936) i la Guerra Civil espanyola (1936-1939), bàndols (republicans vs. nacionals), intervenció estrangera (Brigades Internacionals, Legió Còndor). El franquisme (1939-1975): dictadura, repressió, autarquia, desarrollismo, oposició democràtica. A Catalunya: represàlia de la cultura i la llengua catalanes. Segona Guerra Mundial (1939-1945): causes, bàndols (Aliats vs. Potències de l'Eix), Shoà, bomba atòmica, conseqüències (ONU, Guerra Freda, descolonització). Transició democràtica espanyola (1975-1982): Constitució de 1978, estatuts d'autonomia.`,
  },

  'social-mon-actual': {
    id: 'social-mon-actual',
    titol: 'El món actual',
    materia: 'social',
    pare: 'social-conflictes-s20',
    fills: [],
    temari: `Organització política i administrativa de la Unió Europea: Comissió Europea, Parlament Europeu, Consell de la UE, Tribunal de Justícia; estats membres; Eurozona i espai Schengen; polítiques comunes (PAC, fons estructurals). Organització política d'Espanya: monarquia parlamentària, Constitució de 1978, Corts Generals (Congrés i Senat), Govern, Tribunal Constitucional; 17 comunitats autònomes + 2 ciutats autònomes. Organització política de Catalunya: Parlament de Catalunya, President de la Generalitat, Govern de la Generalitat; comarques i municipis. Estat del benestar: sanitat pública, educació pública, pensions, prestació per desocupació. Globalització econòmica: lliure comerç, multinacionals, deslocalització industrial, noves tecnologies com a motor. Desigualtats mundials: nord ric vs. sud empobriment; indicadors (PIB, IDH); causes del subdesenvolupament. Cooperació internacional: ONU, OMS, UNICEF, ONGs. Focus de conflicte al món actual i factors històrics explicatius.`,
  },

};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

// Nodes arrel (pare === null) — es posen en 'disponible' quan l'usuari es registra
const ROOT_NODES = Object.values(NODES)
  .filter(n => n.pare === null)
  .map(n => n.id);

// Multiplicador XP per matèria (reflecteix el pes real a la PACFGM)
const XP_MULTIPLIER = {
  mates:      1.5,   // 25% del pes — la més important
  ciencies:   1.3,   // 12.5%
  tecnologia: 1.1,   // 12.5%
  catala:     1.0,   // 15%
  castella:   1.0,   // 15%
  angles:     1.0,   // 10%
  social:     1.0,   // 10%
};

module.exports = { NODES, ROOT_NODES, XP_MULTIPLIER };
