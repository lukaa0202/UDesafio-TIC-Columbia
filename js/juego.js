/* DEPURADOR TIC · juego.js — motor del juego: estado, dibujo, entrada, diálogos, terminales, menús, guardado e informe. */
(function () {
  "use strict";
  var M = window.MUNDO, A = window.ARTE, S = window.SONIDO, B = window.BANCO, G = window.GUARDADO, DL = window.DIALOGOS;
  var T = M.T, VERSION = "3.0.1";
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function mmss(ms) { var s = Math.floor(ms / 1000); return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0"); }
  var LETRAS = "ABCD";

  /* =========================================================== ajustes */
  var AJ_CLAVE = "depurador-tic:ajustes";
  var sistemaReducido = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var tactilAuto = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  var aj = { musica: 50, efectos: 70, calma: sistemaReducido, texto: "normal", grande: false, legible: false, tactil: "auto" };
  try { var g0 = JSON.parse(localStorage.getItem(AJ_CLAVE) || "null"); if (g0 && typeof g0 === "object") Object.keys(aj).forEach(function (k) { if (typeof g0[k] === typeof aj[k]) aj[k] = g0[k]; }); } catch (e) {}
  if (sistemaReducido) aj.calma = true;
  function aplicarAjustes(guardar) {
    aj.musica = Math.max(0, Math.min(100, Math.round(aj.musica))); aj.efectos = Math.max(0, Math.min(100, Math.round(aj.efectos)));
    if (["normal", "rapido", "instantaneo"].indexOf(aj.texto) < 0) aj.texto = "normal";
    if (["auto", "si", "no"].indexOf(aj.tactil) < 0) aj.tactil = "auto";
    document.body.classList.toggle("calma", !!aj.calma);
    document.body.classList.toggle("texto-grande", !!aj.grande);
    document.body.classList.toggle("legible", !!aj.legible);
    document.body.classList.toggle("con-tactil", aj.tactil === "si" || (aj.tactil === "auto" && tactilAuto));
    S.volumen("musica", aj.musica / 100); S.volumen("efectos", aj.efectos / 100);
    if (guardar) try { localStorage.setItem(AJ_CLAVE, JSON.stringify(aj)); } catch (e) {}
    ajustarVista();
  }
  document.documentElement.style.setProperty("--corazon", "url(" + A.corazonURL() + ")");

  /* =========================================================== banco y terminales */
  var RETOS = [], avisos = [];
  function prepararBanco() {
    var info = B.cargar();
    if (info.descartados) avisos.push("Se descartaron " + info.descartados + " retos importados que estaban dañados.");
    var sinLugar = M.colocarAuxiliares(B.extras());
    sinLugar.forEach(function (id) { B.quitar(id); });
    RETOS = B.todos().filter(function (r) { return !!estacionDe(r.id); });
  }
  function retoDe(id) { for (var i = 0; i < RETOS.length; i++) if (RETOS[i].id === id) return RETOS[i]; return null; }
  function estacionDe(id) { for (var i = 0; i < M.estaciones.length; i++) if (M.estaciones[i].id === id) return M.estaciones[i]; return null; }
  function ids() { return RETOS.map(function (r) { return r.id; }); }

  /* =========================================================== estado de la partida */
  var E = G.nuevo();
  var jugador = { x: M.inicio.x, y: M.inicio.y, dir: "abajo", tiempoPaso: 0, cuadro: 0, ruta: null, objetivo: null };
  var modo = "titulo", zonaActual = "hall", zonaCamara = "hall";
  var avisoGuardado = null;
  function reparadas() { return RETOS.filter(function (r) { return E.fixed[r.id]; }).length; }
  function terminado() { return RETOS.length > 0 && reparadas() === RETOS.length; }
  function segundos() { return Math.floor(E.ms / 1000); }
  function infoSector(k) {
    var lista = M.estaciones.filter(function (o) { return o.zona === k && retoDe(o.id); }), ok = lista.filter(function (o) { return E.fixed[o.id]; }).length;
    return { nombre: M.SECTORES[k].nombre, reparadas: ok, total: lista.length, estable: lista.length > 0 && ok === lista.length, arriba: M.SECTORES[k].fila === 0 };
  }
  function progreso(charlas) {
    var p = { reparadas: reparadas(), total: RETOS.length, sector: {}, orden: M.ORDEN, charlas: charlas || 0, categoria: B.categoria };
    M.ORDEN.forEach(function (k) { p.sector[k] = infoSector(k); });
    return p;
  }
  function zonaEstable(z) { if (z === "hall") return true; var i = infoSector(z); return i.estable; }
  function colocarJugador(x, y, dir) { jugador.x = x; jugador.y = y; if (dir) jugador.dir = dir; jugador.ruta = null; jugador.objetivo = null; zonaActual = zonaCamara = M.zonaEn(x, y - 2) || "hall"; }
  function guardarAhora() {
    if (modo === "titulo" && !E._enJuego) return false;
    E.pj = { x: Math.round(jugador.x), y: Math.round(jugador.y), dir: jugador.dir };
    E.terminado = terminado();
    var c = {}; Object.keys(E).forEach(function (k) { if (k[0] !== "_") c[k] = E[k]; });
    return G.guardar(c);
  }
  function cargarPartida() {
    var res = G.cargar(ids());
    if (!res) return false;
    if (res.error) { avisoGuardado = res.error; return false; }
    E = res.estado; E._enJuego = true;
    var p = E.pj;
    if (p && M.libre(p.x, p.y)) colocarJugador(p.x, p.y, p.dir); else colocarJugador(M.inicio.x, M.inicio.y, "abajo");
    return true;
  }
  function nuevaPartida() {
    G.borrar(); E = G.nuevo(); E._enJuego = true;
    colocarJugador(M.inicio.x, M.inicio.y, "abajo");
    particulas = []; flotantes = [];
    guardarAhora(); actualizarHUD();
  }

  /* =========================================================== vista y cámara */
  var cv = $("mundo"), cx = cv.getContext("2d");
  var escala = 3, vw = 320, vh = 240;
  function ajustarVista() {
    var r = cv.getBoundingClientRect(); if (!r.width) return;
    var dpr = window.devicePixelRatio || 1, dw = Math.max(1, Math.round(r.width * dpr)), dh = Math.max(1, Math.round(r.height * dpr));
    escala = dw < dh * 1.15 ? Math.max(1, Math.floor(Math.min(dw / 220, dh / 170))) : Math.max(1, Math.floor(Math.min(dw / 320, dh / 216)));
    if (cv.width !== dw || cv.height !== dh) { cv.width = dw; cv.height = dh; }
    vw = Math.ceil(dw / escala); vh = Math.ceil(dh / escala);
  }
  if (window.ResizeObserver) new ResizeObserver(function () { ajustarVista(); }).observe(cv); else window.addEventListener("resize", ajustarVista);
  var cam = { x: 0, y: 0 };
  function calcularCamara() {
    var b = M.limites(zonaCamara);
    cam.x = b.w <= vw ? b.x - Math.floor((vw - b.w) / 2) : Math.max(b.x, Math.min(b.x + b.w - vw, Math.round(jugador.x - vw / 2)));
    cam.y = b.h <= vh ? b.y - Math.floor((vh - b.h) / 2) : Math.max(b.y, Math.min(b.y + b.h - vh, Math.round(jugador.y - 8 - vh / 2)));
  }

  /* =========================================================== mundo estático (pre-render) */
  var estatico = A.lienzo(M.W * T, M.H * T), PLANOS = ["cables", "rejilla"];
  var ADORNO_DINAMICO = ["lamparaPared", "reloj", "pantallaGrande"];
  var adornosDin = [];
  function filaPared(z, ty) { var y0 = z === "hall" ? M.HALL.y : M.SECTORES[z].y; return ty === y0 - 2 ? 0 : 1; }
  function construirEstatico() {
    var c = estatico.getContext("2d"); c.clearRect(0, 0, estatico.width, estatico.height);
    for (var ty = 0; ty < M.H; ty++) for (var tx = 0; tx < M.W; tx++) {
      var t = M.celda[ty][tx], z = M.zona[ty][tx], x = tx * T, y = ty * T; if (!t) continue;
      var tema = A.TEMAS[z];
      if (t === 1) {
        tema.piso(c, x, y, tx, ty);
        var esPuerta = z && ((z === "hall" && (ty === M.HALL.y - 2 || ty === M.HALL.y - 1)) || (z !== "hall" && (ty === M.SECTORES[z].y - 2 || ty === M.SECTORES[z].y - 1)));
        if (esPuerta) { var fila = filaPared(z, ty); c.fillStyle = fila === 0 ? "rgba(0,0,0,.55)" : "rgba(0,0,0,.28)"; c.fillRect(x, y, T, T); }
        if (!M.esPiso(tx - 1, ty)) A.rect(c, tema.borde, x, y, 2, T);
        if (!M.esPiso(tx + 1, ty)) A.rect(c, tema.borde, x + T - 2, y, 2, T);
        if (!M.esPiso(tx, ty + 1)) { A.rect(c, tema.borde, x, y + T - 2, T, 2); A.rect(c, "rgba(0,0,0,.35)", x, y + T - 4, T, 2); }
        if (ty > 0 && M.celda[ty - 1][tx] === 2) A.rect(c, "rgba(0,0,0,.30)", x, y, T, 3);
      } else if (t === 2) {
        tema.pared(c, x, y, tx, filaPared(z, ty));
        if (tx > 0 && !M.celda[ty][tx - 1]) A.rect(c, A.tono(tema.borde, -0.2), x, y, 2, T);
        if (tx < M.W - 1 && !M.celda[ty][tx + 1]) A.rect(c, A.tono(tema.borde, -0.2), x + T - 2, y, 2, T);
        if (tx > 0 && M.celda[ty][tx - 1] === 1) A.rect(c, "rgba(0,0,0,.45)", x, y, 2, T);
        if (tx < M.W - 1 && M.celda[ty][tx + 1] === 1) A.rect(c, "rgba(0,0,0,.45)", x + T - 2, y, 2, T);
      }
    }
    // alfombras y objetos planos
    M.ORDEN.forEach(function (k) {
      M.ALFOMBRAS[k].forEach(function (a) { var p = M.interior(k, a[1], a[2]); A.alfombra(c, a[0], p.x * T, p.y * T, a[3], a[4]); });
    });
    A.alfombra(c, "pasillo", M.HALL.x * T, (M.HALL.y + 1) * T + 8, M.HALL.w, 2);
    M.objetos.forEach(function (o) { if (o.clase === "decor" && PLANOS.indexOf(o.tipo) >= 0) { var img = A.objeto(o.tipo); c.drawImage(img, o.tx * T + Math.floor((o.w * T - img.width) / 2), (o.ty + o.h) * T - img.height); } });
    // adornos de pared
    adornosDin = [];
    M.ORDEN.forEach(function (k) {
      var s = M.SECTORES[k];
      M.ADORNOS[k].forEach(function (a) {
        var x = (s.x + a[1]) * T, y = (s.y - 2 + a[2]) * T, opt = a[3] || {};
        if (ADORNO_DINAMICO.indexOf(a[0]) >= 0) { adornosDin.push({ tipo: a[0], x: x, y: y, zona: k, opt: opt }); return; }
        if (A.OBJ[a[0]]) { var img = A.objeto(a[0]); c.drawImage(img, x, y + 4); } else A.adorno(c, a[0], x, y, opt);
      });
    });
    // vestíbulo: ventanas, placas de sector y lámparas
    var hy = M.HALL.y - 2, puertas = [];
    M.ORDEN.forEach(function (k) { var s = M.SECTORES[k]; if (s.fila === 0) puertas.push(s.puerta, s.puerta + 1); });
    [5, 18, 38, 47, 58].forEach(function (ix) { A.adorno(c, "ventana", (M.HALL.x + ix) * T, hy * T); });
    M.ORDEN.forEach(function (k) { var s = M.SECTORES[k]; if (s.fila === 0) A.adorno(c, "placa", (s.puerta - 1) * T, (hy + 1) * T, { color: A.TEMAS[k].acento, icono: A.icono(k, A.TEMAS[k].acento) }); });
    A.adorno(c, "cartel", M.cartelera.tx * T, M.cartelera.ty * T);
    [2, 12, 22, 34, 44, 54, 61].forEach(function (ix) { var tx = M.HALL.x + ix; if (puertas.indexOf(tx) < 0 && puertas.indexOf(tx + 1) < 0) adornosDin.push({ tipo: "lamparaPared", x: tx * T, y: (hy + 1) * T, zona: "hall", opt: { luz: 1 } }); });
  }

  /* =========================================================== dibujo por cuadro */
  var particulas = [], flotantes = [], efecto = null, fundido = 0, reloj = 0;
  function cuadroAnim() { return aj.calma ? 0 : Math.floor(reloj / 0.4); }
  function dibujarImg(img, x, y) { cx.drawImage(img, Math.round(x - cam.x), Math.round(y - cam.y)); }
  function rectMundo(col, x, y, w, h) { cx.fillStyle = col; cx.fillRect(Math.round(x - cam.x), Math.round(y - cam.y), w, h); }
  function sombra(x, y, w) { rectMundo("rgba(0,0,0,.35)", x - w / 2 + 1, y - 1, w - 2, 1); rectMundo("rgba(0,0,0,.35)", x - w / 2, y, w, 2); rectMundo("rgba(0,0,0,.35)", x - w / 2 + 1, y + 2, w - 2, 1); }
  function caraNPC(id) { var z = M.personajes.filter(function (n) { return n.id === id; })[0].zona; if (z === "hall") return terminado() ? "feliz" : (reparadas() ? "neutral" : "preocupado"); var i = infoSector(z); return i.estable ? "feliz" : (i.reparadas ? "neutral" : "preocupado"); }
  function dibujarObjeto(o, fa) {
    var img, bx = o.tx * T, by = (o.ty + o.h) * T, w = o.w * T;
    if (o.clase === "decor") {
      if (PLANOS.indexOf(o.tipo) >= 0) return;
      img = A.objeto(o.tipo, { s: o.opt.s, fr: o.animado ? fa : 0, luz: o.opt.luz || (o.tipo === "mesaLectura" && zonaEstable(o.zona)) });
      dibujarImg(img, bx + Math.floor((w - img.width) / 2), by - img.height + 1);
    } else if (o.clase === "terminal") {
      var ok = !!E.fixed[o.id];
      img = A.objeto(o.tipo, { est: ok ? "ok" : "pend", fr: ok ? 0 : fa % 2, color: o.aux ? A.TEMAS[o.zona].acento : null });
      dibujarImg(img, bx + Math.floor((w - img.width) / 2), by - img.height + 1);
    } else if (o.clase === "npc") {
      var cara = (o.id === "cookie" && !zonaEstable("busq") && !E.charlas.cookie) ? "neutral" : caraNPC(o.id);
      if (o.id === "cookie" && zonaEstable("busq")) cara = "neutral";
      img = A.spriteNPC(o.id, cara, fa);
      var alzado = o.sobre === "router" ? 7 : o.sobre === "percha" ? 12 : 0, bob = o.flota && !aj.calma ? Math.round(Math.sin(reloj * 2.4) * 1.5) : 0;
      if (o.flota) sombra(bx + w / 2, by - 2, 12);
      else if (!o.sobre) sombra(bx + w / 2, by - 2, 12);
      dibujarImg(img, bx + Math.floor((w - img.width) / 2), by - img.height + 1 - alzado - (o.flota ? 6 : 0) + bob);
    }
  }
  function dibujarJugador() {
    var img = A.spritePJ(jugador.dir, jugador.cuadro);
    sombra(jugador.x, jugador.y - 1, 12);
    dibujarImg(img, jugador.x - img.width / 2, jugador.y - img.height + 2);
  }
  // luz en escalones de 2 px (elipse pixelada, sin suavizado)
  function luz(x, y, col, radio, a) {
    cx.globalCompositeOperation = "lighter"; cx.fillStyle = col;
    var X = Math.round(x - cam.x), Y = Math.round(y - cam.y);
    for (var i = 3; i >= 1; i--) {
      cx.globalAlpha = a; var rr = Math.round(radio * i / 3), ry = Math.round(rr * 0.5);
      for (var dy = -ry; dy < ry; dy += 2) { var w = Math.round(rr * Math.sqrt(1 - Math.pow((dy + 1) / ry, 2))) * 2; w -= w % 2; cx.fillRect(X - w / 2, Y + dy, w, 2); }
    }
    cx.globalAlpha = 1; cx.globalCompositeOperation = "source-over";
  }
  function dibujar() {
    cx.setTransform(escala, 0, 0, escala, 0, 0); cx.imageSmoothingEnabled = false;
    cx.fillStyle = "#000"; cx.fillRect(0, 0, vw, vh);
    if (!E._enJuego) return;
    calcularCamara();
    var fa = cuadroAnim();
    var sx = Math.max(0, cam.x), sy = Math.max(0, cam.y), sw = Math.min(estatico.width - sx, vw - (sx - cam.x)), sh = Math.min(estatico.height - sy, vh - (sy - cam.y));
    if (sw > 0 && sh > 0) cx.drawImage(estatico, sx, sy, sw, sh, sx - cam.x, sy - cam.y, sw, sh);
    // adornos dinámicos de pared
    adornosDin.forEach(function (a) {
      if (a.x - cam.x > vw + 32 || a.x - cam.x < -48) return;
      var est = zonaEstable(a.zona);
      if (a.tipo === "lamparaPared") A.adorno(cx, a.tipo, a.x - cam.x, a.y - cam.y, { luz: est });
      else if (a.tipo === "reloj") A.adorno(cx, a.tipo, a.x - cam.x, a.y - cam.y, { fr: aj.calma ? 0 : Math.floor(reloj / 0.6) });
      else A.adorno(cx, a.tipo, a.x - cam.x, a.y - cam.y, { luz: est });
    });
    // íconos de sector en los carteles del vestíbulo
    // objetos ordenados por profundidad
    var lista = [];
    M.objetos.forEach(function (o) {
      if (o.clase === "pared") return;
      var x = o.tx * T - cam.x, y = o.ty * T - cam.y;
      if (x > vw + 48 || x < -64 || y > vh + 48 || y < -64) return;
      lista.push({ k: (o.ty + o.h) * T + (o.clase === "npc" && o.sobre ? 0.5 : 0), o: o });
    });
    lista.push({ k: jugador.y + 0.1, j: true });
    lista.sort(function (a, b) { return a.k - b.k; });
    lista.forEach(function (it) { if (it.j) dibujarJugador(); else dibujarObjeto(it.o, fa); });
    M.objetos.forEach(function (o) { if (o.info === "cartel") { var ic = A.icono(o.sector, A.TEMAS[o.sector].acento); cx.drawImage(ic, Math.round(o.tx * T + 2 - cam.x), Math.round((o.ty + 1) * T - 26 - cam.y), 12, 9); } });
    // ambiente: penumbra en salas con fallas, luces en salas estables, alarma en terminales
    M.ORDEN.forEach(function (k) {
      var b = M.limites(k), i = infoSector(k);
      if (b.x - cam.x > vw || b.x + b.w - cam.x < 0 || b.y - cam.y > vh || b.y + b.h - cam.y < 0) return;
      var s = M.SECTORES[k], rx = (s.x - 1) * T, ry = (s.y - 2) * T, rw = (M.IW + 2) * T, rh = (M.IH + 3) * T;
      if (!i.estable && i.total) { cx.fillStyle = "rgba(6,4,20," + (0.18 + 0.24 * (1 - i.reparadas / i.total)).toFixed(3) + ")"; cx.fillRect(Math.round(rx - cam.x), Math.round(ry - cam.y), rw, rh); }
    });
    adornosDin.forEach(function (a) { if (a.tipo === "lamparaPared" && zonaEstable(a.zona)) luz(a.x + 8, a.y + 22, A.TEMAS[a.zona].luz, 26, 0.022); });
    M.objetos.forEach(function (o) { if (o.clase === "decor" && (o.tipo === "lampara" || o.tipo === "mesaLectura") && zonaEstable(o.zona)) luz(o.tx * T + o.w * T / 2, (o.ty + 1) * T - 4, A.TEMAS[o.zona].luz, 34, 0.045); });
    M.estaciones.forEach(function (o) {
      if (E.fixed[o.id] || !retoDe(o.id)) return;
      var p = aj.calma ? 0.5 : 0.5 + 0.5 * Math.sin(reloj * 4 + o.tx);
      luz(o.cx, o.cy - 6, "#ff3b2b", 18, 0.03 + 0.03 * p);
    });
    // partículas y textos flotantes
    particulas.forEach(function (p) { rectMundo(p.col, p.x, p.y, p.t > 0.5 ? 2 : 1, p.t > 0.5 ? 2 : 1); });
    cx.font = "12px 'Depurador Pixel', monospace"; cx.textBaseline = "alphabetic";
    flotantes.forEach(function (f) { var tx = Math.round(f.x - cam.x - cx.measureText(f.txt).width / 2), ty = Math.round(f.y - cam.y); cx.fillStyle = "#000"; cx.fillText(f.txt, tx + 1, ty + 1); cx.fillStyle = f.col; cx.fillText(f.txt, tx, ty); });
    // indicador de interacción
    if (modo === "explorar" && cercano) {
      var o = cercano.o, ix = (o.tx + o.w / 2) * T, iy = o.ty * T - (o.clase === "terminal" || o.clase === "npc" ? 22 : 6) - (o.clase === "npc" && o.sobre ? 10 : 0);
      if (o.clase === "pared") iy = (o.ty + 1) * T - 4;
      var bob = aj.calma ? 0 : (Math.floor(reloj * 3) % 2);
      var etiqueta = tactilActivo() ? "USAR" : "E";
      var tw = Math.ceil(cx.measureText(etiqueta).width) + 6;
      rectMundo("#000", ix - tw / 2 - 1, iy - 12 - bob, tw + 2, 13); rectMundo("#fff", ix - tw / 2, iy - 11 - bob, tw, 11); rectMundo("#000", ix - tw / 2 + 1, iy - 10 - bob, tw - 2, 9);
      cx.fillStyle = "#ffe74a"; cx.fillText(etiqueta, Math.round(ix - cam.x - tw / 2 + 3), Math.round(iy - cam.y - 2 - bob));
    }
    // fuera de la zona actual: negro (cada sala se ve como una habitación aparte)
    var bz = M.limites(zonaCamara), mx0 = bz.x - cam.x, my0 = bz.y - cam.y, mx1 = mx0 + bz.w, my1 = my0 + bz.h;
    cx.fillStyle = "#000";
    if (my0 > 0) cx.fillRect(0, 0, vw, my0); if (my1 < vh) cx.fillRect(0, my1, vw, vh - my1);
    if (mx0 > 0) cx.fillRect(0, 0, mx0, vh); if (mx1 < vw) cx.fillRect(mx1, 0, vw - mx1, vh);
    // fundido entre salas y efecto de entrada a terminal
    if (fundido > 0) { cx.fillStyle = "rgba(0,0,0," + Math.min(1, fundido).toFixed(3) + ")"; cx.fillRect(0, 0, vw, vh); }
    if (efecto && efecto.tipo === "barrido") {
      var k2 = Math.min(1, efecto.t / efecto.dur), n = 10, h = Math.ceil(vh / n);
      cx.fillStyle = "#000";
      for (var b2 = 0; b2 < n; b2++) cx.fillRect(0, b2 * h, Math.ceil(vw * Math.min(1, k2 * 1.6 - b2 * 0.06)), h);
    }
  }
  function tactilActivo() { return document.body.classList.contains("con-tactil"); }

  /* =========================================================== entrada */
  var teclas = {}, tactilDir = {};
  var MAPA = { ArrowUp: "arriba", KeyW: "arriba", ArrowDown: "abajo", KeyS: "abajo", ArrowLeft: "izq", KeyA: "izq", ArrowRight: "der", KeyD: "der" };
  var ACCION = ["Enter", "NumpadEnter", "Space", "KeyE", "KeyZ"];
  function mapaConFoco() { var a = document.activeElement; return a === cv || a === document.body || a === null || a === document.documentElement; }
  function primerGesto() { if (!S.activo()) { S.iniciar(); musicaSegunModo(); } }
  document.addEventListener("pointerdown", primerGesto, true);
  document.addEventListener("keydown", function (e) {
    primerGesto();
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (!$("pantalla").hidden) return teclaPantalla(e);
    if (modo === "dialogo") {
      if (ACCION.indexOf(e.code) >= 0) { e.preventDefault(); avanzarDialogo(); }
      else if (e.code === "Escape" || e.code === "KeyX" || e.key === "Shift") { e.preventDefault(); saltarDialogo(); }
      return;
    }
    if (modo !== "explorar") return;
    if (e.code === "Escape" || e.code === "KeyP") { e.preventDefault(); abrir(pPausa()); return; }
    if (e.code === "KeyM") { e.preventDefault(); abrir(pAjustes()); return; }
    if (!mapaConFoco()) return;
    if (MAPA[e.code]) { e.preventDefault(); teclas[MAPA[e.code]] = true; jugador.ruta = null; jugador.objetivo = null; return; }
    if (ACCION.indexOf(e.code) >= 0) { e.preventDefault(); if (!e.repeat) interactuar(); }
  });
  document.addEventListener("keyup", function (e) { if (MAPA[e.code]) teclas[MAPA[e.code]] = false; });
  window.addEventListener("blur", function () { teclas = {}; tactilDir = {}; });
  Array.prototype.forEach.call(document.querySelectorAll(".cruz button"), function (b) {
    var d = b.getAttribute("data-d");
    function on(e) { e.preventDefault(); primerGesto(); tactilDir[d] = true; b.classList.add("on"); jugador.ruta = null; jugador.objetivo = null; if (modo === "dialogo") avanzarDialogo(); }
    function off() { tactilDir[d] = false; b.classList.remove("on"); }
    b.addEventListener("pointerdown", on); b.addEventListener("pointerup", off); b.addEventListener("pointerleave", off); b.addEventListener("pointercancel", off);
  });
  $("dlg-seguir").addEventListener("click", function (e) { e.stopPropagation(); if (e.detail !== 0) avanzarDialogo(); });
  $("dialogo").addEventListener("click", function (e) { if (e.detail !== 0) avanzarDialogo(); });
  $("tb-a").addEventListener("click", function () { if (modo === "dialogo") avanzarDialogo(); else if (modo === "explorar") interactuar(); });
  $("tb-b").addEventListener("click", function () { if (modo === "dialogo") saltarDialogo(); else if (modo === "explorar") abrir(pPausa()); });
  $("btn-menu").addEventListener("click", function () { if (modo === "explorar") abrir(pPausa()); else if (modo === "dialogo") saltarDialogo(); });
  cv.addEventListener("click", function (e) {
    if (modo === "dialogo") { avanzarDialogo(); return; }
    if (modo !== "explorar") return;
    cv.focus({ preventScroll: true });
    var r = cv.getBoundingClientRect(), wx = cam.x + (e.clientX - r.left) / r.width * (cv.width / escala), wy = cam.y + (e.clientY - r.top) / r.height * (cv.height / escala);
    caminarA(wx, wy);
  });
  // clic: caminar hacia un punto o hacia un objeto y usarlo al llegar
  function caminarA(wx, wy) {
    var obj = null;
    interactivos().forEach(function (o) {
      var x0 = o.tx * T, x1 = (o.tx + o.w) * T, y1 = (o.ty + o.h) * T, y0 = y1 - (o.clase === "pared" ? T : 30);
      if (wx >= x0 - 2 && wx <= x1 + 2 && wy >= y0 && wy <= y1 + 2) obj = o;
    });
    var desde = { x: Math.floor(jugador.x / T), y: Math.floor((jugador.y - 2) / T) };
    if (obj) {
      var opciones = obj.clase === "pared" ? [{ x: obj.tx, y: obj.ty + 1, dir: "arriba" }, { x: obj.tx + 1, y: obj.ty + 1, dir: "arriba" }].filter(function (c) { return M.transitable(c.x, c.y); }) : M.junto(obj);
      var mejor = null;
      opciones.forEach(function (c) { var rr = M.ruta(desde, c); if (rr && (!mejor || rr.length < mejor.r.length)) mejor = { r: rr, c: c }; });
      if (!mejor) { anunciar("No hay camino hasta " + nombreDe(obj) + "."); return; }
      jugador.ruta = mejor.r.slice(1); jugador.objetivo = { o: obj, dir: mejor.c.dir };
      if (!jugador.ruta.length) llegar();
      return;
    }
    var dest = { x: Math.floor(wx / T), y: Math.floor(wy / T) };
    var rr2 = M.ruta(desde, dest);
    if (rr2) { jugador.ruta = rr2.slice(1); jugador.objetivo = null; }
  }
  function llegar() {
    var ob = jugador.objetivo; jugador.ruta = null; jugador.objetivo = null;
    if (ob) { jugador.dir = ob.dir; actualizarCercano(); if (cercano && cercano.o === ob.o) interactuar(); else usarObjeto(ob.o); }
  }

  /* =========================================================== interacción */
  var cercano = null, ultimoCercano = null;
  function interactivos() {
    return M.objetos.filter(function (o) {
      if (o.clase === "terminal") return !!retoDe(o.id);
      return o.clase === "npc" || o.clase === "pared" || !!o.info || (o.clase === "decor" && DL.EXAMINAR[o.tipo] && PLANOS.indexOf(o.tipo) < 0);
    });
  }
  function distRect(px, py, o) { var x0 = o.tx * T, y0 = o.ty * T, x1 = x0 + o.w * T, y1 = y0 + o.h * T; var dx = Math.max(x0 - px, 0, px - x1), dy = Math.max(y0 - py, 0, py - y1); return Math.sqrt(dx * dx + dy * dy); }
  var PRIORIDAD = { terminal: 0, npc: 1, pared: 2, decor: 3 };
  function actualizarCercano() {
    var d = { arriba: [0, -1], abajo: [0, 1], izq: [-1, 0], der: [1, 0] }[jugador.dir];
    var px = jugador.x + d[0] * 9, py = jugador.y - 3 + d[1] * 9, mejor = null;
    interactivos().forEach(function (o) {
      if (o.zona !== zonaActual && o.zona) return;
      var dd = distRect(px, py, o); if (dd > 6) return;
      var pr = PRIORIDAD[o.clase] + (o.info && o.clase === "decor" ? -1.5 : 0);
      if (!mejor || pr < mejor.pr || (pr === mejor.pr && dd < mejor.d)) mejor = { o: o, d: dd, pr: pr };
    });
    cercano = mejor;
    var id = mejor ? (mejor.o.id || mejor.o.tipo + mejor.o.tx) : null;
    if (id !== ultimoCercano) {
      ultimoCercano = id;
      if (mejor) anunciar("Cerca: " + nombreDe(mejor.o) + (mejor.o.clase === "terminal" ? (E.fixed[mejor.o.id] ? ", estable." : ", con falla.") : ".") + " Presiona Enter para interactuar.");
    }
  }
  function nombreDe(o) {
    if (o.clase === "terminal") return o.def.nombre;
    if (o.clase === "npc") return o.nombre;
    if (o.info === "cartel") return "cartel de " + M.SECTORES[o.sector].nombre;
    if (o.info === "objetivos") return "cartelera de objetivos";
    if (o.info === "respaldo") return "disquete de respaldo";
    if (o.info === "expendedora") return "máquina expendedora";
    return ({ mainframe: "procesador", torre: "torre de cómputo", antena: "antena", holo: "holograma", cafetera: "cafetera", globo: "globo terráqueo", rack: "servidor", estante: "estante", planta: "planta", agua: "dispensador de agua", herramientas: "caja de herramientas", mesaRedonda: "mesa de reuniones", escalera: "escalera", banco: "banco", mesaLectura: "mesa de lectura", papeles: "pila de papeles", cajon: "caja con escarcha", libros: "libros", lampara: "lámpara", puff: "puff", archivero: "archivero" })[o.tipo] || o.tipo;
  }
  function interactuar() { actualizarCercano(); if (!cercano) { anunciar("No hay nada para usar aquí."); return; } usarObjeto(cercano.o); }
  function usarObjeto(o) {
    teclas = {}; tactilDir = {};
    if (o.clase === "terminal") { abrirTerminal(o.id); return; }
    var p;
    if (o.clase === "npc") {
      var n = E.charlas[o.id] || 0; p = progreso(n);
      var lineas = DL.D[o.id](p);
      E.charlas[o.id] = n + 1;
      mostrarDialogo(lineas);
      return;
    }
    p = progreso(0);
    if (o.info === "cartel") return mostrarDialogo(DL.D.cartel(p, o.sector));
    if (o.info === "objetivos") return mostrarDialogo(DL.D.objetivos(p));
    if (o.info === "expendedora") return mostrarDialogo(DL.D.expendedora(p));
    if (o.info === "respaldo") { var ok = guardarAhora(); S.sfx("guardar"); var l = DL.D.respaldo(p); if (!ok) l[1] = { texto: "* El navegador no permitió guardar. Revisa que el almacenamiento local esté habilitado." }; return mostrarDialogo(l); }
    if (DL.EXAMINAR[o.tipo]) return mostrarDialogo([{ texto: DL.EXAMINAR[o.tipo] }]);
  }

  /* =========================================================== actualización */
  var VEL = 82, ultimoGuardado = 0, acumPaso = 0;
  function actualizar(dt) {
    reloj += dt;
    if (efecto) { efecto.t += dt; if (efecto.t >= efecto.dur) { var f = efecto.luego; efecto = null; f(); } }
    if (transicion) {
      transicion.t += dt;
      if (transicion.t < 0.12) fundido = transicion.t / 0.12;
      else { if (zonaCamara !== transicion.a) cambiarZonaCamara(transicion.a); fundido = Math.max(0, 1 - (transicion.t - 0.12) / 0.16); if (transicion.t > 0.28) { transicion = null; fundido = 0; } }
    }
    var corre = (modo === "explorar" || modo === "dialogo" || modo === "transicion" || (modo === "pantalla" && pila.length && pila[pila.length - 1].id === "terminal")) && E._enJuego && !terminado();
    if (corre) E.ms += dt * 1000;
    if (modo === "explorar") moverJugador(dt);
    if (modo === "dialogo") escribir(dt);
    if (escribiendoTerm) escribirTerminal(dt);
    for (var i = particulas.length - 1; i >= 0; i--) { var p = particulas[i]; p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 30 * dt; if (p.t <= 0) particulas.splice(i, 1); }
    for (var j = flotantes.length - 1; j >= 0; j--) { var f2 = flotantes[j]; f2.t -= dt; f2.y -= 14 * dt; if (f2.t <= 0) flotantes.splice(j, 1); }
    if (E._enJuego && modo === "explorar" && reloj - ultimoGuardado > 10) { ultimoGuardado = reloj; guardarAhora(); }
  }
  function moverJugador(dt) {
    var dx = 0, dy = 0;
    var h = { arriba: teclas.arriba || tactilDir.arriba, abajo: teclas.abajo || tactilDir.abajo, izq: teclas.izq || tactilDir.izq, der: teclas.der || tactilDir.der };
    dx = (h.der ? 1 : 0) - (h.izq ? 1 : 0); dy = (h.abajo ? 1 : 0) - (h.arriba ? 1 : 0);
    if ((dx || dy) && jugador.ruta) { jugador.ruta = null; jugador.objetivo = null; }
    if (!dx && !dy && jugador.ruta && jugador.ruta.length) {
      var sig = jugador.ruta[0], tx = (sig.x + 0.5) * T, ty = (sig.y + 0.5) * T + 4;
      var ex = tx - jugador.x, ey = ty - jugador.y, dist = Math.hypot(ex, ey);
      if (dist < 1.5) { jugador.x = tx; jugador.y = ty; jugador.ruta.shift(); if (!jugador.ruta.length) { llegar(); return; } }
      else { dx = ex / dist; dy = ey / dist; if (Math.abs(ex) < 1) dx = 0; if (Math.abs(ey) < 1) dy = 0; }
    }
    var moviendo = !!(dx || dy);
    if (moviendo) {
      if (dx && dy && !jugador.ruta) { dx *= 0.7071; dy *= 0.7071; }
      jugador.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "der" : "izq") : (dy > 0 ? "abajo" : "arriba");
      var paso = VEL * dt, nx = jugador.x + dx * paso, ny = jugador.y + dy * paso, movido = false;
      if (M.libre(nx, jugador.y)) { jugador.x = nx; movido = true; }
      if (M.libre(jugador.x, ny)) { jugador.y = ny; movido = true; }
      if (!movido && jugador.ruta) { jugador.ruta = null; jugador.objetivo = null; }
      jugador.tiempoPaso += dt;
      var c = Math.floor(jugador.tiempoPaso * 7) % 4; if (c !== jugador.cuadro && (c === 1 || c === 3) && movido) S.sfx("paso");
      jugador.cuadro = aj.calma && !movido ? 0 : c;
    } else { jugador.cuadro = 0; jugador.tiempoPaso = 0; }
    var z = M.zonaEn(jugador.x, jugador.y - 2);
    if (z && z !== zonaActual) cambiarZona(z);
    actualizarCercano();
  }
  var transicion = null;
  function cambiarZona(z) {
    zonaActual = z;
    S.sfx("puerta");
    if (aj.calma) cambiarZonaCamara(z); else transicion = { a: z, t: 0 };
    guardarAhora();
  }
  var cartelTimer = null;
  function cambiarZonaCamara(z) {
    zonaCamara = z;
    var nombre = z === "hall" ? "Vestíbulo" : M.SECTORES[z].nombre;
    var el = $("cartel-zona"); el.textContent = nombre.toUpperCase(); el.classList.add("ver"); clearTimeout(cartelTimer); cartelTimer = setTimeout(function () { el.classList.remove("ver"); }, 1800);
    if (z === "hall") anunciar("Vestíbulo. Desde aquí se llega a los seis sectores.");
    else { var i = infoSector(z), c = B.categoria(z); anunciar(nombre + ", " + (c ? c.detalle : "") + ". " + (i.estable ? "Sector estable." : (i.total - i.reparadas) + " de " + i.total + " terminales con falla.")); }
    musicaSegunModo();
  }
  function musicaSegunModo() {
    if (modo === "titulo") return S.musica("titulo");
    for (var i = pila.length - 1; i >= 0; i--) if (pila[i].musica) return S.musica(pila[i].musica);
    S.musica(zonaCamara === "hall" ? "hall" : zonaCamara);
  }

  /* =========================================================== HUD y anuncios */
  function actualizarHUD() {
    $("hp-fill").style.width = E.hp + "%"; $("hp-val").textContent = E.hp + "/100"; $("hp-bar").setAttribute("aria-valuenow", E.hp);
    $("st-fixed").textContent = reparadas() + "/" + RETOS.length; $("st-res").textContent = E.res;
  }
  var ultSeg = -1;
  function relojHUD() { var s = segundos(); if (s !== ultSeg) { ultSeg = s; $("st-time").textContent = mmss(E.ms); } }
  var anuncioT = null;
  function anunciar(msg, urgente) { var el = $(urgente ? "alertas" : "anuncios"); el.textContent = ""; clearTimeout(anuncioT); anuncioT = setTimeout(function () { el.textContent = msg; }, 60); }

  /* =========================================================== diálogos con texto progresivo */
  var dlg = null;
  function velocidad() { return aj.texto === "instantaneo" ? Infinity : aj.texto === "rapido" ? 120 : 55; }
  function mostrarDialogo(lineas, alTerminar) {
    if (!lineas || !lineas.length) return;
    modo = "dialogo"; teclas = {}; tactilDir = {}; jugador.ruta = null;
    dlg = { lineas: lineas, i: 0, n: 0, alTerminar: alTerminar };
    $("dialogo").hidden = false;
    mostrarLinea();
    $("dlg-seguir").focus({ preventScroll: true });
  }
  function mostrarLinea() {
    var l = dlg.lineas[dlg.i], box = $("dialogo"), ret = $("dlg-retrato");
    $("dlg-quien").textContent = l.quien || ""; $("dlg-quien").hidden = !l.quien;
    box.classList.toggle("sin-retrato", !l.npc);
    if (l.npc) { var img = A.spriteNPC(l.npc, l.cara || "neutral", 0); ret.width = 32; ret.height = 32; var c = ret.getContext("2d"); c.clearRect(0, 0, 32, 32); c.imageSmoothingEnabled = false; c.drawImage(img, Math.floor((32 - img.width) / 2), Math.floor((32 - img.height) / 2)); }
    $("dlg-completo").textContent = (l.quien ? l.quien + ": " : "") + l.texto.replace(/^\* /, "");
    dlg.n = 0; dlg.listo = false; $("dlg-visible").textContent = "";
    if (velocidad() === Infinity) completarLinea();
    $("dlg-seguir").firstChild.textContent = dlg.i < dlg.lineas.length - 1 ? "Continuar " : "Cerrar ";
  }
  function escribir(dt) {
    if (!dlg || dlg.listo) return;
    var l = dlg.lineas[dlg.i], antes = Math.floor(dlg.n);
    dlg.n += dt * velocidad();
    var n = Math.min(l.texto.length, Math.floor(dlg.n));
    if (n !== antes) { $("dlg-visible").textContent = l.texto.slice(0, n); var ch = l.texto[n - 1]; if (ch && ch !== " " && n % 2) S.voz(l.npc ? A.NPC[l.npc].voz : 360); }
    if (n >= l.texto.length) completarLinea();
  }
  function completarLinea() { dlg.listo = true; $("dlg-visible").textContent = dlg.lineas[dlg.i].texto; }
  function avanzarDialogo() {
    if (!dlg) return;
    if (!dlg.listo) { completarLinea(); return; }
    S.sfx("mover");
    dlg.i++;
    if (dlg.i >= dlg.lineas.length) return cerrarDialogo();
    mostrarLinea();
  }
  function saltarDialogo() { if (!dlg) return; if (!dlg.listo) completarLinea(); else cerrarDialogo(); }
  function cerrarDialogo() {
    var f = dlg && dlg.alTerminar; dlg = null; $("dialogo").hidden = true;
    modo = "explorar"; cv.focus({ preventScroll: true }); guardarAhora();
    if (f) f();
  }

  /* =========================================================== pantallas (pila) */
  var pila = [], modoAntes = "explorar";
  function abrir(def) {
    if (!pila.length) { modoAntes = modo === "pantalla" ? modoAntes : modo; modo = "pantalla"; teclas = {}; tactilDir = {}; jugador.ruta = null; }
    S.sfx("confirmar");
    pila.push(def); pintarPantalla(true);
  }
  function reemplazar(def) { pila.pop(); pila.push(def); pintarPantalla(true); }
  function pintarPantalla(anima) {
    var def = pila[pila.length - 1], p = $("pantalla");
    p.hidden = false; p.classList.remove("destello-rojo"); $("app").setAttribute("aria-hidden", "true"); $("app").inert = true;
    p.innerHTML = '<div class="pnl' + (anima ? " abre" : "") + '" role="dialog" aria-modal="true" aria-labelledby="pnl-titulo"' + (def.describe ? ' aria-describedby="' + def.describe + '"' : "") + ">" + def.html() + "</div>";
    p.scrollTop = 0;
    if (def.enlazar) def.enlazar(p.firstChild);
    enlazarMenus(p);
    var f = def.foco ? p.querySelector(def.foco) : p.querySelector("button, [tabindex='0'], input, select, textarea");
    if (f) f.focus({ preventScroll: true });
    musicaSegunModo();
  }
  function cerrar() {
    pila.pop();
    if (pila.length) { pintarPantalla(false); return; }
    var p = $("pantalla"); p.hidden = true; p.innerHTML = ""; $("app").removeAttribute("aria-hidden"); $("app").inert = false;
    modo = modoAntes; if (modo === "pantalla") modo = "explorar";
    if (modo === "explorar") { cv.focus({ preventScroll: true }); actualizarHUD(); }
    musicaSegunModo();
    if (celebrar) { var id = celebrar; celebrar = null; festejar(id); }
  }
  function cerrarTodo() { pila = [pila[pila.length - 1]]; cerrar(); }
  function teclaPantalla(e) {
    var def = pila[pila.length - 1]; if (!def) return;
    var t = e.target, escribe = t && (t.tagName === "TEXTAREA" || (t.tagName === "INPUT" && t.type !== "checkbox" && t.type !== "range") || t.tagName === "SELECT");
    if (e.key === "Escape") { e.preventDefault(); if (def.esc) { S.sfx("cancelar"); def.esc(); } return; }
    if (e.key === "Tab") {
      var raiz = $("pantalla"), f = Array.prototype.filter.call(raiz.querySelectorAll("button, input, select, textarea, [href], [tabindex]:not([tabindex='-1'])"), function (x) { return !x.disabled && x.offsetParent !== null && x.tabIndex >= 0; });
      if (!f.length) return; var a = f[0], z = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === a || !raiz.contains(document.activeElement))) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && (document.activeElement === z || !raiz.contains(document.activeElement))) { e.preventDefault(); a.focus(); }
      return;
    }
    if (!escribe && def.teclas) def.teclas(e);
  }
  // menús: flechas para recorrer, cursor corazón, sonido
  function itemMenu(it) {
    return '<li role="none"><button type="button" role="menuitem" data-acc="' + it.id + '"' + (it.off ? ' aria-disabled="true"' : "") + (it.desc ? ' aria-describedby="d-' + it.id + '"' : "") + '><span class="cursor" aria-hidden="true"></span><span>' + esc(it.txt) + "</span>" + (it.det ? '<span class="det" id="d-' + it.id + '">' + esc(it.det) + "</span>" : "") + "</button></li>";
  }
  function menuHTML(items, etiqueta) { return '<ul class="menu" role="menu" aria-label="' + esc(etiqueta) + '">' + items.map(itemMenu).join("") + "</ul>"; }
  function enlazarMenus(raiz) {
    Array.prototype.forEach.call(raiz.querySelectorAll(".menu"), function (m) {
      var bs = Array.prototype.slice.call(m.querySelectorAll("button"));
      bs.forEach(function (b, i) { b.tabIndex = i === 0 ? 0 : -1; b.addEventListener("focus", function () { bs.forEach(function (x) { x.tabIndex = -1; }); b.tabIndex = 0; }); });
      m.addEventListener("keydown", function (e) {
        var i = bs.indexOf(document.activeElement); if (i < 0) return;
        var n = null;
        if (e.key === "ArrowDown") n = (i + 1) % bs.length; else if (e.key === "ArrowUp") n = (i - 1 + bs.length) % bs.length; else if (e.key === "Home") n = 0; else if (e.key === "End") n = bs.length - 1;
        if (n !== null) { e.preventDefault(); bs[n].focus(); S.sfx("mover"); }
      });
    });
  }
  function alAccionar(raiz, mapa) {
    Array.prototype.forEach.call(raiz.querySelectorAll("[data-acc]"), function (b) {
      b.addEventListener("click", function () { if (b.getAttribute("aria-disabled") === "true") { S.sfx("cancelar"); return; } var f = mapa[b.getAttribute("data-acc")]; if (f) f(b); });
    });
  }

  /* ---------- pantalla de título ---------- */
  var escenaTitulo = null;
  function pTitulo() {
    return { id: "titulo", musica: "titulo", foco: ".menu button",
      html: function () {
        var hay = G.existe(), resumen = "";
        if (hay) { var r = G.cargar(ids()); if (r && r.estado) resumen = r.estado.terminado ? "completada" : Object.keys(r.estado.fixed).length + "/" + RETOS.length + " · " + mmss(r.estado.ms); else if (r && r.error) { avisoGuardado = r.error; hay = false; } }
        var items = [];
        if (hay) items.push({ id: "continuar", txt: "CONTINUAR", det: resumen });
        items.push({ id: "nueva", txt: "NUEVA PARTIDA" }, { id: "directo", txt: "MODO DIRECTO", det: "ir a un reto" }, { id: "ajustes", txt: "AJUSTES" }, { id: "banco", txt: "BANCO DE RETOS" }, { id: "creditos", txt: "CRÉDITOS" });
        return '<div class="titulo"><h1 class="logo" id="pnl-titulo">DEPURADOR TIC<small>UN RPG DE SOPORTE TÉCNICO · DESAFÍO TIC</small></h1>' +
          '<canvas id="escena-titulo" width="160" height="40" aria-hidden="true"></canvas>' +
          menuHTML(items, "Menú principal") +
          (avisoGuardado ? '<p class="aviso" role="status">' + esc(avisoGuardado) + "</p>" : "") +
          (avisos.length ? '<p class="aviso" role="status">' + esc(avisos.join(" ")) + "</p>" : "") +
          '<p class="sub">Flechas para elegir · Enter para confirmar · v' + VERSION + "</p></div>";
      },
      enlazar: function (raiz) {
        escenaTitulo = raiz.querySelector("#escena-titulo");
        alAccionar(raiz, {
          continuar: function () { if (cargarPartida()) entrarAlJuego(false); else { pila = []; abrir(pTitulo()); } },
          nueva: function () { if (G.existe()) abrir(pConfirmar("¿Empezar una partida nueva? Se borrará la partida guardada.", function () { pila = []; nuevaPartida(); entrarAlJuego(true); })); else { nuevaPartida(); entrarAlJuego(true); } },
          directo: function () { abrir(pDirecto()); }, ajustes: function () { abrir(pAjustes()); }, banco: function () { abrir(pBanco()); }, creditos: function () { abrir(pCreditos()); }
        });
      } };
  }
  function dibujarEscenaTitulo() {
    if (!escenaTitulo || !escenaTitulo.isConnected) return;
    var c = escenaTitulo.getContext("2d"); c.imageSmoothingEnabled = false; c.clearRect(0, 0, 160, 40);
    for (var x = 0; x < 160; x += 16) A.TEMAS.hall.piso(c, x, 24, x / 16, 0);
    A.TEMAS.hall.pared(c, 0, 8, 0, 1); for (var x2 = 0; x2 < 160; x2 += 16) A.TEMAS.hall.pared(c, x2, 8, x2 / 16, 1);
    var fa = aj.calma ? 0 : Math.floor(reloj / 0.4);
    var t1 = A.objeto("cajero", { est: "pend", fr: fa % 2 }), t2 = A.objeto("pc", { est: "ok" });
    c.drawImage(t1, 24, 40 - t1.height); c.drawImage(t2, 116, 40 - t2.height);
    var pj = A.spritePJ("der", aj.calma ? 0 : Math.floor(reloj * 7) % 4), bo = A.spriteNPC("borne", "feliz", fa);
    c.drawImage(pj, 64, 40 - pj.height); c.drawImage(bo, 86, 40 - bo.height);
  }
  function entrarAlJuego(nueva) {
    pila = []; var p = $("pantalla"); p.hidden = true; p.innerHTML = ""; $("app").removeAttribute("aria-hidden"); $("app").inert = false;
    $("hud").hidden = false; modo = "explorar"; E._enJuego = true;
    ajustarVista(); actualizarHUD(); cv.focus({ preventScroll: true });
    zonaCamara = zonaActual; transicion = null; fundido = 0;
    musicaSegunModo();
    if (E.hp <= 0) { abrir(pApagado()); return; }
    if (nueva || !E.introVista) { E.introVista = true; mostrarDialogo(DL.D.intro(progreso(0))); }
    else anunciar("Partida recuperada. " + reparadas() + " de " + RETOS.length + " terminales estables.");
  }

  /* ---------- confirmación ---------- */
  function pConfirmar(texto, si, no) {
    return { id: "confirmar", foco: "[data-acc='no']", describe: "conf-txt",
      html: function () { return '<div class="caja amarilla"><h2 id="pnl-titulo">CONFIRMAR</h2><p id="conf-txt" style="margin-top:12px">* ' + esc(texto) + "</p></div>" + menuHTML([{ id: "no", txt: "NO, VOLVER" }, { id: "si", txt: "SÍ, CONTINUAR" }], "Confirmación"); },
      enlazar: function (r) { alAccionar(r, { si: function () { si(); }, no: function () { cerrar(); if (no) no(); } }); },
      esc: function () { cerrar(); if (no) no(); } };
  }

  /* ---------- pausa ---------- */
  function pPausa() {
    return { id: "pausa", foco: ".menu button",
      html: function () {
        var items = [{ id: "seguir", txt: "CONTINUAR" }, { id: "objetivos", txt: "OBJETIVOS", det: reparadas() + "/" + RETOS.length }, { id: "directo", txt: "MODO DIRECTO", det: "salto de retos" }, { id: "ajustes", txt: "AJUSTES Y ACCESIBILIDAD" }, { id: "banco", txt: "BANCO DE RETOS" }, { id: "guardar", txt: "GUARDAR PARTIDA" }, { id: "informe", txt: "INFORME DE DESEMPEÑO", det: terminado() ? "" : "parcial" }, { id: "nueva", txt: "NUEVA PARTIDA" }, { id: "titulo", txt: "VOLVER AL TÍTULO" }];
        return '<div class="caja"><h2 id="pnl-titulo">PAUSA</h2><p class="sub" style="margin-top:8px">' + esc(zonaActual === "hall" ? "Vestíbulo" : M.SECTORES[zonaActual].nombre) + " · Energía " + E.hp + "/100 · Recursos " + E.res + " · Tiempo " + mmss(E.ms) + "</p></div>" + menuHTML(items, "Menú de pausa") + '<p class="sub" role="status" id="pausa-estado"></p>';
      },
      enlazar: function (r) {
        alAccionar(r, {
          seguir: function () { cerrar(); }, objetivos: function () { abrir(pObjetivos()); }, directo: function () { abrir(pDirecto()); }, ajustes: function () { abrir(pAjustes()); }, banco: function () { abrir(pBanco()); },
          guardar: function () { var ok = guardarAhora(); S.sfx(ok ? "guardar" : "error"); $("pausa-estado").textContent = ok ? "* Partida guardada en este navegador." : "* No se pudo guardar: el navegador bloquea el almacenamiento local."; },
          informe: function () { abrir(pInforme()); },
          nueva: function () { abrir(pConfirmar("¿Empezar una partida nueva? Se perderá el progreso actual (" + reparadas() + "/" + RETOS.length + ").", function () { pila = []; nuevaPartida(); entrarAlJuego(true); })); },
          titulo: function () { guardarAhora(); irAlTitulo(); }
        });
      },
      esc: function () { cerrar(); } };
  }
  function irAlTitulo() {
    guardarAhora(); pila = []; modo = "titulo"; E._enJuego = false; $("hud").hidden = true; $("dialogo").hidden = true; dlg = null;
    abrir(pTitulo());
  }

  /* ---------- objetivos ---------- */
  function pObjetivos() {
    return { id: "objetivos", foco: "[data-acc='volver']",
      html: function () {
        return '<h2 id="pnl-titulo">OBJETIVOS DEL TURNO</h2><p>* Estabiliza las ' + RETOS.length + " terminales del edificio. Van " + reparadas() + ".</p>" +
          '<div class="salto">' + M.ORDEN.map(function (k) {
            var i = infoSector(k), c = B.categoria(k);
            return '<section class="caja' + (i.estable ? " verde" : "") + '"><h3>' + esc(i.nombre) + '</h3><p class="sub">' + esc(c ? c.detalle : "") + '</p><ul class="repaso" style="margin-top:8px">' +
              M.estaciones.filter(function (o) { return o.zona === k && retoDe(o.id); }).map(function (o) { return "<li>" + (E.fixed[o.id] ? '<span class="estado-ok">✔ estable</span> · ' : '<span class="estado-pend">● con falla</span> · ') + esc(o.def.nombre) + "</li>"; }).join("") + "</ul></section>";
          }).join("") + "</div>" + '<div class="fila"><button class="btn" type="button" data-acc="volver">VOLVER [ESC]</button></div>';
      },
      enlazar: function (r) { alAccionar(r, { volver: cerrar }); }, esc: cerrar };
  }

  /* ---------- ajustes ---------- */
  function pAjustes() {
    return { id: "ajustes", foco: "#aj-musica",
      html: function () {
        var aud = S.disponible() ? "" : " (este navegador no admite Web Audio)";
        return '<h2 id="pnl-titulo">AJUSTES Y ACCESIBILIDAD</h2><p class="sub">Los cambios se aplican al instante y se recuerdan en este navegador.</p>' +
          '<fieldset><legend>SONIDO</legend>' +
          '<div class="ajuste"><label for="aj-musica">Música</label><input type="range" id="aj-musica" min="0" max="100" step="10" value="' + aj.musica + '" aria-valuetext="' + aj.musica + ' por ciento"><small>Volumen de la música de cada sector' + aud + ".</small></div>" +
          '<div class="ajuste"><label for="aj-efectos">Efectos de sonido</label><input type="range" id="aj-efectos" min="0" max="100" step="10" value="' + aj.efectos + '" aria-valuetext="' + aj.efectos + ' por ciento"><small>Pasos, selección, aciertos, errores y voces de los diálogos.</small></div></fieldset>' +
          '<fieldset><legend>ACCESIBILIDAD</legend>' +
          '<div class="ajuste"><label for="aj-calma">Reducir movimiento</label><input type="checkbox" id="aj-calma"' + (aj.calma ? " checked" : "") + "><small>Apaga parpadeos, alarmas, sacudidas, partículas, fundidos y transiciones." + (sistemaReducido ? " Tu dispositivo ya lo pide, por eso está activo." : "") + "</small></div>" +
          '<div class="ajuste"><label for="aj-texto">Velocidad del texto</label><select id="aj-texto"><option value="normal"' + (aj.texto === "normal" ? " selected" : "") + '>Normal</option><option value="rapido"' + (aj.texto === "rapido" ? " selected" : "") + '>Rápida</option><option value="instantaneo"' + (aj.texto === "instantaneo" ? " selected" : "") + ">Instantánea</option></select><small>Cómo aparecen los diálogos y los enunciados.</small></div>" +
          '<div class="ajuste"><label for="aj-grande">Texto grande</label><input type="checkbox" id="aj-grande"' + (aj.grande ? " checked" : "") + "><small>Aumenta el tamaño de diálogos, preguntas y menús.</small></div>" +
          '<div class="ajuste"><label for="aj-legible">Tipografía de lectura</label><input type="checkbox" id="aj-legible"' + (aj.legible ? " checked" : "") + "><small>Cambia la letra pixelada por una tipografía pensada para leer con facilidad.</small></div>" +
          '<div class="ajuste"><label for="aj-tactil">Controles táctiles</label><select id="aj-tactil"><option value="auto"' + (aj.tactil === "auto" ? " selected" : "") + '>Automático</option><option value="si"' + (aj.tactil === "si" ? " selected" : "") + '>Mostrar siempre</option><option value="no"' + (aj.tactil === "no" ? " selected" : "") + ">Ocultar</option></select><small>Cruceta y botones USAR / MENÚ en pantalla.</small></div></fieldset>" +
          '<fieldset><legend>CONTROLES</legend><p class="sub">Mover: flechas o W A S D · Usar: E, Z, Enter o Espacio · Menú: Esc o P · Ajustes: M · En una terminal: flechas o A–D / 1–4 para elegir y Enter para ejecutar · En los diálogos: Enter avanza, X o Esc completa el texto · Con el mouse: clic para caminar y usar · Con Tab se recorren todos los botones.</p></fieldset>' +
          '<div class="fila"><button class="btn" type="button" data-acc="volver">VOLVER [ESC]</button></div>';
      },
      enlazar: function (r) {
        function rango(id, k) { var el = r.querySelector(id); el.addEventListener("input", function () { aj[k] = +el.value; el.setAttribute("aria-valuetext", el.value + " por ciento"); aplicarAjustes(true); if (k === "efectos") S.sfx("mover"); }); }
        rango("#aj-musica", "musica"); rango("#aj-efectos", "efectos");
        r.querySelector("#aj-calma").addEventListener("change", function () { aj.calma = this.checked; aplicarAjustes(true); });
        r.querySelector("#aj-grande").addEventListener("change", function () { aj.grande = this.checked; aplicarAjustes(true); });
        r.querySelector("#aj-legible").addEventListener("change", function () { aj.legible = this.checked; aplicarAjustes(true); });
        r.querySelector("#aj-texto").addEventListener("change", function () { aj.texto = this.value; aplicarAjustes(true); });
        r.querySelector("#aj-tactil").addEventListener("change", function () { aj.tactil = this.value; aplicarAjustes(true); });
        alAccionar(r, { volver: cerrar });
      }, esc: cerrar };
  }

  /* ---------- modo directo ---------- */
  function pDirecto() {
    return { id: "directo", foco: ".salto button:not([aria-disabled='true']), [data-acc='volver']",
      html: function () {
        var enJuego = E._enJuego || G.existe();
        return '<h2 id="pnl-titulo">MODO DIRECTO · SALTO DE RETOS</h2><p class="sub">Abre cualquier terminal sin recorrer el mapa. Pensado para navegación accesible y demostraciones en clase.' + (enJuego ? "" : " Se iniciará una partida nueva.") + "</p>" +
          '<div class="salto">' + M.ORDEN.map(function (k) {
            var lista = M.estaciones.filter(function (o) { return o.zona === k && retoDe(o.id); });
            return '<section><h3 style="color:' + A.TEMAS[k].acento + '">' + esc(M.SECTORES[k].nombre) + "</h3><ul>" + lista.map(function (o) {
              var ok = E._enJuego && E.fixed[o.id], r = retoDe(o.id);
              return '<li><button class="btn" type="button" data-ir="' + esc(o.id) + '"' + (ok ? ' aria-disabled="true"' : "") + ">" + (ok ? '<span class="estado-ok">✔</span>' : '<span class="estado-pend">●</span>') + " " + esc(o.def.nombre) + ' <span class="sub">' + esc(r.unidad) + (ok ? " · estable" : "") + "</span></button></li>";
            }).join("") + "</ul></section>";
          }).join("") + '</div><div class="fila"><button class="btn" type="button" data-acc="volver">VOLVER [ESC]</button></div>';
      },
      enlazar: function (r) {
        alAccionar(r, { volver: cerrar });
        Array.prototype.forEach.call(r.querySelectorAll("[data-ir]"), function (b) {
          b.addEventListener("click", function () { if (b.getAttribute("aria-disabled") === "true") { S.sfx("cancelar"); return; } irATerminal(b.getAttribute("data-ir")); });
        });
      }, esc: cerrar };
  }
  function teletransportar(o) {
    var c = M.junto(o)[0]; if (!c) return false;
    colocarJugador((c.x + 0.5) * T, (c.y + 0.5) * T + 4, c.dir); return true;
  }
  function irATerminal(id) {
    var o = estacionDe(id); if (!o) return;
    if (!E._enJuego) { if (!cargarPartida()) { nuevaPartida(); E.introVista = true; } entrarAlJuego(false); if (modo !== "explorar") return; }
    else { pila = []; var p = $("pantalla"); p.hidden = true; p.innerHTML = ""; $("app").removeAttribute("aria-hidden"); $("app").inert = false; modo = "explorar"; }
    if (dlg) { dlg = null; $("dialogo").hidden = true; modo = "explorar"; }
    teletransportar(o); transicion = null; fundido = 0; cambiarZonaCamara(zonaActual);
    abrirTerminal(id, true);
  }

  /* ---------- terminal ---------- */
  var ses = null, escribiendoTerm = null, celebrar = null;
  function abrirTerminal(id, sinEfecto) {
    var r = retoDe(id); if (!r) return;
    if (E.hp <= 0) { abrir(pApagado()); return; }
    S.sfx("abrir");
    var hacer = function () { modo = "explorar"; ses = { id: id, sel: primeraDisponible(id) }; if (!E.fixed[id]) E.trail.push({ t: segundos(), id: id, ev: "open" }); abrir(pTerminal(id)); };
    if (sinEfecto || aj.calma) hacer(); else { modo = "transicion"; efecto = { tipo: "barrido", t: 0, dur: 0.32, luego: hacer }; }
  }
  function primeraDisponible(id) { var q = E.burned[id] || []; for (var i = 0; i < 4; i++) if (q.indexOf(i) < 0) return i; return 0; }
  function opcionHTML(r, o, i) {
    var inner;
    if (r.diagramas) {
      var lbl = "Diagrama: " + o.cajas.join(o.flechas ? ", luego " : "; ") + (o.flechas ? "." : ". Cuadros sueltos, sin flechas.");
      inner = '<span class="sr-only">' + esc(lbl) + '</span><span class="flujo' + (o.flechas ? "" : " suelto") + '" aria-hidden="true">' + o.cajas.map(function (b, j) { return (j && o.flechas ? '<span class="fl">↓</span>' : "") + '<span class="paso">' + esc(b) + "</span>"; }).join("") + "</span>";
    } else if (r.codigo) inner = "<code>" + esc(o) + "</code>";
    else inner = esc(o);
    return '<div class="op" role="radio" data-i="' + i + '" aria-checked="false" tabindex="-1"><span class="cursor" aria-hidden="true"></span><span class="letra" aria-hidden="true">[' + LETRAS[i] + ']</span><span class="txt"><span class="sr-only">Opción ' + LETRAS[i] + ": </span>" + inner + "</span></div>";
  }
  function medidores(id) {
    var ok = !!E.fixed[id];
    return '<div class="medidores"><div class="medidor"><span id="m-est">ESTABILIDAD</span><div class="barra estab' + (ok ? " verde" : "") + '" role="progressbar" aria-labelledby="m-est" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + (ok ? 100 : 15) + '" id="t-estab"><i style="width:' + (ok ? 100 : 15) + '%"></i></div><span id="t-estab-v">' + (ok ? 100 : 15) + "%</span></div>" +
      '<div class="medidor"><span id="m-en">ENERGÍA</span><div class="barra" role="progressbar" aria-labelledby="m-en" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + E.hp + '" id="t-en"><i style="width:' + E.hp + '%"></i></div><span id="t-en-v">' + E.hp + "/100</span></div></div>";
  }
  function pTerminal(id) {
    var r = retoDe(id), o = estacionDe(id), cat = B.categoria(r.categoria), sec = M.SECTORES[o.zona];
    return { id: "terminal", musica: "terminal", foco: "#t-titulo", describe: "t-completo",
      html: function () {
        var ok = !!E.fixed[id];
        return '<div class="term-cab"><canvas id="t-icono" width="24" height="24" aria-hidden="true"></canvas><div><h2 id="pnl-titulo"><span id="t-titulo" tabindex="-1">' + esc(o.def.nombre.toUpperCase()) + '</span></h2><p class="sub">' + esc(sec.nombre) + " · " + esc(r.unidad) + " · " + esc(cat ? cat.nombre : "") + (r.eps ? " · entrada → proceso → salida" : "") + "</p></div>" +
          '<button class="btn" type="button" id="t-salir">' + (ok ? "VOLVER AL MAPA" : "RETIRARSE") + ' <span class="tecla">[ESC]</span></button></div>' + medidores(id) +
          '<div class="caja texto-term" id="t-caja"><p class="sr-only" id="t-completo">' + esc(o.def.log) + " " + esc(r.pregunta) + '</p><p class="log" aria-hidden="true" id="t-log"></p><p class="preg" aria-hidden="true" id="t-preg"></p></div>' +
          '<div class="opciones esperando" id="t-ops" role="radiogroup" aria-label="Comandos disponibles">' + r.opciones.map(function (op, i) { return opcionHTML(r, op, i); }).join("") + "</div>" +
          '<div class="fila" id="t-acc"><button class="btn primario" type="button" id="t-ejecutar">EJECUTAR COMANDO <span class="tecla">[ENTER]</span></button><span class="confirma" id="t-conf" aria-live="polite"></span></div>' +
          '<div id="t-resultado"></div>';
      },
      enlazar: function (raiz) {
        dibujarIcono();
        var ops = raiz.querySelectorAll(".op");
        Array.prototype.forEach.call(ops, function (el) {
          el.addEventListener("click", function () { if (escribiendoTerm) { completarTerminal(); return; } var i = +el.getAttribute("data-i"); if (ses.sel === i && ses.explicita) ejecutar(i); else seleccionar(i, true); });
        });
        raiz.querySelector("#t-ops").addEventListener("keydown", function (e) {
          if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); mover(1); }
          else if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); mover(-1); }
          else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ejecutar(ses.sel); }
        });
        raiz.querySelector("#t-caja").addEventListener("click", function () { if (escribiendoTerm) completarTerminal(); });
        raiz.querySelector("#t-ejecutar").addEventListener("click", function () { if (escribiendoTerm) { completarTerminal(); return; } ejecutar(ses.sel); });
        raiz.querySelector("#t-salir").addEventListener("click", salirTerminal);
        var log = "* " + o.def.log, preg = r.pregunta;
        if (E.fixed[id]) { mostrarResuelta(); return; }
        escribiendoTerm = { log: log, preg: preg, n: 0 };
        if (velocidad() === Infinity) completarTerminal();
      },
      teclas: function (e) {
        if (escribiendoTerm && (ACCION.indexOf(e.code) >= 0 || /^(Digit|Numpad)[1-4]$/.test(e.code) || /^Key[A-D]$/.test(e.code))) { if (e.target.tagName !== "BUTTON" || e.target.id === "t-ejecutar") { e.preventDefault(); completarTerminal(); } return; }
        if (!ses || E.fixed[ses.id] || ses.bloqueada) return;
        var i = -1;
        if (/^(Digit|Numpad)[1-4]$/.test(e.code)) i = +e.code.slice(-1) - 1; else if (/^Key[A-D]$/.test(e.code)) i = e.code.charCodeAt(3) - 65;
        if (i >= 0) { e.preventDefault(); seleccionar(i, true); }
      },
      esc: function () { salirTerminal(); } };
  }
  function dibujarIcono() {
    var cvI = $("t-icono"); if (!cvI || !ses) return; var o = estacionDe(ses.id);
    var img = A.objeto(o.tipo, { est: E.fixed[ses.id] ? "ok" : "pend", color: o.aux ? A.TEMAS[o.zona].acento : null });
    var lado = Math.max(img.width, img.height); cvI.width = lado; cvI.height = lado;
    var c = cvI.getContext("2d"); c.imageSmoothingEnabled = false; c.clearRect(0, 0, lado, lado); c.drawImage(img, Math.floor((lado - img.width) / 2), Math.floor((lado - img.height) / 2));
  }
  function escribirTerminal(dt) {
    var w = escribiendoTerm, antes = Math.floor(w.n); w.n += dt * velocidad() * 2;
    var total = w.log.length + 1 + w.preg.length, n = Math.min(total, Math.floor(w.n));
    if (n !== antes) {
      var a = Math.min(n, w.log.length), b = Math.max(0, n - w.log.length - 1);
      var lg = $("t-log"), pr = $("t-preg"); if (!lg) { escribiendoTerm = null; return; }
      lg.textContent = w.log.slice(0, a); pr.textContent = w.preg.slice(0, b);
      if (n % 3 === 0) S.voz(300);
    }
    if (n >= total) completarTerminal();
  }
  function completarTerminal() {
    var w = escribiendoTerm; escribiendoTerm = null;
    var lg = $("t-log"), pr = $("t-preg"); if (!lg || !w) return;
    lg.textContent = w.log; pr.textContent = w.preg;
    $("t-ops").classList.remove("esperando");
    pintarOpciones(); seleccionar(ses.sel, false);
    var el = document.querySelector('.op[data-i="' + ses.sel + '"]'); if (el) el.focus({ preventScroll: true });
  }
  function pintarOpciones() {
    var q = E.burned[ses.id] || [], ok = !!E.fixed[ses.id], r = retoDe(ses.id);
    Array.prototype.forEach.call(document.querySelectorAll("#t-ops .op"), function (el) {
      var i = +el.getAttribute("data-i"), quem = q.indexOf(i) >= 0;
      el.classList.toggle("quemada", quem); el.classList.toggle("correcta", ok && i === r.correcta);
      if (quem || ok || ses.bloqueada) el.setAttribute("aria-disabled", "true"); else el.removeAttribute("aria-disabled");
      var sr = el.querySelector(".sr-estado"); if (sr) sr.remove();
      if (quem) el.querySelector(".txt").insertAdjacentHTML("beforeend", '<span class="sr-only sr-estado"> (comando fallido)</span>');
      if (ok && i === r.correcta) el.querySelector(".txt").insertAdjacentHTML("beforeend", '<span class="sr-only sr-estado"> (comando correcto)</span>');
    });
  }
  function seleccionar(i, sonido) {
    if (!ses || E.fixed[ses.id] || ses.bloqueada) return;
    if ((E.burned[ses.id] || []).indexOf(i) >= 0) { if (sonido) { S.sfx("cancelar"); $("t-conf").textContent = "El comando [" + LETRAS[i] + "] ya falló. Elige otro."; } return; }
    ses.sel = i; ses.explicita = !!sonido;
    Array.prototype.forEach.call(document.querySelectorAll("#t-ops .op"), function (el) { var k = +el.getAttribute("data-i"); el.setAttribute("aria-checked", k === i ? "true" : "false"); el.tabIndex = k === i ? 0 : -1; });
    var el = document.querySelector('.op[data-i="' + i + '"]'); if (el && sonido) el.focus({ preventScroll: true });
    if (sonido) S.sfx("mover");
    $("t-conf").textContent = "Seleccionado: [" + LETRAS[i] + "]. " + (tactilActivo() ? "Toca de nuevo la opción o EJECUTAR para confirmar." : "Presiona Enter, haz clic de nuevo o pulsa EJECUTAR para confirmar.");
  }
  function mover(d) {
    var q = E.burned[ses.id] || [], i = ses.sel;
    for (var k = 0; k < 4; k++) { i = (i + d + 4) % 4; if (q.indexOf(i) < 0) break; }
    seleccionar(i, true);
  }
  function ejecutar(i) {
    if (!ses || escribiendoTerm || ses.bloqueada) return;
    var id = ses.id, r = retoDe(id);
    if (E.fixed[id] || (E.burned[id] || []).indexOf(i) >= 0 || E.hp <= 0) return;
    var ok = i === r.correcta;
    E.tries[id] = (E.tries[id] || 0) + 1;
    if (!(id in E.first)) E.first[id] = ok;
    var res = $("t-resultado"), pnl = document.querySelector("#pantalla .pnl");
    if (ok) {
      var gana = E.tries[id] === 1 ? 100 : 50;
      E.fixed[id] = true; E.res += gana;
      E.trail.push({ t: segundos(), id: id, ev: "fix", n: E.tries[id] });
      E.terminado = terminado();
      guardarAhora(); S.sfx("exito"); celebrar = id;
      var est = $("t-estab"); est.classList.add("verde"); est.firstChild.style.width = "100%"; est.setAttribute("aria-valuenow", "100"); $("t-estab-v").textContent = "100%";
      dibujarIcono(); pintarOpciones();
      $("t-ejecutar").hidden = true; $("t-conf").textContent = "";
      res.innerHTML = '<div class="caja verde resultado"><h3 id="t-res-h" tabindex="-1">* TERMINAL ESTABILIZADA · +' + gana + " RECURSOS</h3>" +
        "<p>* El comando [" + LETRAS[i] + "] funcionó" + (E.tries[id] === 1 ? " al primer intento." : " en el intento " + E.tries[id] + ".") + "</p>" +
        "<h4>POR QUÉ FUNCIONÓ</h4><p>" + esc(r.retro) + '</p><p class="fuente"><b>Fuente:</b> ' + esc(r.fuente) + "</p>" +
        '<div class="fila">' + (terminado() ? '<button class="btn primario" type="button" id="t-informe">VER INFORME DE DESEMPEÑO</button>' : "") + '<button class="btn' + (terminado() ? "" : " primario") + '" type="button" id="t-volver">VOLVER AL MAPA <span class="tecla">[ESC]</span></button></div></div>';
      $("t-volver").addEventListener("click", salirTerminal);
      if ($("t-informe")) $("t-informe").addEventListener("click", function () { celebrar = null; pila = []; abrir(pInforme()); });
      $("t-salir").firstChild.textContent = "VOLVER AL MAPA ";
      actualizarHUD(); $("t-res-h").focus();
      anunciar("Terminal estabilizada. Más " + gana + " recursos.", true);
    } else {
      (E.burned[id] = E.burned[id] || []).push(i);
      E.errores++; E.hp = Math.max(0, E.hp - 25);
      E.trail.push({ t: segundos(), id: id, ev: "fail", cmd: LETRAS[i] });
      guardarAhora(); S.sfx("error");
      var muerto = E.hp === 0;
      var en = $("t-en"); en.firstChild.style.width = E.hp + "%"; en.setAttribute("aria-valuenow", E.hp); $("t-en-v").textContent = E.hp + "/100";
      if (!aj.calma && pnl) { pnl.classList.remove("sacude"); void pnl.offsetWidth; pnl.classList.add("sacude"); var pa = $("pantalla"); pa.classList.remove("destello-rojo"); void pa.offsetWidth; pa.classList.add("destello-rojo"); }
      if (muerto) ses.bloqueada = true;
      pintarOpciones();
      res.innerHTML = '<div class="caja roja resultado"><h3 id="t-res-h" tabindex="-1">* REPORTE DE INCIDENTE · −25 ENERGÍA</h3><dl>' +
        "<dt>Comando</dt><dd>[" + LETRAS[i] + "]</dd><dt>Resultado</dt><dd>La terminal sigue con la falla.</dd>" +
        "<dt>Diagnóstico</dt><dd>" + esc(r.retro) + "</dd>" +
        "<dt>Siguiente paso</dt><dd>" + (muerto ? "Energía agotada: el sistema debe reiniciarse. Las terminales reparadas siguen reparadas y los comandos fallidos quedan registrados." : "Lee el diagnóstico y ejecuta otro comando.") + "</dd></dl>" +
        '<p class="fuente"><b>Fuente:</b> ' + esc(r.fuente) + "</p>" + (muerto ? '<div class="fila"><button class="btn primario" type="button" id="t-reinicio">REINICIAR SISTEMA</button></div>' : "") + "</div>";
      if (muerto) { $("t-ejecutar").hidden = true; $("t-conf").textContent = ""; $("t-reinicio").addEventListener("click", function () { reemplazar(pApagado()); }); }
      else { var sig = primeraDisponible(id); seleccionar(sig, false); $("t-conf").textContent = "Comando [" + LETRAS[i] + "] fallido. Seleccionado ahora: [" + LETRAS[sig] + "]."; }
      actualizarHUD(); $("t-res-h").focus();
      anunciar("Comando fallido. Energía " + E.hp + " de 100.", true);
    }
  }
  function salirTerminal() {
    if (!ses) { cerrar(); return; }
    if (E.hp <= 0 && !E.fixed[ses.id]) { reemplazar(pApagado()); return; }
    if (!E.fixed[ses.id]) E.trail.push({ t: segundos(), id: ses.id, ev: "leave" });
    escribiendoTerm = null; ses = null; guardarAhora();
    cerrar();
  }
  function festejar(id) {
    var o = estacionDe(id); if (!o) return;
    S.sfx("recurso");
    var gana = E.tries[id] === 1 ? 100 : 50;
    flotantes.push({ x: o.cx, y: o.ty * T - 14, txt: "+" + gana, col: "#ffe74a", t: 1.6 });
    if (!aj.calma) for (var i = 0; i < 18; i++) particulas.push({ x: o.cx, y: o.cy - 8, vx: (Math.random() - 0.5) * 70, vy: -Math.random() * 60 - 10, t: 0.6 + Math.random() * 0.6, col: ["#7fe0a0", "#ffe74a", "#ffffff"][i % 3] });
    var i2 = infoSector(o.zona); if (i2.estable) { anunciar(i2.nombre + " quedó estable. Se encendieron las luces del sector."); flotantes.push({ x: o.cx, y: o.ty * T - 26, txt: "SECTOR ESTABLE", col: "#7fe0a0", t: 2.2 }); }
    if (terminado() && !E.informeVisto) { E.informeVisto = true; guardarAhora(); setTimeout(function () { if (modo === "explorar") abrir(pInforme()); }, aj.calma ? 50 : 900); }
  }

  /* ---------- energía agotada ---------- */
  function pApagado() {
    return { id: "apagado", musica: "apagado", foco: "[data-acc='reiniciar']",
      html: function () { return '<div class="caja roja" style="text-align:center;padding:28px"><h2 id="pnl-titulo">SISTEMA APAGADO</h2><p style="margin-top:14px">* La energía llegó a 0.</p><p>* No te desconectes: reinicia y vuelve a intentarlo. Tus reparaciones siguen guardadas.</p><p class="sub" style="margin-top:10px">Reinicios hasta ahora: ' + E.reinicios + "</p></div>" + menuHTML([{ id: "reiniciar", txt: "REINICIAR SISTEMA" }], "Reinicio"); },
      enlazar: function (r) { alAccionar(r, { reiniciar: reiniciarSistema }); },
      esc: function () { reiniciarSistema(); } };
  }
  function reiniciarSistema() {
    E.reinicios++; E.hp = 100; E.trail.push({ t: segundos(), ev: "reboot" }); ses = null; escribiendoTerm = null;
    guardarAhora(); S.sfx("reinicio"); actualizarHUD(); anunciar("Sistema reiniciado. Energía 100 de 100.", true);
    pila = [pila[pila.length - 1]]; cerrar();
  }

  /* ---------- banco de retos ---------- */
  var vistaPrevia = null;
  function pBanco() {
    return { id: "banco", foco: "[data-acc='volver']",
      html: function () {
        var ex = B.extras();
        var prev = "";
        if (vistaPrevia) {
          var v = vistaPrevia;
          prev = '<section class="caja ' + (v.errorGeneral || !v.validos.length ? "roja" : "amarilla") + '" aria-labelledby="vp-h"><h3 id="vp-h" tabindex="-1">VISTA PREVIA DE LA IMPORTACIÓN</h3>' +
            (v.errorGeneral ? "<p>" + esc(v.errorGeneral) + "</p>" :
              "<p>Válidos: " + v.validos.length + " · Con errores: " + v.invalidos.length + "</p>" +
              (v.validos.length ? '<div class="tabla-wrap"><table><caption class="sr-only">Retos válidos</caption><thead><tr><th scope="col">ID</th><th scope="col">UNIDAD</th><th scope="col">SECTOR</th><th scope="col">PREGUNTA</th><th scope="col">CORRECTA</th></tr></thead><tbody>' + v.validos.map(function (r) { return "<tr><td>" + esc(r.id) + "</td><td>" + esc(r.unidad) + "</td><td>" + esc(B.categoria(r.categoria).nombre) + "</td><td>" + esc(r.pregunta.slice(0, 90)) + (r.pregunta.length > 90 ? "…" : "") + "</td><td>" + LETRAS[r.correcta] + "</td></tr>"; }).join("") + "</tbody></table></div>" : "") +
              (v.invalidos.length ? "<h4>Con errores (no se agregarán)</h4><ul>" + v.invalidos.map(function (x) { return "<li>#" + x.indice + " «" + esc(x.id) + '»<ul class="lista-err">' + x.errores.map(function (er) { return "<li>" + esc(er) + "</li>"; }).join("") + "</ul></li>"; }).join("") + "</ul>" : "")) +
            (v.avisos.length ? "<h4>Avisos</h4><ul>" + v.avisos.map(function (a) { return "<li>" + esc(a) + "</li>"; }).join("") + "</ul>" : "") +
            '<div class="fila"><button class="btn primario" type="button" data-acc="aplicar"' + (v.validos.length && !v.errorGeneral ? "" : ' aria-disabled="true"') + ">AGREGAR " + v.validos.length + ' RETOS VÁLIDOS</button><button class="btn" type="button" data-acc="descartar">DESCARTAR</button></div></section>';
        }
        return '<h2 id="pnl-titulo">BANCO DE RETOS</h2>' +
          '<div class="caja"><p>Originales: ' + B.originales().length + " · Importados: " + ex.length + " · Total en juego: " + RETOS.length + '</p><p class="sub" style="margin-top:6px">Los retos importados aparecen como terminales auxiliares en su sector (hasta ' + B.CUPO + " por sector) y se guardan en este navegador. Formato: JSON con la estructura de bancos/ejemplo-ampliacion.json.</p></div>" +
          '<fieldset><legend>IMPORTAR</legend><div class="fila"><label class="btn" for="b-archivo">ELEGIR ARCHIVO .JSON</label><input type="file" id="b-archivo" accept=".json,application/json" class="sr-only"></div>' +
          '<p class="sub" style="margin:10px 0 6px"><label for="b-texto">O pega el contenido JSON:</label></p><textarea id="b-texto" spellcheck="false" placeholder=\'{ "formato": "depurador-tic-banco", "version": 1, "retos": [ … ] }\'></textarea>' +
          '<div class="fila" style="margin-top:10px"><button class="btn" type="button" data-acc="validar">VALIDAR TEXTO PEGADO</button></div></fieldset>' + prev +
          '<fieldset><legend>EXPORTAR</legend><div class="fila"><button class="btn" type="button" data-acc="exportar">DESCARGAR BANCO COMPLETO (.JSON)</button><button class="btn" type="button" data-acc="plantilla">DESCARGAR PLANTILLA DE EJEMPLO</button></div></fieldset>' +
          (ex.length ? '<fieldset><legend>RETOS IMPORTADOS</legend><ul class="repaso">' + ex.map(function (r) { return "<li>" + esc(r.id) + " · " + esc(r.unidad) + " · " + esc(B.categoria(r.categoria).nombre) + ' — <button class="btn" type="button" data-quitar="' + esc(r.id) + '">QUITAR</button></li>'; }).join("") + '</ul><div class="fila" style="margin-top:10px"><button class="btn" type="button" data-acc="restaurar">RESTAURAR BANCO ORIGINAL</button></div></fieldset>' : "") +
          '<p class="sub" role="status" id="b-estado"></p><div class="fila"><button class="btn" type="button" data-acc="volver">VOLVER [ESC]</button></div>';
      },
      enlazar: function (r) {
        var estado = r.querySelector("#b-estado");
        r.querySelector("#b-archivo").addEventListener("change", function () {
          var f = this.files && this.files[0]; if (!f) return;
          if (f.size > 512 * 1024) { estado.textContent = "El archivo pesa más de 512 KB."; return; }
          var lr = new FileReader(); lr.onload = function () { vistaPrevia = B.validarTexto(String(lr.result)); pintarPantalla(false); var h = $("vp-h"); if (h) h.focus(); }; lr.onerror = function () { estado.textContent = "No se pudo leer el archivo."; }; lr.readAsText(f);
        });
        alAccionar(r, {
          validar: function () { var t = r.querySelector("#b-texto").value; if (!t.trim()) { estado.textContent = "Pega primero el contenido JSON."; return; } vistaPrevia = B.validarTexto(t); pintarPantalla(false); var h = $("vp-h"); if (h) h.focus(); },
          aplicar: function () { if (!vistaPrevia || !vistaPrevia.validos.length) return; var n = vistaPrevia.validos.length; B.agregar(vistaPrevia.validos); vistaPrevia = null; recargarBanco(); pintarPantalla(false); $("b-estado").textContent = "* Se agregaron " + n + " retos. Ya están en el mapa como terminales auxiliares."; S.sfx("guardar"); },
          descartar: function () { vistaPrevia = null; pintarPantalla(false); },
          exportar: function () { descargar("depurador-tic-banco.json", JSON.stringify(B.exportar(), null, 2), "application/json"); estado.textContent = "* Banco exportado."; },
          plantilla: function () { descargar("depurador-tic-plantilla.json", JSON.stringify(PLANTILLA, null, 2), "application/json"); estado.textContent = "* Plantilla descargada."; },
          restaurar: function () { abrir(pConfirmar("¿Quitar todos los retos importados? Los 16 originales no se modifican.", function () { B.restaurar(); recargarBanco(); cerrar(); })); },
          volver: function () { vistaPrevia = null; cerrar(); }
        });
        Array.prototype.forEach.call(r.querySelectorAll("[data-quitar]"), function (b) { b.addEventListener("click", function () { B.quitar(b.getAttribute("data-quitar")); recargarBanco(); pintarPantalla(false); $("b-estado").textContent = "* Reto quitado."; }); });
      },
      esc: function () { vistaPrevia = null; cerrar(); } };
  }
  function recargarBanco() {
    M.colocarAuxiliares(B.extras());
    RETOS = B.todos().filter(function (r) { return !!estacionDe(r.id); });
    var validos = ids();
    if (E._enJuego || G.existe()) {
      var base = E._enJuego ? E : null;
      if (base) { try { var limpio = G.sanear(JSON.parse(JSON.stringify(Object.assign({}, base, { _enJuego: undefined }))), validos); limpio._enJuego = true; E = limpio; E.terminado = terminado(); guardarAhora(); } catch (e) { avisos.push("No se pudo ajustar la partida al banco nuevo: " + e.message); } }
    }
    if (!M.libre(jugador.x, jugador.y)) { var o = M.inicio; colocarJugador(o.x, o.y, "abajo"); }
    actualizarHUD();
  }
  var PLANTILLA = { formato: "depurador-tic-banco", version: 1, retos: [{ id: "EJ-1", unidad: "U4", categoria: "ofi", titulo: "Promedio de notas", terminal: "Planilla de notas", log: "La planilla no calcula el promedio del curso.", pregunta: "Las notas están en B2:B10. ¿Qué fórmula calcula su promedio?", opciones: ["=PROMEDIO(B2:B10)", "=SUMA(B2:B10)", "=CONTAR(B2:B10)", "=MAX(B2:B10)"], correcta: 0, retro: "PROMEDIO suma los valores del rango y divide por la cantidad de valores. SUMA solo suma, CONTAR cuenta celdas con números y MAX devuelve el mayor.", fuente: "Ejemplo de plantilla: reemplazar por la fuente del material de clase." }] };
  function descargar(nombre, contenido, tipo) {
    try { var b = new Blob([contenido], { type: tipo + ";charset=utf-8" }), u = URL.createObjectURL(b), a = document.createElement("a"); a.href = u; a.download = nombre; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(u); a.remove(); }, 500); return true; }
    catch (e) { return false; }
  }

  /* ---------- informe de desempeño ---------- */
  function datosInforme() {
    var total = RETOS.length, res = reparadas(), intentos = 0, primer = 0;
    RETOS.forEach(function (r) { intentos += E.tries[r.id] || 0; if (E.first[r.id] === true) primer++; });
    var unidades = {};
    RETOS.forEach(function (r) {
      var u = unidades[r.unidad] = unidades[r.unidad] || { unidad: r.unidad, retos: 0, resueltos: 0, primer: 0, errores: 0, temas: {} };
      u.retos++; if (E.fixed[r.id]) u.resueltos++; if (E.first[r.id] === true) u.primer++; u.errores += (E.burned[r.id] || []).length;
      var c = B.categoria(r.categoria); if (c) u.temas[c.nombre] = 1;
    });
    var lista = Object.keys(unidades).sort(function (a, b) { return (+a.slice(1)) - (+b.slice(1)); }).map(function (k) { return unidades[k]; });
    var repaso = RETOS.filter(function (r) { return E.first[r.id] === false || !E.fixed[r.id]; });
    return { total: total, resueltas: res, primer: primer, errores: E.errores, intentos: intentos, precision: intentos ? Math.round(res / intentos * 100) : 0, ms: E.ms, recursos: E.res, reinicios: E.reinicios, unidades: lista, repaso: repaso, completo: res === total };
  }
  function textoEvento(e) {
    if (e.ev === "reboot") return { txt: "Reinicio del sistema por energía agotada", cls: "mal-t" };
    var o = estacionDe(e.id), n = o ? o.def.nombre + " (" + M.SECTORES[o.zona].nombre + ")" : e.id;
    if (e.ev === "fix") return { txt: n + " · estabilizada " + (e.n === 1 ? "al primer comando" : "al intento " + e.n), cls: "ok-t" };
    if (e.ev === "fail") return { txt: n + " · comando [" + e.cmd + "] fallido", cls: "mal-t" };
    return { txt: n + " · retirada sin reparar", cls: "" };
  }
  function pInforme() {
    return { id: "informe", musica: "informe", foco: "#pnl-titulo",
      html: function () {
        var d = datosInforme();
        if (d.completo && E._enJuego && !E.informeVisto) { E.informeVisto = true; guardarAhora(); }
        var filas = d.unidades.map(function (u) { var prec = u.resueltos ? Math.round(u.resueltos / (u.resueltos + u.errores) * 100) : 0; return "<tr><th scope=\"row\">" + esc(u.unidad) + "</th><td>" + esc(Object.keys(u.temas).join(", ")) + '</td><td class="num">' + u.resueltos + "/" + u.retos + '</td><td class="num">' + u.primer + '</td><td class="num">' + u.errores + '</td><td class="num">' + prec + "%</td></tr>"; }).join("");
        var reg = E.trail.filter(function (e) { return e.ev !== "open"; }).map(function (e) { var t = textoEvento(e); return "<li><time>" + mmss(e.t * 1000) + '</time> · <span class="' + t.cls + '">' + esc(t.txt) + "</span></li>"; }).join("");
        return '<h2 id="pnl-titulo" tabindex="-1">INFORME DE DESEMPEÑO' + (d.completo ? "" : " (PARCIAL)") + "</h2>" +
          "<p>" + (d.completo ? "* Las " + d.total + " terminales del sistema quedaron estables." : "* Van " + d.resueltas + " de " + d.total + " terminales estables. El informe se completa al terminar.") + "</p>" +
          '<dl class="kpis"><div class="kpi"><dt>RESUELTAS</dt><dd>' + d.resueltas + "/" + d.total + '</dd></div><div class="kpi"><dt>ACIERTOS AL PRIMER INTENTO</dt><dd>' + d.primer + '</dd></div><div class="kpi"><dt>ERRORES</dt><dd>' + d.errores + '</dd></div><div class="kpi"><dt>PRECISIÓN</dt><dd>' + d.precision + '%</dd></div><div class="kpi"><dt>TIEMPO</dt><dd>' + mmss(d.ms) + '</dd></div><div class="kpi"><dt>RECURSOS</dt><dd>' + d.recursos + '</dd></div><div class="kpi"><dt>REINICIOS</dt><dd>' + d.reinicios + "</dd></div></dl>" +
          '<p class="sub">Precisión = comandos correctos ÷ comandos ejecutados (' + d.resueltas + " ÷ " + d.intentos + ").</p>" +
          "<h3>DESEMPEÑO POR UNIDAD</h3>" + '<div class="tabla-wrap"><table><caption class="sr-only">Desempeño por unidad</caption><thead><tr><th scope="col">UNIDAD</th><th scope="col">TEMA</th><th scope="col" class="num">RESUELTAS</th><th scope="col" class="num">1.er INTENTO</th><th scope="col" class="num">ERRORES</th><th scope="col" class="num">PRECISIÓN</th></tr></thead><tbody>' + filas + "</tbody></table></div>" +
          "<h3>CONTENIDOS PARA REPASAR</h3>" + (d.repaso.length ? '<ul class="repaso">' + d.repaso.map(function (r) { var c = B.categoria(r.categoria); return "<li><b>" + esc(r.unidad) + " · " + esc(r.titulo || r.id) + "</b> — " + esc(c ? c.detalle : "") + (E.fixed[r.id] ? "" : " (sin resolver)") + '<br><span class="sub">Fuente: ' + esc(r.fuente) + "</span></li>"; }).join("") + "</ul>" : "<p>* Todo se resolvió al primer intento. ¡Excelente!</p>") +
          "<h3>REGISTRO DEL RECORRIDO TÉCNICO</h3>" + (reg ? '<ol class="registro">' + reg + "</ol>" : "<p>* Todavía no hay eventos.</p>") +
          '<div class="fila no-imprimir"><button class="btn primario" type="button" data-acc="imprimir">IMPRIMIR / PDF</button><button class="btn" type="button" data-acc="csv">EXPORTAR CSV</button><button class="btn" type="button" data-acc="json">EXPORTAR JSON</button></div>' +
          '<p class="sub no-imprimir" role="status" id="inf-estado"></p>' +
          '<div class="fila no-imprimir"><button class="btn" type="button" data-acc="volver">' + (E._enJuego ? "SEGUIR EXPLORANDO" : "VOLVER") + ' [ESC]</button><button class="btn" type="button" data-acc="nueva">NUEVA PARTIDA</button></div>';
      },
      enlazar: function (r) {
        alAccionar(r, {
          imprimir: function () { window.print(); },
          csv: function () { var ok = descargar("informe-depurador-tic.csv", csvInforme(), "text/csv"); $("inf-estado").textContent = ok ? "* CSV descargado." : "* No se pudo descargar."; },
          json: function () { var d = datosInforme(); d.version = VERSION; d.fecha = new Date().toISOString(); d.registro = E.trail; d.retos = RETOS.map(function (x) { return { id: x.id, unidad: x.unidad, reparada: !!E.fixed[x.id], intentos: E.tries[x.id] || 0, primerIntento: E.first[x.id] === true, fallidos: (E.burned[x.id] || []).map(function (i) { return LETRAS[i]; }) }; }); delete d.repaso; d.repaso = datosInforme().repaso.map(function (x) { return x.id; }); var ok = descargar("informe-depurador-tic.json", JSON.stringify(d, null, 2), "application/json"); $("inf-estado").textContent = ok ? "* JSON descargado." : "* No se pudo descargar."; },
          volver: function () { cerrar(); },
          nueva: function () { abrir(pConfirmar("¿Empezar una partida nueva? Se borrará el progreso actual.", function () { pila = []; nuevaPartida(); entrarAlJuego(true); })); }
        });
      },
      esc: function () { cerrar(); } };
  }
  function csvInforme() {
    function c(v) { v = String(v == null ? "" : v); return /[",;\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
    var filas = [["id", "unidad", "tema", "terminal", "sector", "estado", "intentos", "primer_intento_correcto", "comandos_fallidos"]];
    RETOS.forEach(function (r) { var o = estacionDe(r.id), cat = B.categoria(r.categoria); filas.push([r.id, r.unidad, cat ? cat.detalle : "", o.def.nombre, M.SECTORES[o.zona].nombre, E.fixed[r.id] ? "estable" : "con falla", E.tries[r.id] || 0, E.first[r.id] === true ? "si" : "no", (E.burned[r.id] || []).map(function (i) { return LETRAS[i]; }).join(" ")]); });
    var d = datosInforme();
    filas.push([]); filas.push(["resumen", "resueltas", d.resueltas + "/" + d.total, "errores", d.errores, "precision", d.precision + "%", "tiempo", mmss(d.ms)]);
    filas.push(["", "recursos", d.recursos, "reinicios", d.reinicios]);
    return "﻿" + filas.map(function (f) { return f.map(c).join(","); }).join("\n");
  }

  /* ---------- créditos ---------- */
  function pCreditos() {
    return { id: "creditos", foco: "[data-acc='volver']",
      html: function () {
        return '<h2 id="pnl-titulo"><button type="button" class="titulo-boton" id="cred-titulo" aria-label="Créditos">CRÉDITOS</button></h2>' +
          '<div class="caja"><h3>EQUIPO</h3><ul class="repaso" style="margin-top:8px"><li>Ernesto Coronel</li><li>José Daniel</li><li>Josué Villalba</li><li>Lucas Orué</li></ul></div>' +
          '<div class="caja"><p>* DEPURADOR TIC · Desafío TIC 2026</p><p>* Tecnologías de la Información y la Comunicación · Universidad Columbia del Paraguay.</p><p>* Contenidos: materiales de clase de la cátedra (ver la ficha técnica y las fuentes de cada reto).</p><p>* Arte, tipografía «Depurador Pixel», música y efectos: originales, creados para este proyecto con asistencia de IA (Claude).</p><p>* Inspiración estética: los RPG clásicos en pixel art. No se usa ningún recurso de otros juegos.</p></div>' +
          '<div class="fila"><button class="btn" type="button" data-acc="volver">VOLVER [ESC]</button></div>';
      },
      enlazar: function (r) {
        alAccionar(r, { volver: cerrar });
        var clics = 0;
        r.querySelector("#cred-titulo").addEventListener("click", function () {
          clics++;
          if (clics >= 5) { clics = 0; invocarCookie(this); }
        });
      }, esc: cerrar };
  }
  // Easter egg: 5 clics en «CRÉDITOS» invocan a COOKIE en un lugar distinto cada vez
  var LUGARES_COOKIE = ["arriba-izq", "abajo-izq", "junto-titulo", "arriba-der", "abajo-der"], invocaciones = 0;
  function invocarCookie(titulo) {
    var lugar = LUGARES_COOKIE[invocaciones % LUGARES_COOKIE.length]; invocaciones++;
    var viejo = document.querySelector(".cookie-sorpresa"); if (viejo) viejo.remove();
    var cont = document.createElement("div");
    cont.className = "cookie-sorpresa " + lugar + (aj.calma ? " quieta" : "");
    cont.setAttribute("aria-hidden", "true");
    var cv2 = document.createElement("canvas"), globo = document.createElement("span");
    globo.className = "globo"; globo.textContent = "¡MIAU!";
    cont.appendChild(globo); cont.appendChild(cv2);
    var c = cv2.getContext("2d"), cuadro = 0;
    function pintar() { var img = A.spriteNPC("cookie", cuadro % 4 === 3 ? "neutral" : "feliz", aj.calma ? 0 : cuadro); cv2.width = img.width; cv2.height = img.height; c.imageSmoothingEnabled = false; c.clearRect(0, 0, cv2.width, cv2.height); c.drawImage(img, 0, 0); }
    pintar();
    if (lugar === "junto-titulo") {
      var rr = titulo.getBoundingClientRect();
      cont.style.left = Math.round(rr.right + 16) + "px"; cont.style.top = Math.round(rr.top + rr.height / 2 - 30) + "px";
    }
    $("pantalla").appendChild(cont);
    var t = aj.calma ? null : setInterval(function () { cuadro++; pintar(); }, 260);
    S.sfx("recurso"); setTimeout(function () { S.voz(620); }, 150); setTimeout(function () { S.voz(700); }, 260);
    anunciar("COOKIE se asomó para saludar: ¡miau!");
    setTimeout(function () { if (t) clearInterval(t); cont.remove(); }, 3200);
  }

  /* =========================================================== bucle principal */
  var ultimo = 0;
  function tick(ahora) {
    var dt = Math.min(0.05, (ahora - (ultimo || ahora)) / 1000); ultimo = ahora;
    actualizar(dt);
    dibujar();
    if (pila.length && pila[pila.length - 1].id === "titulo") dibujarEscenaTitulo();
    if (E._enJuego) relojHUD();
    requestAnimationFrame(tick);
  }
  window.addEventListener("pagehide", function () { if (E._enJuego) guardarAhora(); });
  document.addEventListener("visibilitychange", function () { if (document.hidden && E._enJuego) guardarAhora(); });

  /* =========================================================== arranque */
  prepararBanco();
  construirEstatico();
  if (document.fonts && document.fonts.load) document.fonts.load("12px 'Depurador Pixel'").catch(function () {});
  aplicarAjustes(false);
  abrir(pTitulo());
  requestAnimationFrame(tick);

  // interfaz de inspección para las pruebas automáticas (solo lectura salvo `irA`, que usa el Modo Directo)
  window.__depurador = {
    version: VERSION,
    estado: function () { return E; }, modo: function () { return modo; }, jugador: function () { return jugador; }, zona: function () { return zonaActual; },
    retos: function () { return RETOS; }, mundo: M, ajustes: function () { return aj; }, pila: function () { return pila.map(function (p) { return p.id; }); },
    vista: function () { return { escala: escala, vw: vw, vh: vh, cam: cam }; }, cercano: function () { return cercano ? (cercano.o.id || cercano.o.tipo) : null; },
    irA: function (id) { irATerminal(id); }
  };
})();
