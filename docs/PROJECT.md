# Cognita — Plataforma genérica de estudio gamificado

> Nombre provisional del proyecto. Dominio `cognita.com` confirmado disponible (abril 2026).

**Estado actual:** En planificación. Base técnica: PACFGM Quest (en producción en `quest.sinilos.com`).

---

## Qué es

Plataforma donde el alumno sube su propio contenido de estudio (PDFs, fotos de apuntes, URLs) y la IA genera preguntas estructuradas que se estudian con mecánicas RPG y repetición espaciada.

Evolución directa de PACFGM Quest: mismo stack, misma capa RPG, mismo sistema SR. Lo que cambia es que el contenido lo aporta el alumno en vez de ser el temario fijo de la PACFGM catalana.

---

## Stack técnico

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + Vite 8 |
| Backend | Node.js / Express 4 |
| Base de datos | MySQL 8 en Sered (cPanel/Passenger) |
| IA generación | Gemini 2.5 Flash API — structured output con JSON schema |
| IA visión (OCR + eval) | Gemini 2.5 Flash con visión (inline_data) |
| Extracción PDF nativo | `pdf-parse` |
| Extracción web | `@mozilla/readability` + `jsdom` |
| Auth | JWT (7 días), bcrypt |
| Tests | Jest + supertest |
| Deploy | GitHub Actions → cPanel Git deploy |

---

## Arquitectura de la nueva capa

```
[Alumno sube PDF/imagen/URL]
         ↓
[Ingestion Service]
  • pdf-parse para PDFs nativos
  • Gemini Vision para PDFs escaneados e imágenes
  • Readability para URLs
         ↓
[MySQL: study_sources + source_chunks + study_topics]
         ↓
[Question Generator Worker (setImmediate)]
  • 1 pregunta test por chunk
  • 1 pregunta desarrollo para chunks > 500 chars
  • JSON schema estricto via Gemini structured output
         ↓
[MySQL: generated_questions + sr_generated + user_study_nodes]
         ↓
[Capa RPG existente]
  • study_topics → user_study_nodes (quests dinámicas)
  • sr_generated trabaja igual que sr_pregunta (SM-2)
  • XP, rangos, combate: sin cambios
```

---

## Schema de base de datos

### Tablas existentes (PACFGM Quest, sin tocar)

| Tabla | Propósito |
|---|---|
| `usuaris` | Cuentas de usuario (alumne/monitor) |
| `progres_nodes` | Estado de nodos del árbol de habilidades PACFGM |
| `sessions_estudi` | Sesiones de 5 preguntas |
| `preguntes_log` | Respuestas individuales |
| `preguntes_bank` | Pool de preguntas PACFGM (precuradas + generadas) |
| `sr_pregunta` | Repetición espaciada para preguntes_bank |
| `side_quests` | Quests diarias |
| `xp_log` | Auditoría de XP |
| `grups` / `grups_membres` | Sistema de clases (monitor/alumne) |
| `feedback` | Bug reports |

### Tablas nuevas (Cognita)

| Tabla | Propósito |
|---|---|
| `study_sources` | Fuentes subidas por el alumno (PDF/imagen/URL) |
| `source_chunks` | Texto normalizado en trozos de ~750 tokens |
| `study_topics` | Temas detectados por Gemini en cada fuente |
| `generated_questions` | Preguntas generadas (test/desarrollo/matemáticas) |
| `sr_generated` | Repetición espaciada para generated_questions |
| `user_study_nodes` | Mapeo topics → nodos RPG por usuario |

### Esquema `generated_questions.pregunta_json` por tipo

**test:**
```json
{ "enunciat": "...", "opcions": ["A","B","C","D"], "index_correcte": 2, "explicacio": "...", "dificultat": 1|2|3 }
```

**desenvolupament:**
```json
{ "enunciat": "...", "rubrica": ["criterio1","criterio2"], "resposta_model": "...", "dificultat": 2 }
```

**matematiques:**
```json
{ "enunciat": "...", "solucio_passos": ["paso1","paso2"], "resultat_final": "...", "criteris_avaluacio": ["..."], "dificultat": 3 }
```

