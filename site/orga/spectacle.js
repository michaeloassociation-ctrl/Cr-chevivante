// Spectacle · Pilotage : timeline défilante des tops (passés, en cours, à venir).
// Chargé par /orga/patch.js après l'ouverture de l'espace organisateurs.
// Ce fichier ne contient que de l'affichage : la conduite, les noms et les horaires
// sont lus dans le logiciel au moment de l'affichage. Aucune donnée sensible ici.
(function boot(n) {
  'use strict';
  var ready = typeof window.spPilot === 'function' && typeof window.extraAct === 'function' &&
    typeof window.shAct === 'function' && typeof window.showModel === 'function' && typeof window.render === 'function';
  if (!ready) { if ((n || 0) < 600) setTimeout(function () { boot((n || 0) + 1); }, 100); return; }
  if (window.__sxLoaded) return;
  window.__sxLoaded = true;

  /* ---------- réglages ---------- */
  var PARTS = {
    Avant: ['Avant le spectacle', '#9aa7c7'], T1: ['Tableau 1', '#ffbd59'], Transition: ['Transition', '#a98cf0'],
    T2: ['Tableau 2', '#e98fb0'], T3: ['Tableau 3', '#7ed0a3'], Fin: ['Épilogue et saluts', '#7db8f2']
  };
  var partOf = function (p) { return PARTS[p] || [p || 'Autre', '#c3c9d6']; };
  var LS_LOCK = 'mj-sx-lock';
  var locked = false;
  try { locked = localStorage.getItem(LS_LOCK) === '1'; } catch (e) {}

  /* ---------- outils ---------- */
  var H = function (s) { return esc(s); };
  var val = function (v) { v = v == null ? '' : String(v).trim(); return v && v !== '—' && v !== '-' ? v : ''; };
  var HM = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  var HMS = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' });
  var hhmm = function (ms) { return HM.format(new Date(ms)); };
  var sodOf = function (ms) { var p = {}; HMS.formatToParts(new Date(ms)).forEach(function (x) { p[x.type] = +x.value; }); return (p.hour || 0) * 3600 + (p.minute || 0) * 60 + (p.second || 0); };
  var sod = function (s) { s = ((Math.round(s) % 86400) + 86400) % 86400; return String(Math.floor(s / 3600)).padStart(2, '0') + ':' + String(Math.floor(s % 3600 / 60)).padStart(2, '0'); };
  var ms = function (s) { return mmss(Math.round(s)); };
  var sgn = function (s) { s = Math.round(s); return (s >= 0 ? '+' : '−') + mmss(Math.abs(s)); };
  var dCls = function (s) { return s > 15 ? 'over' : s < -15 ? 'under' : 'ok'; };
  var $id = function (id) { return document.getElementById(id); };
  var buzz = function () { try { if (navigator.vibrate) navigator.vibrate(30); } catch (e) {} };
  var onPilot = function () { try { return route() === 'spectacle' && ST.sp === 'pilot'; } catch (e) { return false; } };

  var ICO = {
    son: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 9a4 4 0 010 6M19 6.5a8 8 0 010 11"/>',
    lum: '<path d="M9 18h6M10 21h4M12 3a6 6 0 00-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0012 3z"/>',
    ent: '<path d="M10 17l5-5-5-5M15 12H3M14 4h5a2 2 0 012 2v12a2 2 0 01-2 2h-5"/>',
    sor: '<path d="M15 17l5-5-5-5M20 12H9M10 4H5a2 2 0 00-2 2v12a2 2 0 002 2h5"/>',
    acc: '<path d="M3 7l9-4 9 4-9 4zM3 7v10l9 4 9-4V7M12 11v10"/>',
    chant: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
    reg: '<path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 005.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
    star: '<path d="M12 2.5l2.8 6.3 6.9.6-5.2 4.6 1.6 6.8L12 17.3l-6.1 3.5 1.6-6.8-5.2-4.6 6.9-.6z"/>'
  };
  var svg = function (k) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICO[k] + '</svg>'; };

  /* ---------- modèle : ce qui est passé, en cours, à venir ---------- */
  function model() {
    var m = showModel();
    var tops = m.tops || [], sh = m.sh || {}, marks = sh.marks || {}, now = Date.now();
    var running = !!sh.run && m.idx >= 0, ended = !!sh.end && !sh.run;
    var idx = running ? m.idx : -1;
    var d = tops.map(function (t) { return Math.max(0, +t.dur || 0); });
    var totAll = d.reduce(function (a, b) { return a + b; }, 0) || 1;
    // parties consécutives (Avant, T1, Transition, T2, Transition, T3, Fin)
    var groups = [], gOf = [];
    tops.forEach(function (t, i) {
      var k = t.partie || 'Autre', g = groups[groups.length - 1];
      if (!g || g.k !== k) { g = { k: k, n: 0, dur: 0, first: i, last: i }; groups.push(g); }
      g.n++; g.dur += d[i]; g.last = i; gOf[i] = groups.length - 1;
    });
    // durées réelles des tops déjà joués
    var real = {}, boundary = null;
    var lastIdx = running ? idx : tops.length - 1;
    for (var i = lastIdx; i >= 0; i--) {
      var id = tops[i].id;
      if (!marks[id]) continue;
      if (running && i === idx) { boundary = marks[id]; continue; }
      var stop = boundary != null ? boundary : (ended && sh.end ? sh.end : null);
      if (stop != null) real[id] = Math.max(0, (stop - marks[id]) / 1000);
      boundary = marks[id];
    }
    // top de référence pour l'écart : le lever de rideau (1.1) s'il a été joué
    var ref = null;
    tops.forEach(function (t) { if (!ref && t.n === '1.1' && marks[t.id]) ref = t; });
    if (!ref) tops.forEach(function (t) { if (!ref && marks[t.id]) ref = t; });
    var M = { m: m, tops: tops, sh: sh, marks: marks, now: now, running: running, ended: ended, idx: idx, d: d, totAll: totAll, groups: groups, gOf: gOf, real: real, ref: ref };
    var lt = tops[tops.length - 1];
    M.plannedEndSod = lt ? m.base + (m.off[lt.id] || 0) + d[tops.length - 1] : m.base;
    if (running) {
      var cur = tops[idx];
      M.cur = cur;
      M.curStart = marks[cur.id] || now;
      M.beforeCur = d.slice(0, idx).reduce(function (a, b) { return a + b; }, 0);
      M.cum = []; var acc = 0;
      for (var j = idx + 1; j < tops.length; j++) { M.cum[j] = acc; acc += d[j]; }
      M.restAfterCur = acc;
      M.driftBase = ref ? (M.curStart - marks[ref.id]) / 1000 - ((m.off[cur.id] || 0) - (m.off[ref.id] || 0)) : 0;
    }
    return M;
  }

  // valeurs qui changent chaque seconde
  function live(M) {
    var now = Date.now(), dc = M.d[M.idx], el = Math.max(0, (now - M.curStart) / 1000), left = dc - el;
    var over = dc > 0 ? Math.max(0, el - dc) : 0;
    var drift = M.driftBase + over;
    var base = M.curStart + Math.max(dc, el) * 1000;
    return {
      now: now, el: el, left: left, dc: dc, drift: drift,
      end: base + M.restAfterCur * 1000,
      proj: function (i) { return base + (M.cum[i] || 0) * 1000; },
      pctTop: dc > 0 ? Math.min(100, el / dc * 100) : 100,
      pos: Math.min(100, (M.beforeCur + Math.min(el, dc)) / M.totAll * 100),
      late: dc > 0 && el > dc + 15, soon: dc > 0 && left <= 10 && left > -15
    };
  }

  /* ---------- morceaux d'affichage ---------- */
  function tags(t, full) {
    var out = [], chant = /chant/i.test((t.seq || '') + ' ' + (t.son || ''));
    var tag = function (c, k, txt) { return '<span class="sx-tag ' + c + '">' + svg(k) + '<span>' + H(txt) + '</span></span>'; };
    if (chant) out.push(tag('t-chant', 'chant', 'Chant'));
    if (val(t.son)) out.push(tag('t-son', 'son', t.son));
    if (val(t.lum)) out.push(tag('t-lum', 'lum', t.lum));
    if (val(t.ent)) out.push(tag('t-ent', 'ent', t.ent));
    if (val(t.sor)) out.push(tag('t-sor', 'sor', t.sor));
    if (full && val(t.acc)) out.push(tag('t-acc', 'acc', t.acc));
    if (full && val(t.reg)) out.push(tag('t-reg', 'reg', t.reg));
    return out.length ? '<div class="sx-tags">' + out.join('') + '</div>' : '';
  }
  function details(t) { return typeof topDetail === 'function' ? topDetail(t) : tags(t, true); }

  function showBar(pos, idle) {
    return '<div class="sx-show" aria-hidden="true"><div class="sx-segs">' + MODEL.groups.map(function (g) {
      return '<i style="flex-grow:' + Math.max(g.dur, 4) + ';--c:' + partOf(g.k)[1] + '"></i>';
    }).join('') + '</div>' + (idle ? '' : '<div class="sx-mask" id="sx-mask" style="left:' + pos + '%"></div><u id="sx-mark" style="left:' + pos + '%"></u>') + '</div>';
  }
  function legend(M) {
    var seen = {};
    return '<div class="sx-legend">' + M.groups.filter(function (g) { if (seen[g.k]) return false; seen[g.k] = 1; return true; }).map(function (g) {
      return '<span><i style="--c:' + partOf(g.k)[1] + '"></i>' + H(partOf(g.k)[0]) + '</span>';
    }).join('') + '</div>';
  }
  function lockBar() {
    return '<div class="sx-lockbar"><span>Mode suivi : les boutons de pilotage sont masqués sur cet appareil.</span><button class="chip" data-act="spxlock">Déverrouiller</button></div>';
  }

  function head(M) {
    var t = M.cur, nx = M.tops[M.idx + 1], P = partOf(t.partie), L = live(M);
    var ctrl = locked ? lockBar() :
      '<div class="sx-ctrl' + (nx ? '' : ' sx-last') + '"><button class="sx-pbtn" data-act="spxprev" ' + (M.idx <= 0 ? 'disabled' : '') + ' aria-label="Revenir au top précédent">◀</button>' +
      '<button class="sx-nbtn' + (L.soon ? ' sx-soon' : '') + '" id="sx-next" data-act="spxnext">' +
      (nx ? '<span>TOP SUIVANT ▶</span><b>' + H(nx.n) + ' · ' + H(nx.seq) + '</b>' : '<span>FIN DU SPECTACLE ■</span><b>Arrêter le chrono</b>') + '</button></div>';
    return '<div class="sx-head' + (L.late ? ' sx-late' : L.soon ? ' sx-warn' : '') + '" id="sx-head" style="--c:' + P[1] + '">' +
      '<div class="sx-now"><div class="sx-badge"><span>TOP</span><b>' + H(t.n) + '</b></div>' +
      '<div class="sx-title"><span class="sx-pill">' + H(P[0]) + '</span><b>' + H(t.seq) + '</b></div>' +
      '<div class="sx-clock"><span>heure</span><b id="sx-clock">' + hms(L.now) + '</b></div></div>' +
      '<div class="sx-timers">' +
      '<div><span>dans ce top</span><b id="sx-el">' + ms(L.el) + '</b></div>' +
      '<div><span id="sx-leftl">' + (L.dc ? (L.left < 0 ? 'dépassement' : 'il reste') : 'durée libre') + '</span><b id="sx-left" class="' + (L.dc && L.left < 0 ? 'sx-red' : '') + '">' + (L.dc ? (L.left < 0 ? sgn(-L.left) : ms(L.left)) : '—') + '</b></div>' +
      '<div><span id="sx-driftl">' + driftLabel(L.drift) + '</span><b id="sx-drift" class="sx-' + dCls(L.drift) + '">' + sgn(L.drift) + '</b></div>' +
      '<div><span>fin estimée</span><b id="sx-end">' + hhmm(L.end) + '</b></div></div>' +
      '<div class="sx-tbar"><i id="sx-tbar" style="width:' + L.pctTop + '%"></i></div>' +
      showBar(L.pos) + ctrl + '</div>';
  }
  function driftLabel(s) { return s > 15 ? 'retard' : s < -15 ? 'avance' : 'à l\'heure'; }

  function readyCard(M) {
    var first = M.tops[0];
    return '<div class="sx-ready">' +
      '<div class="sx-ready-t"><div><span class="sx-kick">Lever de rideau</span><b class="sx-big">' + H(curtain()) + '</b></div>' +
      '<div class="sx-cd" id="sx-cd">' + countdown() + '</div></div>' +
      '<div class="sx-stats"><div><b>' + M.tops.length + '</b><span>tops</span></div><div><b>' + ms(M.m.total) + '</b><span>de spectacle</span></div><div><b>' + sod(M.plannedEndSod) + '</b><span>fin prévue</span></div></div>' +
      showBar(0, true) + legend(M) +
      (locked ? lockBar() : '<button class="bigbtn go sx-go" data-act="spxstart">▶ LANCER LE SPECTACLE</button>') +
      '<div class="sub">Appuyez sur Lancer à l\'accueil du public (top ' + H(first.n) + ' · ' + H(first.seq) + '), puis sur « Top suivant » à chaque repère. Tous les appareils connectés suivent en direct.</div></div>';
  }

  function countdown() {
    var p = parisNow(), days = Math.round((Date.UTC(2026, 11, 12) - Date.UTC(p.y, p.m - 1, p.d)) / 864e5);
    if (days > 1) return '<b>J-' + days + '</b><span>samedi 12 décembre</span>';
    if (days === 1) return '<b>Demain</b><span>samedi 12 décembre</span>';
    if (days < 0) return '<b>Terminé</b><span>le spectacle a eu lieu</span>';
    var left = hm(curtain()) * 60 - sodOf(Date.now());
    if (left <= 0) return '<b>C\'est l\'heure !</b><span>lancez quand le public est prêt</span>';
    var h = Math.floor(left / 3600);
    return '<b>' + (h ? h + ' h ' + String(Math.floor(left % 3600 / 60)).padStart(2, '0') : ms(left)) + '</b><span>avant le lever de rideau</span>';
  }

  function recap(M) {
    var sh = M.sh, ref = M.ref;
    if (!ref) return '<div class="sx-recap"><b class="sx-big">Terminé</b></div>';
    var ri = M.tops.indexOf(ref), realTot = (sh.end - M.marks[ref.id]) / 1000;
    var planTot = M.d.slice(ri).reduce(function (a, b) { return a + b; }, 0), diff = realTot - planTot;
    var rows = M.groups.filter(function (g) { return g.last >= ri; }).map(function (g) {
      var pl = 0, re = 0, played = 0;
      for (var i = Math.max(g.first, ri); i <= g.last; i++) { pl += M.d[i]; if (M.real[M.tops[i].id] != null) { re += M.real[M.tops[i].id]; played++; } }
      return { g: g, pl: pl, re: re, played: played };
    }).filter(function (r) { return r.played; });
    var max = Math.max.apply(null, rows.map(function (r) { return Math.max(r.pl, r.re); }).concat([1]));
    return '<div class="sx-recap"><div><span class="sx-kick">Spectacle terminé · ' + hhmm(M.marks[ref.id]) + ' → ' + hhmm(sh.end) + '</span><b class="sx-big">' + ms(realTot) + '</b>' +
      '<div class="sx-rsum">Durée réelle depuis le top ' + H(ref.n) + ' · prévu ' + ms(planTot) + ' <b class="sx-delta ' + dCls(diff) + '">' + sgn(diff) + '</b></div></div>' +
      '<div class="sx-parts">' + rows.map(function (r) {
        var P = partOf(r.g.k), df = r.re - r.pl;
        return '<div class="sx-prow" style="--c:' + P[1] + '"><span>' + H(P[0]) + '</span><span class="sx-d">' + ms(r.re) + ' <small>/ ' + ms(r.pl) + '</small> <b class="sx-delta ' + dCls(df) + '">' + sgn(df) + '</b></span>' +
          '<div class="sx-pb"><i class="pl" style="width:' + (r.pl / max * 100) + '%"></i><i class="re" style="width:' + (r.re / max * 100) + '%"></i></div></div>';
      }).join('') + '</div>' +
      '<div class="sub">Barre claire : durée prévue · barre colorée : durée réelle.</div>' +
      (locked ? '' : '<div class="row"><button class="btn ghost sm" data-act="spxresume">Reprendre au dernier top</button></div>') + '</div>';
  }

  function jumpCtl(t) {
    if (!MODEL.running || locked) return '';
    if (ST.sxGo === t.id) return '<div class="sx-confirm"><span>Lancer le top ' + H(t.n) + ' maintenant ?</span><button class="btn sm" data-act="spxgook" data-id="' + H(t.id) + '">Oui, lancer</button><button class="btn ghost sm" data-act="spxgono">Annuler</button></div>';
    return '<button class="btn ghost sm sx-jump" data-act="spxgo" data-id="' + H(t.id) + '">Démarrer ce top maintenant</button>';
  }

  function item(M, t, i, L) {
    var P = partOf(t.partie), dd = M.d[i], open = !!(ST.open && ST.open[t.id]);
    var planned = M.m.base + (M.m.off[t.id] || 0);
    var st = M.running ? (i < M.idx ? 'past' : i === M.idx ? 'cur' : i === M.idx + 1 ? 'next' : 'up') : M.ended ? (M.marks[t.id] ? 'past' : 'skip') : 'up';
    var time = '', right = '', body = '', act = '';
    if (st === 'past') {
      time = M.marks[t.id] ? '<b>' + hhmm(M.marks[t.id]) + '</b>' : '<b>—</b><small>sauté</small>';
      var r = M.real[t.id];
      right = r != null ? '<span class="sx-d">' + ms(r) + '</span>' + (dd ? ' <b class="sx-delta ' + dCls(r - dd) + '">' + sgn(r - dd) + '</b>' : '') : '<span class="sx-d">sauté</span>';
      if (open) body = '<div class="sx-act">' + H(t.action) + '</div>' + details(t) + jumpCtl(t);
      act = ' data-act="spxopen" data-id="' + H(t.id) + '"';
    } else if (st === 'skip') {
      time = '<b>—</b>'; right = '<span class="sx-d">non joué</span>';
      act = ' data-act="spxopen" data-id="' + H(t.id) + '"';
      if (open) body = '<div class="sx-act">' + H(t.action) + '</div>' + details(t);
    } else if (st === 'cur') {
      time = '<b>' + hhmm(M.curStart) + '</b><small>départ</small>';
      right = '<span class="sx-live"><i></i>EN COURS</span>';
      body = '<div class="sx-act">' + H(t.action) + '</div>' + (open ? details(t) : tags(t, true) + '<span class="sx-more">Voir tout le détail</span>');
      act = ' data-act="spxopen" data-id="' + H(t.id) + '"';
    } else if (st === 'next') {
      time = '<b data-sx-p="' + i + '">' + hhmm(L.proj(i)) + '</b>';
      right = '<span class="sx-d">' + (dd ? ms(dd) : '—') + '</span>';
      body = '<div class="sx-prep">À PRÉPARER <b id="sx-nextcd">' + nextIn(L) + '</b></div>' +
        (val(t.repere) ? '<div class="sx-cue"><span>Repère de départ</span>' + H(t.repere) + '</div>' : '') +
        '<div class="sx-act sub">' + H(t.action) + '</div>' + tags(t, true);
    } else {
      if (M.running) {
        var pj = L.proj(i), gap = sodOf(pj) - planned;
        time = '<b data-sx-p="' + i + '">' + hhmm(pj) + '</b><small data-sx-q="' + i + '">' + (Math.abs(gap) >= 60 && Math.abs(gap) < 10800 ? 'prévu ' + sod(planned) : '') + '</small>';
      } else time = '<b>' + sod(planned) + '</b>';
      right = '<span class="sx-d">' + (dd ? ms(dd) : '—') + '</span>';
      body = open ? '<div class="sx-act">' + H(t.action) + '</div>' + details(t) + jumpCtl(t) : tags(t, false);
      act = ' data-act="spxopen" data-id="' + H(t.id) + '"';
    }
    return '<div class="sx-item sx-' + st + (open ? ' sx-open' : '') + '" id="sx-' + H(t.id) + '" style="--c:' + P[1] + '">' +
      '<div class="sx-time">' + time + '</div><div class="sx-node">' + (st === 'cur' ? '<svg class="sx-star" viewBox="0 0 24 24" aria-hidden="true">' + ICO.star + '</svg>' : '') + '</div>' +
      '<div class="sx-c"><div class="sx-card"' + act + '><div class="sx-l1"><b class="sx-n">' + H(t.n) + '</b><span class="sx-seq">' + H(t.seq) + '</span>' + right + '</div>' + body + '</div></div></div>';
  }
  function nextIn(L) {
    if (!L.dc) return 'au prochain repère';
    return L.left >= 0 ? 'dans ' + ms(L.left) : 'attendu depuis ' + ms(-L.left);
  }

  function rail(M) {
    var L = M.running ? live(M) : null, html = '<div class="sx-rail" id="sx-rail">', gi = -1;
    M.tops.forEach(function (t, i) {
      var g = M.gOf[i];
      if (g !== gi) {
        gi = g; var G = M.groups[g], P = partOf(G.k);
        var past = M.ended || (M.running && G.first <= M.idx);
        html += '<div class="sx-item sx-sec' + (past ? ' sx-secpast' : '') + '" style="--c:' + P[1] + '"><div></div><div class="sx-node"></div><div class="sx-sech"><b>' + H(P[0]) + '</b><small>' + G.n + ' top' + (G.n > 1 ? 's' : '') + ' · ' + ms(G.dur) + '</small></div></div>';
      }
      html += item(M, t, i, L);
    });
    return html + '</div>';
  }

  function foot(M) {
    var reset = (M.running || M.ended) && !locked ? (ST.del === 'show'
      ? '<button class="btn danger sm" data-act="shreset">Confirmer : tout remettre à zéro</button><button class="btn ghost sm" data-act="spxdelno">Annuler</button>'
      : '<button class="btn ghost danger sm" data-act="shresetask">' + (M.running ? 'Arrêter et remettre à zéro' : 'Remettre à zéro') + '</button>') : '';
    return '<div class="sx-foot"><div class="row"><button class="chip" data-act="spxlock" aria-pressed="' + locked + '">' + (locked ? 'Déverrouiller le pilotage' : 'Verrouiller (suivi seul)') + '</button>' + reset + '</div>' +
      '<div class="sub">' + (locked ? 'Cet appareil suit le spectacle en direct sans pouvoir le piloter.' :
        'Un seul appareil pilote les tops, les autres suivent en direct (verrouillez-les pour éviter un appui accidentel). Sur ordinateur : → ou « Page suivante » = top suivant, ← = retour ; une télécommande de présentation fonctionne aussi.') + '</div></div>';
  }

  /* ---------- nouvel onglet Pilotage ---------- */
  var MODEL = null, original = window.spPilot, broken = false;
  function sxPilot() {
    if (broken) return original();
    try { return build(); } catch (e) {
      // En cas d'imprévu, on revient à l'affichage d'origine plutôt que de bloquer l'onglet
      broken = true; try { console.error('Pilotage (nouvelle timeline) désactivé :', e); } catch (x) {}
      return original();
    }
  }
  function build() {
    css();
    var M = MODEL = model();
    if (!M.tops.length) return '<div class="banner">Aucun top dans la conduite.</div>';
    var top = M.running ? head(M) : M.ended ? recap(M) : readyCard(M);
    var html = top + rail(M) + foot(M) + (M.running ? '<button class="sx-back" id="sx-back" data-act="spxfollow" hidden>Revenir au top en cours</button>' : '');
    Promise.resolve().then(function () { try { afterRender(M); } catch (e) {} });
    return html;
  }
  window.spPilot = sxPilot;

  /* ---------- défilement : suivre le top en cours ---------- */
  var seen = null;
  function afterRender(M) {
    var cur = M.running ? M.cur.id : null;
    if (cur && (!seen || seen.cur !== cur)) scrollToCur(!!seen);
    seen = { cur: cur };
    tick();
  }
  function scrollToCur(smooth) {
    var main = $id('main'), el = document.querySelector('.sx-item.sx-cur');
    if (!main || !el) return;
    var hd = $id('sx-head'), hh = hd ? hd.getBoundingClientRect().height : 0;
    var y = el.getBoundingClientRect().top - main.getBoundingClientRect().top + main.scrollTop - hh - 44;
    main.scrollTo({ top: Math.max(0, y), behavior: smooth ? 'smooth' : 'auto' });
  }
  function updateBack() {
    var b = $id('sx-back'), el = document.querySelector('.sx-item.sx-cur'), main = $id('main');
    if (!b || !el || !main) return;
    var r = el.getBoundingClientRect(), mr = main.getBoundingClientRect(), hd = $id('sx-head');
    var top = mr.top + (hd ? hd.getBoundingClientRect().height : 0);
    var above = r.bottom < top + 24, below = r.top > mr.bottom - 48;
    b.hidden = !(above || below);
    b.textContent = (above ? '↑ ' : '↓ ') + 'Revenir au top en cours';
  }

  /* ---------- horloge : mise à jour chaque seconde ---------- */
  var wake = null;
  function wakeOn() {
    if (wake || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
    navigator.wakeLock.request('screen').then(function (w) { wake = w; w.addEventListener('release', function () { wake = null; }); }).catch(function () {});
  }
  function wakeOff() { if (wake) { try { wake.release(); } catch (e) {} wake = null; } }
  var set = function (id, v) { var e = $id(id); if (e && e.textContent !== v) e.textContent = v; };

  function tick() { try { tick0(); } catch (e) { try { console.error(e); } catch (x) {} } }
  function tick0() {
    if (broken || !onPilot() || !$id('sx-rail')) { seen = null; wakeOff(); return; }
    var M = MODEL;
    if (!M) return;
    if (M.running) {
      // si l'état a changé ailleurs sans nouvel affichage, on se resynchronise
      var sh = ST.items.show || {};
      if (!sh.run || sh.cur !== M.cur.id) { if (!busy()) render(); return; }
      wakeOn();
      var L = live(M);
      set('sx-clock', hms(L.now));
      set('sx-el', ms(L.el));
      if (L.dc) {
        set('sx-left', L.left < 0 ? sgn(-L.left) : ms(L.left));
        set('sx-leftl', L.left < 0 ? 'dépassement' : 'il reste');
        var le = $id('sx-left'); if (le) le.className = L.left < 0 ? 'sx-red' : L.left <= 10 ? 'sx-gold' : '';
      }
      set('sx-drift', sgn(L.drift)); set('sx-driftl', driftLabel(L.drift));
      var de = $id('sx-drift'); if (de) de.className = 'sx-' + dCls(L.drift);
      set('sx-end', hhmm(L.end));
      set('sx-nextcd', nextIn(L));
      var tb = $id('sx-tbar'); if (tb) tb.style.width = L.pctTop + '%';
      var mk = $id('sx-mark'), mask = $id('sx-mask');
      if (mk) mk.style.left = L.pos + '%'; if (mask) mask.style.left = L.pos + '%';
      var hd = $id('sx-head'); if (hd) { hd.classList.toggle('sx-late', L.late); hd.classList.toggle('sx-warn', L.soon && !L.late); }
      var nb = $id('sx-next'); if (nb) nb.classList.toggle('sx-soon', L.soon);
      document.querySelectorAll('[data-sx-p]').forEach(function (e) {
        var i = +e.getAttribute('data-sx-p'), pj = L.proj(i);
        var v = hhmm(pj); if (e.textContent !== v) e.textContent = v;
        var q = document.querySelector('[data-sx-q="' + i + '"]');
        if (q) { var gap = sodOf(pj) - (M.m.base + (M.m.off[M.tops[i].id] || 0)); var tx = Math.abs(gap) >= 60 && Math.abs(gap) < 10800 ? 'prévu ' + sod(M.m.base + (M.m.off[M.tops[i].id] || 0)) : ''; if (q.textContent !== tx) q.textContent = tx; }
      });
      updateBack();
    } else {
      wakeOff();
      var cd = $id('sx-cd'); if (cd && !M.ended) { var h = countdown(); if (cd.innerHTML !== h) cd.innerHTML = h; }
      var sh2 = ST.items.show || {};
      if (sh2.run && showModel().idx >= 0 && !busy()) render();
    }
  }
  setInterval(tick, 1000);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') tick(); });
  var mainEl = $id('main');
  if (mainEl) { var raf = 0; mainEl.addEventListener('scroll', function () { if (raf) return; raf = requestAnimationFrame(function () { raf = 0; updateBack(); }); }, { passive: true }); }

  /* ---------- actions ---------- */
  var lastPress = 0;
  function guard() { var n = Date.now(); if (n - lastPress < 700) return false; lastPress = n; return true; }
  function next() { var sh = ST.items.show || {}; if (!sh.run || !guard()) return; ST.sxGo = null; shAct('shnext'); buzz(); }
  function prev() { var sh = ST.items.show || {}; if (!sh.run || !guard()) return; ST.sxGo = null; shAct('shprev'); buzz(); }
  function jumpTo(id) {
    var m = showModel(), tops = m.tops, j = tops.findIndex(function (t) { return t.id === id; }), sh = ST.items.show || {};
    if (j < 0 || !sh.run) return;
    var marks = Object.assign({}, sh.marks || {}), now = Date.now();
    tops.forEach(function (t, i) { if (i >= j) delete marks[t.id]; });
    marks[id] = now;
    ST.open[id] = false;
    setItem('show', { cur: id, marks: marks });
    buzz();
    try { toast('Top ' + tops[j].n + ' lancé'); } catch (e) {}
  }

  var extra0 = window.extraAct;
  window.extraAct = function (a, t) {
    if (!a || a.indexOf('spx') !== 0) return extra0.apply(this, arguments);
    try { act(a, t); } catch (e) { try { console.error(e); } catch (x) {} }
    return true;
  };
  function act(a, t) {
    switch (a) {
      case 'spxstart': if (guard()) { shAct('shstart'); buzz(); } break;
      case 'spxnext': next(); break;
      case 'spxprev': prev(); break;
      case 'spxopen': { var id = t.dataset.id; ST.open[id] = !ST.open[id]; if (!ST.open[id] && ST.sxGo === id) ST.sxGo = null; render(); break; }
      case 'spxgo': ST.sxGo = t.dataset.id; render(); break;
      case 'spxgono': ST.sxGo = null; render(); break;
      case 'spxgook': { var gid = t.dataset.id; ST.sxGo = null; jumpTo(gid); break; }
      case 'spxlock': locked = !locked; try { localStorage.setItem(LS_LOCK, locked ? '1' : '0'); } catch (e) {} render(); break;
      case 'spxfollow': scrollToCur(true); break;
      case 'spxresume': setItem('show', { run: true, end: null }); break;
      case 'spxdelno': ST.del = null; render(); break;
    }
  }

  // Clavier et télécommande de présentation (→ / Page suivante, ← / Page précédente)
  document.addEventListener('keydown', function (e) {
    if (broken || locked || e.ctrlKey || e.metaKey || e.altKey || busy() || !onPilot()) return;
    var sh = ST.items.show || {};
    if (!sh.run) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); prev(); }
  });

  /* ---------- styles ---------- */
  function css() {
    if ($id('sx-css')) return;
    var s = document.createElement('style');
    s.id = 'sx-css';
    s.textContent = [
      '.sx-head{position:sticky;top:0;z-index:6;margin:0 calc(-1 * var(--pad));padding:10px var(--pad) 12px;background:var(--surface);border-bottom:1px solid var(--filet);display:flex;flex-direction:column;gap:9px;box-shadow:0 12px 24px -12px rgba(0,0,0,.6)}',
      '.sx-now{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:12px;align-items:center}',
      '.sx-badge{display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:62px;height:62px;padding:0 6px;border-radius:14px;background:var(--surface-3);border:2px solid var(--c);box-shadow:0 0 0 4px rgba(255,189,89,.12)}',
      '.sx-badge span{font:400 10px/1 var(--f-sous);letter-spacing:.14em;color:var(--encre-2)}',
      '.sx-badge b{font:400 30px/1.05 var(--f-titre);color:var(--or);font-variant-numeric:tabular-nums}',
      '.sx-title{display:flex;flex-direction:column;gap:5px;min-width:0}',
      '.sx-title b{font-size:17px;font-weight:600;line-height:1.25;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}',
      '.sx-pill{align-self:flex-start;font:400 11px/1 var(--f-sous);letter-spacing:.08em;text-transform:uppercase;color:var(--bleu-nuit);background:var(--c);border-radius:999px;padding:4px 9px}',
      '.sx-clock{text-align:right}.sx-clock span{display:block;font-size:10px;color:var(--encre-2);text-transform:uppercase;letter-spacing:.1em}.sx-clock b{font-variant-numeric:tabular-nums;font-size:15px;font-weight:600}',
      '.sx-timers{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}',
      '.sx-timers>div{background:var(--surface-2);border:1px solid var(--filet);border-radius:10px;padding:5px 4px 6px;text-align:center;min-width:0}',
      '.sx-timers span{display:block;font-size:10.5px;color:var(--encre-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.sx-timers b{display:block;font:600 19px/1.2 var(--f-corps);font-variant-numeric:tabular-nums;white-space:nowrap;letter-spacing:-.01em}',
      '@media (min-width:700px){.sx-timers b{font-size:26px}.sx-title b{font-size:21px}.sx-badge{min-width:76px;height:76px}.sx-badge b{font-size:38px}.sx-clock b{font-size:18px}}',
      '.sx-red{color:var(--alerte)}.sx-gold{color:var(--or)}.sx-ok{color:var(--ok)}.sx-over{color:var(--alerte)}.sx-under{color:var(--info)}',
      '.sx-tbar{height:5px;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden}',
      '.sx-tbar i{display:block;height:100%;background:linear-gradient(90deg,var(--brique),var(--or));border-radius:99px;transition:width .9s linear}',
      '.sx-late .sx-tbar i{background:var(--alerte)}',
      '.sx-late{border-bottom-color:var(--alerte);box-shadow:inset 0 -3px 0 var(--alerte),0 12px 24px -12px rgba(0,0,0,.6)}',
      '.sx-warn .sx-badge{border-color:var(--or)}',
      '.sx-show{position:relative;height:8px;margin:2px 0}',
      '.sx-segs{display:flex;gap:2px;height:100%;border-radius:99px;overflow:hidden}',
      '.sx-segs i{background:var(--c)}',
      '.sx-mask{position:absolute;top:0;bottom:0;right:0;background:rgba(14,29,60,.72);border-radius:0 99px 99px 0;transition:left .9s linear}',
      '.sx-show u{position:absolute;top:-5px;width:4px;height:18px;border-radius:3px;background:#fff;box-shadow:0 0 10px 3px rgba(255,189,89,.8);transform:translateX(-2px);transition:left .9s linear}',
      '.sx-ctrl{display:grid;grid-template-columns:60px minmax(0,1fr);gap:8px}',
      '.sx-pbtn{min-height:58px;border-radius:14px;border:1px solid var(--filet-fort);background:var(--surface-3);color:var(--encre);font-size:18px}',
      '.sx-pbtn:disabled{opacity:.35}',
      '.sx-nbtn{min-height:58px;border-radius:14px;border:0;background:var(--ok);color:#05261a;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:6px 12px;font-family:var(--f-corps);touch-action:manipulation;-webkit-tap-highlight-color:transparent;min-width:0}',
      '.sx-nbtn span{font-weight:800;font-size:17px;letter-spacing:.05em}',
      '.sx-nbtn b{font-weight:500;font-size:12.5px;opacity:.85;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.sx-nbtn:active{transform:scale(.985)}',
      '.sx-last .sx-nbtn{background:var(--or);color:var(--bleu-nuit)}',
      '.sx-lockbar{display:flex;align-items:center;gap:10px;justify-content:space-between;background:var(--surface-2);border:1px dashed var(--filet-fort);border-radius:12px;padding:8px 10px;font-size:12.5px;color:var(--encre-2)}',
      '.sx-rail{display:flex;flex-direction:column;padding:6px 0 8px;max-width:920px;width:100%}',
      '.sx-item{display:grid;grid-template-columns:50px 22px minmax(0,1fr);column-gap:8px}',
      '.sx-node{position:relative}',
      '.sx-node::before{content:"";position:absolute;left:50%;top:0;bottom:0;width:2px;transform:translateX(-50%);background:var(--filet-fort)}',
      '.sx-node::after{content:"";position:absolute;left:50%;top:15px;width:12px;height:12px;border-radius:50%;transform:translateX(-50%);background:var(--surface);border:2px solid var(--c);box-sizing:border-box}',
      '.sx-past .sx-node::before,.sx-secpast .sx-node::before{background:var(--or);opacity:.75}',
      '.sx-past .sx-node::after{background:var(--c)}',
      '.sx-cur .sx-node::before{background:linear-gradient(var(--or) 0,var(--or) 26px,var(--filet-fort) 26px)}',
      '.sx-cur .sx-node::after{display:none}',
      '.sx-star{position:absolute;left:50%;top:10px;width:24px;height:24px;transform:translateX(-50%);fill:var(--or);stroke:none;filter:drop-shadow(0 0 6px rgba(255,189,89,.9))}',
      '.sx-next .sx-node::after{border-color:var(--ok);box-shadow:0 0 0 3px rgba(95,208,160,.25)}',
      '.sx-c{padding-bottom:8px;min-width:0}',
      '.sx-time{padding-top:11px;text-align:right;font-variant-numeric:tabular-nums;line-height:1.15}',
      '.sx-time b{font-size:13px;font-weight:600}',
      '.sx-time small{display:block;font-size:10px;color:var(--encre-2);margin-top:2px}',
      '.sx-past .sx-time b,.sx-skip .sx-time b{color:var(--encre-2);font-weight:500}',
      '.sx-card{background:var(--surface-2);border:1px solid var(--filet);border-left:3px solid var(--c);border-radius:12px;padding:9px 12px;display:flex;flex-direction:column;gap:7px;min-width:0}',
      '.sx-card[data-act]{cursor:pointer}',
      '.sx-card[data-act]:hover{border-color:var(--filet-fort);border-left-color:var(--c)}',
      '.sx-l1{display:flex;gap:8px;align-items:baseline;min-width:0}',
      '.sx-n{font:400 19px/1 var(--f-titre);color:var(--or);min-width:36px;font-variant-numeric:tabular-nums}',
      '.sx-seq{flex:1;min-width:0;font-weight:500;line-height:1.3}',
      '.sx-d{font-size:12px;color:var(--encre-2);font-variant-numeric:tabular-nums;white-space:nowrap}',
      '.sx-d small{font-size:11px}',
      '.sx-delta{font-size:11px;font-weight:700;border-radius:6px;padding:1px 6px;white-space:nowrap;font-variant-numeric:tabular-nums}',
      '.sx-delta.ok{color:#05261a;background:var(--ok)}.sx-delta.over{color:#2a0a06;background:var(--alerte)}.sx-delta.under{color:#061a33;background:var(--info)}',
      '.sx-past .sx-card,.sx-skip .sx-card{background:transparent;border-color:transparent;border-left-color:var(--c);padding:5px 10px;opacity:.7}',
      '.sx-past.sx-open .sx-card,.sx-skip.sx-open .sx-card{background:var(--surface-2);border-color:var(--filet);border-left-color:var(--c);opacity:1}',
      '.sx-past .sx-n{font-size:16px;color:var(--encre-2)}',
      '.sx-past .sx-seq{color:var(--encre-2);font-weight:400}',
      '.sx-past .sx-time{padding-top:7px}.sx-past .sx-node::after{top:11px}',
      '.sx-skip .sx-seq{text-decoration:line-through;color:var(--encre-2)}',
      '.sx-cur .sx-card{background:linear-gradient(160deg,var(--surface-3),var(--surface-2));border-color:var(--or);border-left-width:5px;box-shadow:0 0 0 1px rgba(255,189,89,.25),0 14px 30px rgba(0,0,0,.35);padding:13px 14px}',
      '.sx-cur .sx-n{font-size:24px}.sx-cur .sx-seq{font-size:17px;font-weight:600}',
      '.sx-live{display:inline-flex;align-items:center;gap:6px;font:400 11px/1 var(--f-sous);letter-spacing:.1em;color:var(--alerte);white-space:nowrap}',
      '.sx-live i{width:8px;height:8px;border-radius:50%;background:var(--alerte)}',
      '.sx-act{font-size:14px;line-height:1.5}',
      '.sx-next .sx-card{border-color:rgba(95,208,160,.55);border-left-color:var(--ok)}',
      '.sx-prep{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font:400 11px/1 var(--f-sous);letter-spacing:.1em;color:var(--ok)}',
      '.sx-prep b{font:600 13px/1 var(--f-corps);letter-spacing:0;color:var(--encre);background:var(--surface);border-radius:999px;padding:4px 10px;font-variant-numeric:tabular-nums}',
      '.sx-cue{border-left:3px solid var(--or);background:var(--surface);border-radius:6px;padding:6px 10px;font-size:13.5px;line-height:1.4}',
      '.sx-cue span{display:block;font:400 10.5px/1.3 var(--f-sous);letter-spacing:.08em;text-transform:uppercase;color:var(--or);margin-bottom:2px}',
      '.sx-tags{display:flex;flex-wrap:wrap;gap:6px}',
      '.sx-tag{display:inline-flex;gap:5px;align-items:center;font-size:11.5px;color:var(--encre-2);background:var(--surface);border-radius:999px;padding:3px 9px;max-width:100%;min-width:0}',
      '.sx-tag svg{width:13px;height:13px;flex:none;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}',
      '.sx-tag span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.sx-tag.t-son{color:#a9cff5}.sx-tag.t-lum{color:#ffe08a}.sx-tag.t-ent{color:#8fe0b5}.sx-tag.t-sor{color:#f0a8c4}.sx-tag.t-acc{color:#d7c9ff}',
      '.sx-tag.t-chant{color:var(--bleu-nuit);background:var(--or);font-weight:600}',
      '.sx-sec .sx-node::after{display:none}',
      '.sx-sech{display:flex;align-items:baseline;gap:10px;padding:14px 0 8px;flex-wrap:wrap}',
      '.sx-sech b{font:400 12px/1 var(--f-sous);letter-spacing:.1em;text-transform:uppercase;color:var(--bleu-nuit);background:var(--c);border-radius:999px;padding:5px 10px}',
      '.sx-sech small{font-size:11.5px;color:var(--encre-2)}',
      '.sx-jump{align-self:flex-start}',
      '.sx-confirm{display:flex;flex-wrap:wrap;gap:8px;align-items:center;background:var(--surface);border:1px solid var(--or);border-radius:10px;padding:8px 10px;font-size:13px}',
      '.sx-confirm span{flex:1 1 100%}',
      '.sx-back{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(80px + env(safe-area-inset-bottom));z-index:30;background:var(--or);color:var(--bleu-nuit);border:0;border-radius:999px;padding:11px 18px;font-weight:700;font-size:13.5px;box-shadow:0 8px 24px rgba(0,0,0,.45);font-family:var(--f-corps)}',
      '.sx-back[hidden]{display:none}',
      '@media (min-width:1000px){.sx-back{bottom:28px;left:calc(50% + var(--side) / 2)}}',
      '.sx-ready,.sx-recap{background:radial-gradient(520px 220px at 12% 0%,rgba(255,189,89,.16),transparent 70%),linear-gradient(160deg,var(--surface-3),var(--surface-2));border:1px solid var(--filet);border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:14px;max-width:920px}',
      '.sx-ready-t{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap}',
      '.sx-kick{display:block;font:400 12px/1.3 var(--f-sous);letter-spacing:.1em;text-transform:uppercase;color:var(--encre-2)}',
      '.sx-big{display:block;font:400 56px/1 var(--f-titre);color:var(--or);font-variant-numeric:tabular-nums}',
      '.sx-cd{display:flex;flex-direction:column;align-items:flex-end;gap:4px;text-align:right}',
      '.sx-cd>b{font:600 22px/1.1 var(--f-corps);font-variant-numeric:tabular-nums}',
      '.sx-cd>b.sx-delta{font-size:15px;padding:3px 9px}',
      '.sx-cd span{font-size:12px;color:var(--encre-2)}',
      '.sx-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}',
      '.sx-stats>div{background:rgba(14,29,60,.45);border:1px solid var(--filet);border-radius:10px;padding:8px;text-align:center}',
      '.sx-stats b{display:block;font:400 26px/1.1 var(--f-titre);font-variant-numeric:tabular-nums}',
      '.sx-stats span{font-size:11.5px;color:var(--encre-2)}',
      '.sx-legend{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:11.5px;color:var(--encre-2)}',
      '.sx-legend i{display:inline-block;width:10px;height:10px;border-radius:3px;background:var(--c);margin-right:6px;vertical-align:-1px}',
      '.sx-go{min-height:66px;font-size:19px;letter-spacing:.03em}',
      '.sx-parts{display:flex;flex-direction:column;gap:10px}',
      '.sx-prow{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:5px 10px;align-items:center;font-size:13.5px}',
      '.sx-pb{grid-column:1/-1;display:flex;flex-direction:column;gap:3px}',
      '.sx-pb i{display:block;height:6px;border-radius:99px}',
      '.sx-pb .pl{background:rgba(255,255,255,.16)}.sx-pb .re{background:var(--c)}',
      '.sx-foot{display:flex;flex-direction:column;gap:8px;max-width:920px;padding-bottom:40px}',
      '.sx-badge b,.sx-n,.sx-big,.sx-stats b{font-variant-numeric:lining-nums tabular-nums;font-feature-settings:"lnum" 1,"tnum" 1}',
      '.sx-cur .sx-tag{align-items:flex-start}.sx-cur .sx-tag span{white-space:normal}.sx-cur .sx-tag svg{margin-top:2px}',
      '.sx-more{align-self:flex-start;font-size:12px;color:var(--or);text-decoration:underline;text-underline-offset:3px}',
      '.sx-cur .sx-card[data-act]:hover{border-color:var(--or)}',
      '.sx-back{white-space:nowrap}',
      '.sx-rsum{font-size:13px;color:var(--encre-2);margin-top:6px;display:flex;flex-wrap:wrap;gap:6px;align-items:center}',
      '@media (max-width:699px){.sx-head{gap:8px;padding-top:8px}.sx-nbtn,.sx-pbtn{min-height:54px}.sx-badge{min-width:56px;height:56px}.sx-badge b{font-size:27px}}',
      '@media (prefers-reduced-motion:no-preference){.sx-nbtn.sx-soon{animation:sxpulse 1s ease-in-out infinite}.sx-live i{animation:sxblink 1.2s ease-in-out infinite}.sx-star{animation:sxglow 1.8s ease-in-out infinite}}',
      '@keyframes sxpulse{50%{box-shadow:0 0 0 7px rgba(95,208,160,.3)}}',
      '@keyframes sxblink{50%{opacity:.25}}',
      '@keyframes sxglow{50%{filter:drop-shadow(0 0 12px rgba(255,189,89,1))}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  // Premier affichage avec la nouvelle version si l'onglet est déjà ouvert
  try { if (onPilot() && !busy()) render(); } catch (e) {}
})(0);
