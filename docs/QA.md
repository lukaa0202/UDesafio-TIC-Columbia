# Informe de pruebas (QA) · DEPURADOR TIC 3.0.0

- Fecha de ejecución: 2026-10-30 02:58:23 UTC
- Herramienta: Playwright + Chromium (sin interfaz), servidor local `http://localhost:8765/`
- Duración total: 6 min 34 s
- **Pruebas: 135 de 135 aprobadas** (0 fallidas)
- **Ciclos repetidos: 100 de 100 aprobados**

Todas las acciones se hacen con entradas reales sobre la interfaz: teclas, clics del mouse, toques y archivos elegidos en el selector. El estado interno solo se lee para verificar resultados (energía, recursos, terminales reparadas) y para convertir coordenadas del mapa en coordenadas de pantalla al hacer clic. Cada verificación está en `tests/resultados-qa.json`; el script es `tests/qa.js`.

## 1. Pruebas funcionales y de regresión

| Prueba | Resultado | Verificaciones |
|---|---|---|
| 01 Inicio del juego | ✅ | se ve la pantalla de título; el título es DEPURADOR TIC; sin guardado no aparece CONTINUAR |
| 02 Menú principal (teclado) | ✅ | el foco inicial está en NUEVA PARTIDA; flecha abajo mueve el cursor; Enter en NUEVA PARTIDA inicia la partida con el diálogo de BORNE; el diálogo identifica al personaje; el texto aparece de forma progresiva (4 < 58); Enter completa la línea; … (8 en total) |
| 03 Movimiento hacia arriba | ✅ | ArrowUp desplaza al personaje (528,316 → 528,294); orientación arriba |
| 04 Movimiento hacia abajo | ✅ | ArrowDown desplaza al personaje (528,294 → 528,316); orientación abajo |
| 05 Movimiento hacia la izquierda | ✅ | ArrowLeft desplaza al personaje (528,316 → 506,316); orientación izq |
| 06 Movimiento hacia la derecha | ✅ | ArrowRight desplaza al personaje (506,316 → 528,316); orientación der |
| 06b Animación de caminata (cuadros) | ✅ | se usan varios cuadros de caminata: 3,0,1,2 |
| 07 Colisiones sólidas | ✅ | contra la pared el personaje no avanza (y 261.3 → 261.3); la posición final es libre (no atravesó la pared); ninguna pared es transitable; los objetos y personajes bloquean el paso |
| 08 Acceso a todas las habitaciones (caminando) | ✅ | se llegó caminando a fund (zona fund); regreso al vestíbulo desde fund; se llegó caminando a busq (zona busq); regreso al vestíbulo desde busq; se llegó caminando a virt (zona virt); regreso al vestíbulo desde virt; … (13 en total) |
| 09 Acceso a las 16 terminales (caminando y con clic) | ✅ | 16 de 16 terminales abiertas al llegar caminando |
| 09b Interacción con personajes, carteles y objetos | ✅ | clic en BORNE: camina y abre su diálogo; el diálogo muestra el nombre del personaje; la tecla E vuelve a hablar con el personaje de enfrente |
| 10 Apertura de terminal (teclado) | ✅ | se abre la terminal correcta; muestra unidad/tema; cuatro alternativas; ventana con aria-modal |
| 11 Selección de respuestas y confirmación | ✅ | flecha abajo selecciona B; se pide confirmación de la selección; la tecla D selecciona D sin ejecutar; seleccionar no ejecuta |
| 13 Respuesta incorrecta, 15 penalización y 14 explicación | ✅ | energía −25 (100 → 75); el comando fallido queda registrado; se muestra el reporte de incidente; el reporte incluye diagnóstico y fuente; la opción fallida queda deshabilitada |
| Regresión: los comandos fallidos NO se rehabilitan al salir y reabrir | ✅ | tras reabrir, la opción fallida sigue deshabilitada; intentar ejecutarla de nuevo no descuenta energía |
| 12 Respuesta correcta, 16 reparación y 17 recursos | ✅ | terminal reparada; +50 recursos por acertar en el segundo intento; mensaje de estabilización; estabilidad al 100%; +100 recursos al primer intento (respondida con el mouse) |
| Regresión: una terminal reparada no se puede volver a responder | ✅ | en el Modo Directo aparece como estable y deshabilitada |
| 18 Energía agotada y 19 reinicio | ✅ | tras 4 errores la energía llega a 0; aparece REINICIAR SISTEMA; sin energía no se pueden ejecutar comandos; reinicio: energía 100 y 1 reinicio registrado; las reparaciones se conservan tras el reinicio; los 3 comandos fallidos siguen deshabilitados tras el reinicio |
| 22 Guardado y 23 recuperación de partida | ✅ | el título ofrece CONTINUAR con el progreso; se recuperan reparadas, fallidos, energía, recursos, errores y reinicios; se recupera el tiempo (105s → 105s); se recupera la posición del personaje |
| 24 Configuración | ✅ | Reducir movimiento aplica la clase calma; Texto grande; Tipografía de lectura; Velocidad del texto; los ajustes persisten tras recargar |
| 25 Controles de audio | ✅ | el audio se activa después de un gesto del usuario; música y efectos son independientes (0/30); suena la pista del título; en el mapa suena la pista del sector: fund; en la terminal cambia la música; al volver suena la música del Núcleo de Virtualización |
| 26 Accesibilidad | ✅ | el resto de la página queda inerte con un menú abierto; todos los controles visibles tienen nombre accesible; Tab no sale del menú abierto; no hay tabindex positivos; al cerrar, el foco vuelve al mapa; el mapa tiene instrucciones para lectores de pantalla; … (15 en total) |
| 27 Importación del banco de preguntas | ✅ | archivo inválido: 1 válido y 3 con errores; detecta id duplicado de un original; explica cada error; detecta id repetido dentro del archivo; texto mal formado: error claro; no se puede aplicar una importación inválida; … (14 en total) |
| 28 Exportación de datos | ✅ | exporta el banco completo (19 retos); el banco exportado conserva los 16 originales; RESTAURAR vuelve al banco original; el progreso del reto quitado se elimina sin romper la partida |
| 20 Finalización de la partida y 21 informe final | ✅ | se muestra el Informe de Desempeño completo; 16 de 16 reparadas; el informe incluye todas las secciones; la precisión coincide con los intentos (80%); desempeño por unidad; lista contenidos para repasar; … (11 en total) |
| Recuperación de una partida terminada | ✅ | el título indica partida completada |
| Nueva partida con confirmación | ✅ | pide confirmación; NO conserva la partida; SÍ inicia una partida limpia |
| Guardado dañado | ✅ | avisa que el guardado estaba dañado; no ofrece continuar un guardado dañado; detecta valores imposibles; descarta terminales inexistentes y completa datos faltantes; recalcula los recursos a partir del progreso real (999 → 100) |
| 29 Diseño móvil (390×844, táctil) | ✅ | sin desplazamiento horizontal en el título; el diálogo se avanza con el botón USAR; sin desplazamiento horizontal en el mapa; el escenario muestra 222×281 px de mundo a escala ×5; el escenario entra en la pantalla; controles táctiles visibles; … (11 en total) |
| 30a Tablet (820×1180, táctil) | ✅ | sin desplazamiento horizontal en el título; el diálogo se avanza con el botón USAR; sin desplazamiento horizontal en el mapa; el escenario muestra 338×254 px de mundo a escala ×7; el escenario entra en la pantalla; controles táctiles visibles; … (11 en total) |
| 30b Portátil (1366×768) | ✅ | sin desplazamiento horizontal en el título; el diálogo se avanza con teclado; sin desplazamiento horizontal en el mapa; el escenario muestra 504×321 px de mundo a escala ×2; el escenario entra en la pantalla; sin errores de consola  |
| 30c Teléfono horizontal (844×390, táctil) | ✅ | sin desplazamiento horizontal en el título; el diálogo se avanza con el botón USAR; sin desplazamiento horizontal en el mapa; el escenario muestra 618×239 px de mundo a escala ×4; el escenario entra en la pantalla; controles táctiles visibles; … (11 en total) |
| 30d Escritorio grande (1920×1080) | ✅ | sin desplazamiento horizontal en el título; el diálogo se avanza con teclado; sin desplazamiento horizontal en el mapa; el escenario muestra 336×252 px de mundo a escala ×3; el escenario entra en la pantalla; sin errores de consola  |
| 30e Cambio de resolución en plena partida | ✅ | 390×844: vista 370×468 ×1; 1024×768: vista 496×321 ×2; 700×500: vista 680×390 ×1; 1280×860: vista 336×245 ×3; el juego sigue operativo tras los cambios de tamaño |
| Regresión: correspondencia con DEPURADOR TIC v2 | ✅ | la versión anterior tenía 16 terminales; las 16 terminales conservan id, sector, nombre y falla; la versión anterior usaba −25 de energía y +100/+50: se mantienen (pruebas 13 y 17); retos.js es idéntico al original (16 preguntas, alternativas, respuestas, retroalimentación y fuentes); los seis sectores conservan sus nombres; sin errores de consola:  |