---

## Sistema de repetición espaciada (SM-2 simplificado)

Idéntico al de PACFGM Quest, ahora también en `sr_generated`:

```
SR_INTERVALS = [1, 3, 7, 14, 30]  // días

Correcto  → consecutives_correctes = min(actual + 1, 4)
Incorrecto → consecutives_correctes = 0
Siguiente revisión = hoy + SR_INTERVALS[consecutives_correctes]
```

Niveles de dominio:
- 0 → Fallado recientemente (1 día)
- 1 → Aprendiendo (3 días)
- 2 → Consolidando (7 días)
- 3 → Dominado (14 días)
- 4 → Máximo dominio (30 días)

---

## API endpoints nuevos

```
POST /api/sources/upload-file          Subir PDF o imagen (base64)
POST /api/sources/upload-url           Importar URL
GET  /api/sources                      Listar fuentes del usuario
GET  /api/sources/:id                  Detalle + topics
DELETE /api/sources/:id                Borrar fuente (cascade)
GET  /api/sources/:id/status           Polling estado ingesta

GET  /api/question-gen/source/:id      Stats de preguntas generadas
POST /api/question-gen/source/:id/generate-more   Generar más (rate limit 1h)

POST /api/pregunta/generar-from-source  Iniciar sesión desde fuente propia
POST /api/pregunta/resposta-generated   Responder + actualizar SR

GET  /api/progres/my-nodes             Nodos RPG dinámicos del usuario
```

---

## Plan de implementación

Ver: `docs/superpowers/plans/2026-04-14-generic-gamified-platform.md`

### Resumen de fases

| Fase | Qué construye | Entregable |
|---|---|---|
| **A** | Pipeline de ingesta (PDF nativo, Gemini Vision, URLs) + CLI de validación | Script validado con PDFs reales, coste verificado |
| **B** | Schema MySQL nuevas tablas + API CRUD fuentes + UI MyContent | Alumno puede subir y ver su contenido |
| **C** | Generador de preguntas (Gemini structured output) | Preguntas generadas automáticamente tras ingesta |
| **D** | Capa RPG dinámica: topics → quests, SR sobre generated_questions | Quest jugable desde un PDF subido por el alumno |
| **E** | Multi-usuario, auth hardening, RGPD, consentimiento parental | App lista para usuarios reales |

---

## Decisiones arquitectónicas tomadas

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Gemini 2.5 Flash Vision para OCR | Tesseract | Gemini entiende layout complejo, fórmulas, mal enfoque, sin postprocesado |
| NotebookLM descartado | — | No tiene API pública; Enterprise es por licencia de usuario, inviable |
| No guardar imágenes originales | Guardar en disco | Ahorra espacio, evita RGPD con libros de terceros |
| Context caching Gemini solo en ingesta inicial | Usar como mecanismo principal | TTL inestable, coste por tiempo; MySQL es más fiable a largo plazo |
| `setImmediate` como worker | BullMQ/queue | Suficiente para MVP; BullMQ entra en Phase E si hace falta escalar |
| Structured output con `responseSchema` | Solo `responseMimeType: 'application/json'` | Validación estricta del JSON, sin parseo manual ni recuperación de errores |
| Chunks de ~750 tokens (~3000 chars) | Chunks más grandes o más pequeños | Balance entre contexto suficiente y coste por llamada Gemini |

---

## Decisiones pendientes

- **Modelo de negocio:** gratis, freemium, pago por uso. Condiciona toda la Phase E.
- **Evaluación respuestas desarrollo:** Gemini evalúa contra rúbrica → definir escala de puntuación y cómo afecta al SR.
- **Matemáticas con foto:** el módulo existe en PACFGM Quest (`analitzarDesenvolupament`). Hay que conectarlo a `generated_questions.tipus='matematiques'`.
- **Frontend quest screen dinámico:** Phase D solo expone la API `/my-nodes`. Falta el React screen que renderiza y permite jugar.
- **Límites de uso:** PDFs/MB por alumno, preguntas generadas por día. Condiciona coste Gemini.
- **Idiomas soportados:** Gemini lo gestiona automáticamente; hay que decidir la UI (castellano, catalán, inglés).
- **Menores:** si hay usuarios < 14 años en España → AEPD + LOPDGDD + consentimiento parental desde Phase B.

