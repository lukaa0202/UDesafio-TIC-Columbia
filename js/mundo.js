/* DEPURADOR TIC · mundo.js
   Mapa del edificio: vestíbulo central + seis sectores (salas) unidos por pasillos.
   Todo en baldosas de 16 px. Define colisiones, zonas, objetos, terminales, personajes y búsqueda de rutas. */
(function () {
  "use strict";
  var T = 16;
  var IW = 18, IH = 9;          // interior de cada sala
  var XS = [2, 24, 46];          // x del interior de cada columna de salas
  var W = 66, H = 36;
  var Y_SUP = 3, Y_INF = 25;     // y del interior de salas superiores / inferiores
  var HALL = { x: 2, y: 16, w: 62, h: 5 };

  // Sectores: identidad, ubicación y textos. Los ids coinciden con las categorías de retos.js.
  var SECTORES = {
    fund:  { nombre: "Núcleo de Procesamiento",  col: 0, fila: 0, unidad: "U1" },
    busq:  { nombre: "Subred de Búsqueda",       col: 1, fila: 0, unidad: "U3" },
    virt:  { nombre: "Núcleo de Virtualización", col: 2, fila: 0, unidad: "U2" },
    ofi:   { nombre: "Terminal de Archivos",     col: 0, fila: 1, unidad: "U4" },
    colab: { nombre: "Servidor Compartido",      col: 1, fila: 1, unidad: "U6 y U7" },
    inv:   { nombre: "Archivo de Referencias",   col: 2, fila: 1, unidad: "U9" }
  };
  var ORDEN = ["fund", "busq", "virt", "ofi", "colab", "inv"];
  ORDEN.forEach(function (k) {
    var s = SECTORES[k]; s.id = k; s.x = XS[s.col]; s.y = s.fila === 0 ? Y_SUP : Y_INF;
    s.puerta = s.x + 8;          // columnas s.puerta y s.puerta+1
  });

  // Terminales originales (id de reto → sala, posición interior, tipo de arte, nombre y falla)
  var TERMINALES = {
    "U1-1": { sector: "fund",  x: 3,  y: 5, tipo: "cajero",    nombre: "Cajero automático",        log: "El cajero entrega los datos en el orden equivocado." },
    "U1-2": { sector: "fund",  x: 13, y: 1, tipo: "pc",        nombre: "Asistente de IA",          log: "Un asistente respondió sin fuentes y alguien lo tomó como verdad." },
    "U1-3": { sector: "fund",  x: 14, y: 6, tipo: "consola",   nombre: "Consola de prompts",       log: "La instrucción enviada al modelo es tan vaga que la respuesta no sirve." },
    "U3-1": { sector: "busq",  x: 3,  y: 5, tipo: "pc",        nombre: "Buscador del laboratorio", log: "Las búsquedas devuelven publicidad en vez de documentos técnicos." },
    "U3-2": { sector: "busq",  x: 13, y: 2, tipo: "atril",     nombre: "Atril de fuentes",         log: "Llegó una definición técnica sin un origen confiable." },
    "U3-3": { sector: "busq",  x: 14, y: 6, tipo: "kiosco",    nombre: "Portal de la facultad",    log: "El portal muestra información que parte de los usuarios no puede percibir." },
    "U2-1": { sector: "virt",  x: 5,  y: 5, tipo: "rackT",     nombre: "Inventario de hardware",   log: "El inventario mezcla piezas físicas con archivos de la máquina virtual." },
    "U2-2": { sector: "virt",  x: 12, y: 5, tipo: "laptop",    nombre: "Notebook de laboratorio",  log: "Una máquina virtual está por dejar al equipo anfitrión sin recursos." },
    "U4-1": { sector: "ofi",   x: 3,  y: 3, tipo: "pc",        nombre: "Libreta de Mateo",         log: "Datos crudos sin fórmulas: la planilla no responde ninguna pregunta." },
    "U4-2": { sector: "ofi",   x: 13, y: 3, tipo: "pc",        nombre: "Planilla de gastos",       log: "La celda debía contar movimientos y no da el número esperado." },
    "U4-3": { sector: "ofi",   x: 14, y: 7, tipo: "impresora", nombre: "Editor de informes",       log: "El informe no logra generar su tabla de contenidos." },
    "U6-1": { sector: "colab", x: 2,  y: 2, tipo: "pc",        nombre: "Documento compartido",     log: "Dos copias del mismo archivo se pisan entre sí." },
    "U6-2": { sector: "colab", x: 15, y: 2, tipo: "archivo",   nombre: "Archivador del proyecto",  log: "Los entregables del proyecto están mezclados y no se encuentran." },
    "U7-1": { sector: "colab", x: 13, y: 7, tipo: "pizarra",   nombre: "Pizarra de procesos",      log: "El diagrama del proceso de entrega quedó desordenado.", ancho: 2 },
    "U9-1": { sector: "inv",   x: 3,  y: 6, tipo: "fichero",   nombre: "Fichero bibliográfico",    log: "La bibliografía tiene referencias incompletas." },
    "U9-2": { sector: "inv",   x: 13, y: 4, tipo: "pc",        nombre: "Escritorio de redacción",  log: "Un uso de IA pone en riesgo la autoría del trabajo." }
  };
  // lugares reservados para terminales auxiliares de retos importados (3 por sector)
  var RANURAS = {
    fund: [[1, 2], [16, 3], [6, 7]], busq: [[1, 7], [10, 7], [16, 3]], virt: [[2, 5], [11, 7], [15, 7]],
    ofi: [[6, 3], [10, 6], [1, 5]], colab: [[2, 6], [10, 7], [16, 5]], inv: [[6, 7], [10, 1], [16, 6]]
  };

  // Decoración por sala: [tipo, x, y, ancho_huella, alto_huella, opciones]. Las coordenadas son interiores.
  var DECOR = {
    fund: [["mainframe", 0, 0, 2, 1], ["torre", 3, 0, 1, 1, { s: 1 }], ["torre", 4, 0, 1, 1, { s: 2 }], ["lampara", 17, 0, 1, 1, { luz: 1 }], ["herramientas", 16, 8, 1, 1], ["planta", 0, 8, 1, 1], ["cables", 6, 3, 2, 1, { piso: 1 }], ["silla", 13, 2, 1, 1, { piso: 1 }]],
    busq: [["antena", 0, 0, 2, 1], ["estante", 4, 0, 2, 1, { s: 2 }], ["router", 16, 1, 1, 1], ["banco", 15, 8, 2, 1], ["planta", 0, 8, 1, 1], ["planta", 17, 0, 1, 1]],
    virt: [["rack", 0, 0, 1, 1, { s: 0 }], ["rack", 1, 0, 1, 1, { s: 1 }], ["rack", 2, 0, 1, 1, { s: 2 }], ["rack", 15, 0, 1, 1, { s: 1 }], ["rack", 16, 0, 1, 1, { s: 2 }], ["rack", 17, 0, 1, 1, { s: 0 }], ["holo", 8, 1, 2, 1], ["torre", 12, 0, 1, 1, { s: 1 }], ["torre", 5, 0, 1, 1, { s: 2 }], ["planta", 13, 8, 1, 1], ["cajon", 0, 8, 1, 1], ["cajon", 17, 8, 1, 1], ["rejilla", 8, 4, 2, 1, { piso: 1 }]],
    ofi: [["archivero", 0, 0, 1, 1], ["archivero", 1, 0, 1, 1], ["estante", 4, 0, 2, 1, { s: 4 }], ["cafetera", 16, 0, 1, 1], ["agua", 17, 0, 1, 1], ["papeles", 1, 7, 1, 1], ["planta", 0, 8, 1, 1], ["planta", 17, 8, 1, 1], ["silla", 13, 4, 1, 1, { piso: 1 }], ["silla", 3, 4, 1, 1, { piso: 1 }]],
    colab: [["mesaRedonda", 6, 5, 3, 1], ["silla", 6, 4, 1, 1, { piso: 1 }], ["silla", 8, 4, 1, 1, { piso: 1 }], ["puff", 1, 8, 1, 1, { s: 0 }], ["puff", 3, 8, 1, 1, { s: 1 }], ["planta", 17, 8, 1, 1], ["planta", 0, 0, 1, 1], ["silla", 2, 3, 1, 1, { piso: 1 }]],
    inv: [["estante", 0, 3, 2, 1, { s: 1 }], ["estante", 16, 8, 2, 1, { s: 3 }], ["mesaLectura", 5, 3, 3, 1], ["escalera", 12, 0, 1, 1], ["globo", 17, 1, 1, 1], ["percha", 16, 3, 1, 1], ["libros", 0, 8, 1, 1], ["libros", 9, 8, 1, 1], ["silla", 13, 5, 1, 1, { piso: 1 }]]
  };
  // alfombras transitables: [tipo, x, y, w, h]
  var ALFOMBRAS = {
    fund: [["circuito", 6, 4, 6, 3]], busq: [["tactil", 8, 3, 2, 6]], virt: [], ofi: [["madera", 6, 5, 5, 3]],
    colab: [["rosa", 5, 3, 5, 4]], inv: [["lectura", 4, 2, 5, 3]]
  };
  // adornos de pared: [tipo, x interior, fila de pared (0 alta, 1 baja), opciones]
  var ADORNOS = {
    fund: [["tuberia", 5, 0], ["tuberia", 6, 0], ["tuberia", 7, 0], ["tuberia", 8, 0], ["lamparaPared", 9, 1, { luz: 1 }], ["pizarraPared", 14, 0]],
    busq: [["mapa", 8, 0], ["braille", 7, 1], ["lamparaPared", 11, 1, { luz: 1 }], ["lamparaPared", 2, 1, { luz: 1 }]],
    virt: [["lamparaPared", 5, 1, { luz: 1 }], ["lamparaPared", 12, 1, { luz: 1 }]],
    ofi: [["ventana", 8, 0], ["ventana", 10, 0], ["reloj", 13, 0, { anim: 1 }], ["lamparaPared", 6, 1, { luz: 1 }], ["lamparaPared", 12, 1, { luz: 1 }]],
    colab: [["pantallaGrande", 7, 0, { pantalla: 1 }], ["cartel", 12, 0], ["lamparaPared", 4, 1, { luz: 1 }], ["lamparaPared", 15, 1, { luz: 1 }]],
    inv: [["lamparaPared", 4, 1, { luz: 1 }], ["lamparaPared", 9, 1, { luz: 1 }], ["lamparaPared", 15, 1, { luz: 1 }]]
  };
  // personajes: posición interior de sala (o del vestíbulo)
  var PERSONAJES = [
    { id: "borne", nombre: "BORNE", zona: "hall", x: 25, y: 1, alto: 18 },
    { id: "cookie", nombre: "COOKIE", zona: "busq", x: 16, y: 1, sobre: "router", alto: 10 },
    { id: "nimbo", nombre: "NIMBO", zona: "virt", x: 15, y: 3, flota: 1, alto: 11 },
    { id: "mateo", nombre: "MATEO", zona: "ofi", x: 6, y: 6, alto: 18 },
    { id: "ficha", nombre: "DOÑA FICHA", zona: "inv", x: 16, y: 3, sobre: "percha", alto: 15 }
  ];

  /* ---------- construcción de la grilla ---------- */
  // tipos de celda: 0 vacío · 1 piso · 2 pared (cara) ; zona: id de sala | "hall"
  var celda = [], zona = [], solido = [];
  for (var y = 0; y < H; y++) { celda.push([]); zona.push([]); solido.push([]); for (var x = 0; x < W; x++) { celda[y].push(0); zona[y].push(null); solido[y].push(false); } }
  function pinta(x0, y0, w, h, tipo, z) { for (var yy = y0; yy < y0 + h; yy++) for (var xx = x0; xx < x0 + w; xx++) { celda[yy][xx] = tipo; zona[yy][xx] = z; } }

  ORDEN.forEach(function (k) {
    var s = SECTORES[k];
    pinta(s.x, s.y - 2, IW, 2, 2, k);           // pared (cara) de 2 filas
    pinta(s.x, s.y, IW, IH, 1, k);              // piso
  });
  pinta(HALL.x, HALL.y - 2, HALL.w, 2, 2, "hall");
  pinta(HALL.x, HALL.y, HALL.w, HALL.h, 1, "hall");
  // pasillos (2 de ancho)
  ORDEN.forEach(function (k) {
    var s = SECTORES[k], px = s.puerta;
    if (s.fila === 0) {
      pinta(px, s.y + IH, 2, 1, 1, k);           // abertura en el borde inferior de la sala
      pinta(px, s.y + IH + 1, 2, 3, 1, "hall");  // hueco + puerta en la pared del vestíbulo
    } else {
      pinta(px, HALL.y + HALL.h, 2, 2, 1, "hall"); // abertura en el borde inferior del vestíbulo + hueco
      pinta(px, s.y - 2, 2, 2, 1, k);              // puerta en la pared de la sala
    }
  });
  function esPiso(tx, ty) { return tx >= 0 && ty >= 0 && tx < W && ty < H && celda[ty][tx] === 1; }

  /* ---------- objetos ---------- */
  // Un objeto: { tipo, tx, ty, w, h (huella en baldosas), solido, zona, opt, interactivo? }
  var objetos = [];
  function interior(z, ix, iy) { if (z === "hall") return { x: HALL.x + ix, y: HALL.y + iy }; var s = SECTORES[z]; return { x: s.x + ix, y: s.y + iy }; }
  function agrega(o) { objetos.push(o); if (o.solido) for (var yy = 0; yy < o.h; yy++) for (var xx = 0; xx < o.w; xx++) solido[o.ty + yy][o.tx + xx] = true; return o; }
  ORDEN.forEach(function (k) {
    DECOR[k].forEach(function (d) {
      var p = interior(k, d[1], d[2]), opt = d[5] || {};
      agrega({ clase: "decor", tipo: d[0], tx: p.x, ty: p.y, w: d[3], h: d[4], solido: !opt.piso, zona: k, opt: opt, animado: ["mainframe", "torre", "rack", "holo", "router", "cafetera"].indexOf(d[0]) >= 0 });
    });
  });
  // vestíbulo
  [["planta", 0, 0, 1, 1], ["planta", 61, 0, 1, 1], ["agua", 3, 0, 1, 1], ["expendedora", 42, 0, 1, 1, { info: "expendedora" }], ["banco", 14, 4, 2, 1], ["banco", 48, 4, 2, 1], ["planta", 0, 4, 1, 1], ["planta", 61, 4, 1, 1], ["disquete", 19, 2, 1, 1, { info: "respaldo" }]].forEach(function (d) {
    var p = interior("hall", d[1], d[2]), opt = d[5] || {};
    var o = agrega({ clase: "decor", tipo: d[0], tx: p.x, ty: p.y, w: d[3], h: d[4], solido: true, zona: "hall", opt: opt, animado: d[0] === "expendedora" || d[0] === "disquete" });
    if (opt.info) o.info = opt.info;
  });
  // carteles de sector junto a cada pasillo del vestíbulo
  ORDEN.forEach(function (k) {
    var s = SECTORES[k];
    var ix = s.puerta + 3 - HALL.x, iy = s.fila === 0 ? 0 : HALL.h - 1;
    var p = interior("hall", ix, iy);
    agrega({ clase: "decor", tipo: "poste", tx: p.x, ty: p.y, w: 1, h: 1, solido: true, zona: "hall", opt: {}, info: "cartel", sector: k });
  });
  // cartelera de objetivos (en la pared del vestíbulo)
  var cartelera = { clase: "pared", tipo: "cartel", tx: HALL.x + 27, ty: HALL.y - 1, w: 2, h: 1, zona: "hall", info: "objetivos" };
  objetos.push(cartelera);

  // terminales
  var estaciones = [];
  function creaEstacion(id, def, aux) {
    var p = interior(def.sector, def.x, def.y), w = def.ancho || 1;
    var o = agrega({ clase: "terminal", id: id, tipo: def.tipo, tx: p.x, ty: p.y, w: w, h: 1, solido: true, zona: def.sector, def: def, aux: !!aux });
    o.cx = (p.x + w / 2) * T; o.cy = (p.y + 0.5) * T;
    estaciones.push(o); return o;
  }
  Object.keys(TERMINALES).forEach(function (id) { creaEstacion(id, TERMINALES[id], false); });

  // personajes
  var personajes = PERSONAJES.map(function (n) {
    var p = interior(n.zona, n.x, n.y);
    var o = agrega({ clase: "npc", id: n.id, nombre: n.nombre, tx: p.x, ty: p.y, w: 1, h: 1, solido: true, zona: n.zona, flota: n.flota, sobre: n.sobre, alto: n.alto });
    return o;
  });

  /* ---------- terminales auxiliares (retos importados) ---------- */
  function quitarAuxiliares() {
    for (var i = estaciones.length - 1; i >= 0; i--) if (estaciones[i].aux) {
      var o = estaciones[i]; solido[o.ty][o.tx] = false;
      objetos.splice(objetos.indexOf(o), 1); estaciones.splice(i, 1);
    }
  }
  // retosExtra: [{id, categoria, terminal?, log?}] → devuelve los que no tuvieron lugar
  function colocarAuxiliares(retosExtra) {
    quitarAuxiliares();
    var usados = {}, sinLugar = [];
    retosExtra.forEach(function (r) {
      var k = r.categoria, n = usados[k] || 0, ran = RANURAS[k];
      if (!ran || n >= ran.length) { sinLugar.push(r.id); return; }
      usados[k] = n + 1;
      creaEstacion(r.id, { sector: k, x: ran[n][0], y: ran[n][1], tipo: "aux", nombre: r.terminal || ("Terminal auxiliar " + (n + 1)), log: r.log || "Se detectó una falla nueva en este sector." }, true);
    });
    return sinLugar;
  }

  /* ---------- colisión ---------- */
  function solidoEn(px, py) {
    var tx = Math.floor(px / T), ty = Math.floor(py / T);
    if (tx < 0 || ty < 0 || tx >= W || ty >= H) return true;
    return celda[ty][tx] !== 1 || solido[ty][tx];
  }
  // caja de colisión del personaje: los pies (10 x 5 px)
  function libre(x, y) { var hw = 5; return !solidoEn(x - hw, y - 4) && !solidoEn(x + hw - 0.01, y - 4) && !solidoEn(x - hw, y) && !solidoEn(x + hw - 0.01, y); }
  function zonaEn(px, py) { var tx = Math.floor(px / T), ty = Math.floor(py / T); return (tx >= 0 && ty >= 0 && tx < W && ty < H) ? zona[ty][tx] : null; }
  function transitable(tx, ty) { return esPiso(tx, ty) && !solido[ty][tx]; }

  // límites de cámara de cada zona (en píxeles)
  function limites(z) {
    if (z === "hall") return { x: 0, y: (HALL.y - 3) * T, w: W * T, h: (HALL.h + 5) * T };
    var s = SECTORES[z]; return { x: (s.x - 1) * T, y: (s.y - 3) * T, w: (IW + 2) * T, h: (IH + 4) * T };
  }

  /* ---------- búsqueda de rutas (BFS en baldosas) ---------- */
  function ruta(desde, hasta) {
    var key = function (x, y) { return y * W + x; };
    if (!transitable(hasta.x, hasta.y)) return null;
    var prev = {}, cola = [desde], vis = {}; vis[key(desde.x, desde.y)] = 1;
    while (cola.length) {
      var c = cola.shift();
      if (c.x === hasta.x && c.y === hasta.y) {
        var camino = [c]; var k = key(c.x, c.y);
        while (prev[k]) { camino.unshift(prev[k]); k = key(prev[k].x, prev[k].y); }
        return camino;
      }
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        var nx = c.x + d[0], ny = c.y + d[1], nk = key(nx, ny);
        if (!vis[nk] && transitable(nx, ny)) { vis[nk] = 1; prev[nk] = c; cola.push({ x: nx, y: ny }); }
      });
    }
    return null;
  }
  // baldosa libre junto a un objeto, prefiriendo la de abajo (mirar hacia arriba)
  function junto(o) {
    var cand = [];
    for (var xx = 0; xx < o.w; xx++) cand.push({ x: o.tx + xx, y: o.ty + o.h, dir: "arriba" });
    for (var yy = 0; yy < o.h; yy++) { cand.push({ x: o.tx - 1, y: o.ty + yy, dir: "der" }); cand.push({ x: o.tx + o.w, y: o.ty + yy, dir: "izq" }); }
    for (var x2 = 0; x2 < o.w; x2++) cand.push({ x: o.tx + x2, y: o.ty - 1, dir: "abajo" });
    return cand.filter(function (c) { return transitable(c.x, c.y); });
  }

  var inicio = { x: (HALL.x + 31) * T, y: (HALL.y + 3) * T + 12 };

  window.MUNDO = {
    T: T, W: W, H: H, IW: IW, IH: IH, HALL: HALL, SECTORES: SECTORES, ORDEN: ORDEN, TERMINALES: TERMINALES, DECOR: DECOR, ALFOMBRAS: ALFOMBRAS, ADORNOS: ADORNOS, RANURAS: RANURAS,
    celda: celda, zona: zona, solido: solido, objetos: objetos, estaciones: estaciones, personajes: personajes, cartelera: cartelera,
    libre: libre, solidoEn: solidoEn, zonaEn: zonaEn, transitable: transitable, esPiso: esPiso, limites: limites, ruta: ruta, junto: junto,
    colocarAuxiliares: colocarAuxiliares, inicio: inicio, interior: interior
  };
})();
