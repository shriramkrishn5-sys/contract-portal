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
  let currentPage = 1;
  const totalPages = 12;
  let currentZoom = 100;

  const currentPageNumEl = document.getElementById('currentPageNum');
  const prevPageBtn = document.getElementById('prevPageBtn');
  const nextPageBtn = document.getElementById('nextPageBtn');
  const thumbnails = document.querySelectorAll('.page-thumbnail');

  const zoomLevelEl = document.getElementById('zoomLevel');
  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const contractWrapper = document.getElementById('contractWrapper');
  const docViewport = document.getElementById('docViewport');

  const printDocBtn = document.getElementById('printDocBtn');
  const downloadDocBtn = document.getElementById('downloadDocBtn');
  const expandDocBtn = document.getElementById('expandDocBtn');

  // Update page active state and smooth scroll
  function updatePage(page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    if (currentPageNumEl) currentPageNumEl.textContent = currentPage;

    thumbnails.forEach(t => {
      const p = parseInt(t.getAttribute('data-page'), 10);
      if (p === currentPage) {
        t.classList.add('active');
        t.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        t.classList.remove('active');
      }
    });

    if (docViewport) {
      const scrollRatio = (currentPage - 1) / (totalPages - 1);
      const maxScroll = docViewport.scrollHeight - docViewport.clientHeight;
      docViewport.scrollTo({
        top: scrollRatio * Math.max(0, maxScroll),
        behavior: 'smooth'
      });
    }
  }

  if (prevPageBtn) {
    prevPageBtn.addEventListener('click', () => {
      if (currentPage > 1) updatePage(currentPage - 1);
    });
  }

  if (nextPageBtn) {
    nextPageBtn.addEventListener('click', () => {
      if (currentPage < totalPages) updatePage(currentPage + 1);
    });
  }

  thumbnails.forEach(t => {
    t.addEventListener('click', () => {
      const p = parseInt(t.getAttribute('data-page'), 10);
      updatePage(p);
    });
  });

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
