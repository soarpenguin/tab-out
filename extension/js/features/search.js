function filterTabs(query) {
  const q = query.toLowerCase().trim();
  const cards = document.querySelectorAll('#openTabsMissions .mission-card');

  cards.forEach(card => {
    const chips = card.querySelectorAll('.page-chip[data-action="focus-tab"]');
    let hasMatch = false;

    chips.forEach(chip => {
      const title = chip.querySelector('.chip-text')?.textContent?.toLowerCase() || '';
      const url = chip.dataset.tabUrl?.toLowerCase() || '';
      const match = !q || title.includes(q) || url.includes(q);
      chip.style.display = match ? '' : 'none';
      if (match) hasMatch = true;
    });

    const overflowChip = card.querySelector('.page-chip-overflow');
    if (overflowChip) {
      const overflowContainer = card.querySelector('.page-chips-overflow');
      if (q) {
        overflowChip.style.display = 'none';
        if (overflowContainer) {
          const overflowChips = overflowContainer.querySelectorAll('.page-chip[data-action="focus-tab"]');
          let overflowHasMatch = false;
          overflowChips.forEach(chip => {
            const title = chip.querySelector('.chip-text')?.textContent?.toLowerCase() || '';
            const url = chip.dataset.tabUrl?.toLowerCase() || '';
            const match = title.includes(q) || url.includes(q);
            chip.style.display = match ? '' : 'none';
            if (match) {
              overflowHasMatch = true;
              hasMatch = true;
            }
          });
          overflowContainer.style.display = overflowHasMatch ? '' : 'none';
        }
      } else {
        overflowChip.style.display = '';
        if (overflowContainer) overflowContainer.style.display = 'none';
      }
    }

    card.style.display = (hasMatch || !q) ? '' : 'none';
  });
}

function focusSearch() {
  const input = document.getElementById('searchInput');
  if (input) {
    input.focus();
    input.select();
  }
}