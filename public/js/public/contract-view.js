document.addEventListener('DOMContentLoaded', () => {
  // GSAP Entrance Animations
  if (typeof gsap !== 'undefined') {
    gsap.from('.gsap-stagger', {
      y: 25,
      opacity: 0,
      duration: 0.7,
      stagger: 0.12,
      ease: 'power3.out'
    });
  }

  // Interactive Viewer Controls & State
  let currentZoom = 100;

  const zoomLevelEl = document.getElementById('zoomLevel');
  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const contractWrapper = document.getElementById('contractWrapper');
  const docViewport = document.getElementById('docViewport');

  const printDocBtn = document.getElementById('printDocBtn');
  const downloadDocBtn = document.getElementById('downloadDocBtn');
  const expandDocBtn = document.getElementById('expandDocBtn');

  // --- Section-based sidebar navigation ---
  const sidebarItems = document.querySelectorAll('.section-nav-item');
  const sections = document.querySelectorAll('[data-section-id]');

  // Click handler: scroll the matching section into view
  sidebarItems.forEach(item => {
    item.addEventListener('click', () => {
      const sectionId = item.getAttribute('data-section');
      const target = document.querySelector(`[data-section-id="${sectionId}"]`);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // IntersectionObserver: highlight the active sidebar item as user scrolls
  if (docViewport && sections.length > 0) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const activeSectionId = entry.target.getAttribute('data-section-id');

            // Remove active from all sidebar items, add to the matching one
            sidebarItems.forEach(item => {
              if (item.getAttribute('data-section') === activeSectionId) {
                item.classList.add('active');
                item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              } else {
                item.classList.remove('active');
              }
            });
          }
        });
      },
      {
        root: docViewport,
        rootMargin: '0px 0px -60% 0px',
        threshold: 0
      }
    );

    sections.forEach(section => observer.observe(section));
  }

  // Zoom controls logic
  function applyZoom(zoom) {
    currentZoom = Math.min(Math.max(zoom, 70), 150);
    if (zoomLevelEl) zoomLevelEl.textContent = `${currentZoom}%`;
    if (contractWrapper) {
      contractWrapper.style.transform = `scale(${currentZoom / 100})`;
    }
  }

  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', () => applyZoom(currentZoom + 10));
  }
  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', () => applyZoom(currentZoom - 10));
  }

  // Print & Download triggers
  if (printDocBtn) {
    printDocBtn.addEventListener('click', () => window.print());
  }

  if (downloadDocBtn) {
    downloadDocBtn.addEventListener('click', () => window.print());
  }

  // Toggle Fullscreen View
  if (expandDocBtn) {
    expandDocBtn.addEventListener('click', () => {
      const container = document.querySelector('.document-viewer-container');
      if (container) {
        if (!document.fullscreenElement) {
          container.requestFullscreen().catch(err => {
            console.warn('Fullscreen error:', err);
          });
        } else {
          document.exitFullscreen();
        }
      }
    });
  }
});
