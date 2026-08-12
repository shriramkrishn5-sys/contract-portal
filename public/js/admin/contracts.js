document.addEventListener('DOMContentLoaded', () => {
  // --- Filtering Logic ---
  const searchInput = document.getElementById('searchContracts');
  const statusFilter = document.getElementById('statusFilter');
  const categoryFilter = document.getElementById('categoryFilter');
  const tableRows = document.querySelectorAll('#contractsTable tbody tr[data-status]');

  function applyFilters() {
    const searchTerm = searchInput ? searchInput.value : '';
    const statusVal = statusFilter ? statusFilter.value : '';
    const startDate = document.getElementById('startDateFilter') ? document.getElementById('startDateFilter').value : '';
    const endDate = document.getElementById('endDateFilter') ? document.getElementById('endDateFilter').value : '';

    const params = new URLSearchParams();
    if (searchTerm) params.append('search', searchTerm);
    if (statusVal && statusVal !== 'all') params.append('status', statusVal);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    window.location.href = '/admin/contracts?' + params.toString();
  }
  
  // Expose to window for the onclick handler
  window.applyFilters = applyFilters;

  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') applyFilters();
    });
  }

  // --- Dropdown Menu Logic ---
  const moreBtns = document.querySelectorAll('.more-btn');
  let activeDropdown = null;

  moreBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const dropdown = document.getElementById(`dropdown-${id}`);
      
      // Close currently active if it's not this one
      if (activeDropdown && activeDropdown !== dropdown) {
        activeDropdown.classList.remove('show');
      }
      
      dropdown.classList.toggle('show');
      activeDropdown = dropdown.classList.contains('show') ? dropdown : null;
    });
  });

  // Close dropdown on click outside
  document.addEventListener('click', () => {
    if (activeDropdown) {
      activeDropdown.classList.remove('show');
      activeDropdown = null;
    }
  });

  // Prevent dropdown closing when clicking inside it
  document.querySelectorAll('.dropdown-menu-custom').forEach(menu => {
    menu.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  });

  // --- Single Actions ---
  // Copy Link
  document.querySelectorAll('.copy-link-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const url = window.location.origin + btn.dataset.url;
      navigator.clipboard.writeText(url).then(() => {
        alert('Public link copied to clipboard!');
        if(activeDropdown) activeDropdown.classList.remove('show');
      });
    });
  });

  // Delete Single
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const id = btn.dataset.id;
      const status = btn.dataset.status;

      if (status === 'signed' || status === 'completed') {
        if (!confirm('WARNING: This contract is already signed. Deleting it will permanently remove the legally binding record. Are you absolutely sure you want to delete it?')) {
          return;
        }
      } else {
        if (!confirm('Are you sure you want to delete this contract?')) {
          return;
        }
      }

      try {
          const res = await fetch(`/admin/contracts/${id}/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          const data = await res.json();
          if (data.success) {
            window.location.reload();
          } else {
            alert('Error deleting contract: ' + data.message);
          }
        } catch (err) {
          alert('Network error while deleting.');
        }
    });
  });

  // --- Bulk Actions (Checkboxes) ---
  const selectAllCb = document.getElementById('selectAllCb');
  const rowCbs = document.querySelectorAll('.row-cb');
  const bulkActionBar = document.getElementById('bulkActionBar');
  const selectedCount = document.getElementById('selectedCount');
  const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');

  function updateBulkActionBar() {
    const checkedBoxes = document.querySelectorAll('.row-cb:checked');
    const count = checkedBoxes.length;
    
    if (count > 0) {
      selectedCount.textContent = `${count} Selected`;
      bulkActionBar.style.display = 'block';
    } else {
      bulkActionBar.style.display = 'none';
      if(selectAllCb) selectAllCb.checked = false;
    }
  }

  if (selectAllCb) {
    selectAllCb.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      rowCbs.forEach(cb => {
        // Only select visible rows
        const row = cb.closest('tr');
        if (row.style.display !== 'none') {
          cb.checked = isChecked;
        }
      });
      updateBulkActionBar();
    });
  }

  rowCbs.forEach(cb => {
    cb.addEventListener('change', () => {
      // If any checkbox is unchecked, uncheck selectAll
      if (!cb.checked && selectAllCb) {
        selectAllCb.checked = false;
      }
      // If all visible checkboxes are checked, check selectAll
      const visibleCbs = Array.from(rowCbs).filter(c => c.closest('tr').style.display !== 'none');
      const allChecked = visibleCbs.length > 0 && visibleCbs.every(c => c.checked);
      if (allChecked && selectAllCb) {
        selectAllCb.checked = true;
      }
      
      updateBulkActionBar();
    });
  });

  if (bulkDeleteBtn) {
    bulkDeleteBtn.addEventListener('click', async () => {
      const checkedBoxes = document.querySelectorAll('.row-cb:checked');
      const ids = Array.from(checkedBoxes).map(cb => cb.value);
      if (ids.length === 0) return;
      if (confirm(`Are you sure you want to delete ${ids.length} selected contracts?`)) {
        await executeBulkAction(ids, 'delete', '/admin/contracts/bulk-delete');
      }
    });
  }

  const bulkArchiveBtn = document.getElementById('bulkArchiveBtn');
  if (bulkArchiveBtn) {
    bulkArchiveBtn.addEventListener('click', async () => {
      const checkedBoxes = document.querySelectorAll('.row-cb:checked');
      const ids = Array.from(checkedBoxes).map(cb => cb.value);
      if (ids.length === 0) return;
      if (confirm(`Are you sure you want to archive ${ids.length} selected contracts?`)) {
        await executeBulkAction(ids, 'archive', '/admin/contracts/bulk-action');
      }
    });
  }

  const bulkResendBtn = document.getElementById('bulkResendBtn');
  if (bulkResendBtn) {
    bulkResendBtn.addEventListener('click', async () => {
      const checkedBoxes = document.querySelectorAll('.row-cb:checked');
      const ids = Array.from(checkedBoxes).map(cb => cb.value);
      if (ids.length === 0) return;
      if (confirm(`Are you sure you want to resend reminders for ${ids.length} selected contracts?`)) {
        await executeBulkAction(ids, 'resend', '/admin/contracts/bulk-action');
      }
    });
  }

  async function executeBulkAction(ids, action, endpoint) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, action })
      });
      const data = await res.json();
      
      if (data.success) {
        if (data.errors && data.errors.length > 0) {
          alert(`Action completed. Some failed:\n` + data.errors.join('\n'));
        }
        window.location.reload();
      } else {
        alert('Error: ' + data.message);
      }
    } catch (err) {
      alert('Network error while executing action.');
    }
  }
});