## 2. Ciclos repetidos (100)

Cada ciclo borra el almacenamiento, recarga la página, empieza una partida nueva desde el título y ejecuta un escenario completo. Al final de cada ciclo se comprueban invariantes: energía entre 0 y 100 en pasos de 25; recursos = suma de reparaciones (+100 / +50); errores = comandos fallidos registrados; ninguna terminal reparada con su respuesta correcta marcada como fallida; el HUD coincide con el estado; sin errores en la consola.

| Escenario | Qué hace | Ciclos | Aprobados |
|---|---|---|---|
| sin_errores | Partida completa de 16 terminales sin errores; termina en el informe con 1600 recursos. | 10 | 10 |
| multiples_errores | 6 terminales al azar con un error cada una (la energía no se deja llegar a 0). | 10 | 10 |
| abandono_reapertura | Falla un comando, sale y reabre 3 veces: la opción fallida sigue deshabilitada; energía y errores no cambian. | 10 | 10 |
| energia_agotada | 4 errores → energía 0 → REINICIAR SISTEMA → reparaciones intactas → repara la terminal pendiente. | 10 | 10 |
| recuperacion | Repara entre 2 y 11 terminales (algunas con error), recarga la página y CONTINUAR: el estado es idéntico. | 10 | 10 |
| guardado_danado | Corrompe el guardado con 6 variantes (JSON roto, null, versión vieja, energía imposible, recursos negativos, tipos inválidos). | 10 | 10 |
| banco_ampliado | Importa bancos/ejemplo-ampliacion.json y completa los 19 retos hasta el informe. | 10 | 10 |
| importacion_invalida | Pega 5 variantes de JSON inválido: no se puede aplicar y el banco queda intacto. | 10 | 10 |
| cambio_resolucion | Juega 3 terminales cambiando entre 390×844, 844×390 y 1280×860 sin desbordes. | 10 | 10 |
| raton_y_teclado | Partida completa alternando al azar respuestas con mouse (seleccionar + confirmar) y con teclado. | 10 | 10 |

