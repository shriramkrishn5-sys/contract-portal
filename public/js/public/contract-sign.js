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

  const canvas = document.getElementById('signature-pad');
  const clearBtn = document.getElementById('clearBtn');
  const submitBtn = document.getElementById('submitBtn');
  const agreeCheck = document.getElementById('agreeCheck');
  
  const tabs = document.querySelectorAll('.signature-tab');
  const drawWrapper = document.getElementById('drawWrapper');
  const typeWrapper = document.getElementById('typeWrapper');
  
  const typeInput = document.getElementById('typeInput');
  const typePreview = document.getElementById('typePreview');

  const signForm = document.getElementById('signForm');
  const signatureDataInput = document.getElementById('signatureData');
  const signatureTypeInput = document.getElementById('signatureType');

  let signaturePad;
  
  const canvasPlaceholder = document.getElementById('canvasPlaceholder');

  if (canvas && typeof SignaturePad !== 'undefined') {
    // Handle DPI scaling
    function resizeCanvas() {
      const ratio =  Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext("2d").scale(ratio, ratio);
      if(signaturePad) signaturePad.clear();
      if (canvasPlaceholder && signaturePad && signaturePad.isEmpty()) {
        canvasPlaceholder.style.opacity = '1';
      }
    }
    
    window.addEventListener("resize", resizeCanvas);
    
    const portalDark = getComputedStyle(document.documentElement).getPropertyValue('--portal-dark').trim() || '#111827';
    signaturePad = new SignaturePad(canvas, {
      backgroundColor: 'rgba(255, 255, 255, 0)',
      penColor: portalDark
    });
    resizeCanvas();
    
    signaturePad.addEventListener("beginStroke", () => {
      if (canvasPlaceholder) canvasPlaceholder.style.opacity = '0';
    });
    signaturePad.addEventListener("endStroke", checkCompletion);
  }

  if (clearBtn && signaturePad) {
    clearBtn.addEventListener('click', () => {
      signaturePad.clear();
      if (canvasPlaceholder) canvasPlaceholder.style.opacity = '1';
      checkCompletion();
    });
  }
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      const target = tab.dataset.target;
      if (target === 'draw') {
        drawWrapper.classList.remove('hidden');
        typeWrapper.classList.remove('active');
        clearBtn.style.display = 'inline-flex';
      } else {
        drawWrapper.classList.add('hidden');
        typeWrapper.classList.add('active');
        clearBtn.style.display = 'none';
      }
      checkCompletion();
    });
  });
  
  if (typeInput) {
    typeInput.addEventListener('input', () => {
      typePreview.textContent = typeInput.value;
      checkCompletion();
    });
  }

  function checkCompletion() {
    if (!agreeCheck || !submitBtn) return;
    
    const isAgreed = agreeCheck.checked;
    const activeTab = document.querySelector('.signature-tab.active').dataset.target;
    
    let hasSignature = false;
    if (activeTab === 'draw' && signaturePad) {
      hasSignature = !signaturePad.isEmpty();
    } else if (activeTab === 'type') {
      hasSignature = typeInput.value.trim().length > 0;
    }
    
    if (isAgreed && hasSignature) {
      if (submitBtn.style.pointerEvents !== 'auto') {
        submitBtn.style.pointerEvents = 'auto';
        submitBtn.style.opacity = '1';
        if (typeof gsap !== 'undefined') {
          gsap.fromTo(submitBtn, { scale: 0.95 }, { scale: 1, duration: 0.3, ease: 'back.out(1.5)' });
        }
      }
    } else {
      submitBtn.style.pointerEvents = 'none';
      submitBtn.style.opacity = '0.5';
    }
  }

  if (agreeCheck) {
    agreeCheck.addEventListener('change', checkCompletion);
  }
  
  if (signForm) {
    signForm.addEventListener('submit', (e) => {
      const activeTab = document.querySelector('.signature-tab.active').dataset.target;
      signatureTypeInput.value = activeTab;
      
      if (activeTab === 'draw') {
        signatureDataInput.value = signaturePad.toDataURL('image/png');
      } else {
        signatureDataInput.value = typeInput.value.trim();
      }
    });
  }
});
