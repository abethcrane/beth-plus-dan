(() => {
  // Scroll-based wishlist reveal
  const wishItems = document.querySelectorAll('.wish-item');
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const delay = parseInt(entry.target.dataset.delay || '0', 10);
          setTimeout(() => entry.target.classList.add('visible'), delay * 120);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 }
  );
  wishItems.forEach((item) => observer.observe(item));

  // Contact form
  const form = document.getElementById('contactForm');
  const success = document.getElementById('formSuccess');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = form.name.value;
    const email = form.email.value;
    const message = form.message.value;

    const subject = encodeURIComponent('I have an apartment for Beth & Dan!');
    const body = encodeURIComponent(
      `Hi Beth & Dan!\n\nFrom: ${name} (${email})\n\n${message}`
    );

    window.location.href = `mailto:bethanddanneedanapartment@gmail.com?subject=${subject}&body=${body}`;

    form.hidden = true;
    success.hidden = false;
  });

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
