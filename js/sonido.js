/* DEPURADOR TIC · sonido.js
   Sistema de sonido modular con Web Audio. Toda la música y los efectos son originales y se sintetizan
   en el navegador (no hay archivos de terceros). Para usar un archivo propio en una pista, agrega
   `archivo: "audio/mi-pista.ogg"` a su definición en PISTAS: el sistema lo reproducirá en lugar del sintetizador.
   El audio solo arranca después de una interacción del usuario (restricción de los navegadores). */
(function () {
  "use strict";
  var ctx = null, maestro, busMusica, busEfectos, ruido = null;
  var vol = { musica: 0.5, efectos: 0.7 };
  var actual = null, temporizador = null, paso = 0, proxima = 0, audioArchivo = null;

  var NOTAS = { C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5, "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11 };
  function hz(n) { var m = /^([A-G]#?)(\d)$/.exec(n); if (!m) return 0; var midi = 12 * (+m[2] + 1) + NOTAS[m[1]]; return 440 * Math.pow(2, (midi - 69) / 12); }
  function sec(txt) { return txt.trim().split(/\s+/); }

  // Pistas originales: melodía y bajo en corcheas ("-" = silencio, "~" = sostener)
  var PISTAS = {
    titulo: { bpm: 84, onda: "square", ondaBajo: "triangle", vm: 0.09,
      mel: sec("A4 C5 E5 D5 C5 B4 C5 ~ A4 C5 E5 G5 F5 E5 D5 ~ F4 A4 C5 B4 A4 G4 A4 ~ E4 G4 B4 A4 G#4 E4 A4 ~"),
      baj: sec("A2 - E3 - A2 - E3 - F2 - C3 - G2 - D3 - D2 - A2 - C3 - G2 - E2 - B2 - A2 - E3 -") },
    hall: { bpm: 92, onda: "triangle", ondaBajo: "triangle", vm: 0.12,
      mel: sec("E4 G4 C5 ~ B4 G4 A4 ~ F4 A4 C5 ~ B4 A4 G4 ~ E4 G4 C5 ~ D5 C5 B4 ~ A4 F4 D4 E4 G4 ~ C4 ~"),
      baj: sec("C3 - G2 - A2 - E2 - F2 - C3 - G2 - D3 - C3 - G2 - E2 - A2 - F2 - G2 - C3 - - -") },
    fund: { bpm: 112, onda: "square", ondaBajo: "triangle", vm: 0.06,
      mel: sec("C5 G4 E4 G4 C5 G4 E4 G4 D5 A4 F4 A4 D5 A4 F4 A4 E5 B4 G4 B4 E5 B4 G4 B4 F5 C5 A4 C5 G5 ~ - -"),
      baj: sec("C3 - C3 - C3 - C3 - D3 - D3 - D3 - D3 - E3 - E3 - E3 - E3 - F3 - F3 - G3 - G3 -") },
    busq: { bpm: 76, onda: "triangle", ondaBajo: "sine", vm: 0.13,
      mel: sec("D4 F4 G4 A4 C5 ~ A4 G4 F4 ~ D4 ~ C4 D4 F4 ~ G4 A4 C5 D5 C5 ~ A4 ~ G4 F4 G4 A4 D4 ~ - -"),
      baj: sec("D2 - - - A2 - - - G2 - - - F2 - - - D2 - - - C3 - - - G2 - - - A2 - - -") },
    virt: { bpm: 70, onda: "sine", ondaBajo: "sine", vm: 0.15,
      mel: sec("C5 ~ D5 ~ E5 ~ F#5 ~ G#5 ~ F#5 ~ E5 ~ D5 ~ C5 ~ A#4 ~ G#4 ~ A#4 ~ C5 ~ ~ ~ - - - -"),
      baj: sec("C3 - - - - - - - D3 - - - - - - - E3 - - - - - - - D3 - - - - - - -") },
    ofi: { bpm: 120, onda: "square", ondaBajo: "triangle", vm: 0.06,
      mel: sec("F4 A4 C5 A4 F4 A4 C5 ~ G4 A#4 D5 A#4 G4 ~ - - A4 C5 F5 C5 A4 C5 E5 ~ D5 C5 A#4 A4 G4 ~ F4 ~"),
      baj: sec("F2 - C3 - F2 - C3 - G2 - D3 - G2 - D3 - A2 - E3 - A2 - E3 - C3 - G2 - F2 - - -") },
    colab: { bpm: 104, onda: "square", ondaBajo: "triangle", vm: 0.06,
      mel: sec("G4 B4 D5 B4 C5 E5 D5 ~ B4 D5 G5 D5 E5 C5 A4 ~ G4 B4 D5 G5 F#5 E5 D5 ~ C5 A4 F#4 A4 G4 ~ - -"),
      baj: sec("G2 - D3 - C3 - G2 - G2 - D3 - A2 - E3 - G2 - D3 - B2 - D3 - C3 - D3 - G2 - - -") },
    inv: { bpm: 66, onda: "triangle", ondaBajo: "triangle", vm: 0.13,
      mel: sec("E4 ~ G4 B4 ~ A4 G4 ~ F#4 E4 ~ ~ B3 ~ E4 G4 ~ F#4 E4 ~ D4 E4 ~ ~ G4 ~ B4 E5 ~ D5 B4 ~ ~"),
      baj: sec("E2 - - B2 - - C3 - - G2 - - E2 - - B2 - - A2 - - B2 - - E2 - - B2 - - E2 - -") },
    terminal: { bpm: 128, onda: "square", ondaBajo: "sawtooth", vm: 0.05,
      mel: sec("A4 - A4 C5 - A4 D#5 ~ E5 - D5 - C5 - B4 ~ A4 - A4 C5 - A4 F5 ~ E5 - D5 C5 B4 G#4 A4 ~"),
      baj: sec("A2 A2 - A2 A2 - A2 A2 F2 F2 - F2 E2 E2 - E2 A2 A2 - A2 A2 - A2 A2 D2 D2 - D2 E2 E2 - E2") },
    informe: { bpm: 96, onda: "square", ondaBajo: "triangle", vm: 0.07,
      mel: sec("C5 E5 G5 C6 ~ ~ G5 C6 B5 ~ A5 ~ G5 ~ ~ ~ F5 A5 C6 ~ B5 G5 E5 ~ D5 ~ E5 ~ C5 ~ ~ ~"),
      baj: sec("C3 - G2 - C3 - E3 - F2 - C3 - G2 - B2 - F2 - A2 - G2 - E2 - G2 - G2 - C3 - - -") },
    apagado: { bpm: 60, onda: "triangle", ondaBajo: "sine", vm: 0.12,
      mel: sec("E5 ~ D5 ~ C5 ~ B4 ~ A4 ~ ~ ~ - - - - C5 ~ B4 ~ A4 ~ G#4 ~ A4 ~ ~ ~ - - - -"),
      baj: sec("A2 - - - - - - - F2 - - - - - - - D2 - - - - - - - E2 - - - - - - -") }
  };

  function disponible() { return !!(window.AudioContext || window.webkitAudioContext); }
  function iniciar() {
    if (ctx || !disponible()) { if (ctx && ctx.state === "suspended") ctx.resume(); return !!ctx; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      maestro = ctx.createGain(); maestro.gain.value = 0.9; maestro.connect(ctx.destination);
      busMusica = ctx.createGain(); busMusica.gain.value = vol.musica; busMusica.connect(maestro);
      busEfectos = ctx.createGain(); busEfectos.gain.value = vol.efectos; busEfectos.connect(maestro);
      var n = ctx.sampleRate * 0.5; ruido = ctx.createBuffer(1, n, ctx.sampleRate); var d = ruido.getChannelData(0); for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      document.addEventListener("visibilitychange", function () { if (!ctx) return; if (document.hidden) ctx.suspend(); else ctx.resume(); });
      if (pendiente) { var p = pendiente; pendiente = null; musica(p); }
      return true;
    } catch (e) { ctx = null; return false; }
  }
  function nota(bus, onda, f, t, dur, v, desliz) {
    if (!f) return;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = onda; o.frequency.setValueAtTime(f, t);
    if (desliz) o.frequency.exponentialRampToValueAtTime(desliz, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.01);
    g.gain.setValueAtTime(v, t + Math.max(0.01, dur - 0.04)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.02);
  }
  function rafaga(t, dur, v, filtro) {
    var s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    s.buffer = ruido; f.type = "bandpass"; f.frequency.value = filtro || 1200;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(busEfectos); s.start(t); s.stop(t + dur);
  }

  /* ---------- música ---------- */
  var pendiente = null;
  function largoNota(lista, i) { var n = 1; while (lista[(i + n) % lista.length] === "~" && n < lista.length) n++; return n; }
  function programa() {
    if (!actual || !ctx) return;
    var p = PISTAS[actual], dur = 60 / p.bpm / 2;
    while (proxima < ctx.currentTime + 0.15) {
      var i = paso % p.mel.length, m = p.mel[i], b = p.baj[paso % p.baj.length];
      if (m !== "-" && m !== "~") nota(busMusica, p.onda, hz(m), proxima, dur * largoNota(p.mel, i) * 0.95, p.vm);
      if (b !== "-" && b !== "~") nota(busMusica, p.ondaBajo, hz(b), proxima, dur * 0.9, p.vm * 1.1);
      proxima += dur; paso++;
    }
  }
  function musica(nombre) {
    if (nombre === actual) return;
    if (!ctx) { pendiente = nombre; return; }
    detenerMusica();
    actual = nombre; if (!nombre || !PISTAS[nombre]) { actual = null; return; }
    var p = PISTAS[nombre];
    if (p.archivo) {
      audioArchivo = new Audio(p.archivo); audioArchivo.loop = true; audioArchivo.volume = vol.musica;
      audioArchivo.play().catch(function () {}); return;
    }
    paso = 0; proxima = ctx.currentTime + 0.08;
    temporizador = setInterval(programa, 40); programa();
  }
  function detenerMusica() {
    if (temporizador) { clearInterval(temporizador); temporizador = null; }
    if (audioArchivo) { audioArchivo.pause(); audioArchivo = null; }
    actual = null;
  }

  /* ---------- efectos ---------- */
  var ultimoBlip = 0;
  var EFECTOS = {
    mover: function (t) { nota(busEfectos, "square", 880, t, 0.04, 0.05); },
    confirmar: function (t) { nota(busEfectos, "square", 660, t, 0.05, 0.06); nota(busEfectos, "square", 990, t + 0.05, 0.08, 0.06); },
    cancelar: function (t) { nota(busEfectos, "square", 440, t, 0.05, 0.05); nota(busEfectos, "square", 330, t + 0.05, 0.08, 0.05); },
    abrir: function (t) { for (var i = 0; i < 3; i++) nota(busEfectos, "square", 520 + i * 160, t + i * 0.07, 0.05, 0.06); },
    exito: function (t) { ["C5", "E5", "G5", "C6", "E6"].forEach(function (n, i) { nota(busEfectos, "square", hz(n), t + i * 0.07, 0.12, 0.06); }); },
    error: function (t) { nota(busEfectos, "sawtooth", 180, t, 0.3, 0.08, 70); rafaga(t, 0.25, 0.12, 500); },
    paso: function (t) { rafaga(t, 0.04, 0.025, 1800); },
    puerta: function (t) { nota(busEfectos, "triangle", 300, t, 0.18, 0.06, 150); rafaga(t, 0.15, 0.03, 900); },
    guardar: function (t) { nota(busEfectos, "triangle", hz("E6"), t, 0.12, 0.08); nota(busEfectos, "triangle", hz("B6"), t + 0.1, 0.2, 0.08); },
    reinicio: function (t) { nota(busEfectos, "square", 120, t, 0.6, 0.06, 900); nota(busEfectos, "triangle", 240, t + 0.6, 0.25, 0.08); },
    recurso: function (t) { nota(busEfectos, "square", hz("A5"), t, 0.06, 0.05); nota(busEfectos, "square", hz("E6"), t + 0.06, 0.1, 0.05); },
    golpe: function (t) { rafaga(t, 0.08, 0.06, 300); }
  };
  function sfx(nombre) { if (!ctx || !EFECTOS[nombre] || vol.efectos <= 0) return; EFECTOS[nombre](ctx.currentTime + 0.005); }
  function voz(frecuencia) {
    if (!ctx || vol.efectos <= 0) return;
    var t = ctx.currentTime; if (t - ultimoBlip < 0.045) return; ultimoBlip = t;
    nota(busEfectos, "square", frecuencia || 400, t, 0.035, 0.035);
  }
  function volumen(tipo, v) {
    v = Math.max(0, Math.min(1, v)); vol[tipo] = v;
    if (!ctx) return;
    if (tipo === "musica") { busMusica.gain.setTargetAtTime(v, ctx.currentTime, 0.05); if (audioArchivo) audioArchivo.volume = v; }
    else busEfectos.gain.setTargetAtTime(v, ctx.currentTime, 0.05);
  }

  window.SONIDO = { iniciar: iniciar, disponible: disponible, activo: function () { return !!ctx; }, musica: musica, detenerMusica: detenerMusica, sfx: sfx, voz: voz, volumen: volumen, PISTAS: PISTAS, pistaActual: function () { return actual || pendiente; } };
})();
