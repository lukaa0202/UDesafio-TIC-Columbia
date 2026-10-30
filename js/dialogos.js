/* DEPURADOR TIC · dialogos.js — textos de personajes, carteles y objetos (originales).
   Cada función recibe `p` (progreso) y devuelve líneas { quien, npc, cara, texto }. */
(function () {
  "use strict";
  function L(npc, quien, cara, texto) { return { npc: npc, quien: quien, cara: cara, texto: texto }; }
  function N(texto) { return { texto: texto }; }

  var CONSEJOS_BORNE = [
    "* Un consejo de robot viejo: todo sistema recibe algo, lo procesa y entrega algo. Entrada, proceso, salida.",
    "* Si una fuente no dice quién la escribió ni de dónde salió, yo no le creería ni el horario de limpieza.",
    "* Lee el reporte de incidente con calma. Los errores también son datos.",
    "* Las terminales reparadas quedan reparadas, aunque el sistema se reinicie. Lo aprendido no se borra."
  ];

  var D = {
    intro: function () {
      return [
        L("borne", "BORNE", "feliz", "* ¡Oh! Un operador de campo. Llegaste justo a tiempo."),
        L("borne", "BORNE", "neutral", "* Soy BORNE, el robot de mantenimiento del turno noche."),
        L("borne", "BORNE", "preocupado", "* Esta noche fallaron 16 terminales en los seis sectores del edificio."),
        L("borne", "BORNE", "neutral", "* Acércate a cada una, lee su falla y ejecuta el comando correcto."),
        L("borne", "BORNE", "preocupado", "* Cada comando equivocado le quita energía al sistema. Si llega a cero, hay que reiniciar."),
        L("borne", "BORNE", "neutral", "* Las luces rojas marcan las terminales con falla. Cuando una sala queda estable, se encienden sus lámparas."),
        L("borne", "BORNE", "feliz", "* El disquete brillante del vestíbulo guarda tu progreso. Igual guardo todo solo, por las dudas."),
        L("borne", "BORNE", "neutral", "* Con ESC o el botón MENÚ abres la pausa, los ajustes y el Modo Directo. ¡Suerte!")
      ];
    },
    borne: function (p) {
      if (p.total && p.reparadas === p.total) return [L("borne", "BORNE", "feliz", "* ¡Lo lograste! Todas las terminales están estables."), L("borne", "BORNE", "feliz", "* Tu Informe de Desempeño está en el MENÚ. Yo voy a pasar el trapeador, que es lo mío.")];
      if (!p.reparadas) return [L("borne", "BORNE", "neutral", "* Empieza por donde quieras. Cada puerta del vestíbulo lleva a un sector."), L("borne", "BORNE", "neutral", "* Los carteles junto a las puertas dicen qué unidad se trabaja adentro.")];
      return [L("borne", "BORNE", "feliz", "* Ya van " + p.reparadas + " de " + p.total + ". ¡El edificio se nota más tranquilo!"), L("borne", "BORNE", "neutral", CONSEJOS_BORNE[p.charlas % CONSEJOS_BORNE.length])];
    },
    cookie: function (p) {
      var s = p.sector.busq;
      if (s.estable) return [L("cookie", "COOKIE", "neutral", "* La subred está estable. Por fin puedo dormir en paz…"), L("cookie", "COOKIE", "neutral", "* Zzz…")];
      if (!p.charlas) return [N("* (La gata duerme sobre el router. Está tibio.)"), L("cookie", "COOKIE", "feliz", "* ¿Miau? Soy COOKIE. No, no esa cookie: yo no guardo tus datos de navegación."), L("cookie", "COOKIE", "preocupado", "* Desde que se cayó la subred, las búsquedas traen pura publicidad.")];
      return [L("cookie", "COOKIE", "feliz", p.charlas % 2 ? "* Cuando busco atún pongo la frase exacta entre comillas. Así no me salen sardinas." : "* Las páginas que venden cosas siempre aparecen primero. Yo excluyo lo que no quiero con un guion.")];
    },
    nimbo: function (p) {
      var s = p.sector.virt;
      if (s.estable) return [L("nimbo", "NIMBO", "feliz", "* Ahora todas mis nubes internas tienen su parte justa. ¡Me siento liviano!")];
      return [L("nimbo", "NIMBO", "feliz", "* ¡Hola! Soy NIMBO, una nube. Adentro mío corren otras nubes más chiquitas."),
        L("nimbo", "NIMBO", "neutral", "* Eso es virtualizar: un equipo que hace de varios."),
        L("nimbo", "NIMBO", "preocupado", "* Pero si le doy toda mi memoria a una nube de adentro… me quedo sin aire para mí. El anfitrión también necesita recursos.")];
    },
    mateo: function (p) {
      var s = p.sector.ofi;
      if (s.estable) return [L("mateo", "MATEO", "feliz", "* ¡Mi planilla por fin responde preguntas! Gracias, operador."), L("mateo", "MATEO", "feliz", "* Ahora sé en qué gasto más. Spoiler: café.")];
      if (s.reparadas) return [L("mateo", "MATEO", "neutral", "* ¡Algo cambió en la oficina! La impresora dejó de quejarse."), L("mateo", "MATEO", "preocupado", "* Todavía queda alguna terminal con falla por aquí.")];
      return [L("mateo", "MATEO", "preocupado", "* Hola… Soy Mateo. Anoté todos mis gastos en una planilla, pero no me dice nada."), L("mateo", "MATEO", "preocupado", "* Son solo números sueltos. ¿Les faltarán fórmulas… o un gráfico?")];
    },
    ficha: function (p) {
      var s = p.sector.inv;
      if (s.estable) return [L("ficha", "DOÑA FICHA", "feliz", "* Las fichas volvieron a su lugar. Así da gusto citar.")];
      return [L("ficha", "DOÑA FICHA", "neutral", "* Buenas noches. Soy Doña Ficha, guardiana del Archivo de Referencias."),
        L("ficha", "DOÑA FICHA", "preocupado", "* Una referencia sin autor, sin año o sin DOI es como un libro sin lomo: nadie la encuentra."),
        L("ficha", "DOÑA FICHA", "neutral", "* Y recuerda: la IA puede ayudarte a ordenar ideas, pero la autoría es tuya. Investiga primero.")];
    },
    cartel: function (p, sector) {
      var s = p.sector[sector], cat = p.categoria(sector);
      return [N("* " + (s.arriba ? "↑ " : "↓ ") + s.nombre.toUpperCase()), N("* " + (cat ? cat.detalle : "") + "."), N("* Terminales estables: " + s.reparadas + " de " + s.total + (s.estable ? ". Sector en orden." : "."))];
    },
    objetivos: function (p) {
      var l = [N("* CARTELERA DEL TURNO NOCHE"), N("* Objetivo: estabilizar las " + p.total + " terminales del edificio. Van " + p.reparadas + ".")];
      p.orden.forEach(function (k) { var s = p.sector[k]; l.push(N("* " + s.nombre + ": " + s.reparadas + "/" + s.total + (s.estable ? " ✔" : ""))); });
      return l;
    },
    respaldo: function () { return [N("* Un disquete de respaldo brilla en el piso."), N("* Copiaste tu progreso en el disquete. Partida guardada.")]; },
    expendedora: function () { return [N("* Una máquina expendedora. Vende «bytes de chocolate»."), N("* Está agotada. Alguien se llevó todos los megas.")]; }
  };

  var EXAMINAR = {
    mainframe: "* Un procesador enorme. Zumba como si pensara en voz alta.",
    torre: "* Torres de cómputo. Sus lucecitas parpadean como si se contaran chistes.",
    antena: "* Una antena parabólica apuntando al techo. Optimista.",
    holo: "* Un holograma: un cubo dentro de un cubo dentro de un cubo. Virtualización, versión decorativa.",
    cafetera: "* La cafetera de la oficina. Funciona mejor que cualquier otra cosa del edificio.",
    globo: "* Un globo terráqueo. Alguien marcó la facultad con un alfiler.",
    rack: "* Servidores trabajando en silencio. Hacen más de lo que aparentan.",
    estante: "* Un estante lleno de manuales y libros ordenados por color. Doña Ficha no aprueba ese sistema.",
    planta: "* Una planta. Es lo único del edificio que no necesita actualizaciones.",
    agua: "* Un dispensador de agua. Hidratarse también es mantenimiento.",
    herramientas: "* Una caja de herramientas: destornilladores, cinta aislante y un chicle de emergencia.",
    mesaRedonda: "* La mesa de reuniones. Aquí se decide quién edita qué y cuándo.",
    escalera: "* Una escalera para llegar a los estantes altos. No hay estantes altos.",
    banco: "* Un banco. Descansas un segundo y sigues.",
    mesaLectura: "* Una mesa de lectura con lámparas verdes. Silencio, por favor.",
    papeles: "* Una pila de papeles. El de arriba se llama «version_final_FINAL_ahora_si.docx».",
    cajon: "* Una caja con escarcha. Dice «NO ABRIR: RAM fría».",
    libros: "* Libros apilados con marcadores de colores.",
    lampara: "* Una lámpara de pie. Ilumina, que no es poco.",
    puff: "* Un puff. Es imposible levantarse rápido de aquí.",
    archivero: "* Un archivero metálico. Los cajones chirrían en orden alfabético.",
    sofa: "* Un sofá cómodo. Demasiado cómodo para el turno noche.",
    caja: "* Una caja de cartón con cables que nadie se anima a desenredar."
  };

  window.DIALOGOS = { D: D, EXAMINAR: EXAMINAR };
})();
