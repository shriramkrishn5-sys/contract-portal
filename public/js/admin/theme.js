// --- Global Sidebar Controls (Callable anywhere / inline fallback) ---
window.openAdminSidebar = function(e) {
  if (e) e.stopPropagation();
  const sidebar = document.getElementById('adminSidebar') || document.querySelector('.sidebar');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop') || document.querySelector('.sidebar-backdrop');
  const sidebarToggle = document.getElementById('sidebar-toggle') || document.querySelector('.hamburger-btn');
  
  if (sidebar) sidebar.classList.add('open');
  if (sidebarBackdrop) sidebarBackdrop.classList.add('active');
  if (sidebarToggle) sidebarToggle.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = window.innerWidth <= 768 ? 'hidden' : '';
};

window.closeAdminSidebar = function(e) {
  if (e) e.stopPropagation();
  const sidebar = document.getElementById('adminSidebar') || document.querySelector('.sidebar');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop') || document.querySelector('.sidebar-backdrop');
  const sidebarToggle = document.getElementById('sidebar-toggle') || document.querySelector('.hamburger-btn');
  
  if (sidebar) sidebar.classList.remove('open');
  if (sidebarBackdrop) sidebarBackdrop.classList.remove('active');
  if (sidebarToggle) sidebarToggle.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
};

window.toggleAdminSidebar = function(e) {
  if (e) e.stopPropagation();
  const sidebar = document.getElementById('adminSidebar') || document.querySelector('.sidebar');
  if (sidebar && sidebar.classList.contains('open')) {
    window.closeAdminSidebar(e);
  } else {
    window.openAdminSidebar(e);
  }
};

function initAdminThemeAndNav() {
  // --- Theme Toggle Logic ---
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    const moonIcon = themeToggle.querySelector('.moon-icon');
    const sunIcon = themeToggle.querySelector('.sun-icon');
    
    // Check local storage or system preference
    const currentTheme = localStorage.getItem('theme') || 
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      
    if (currentTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      if (moonIcon) moonIcon.style.display = 'none';
      if (sunIcon) sunIcon.style.display = 'block';
    }
    
    themeToggle.addEventListener('click', () => {
      let theme = document.documentElement.getAttribute('data-theme');
      
      if (theme === 'dark') {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
        if (moonIcon) moonIcon.style.display = 'block';
        if (sunIcon) sunIcon.style.display = 'none';
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        if (moonIcon) moonIcon.style.display = 'none';
        if (sunIcon) sunIcon.style.display = 'block';
      }
    });
  }

  // --- Wire Event Listeners for Sidebar & Backdrop ---
  const sidebar = document.getElementById('adminSidebar') || document.querySelector('.sidebar');
  const sidebarToggle = document.getElementById('sidebar-toggle') || document.querySelector('.hamburger-btn');
  const sidebarClose = document.getElementById('sidebar-close-btn') || document.querySelector('.sidebar-close-btn');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop') || document.querySelector('.sidebar-backdrop');

  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', window.toggleAdminSidebar);
    sidebarToggle.addEventListener('touchend', (e) => {
      e.preventDefault();
      window.toggleAdminSidebar(e);
    });
  }

  if (sidebarClose) {
    sidebarClose.addEventListener('click', window.closeAdminSidebar);
    sidebarClose.addEventListener('touchend', (e) => {
      e.preventDefault();
      window.closeAdminSidebar(e);
    });
  }

  if (sidebarBackdrop) {
    sidebarBackdrop.addEventListener('click', window.closeAdminSidebar);
    sidebarBackdrop.addEventListener('touchend', (e) => {
      e.preventDefault();
      window.closeAdminSidebar(e);
    });
  }

  // Close sidebar on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      window.closeAdminSidebar(e);
    }
  });

  // Close sidebar when clicking nav links on mobile
  if (sidebar) {
    const navLinks = sidebar.querySelectorAll('.sidebar-nav a');
    navLinks.forEach((link) => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
          window.closeAdminSidebar();
        }
      });
    });
  }

  // Reset overflow and classes on resize to desktop
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
      window.closeAdminSidebar();
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdminThemeAndNav);
} else {
  initAdminThemeAndNav();
}
