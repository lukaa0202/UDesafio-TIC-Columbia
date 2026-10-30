/* DEPURADOR TIC · banco.js
   Banco de retos: los 16 originales (js/retos.js) + retos importados por JSON (guardados en el navegador).
   Formato de importación (ver bancos/ejemplo-ampliacion.json):
   { "formato": "depurador-tic-banco", "version": 1, "retos": [ { id, unidad, categoria, pregunta, opciones[4], correcta, retro, fuente, titulo?, terminal?, log?, eps? } ] } */
(function () {
  "use strict";
  var CLAVE = "depurador-tic:banco-extra";
  var ORIGINALES = (window.RETOS || []).map(function (r) { var c = JSON.parse(JSON.stringify(r)); c.origen = "original"; return c; });
  var CATEGORIAS = window.CATEGORIAS || [];
  var CUPO = 3; // terminales auxiliares disponibles por sector
  var extras = [];

  function leer() { try { var v = JSON.parse(localStorage.getItem(CLAVE) || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function escribir() { try { localStorage.setItem(CLAVE, JSON.stringify(extras)); return true; } catch (e) { return false; } }

  function categoria(id) { for (var i = 0; i < CATEGORIAS.length; i++) if (CATEGORIAS[i].id === id) return CATEGORIAS[i]; return null; }
  function todos() { return ORIGINALES.concat(extras); }
  function porId(id) { var t = todos(); for (var i = 0; i < t.length; i++) if (t[i].id === id) return t[i]; return null; }

  /* ---------- validación ---------- */
  function texto(v, min, max) { return typeof v === "string" && v.trim().length >= min && v.length <= max; }
  // Valida un objeto ya parseado. Devuelve { validos:[], invalidos:[{indice,id,errores}], avisos:[], errorGeneral }
  function validar(datos) {
    var res = { validos: [], invalidos: [], avisos: [], errorGeneral: null };
    var lista = Array.isArray(datos) ? datos : (datos && Array.isArray(datos.retos) ? datos.retos : null);
    if (!lista) { res.errorGeneral = "El archivo no contiene una lista de retos. Debe ser un arreglo o un objeto con la propiedad \"retos\"."; return res; }
    if (datos && !Array.isArray(datos) && datos.formato && datos.formato !== "depurador-tic-banco") res.avisos.push("El campo \"formato\" no es \"depurador-tic-banco\"; se intentó leer igual.");
    if (lista.length === 0) { res.errorGeneral = "La lista de retos está vacía."; return res; }
    if (lista.length > 60) { res.errorGeneral = "Demasiados retos en un solo archivo (máximo 60)."; return res; }
    var existentes = {}; todos().forEach(function (r) { existentes[r.id] = r.origen; });
    var vistos = {}, cupo = {};
    extras.forEach(function (r) { cupo[r.categoria] = (cupo[r.categoria] || 0) + 1; });
    lista.forEach(function (r, i) {
      var err = [], id = r && typeof r.id === "string" ? r.id.trim() : "";
      if (!r || typeof r !== "object" || Array.isArray(r)) { res.invalidos.push({ indice: i + 1, id: "—", errores: ["No es un objeto de reto."] }); return; }
      if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,23}$/.test(id)) err.push("id: obligatorio, hasta 24 caracteres (letras, números, guion, punto o guion bajo).");
      if (id && existentes[id] === "original") { res.avisos.push("«" + id + "» ya es un reto original: se omite."); return; }
      if (id && existentes[id] === "importado") { res.avisos.push("«" + id + "» ya está en el banco: se omite."); return; }
      if (id && vistos[id]) err.push("id duplicado dentro del archivo.");
      if (!/^U\d{1,2}$/.test(r.unidad || "")) err.push("unidad: debe tener la forma U1, U2… U12.");
      if (!categoria(r.categoria)) err.push("categoria: debe ser una de " + CATEGORIAS.map(function (c) { return c.id; }).join(", ") + ".");
      if (!texto(r.pregunta, 10, 700)) err.push("pregunta: texto de 10 a 700 caracteres.");
      if (!Array.isArray(r.opciones) || r.opciones.length !== 4) err.push("opciones: deben ser exactamente 4.");
      else r.opciones.forEach(function (o, k) { if (!texto(o, 1, 400)) err.push("opción " + "ABCD"[k] + ": texto de 1 a 400 caracteres."); });
      if (Array.isArray(r.opciones) && r.opciones.length === 4) {
        var norm = r.opciones.map(function (o) { return String(o).trim().toLowerCase(); });
        if (norm.some(function (o, k) { return norm.indexOf(o) !== k; })) err.push("opciones: hay alternativas repetidas.");
      }
      if (!(Number.isInteger(r.correcta) && r.correcta >= 0 && r.correcta <= 3)) err.push("correcta: número entero de 0 (A) a 3 (D).");
      if (!texto(r.retro, 10, 1500)) err.push("retro: explicación de 10 a 1500 caracteres.");
      if (!texto(r.fuente, 3, 600)) err.push("fuente: obligatoria (3 a 600 caracteres).");
      if (r.titulo != null && !texto(r.titulo, 1, 60)) err.push("titulo: hasta 60 caracteres.");
      if (r.terminal != null && !texto(r.terminal, 1, 40)) err.push("terminal: hasta 40 caracteres.");
      if (r.log != null && !texto(r.log, 1, 160)) err.push("log: hasta 160 caracteres.");
      if (r.eps != null && typeof r.eps !== "boolean") err.push("eps: debe ser true o false.");
      var conocidos = ["id", "unidad", "categoria", "pregunta", "opciones", "correcta", "retro", "fuente", "titulo", "terminal", "log", "eps", "origen", "codigo"];
      var extra = Object.keys(r).filter(function (k) { return conocidos.indexOf(k) < 0; });
      if (extra.length) res.avisos.push("«" + (id || "#" + (i + 1)) + "»: se ignoran los campos " + extra.join(", ") + ".");
      if (!err.length && categoria(r.categoria)) {
        var n = (cupo[r.categoria] || 0) + 1;
        if (n > CUPO) err.push("sin lugar: el sector «" + categoria(r.categoria).nombre + "» ya tiene " + CUPO + " terminales auxiliares ocupadas.");
        else cupo[r.categoria] = n;
      }
      if (id) vistos[id] = true;
      if (err.length) res.invalidos.push({ indice: i + 1, id: id || "—", errores: err });
      else res.validos.push({ id: id, unidad: r.unidad, categoria: r.categoria, titulo: r.titulo ? r.titulo.trim() : (r.terminal || id), pregunta: r.pregunta.trim(), opciones: r.opciones.map(function (o) { return String(o).trim(); }), correcta: r.correcta, retro: r.retro.trim(), fuente: r.fuente.trim(), terminal: r.terminal ? r.terminal.trim() : null, log: r.log ? r.log.trim() : null, eps: !!r.eps, codigo: !!r.codigo, origen: "importado" });
    });
    return res;
  }
  function validarTexto(txt) {
    var datos;
    try { datos = JSON.parse(txt); } catch (e) { return { validos: [], invalidos: [], avisos: [], errorGeneral: "El texto no es JSON válido: " + e.message }; }
    return validar(datos);
  }
  function agregar(validos) { extras = extras.concat(validos); return escribir(); }
  function quitar(id) { extras = extras.filter(function (r) { return r.id !== id; }); return escribir(); }
  function restaurar() { extras = []; try { localStorage.removeItem(CLAVE); } catch (e) {} }
  function exportar() {
    return { formato: "depurador-tic-banco", version: 1, exportado: new Date().toISOString(), juego: "DEPURADOR TIC",
      categorias: CATEGORIAS.map(function (c) { return { id: c.id, nombre: c.nombre, detalle: c.detalle }; }),
      retos: todos().map(function (r) { var c = JSON.parse(JSON.stringify(r)); return c; }) };
  }
  function cargar() {
    extras = [];
    var crudo = leer(), res = validar({ retos: crudo.filter(function (r) { return r && r.origen !== "original"; }).map(function (r) { var c = Object.assign({}, r); delete c.origen; return c; }) });
    // se vuelve a validar lo guardado: si alguien lo editó a mano y quedó dañado, se descarta lo inválido
    if (crudo.length && !res.errorGeneral) extras = res.validos;
    escribir();
    return { cargados: extras.length, descartados: crudo.length - extras.length };
  }

  window.BANCO = { cargar: cargar, todos: todos, extras: function () { return extras.slice(); }, originales: function () { return ORIGINALES.slice(); }, porId: porId, categoria: categoria, CATEGORIAS: CATEGORIAS,
    validar: validar, validarTexto: validarTexto, agregar: agregar, quitar: quitar, restaurar: restaurar, exportar: exportar, CUPO: CUPO };
})();
