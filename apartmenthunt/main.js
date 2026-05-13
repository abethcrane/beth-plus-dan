(() => {
  const scrollKey = `apartmenthunt-scroll:${location.pathname}`;

  function navigationWasReload() {
    const nav = performance.getEntriesByType?.('navigation')?.[0];
    if (nav && 'type' in nav) return nav.type === 'reload';
    try {
      return performance.navigation?.type === 1;
    } catch {
      return false;
    }
  }

  window.addEventListener('pagehide', () => {
    try {
      sessionStorage.setItem(scrollKey, String(window.scrollY));
    } catch {
      /* private mode, quota */
    }
  });

  if (navigationWasReload() && !location.hash) {
    const raw = sessionStorage.getItem(scrollKey);
    const y = raw != null ? parseInt(raw, 10) : NaN;
    if (!Number.isNaN(y) && y > 0) {
      history.scrollRestoration = 'manual';
      const applyScroll = () => window.scrollTo(0, y);
      if (document.readyState === 'complete') {
        requestAnimationFrame(() => requestAnimationFrame(applyScroll));
      } else {
        window.addEventListener(
          'load',
          () => requestAnimationFrame(() => requestAnimationFrame(applyScroll)),
          { once: true }
        );
      }
    }
  }

  // Smooth nav active state
  const sections = document.querySelectorAll('.section, header');
  const navLinks = document.querySelectorAll('.nav-links a');

  const navObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          navLinks.forEach((link) => {
            link.style.color = link.getAttribute('href') === `#${id}`
              ? '#a8d4a6'
              : '';
          });
        }
      });
    },
    { threshold: 0.3 }
  );
  sections.forEach((s) => navObserver.observe(s));
})();
