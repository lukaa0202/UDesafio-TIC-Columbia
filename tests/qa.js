/* DEPURADOR TIC · tests/qa.js — pruebas automáticas con Playwright (Chromium).
   Uso:  python3 -m http.server 8765   (en la carpeta del juego)
         node tests/qa.js http://localhost:8765/ [ciclos=100] [carpeta_capturas]
   Toda interacción usa teclado, mouse o toques reales sobre la interfaz. `__depurador` solo se usa para LEER el estado
   (y para convertir coordenadas del mundo a la pantalla al hacer clic sobre el mapa). */
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path");
const BASE = process.argv[2] || "http://localhost:8765/";
const CICLOS = +(process.argv[3] || 100);
const CAPT = process.argv[4] || path.join(__dirname, "capturas");
fs.mkdirSync(CAPT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const resultados = [];
let actual = null;
function prueba(nombre) { actual = { nombre, ok: true, detalles: [] }; resultados.push(actual); }
function ok(cond, msg) { if (!cond) { actual.ok = false; actual.detalles.push("FALLA: " + msg); } else actual.detalles.push("ok: " + msg); return cond; }
function nota(msg) { actual.detalles.push(msg); }

async function contexto(browser, opts = {}) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 1280, height: 860 }, acceptDownloads: true }, opts));
  const p = await ctx.newPage();
  p._errores = [];
  p.on("pageerror", (e) => p._errores.push("pageerror: " + e.message));
  p.on("console", (m) => { if (m.type() === "error" && !/fonts\.g|ERR_TUNNEL|ERR_PROXY|net::ERR/.test(m.text())) p._errores.push("console: " + m.text()); });
  return { ctx, p };
}
const est = (p) => p.evaluate(() => JSON.parse(JSON.stringify(__depurador.estado())));
const modo = (p) => p.evaluate(() => __depurador.modo());
const pila = (p) => p.evaluate(() => __depurador.pila());
async function esperar(p, fn, arg, ms = 6000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await p.evaluate(fn, arg)) return true; await sleep(40); } return false; }

async function arrancar(p, aj) {
  await p.goto(BASE); await p.waitForSelector("#pantalla [data-acc]");
  await p.evaluate((a) => { localStorage.clear(); if (a) localStorage.setItem("depurador-tic:ajustes", JSON.stringify(a)); }, aj || null);
  await p.reload(); await p.waitForSelector("#pantalla [data-acc='nueva']");
}
async function saltarDialogos(p) { for (let i = 0; i < 40 && (await modo(p)) === "dialogo"; i++) { await p.keyboard.press("Escape"); await sleep(25); } }
async function nueva(p) {
  await p.click("[data-acc='nueva']");
  if (await p.$("[data-acc='si']")) await p.click("[data-acc='si']");
  await esperar(p, () => __depurador.modo() === "dialogo" || __depurador.modo() === "explorar");
  await saltarDialogos(p);
}
async function abrirPausa(p) { await p.keyboard.press("Escape"); await p.waitForSelector("[data-acc='directo']"); }
async function directo(p, id) {
  if ((await modo(p)) !== "pantalla") await abrirPausa(p);
  await p.click("[data-acc='directo']"); await p.click(`[data-ir="${id}"]`);
  await p.waitForSelector("#t-titulo");
  if (await p.$("#t-ops.esperando")) { await p.keyboard.press("Enter"); }
  await p.waitForSelector("#t-ops:not(.esperando)");
}
async function responder(p, i, via) {
  if (via === "raton") { await p.click(`.op[data-i="${i}"]`); await p.click(`.op[data-i="${i}"]`); }
  else { await p.keyboard.press("Key" + "ABCD"[i]); await p.keyboard.press("Enter"); }
  await p.waitForSelector("#t-res-h");
}
async function salir(p) { await p.keyboard.press("Escape"); await esperar(p, () => __depurador.modo() !== "pantalla" || __depurador.pila().slice(-1)[0] !== "terminal"); await sleep(60); }
async function correcta(p, id) { return p.evaluate((i) => __depurador.retos().find((r) => r.id === i).correcta, id); }
async function idsRetos(p) { return p.evaluate(() => __depurador.retos().map((r) => r.id)); }
// clic real sobre una posición del mundo visible
async function clicMundo(p, wx, wy) {
  const c = await p.evaluate(([x, y]) => { const v = __depurador.vista(), cv = document.getElementById("mundo"), r = cv.getBoundingClientRect(); const ew = cv.width / v.escala, eh = cv.height / v.escala; return { x: r.left + (x - v.cam.x) * r.width / ew, y: r.top + (y - v.cam.y) * r.height / eh }; }, [wx, wy]);
  await p.mouse.click(c.x, c.y);
}
async function caminarHasta(p, tx, ty) {
  for (let i = 0; i < 12; i++) {
    const v = await p.evaluate(([x, y]) => { const V = __depurador.vista(), j = __depurador.jugador(); const wx = (x + 0.5) * 16, wy = (y + 0.5) * 16; return { visible: wx > V.cam.x + 4 && wx < V.cam.x + V.vw - 4 && wy > V.cam.y + 4 && wy < V.cam.y + V.vh - 4, jx: j.x, jy: j.y, cam: V.cam, vw: V.vw }; }, [tx, ty]);
    if (v.visible) { await clicMundo(p, (tx + 0.5) * 16, (ty + 0.5) * 16); await esperar(p, () => !__depurador.jugador().ruta, null, 9000); return true; }
    const ix = (tx + 0.5) * 16 > v.jx ? v.cam.x + v.vw - 12 : v.cam.x + 12;
    const iy = await p.evaluate((jy) => __depurador.zona() === "hall" ? (__depurador.mundo.HALL.y + 2.5) * 16 : jy - 6, v.jy);
    await clicMundo(p, ix, iy); await esperar(p, () => !__depurador.jugador().ruta, null, 9000);
  }
  return false;
}
async function mantener(p, tecla, ms) { await p.keyboard.down(tecla); await sleep(ms); await p.keyboard.up(tecla); }
async function invariantes(p, etiqueta) {
  const r = await p.evaluate(() => {
    const e = __depurador.estado(), R = __depurador.retos(); let res = 0, err = 0, mal = [];
    R.forEach((x) => { if (e.fixed[x.id]) res += e.tries[x.id] === 1 ? 100 : 50; err += (e.burned[x.id] || []).length; if (e.fixed[x.id] && (e.burned[x.id] || []).indexOf(x.correcta) >= 0) mal.push(x.id); });
    const hud = { hp: document.getElementById("hp-val").textContent, fx: document.getElementById("st-fixed").textContent, res: document.getElementById("st-res").textContent };
    return { hp: e.hp, res: e.res, resEsp: res, err: e.errores, errEsp: err, mal, hud, fixed: Object.keys(e.fixed).length, total: R.length };
  });
  const bien = r.hp >= 0 && r.hp <= 100 && r.hp % 25 === 0 && r.res === r.resEsp && r.err === r.errEsp && !r.mal.length && r.hud.hp === r.hp + "/100" && r.hud.fx === r.fixed + "/" + r.total && r.hud.res === String(r.res);
  if (!bien) ok(false, etiqueta + " invariantes " + JSON.stringify(r));
  return bien;
}

