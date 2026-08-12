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
    
    gsap.from('.success-icon svg', {
      scale: 0.5,
      opacity: 0,
      duration: 0.6,
      delay: 0.3,
      ease: 'back.out(1.7)'
    });
  }
});
