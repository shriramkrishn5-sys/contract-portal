document.addEventListener('DOMContentLoaded', () => {
  const paymentType = document.getElementById('paymentType');
  const dynamicFields = document.getElementById('dynamicPaymentFields');
  
  if (paymentType && dynamicFields) {
    paymentType.addEventListener('change', (e) => {
      const type = e.target.value;
      let html = '';
      
      if (type === 'custom_split') {
        html = `
          <div class="row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group mb-0">
              <label class="form-label">Advance %</label>
              <input type="number" id="advPercent" class="form-control" value="50">
            </div>
            <div class="form-group mb-0">
              <label class="form-label">Delivery %</label>
              <input type="number" id="delPercent" class="form-control" value="50" readonly>
            </div>
          </div>
        `;
      } else if (type === 'milestone') {
        html = `
          <div class="form-group mb-0">
            <label class="form-label">Milestones</label>
            <div class="d-flex mb-2">
              <input type="text" class="form-control" placeholder="Milestone name" style="margin-right: 0.5rem;">
              <input type="number" class="form-control" placeholder="Amount" style="width: 120px; margin-right: 0.5rem;">
              <button type="button" class="btn btn-secondary">+</button>
            </div>
          </div>
        `;
      } else {
        html = '<p class="mb-0 text-muted">Amount is payable in full as advance.</p>';
      }
      
      dynamicFields.innerHTML = html;
      
      if (type === 'custom_split') {
        const adv = document.getElementById('advPercent');
        const del = document.getElementById('delPercent');
        adv.addEventListener('input', () => {
          let val = parseInt(adv.value) || 0;
          if (val > 100) val = 100;
          if (val < 0) val = 0;
          del.value = 100 - val;
        });
      }
    });
    
    // Trigger initial render
    paymentType.dispatchEvent(new Event('change'));
  }
});
