/* DEPURADOR TIC · arte.js
   Todo el arte del juego es original y se dibuja por código (pixel art 1:1).
   - Sprites de personajes: matrices de texto con paleta; el contorno oscuro se agrega automáticamente.
   - Objetos y terminales: dibujados con rectángulos sobre lienzos pequeños + contorno automático.
   - Baldosas (suelos y paredes): un tema por sector. */
(function () {
  "use strict";
  var CONTORNO = "#0c0910";

  function lienzo(w, h) { var c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
  function r(c, col, x, y, w, h) { c.fillStyle = col; c.fillRect(x, y, w, h); }
  function hash(a, b, s) { var n = (a * 374761393 + b * 668265263 + (s || 0) * 2147483647) | 0; n = (n ^ (n >>> 13)) * 1274126177; n = n ^ (n >>> 16); return ((n >>> 0) % 10000) / 10000; }
  function tono(hex, k) {
    var n = parseInt(hex.slice(1), 16), R = n >> 16, G = (n >> 8) & 255, B = n & 255;
    function f(v) { v = k >= 0 ? v + (255 - v) * k : v * (1 + k); return Math.max(0, Math.min(255, Math.round(v))); }
    return "#" + ((1 << 24) + (f(R) << 16) + (f(G) << 8) + f(B)).toString(16).slice(1);
  }

  /* contorno de 1 px alrededor de la silueta (vecindad de 4) */
  function conContorno(src, color) {
    var w = src.width + 2, h = src.height + 2, out = lienzo(w, h), c = out.getContext("2d");
    c.drawImage(src, 1, 1);
    var d = c.getImageData(0, 0, w, h), p = d.data, a = new Uint8Array(w * h), i;
    for (i = 0; i < w * h; i++) a[i] = p[i * 4 + 3] > 0 ? 1 : 0;
    var col = parseInt((color || CONTORNO).slice(1), 16);
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      i = y * w + x; if (a[i]) continue;
      if ((x > 0 && a[i - 1]) || (x < w - 1 && a[i + 1]) || (y > 0 && a[i - w]) || (y < h - 1 && a[i + w])) {
        p[i * 4] = col >> 16; p[i * 4 + 1] = (col >> 8) & 255; p[i * 4 + 2] = col & 255; p[i * 4 + 3] = 255;
      }
    }
    c.putImageData(d, 0, 0);
    return out;
  }
  function deFilas(filas, pal, espejo) {
    var w = 0; filas.forEach(function (f) { w = Math.max(w, f.length); });
    var c = lienzo(w, filas.length), x = c.getContext("2d");
    filas.forEach(function (f, j) { for (var i = 0; i < f.length; i++) { var ch = f[espejo ? f.length - 1 - i : i], col = pal[ch]; if (col) r(x, col, i + (espejo ? w - f.length : 0), j, 1, 1); } });
    return c;
  }
  function sprite(filas, pal, espejo) { return conContorno(deFilas(filas, pal, espejo)); }
  function dibujo(w, h, fn, sinContorno) { var c = lienzo(w, h); fn(c.getContext("2d"), w, h); return sinContorno ? c : conContorno(c); }
  function reemplazar(filas, cambios) { var f = filas.slice(); Object.keys(cambios || {}).forEach(function (k) { f[+k] = cambios[k]; }); return f; }

  /* ---------- operador de campo (protagonista) ---------- */
  var PJ_PAL = { h: "#3b2a24", H: "#64493a", s: "#f1c7a1", S: "#d89f78", e: "#1b1220", m: "#b8695a", v: "#f0a03a", V: "#c47720", r: "#f6f0d8", b: "#3f6fcf", w: "#ffffff", p: "#33384f", k: "#1c1a24" };
  var PJ = {
    abajo: ["...hhhhhh...", ".hhHHhhhhhh.", "hhHhhhhhhhhh", "hhhhhhhhhhhh", "hhsshhhhsshh", "hssssssssssh", "hssessssessh", "hssessssessh",
            ".ssssmmssss.", "..SssssssS..", ".vvvbbbbvvv.", "vvvvbbbbvvvv", "vvrrbbbbrrvv", "VvvvbwbbvvvV", "sVvvvvvvvvVs", ".pppppppppp.", ".pppp..pppp.", ".kkkk..kkkk."],
    arriba: ["...hhhhhh...", ".hhHHhhhhhh.", "hhHhhhhhhhhh", "hhhhhhhhhhhh", "hhhhhhhhhhhh", "hhhhhhhhhHhh", "hhhhhhhhhhhh", "hhhhhhhhhhhh",
             ".hhhhhhhhhh.", "..SssssssS..", ".vvvvvvvvvv.", "vvvvvvvvvvvv", "vvrrrrrrrrvv", "VvvvvvvvvvvV", "sVvvvvvvvvVs", ".pppppppppp.", ".pppp..pppp.", ".kkkk..kkkk."],
    lado: ["...hhhhhh...", ".hhHHhhhhh..", "hhHhhhhhhhh.", "hhhhhhhhhhhh", "hhhhhhhsssh.", "hhhhhsssssss", "hhhhsssssess", "hhhhsssssess",
           ".hhSsssssss.", "..SSsssss...", "...vvvbbb...", "..vvvvbbbb..", "..vvrrrrbb..", "..Vvvssvvb..", "..VVvssvvv..", "..pppppppp..", "..ppp..pppp.", "..kkk..kkkk."]
  };
  // cuadro de caminata: levanta una pierna una fila (izquierda o derecha)
  function paso(filas, lado) {
    var f = filas.slice(), n = f.length, mitad = filas[0].length / 2;
    function corta(s, desde, hasta, rel) { return s.split("").map(function (ch, i) { return (i >= desde && i < hasta) ? rel(i) : ch; }).join(""); }
    var d = lado === 0 ? 0 : mitad, h = lado === 0 ? mitad : filas[0].length;
    var a = f[n - 2], b = f[n - 1];
    f[n - 2] = corta(a, d, h, function (i) { return b[i]; });
    f[n - 1] = corta(b, d, h, function () { return "."; });
    return f;
  }
  var cachePJ = {};
  function spritePJ(dir, cuadro) {
    var k = dir + cuadro; if (cachePJ[k]) return cachePJ[k];
    var base = PJ[dir === "izq" || dir === "der" ? "lado" : dir];
    var filas = cuadro === 1 ? paso(base, 0) : cuadro === 3 ? paso(base, 1) : base;
    return (cachePJ[k] = sprite(filas, PJ_PAL, dir === "izq"));
  }

  /* ---------- personajes secundarios (originales) ---------- */
  var NPC = {
    borne: { // robot de mantenimiento del turno noche
      pal: { a: "#8a93a8", A: "#ff6a5a", L: "#7fe0a0", g: "#a6afc2", G: "#6f778c", d: "#1b2a31", f: "#7fe0c8", y: "#f2c84b", k: "#2a2c38", m: "#9a6a3e", M: "#d9d2bf" },
      filas: ["......A.........", "......a.........", "..gggggggggg....", "..gddddddddg....", "..gddddddddg....", "..gddddddddg....", "..gddddddddg....", "..GggggggggG....",
              "...GGGGGGGG.....", "..gggggggggg..m.", ".ggyyyyyyyygg.m.", ".gggggggggggg.m.", ".Gg.gggggg.gGm..", "....gggggg...m..", "...gggggggg..m..", "...GGGGGGGG.MMM.", "...kk....kk.MMM.", "..kkkk..kkkkMMM."],
      caras: { neutral: { 4: "..gdfddddfdg....", 5: "..gdfddddfdg...." }, feliz: { 4: "..gddfddfddg....", 5: "..gdfdffdfdg...." }, preocupado: { 4: "..gdfddddfdg....", 5: "..gdfddddfdg....", 6: "..gdddffdddg...." } },
      anim: function (f) { return { 0: f % 2 ? "......L........." : "......A........." }; },
      voz: 340
    },
    cookie: { // gata que duerme sobre el router
      pal: { c: "#e8a35c", C: "#b8733a", w: "#f4ecd8", e: "#1b1220", n: "#e07a8a", z: "#b8733a" },
      filas: ["..C.....C.....", ".cCc...cCc....", ".ccccccccc....", ".czczcczcc..c.", ".ccwwnwwcc..c.", "..cwwwwwc...c.", ".ccccccccccc..", "cccccccccccccc", "cCcccccccccCc.", ".ww..ww..ww..."],
      caras: { neutral: { 3: ".czzcczzcc..c." }, feliz: { 3: ".cecccceccc.c." }, preocupado: { 3: ".ceccccecc..c." } },
      anim: function (f) { return f % 2 ? { 3: null, 4: ".ccwwnwwcc.c..", 5: "..cwwwwwc..c.." } : {}; },
      voz: 520
    },
    nimbo: { // nube que contiene otras nubes
      pal: { w: "#eef3ff", W: "#b9c3e6", e: "#1b1220", b: "#f2a0b8", m: "#5a4f8a" },
      filas: [".....wwww.......", "...wwwwwwww.....", "..wwwwwwwwwww...", ".wwwwwwwwwwwwww.", "wwwwwwwwwwwwwwww", "wwwwewwwwwewwwww", "wwwwewwwwwewwwww", "wwbwwwwmwwwwbwww", ".WwwwwwwwwwwwwW.", "..WWWwwwwwwWWW..", "....WWWWWWWW...."],
      caras: { neutral: {}, feliz: { 5: "wwwewewwwewewwww", 6: "wwwwwwwwwwwwwwww", 7: "wwbwwwmmmwwwbwww" }, preocupado: { 5: "wwwwewwwwwewwwww", 7: "wwbwwwwwwwwwbwww", 8: ".Wwwwwwmwwwwwww." } },
      voz: 620
    },
    mateo: { // estudiante con su planilla
      pal: { h: "#2e2420", H: "#4a3a30", s: "#e5b48c", S: "#c98f66", e: "#1b1220", g: "#cfe0f2", m: "#a35a4a", v: "#4fa36b", V: "#3a7d50", b: "#e9e3d0", p: "#3b4c7a", k: "#e8e8e8" },
      filas: ["...hhhhhh...", ".hhhHHhhhhh.", "hhhhhhhhhhhh", "hhhhhhhhhhhh", "hhsssshhsshh", "hssssssssssh", "hsgegssgegsh", "hsgggssgggsh",
              ".ssssmmssss.", "..SssssssS..", ".vvvvbbvvvv.", "vvvvvbbvvvvv", "vvvvvvvvvvvv", "VvvvvvvvvvvV", "sVvvvvvvvvVs", ".pppppppppp.", ".pppp..pppp.", ".kkkk..kkkk."],
      caras: { neutral: {}, feliz: { 8: ".sssmmmmsss." }, preocupado: { 6: "hsgegssgegsh", 8: ".sssssmssss." } },
      voz: 300
    },
    ficha: { // lechuza bibliotecaria
      pal: { o: "#8a6a4a", O: "#5e4630", c: "#d8c39a", g: "#e0c063", e: "#ffffff", p: "#1b1220", b: "#f0a03a", y: "#f0a03a" },
      filas: ["..O........O..", "..OO......OO..", "..oooooooooo..", ".oooooooooooo.", ".oggggooggggo.", ".ogeegoogeego.", ".ogepgoogpego.", ".oggggbbggggo.", ".ooccccccccoo.", "ooccccccccccoo", "oOccccccccccOo", "oOOccccccccOOo", ".OOOccccccOOO.", "..OOOOOOOOOO..", "...yy....yy..."],
      caras: { neutral: {}, feliz: { 5: ".oggggooggggo.", 6: ".ogeegoogeego." }, preocupado: { 5: ".ogpegoogepgo.", 6: ".ogeegoogeego." } },
      anim: function (f) { return f % 6 === 5 ? { 5: ".oggggooggggo.", 6: ".ogOOgoogOOgo." } : {}; },
      voz: 440
    }
  };
  var cacheNPC = {};
  function spriteNPC(id, cara, cuadro) {
    var k = id + "|" + (cara || "neutral") + "|" + (cuadro || 0); if (cacheNPC[k]) return cacheNPC[k];
    var n = NPC[id], filas = reemplazar(n.filas, n.caras[cara || "neutral"]);
    if (n.anim && cuadro) { var a = n.anim(cuadro); Object.keys(a).forEach(function (j) { if (a[j]) filas[+j] = a[j]; }); }
    return (cacheNPC[k] = sprite(filas, n.pal));
  }

  /* ---------- objetos y terminales ---------- */
  // cada objeto: lienzo ya contorneado; se dibuja con la base apoyada en el borde inferior de su huella
  function caja(c, x, y, w, h, base) { r(c, base, x, y, w, h); r(c, tono(base, 0.25), x, y, w, 1); r(c, tono(base, -0.3), x, y + h - 1, w, 1); }
  function pantalla(c, x, y, w, h, est, fr) {
    r(c, "#10141c", x, y, w, h);
    if (est === "ok") { r(c, "#2f7a5c", x + 1, y + 1, w - 2, h - 2); for (var i = 0; i < h - 3; i += 2) r(c, "#7fe0a0", x + 2, y + 2 + i, Math.max(2, (w - 4) - ((i * 3) % (w - 3))), 1); }
    else { r(c, fr ? "#6a1f2a" : "#4a1820", x + 1, y + 1, w - 2, h - 2); r(c, "#ff6a5a", x + (w >> 1), y + 2, 1, Math.max(1, h - 6)); r(c, "#ff6a5a", x + (w >> 1), y + h - 3, 1, 1);
      if (fr) for (var j = 0; j < 3; j++) r(c, "#ff9a8a", x + 1 + ((j * 5 + 3) % (w - 2)), y + 1 + ((j * 3) % (h - 2)), 2, 1); }
  }
  function luzEstado(c, x, y, est, fr) { r(c, "#0c0910", x, y, 4, 4); r(c, est === "ok" ? "#7fe0a0" : (fr ? "#ff5a4a" : "#b8322a"), x + 1, y + 1, 2, 2); }

  var OBJ = {
    /* --- decoración --- */
    planta: [14, 22, function (c) { caja(c, 3, 15, 8, 7, "#9a5a3a"); r(c, "#7a4428", 3, 15, 8, 2); r(c, "#3f8f4a", 1, 4, 12, 11); r(c, "#5cb265", 3, 2, 5, 6); r(c, "#5cb265", 8, 6, 4, 4); r(c, "#2f6f3a", 2, 11, 10, 3); r(c, "#7fd08a", 4, 3, 2, 2); }],
    lampara: [12, 30, function (c) { r(c, "#fff1b8", 1, 0, 10, 7); r(c, "#e8c870", 1, 6, 10, 1); r(c, "#7a7466", 5, 7, 2, 19); caja(c, 2, 26, 8, 4, "#4d473e"); }],
    estante: [32, 30, function (c, w, h, s) { caja(c, 0, 0, 32, 30, "#6b4a33"); for (var f = 0; f < 3; f++) { r(c, "#3e2a1d", 2, 2 + f * 9, 28, 7); for (var b = 0; b < 9; b++) { var col = ["#b85c4a", "#e0c063", "#5f8fb8", "#7fa36a", "#a77fc4", "#d98a5a"][(b * 7 + f * 3 + (s || 0)) % 6]; r(c, col, 3 + b * 3, 3 + f * 9 + ((b + f) % 3 === 0 ? 1 : 0), 2, 6 - ((b + f) % 3 === 0 ? 1 : 0)); } } }],
    mainframe: [32, 32, function (c, w, h, s, fr) { caja(c, 0, 2, 32, 30, "#4a5677"); r(c, "#2a3147", 2, 4, 28, 12); for (var i = 0; i < 6; i++) { r(c, "#9fc4ff", 4 + i * 4, 6, 2, 8); r(c, "#1b2233", 4 + i * 4, 6 + ((i * 3 + (fr || 0)) % 6), 2, 2); } for (var j = 0; j < 5; j++) r(c, (j + (fr || 0)) % 3 ? "#7fe0a0" : "#f2c84b", 4 + j * 5, 20, 2, 2); r(c, "#2a3147", 2, 25, 28, 5); r(c, "#6f7fa6", 3, 26, 26, 1); r(c, "#6f7fa6", 3, 28, 26, 1); }],
    torre: [14, 28, function (c, w, h, s, fr) { caja(c, 0, 0, 14, 28, "#3b4560"); r(c, "#1b2233", 2, 3, 10, 2); r(c, "#1b2233", 2, 7, 10, 2); r(c, fr % 2 ? "#7fe0a0" : "#3f8f6a", 10, 13, 2, 2); r(c, "#2a3147", 2, 17, 10, 9); for (var i = 0; i < 4; i++) r(c, "#56627e", 3, 18 + i * 2, 8, 1); }],
    cables: [32, 8, function (c) { r(c, "#2b2c3a", 0, 2, 32, 2); r(c, "#c0503a", 0, 4, 20, 1); r(c, "#3a7fc0", 6, 1, 26, 1); r(c, "#e0c063", 12, 5, 20, 1); r(c, "#2b2c3a", 10, 0, 2, 8); }, true],
    herramientas: [14, 10, function (c) { caja(c, 0, 3, 14, 7, "#c0503a"); r(c, "#e8e8e8", 4, 0, 6, 1); r(c, "#e8e8e8", 4, 0, 1, 3); r(c, "#e8e8e8", 9, 0, 1, 3); r(c, "#8a2a20", 0, 6, 14, 1); }],
    antena: [30, 32, function (c) { r(c, "#7a8494", 13, 16, 4, 14); caja(c, 8, 28, 14, 4, "#4d5566"); r(c, "#dfe6ee", 2, 2, 26, 14); r(c, "#b9c3cf", 4, 4, 22, 10); r(c, "#dfe6ee", 6, 6, 18, 6); r(c, "#7a8494", 14, 0, 2, 9); r(c, "#ff6a5a", 14, 0, 2, 2); }],
    banco: [30, 14, function (c) { caja(c, 0, 2, 30, 6, "#8a5f3d"); r(c, "#6b4a33", 2, 8, 3, 6); r(c, "#6b4a33", 25, 8, 3, 6); r(c, "#a8774f", 0, 2, 30, 1); }],
    router: [16, 10, function (c, w, h, s, fr) { caja(c, 0, 2, 16, 8, "#2b2f3a"); r(c, "#7a8494", 2, 0, 1, 3); r(c, "#7a8494", 13, 0, 1, 3); for (var i = 0; i < 4; i++) r(c, (i + (fr || 0)) % 2 ? "#7fe0a0" : "#3f8f6a", 3 + i * 3, 6, 2, 1); }],
    rack: [16, 30, function (c, w, h, s, fr) { caja(c, 0, 0, 16, 30, "#2b2638"); for (var i = 0; i < 6; i++) { r(c, "#4a4263", 2, 2 + i * 4, 12, 3); r(c, ((i + (fr || 0) + (s || 0)) % 3) ? "#7fe0a0" : "#9fc4ff", 12, 3 + i * 4, 1, 1); r(c, "#6a5a94", 3, 3 + i * 4, 6, 1); } r(c, "#1c1828", 2, 26, 12, 2); }],
    holo: [30, 26, function (c, w, h, s, fr) { caja(c, 4, 18, 22, 8, "#4a4263"); r(c, "#6a5a94", 6, 19, 18, 1); var o = (fr || 0) % 2; r(c, "#c9a6ff", 7, 2 + o, 16, 14); r(c, "#6a5a94", 9, 4 + o, 12, 10); r(c, "#c9a6ff", 11, 6 + o, 8, 6); r(c, "#e9dcff", 13, 8 + o, 4, 2); }],
    cajon: [16, 14, function (c) { caja(c, 0, 0, 16, 14, "#8a7aa8"); r(c, "#e9f1ff", 0, 0, 16, 2); r(c, "#6a5a8a", 0, 6, 16, 2); r(c, "#e9f1ff", 3, 2, 2, 1); r(c, "#e9f1ff", 10, 2, 3, 1); }],
    rejilla: [32, 16, function (c) { r(c, "#2e2948", 0, 0, 32, 16); for (var i = 1; i < 32; i += 3) r(c, "#5b5288", i, 1, 1, 14); r(c, "#8f86c4", 0, 0, 32, 1); }, true],
    archivero: [16, 30, function (c) { caja(c, 0, 0, 16, 30, "#8f96a6"); for (var i = 0; i < 3; i++) { r(c, "#6f7686", 2, 2 + i * 9, 12, 7); r(c, "#dfe3ea", 6, 4 + i * 9, 4, 1); } }],
    cafetera: [14, 26, function (c, w, h, s, fr) { caja(c, 0, 4, 14, 22, "#3a3a44"); r(c, "#c0503a", 2, 6, 10, 3); r(c, "#1b1a22", 3, 12, 8, 6); r(c, "#e8e2d0", 5, 15, 4, 3); r(c, "#7a4a2a", 6, 16, 2, 1); if (fr % 2) r(c, "#cfcfcf", 6, 9, 1, 2); r(c, "#7fe0a0", 11, 7, 1, 1); }],
    agua: [12, 28, function (c) { r(c, "#9fd6f2", 2, 0, 8, 10); r(c, "#7fbfe0", 3, 1, 3, 8); caja(c, 0, 10, 12, 18, "#e6e8ee"); r(c, "#4a8ad0", 2, 14, 2, 2); r(c, "#d04a4a", 8, 14, 2, 2); }],
    papeles: [14, 12, function (c) { caja(c, 0, 4, 14, 8, "#e8e2d0"); caja(c, 1, 0, 12, 5, "#f4efe2"); r(c, "#b8b0a0", 3, 2, 8, 1); r(c, "#b8b0a0", 2, 7, 10, 1); }],
    mesaRedonda: [46, 26, function (c) { r(c, "#6b4a33", 21, 16, 4, 10); r(c, "#8a5f3d", 2, 2, 42, 16); r(c, "#a8774f", 4, 3, 38, 12); r(c, "#e8e2d0", 8, 6, 8, 5); r(c, "#8fd3c2", 28, 5, 7, 6); r(c, "#6b4a33", 2, 17, 42, 1); }],
    silla: [12, 14, function (c) { caja(c, 1, 0, 10, 6, "#7a5068"); caja(c, 0, 6, 12, 5, "#9a6a88"); r(c, "#4a3040", 1, 11, 2, 3); r(c, "#4a3040", 9, 11, 2, 3); }],
    puff: [16, 12, function (c, w, h, s) { var col = s ? "#4fa3c8" : "#e07a5a"; r(c, col, 1, 2, 14, 10); r(c, tono(col, 0.3), 3, 2, 8, 3); r(c, tono(col, -0.3), 1, 10, 14, 2); }],
    mesaLectura: [46, 26, function (c, w, h, s, fr, luz) { r(c, "#5e3f28", 2, 10, 42, 10); r(c, "#7a5236", 2, 10, 42, 3); r(c, "#4a3020", 4, 20, 3, 6); r(c, "#4a3020", 39, 20, 3, 6); [8, 34].forEach(function (x) { r(c, "#c9b06a", x + 2, 6, 1, 5); r(c, luz ? "#7fe0a0" : "#3f6f4a", x, 2, 6, 4); r(c, "#e0c063", x + 1, 9, 4, 1); }); r(c, "#e8e2d0", 18, 7, 9, 4); }],
    escalera: [16, 32, function (c) { r(c, "#a07a4a", 2, 0, 2, 32); r(c, "#a07a4a", 12, 0, 2, 32); for (var l = 0; l < 7; l++) r(c, "#c09a6a", 2, 3 + l * 4, 12, 1); }],
    globo: [14, 26, function (c) { r(c, "#3f86c7", 1, 0, 12, 12); r(c, "#6fbf6a", 3, 2, 4, 3); r(c, "#6fbf6a", 8, 6, 3, 4); r(c, "#c9b06a", 6, 12, 2, 8); caja(c, 2, 20, 10, 6, "#5d4230"); }],
    percha: [16, 14, function (c) { r(c, "#6b4a33", 0, 0, 16, 2); r(c, "#5d4230", 7, 2, 2, 9); caja(c, 3, 11, 10, 3, "#4a3020"); }],
    libros: [14, 10, function (c) { caja(c, 0, 6, 14, 4, "#b85c4a"); caja(c, 1, 3, 12, 3, "#5f8fb8"); caja(c, 2, 0, 10, 3, "#e0c063"); }],
    expendedora: [18, 32, function (c, w, h, s, fr) { caja(c, 0, 0, 18, 32, "#b8323a"); r(c, "#1b1a22", 2, 3, 10, 20); for (var i = 0; i < 4; i++) for (var j = 0; j < 3; j++) r(c, ["#e0c063", "#7fd08a", "#9fc4ff"][(i + j) % 3], 3 + j * 3, 5 + i * 5, 2, 3); r(c, "#e8e8e8", 13, 5, 3, 6); r(c, fr % 2 ? "#ffef9a" : "#e0c063", 13, 12, 3, 1); r(c, "#1b1a22", 3, 25, 12, 4); }],
    disquete: [14, 16, function (c, w, h, s, fr) { var g = fr % 4; caja(c, 1, 3, 12, 12, "#3a6fd0"); r(c, "#dfe6ee", 3, 3, 8, 5); r(c, "#1b2233", 8, 4, 2, 3); r(c, "#e8e2d0", 3, 10, 8, 5); r(c, "#ffef9a", 6, 0 + (g === 1 ? 0 : 1), 2, 2); r(c, "#ffef9a", (g === 2 ? 0 : 1), 9, 1, 1); r(c, "#ffef9a", 12 + (g === 3 ? 1 : 0), 6, 1, 1); }],
    poste: [16, 26, function (c) { r(c, "#6b4a33", 7, 12, 2, 14); caja(c, 0, 0, 16, 12, "#e0d2a8"); r(c, "#8a7a52", 2, 3, 12, 1); r(c, "#8a7a52", 2, 6, 9, 1); }],
    pizarraPared: [30, 18, function (c) { caja(c, 0, 0, 30, 18, "#a07a4a"); r(c, "#f0efe8", 2, 2, 26, 14); r(c, "#5f8fb8", 5, 5, 6, 1); r(c, "#c0503a", 5, 8, 12, 1); r(c, "#3f8f4a", 5, 11, 9, 1); }],
    caja: [16, 14, function (c) { caja(c, 0, 0, 16, 14, "#8a6a42"); r(c, "#6b5032", 0, 6, 16, 2); r(c, "#6b5032", 7, 0, 2, 14); }],
    sofa: [32, 20, function (c) { caja(c, 0, 0, 32, 10, "#3f7f6d"); caja(c, 0, 8, 32, 10, "#56a08b"); r(c, "#2f5f52", 0, 18, 4, 2); r(c, "#2f5f52", 28, 18, 4, 2); }],

    /* --- terminales: est = "pend" | "ok", fr = cuadro de animación --- */
    cajero: [16, 30, function (c, w, h, s, fr, est) { caja(c, 0, 0, 16, 30, "#4b5b7a"); r(c, "#6f84a8", 1, 1, 14, 3); pantalla(c, 3, 5, 10, 8, est, fr); r(c, "#cdd5e6", 3, 15, 10, 1); r(c, "#2a3045", 4, 17, 8, 3); for (var i = 0; i < 3; i++) r(c, "#9aa6bc", 4 + i * 3, 22, 2, 2); r(c, "#1b2233", 3, 26, 10, 2); luzEstado(c, 12, 1, est, fr); }],
    pc: [20, 26, function (c, w, h, s, fr, est) { caja(c, 0, 14, 20, 12, "#8a5f3d"); r(c, "#6b4a33", 1, 25, 3, 1); r(c, "#a8774f", 0, 14, 20, 1); caja(c, 3, 0, 14, 11, "#2a2733"); pantalla(c, 4, 1, 12, 9, est, fr); r(c, "#5d564a", 9, 11, 2, 3); r(c, "#cfc8e0", 5, 16, 10, 2); luzEstado(c, 15, 15, est, fr); }],
    consola: [18, 22, function (c, w, h, s, fr, est) { caja(c, 0, 8, 18, 14, "#3a3550"); caja(c, 2, 0, 14, 10, "#232030"); pantalla(c, 3, 1, 12, 8, est, fr); for (var i = 0; i < 6; i++) r(c, "#cfc8e0", 2 + i * 2 + (i > 2 ? 2 : 0), 13, 1, 1); r(c, "#5a5080", 2, 16, 14, 3); luzEstado(c, 13, 17, est, fr); }],
    atril: [16, 24, function (c, w, h, s, fr, est) { r(c, "#6b4a33", 6, 10, 4, 12); caja(c, 3, 21, 10, 3, "#4a3020"); caja(c, 0, 2, 16, 9, "#8a5f3d"); r(c, est === "ok" ? "#f4efe2" : "#e8c8c0", 2, 3, 12, 6); r(c, "#8a7a6a", 3, 5, 9, 1); r(c, "#8a7a6a", 3, 7, 7, 1); luzEstado(c, 12, 0, est, fr); }],
    kiosco: [16, 30, function (c, w, h, s, fr, est) { caja(c, 1, 0, 14, 30, "#5c6a6a"); r(c, "#ffffff", 3, 3, 10, 12); if (est === "ok") { r(c, "#1b1220", 4, 5, 8, 1); r(c, "#1b1220", 4, 8, 6, 1); r(c, "#1b1220", 4, 11, 7, 1); } else { r(c, "#eeeeee", 4, 5, 8, 1); r(c, "#f2f2f2", 4, 8, 6, 1); r(c, "#efefef", 4, 11, 7, 1); } r(c, "#3e4a4a", 4, 18, 8, 6); luzEstado(c, 11, 25, est, fr); }],
    rackT: [16, 30, function (c, w, h, s, fr, est) { caja(c, 0, 0, 16, 30, "#2b2638"); for (var i = 0; i < 5; i++) { r(c, "#4a4263", 2, 2 + i * 4, 12, 3); r(c, est === "ok" ? "#7fe0a0" : ((i + (fr || 0)) % 2 ? "#ff5a4a" : "#6a2a2a"), 12, 3 + i * 4, 1, 1); } pantalla(c, 3, 22, 10, 6, est, fr); }],
    laptop: [20, 22, function (c, w, h, s, fr, est) { caja(c, 0, 10, 20, 12, "#8a5f3d"); r(c, "#a8774f", 0, 10, 20, 1); caja(c, 3, 0, 14, 9, "#3a3550"); pantalla(c, 4, 1, 12, 7, est, fr); r(c, "#9a93b0", 2, 9, 16, 2); luzEstado(c, 15, 13, est, fr); }],
    impresora: [18, 24, function (c, w, h, s, fr, est) { r(c, "#f4f2ec", 4, 0, 10, 6); caja(c, 0, 5, 18, 16, "#cfd3dc"); r(c, "#9aa0ad", 2, 9, 14, 2); pantalla(c, 3, 13, 6, 4, est, fr); r(c, "#7b8190", 1, 21, 16, 3); luzEstado(c, 12, 13, est, fr); }],
    archivo: [16, 30, function (c, w, h, s, fr, est) { caja(c, 0, 0, 16, 30, "#b48a5a"); for (var i = 0; i < 3; i++) { r(c, "#8a6a42", 2, 3 + i * 9, 12, 7); r(c, "#e0c063", 6, 5 + i * 9, 4, 1); } if (est !== "ok") { r(c, "#f4efe2", 3, 12, 6, 2); r(c, "#f4efe2", 9, 21, 5, 2); } luzEstado(c, 12, 0, est, fr); }],
    pizarra: [30, 26, function (c, w, h, s, fr, est) { r(c, "#6b4a33", 3, 14, 2, 12); r(c, "#6b4a33", 25, 14, 2, 12); caja(c, 0, 0, 30, 16, "#a07a4a"); r(c, "#f0efe8", 2, 2, 26, 12); if (est === "ok") { r(c, "#5f8fb8", 4, 6, 5, 4); r(c, "#1b1220", 9, 8, 3, 1); r(c, "#5f8fb8", 12, 6, 5, 4); r(c, "#1b1220", 17, 8, 3, 1); r(c, "#5f8fb8", 20, 6, 5, 4); } else { r(c, "#5f8fb8", 15, 3, 5, 4); r(c, "#5f8fb8", 4, 8, 5, 4); r(c, "#5f8fb8", 21, 8, 5, 4); r(c, "#c0503a", 10, 5, 4, 1); } luzEstado(c, 25, 0, est, fr); }],
    fichero: [18, 20, function (c, w, h, s, fr, est) { caja(c, 0, 2, 18, 18, "#8a6a42"); for (var i = 0; i < 3; i++) for (var j = 0; j < 2; j++) { r(c, "#6b5032", 2 + j * 8, 4 + i * 5, 6, 4); r(c, "#e0c063", 4 + j * 8, 5 + i * 5, 2, 1); } if (est !== "ok") r(c, "#f4efe2", 4, 0, 4, 4); luzEstado(c, 14, 0, est, fr); }],
    aux: [16, 26, function (c, w, h, s, fr, est, color) { caja(c, 2, 8, 12, 18, color || "#7a8494"); caja(c, 0, 0, 16, 10, "#232030"); pantalla(c, 1, 1, 14, 8, est, fr); luzEstado(c, 11, 12, est, fr); }]
  };
  var cacheObj = {};
  function objeto(tipo, opt) {
    opt = opt || {};
    var k = tipo + "|" + (opt.s || 0) + "|" + (opt.fr || 0) + "|" + (opt.est || "") + "|" + (opt.luz ? 1 : 0) + "|" + (opt.color || "");
    if (cacheObj[k]) return cacheObj[k];
    var d = OBJ[tipo]; if (!d) throw new Error("Objeto sin arte: " + tipo);
    return (cacheObj[k] = dibujo(d[0], d[1], function (c, w, h) { d[2](c, w, h, opt.s || 0, opt.fr || 0, opt.est || opt.luz, opt.color); }, d[3]));
  }

  /* ---------- íconos de sector (12x12) ---------- */
  var ICONOS = {
    fund: ["..########..", ".#........#.", "##.######.##", ".#.#....#.#.", "##.#.##.#.##", ".#.#.##.#.#.", "##.#....#.##", ".#.######.#.", "##........##", ".#........#.", "..########..", "............"],
    busq: ["...####.....", "..#....#....", ".#......#...", ".#......#...", ".#......#...", "..#....#....", "...####.#...", "........#...", ".........#..", "..........#.", "...........#", "............"],
    virt: ["############", "#..........#", "#.########.#", "#.#......#.#", "#.#.####.#.#", "#.#.#..#.#.#", "#.#.####.#.#", "#.#......#.#", "#.########.#", "#..........#", "############", "............"],
    ofi: ["########....", "#......##...", "#......#.#..", "#.####.####.", "#..........#", "#.#######..#", "#..........#", "#.#######..#", "#..........#", "#.#####....#", "#..........#", "############"],
    colab: ["..##....##..", ".####..####.", ".####..####.", "..##....##..", "............", ".####..####.", "##########..", "######...###", "............", "....####....", "...######...", "............"],
    inv: [".##########.", "#..#.......#", "#..#.#####.#", "#..#.......#", "#..#.####..#", "#..#.......#", "#..#.#####.#", "#..#.......#", "#..#.......#", ".##########.", "............", "............"],
    hall: ["....####....", "...#....#...", "..#......#..", ".#........#.", "############", "#..#....#..#", "#..#....#..#", "#..#....#..#", "#..#....#..#", "############", "............", "............"]
  };
  function icono(id, color) { return deFilas(ICONOS[id] || ICONOS.hall, { "#": color || "#ffffff" }); }

  /* ---------- cursor corazón (propio) ---------- */
  var CORAZON = [".##.##.", "#######", "#######", ".#####.", "..###..", "...#..."];
  function corazonURL(col) { var c = deFilas(CORAZON, { "#": col || "#ff3b3b" }); var x = c.getContext("2d"); r(x, "#ffb0b0", 1, 1, 1, 1); return c.toDataURL(); }

  /* ---------- temas de baldosas por zona ---------- */
  // piso(c, x, y, tx, ty) y pared(c, x, y, tx, fila 0 = alta | 1 = baja) dibujan una baldosa de 16x16.
  var TEMAS = {
    hall: { nombre: "Vestíbulo", acento: "#d7b8ff", borde: "#7a6aa8", sombra: "rgba(20,10,40,.45)", luz: "#ffe2a8",
      piso: function (c, x, y, tx, ty) { r(c, "#3b3350", x, y, 16, 16); r(c, "#2c263d", x + 15, y, 1, 16); r(c, "#2c263d", x, y + 15, 16, 1); if (hash(tx, ty) > 0.6) r(c, "#463d5e", x + 3 + ((tx * 7) % 9), y + 4 + ((ty * 5) % 8), 2, 1); if (hash(ty, tx) > 0.85) r(c, "#2f2944", x + 8, y + 9, 3, 1); },
      pared: function (c, x, y, tx, f) { if (f === 0) { r(c, "#2a2340", x, y, 16, 16); r(c, "#4a3f66", x, y, 16, 3); r(c, "#1e1930", x, y + 3, 16, 1); r(c, "#352c52", x, y + 10, 16, 2); } else { r(c, "#4a3f66", x, y, 16, 16); r(c, "#5a4e7a", x + 1, y + 1, 14, 9); r(c, "#433862", x + 2, y + 2, 12, 7); r(c, "#2a2340", x, y + 12, 16, 4); r(c, "#6a5c90", x, y + 11, 16, 1); } if (tx % 4 === 0) { r(c, "#2a2340", x, y, 2, 16); r(c, "#6a5c90", x + 2, y, 1, 16); } } },
    fund: { nombre: "Núcleo de Procesamiento", acento: "#9fc4ff", borde: "#7f93bb", sombra: "rgba(10,20,50,.5)", luz: "#d8ecff",
      piso: function (c, x, y, tx, ty) { r(c, (tx + ty) % 2 ? "#3a4660" : "#35405a", x, y, 16, 16); r(c, "#2a3247", x + 15, y, 1, 16); r(c, "#2a3247", x, y + 15, 16, 1); r(c, "#56627e", x + 1, y + 1, 1, 1); r(c, "#56627e", x + 14, y + 14, 1, 1); if (hash(tx, ty) > 0.8) r(c, "#414e6c", x + 4, y + 6, 6, 1); },
      pared: function (c, x, y, tx, f) { if (f === 0) { r(c, "#45557a", x, y, 16, 16); r(c, "#7f93bb", x, y, 16, 2); r(c, "#8a9cc0", x, y + 6, 16, 3); r(c, "#5d6f96", x, y + 9, 16, 1); r(c, "#b8c6e0", x, y + 6, 16, 1); if (tx % 3 === 0) r(c, "#2f3a55", x + 6, y + 5, 3, 5); } else { r(c, "#55688c", x, y, 16, 16); r(c, "#3e4d6e", x, y, 1, 16); r(c, "#6f84aa", x + 1, y + 1, 14, 1); for (var i = 0; i < 3; i++) r(c, "#3e4d6e", x + 3, y + 4 + i * 2, 10, 1); r(c, "#2a3247", x, y + 13, 16, 3); } } },
    busq: { nombre: "Subred de Búsqueda", acento: "#7fe0c8", borde: "#4f9a95", sombra: "rgba(0,30,35,.5)", luz: "#c8fff0",
      piso: function (c, x, y, tx, ty) { r(c, "#1f3f44", x, y, 16, 16); r(c, "#19343a", x + 15, y, 1, 16); r(c, "#19343a", x, y + 15, 16, 1); var h = hash(tx, ty); if (h > 0.55) r(c, "#3fa79a", x + 2 + Math.floor(h * 11), y + 3 + ((tx + ty * 3) % 9), 1, 1); if (h > 0.9) r(c, "#7fe0c8", x + 9, y + 11, 1, 1); },
      pared: function (c, x, y, tx, f) { if (f === 0) { r(c, "#244a4e", x, y, 16, 16); r(c, "#4f9a95", x, y, 16, 2); for (var i = 0; i < 16; i++) r(c, "#3f7f7c", x + i, y + 8 + Math.round(Math.sin((tx * 16 + i) / 3) * 2), 1, 1); } else { r(c, "#2f5f62", x, y, 16, 16); for (var j = 0; j < 16; j++) r(c, "#4f9a95", x + j, y + 5 + Math.round(Math.sin((tx * 16 + j) / 4 + 1) * 2), 1, 1); r(c, "#19343a", x, y + 13, 16, 3); r(c, "#4f9a95", x, y + 12, 16, 1); } } },
    virt: { nombre: "Núcleo de Virtualización", acento: "#c9a6ff", borde: "#9d8cc8", sombra: "rgba(30,15,60,.5)", luz: "#efe4ff",
      piso: function (c, x, y, tx, ty) { r(c, (tx + ty) % 2 ? "#4b4470" : "#463f69", x, y, 16, 16); r(c, "#3a3458", x + 15, y, 1, 16); r(c, "#3a3458", x, y + 15, 16, 1); if (hash(tx, ty) > 0.75) { var cx = x + 7, cy = y + 7; r(c, "#8a83b8", cx, cy - 2, 1, 5); r(c, "#8a83b8", cx - 2, cy, 5, 1); } },
      pared: function (c, x, y, tx, f) { r(c, "#5b4f8f", x, y, 16, 16); if (f === 0) r(c, "#9d8cc8", x, y, 16, 2); if (tx % 2 === 0 && f === 0) { r(c, "#2a2347", x + 2, y + 4, 12, 12); r(c, "#7a6db8", x + 4, y + 6, 8, 10); r(c, "#2a2347", x + 6, y + 8, 4, 8); } if (f === 1) { if (tx % 2 === 0) { r(c, "#2a2347", x + 2, y, 12, 6); r(c, "#7a6db8", x + 4, y, 8, 4); r(c, "#2a2347", x + 6, y, 4, 2); } r(c, "#3a3060", x, y + 12, 16, 4); r(c, "#9d8cc8", x, y + 11, 16, 1); } } },
    ofi: { nombre: "Terminal de Archivos", acento: "#ffc28a", borde: "#a8774f", sombra: "rgba(40,20,5,.5)", luz: "#fff0c8",
      piso: function (c, x, y, tx, ty) { for (var i = 0; i < 4; i++) { r(c, (i + ty) % 2 ? "#75523a" : "#694832", x, y + i * 4, 16, 4); r(c, "#4e3524", x, y + i * 4 + 3, 16, 1); var s = ((ty * 4 + i) * 7 + tx * 16) % 24; if (s < 16) r(c, "#4e3524", x + s, y + i * 4, 1, 3); } },
      pared: function (c, x, y, tx, f) { if (f === 0) { r(c, "#b8a682", x, y, 16, 16); for (var i = 0; i < 16; i += 4) r(c, "#a8956f", x + i, y, 2, 16); r(c, "#7a5a3e", x, y, 16, 2); } else { r(c, "#b8a682", x, y, 16, 5); for (var j = 0; j < 16; j += 4) r(c, "#a8956f", x + j, y, 2, 5); r(c, "#9a7650", x, y + 5, 16, 2); r(c, "#5e432d", x, y + 7, 16, 9); r(c, "#6e5038", x + 2, y + 9, 12, 5); r(c, "#3e2a1d", x, y + 15, 16, 1); } } },
    colab: { nombre: "Servidor Compartido", acento: "#ffa8d0", borde: "#c07fa2", sombra: "rgba(40,5,25,.5)", luz: "#ffe0ee",
      piso: function (c, x, y, tx, ty) { r(c, "#5a2f4a", x, y, 16, 16); for (var i = 0; i < 4; i++) for (var j = 0; j < 4; j++) if ((i + j) % 2 === 0) r(c, "#6e3b5a", x + 2 + i * 4, y + 2 + j * 4, 1, 1); r(c, "#4a2440", x, y + 15, 16, 1); },
      pared: function (c, x, y, tx, f) { r(c, "#8a4a6e", x, y, 16, 16); if (f === 0) { r(c, "#c07fa2", x, y, 16, 2); var h = hash(tx, 7); if (h > 0.35) r(c, ["#f2d36b", "#8fd3c2", "#f29bb0", "#a8c8ff"][Math.floor(h * 4) % 4], x + 3 + Math.floor(h * 6), y + 5 + Math.floor(h * 5), 5, 5); } else { var h2 = hash(tx, 9); if (h2 > 0.6) r(c, ["#f2d36b", "#8fd3c2", "#f29bb0"][Math.floor(h2 * 3) % 3], x + 2 + Math.floor(h2 * 8), y + 1, 5, 5); r(c, "#6e3858", x, y + 8, 16, 1); r(c, "#4a2440", x, y + 13, 16, 3); r(c, "#c07fa2", x, y + 12, 16, 1); } } },
    inv: { nombre: "Archivo de Referencias", acento: "#f2d27a", borde: "#bfaa75", sombra: "rgba(30,25,5,.5)", luz: "#fff2c0",
      piso: function (c, x, y, tx, ty) { r(c, (tx + ty) % 2 ? "#2f3d2a" : "#35452f", x, y, 16, 16); r(c, "#8c7a3c", x, y, 1, 1); r(c, "#26321f", x + 15, y, 1, 16); r(c, "#26321f", x, y + 15, 16, 1); if ((tx + ty) % 2 === 0) r(c, "#4a5a3a", x + 6, y + 6, 4, 4); },
      pared: function (c, x, y, tx, f) { r(c, "#4a3020", x, y, 16, 16); r(c, "#2e1d12", x + 1, y + (f === 0 ? 3 : 1), 14, 6); r(c, "#2e1d12", x + 1, y + (f === 0 ? 10 : 8), 14, 5); for (var b = 0; b < 7; b++) { var h = hash(tx * 7 + b, f); var col = ["#b85c4a", "#e0c063", "#5f8fb8", "#7fa36a", "#a77fc4", "#d98a5a"][Math.floor(h * 6)]; r(c, col, x + 1 + b * 2, y + (f === 0 ? 4 : 2) + (h > 0.7 ? 1 : 0), 2, 5 - (h > 0.7 ? 1 : 0)); var h3 = hash(b, tx * 3 + f); r(c, ["#7fa36a", "#b85c4a", "#5f8fb8", "#e0c063"][Math.floor(h3 * 4)], x + 1 + b * 2, y + (f === 0 ? 11 : 9), 2, 4); } if (f === 0) r(c, "#bfaa75", x, y, 16, 2); if (f === 1) r(c, "#2e1d12", x, y + 14, 16, 2); } }
  };
  // detalle de pared por zona (placas, relojes, ventanas, lámparas) — se dibuja sobre la pared
  function adorno(c, tipo, x, y, opt) {
    opt = opt || {};
    switch (tipo) {
      case "ventana": r(c, "#1b1830", x + 1, y + 2, 14, 12); r(c, "#0e0c1c", x + 2, y + 3, 12, 10); r(c, "#ffffff", x + 4, y + 5, 1, 1); r(c, "#c8d8ff", x + 10, y + 4, 1, 1); r(c, "#ffef9a", x + 8, y + 9, 1, 1); r(c, "#e8e2d0", x + 1, y + 13, 14, 1); r(c, "#1b1830", x + 7, y + 3, 1, 10); break;
      case "reloj": r(c, "#1b1220", x + 3, y + 1, 10, 10); r(c, "#f4efe2", x + 4, y + 2, 8, 8); r(c, "#1b1220", x + 7, y + 3, 1, 4); r(c, "#1b1220", x + 8, y + 6, 2, 1); r(c, "#7a5a3e", x + 6, y + 11, 4, 5); r(c, "#e0c063", x + 7 + (opt.fr % 2 ? 1 : -1), y + 13, 2, 2); break;
      case "lamparaPared": r(c, "#1b1220", x + 5, y + 6, 6, 5); r(c, opt.luz ? "#fff1b8" : "#8a8070", x + 6, y + 7, 4, 3); r(c, "#c9b06a", x + 7, y + 11, 2, 2); break;
      case "placa": r(c, "#1b1220", x, y + 1, 16, 14); r(c, opt.color || "#ffffff", x + 1, y + 2, 14, 12); r(c, "#1b1220", x + 2, y + 3, 12, 10); if (opt.icono) c.drawImage(opt.icono, x + 2, y + 3); break;
      case "cartel": r(c, "#a07a4a", x, y + 2, 32, 13); r(c, "#e8dcc0", x + 2, y + 4, 28, 9); for (var i = 0; i < 4; i++) r(c, ["#f2d36b", "#8fd3c2", "#f29bb0", "#a8c8ff"][i], x + 4 + i * 7, y + 5, 5, 4); r(c, "#c0503a", x + 6, y + 4, 1, 1); break;
      case "pantallaGrande": r(c, "#1b1220", x, y + 1, 32, 14); r(c, opt.luz ? "#3d6f8f" : "#2a3040", x + 2, y + 3, 28, 10); if (opt.luz) { r(c, "#8fd3c2", x + 4, y + 5, 8, 2); r(c, "#f2d36b", x + 4, y + 8, 14, 1); r(c, "#f29bb0", x + 20, y + 5, 7, 6); } break;
      case "mapa": r(c, "#a07a4a", x, y + 1, 32, 14); r(c, "#e8dcc0", x + 2, y + 3, 28, 10); r(c, "#4f9a95", x + 4, y + 5, 10, 6); r(c, "#7fa36a", x + 16, y + 4, 9, 5); r(c, "#c0503a", x + 9, y + 7, 2, 2); r(c, "#c0503a", x + 20, y + 6, 2, 2); r(c, "#1b1220", x + 11, y + 8, 9, 1); break;
      case "braille": r(c, "#e0c063", x + 3, y + 3, 10, 10); r(c, "#1b1220", x + 4, y + 4, 8, 8); for (var k = 0; k < 6; k++) if ([1, 0, 1, 1, 0, 1][k]) r(c, "#e0c063", x + 5 + (k % 2) * 4, y + 5 + Math.floor(k / 2) * 2, 2, 1); break;
      case "tuberia": r(c, "#8a9cc0", x, y + 2, 16, 3); r(c, "#5d6f96", x, y + 4, 16, 1); break;
    }
  }
  // alfombras y franjas transitables (sin contorno), w/h en baldosas
  function alfombra(c, tipo, x, y, w, h) {
    var W = w * 16, H = h * 16;
    switch (tipo) {
      case "pasillo": r(c, "#6a2a48", x, y + 2, W, H - 4); r(c, "#c9a24b", x, y + 3, W, 1); r(c, "#c9a24b", x, y + H - 4, W, 1); for (var i = 0; i < W; i += 16) { r(c, "#7e3858", x + i + 6, y + 7, 4, H - 14); } break;
      case "circuito": r(c, "#2a3550", x + 2, y + 2, W - 4, H - 4); r(c, "#5d6f96", x + 3, y + 3, W - 6, 1); r(c, "#5d6f96", x + 3, y + H - 4, W - 6, 1);
        for (var j = 0; j < 5; j++) { var yy = y + 8 + j * Math.floor((H - 16) / 5), x0 = x + 6 + (j * 13) % 20, x1 = x + W - 8 - (j * 7) % 16; r(c, "#4a6a8a", x0, yy, x1 - x0, 1); r(c, "#4a6a8a", x1, yy, 1, 5); r(c, "#7fe0a0", x0 - 1, yy - 1, 3, 3); r(c, "#e0c063", x1 - 1, yy + 4, 3, 3); }
        r(c, "#1b2233", x + W / 2 - 8, y + H / 2 - 6, 16, 12); r(c, "#5d6f96", x + W / 2 - 7, y + H / 2 - 5, 14, 10); r(c, "#9fc4ff", x + W / 2 - 3, y + H / 2 - 2, 6, 4); break;
      case "tactil": r(c, "#d8b43a", x + 3, y, W - 6, H); for (var a = 0; a < H; a += 4) for (var b = 0; b < W - 8; b += 4) r(c, "#f2d36b", x + 5 + b, y + 1 + a, 2, 2); break;
      case "lectura": r(c, "#5a4a24", x + 2, y + 2, W - 4, H - 4); r(c, "#8c7a3c", x + 3, y + 3, W - 6, H - 6); r(c, "#5a4a24", x + 5, y + 5, W - 10, H - 10); break;
      case "rosa": r(c, "#7a3f62", x + 2, y + 2, W - 4, H - 4); r(c, "#a85a86", x + 4, y + 4, W - 8, H - 8); r(c, "#7a3f62", x + 6, y + 6, W - 12, H - 12); break;
      case "madera": r(c, "#8a3a2e", x + 2, y + 2, W - 4, H - 4); r(c, "#e0c063", x + 4, y + 4, W - 8, 1); r(c, "#e0c063", x + 4, y + H - 5, W - 8, 1); break;
    }
  }

  window.ARTE = {
    tono: tono, hash: hash, lienzo: lienzo, rect: r, conContorno: conContorno,
    spritePJ: spritePJ, spriteNPC: spriteNPC, NPC: NPC, objeto: objeto, OBJ: OBJ,
    icono: icono, corazonURL: corazonURL, TEMAS: TEMAS, adorno: adorno, alfombra: alfombra
  };
})();
