# DEPURADOR TIC · versión 3 (RPG pixel art)

Juego educativo del **Desafío TIC** (Tecnologías de la Información y la Comunicación, Universidad Columbia del Paraguay).
Sos el operador de campo del turno noche: recorrés un edificio con un vestíbulo y **seis sectores**, hablás con sus habitantes y reparás **16 terminales** respondiendo los retos de la cátedra. Cada error descuenta energía y deja un reporte de incidente con la explicación y la fuente. Al final aparece el **Informe de Desempeño**.

La versión 3 conserva todo el contenido y las mecánicas de la versión 2 y rehace por completo la presentación: mundo en pixel art con vista cenital, habitaciones con paredes en profundidad, personajes con diálogos, cuadros de texto progresivo, menús con cursor, música y efectos originales, guardado automático y banco de retos ampliable.

## Cómo jugar

| Acción | Teclado | Mouse | Táctil |
|---|---|---|---|
| Moverse | Flechas o W A S D | Clic en el piso (camina solo) | Cruceta |
| Usar / hablar / avanzar diálogo | E, Z, Enter o Espacio | Clic sobre el objeto o persona | Botón USAR o tocar |
| Completar texto / cerrar diálogo | X, Shift o Esc | — | Botón MENÚ |
| Menú de pausa | Esc o P | Botón MENÚ | Botón MENÚ |
| Ajustes directos | M | — | — |
| En una terminal: elegir | Flechas, A–D o 1–4 | Clic en la opción | Tocar la opción |
| En una terminal: confirmar | Enter | Segundo clic o EJECUTAR | Segundo toque o EJECUTAR |
| Retirarse de la terminal | Esc | RETIRARSE | RETIRARSE |

- **Energía:** empieza en 100. Cada comando fallido resta 25. En 0 hay que **reiniciar el sistema** (las reparaciones se conservan y el reinicio queda registrado).
- **Recursos:** +100 si la terminal se repara al primer intento, +50 en los siguientes.
- **Comandos fallidos:** quedan deshabilitados aunque salgas y vuelvas a entrar a la terminal, o recargues la página.
- **Modo Directo:** en el menú de pausa (y en el título) permite saltar a cualquier terminal sin recorrer el mapa. Útil para navegación accesible y para la demo en clase.

## Cómo abrirlo

- **Directo:** abrir `index.html` con doble clic. Funciona sin servidor y sin internet (la tipografía pixel está incluida).
- **GitHub Pages:** subir el contenido de esta carpeta tal cual a un repositorio y activar Pages sobre la rama principal. Se conservan las rutas relativas.
- **Servidor local (para las pruebas):** `python3 -m http.server 8765` y abrir `http://localhost:8765/`.

La partida y los ajustes se guardan en el navegador (localStorage). Si se usa otro navegador u otro equipo, la partida empieza de cero.

## Estructura

```
index.html                 página del juego
css/juego.css              interfaz (incluye la tipografía embebida)
fonts/                     tipografía original «Depurador Pixel» (WOFF y TTF)
js/retos.js                los 16 retos originales (sin cambios respecto de la versión 2)
js/arte.js                 sprites, objetos, baldosas e íconos (pixel art dibujado por código)
js/mundo.js                mapa: vestíbulo, 6 sectores, terminales, decoración, personajes, colisiones y rutas
js/dialogos.js             textos de personajes, carteles y objetos
js/sonido.js               música y efectos sintetizados (Web Audio)
js/banco.js                banco de retos: validación, importación y exportación JSON
js/guardado.js             guardado con validación y recuperación de partidas
js/juego.js                motor: estado, dibujo, entrada, diálogos, terminales, menús e informe
bancos/banco-original.json copia de referencia de los 16 retos
bancos/ejemplo-ampliacion.json  3 retos de ejemplo para probar la importación
assets/                    hoja de sprites y de baldosas (exportadas del juego)
tests/qa.js                pruebas automáticas (Playwright)
tests/banco-invalido.json  archivo con errores a propósito, para las pruebas
docs/QA.md                 informe de pruebas
docs/capturas/             capturas tomadas por las pruebas
CHANGELOG.md               registro de cambios
```

## Correspondencia terminal → reto

