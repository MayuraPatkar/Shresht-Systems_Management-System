/**
 * Keyboard shortcut handlers for the Stock module.
 */

// Keyboard shortcuts
document.addEventListener('keydown', (e: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in input fields (except for Escape and Ctrl combinations)
    const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes((document.activeElement as HTMLElement)?.tagName);

    // Ctrl+F or Cmd+F to focus search input
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }

    // Ctrl+N or Cmd+N to add new stock item
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        showModal('newStockModal');
        // Focus first input in the form
        setTimeout(() => {
            (document.getElementById('itemName') as HTMLInputElement | null)?.focus();
        }, 100);
    }

    // Ctrl+S or Cmd+S to save (submit) the active form
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();

        // Check which modal is open and submit its form
        const newStockModal = document.getElementById('newStockModal');
        const editStockModal = document.getElementById('editStockModal');

        // Also check for quantity modal
        const quantityModal = document.getElementById('quantityModal');

        if (newStockModal && !newStockModal.classList.contains('hidden')) {
            document.getElementById('newStockForm')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        } else if (editStockModal && !editStockModal.classList.contains('hidden')) {
            document.getElementById('editStockForm')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        } else if (quantityModal && !quantityModal.classList.contains('hidden')) {
            // Retrieve the stored submit handler or trigger the button click
            document.getElementById('quantityModalSubmitBtn')?.click();
        }
    }

    // Ctrl+P or Cmd+P to open print modal
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        showModal('printModal');
    }

    // Escape to close modals
    if (e.key === 'Escape') {
        // Prevent global redirection
        e.preventDefault();
        e.stopPropagation();

        const modals = ['newStockModal', 'editStockModal', 'itemDetailsModal', 'printModal', 'quantityModal', 'keyboardShortcutsModal'];
        let closedSomething = false;

        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal && !modal.classList.contains('hidden')) {
                hideModal(modalId);
                closedSomething = true;
            }
        });

        // If no modal was closed, redirect to dashboard manually if needed, 
        // to mimic global behavior but controlled by this listener
        if (!closedSomething) {
            window.location.href = '/dashboard';
        }
    }

    // Ctrl+R or Cmd+R to refresh (prevent default and use our refresh)
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        fetchStockData();
        showSuccessMessage('Stock data refreshed!');
    }

    // ? key to show keyboard shortcuts help (only when not typing)
    if (e.key === '?' && !isTyping) {
        e.preventDefault();
        showModal('keyboardShortcutsModal');
    }
}, true); // Use capture phase to intercept before global listener

// Keyboard shortcuts modal handlers
document.getElementById('keyboardShortcutsBtn')?.addEventListener('click', () => showModal('keyboardShortcutsModal'));
document.getElementById('closeKeyboardModalBtn')?.addEventListener('click', () => hideModal('keyboardShortcutsModal'));
document.getElementById('closeKeyboardHelpBtn')?.addEventListener('click', () => hideModal('keyboardShortcutsModal'));
