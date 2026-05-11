(() => {
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