(async () => {
  const browser = await chromium.launch();
  const t0 = Date.now();
  let { ctx, p } = await contexto(browser);
  const RAPIDO = { texto: "instantaneo", calma: true, musica: 0, efectos: 0 };

  /* 1-2 inicio y menú principal */
  prueba("01 Inicio del juego");
  await arrancar(p);
  ok(await p.isVisible("#pantalla .logo"), "se ve la pantalla de título");
  ok((await p.textContent("#pantalla .logo")).includes("DEPURADOR TIC"), "el título es DEPURADOR TIC");
  ok(!(await p.$("[data-acc='continuar']")), "sin guardado no aparece CONTINUAR");
  await p.screenshot({ path: path.join(CAPT, "01-titulo.png") });
  prueba("02 Menú principal (teclado)");
  const foco0 = await p.evaluate(() => document.activeElement.getAttribute("data-acc"));
  ok(foco0 === "nueva", "el foco inicial está en NUEVA PARTIDA");
  await p.keyboard.press("ArrowDown"); ok((await p.evaluate(() => document.activeElement.getAttribute("data-acc"))) === "directo", "flecha abajo mueve el cursor");
  await p.keyboard.press("ArrowUp"); await p.keyboard.press("Enter");
  ok(await esperar(p, () => __depurador.modo() === "dialogo"), "Enter en NUEVA PARTIDA inicia la partida con el diálogo de BORNE");
  await p.screenshot({ path: path.join(CAPT, "02-dialogo-intro.png") });
  const lineas = await p.evaluate(() => document.getElementById("dlg-completo").textContent);
  ok(lineas.includes("BORNE"), "el diálogo identifica al personaje");
  // texto progresivo: al principio la línea visible es más corta que la completa
  const vis = await p.evaluate(() => document.getElementById("dlg-visible").textContent.length);
  ok(vis < lineas.length, "el texto aparece de forma progresiva (" + vis + " < " + lineas.length + ")");
  await p.keyboard.press("Enter"); const vis2 = await p.evaluate(() => document.getElementById("dlg-visible").textContent);
  ok(vis2.length > 10, "Enter completa la línea");
  await p.keyboard.press("Enter"); ok((await p.evaluate(() => document.getElementById("dlg-completo").textContent)) !== lineas, "Enter avanza a la línea siguiente");
  await saltarDialogos(p);
  ok((await modo(p)) === "explorar", "al cerrar el diálogo se puede explorar");

  /* 3-7 movimiento y colisiones */
  const pos = () => p.evaluate(() => { const j = __depurador.jugador(); return { x: j.x, y: j.y, dir: j.dir }; });
  const dirs = [["03 Movimiento hacia arriba", "ArrowUp", (a, b) => b.y < a.y, "arriba"], ["04 Movimiento hacia abajo", "ArrowDown", (a, b) => b.y > a.y, "abajo"], ["05 Movimiento hacia la izquierda", "ArrowLeft", (a, b) => b.x < a.x, "izq"], ["06 Movimiento hacia la derecha", "ArrowRight", (a, b) => b.x > a.x, "der"]];
  for (const [n, k, f, d] of dirs) {
    prueba(n); const a = await pos(); await mantener(p, k, 260); const b = await pos();
    ok(f(a, b), `${k} desplaza al personaje (${a.x.toFixed(0)},${a.y.toFixed(0)} → ${b.x.toFixed(0)},${b.y.toFixed(0)})`); ok(b.dir === d, "orientación " + d);
  }
  prueba("06b Animación de caminata (cuadros)");
  await p.keyboard.down("ArrowRight"); const cuadros = new Set(); for (let i = 0; i < 12; i++) { cuadros.add(await p.evaluate(() => __depurador.jugador().cuadro)); await sleep(45); } await p.keyboard.up("ArrowRight");
  ok(cuadros.size >= 3, "se usan varios cuadros de caminata: " + [...cuadros].join(","));
  prueba("07 Colisiones sólidas");
  await mantener(p, "ArrowLeft", 300);
  await mantener(p, "ArrowUp", 1500); const pa = await pos(); await mantener(p, "ArrowUp", 500); const pb = await pos();
  ok(Math.abs(pa.y - pb.y) < 0.5, "contra la pared el personaje no avanza (y " + pa.y.toFixed(1) + " → " + pb.y.toFixed(1) + ")");
  ok(await p.evaluate(() => { const j = __depurador.jugador(); return __depurador.mundo.libre(j.x, j.y); }), "la posición final es libre (no atravesó la pared)");
  const muro = await p.evaluate(() => { const M = __depurador.mundo; let malas = 0; for (let y = 0; y < M.H; y++) for (let x = 0; x < M.W; x++) if (M.celda[y][x] !== 1 && M.transitable(x, y)) malas++; return malas; });
  ok(muro === 0, "ninguna pared es transitable");
  // contra un objeto: BORNE (personaje) es sólido
  const borne = await p.evaluate(() => { const o = __depurador.mundo.personajes.find((n) => n.id === "borne"); return { x: (o.tx + 0.5) * 16, y: (o.ty + 1) * 16 }; });
  ok(await p.evaluate(([x, y]) => !__depurador.mundo.libre(x, y - 4), [borne.x, borne.y]), "los objetos y personajes bloquean el paso");

  /* 8-10 acceso a todas las habitaciones y terminales caminando (mouse + teclado) */
  prueba("08 Acceso a todas las habitaciones (caminando)");
  const sectores = await p.evaluate(() => __depurador.mundo.ORDEN.map((k) => ({ k, puerta: __depurador.mundo.SECTORES[k].puerta, fila: __depurador.mundo.SECTORES[k].fila, y: __depurador.mundo.SECTORES[k].y })));
  const HALL = await p.evaluate(() => __depurador.mundo.HALL);
  const visitadas = [];
  const terminalesAbiertas = new Set();
  for (const s of sectores) {
    // caminar por clic hasta la boca del pasillo en el vestíbulo
    const ty = s.fila === 0 ? HALL.y : HALL.y + HALL.h - 1;
    await caminarHasta(p, s.puerta, ty);
    await mantener(p, s.fila === 0 ? "ArrowUp" : "ArrowDown", 1400);
    const z = await p.evaluate(() => __depurador.zona());
    ok(z === s.k, "se llegó caminando a " + s.k + " (zona " + z + ")");
    if (z === s.k) visitadas.push(s.k);
    await sleep(350);
    await p.screenshot({ path: path.join(CAPT, "08-sala-" + s.k + ".png") });
    // 9-10: abrir cada terminal de la sala haciendo clic sobre ella (camina y la usa)
    const ests = await p.evaluate((k) => __depurador.mundo.estaciones.filter((o) => o.zona === k).map((o) => ({ id: o.id, cx: o.cx, cy: o.cy, nombre: o.def.nombre })), s.k);
    for (const e of ests) {
      await clicMundo(p, e.cx, e.cy - 6);
      const abierta = await esperar(p, (id) => __depurador.pila().slice(-1)[0] === "terminal" && document.getElementById("t-titulo"), e.id, 12000);
      if (abierta) { const tt = await p.textContent("#t-titulo"); if (tt === e.nombre.toUpperCase()) terminalesAbiertas.add(e.id); await p.keyboard.press("Escape"); await esperar(p, () => __depurador.modo() === "explorar"); }
      else nota("no se abrió " + e.id);
    }
    // volver al vestíbulo por la puerta
    const vuelta = s.fila === 0 ? { x: (s.puerta + 0.5) * 16, y: (s.y + 8 + 0.5) * 16 } : { x: (s.puerta + 0.5) * 16, y: (s.y + 0.5) * 16 };
    await clicMundo(p, vuelta.x, vuelta.y); await esperar(p, () => !__depurador.jugador().ruta, null, 9000);
    await mantener(p, s.fila === 0 ? "ArrowDown" : "ArrowUp", 1400);
    ok((await p.evaluate(() => __depurador.zona())) === "hall", "regreso al vestíbulo desde " + s.k);
  }
  ok(visitadas.length === 6, "6 de 6 sectores recorridos");
  prueba("09 Acceso a las 16 terminales (caminando y con clic)");
  ok(terminalesAbiertas.size === 16, terminalesAbiertas.size + " de 16 terminales abiertas al llegar caminando");
  prueba("09b Interacción con personajes, carteles y objetos");
  // BORNE con la tecla E
  const jb = await p.evaluate(() => { const o = __depurador.mundo.personajes.find((n) => n.id === "borne"); return { x: (o.tx + 0.5) * 16, y: (o.ty + 0.5) * 16 }; });
  await caminarHasta(p, Math.floor(jb.x / 16), Math.floor(jb.y / 16) + 1);
  await clicMundo(p, jb.x, jb.y - 4); const habla = await esperar(p, () => __depurador.modo() === "dialogo", null, 9000);
  ok(habla, "clic en BORNE: camina y abre su diálogo");
  if (habla) { ok((await p.textContent("#dlg-quien")) === "BORNE", "el diálogo muestra el nombre del personaje"); await saltarDialogos(p); }
  await p.keyboard.press("KeyE"); ok(await esperar(p, () => __depurador.modo() === "dialogo", null, 1500), "la tecla E vuelve a hablar con el personaje de enfrente");
  await saltarDialogos(p);

  /* 10-16 terminales: apertura, selección, correcta, incorrecta, explicación, penalización, reparación */
  prueba("10 Apertura de terminal (teclado)");
  await directo(p, "U1-1");
  ok((await p.textContent("#t-titulo")) === "CAJERO AUTOMÁTICO", "se abre la terminal correcta");
  ok((await p.textContent("#pantalla .sub")).includes("U1"), "muestra unidad/tema");
  ok((await p.$$(".op")).length === 4, "cuatro alternativas");
  ok(await p.evaluate(() => document.querySelector("#pantalla .pnl").getAttribute("aria-modal") === "true"), "ventana con aria-modal");
  await p.screenshot({ path: path.join(CAPT, "10-terminal.png"), fullPage: true });
  prueba("11 Selección de respuestas y confirmación");
  await p.keyboard.press("ArrowDown"); let sel = await p.evaluate(() => document.querySelector('.op[aria-checked="true"]').getAttribute("data-i"));
  ok(sel === "1", "flecha abajo selecciona B");
  ok((await p.textContent("#t-conf")).includes("[B]"), "se pide confirmación de la selección");
  await p.keyboard.press("KeyD"); sel = await p.evaluate(() => document.querySelector('.op[aria-checked="true"]').getAttribute("data-i"));
  ok(sel === "3", "la tecla D selecciona D sin ejecutar");
  ok(!(await p.$("#t-res-h")), "seleccionar no ejecuta");
  prueba("13 Respuesta incorrecta, 15 penalización y 14 explicación");
  const c1 = await correcta(p, "U1-1"); const mal1 = (c1 + 1) % 4;
  let e0 = await est(p);
  await responder(p, mal1);
  let e1 = await est(p);
  ok(e1.hp === e0.hp - 25, "energía −25 (" + e0.hp + " → " + e1.hp + ")");
  ok((e1.burned["U1-1"] || []).includes(mal1), "el comando fallido queda registrado");
  ok((await p.textContent("#t-res-h")).includes("REPORTE DE INCIDENTE"), "se muestra el reporte de incidente");
  ok((await p.textContent("#t-resultado")).includes("Fuente"), "el reporte incluye diagnóstico y fuente");
  ok(await p.evaluate((i) => document.querySelector(`.op[data-i="${i}"]`).classList.contains("quemada"), mal1), "la opción fallida queda deshabilitada");
  await p.screenshot({ path: path.join(CAPT, "13-incorrecta.png"), fullPage: true });
  prueba("Regresión: los comandos fallidos NO se rehabilitan al salir y reabrir");
  await salir(p); await directo(p, "U1-1");
  ok(await p.evaluate((i) => document.querySelector(`.op[data-i="${i}"]`).classList.contains("quemada") && document.querySelector(`.op[data-i="${i}"]`).getAttribute("aria-disabled") === "true", mal1), "tras reabrir, la opción fallida sigue deshabilitada");
  await p.keyboard.press("Key" + "ABCD"[mal1]); await p.keyboard.press("Enter"); await sleep(100);
  ok((await est(p)).hp === e1.hp, "intentar ejecutarla de nuevo no descuenta energía");
  prueba("12 Respuesta correcta, 16 reparación y 17 recursos");
  await responder(p, c1);
  const e2 = await est(p);
  ok(e2.fixed["U1-1"] === true, "terminal reparada");
  ok(e2.res === e1.res + 50, "+50 recursos por acertar en el segundo intento");
  ok((await p.textContent("#t-res-h")).includes("ESTABILIZADA"), "mensaje de estabilización");
  ok((await p.getAttribute("#t-estab", "aria-valuenow")) === "100", "estabilidad al 100%");
  await p.screenshot({ path: path.join(CAPT, "12-correcta.png"), fullPage: true });
  await salir(p);
  await directo(p, "U1-2"); const c2 = await correcta(p, "U1-2"); await responder(p, c2, "raton");
  ok((await est(p)).res === e2.res + 100, "+100 recursos al primer intento (respondida con el mouse)");
  await salir(p);
  prueba("Regresión: una terminal reparada no se puede volver a responder");
  await abrirPausa(p); await p.click("[data-acc='directo']");
  ok((await p.getAttribute('[data-ir="U1-1"]', "aria-disabled")) === "true", "en el Modo Directo aparece como estable y deshabilitada");
  await p.keyboard.press("Escape"); await p.keyboard.press("Escape");
  await invariantes(p, "tras reparar");

  /* 18-19 energía y reinicio */
  prueba("18 Energía agotada y 19 reinicio");
  await directo(p, "U1-3"); const c3 = await correcta(p, "U1-3");
  for (let k = 0, n = 0; k < 4 && n < 3; k++) if (k !== c3) { await responder(p, k); n++; }
  ok((await est(p)).hp === 0, "tras 4 errores la energía llega a 0");
  ok(!!(await p.$("#t-reinicio")), "aparece REINICIAR SISTEMA");
  ok(await p.evaluate(() => [...document.querySelectorAll(".op")].every((o) => o.getAttribute("aria-disabled") === "true")), "sin energía no se pueden ejecutar comandos");
  await p.click("#t-reinicio"); await p.waitForSelector("[data-acc='reiniciar']");
  await p.screenshot({ path: path.join(CAPT, "19-apagado.png") });
  await p.click("[data-acc='reiniciar']"); await esperar(p, () => __depurador.modo() === "explorar");
  const e3 = await est(p);
  ok(e3.hp === 100 && e3.reinicios === 1, "reinicio: energía 100 y 1 reinicio registrado");
  ok(e3.fixed["U1-1"] && e3.fixed["U1-2"], "las reparaciones se conservan tras el reinicio");
  await directo(p, "U1-3"); ok(await p.evaluate(() => document.querySelectorAll(".op.quemada").length === 3), "los 3 comandos fallidos siguen deshabilitados tras el reinicio");
  await responder(p, c3); await salir(p);
  await invariantes(p, "tras reinicio");

  /* 22-23 guardado y recuperación */
  prueba("22 Guardado y 23 recuperación de partida");
  const antes = await est(p); const posA = await pos();
  await p.reload(); await p.waitForSelector("[data-acc='continuar']");
  ok((await p.textContent("[data-acc='continuar']")).includes("3/16"), "el título ofrece CONTINUAR con el progreso");
  await p.click("[data-acc='continuar']"); await esperar(p, () => __depurador.modo() === "explorar");
  const despues = await est(p); const posB = await pos();
  ok(JSON.stringify(antes.fixed) === JSON.stringify(despues.fixed) && JSON.stringify(antes.burned) === JSON.stringify(despues.burned) && antes.hp === despues.hp && antes.res === despues.res && antes.reinicios === despues.reinicios && antes.errores === despues.errores, "se recuperan reparadas, fallidos, energía, recursos, errores y reinicios");
  ok(Math.abs(despues.ms - antes.ms) < 15000, "se recupera el tiempo (" + Math.round(antes.ms / 1000) + "s → " + Math.round(despues.ms / 1000) + "s)");
  ok(Math.abs(posA.x - posB.x) < 2 && Math.abs(posA.y - posB.y) < 2, "se recupera la posición del personaje");
  await invariantes(p, "tras recargar");

  /* 24-26 ajustes, audio y accesibilidad */
  prueba("24 Configuración");
  await abrirPausa(p); await p.click("[data-acc='ajustes']");
  await p.check("#aj-calma"); ok(await p.evaluate(() => document.body.classList.contains("calma")), "Reducir movimiento aplica la clase calma");
  await p.check("#aj-grande"); ok(await p.evaluate(() => document.body.classList.contains("texto-grande")), "Texto grande");
  await p.check("#aj-legible"); ok(await p.evaluate(() => document.body.classList.contains("legible")), "Tipografía de lectura");
  await p.selectOption("#aj-texto", "rapido"); ok((await p.evaluate(() => __depurador.ajustes().texto)) === "rapido", "Velocidad del texto");
  await p.screenshot({ path: path.join(CAPT, "24-ajustes.png"), fullPage: true });
  await p.reload(); await p.waitForSelector("[data-acc='continuar']");
  ok(await p.evaluate(() => document.body.classList.contains("calma") && document.body.classList.contains("texto-grande") && document.body.classList.contains("legible")), "los ajustes persisten tras recargar");
  prueba("25 Controles de audio");
  await p.click("[data-acc='ajustes']");
  ok(await p.evaluate(() => SONIDO.activo()), "el audio se activa después de un gesto del usuario");
  await p.focus("#aj-musica"); await p.keyboard.press("Home");
  await p.focus("#aj-efectos"); await p.keyboard.press("Home"); for (let i = 0; i < 3; i++) await p.keyboard.press("ArrowRight");
  const a2 = await p.evaluate(() => __depurador.ajustes());
  ok(a2.musica === 0 && a2.efectos === 30, "música y efectos son independientes (" + a2.musica + "/" + a2.efectos + ")");
  ok((await p.evaluate(() => SONIDO.pistaActual())) === "titulo", "suena la pista del título");
  await p.keyboard.press("Escape"); await p.click("[data-acc='continuar']"); await esperar(p, () => __depurador.modo() === "explorar");
  ok(["hall", "fund", "busq", "virt", "ofi", "colab", "inv"].includes(await p.evaluate(() => SONIDO.pistaActual())), "en el mapa suena la pista del sector: " + (await p.evaluate(() => SONIDO.pistaActual())));
  await directo(p, "U2-1"); ok((await p.evaluate(() => SONIDO.pistaActual())) === "terminal", "en la terminal cambia la música");
  await salir(p); ok((await p.evaluate(() => SONIDO.pistaActual())) === "virt", "al volver suena la música del Núcleo de Virtualización");
  prueba("26 Accesibilidad");
  await abrirPausa(p);
  ok(await p.evaluate(() => document.getElementById("app").inert === true), "el resto de la página queda inerte con un menú abierto");
  const sinNombre = await p.evaluate(() => [...document.querySelectorAll("button, [role=radio], input, select")].filter((b) => b.offsetParent && !(b.getAttribute("aria-label") || b.textContent.trim() || (b.id && document.querySelector(`label[for="${b.id}"]`)))).length);
  ok(sinNombre === 0, "todos los controles visibles tienen nombre accesible");
  // trampa de foco con Tab
  let fuera = false; for (let i = 0; i < 25; i++) { await p.keyboard.press("Tab"); if (!(await p.evaluate(() => document.getElementById("pantalla").contains(document.activeElement)))) fuera = true; }
  ok(!fuera, "Tab no sale del menú abierto");
  ok((await p.evaluate(() => document.querySelectorAll("[tabindex]:not([tabindex='0']):not([tabindex='-1'])").length)) === 0, "no hay tabindex positivos");
  await p.keyboard.press("Escape");
  ok(await p.evaluate(() => document.activeElement.id === "mundo"), "al cerrar, el foco vuelve al mapa");
  ok((await p.getAttribute("#mundo", "aria-describedby")) === "ayuda-mapa", "el mapa tiene instrucciones para lectores de pantalla");
  ok((await p.evaluate(() => document.getElementById("anuncios").getAttribute("aria-live"))) === "polite", "región aria-live para anuncios");
  function lum(h) { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
  function contraste(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  const pares = { "blanco/negro": ["#ffffff", "#000000"], "amarillo/negro": ["#ffe74a", "#000000"], "gris/negro": ["#b8b8c8", "#000000"], "tenue/negro": ["#8a8aa0", "#000000"], "rojo/negro": ["#ff5a5a", "#000000"], "verde/negro": ["#7fe0a0", "#000000"], "naranja/negro": ["#ffb04a", "#000000"] };
  Object.entries(pares).forEach(([n, [a, b]]) => { const c = contraste(a, b); ok(c >= 4.5, "contraste " + n + " = " + c.toFixed(1) + ":1 (AA ≥ 4.5)"); });
  // reducir movimiento del sistema
  const rm = await contexto(browser, { reducedMotion: "reduce" });
  await rm.p.goto(BASE); await rm.p.waitForSelector("[data-acc='nueva']");
  ok(await rm.p.evaluate(() => document.body.classList.contains("calma")), "si el sistema pide reducir movimiento, se activa solo");
  await rm.ctx.close();

  /* 27-28 banco de preguntas y exportación */
  prueba("27 Importación del banco de preguntas");
  await abrirPausa(p); await p.click("[data-acc='banco']");
  await p.setInputFiles("#b-archivo", path.join(__dirname, "banco-invalido.json"));
  await p.waitForSelector("#vp-h");
  const txtInv = await p.textContent("#pantalla");
  ok(txtInv.includes("Válidos: 1") && txtInv.includes("Con errores: 3"), "archivo inválido: 1 válido y 3 con errores");
  ok(txtInv.includes("ya es un reto original"), "detecta id duplicado de un original");
  ok(txtInv.includes("opciones: deben ser exactamente 4") && txtInv.includes("correcta:") && txtInv.includes("categoria:"), "explica cada error");
  ok(txtInv.includes("id duplicado dentro del archivo"), "detecta id repetido dentro del archivo");
  await p.click("[data-acc='descartar']");
  await p.fill("#b-texto", "{ esto no es json"); await p.click("[data-acc='validar']"); await p.waitForSelector("#vp-h");
  ok((await p.textContent("#pantalla")).includes("no es JSON válido"), "texto mal formado: error claro");
  ok((await p.getAttribute("[data-acc='aplicar']", "aria-disabled")) === "true", "no se puede aplicar una importación inválida");
  await p.click("[data-acc='descartar']");
  ok((await idsRetos(p)).length === 16, "el banco no cambió con importaciones inválidas");
  await p.setInputFiles("#b-archivo", path.join(__dirname, "..", "bancos", "ejemplo-ampliacion.json")); await p.waitForSelector("#vp-h");
  ok((await p.textContent("#pantalla")).includes("Válidos: 3"), "vista previa: 3 retos válidos del ejemplo");
  await p.screenshot({ path: path.join(CAPT, "27-vista-previa.png"), fullPage: true });
  await p.click("[data-acc='aplicar']");
  ok((await idsRetos(p)).length === 19, "el banco pasa a 19 retos");
  ok(await p.evaluate(() => ["EJ-U4-1", "EJ-U3-1", "EJ-U9-1"].every((id) => __depurador.mundo.estaciones.some((o) => o.id === id && o.aux))), "cada reto importado tiene su terminal auxiliar en el mapa");
  ok((await p.evaluate(() => document.getElementById("st-fixed").textContent)).endsWith("/19"), "el HUD muestra el nuevo total");
  await p.keyboard.press("Escape"); await p.keyboard.press("Escape");
  await directo(p, "EJ-U3-1"); ok((await p.textContent("#t-titulo")) === "BUSCADOR DEL PORTAL", "la terminal auxiliar abre su reto");
  await responder(p, 0); ok((await est(p)).fixed["EJ-U3-1"], "el reto importado se puede resolver"); await salir(p);
  const ocupado = await p.evaluate(() => { const M = __depurador.mundo; return M.estaciones.filter((o) => o.aux).every((o) => M.junto(o).length > 0); });
  ok(ocupado, "las terminales auxiliares son accesibles");
  await invariantes(p, "con banco ampliado");
  prueba("28 Exportación de datos");
  await abrirPausa(p); await p.click("[data-acc='banco']");
  const [dl] = await Promise.all([p.waitForEvent("download"), p.click("[data-acc='exportar']")]);
  const banco = JSON.parse(fs.readFileSync(await dl.path(), "utf8"));
  ok(banco.formato === "depurador-tic-banco" && banco.retos.length === 19, "exporta el banco completo (19 retos)");
  ok(banco.retos.filter((r) => r.origen === "original").length === 16, "el banco exportado conserva los 16 originales");
  const re = B => B; // marcador
  await p.click("[data-acc='restaurar']"); await p.click("[data-acc='si']");
  ok((await idsRetos(p)).length === 16, "RESTAURAR vuelve al banco original");
  ok(!(await est(p)).fixed["EJ-U3-1"], "el progreso del reto quitado se elimina sin romper la partida");
  await p.keyboard.press("Escape"); await p.keyboard.press("Escape");
  await invariantes(p, "tras restaurar banco");

  /* 20-21 final y informe */
  prueba("20 Finalización de la partida y 21 informe final");
  const restantes = (await idsRetos(p)).filter(async () => true);
  for (const id of restantes) {
    if ((await est(p)).fixed[id]) continue;
    await directo(p, id); await responder(p, await correcta(p, id));
    const fin = await p.$("#t-informe"); if (fin) { await p.click("#t-informe"); break; }
    await salir(p);
  }
  await p.waitForSelector("#pantalla h2#pnl-titulo");
  ok((await p.textContent("#pnl-titulo")).startsWith("INFORME DE DESEMPEÑO") && !(await p.textContent("#pnl-titulo")).includes("PARCIAL"), "se muestra el Informe de Desempeño completo");
  const ef = await est(p), inf = await p.textContent("#pantalla");
  ok(Object.keys(ef.fixed).length === 16, "16 de 16 reparadas");
  ok(inf.includes("16/16") && inf.includes("PRECISIÓN") && inf.includes("REINICIOS") && inf.includes("DESEMPEÑO POR UNIDAD") && inf.includes("CONTENIDOS PARA REPASAR") && inf.includes("REGISTRO DEL RECORRIDO"), "el informe incluye todas las secciones");
  const intentos = Object.values(ef.tries).reduce((a, b) => a + b, 0);
  ok(inf.includes(Math.round(16 / intentos * 100) + "%"), "la precisión coincide con los intentos (" + Math.round(16 / intentos * 100) + "%)");
  ok(inf.includes("U1") && inf.includes("U9"), "desempeño por unidad");
  ok(inf.includes("Cajero automático") || inf.includes("Respuesta de IA"), "lista contenidos para repasar");
  await p.screenshot({ path: path.join(CAPT, "21-informe.png"), fullPage: true });
  await p.evaluate(() => { window.__impreso = 0; window.print = () => window.__impreso++; });
  await p.click("[data-acc='imprimir']"); ok((await p.evaluate(() => window.__impreso)) === 1, "IMPRIMIR llama a la impresión del navegador");
  const [dc] = await Promise.all([p.waitForEvent("download"), p.click("[data-acc='csv']")]);
  const csv = fs.readFileSync(await dc.path(), "utf8"); ok(csv.split("\n").length >= 18 && csv.includes("U1-1"), "CSV exportado con una fila por reto");
  const [dj] = await Promise.all([p.waitForEvent("download"), p.click("[data-acc='json']")]);
  const js = JSON.parse(fs.readFileSync(await dj.path(), "utf8")); ok(js.resueltas === 16 && js.retos.length === 16, "JSON exportado con resultados");
  await p.click("[data-acc='volver']"); await esperar(p, () => __depurador.modo() === "explorar");
  ok((await p.evaluate(() => __depurador.modo())) === "explorar", "se puede seguir explorando después del informe");
  const t1 = (await est(p)).ms; await sleep(1200); ok((await est(p)).ms === t1, "el tiempo se detiene al terminar");
  prueba("Recuperación de una partida terminada");
  await p.reload(); await p.waitForSelector("[data-acc='continuar']");
  ok((await p.textContent("[data-acc='continuar']")).includes("completada"), "el título indica partida completada");
  prueba("Nueva partida con confirmación");
  await p.click("[data-acc='nueva']"); ok(!!(await p.$("[data-acc='si']")), "pide confirmación");
  await p.click("[data-acc='no']"); ok(!!(await p.$("[data-acc='continuar']")), "NO conserva la partida");
  await p.click("[data-acc='nueva']"); await p.click("[data-acc='si']"); await esperar(p, () => __depurador.modo() === "dialogo"); await saltarDialogos(p);
  ok(Object.keys((await est(p)).fixed).length === 0 && (await est(p)).hp === 100, "SÍ inicia una partida limpia");
  prueba("Guardado dañado");
  await abrirPausa(p); await p.click("[data-acc='titulo']"); await p.waitForSelector("[data-acc='continuar']");
  await p.evaluate(() => localStorage.setItem("depurador-tic:partida", "{roto"));
  await p.reload(); await p.waitForSelector("[data-acc='nueva']");
  ok((await p.textContent("#pantalla")).includes("dañado"), "avisa que el guardado estaba dañado");
  ok(!(await p.$("[data-acc='continuar']")), "no ofrece continuar un guardado dañado");
  await p.evaluate(() => localStorage.setItem("depurador-tic:partida", JSON.stringify({ v: 3, hp: 999, res: 0, errores: 0, reinicios: 0, ms: 0 })));
  await p.reload(); await p.waitForSelector("[data-acc='nueva']");
  ok((await p.textContent("#pantalla")).includes("energía fuera de rango"), "detecta valores imposibles");
  await p.evaluate(() => localStorage.setItem("depurador-tic:partida", JSON.stringify({ v: 3, hp: 75, res: 999, errores: 0, reinicios: 0, ms: 5000, fixed: { "U1-1": true, "NO-EXISTE": true }, first: {}, tries: {}, burned: {} })));
  await p.reload(); await p.waitForSelector("[data-acc='continuar']"); await p.click("[data-acc='continuar']"); await esperar(p, () => __depurador.modo() === "explorar" || __depurador.modo() === "dialogo"); await saltarDialogos(p);
  const sane = await est(p); ok(!sane.fixed["NO-EXISTE"] && sane.fixed["U1-1"] && sane.tries["U1-1"] === 1, "descarta terminales inexistentes y completa datos faltantes");
  ok(sane.res === 100, "recalcula los recursos a partir del progreso real (999 → " + sane.res + ")");

  /* 29-30 móvil y resoluciones */
  await ctx.close();
  const vistas = [["29 Diseño móvil (390×844, táctil)", { width: 390, height: 844 }, true], ["30a Tablet (820×1180, táctil)", { width: 820, height: 1180 }, true], ["30b Portátil (1366×768)", { width: 1366, height: 768 }, false], ["30c Teléfono horizontal (844×390, táctil)", { width: 844, height: 390 }, true], ["30d Escritorio grande (1920×1080)", { width: 1920, height: 1080 }, false]];
  for (const [n, vp, tactil] of vistas) {
    prueba(n);
    const c = await contexto(browser, { viewport: vp, hasTouch: tactil, isMobile: tactil, deviceScaleFactor: tactil ? 3 : 1 });
    const q = c.p; await arrancar(q, { texto: "instantaneo" });
    ok((await q.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0, "sin desplazamiento horizontal en el título");
    if (tactil) await q.tap("[data-acc='nueva']"); else await q.click("[data-acc='nueva']");
    await esperar(q, () => __depurador.modo() === "dialogo");
    if (tactil) { for (let i = 0; i < 20 && (await modo(q)) === "dialogo"; i++) await q.tap("#tb-a"); }
    else await saltarDialogos(q);
    ok((await modo(q)) === "explorar", "el diálogo se avanza con " + (tactil ? "el botón USAR" : "teclado"));
    ok((await q.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0, "sin desplazamiento horizontal en el mapa");
    const v = await q.evaluate(() => __depurador.vista()); ok(v.vw >= 200 && v.vh >= 150, "el escenario muestra " + v.vw + "×" + v.vh + " px de mundo a escala ×" + v.escala);
    const cvr = await q.evaluate(() => { const r = document.getElementById("mundo").getBoundingClientRect(); return { top: r.top, bottom: r.bottom, h: innerHeight }; });
    ok(cvr.bottom <= cvr.h + 1, "el escenario entra en la pantalla");
    if (tactil) {
      ok(await q.isVisible(".tactil"), "controles táctiles visibles");
      const a = await q.evaluate(() => __depurador.jugador().x);
      await q.dispatchEvent('.cruz [data-d="izq"]', "pointerdown"); await sleep(500); await q.dispatchEvent('.cruz [data-d="izq"]', "pointerup");
      ok((await q.evaluate(() => __depurador.jugador().x)) < a, "la cruceta táctil mueve al personaje");
      // tocar a BORNE para hablar
      const jb2 = await q.evaluate(() => { const o = __depurador.mundo.personajes.find((n) => n.id === "borne"); return { x: (o.tx + 0.5) * 16, y: (o.ty + 0.5) * 16 }; });
      const cc = await q.evaluate(([x, y]) => { const vv = __depurador.vista(), cv = document.getElementById("mundo"), r = cv.getBoundingClientRect(); return { x: r.left + (x - vv.cam.x) * r.width / (cv.width / vv.escala), y: r.top + (y - vv.cam.y) * r.height / (cv.height / vv.escala) }; }, [jb2.x, jb2.y - 4]);
      if (cc.x > 0 && cc.x < vp.width && cc.y > 0 && cc.y < vp.height) { await q.touchscreen.tap(cc.x, cc.y); ok(await esperar(q, () => __depurador.modo() === "dialogo", null, 9000), "tocar a un personaje camina hasta él y habla"); for (let i = 0; i < 20 && (await modo(q)) === "dialogo"; i++) await q.tap("#tb-a"); }
      await q.tap("#tb-b"); await q.waitForSelector("[data-acc='directo']"); await q.tap("[data-acc='directo']"); await q.tap('[data-ir="U9-2"]'); await q.waitForSelector("#t-ops:not(.esperando)");
      ok((await q.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0, "terminal sin desplazamiento horizontal");
      const cr = await q.evaluate(() => __depurador.retos().find((r) => r.id === "U9-2").correcta);
      await q.tap(`.op[data-i="${cr}"]`); await q.tap(`.op[data-i="${cr}"]`); await q.waitForSelector("#t-res-h");
      ok((await est(q)).fixed["U9-2"], "se responde tocando (seleccionar + confirmar)");
      await q.screenshot({ path: path.join(CAPT, n.slice(0, 3).trim() + "-terminal.png"), fullPage: false });
      await q.tap("#t-volver"); await esperar(q, () => __depurador.modo() === "explorar");
    }
    await sleep(300); await q.screenshot({ path: path.join(CAPT, n.slice(0, 3).trim() + "-mapa.png") });
    ok(c.p._errores.length === 0, "sin errores de consola " + c.p._errores.join(" | "));
    await c.ctx.close();
  }
  prueba("30e Cambio de resolución en plena partida");
  ({ ctx, p } = await contexto(browser));
  await arrancar(p, RAPIDO); await nueva(p);
  for (const vp of [{ width: 390, height: 844 }, { width: 1024, height: 768 }, { width: 700, height: 500 }, { width: 1280, height: 860 }]) {
    await p.setViewportSize(vp); await sleep(250);
    const v = await p.evaluate(() => __depurador.vista());
    ok(v.vw > 0 && (await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0, vp.width + "×" + vp.height + ": vista " + v.vw + "×" + v.vh + " ×" + v.escala);
  }
  await mantener(p, "ArrowRight", 300); ok((await modo(p)) === "explorar", "el juego sigue operativo tras los cambios de tamaño");

  /* Regresión contra la versión anterior (juego.html v2) */
  prueba("Regresión: correspondencia con DEPURADOR TIC v2");
  const anterior = process.env.ANTERIOR || "/home/claude/depurador-tic/juego.html";
  if (fs.existsSync(anterior)) {
    const src = fs.readFileSync(anterior, "utf8");
    const viejo = {}; const re2 = /"(U\d-\d)":\s*\{\s*sector:\s*"(\w+)",.*?nombre:\s*"([^"]+)",\s*log:\s*"([^"]+)"/g; let m;
    while ((m = re2.exec(src))) viejo[m[1]] = { sector: m[2], nombre: m[3], log: m[4] };
    const nuevo = await p.evaluate(() => __depurador.mundo.TERMINALES);
    const ids = Object.keys(viejo);
    ok(ids.length === 16, "la versión anterior tenía 16 terminales");
    ok(ids.every((id) => nuevo[id] && nuevo[id].sector === viejo[id].sector && nuevo[id].nombre === viejo[id].nombre && nuevo[id].log === viejo[id].log), "las 16 terminales conservan id, sector, nombre y falla");
    ok(/state\.hp - 25/.test(src) && /gain = state\.tries\[cur\.id\] === 1 \? 100 : 50/.test(src), "la versión anterior usaba −25 de energía y +100/+50: se mantienen (pruebas 13 y 17)");
    const retosViejos = fs.readFileSync(path.join(path.dirname(anterior), "retos.js"), "utf8"), retosNuevos = fs.readFileSync(path.join(__dirname, "..", "js", "retos.js"), "utf8");
    ok(retosViejos === retosNuevos, "retos.js es idéntico al original (16 preguntas, alternativas, respuestas, retroalimentación y fuentes)");
  } else nota("No se encontró la versión anterior en " + anterior + "; se omite la comparación de archivos.");
  const cats = await p.evaluate(() => __depurador.mundo.ORDEN.map((k) => __depurador.mundo.SECTORES[k].nombre));
  ok(cats.join("|") === "Núcleo de Procesamiento|Subred de Búsqueda|Núcleo de Virtualización|Terminal de Archivos|Servidor Compartido|Archivo de Referencias", "los seis sectores conservan sus nombres");
  ok(p._errores.length === 0, "sin errores de consola: " + p._errores.join(" | "));
  await ctx.close();

  /* ===================== 100 ciclos ===================== */
  const ESCENARIOS = ["sin_errores", "multiples_errores", "abandono_reapertura", "energia_agotada", "recuperacion", "guardado_danado", "banco_ampliado", "importacion_invalida", "cambio_resolucion", "raton_y_teclado"];
  const ciclos = [];
  ({ ctx, p } = await contexto(browser));
  let semilla = 12345; const azar = () => ((semilla = (semilla * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let n = 0; n < CICLOS; n++) {
    const esc = ESCENARIOS[n % ESCENARIOS.length];
    prueba("Ciclo " + String(n + 1).padStart(3, "0") + " · " + esc);
    const t = Date.now(); p._errores.length = 0;
    try {
      const calma = n % 3 !== 0;
      await arrancar(p, { texto: n % 4 === 0 ? "rapido" : "instantaneo", calma, musica: 0, efectos: n % 5 === 0 ? 40 : 0 });
      await nueva(p);
      const ids = await idsRetos(p);
      const jugar = async (id, errores, via) => {
        await directo(p, id); const c = await correcta(p, id);
        const malas = [0, 1, 2, 3].filter((k) => k !== c).sort(() => azar() - 0.5).slice(0, errores);
        for (const k of malas) { if ((await est(p)).hp <= 25 && esc !== "energia_agotada") break; await responder(p, k, via); if ((await est(p)).hp === 0) return "muerto"; }
        await responder(p, c, via); await salir(p); return "ok";
      };
      if (esc === "sin_errores" || esc === "raton_y_teclado") {
        for (const id of ids) { await jugar(id, 0, esc === "raton_y_teclado" && azar() < 0.5 ? "raton" : "teclado"); if ((await pila(p)).includes("informe")) break; }
        await esperar(p, () => __depurador.pila().includes("informe"), null, 4000);
        ok((await pila(p)).includes("informe"), "termina con el informe");
        const e = await est(p); ok(Object.keys(e.fixed).length === 16 && e.errores === 0 && e.res === 1600, "16/16 sin errores y 1600 recursos");
      } else if (esc === "multiples_errores") {
        const elegidos = ids.slice().sort(() => azar() - 0.5).slice(0, 6);
        for (const id of elegidos) { await jugar(id, 1, "teclado"); await invariantes(p, id); }
        const e = await est(p); ok(e.errores === 3 && e.hp === 25 && elegidos.every((id) => e.fixed[id]), "3 errores (la energía no baja de 25 sin reinicio), 6 terminales reparadas");
      } else if (esc === "abandono_reapertura") {
        const id = ids[Math.floor(azar() * ids.length)]; await directo(p, id); const c = await correcta(p, id); const m1 = (c + 1) % 4;
        await responder(p, m1); await salir(p);
        for (let k = 0; k < 3; k++) { await directo(p, id); ok(await p.evaluate((i) => document.querySelector(`.op[data-i="${i}"]`).classList.contains("quemada"), m1), "reapertura " + (k + 1) + ": la opción fallida sigue deshabilitada"); await salir(p); }
        const e = await est(p); ok(e.hp === 75 && e.errores === 1 && !e.fixed[id], "abandonar no cambia energía ni errores");
        ok(e.trail.filter((x) => x.ev === "leave" && x.id === id).length === 4, "cada abandono queda en el registro");
      } else if (esc === "energia_agotada") {
        const a = ids[Math.floor(azar() * 8)], b = ids[8 + Math.floor(azar() * 8)];
        await jugar(a, 3, "teclado"); const r = await jugar(b, 3, "teclado");
        ok(r === "muerto", "la energía se agota al cuarto error");
        await p.click("#t-reinicio"); await p.click("[data-acc='reiniciar']"); await esperar(p, () => __depurador.modo() === "explorar");
        const e = await est(p); ok(e.hp === 100 && e.reinicios === 1 && e.fixed[a] && !e.fixed[b], "reinicio correcto y reparaciones intactas");
        await jugar(b, 0, "teclado"); ok((await est(p)).fixed[b], "se puede reparar la terminal después del reinicio");
      } else if (esc === "recuperacion") {
        const k = 2 + Math.floor(azar() * 10);
        for (const id of ids.slice(0, k)) await jugar(id, azar() < 0.3 ? 1 : 0, "teclado");
        const antes = await est(p);
        await p.reload(); await p.click("[data-acc='continuar']"); await esperar(p, () => __depurador.modo() === "explorar");
        const desp = await est(p);
        ok(JSON.stringify([antes.fixed, antes.burned, antes.hp, antes.res, antes.errores]) === JSON.stringify([desp.fixed, desp.burned, desp.hp, desp.res, desp.errores]), "estado idéntico tras recargar (" + k + " reparadas)");
      } else if (esc === "guardado_danado") {
        await jugar(ids[0], 0, "teclado");
        await abrirPausa(p); await p.click("[data-acc='titulo']"); await p.waitForSelector("[data-acc='continuar']");
        const daños = ["{", "null", JSON.stringify({ v: 2 }), JSON.stringify({ v: 3, hp: 30, res: 0, errores: 0, reinicios: 0, ms: 0 }), JSON.stringify({ v: 3, hp: 50, res: -1, errores: 0, reinicios: 0, ms: 0 }), JSON.stringify({ v: 3, hp: 50, res: 0, errores: 0, reinicios: 0, ms: 0, fixed: [] })];
        const d = daños[Math.floor(azar() * daños.length)];
        await p.evaluate((x) => localStorage.setItem("depurador-tic:partida", x), d);
        await p.reload(); await p.waitForSelector("[data-acc='nueva']");
        const hayCont = !!(await p.$("[data-acc='continuar']"));
        if (d === "null") ok(!hayCont, "un guardado «null» se ignora"); else ok(!hayCont && (await p.textContent("#pantalla")).includes("dañado"), "guardado dañado descartado con aviso: " + d.slice(0, 40));
        await nueva(p); ok((await modo(p)) === "explorar", "se puede empezar de nuevo");
      } else if (esc === "banco_ampliado") {
        await abrirPausa(p); await p.click("[data-acc='banco']");
        await p.setInputFiles("#b-archivo", path.join(__dirname, "..", "bancos", "ejemplo-ampliacion.json")); await p.waitForSelector("#vp-h"); await p.click("[data-acc='aplicar']");
        await p.keyboard.press("Escape"); await p.keyboard.press("Escape");
        const todos = await idsRetos(p); ok(todos.length === 19, "19 retos con el banco ampliado");
        for (const id of todos) { await jugar(id, azar() < 0.15 ? 1 : 0, "teclado"); if ((await pila(p)).includes("informe")) break; }
        await esperar(p, () => __depurador.pila().includes("informe"), null, 4000);
        ok(Object.keys((await est(p)).fixed).length === 19 && (await pila(p)).includes("informe"), "se completan los 19 y aparece el informe");
        await invariantes(p, "banco ampliado");
        await p.evaluate(() => localStorage.removeItem("depurador-tic:banco-extra"));
      } else if (esc === "importacion_invalida") {
        await abrirPausa(p); await p.click("[data-acc='banco']");
        const malos = ["[]", "{\"retos\": 5}", "{\"retos\": [{\"id\": \"x\"}]}", "{,}", JSON.stringify({ retos: [{ id: "Z1", unidad: "U1", categoria: "fund", pregunta: "Pregunta de prueba larga", opciones: ["a", "b", "c", "d"], correcta: 4, retro: "Explicación suficiente", fuente: "QA" }] })];
        const m = malos[Math.floor(azar() * malos.length)];
        await p.fill("#b-texto", m); await p.click("[data-acc='validar']"); await p.waitForSelector("#vp-h");
        ok((await p.getAttribute("[data-acc='aplicar']", "aria-disabled")) === "true", "no se puede aplicar: " + m.slice(0, 40));
        await p.click("[data-acc='aplicar']", { force: true }); ok((await idsRetos(p)).length === 16, "el banco queda intacto");
        await p.keyboard.press("Escape"); await p.keyboard.press("Escape");
      } else if (esc === "cambio_resolucion") {
        const vps = [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1280, height: 860 }];
        for (const [i, id] of ids.slice(0, 3).entries()) { await p.setViewportSize(vps[i]); await sleep(120); await jugar(id, 0, "teclado"); ok((await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0, "sin desborde a " + vps[i].width + "px"); }
        await p.setViewportSize({ width: 1280, height: 860 });
      }
      await invariantes(p, "fin de ciclo");
      ok(p._errores.length === 0, "sin errores de consola " + p._errores.join(" | "));
    } catch (err) {
      ok(false, "excepción: " + err.message.split("\n")[0]);
      try { await p.screenshot({ path: path.join(CAPT, "falla-ciclo-" + (n + 1) + ".png") }); } catch (e) {}
      await ctx.close(); ({ ctx, p } = await contexto(browser));
    }
    ciclos.push({ n: n + 1, escenario: esc, ok: actual.ok, ms: Date.now() - t });
  }
  await ctx.close(); await browser.close();

  const fallas = resultados.filter((r) => !r.ok);
  const resumen = { fecha: new Date().toISOString(), url: BASE, duracion_s: Math.round((Date.now() - t0) / 1000), pruebas: resultados.length, aprobadas: resultados.length - fallas.length, fallidas: fallas.length, ciclos: { total: ciclos.length, aprobados: ciclos.filter((c) => c.ok).length, por_escenario: ESCENARIOS.map((e) => ({ escenario: e, total: ciclos.filter((c) => c.escenario === e).length, aprobados: ciclos.filter((c) => c.escenario === e && c.ok).length })) }, resultados };
  fs.writeFileSync(path.join(__dirname, "resultados-qa.json"), JSON.stringify(resumen, null, 2));
  console.log(`Pruebas: ${resumen.aprobadas}/${resumen.pruebas} aprobadas · ciclos ${resumen.ciclos.aprobados}/${resumen.ciclos.total} · ${resumen.duracion_s}s`);
  fallas.forEach((f) => console.log("✗ " + f.nombre + "\n   " + f.detalles.filter((d) => d.startsWith("FALLA")).join("\n   ")));
  process.exit(fallas.length ? 1 : 0);
})();
