/* DEPURADOR TIC · guardado.js
   Guardado de la partida en localStorage con validación. Si el guardado está dañado o es inconsistente,
   se descarta (se conserva una copia en "depurador-tic:partida-danada") y el juego lo informa. */
(function () {
  "use strict";
  var CLAVE = "depurador-tic:partida", VERSION = 3;

  function nuevo() {
    return { v: VERSION, hp: 100, res: 0, errores: 0, reinicios: 0, ms: 0, fixed: {}, first: {}, tries: {}, burned: {}, trail: [], pj: null, terminado: false, informeVisto: false, charlas: {}, introVista: false };
  }
  function entero(v, min, max) { return Number.isInteger(v) && v >= min && v <= max; }
  // Devuelve un estado saneado o lanza un Error con el motivo.
  function sanear(o, idsBanco) {
    if (!o || typeof o !== "object") throw new Error("no es un objeto");
    if (o.v !== VERSION) throw new Error("versión " + o.v + " no compatible");
    var e = nuevo(), ids = {}; idsBanco.forEach(function (id) { ids[id] = 1; });
    if (!entero(o.hp, 0, 100) || o.hp % 25 !== 0) throw new Error("energía fuera de rango");
    if (!entero(o.res, 0, 1e6) || !entero(o.errores, 0, 1e5) || !entero(o.reinicios, 0, 1e4)) throw new Error("contadores inválidos");
    if (typeof o.ms !== "number" || !(o.ms >= 0) || o.ms > 1e9) throw new Error("tiempo inválido");
    e.hp = o.hp; e.res = o.res; e.errores = o.errores; e.reinicios = o.reinicios; e.ms = o.ms;
    ["fixed", "first", "tries", "burned", "charlas"].forEach(function (k) { if (o[k] != null && (typeof o[k] !== "object" || Array.isArray(o[k]))) throw new Error(k + " inválido"); });
    Object.keys(o.tries || {}).forEach(function (id) { if (ids[id] && entero(o.tries[id], 0, 999)) e.tries[id] = o.tries[id]; });
    Object.keys(o.first || {}).forEach(function (id) { if (ids[id] && typeof o.first[id] === "boolean") e.first[id] = o.first[id]; });
    Object.keys(o.burned || {}).forEach(function (id) {
      var b = o.burned[id]; if (!ids[id] || !Array.isArray(b)) return;
      var limpio = b.filter(function (i, k) { return entero(i, 0, 3) && b.indexOf(i) === k; }); if (limpio.length) e.burned[id] = limpio;
    });
    Object.keys(o.fixed || {}).forEach(function (id) { if (ids[id] && o.fixed[id] === true) e.fixed[id] = true; });
    // coherencia: una terminal reparada tuvo al menos un intento y su primer intento quedó registrado
    Object.keys(e.fixed).forEach(function (id) { if (!e.tries[id]) e.tries[id] = (e.burned[id] || []).length + 1; if (!(id in e.first)) e.first[id] = e.tries[id] === 1; });
    Object.keys(e.burned).forEach(function (id) { if ((e.tries[id] || 0) < e.burned[id].length) e.tries[id] = e.burned[id].length + (e.fixed[id] ? 1 : 0); if (e.first[id] === undefined) e.first[id] = false; });
    if (Array.isArray(o.trail)) e.trail = o.trail.filter(function (t) { return t && typeof t.t === "number" && typeof t.ev === "string" && (t.ev === "reboot" || ids[t.id]); }).slice(-400);
    if (o.pj && typeof o.pj.x === "number" && typeof o.pj.y === "number") e.pj = { x: o.pj.x, y: o.pj.y, dir: ["arriba", "abajo", "izq", "der"].indexOf(o.pj.dir) >= 0 ? o.pj.dir : "abajo" };
    e.informeVisto = !!o.informeVisto; e.introVista = !!o.introVista;
    Object.keys(o.charlas || {}).forEach(function (k) { if (entero(o.charlas[k], 0, 999)) e.charlas[k] = o.charlas[k]; });
    // recursos y errores se derivan del progreso: así nunca quedan desalineados con el mapa
    e.res = 0; Object.keys(e.fixed).forEach(function (id) { e.res += e.tries[id] === 1 ? 100 : 50; });
    e.errores = 0; Object.keys(e.burned).forEach(function (id) { e.errores += e.burned[id].length; });
    e.terminado = idsBanco.every(function (id) { return e.fixed[id]; });
    return e;
  }
  function existe() { try { return !!localStorage.getItem(CLAVE); } catch (e) { return false; } }
  // { estado } | { error } | null (no hay guardado)
  function cargar(idsBanco) {
    var txt; try { txt = localStorage.getItem(CLAVE); } catch (e) { return { error: "El navegador no permite leer el almacenamiento local." }; }
    if (!txt) return null;
    try { return { estado: sanear(JSON.parse(txt), idsBanco) }; }
    catch (err) {
      try { localStorage.setItem(CLAVE + "-danada", txt); localStorage.removeItem(CLAVE); } catch (e) {}
      return { error: "El guardado estaba dañado (" + err.message + ") y se descartó." };
    }
  }
  function guardar(estado) {
    try { var c = JSON.parse(JSON.stringify(estado)); c.v = VERSION; c.guardado = new Date().toISOString(); localStorage.setItem(CLAVE, JSON.stringify(c)); return true; }
    catch (e) { return false; }
  }
  function borrar() { try { localStorage.removeItem(CLAVE); } catch (e) {} }
  window.GUARDADO = { nuevo: nuevo, cargar: cargar, guardar: guardar, borrar: borrar, existe: existe, sanear: sanear, CLAVE: CLAVE, VERSION: VERSION };
})();
