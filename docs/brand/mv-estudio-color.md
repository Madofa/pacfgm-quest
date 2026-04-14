# Estudio de color: Monument Valley
*Referente visual para Cognita — Abril 2026*

Ver estudio visual interactivo: `docs/brand/mv-estudio-color.html`

## Hallazgos clave

### Las 6 reglas del color en Monument Valley

1. **Nunca oscuro + saturado** — zona prohibida del color picker. Los pasteles de MV son siempre de baja saturación pero VALOR ALTO.
2. **Frío + cálido siempre en par** — teal con compañero en arena/melocotón/terracota. Siempre juntos, nunca separados.
3. **El fondo tiene temperatura** — nunca negro puro. Siempre negro-marrón, negro-verde o negro-azul. El negro frío mata el ambiente.
4. **La geometría es un degradado de luz** — cara superior = cálida y clara (toca el cielo). Cara lateral = fría. Cara frontal = fría oscura. Sin motor de iluminación: sólo diferencia de temperatura entre caras.
5. **Un tono "pop" muy claro** — siempre hay un elemento de valor muy alto (cream, peach pálido, lavanda hielo). Ancla el ojo y da luminosidad.
6. **El cielo entre estructuras** — las escenas tienen gradiente de fondo. El espacio vacío es "aire" con temperatura, no vacío negro.

### Capítulos más relevantes para Cognita

| Capítulo | Colores clave | Por qué |
|----------|--------------|---------|
| VII — The Rookery (A) | `#3eb6b0`, `#d9ccb5`, `#a6bfb1` | Casi exactamente la energía de B1 |
| VII — The Rookery (C) | `#f5c199`, `#9ab3c3`, `#3e3f40` | El peach pálido como "pop" |
| IX — The Descent (B)  | `#dab499`, `#32cfc0`, `#82bcb2` | Tan cálido + teal brillante |
| MV2 — Paleta icónica  | `#fde9e2`, `#e29578`, `#83c5be` | Peach pálido + sandy orange |

### Diagnóstico del grafo Cognita (antes del estudio)

- Fondo `#090D13`: negro frío → **cambiar a negro-marrón cálido `#0D1015`**
- Nodos desconocidos en azul-pizarra frío → **tierra oscura cálida: `#5a5040`, `#3a3828`**
- Peach/cream casi ausente en geometría → **el "pop" tiene que ser visible en cara top**
- Conexiones inactivas sin temperatura → **usar tan `#dab499` en hilos inactivos**

### Paleta Cognita revisada

| Rol | Hex | Descripción |
|-----|-----|-------------|
| Fondo base | `#0D1015` | Negro cálido (no frío) |
| Surface UI | `#1a1510` | Marrón muy oscuro |
| Incognita top face | `#5a5040` | Arena oscura cálida |
| Incognita lateral | `#3a3828` | Oliva oscuro |
| Incognita sombra | `#242830` | Pizarra (sólo caras de sombra) |
| Progreso glow | `#dab499` | Tan cálido (MV Cap. IX) |
| Progreso cara top | `#3a7880` | Teal medio |
| Cognita cara top | `#a8d4c4` | Mint claro |
| Cognita pop | `#fde9e2` | Peach pálido (icónico MV2) |
| Cognita apex | `#e29578` | Sandy orange |
| Teal principal | `#7AAFB8` | Sin cambio |
| Cream texto | `#E8DDD0` | Sin cambio |
