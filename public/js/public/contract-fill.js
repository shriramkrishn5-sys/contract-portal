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

  // Custom Select Dropdown for Company / Entity Type
  const container = document.getElementById('entityTypeCustomSelect');
  if (container) {
    const trigger = document.getElementById('customSelectTrigger');
    const valueText = document.getElementById('customSelectValueText');
    const menu = document.getElementById('customSelectMenu');
    const hiddenSelect = document.getElementById('entityTypeSelect');
    const options = menu.querySelectorAll('.custom-option');

    const updateCustomSelectUI = () => {
      const val = hiddenSelect.value;
      let found = false;
      options.forEach(opt => {
        if (opt.getAttribute('data-value') === val) {
          opt.classList.add('selected');
          valueText.textContent = opt.textContent;
          valueText.classList.remove('placeholder');
          found = true;
        } else {
          opt.classList.remove('selected');
        }
      });
      if (!found) {
        valueText.textContent = '-- Select Company Structure --';
        valueText.classList.add('placeholder');
      }
    };

    updateCustomSelectUI();

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      container.classList.toggle('open');
    });

    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        container.classList.toggle('open');
      }
    });

    options.forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        const val = opt.getAttribute('data-value');
        hiddenSelect.value = val;
        hiddenSelect.dispatchEvent(new Event('change'));
        updateCustomSelectUI();
        container.classList.remove('open');
      });
    });

    document.addEventListener('click', (e) => {
      if (!container.contains(e.target)) {
        container.classList.remove('open');
      }
    });
  }
});
