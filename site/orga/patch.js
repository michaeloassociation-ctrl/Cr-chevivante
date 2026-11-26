// Correctifs du logiciel de l'espace organisateurs, chargés après l'ouverture (aucune donnée sensible ici)
(function apply(n) {
  'use strict';
  if (typeof window.extraAct !== 'function' || typeof window.render !== 'function') { if ((n || 0) < 600) setTimeout(function () { apply((n || 0) + 1); }, 100); return; }
  if (window.__mjPatched) return; window.__mjPatched = true;

  // « Mes tâches » : un second appui désactive le filtre
  const extraAct0 = window.extraAct;
  window.extraAct = function (a, t, e) {
    if (a === 'mine') {
      if (ST.me && ST.fwho === ST.me) { ST.fwho = 'Tous'; } else { ST.fwho = ST.me || 'Tous'; ST.filter = 'Tous'; }
      savePref();
      if (route() !== 'timeline') location.hash = '#timeline'; else render();
      return true;
    }
    return extraAct0.apply(this, arguments);
  };

  // Carte 3D : un second appui sur un élément de la palette l'annule
  if (typeof window.p3Act === 'function') {
    const p3Act0 = window.p3Act;
    window.p3Act = function (a, t) {
      if (a === 'p3place' && t.dataset.v && P3.place === t.dataset.v) {
        P3.place = null; p3panel(); p3hint(''); p3req();
        return true;
      }
      return p3Act0.apply(this, arguments);
    };
  }

  // Carte « Accès » : état réel de la synchronisation
  if (typeof window.accesCard === 'function') {
    window.accesCard = function () {
      const s = window.MJ_SYNC;
      const txt = s === 'ok' ? 'Partage actif : toutes les modifications sont enregistrées en ligne et visibles par tous en quelques secondes.'
        : s === 'hors-ligne' ? 'Connexion au serveur perdue : vos modifications sont gardées sur cet appareil et seront envoyées dès le retour du réseau.'
        : s === 'refus' ? 'Le serveur a refusé l\'accès : déconnectez-vous puis reconnectez-vous.'
        : 'Connexion au serveur de partage…';
      return '<div class="card full"><h3>Accès et partage</h3><div class="sub">' + txt + '</div>'
        + (window.MJ_LOGOUT ? '<button class="btn ghost sm" data-act="logout" style="align-self:flex-start">Se déconnecter de cet appareil</button>' : '')
        + '</div>';
    };
  }

  // Rafraîchir l'affichage dès que le partage répond
  let last = null;
  setInterval(function () {
    if (window.MJ_SYNC !== last) {
      last = window.MJ_SYNC;
      if (window.MJ_SYNC === 'ok' && typeof ST !== 'undefined') ST.mode = 'shared';
      try { if (!busy()) renderChrome(route()); } catch (e) {}
    }
  }, 1500);
})(0);