## 3. Fallas abiertas

Ninguna en la ejecución final.


## 4. Errores encontrados durante el desarrollo y corregidos

Cada error se reprodujo, se corrigió en el código y se volvió a ejecutar la prueba que fallaba y el resto del conjunto.

| # | Error detectado | Origen | Corrección | Prueba que lo cubre |
|---|---|---|---|---|
| 1 | Los comandos fallidos se volvían a habilitar al salir y reabrir una terminal (heredado de la v2). | Las opciones fallidas se guardaban en el objeto temporal de la ventana. | Se guardan en la partida (`burned`) y se respetan al reabrir, reiniciar y recargar. | «Regresión: los comandos fallidos NO se rehabilitan…», escenario `abandono_reapertura` |
| 2 | Un clic en la opción preseleccionada ejecutaba el comando sin confirmar. | La selección inicial contaba como elección del usuario. | El primer clic/toque elige; el segundo (o EJECUTAR / Enter) confirma. | «12 Respuesta correcta…» (con mouse), `raton_y_teclado` |
| 3 | En el menú de pausa la tecla Tab salía del menú. | La trampa de foco contaba botones con `tabindex="-1"`. | Solo cuenta elementos realmente tabulables. | «26 Accesibilidad» |
| 4 | Al abrir Ajustes desde el título sonaba la música del vestíbulo. | La música se elegía solo por la pantalla superior. | Se busca la pista en toda la pila de pantallas. | «25 Controles de audio» |
| 5 | Al quitar un reto importado ya reparado, los recursos quedaban inflados. | Los recursos se guardaban como contador independiente. | Recursos y errores se recalculan a partir del progreso real al validar. | «28 Exportación de datos» (restaurar), «Guardado dañado» |
| 6 | En teléfonos horizontales el mapa quedaba fuera de la pantalla. | Alto del escenario calculado con un valor fijo. | El escenario ocupa el espacio libre con flexbox. | «30c Teléfono horizontal» |
| 7 | En teléfonos el mundo se veía diminuto (1 px de arte = 1 px CSS) y el HUD ocupaba 4 renglones. | Escala calculada para pantallas horizontales; HUD sin diseño móvil. | Escala por orientación (×4–×5 en vertical) y HUD compacto en dos renglones. | «29 Diseño móvil», «30a Tablet» |
| 8 | Un guardado con energía imposible (p. ej. 30) se aceptaba. | La validación solo miraba el rango 0–100. | La energía debe ser múltiplo de 25. | `guardado_danado` |
| 9 | La tipografía pixel no cargaba al abrir `index.html` con doble clic. | Los navegadores bloquean fuentes en `file://`. | La fuente va embebida en el CSS (además de los archivos en `fonts/`). | Verificación manual con Chromium en `file://` |