---

## Coste estimado Gemini 2.5 Flash

| Operación | Tokens aprox. | Coste aprox. |
|---|---|---|
| Ingesta PDF 50 páginas (vision) | ~50k entrada | ~$0,015 |
| Generación 30 preguntas test | ~45k entrada + 15k salida | ~$0,051 |
| Evaluación respuesta desarrollo | ~2k entrada + 0,5k salida | ~$0,002 |
| **Total por alumno, primer documento** | — | **~$0,07** |

Precios: $0,30/M tokens entrada, $2,50/M tokens salida (Gemini 2.5 Flash, abril 2026).

---

## Seguridad (OWASP WSTG)

Puntos críticos identificados para Phase E:

| WSTG | Riesgo | Fix |
|---|---|---|
| WSTG-INPV-03 | `mime_type` declarado por el cliente, no validado en servidor | Usar `file-type` npm para detectar MIME real del buffer |
| WSTG-AUTHZ-01 | Broken object level auth | Auditar que todos los queries filtren `usuari_id` — ya implementado, pendiente auditoría formal |
| WSTG-ATHN-04 | JWT 7 días sin revocación (riesgo con menores) | Refresh tokens + revocación en Phase E |
| WSTG-INPV-05 | Batch inserts con `VALUES ?` — revisar vs SQL injection | Parameterización de mysql2 cubre esto, confirmar en auditoría |
| WSTG-ERRH-01 | `err.message` expuesto al cliente puede filtrar internals | Códigos de error genéricos en Phase E |

Referencia: https://github.com/owasp/wstg

---

## Codebase actual: dónde está cada cosa

```
pacfgm-quest/
├── backend/
│   ├── controllers/
│   │   ├── pregunta.controller.js   — Sesiones, SR (SM-2), evaluación Vision
│   │   ├── progres.controller.js    — Skill tree, stats, retención
│   │   ├── auth.controller.js       — JWT, registro, verificación email
│   │   └── grup.controller.js       — Sistema de clases monitor/alumne
│   ├── services/
│   │   └── gemini.service.js        — Cliente Gemini (fetch directo, sin SDK)
│   ├── data/
│   │   └── skillTree.js             — 35 nodos PACFGM hardcodeados (a parametrizar)
│   ├── utils/
│   │   └── xp.js                    — RANGS, cálculo XP (a parametrizar)
│   ├── db/
│   │   ├── connection.js            — Pool MySQL
│   │   └── migrations/
│   │       ├── 001_schema.sql       — Schema completo PACFGM
│   │       ├── 002_study_content.sql    — [NUEVO] study_sources, chunks, topics
│   │       ├── 003_generated_questions.sql — [NUEVO] generated_questions, sr_generated
│   │       └── 004_dynamic_nodes.sql    — [NUEVO] user_study_nodes
│   └── tests/                       — Jest + supertest
├── frontend/
│   └── src/
│       ├── pages/                   — BattleScreen, Progress, etc.
│       ├── components/
│       │   └── Sources/             — [NUEVO] UploadZone, SourceList
│       └── services/api.js          — Cliente REST con JWT
└── docs/
    ├── PROJECT.md                   — Este archivo
    └── superpowers/plans/
        └── 2026-04-14-generic-gamified-platform.md  — Plan de implementación detallado
```

---

## Nombre y dominio

- **Nombre propuesto:** Cognita
- **Dominio:** `cognita.com` — disponible (verificado via WHOIS, abril 2026)
- **Por qué:** De "cognoscere" (latín: conocer). Funciona en castellano, catalán, inglés, francés, italiano, alemán sin significado conflictivo. Fácil de pronunciar en cualquier idioma.
- **Alternativas disponibles:** `questio.com`, `runika.com`, `kodexia.com`
