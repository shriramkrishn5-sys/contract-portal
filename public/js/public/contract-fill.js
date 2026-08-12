document.addEventListener('DOMContentLoaded', () => {
  // GSAP Animation
  if (typeof gsap !== 'undefined') {
    gsap.from('.gsap-stagger', {
      y: 30,
      opacity: 0,
      duration: 0.8,
      stagger: 0.15,
      ease: 'power3.out'
    });
  }

  const form = document.getElementById('fillForm');
  if (!form) return;

  // Restore
  const saved = localStorage.getItem('contractFillData');
  if (saved) {
    try {
      const data = JSON.parse(saved);
      Object.keys(data).forEach(key => {
        const el = form.elements[key];
        if (el && !el.value) el.value = data[key]; // don't override server-provided values if present
      });
    } catch(e) {}
  }

  // Auto-save
  setInterval(() => {
    const data = {};
    new FormData(form).forEach((val, key) => { data[key] = val; });
    localStorage.setItem('contractFillData', JSON.stringify(data));
  }, 10000);
});
