document.addEventListener('DOMContentLoaded', () => {
  const gate = document.getElementById('age-gate');
  const yesBtn = document.getElementById('age-yes');
  const noBtn = document.getElementById('age-no');
  const warning = document.getElementById('age-warning');
  const page = document.getElementById('page');

  const setUnlocked = () => {
    gate.classList.add('hidden');
    document.body.classList.remove('age-locked');
    warning.textContent = '';
  };

  const setLocked = () => {
    gate.classList.remove('hidden');
    document.body.classList.add('age-locked');
  };

  const alreadyVerified = localStorage.getItem('lp_ageVerified') === 'true';
  if (alreadyVerified) {
    setUnlocked();
  } else {
    setLocked();
  }

  yesBtn?.addEventListener('click', () => {
    localStorage.setItem('lp_ageVerified', 'true');
    setUnlocked();
  });

  noBtn?.addEventListener('click', () => {
    warning.textContent = 'We can only serve guests 21 and up. Come back when it’s your time.';
    page?.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Smooth scroll for anchor links inside the page.
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const targetId = link.getAttribute('href');
      if (!targetId || targetId === '#') return;
      const target = document.querySelector(targetId);
      if (target) {
        event.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Fallback strain images to a default photo when missing/broken.
  const defaultStrainImg = 'image/default.jpg';
  document.querySelectorAll('.strain-media img').forEach((img) => {
    const setFallback = () => {
      if (img.dataset.fallbackApplied === 'true') return;
      img.dataset.fallbackApplied = 'true';
      img.src = defaultStrainImg;
    };

    img.addEventListener('error', setFallback, { once: true });

    const src = img.getAttribute('src');
    if (
      !src ||
      src.trim() === '' ||
      src.includes('picsum.photos') ||
      src.includes('source.unsplash.com')
    ) {
      setFallback();
    }
  });

  // Merch image fallback to default photo if missing/broken.
  document.querySelectorAll('.merch-media img').forEach((img) => {
    const setFallback = () => {
      if (img.dataset.fallbackApplied === 'true') return;
      img.dataset.fallbackApplied = 'true';
      img.src = defaultStrainImg;
    };

    img.addEventListener('error', setFallback, { once: true });

    const src = img.getAttribute('src');
    if (
      !src ||
      src.trim() === '' ||
      src.includes('picsum.photos') ||
      src.includes('source.unsplash.com')
    ) {
      setFallback();
    }
  });
});