| Sector | Terminal | Reto |
|---|---|---|
| Núcleo de Procesamiento | Cajero automático · Asistente de IA · Consola de prompts | U1-1 · U1-2 · U1-3 |
| Subred de Búsqueda | Buscador del laboratorio · Atril de fuentes · Portal de la facultad | U3-1 · U3-2 · U3-3 |
| Núcleo de Virtualización | Inventario de hardware · Notebook de laboratorio | U2-1 · U2-2 |
| Terminal de Archivos | Libreta de Mateo · Planilla de gastos · Editor de informes | U4-1 · U4-2 · U4-3 |
| Servidor Compartido | Documento compartido · Archivador del proyecto · Pizarra de procesos | U6-1 · U6-2 · U7-1 |
| Archivo de Referencias | Fichero bibliográfico · Escritorio de redacción | U9-1 · U9-2 |

## Ampliar el banco de retos

1. Copiar `bancos/ejemplo-ampliacion.json` y editarlo. Cada reto necesita:
   `id` (único), `unidad` (U1…U12), `categoria` (`fund`, `virt`, `busq`, `ofi`, `colab` o `inv`), `pregunta`, `opciones` (exactamente 4), `correcta` (0 = A … 3 = D), `retro` (explicación) y `fuente`.
   Opcionales: `titulo`, `terminal` (nombre de la terminal), `log` (descripción de la falla), `eps` (true si es un reto entrada → proceso → salida), `codigo` (true si las opciones son fórmulas o búsquedas).
2. En el juego: **MENÚ → BANCO DE RETOS → ELEGIR ARCHIVO .JSON** (o pegar el texto y **VALIDAR**).
3. Revisar la **vista previa**: muestra los retos válidos, los que tienen errores (con el motivo) y los avisos. Solo se agregan los válidos.
4. Cada reto importado aparece como **terminal auxiliar** en su sector (hasta 3 por sector) y cuenta para el informe.
5. **DESCARGAR BANCO COMPLETO** exporta originales + importados; **RESTAURAR BANCO ORIGINAL** quita los importados.

El juego **no** lee PDF, Word ni PowerPoint: los retos nuevos se escriben en JSON (a mano o con ayuda de una IA, revisando siempre el contenido contra el material de clase).

Para corregir un reto original, editar `js/retos.js` (y regenerar `bancos/banco-original.json` si se quiere mantener la copia de referencia).

## Sonido

`js/sonido.js` sintetiza la música de cada zona (título, vestíbulo, seis sectores, terminal, informe y apagado) y los efectos (pasos, selección, confirmación, éxito, error, puerta, guardado, reinicio, voces de diálogo). Todo es original. Para reemplazar una pista por un archivo propio o con licencia libre, agregar `archivo: "audio/nombre.ogg"` a esa pista en `PISTAS`. Música y efectos tienen volúmenes independientes en **Ajustes**. El audio arranca con la primera tecla o clic, como exigen los navegadores.

## Accesibilidad

- Juego completo con teclado; foco visible; ventanas con `role="dialog"` y `aria-modal`; el resto de la página queda inerte mientras hay un menú abierto.
- Opciones de las terminales como grupo de radio (flechas para recorrer, Enter para confirmar); estados (fallida, correcta) anunciados.
- Regiones `aria-live` anuncian la sala, lo que hay cerca y los resultados.
- **Reducir movimiento** (automático si el sistema lo pide): sin parpadeos, alarmas, sacudidas, partículas, fundidos ni barridos.
- **Texto grande**, **tipografía de lectura** (reemplaza la letra pixel) y **velocidad del texto** (normal, rápida, instantánea).
- Contraste sobre fondo negro: blanco 21:1, amarillo 16,8:1, verde 13,1:1, naranja 11,6:1, gris 10,7:1, rojo 6,9:1 y gris tenue (deshabilitado) 6,2:1; todos superan el mínimo AA de 4,5:1.

## Pruebas

```
python3 -m http.server 8765 &
npm i playwright   # si no está instalado
node tests/qa.js http://localhost:8765/ 100 docs/capturas
```

Genera `tests/resultados-qa.json`. El resumen está en `docs/QA.md`.

## Créditos

Equipo: Ernesto Coronel, José Daniel, Josué Villalba y Lucas Orué.


Contenido académico: materiales de la cátedra (ver las fuentes en cada reto y en la ficha técnica). Arte, tipografía, música, efectos y código: originales del proyecto. La estética se inspira en los RPG clásicos en pixel art; no se usa ningún recurso de otros juegos.
