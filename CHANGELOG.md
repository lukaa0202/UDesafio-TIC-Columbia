# Registro de cambios

## 3.0.1 — Créditos (30-10-2026)
- Créditos con los nombres del equipo (en el juego y en el README).
- Sorpresa en la pantalla de créditos: al hacer clic 5 veces en «CRÉDITOS», la gata COOKIE se asoma en un lugar distinto cada vez (esquinas superiores e inferiores o junto al título). Con «Reducir movimiento» aparece sin desplazarse.

## 3.0.0 — Rediseño RPG pixel art (30-10-2026)

### Se conserva (sin cambios de contenido ni de reglas)
- Nombre, objetivo educativo, edificio con seis sectores y sus nombres.
- Las 16 terminales con su id de reto, sector, nombre y descripción de la falla.
- `js/retos.js` idéntico al de la versión 2: 16 preguntas, alternativas, respuestas correctas, retroalimentación y fuentes.
- Energía 100, −25 por comando fallido, reinicio obligatorio en 0 (las reparaciones se conservan).
- Recursos +100 al primer intento, +50 en los siguientes.
- Modo Directo / Salto de Retos dentro de los ajustes y el menú de pausa.
- Reducir movimiento automático según el sistema; juego completo con teclado; marcado WAI-ARIA.
- Registro del recorrido técnico (apertura, abandono, fallo, reparación, reinicio) e Informe de Desempeño.

### Nuevo
- **Mundo:** vestíbulo central + 6 salas cerradas con paredes de dos filas en profundidad, puertas y pasillos; cámara por habitación con fundido al cambiar de sala; baldosas, paredes, alfombras y adornos propios de cada sector; penumbra en las salas con fallas que se ilumina cuando el sector queda estable.
- **Arte original:** operador con caminata en 4 direcciones (4 cuadros), 5 personajes (BORNE, COOKIE, NIMBO, MATEO y DOÑA FICHA) con 3 expresiones, 12 tipos de terminal con estado de falla/estable, 30 objetos decorativos, contorno automático y escalado entero sin suavizado.
- **Tipografía «Depurador Pixel»** creada para el juego (136 glifos con tildes, ñ, ¿¡, comillas y flechas), embebida para funcionar sin internet.
- **Diálogos** con texto progresivo, retrato, voz por personaje y reacciones según el progreso; carteles de sector, cartelera de objetivos, máquina expendedora, disquete de respaldo y descripciones al examinar objetos.
- **Terminales** con presentación de RPG: cabecera, medidores de estabilidad y energía, texto progresivo, cursor corazón, selección + confirmación, reporte de incidente o explicación con fuente.
- **Menús:** título con escena animada, pausa, objetivos, ajustes, Modo Directo, banco de retos, créditos, confirmaciones y pantalla de sistema apagado.
- **Sonido:** música por zona y efectos sintetizados (originales), volúmenes independientes para música y efectos.
- **Guardado automático** y manual (disquete y menú), con validación: un guardado dañado se descarta con aviso; recursos y errores se recalculan a partir del progreso real.
- **Banco de retos ampliable:** importación JSON con vista previa y validación, terminales auxiliares (3 por sector), exportación del banco, plantilla, quitar retos y restaurar el banco original.
- **Informe:** resueltas, aciertos al primer intento, errores, precisión, tiempo, recursos, reinicios, desempeño por unidad, contenidos para repasar con su fuente y registro del recorrido; imprimir/PDF, exportar CSV y JSON; versión parcial disponible durante la partida.
- **Mouse y táctil:** clic o toque para caminar hasta un punto u objeto y usarlo; cruceta y botones USAR / MENÚ; diseño para teléfono vertical y horizontal, tablet y escritorio.
- Accesibilidad adicional: texto grande, tipografía de lectura, velocidad del texto, anuncios `aria-live` de sala y objeto cercano, página inerte detrás de los menús.

### Corregido respecto de la versión 2
- **Comandos fallidos que se rehabilitaban** al salir y volver a entrar a una terminal (se guardaban en la sesión de la ventana): ahora quedan registrados en la partida y siguen deshabilitados al reabrir, reiniciar o recargar.
- La partida se perdía al recargar la página: ahora se guarda y se puede continuar.
- Un clic o una tecla ejecutaban el comando de inmediato: ahora se elige y luego se confirma (Enter, segundo clic o EJECUTAR), para evitar errores por un toque accidental.
- El tiempo seguía corriendo con menús abiertos: ahora solo corre durante la exploración, los diálogos y las terminales, y se detiene al terminar.
- Si se recargaba la página con energía 0, la versión 2 volvía a 100 sin registrar el reinicio: ahora la partida se recupera en la pantalla de sistema apagado y el reinicio queda registrado.
