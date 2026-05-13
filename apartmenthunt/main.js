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

  function buildRequirementsText() {
    const lines = [];
    lines.push('Beth & Dan — apartment requirements');
    lines.push('');
    lines.push('Quick facts');
    document.querySelectorAll('#facts .fact').forEach((fact) => {
      const label = fact.querySelector('.fact-label')?.textContent?.trim();
      const value = fact.querySelector('.fact-value')?.textContent?.trim();
      if (label && value) lines.push(`${label}: ${value}`);
    });
    lines.push('');
    lines.push('Our priority list');
    document
      .querySelectorAll('#priorities .priorities-table .priority-col')
      .forEach((col) => {
        const header = col.querySelector('.priority-header')?.textContent?.trim();
        if (!header) return;
        lines.push('');
        lines.push(header);
        col.querySelectorAll('ul li').forEach((li) => {
          const t = li.textContent?.trim();
          if (t) lines.push(`- ${t}`);
        });
      });
    return lines.join('\n');
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      /* fall through */
    }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }

  const copyBtn = document.getElementById('copy-requirements-btn');
  const copyStatus = document.getElementById('copy-requirements-status');
  if (copyBtn) {
    const defaultLabel = copyBtn.textContent;
    let resetTimer;

    copyBtn.addEventListener('click', async () => {
      const text = buildRequirementsText();
      const ok = await copyText(text);
      clearTimeout(resetTimer);

      if (ok) {
        copyBtn.textContent = 'Copied!';
        if (copyStatus) copyStatus.textContent = 'Requirements copied to clipboard.';
        resetTimer = setTimeout(() => {
          copyBtn.textContent = defaultLabel;
          if (copyStatus) copyStatus.textContent = '';
        }, 2000);
      } else {
        alert("Couldn't copy to clipboard — try allowing clipboard access for this site.");
        if (copyStatus)
          copyStatus.textContent = 'Copy failed. Check clipboard permissions and try again.';
      }
    });
  }
})();