## 5. Inspección visual

Se revisaron capturas reales del navegador (carpeta `docs/capturas/`) de: título, diálogo inicial, las seis salas, terminal (pregunta, respuesta incorrecta, respuesta correcta), pantalla de sistema apagado, ajustes, vista previa de importación, informe final y el mapa y la terminal en 390×844, 820×1180, 1366×768, 844×390 y 1920×1080. También `assets/hoja-sprites.png` y `assets/baldosas.png`.

## 6. Comparación con la versión 2

- Las 16 terminales conservan id de reto, sector, nombre y texto de la falla (comparado automáticamente contra `juego.html` v2).
- `js/retos.js` es byte a byte idéntico al de la v2: no se modificó ninguna pregunta, alternativa, respuesta, explicación ni fuente.
- Reglas iguales: −25 de energía por error, +100/+50 de recursos, reinicio en 0 con reparaciones conservadas, Modo Directo, reducir movimiento, control total por teclado, registro del recorrido e informe.

## 7. Lo que no se pudo probar aquí

- **Lectores de pantalla reales** (NVDA, JAWS, VoiceOver, TalkBack): se verificó el marcado (roles, nombres accesibles, `aria-live`, foco), pero no la lectura con un lector real.
- **Otros motores de navegador** (Safari/WebKit y Firefox) y **dispositivos físicos**: las pruebas de móvil y tablet usan la emulación táctil de Chromium.
- **Sonido audible:** se verificó que el sistema de audio se activa tras un gesto, que cambia de pista según la zona y que los volúmenes son independientes; no se escuchó la salida.
- **Impresión:** se verificó que IMPRIMIR abre el diálogo de impresión del navegador y que existe la hoja de estilos de impresión; no se imprimió en papel.
- **Descargas dentro de la vista previa de claude.ai:** las descargas (CSV, JSON, banco) se probaron en el navegador; algunos visores incrustados pueden bloquearlas.


## 8. Versión 3.0.1 (créditos y sorpresa de COOKIE)

- Se repitió el conjunto de pruebas funcionales y de regresión con 10 ciclos: 45 de 45 aprobadas, sin errores de consola.
- Prueba específica de la sorpresa: 4 clics en «CRÉDITOS» no la activan; el quinto sí. En cinco invocaciones seguidas COOKIE apareció en cinco lugares distintos (arriba a la izquierda, abajo a la izquierda, junto al título, arriba a la derecha y abajo a la derecha) y desapareció sola a los 3 segundos. También se activa con 5 pulsaciones de Enter sobre el título.
