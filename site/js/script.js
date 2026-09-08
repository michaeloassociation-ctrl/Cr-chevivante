// Michaëlo — interactions du site

document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('header');
  const burger = document.querySelector('.burger');
  const nav = document.querySelector('.main-nav');
  const backdrop = document.querySelector('.nav-backdrop');

  // Header solid on scroll
  const onScroll = () => {
    if (window.scrollY > 60) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Mobile nav toggle
  const closeNav = () => {
    nav.classList.remove('open');
    burger.classList.remove('active');
    if (backdrop) backdrop.classList.remove('open');
    document.body.style.overflow = '';
  };
  const openNav = () => {
    nav.classList.add('open');
    burger.classList.add('active');
    if (backdrop) backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  if (burger) {
    burger.addEventListener('click', () => {
      if (nav.classList.contains('open')) {
        closeNav();
      } else {
        openNav();
      }
    });
  }
  if (backdrop) {
    backdrop.addEventListener('click', closeNav);
  }
  document.querySelectorAll('.main-nav a').forEach(link => {
    link.addEventListener('click', closeNav);
  });
  // Close mobile nav on resize up to desktop breakpoint
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 980) closeNav();
  });

  // Scroll reveal
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

  // Smooth anchor scrolling offset for fixed header
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
