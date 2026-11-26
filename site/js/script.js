document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('header');

  const onScroll = () => {
    if (window.scrollY > 60) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Menu mobile (affiché sous 980px) : ouverture / fermeture
  const toggle = document.querySelector('.nav-toggle');
  if (toggle) {
    const setOpen = (open) => {
      header.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    toggle.addEventListener('click', () => setOpen(!header.classList.contains('nav-open')));
    document.querySelectorAll('nav.main-nav a').forEach(a => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
  }

  const revealEls = document.querySelectorAll('.reveal');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealEls.forEach(el => io.observe(el));

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId.length > 1) {
        const target = document.querySelector(targetId);
        if (target) {
          e.preventDefault();
          const offset = window.innerWidth >= 980 ? 90 : 70;
          const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      }
    });
  });
});

// Bouton « Espace organisateurs » (accès protégé par mot de passe), ajouté dans l'en-tête de chaque page
document.addEventListener('DOMContentLoaded', () => {
  const actions = document.querySelector('.header-actions');
  if (!actions || document.querySelector('.orga-btn')) return;
  const st = document.createElement('style');
  st.textContent = '.orga-btn{display:inline-flex;align-items:center;gap:8px;height:40px;padding:0 14px;border:1.5px solid rgba(255,189,89,.55);border-radius:999px;color:#fff;font-family:var(--font-sub,inherit);font-size:12.5px;letter-spacing:.05em;text-transform:uppercase;white-space:nowrap;text-decoration:none;transition:background .2s,border-color .2s}'
    + '.orga-btn:hover{background:rgba(255,189,89,.12);border-color:#ffbd59}'
    + '.orga-btn svg{width:16px;height:16px;flex:none;stroke:#ffbd59;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}'
    + '@media (max-width:979px){.orga-btn{width:40px;padding:0;justify-content:center}.orga-btn span{display:none}}';
  document.head.appendChild(st);
  const a = document.createElement('a');
  a.href = '/espace-organisateurs.html';
  a.className = 'orga-btn';
  a.rel = 'nofollow';
  a.title = 'Espace organisateurs (accès réservé)';
  a.setAttribute('aria-label', 'Espace organisateurs, accès réservé');
  a.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></svg><span>Organisateurs</span>';
  actions.insertBefore(a, actions.firstChild);
});
