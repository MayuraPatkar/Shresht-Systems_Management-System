/**
 * Item Reorder Utility - Drag and Drop reordering for item cards
 * Uses native HTML5 Drag and Drop API
 * 
 * Usage:
 *   initDragDrop('items-container', onReorderCallback);
 *   initDragDrop('non-items-container', onReorderCallback);
 */

(function () {
    'use strict';

    let draggedElement = null;
    let draggedElementIndex = null;
    let isHandleClicked = false;

    /**
     * Initialize drag and drop on a container
     * @param {string} containerId - The ID of the container element
     * @param {Function} onReorderCallback - Callback function after reorder completes (for renumbering/syncing)
     */
    function initDragDrop(containerId, onReorderCallback) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.warn(`[itemReorder] Container #${containerId} not found`);
            return;
        }

        // Use event delegation on the container for better performance
        container.addEventListener('mousedown', handleMouseDown);
        container.addEventListener('mouseup', handleMouseUp);
        container.addEventListener('dragstart', handleDragStart);
        container.addEventListener('dragend', handleDragEnd);
        container.addEventListener('dragover', handleDragOver);
        container.addEventListener('dragenter', handleDragEnter);
        container.addEventListener('dragleave', handleDragLeave);
        container.addEventListener('drop', function (e) {
            handleDrop(e, container, onReorderCallback);
        });

        // Store callback for later use
        container._onReorderCallback = onReorderCallback;
    }

    /**
     * Make a card draggable (call this when adding new items dynamically)
     * @param {HTMLElement} card - The card element to make draggable
     */
    function makeDraggable(card) {
        if (!card) return;
        card.setAttribute('draggable', 'true');
    }

    function handleMouseDown(e) {
        // Check if the mouse down is on a drag handle
        if (e.target.closest('.drag-handle')) {
            isHandleClicked = true;
        } else {
            isHandleClicked = false;
        }
    }

    function handleMouseUp(e) {
        isHandleClicked = false;
    }

    function handleDragStart(e) {
        // Check if drag started from the drag handle
        // We use the flag because e.target in dragstart is the draggable element (card), not the handle
        if (!isHandleClicked) {
            // Not starting from drag handle - prevent the drag
            e.preventDefault();
            return;
        }

        const card = e.target.closest('.item-card, .non-item-card, .spec-card');
        if (!card) {
            e.preventDefault();
            return;
        }

        draggedElement = card;
        draggedElementIndex = Array.from(card.parentElement.children).indexOf(card);

        // Add dragging class after a small delay to ensure ghost image is correct
        setTimeout(() => {
            card.classList.add('dragging');
        }, 0);

        // Set drag data
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', draggedElementIndex.toString());
    }

    function handleDragEnd(e) {
        isHandleClicked = false;
        const card = e.target.closest('.item-card, .non-item-card, .spec-card');
        if (!card) return;

        card.classList.remove('dragging');
        draggedElement = null;
        draggedElementIndex = null;

        // Remove all drag-over classes
        document.querySelectorAll('.drag-over').forEach(el => {
            el.classList.remove('drag-over');
        });
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    function handleDragEnter(e) {
        e.preventDefault();
        const card = e.target.closest('.item-card, .non-item-card, .spec-card');
        if (card && card !== draggedElement) {
            card.classList.add('drag-over');
        }
    }

    function handleDragLeave(e) {
        const card = e.target.closest('.item-card, .non-item-card, .spec-card');
        if (card) {
            // Only remove if we're actually leaving the card (not entering a child)
            const relatedTarget = e.relatedTarget;
            if (!card.contains(relatedTarget)) {
                card.classList.remove('drag-over');
            }
        }
    }

    function handleDrop(e, container, onReorderCallback) {
        e.preventDefault();

        const targetCard = e.target.closest('.item-card, .non-item-card, .spec-card');
        
        // Remove all drag-over classes
        document.querySelectorAll('.drag-over').forEach(el => {
            el.classList.remove('drag-over');
        });

        if (!targetCard || !draggedElement || targetCard === draggedElement) {
            return;
        }

        // Get positions
        const children = Array.from(container.children);
        const draggedIndex = children.indexOf(draggedElement);
        const targetIndex = children.indexOf(targetCard);

        if (draggedIndex === -1 || targetIndex === -1) return;

        // Determine if we should insert before or after based on mouse position
        const rect = targetCard.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const insertBefore = e.clientY < midY;

        // Remove the dragged element
        draggedElement.remove();

        // Insert at new position
        if (insertBefore) {
            container.insertBefore(draggedElement, targetCard);
        } else {
            // Insert after
            if (targetCard.nextSibling) {
                container.insertBefore(draggedElement, targetCard.nextSibling);
            } else {
                container.appendChild(draggedElement);
            }
        }

        // Sync the hidden table order
        syncTableOrder(container.id);

        // Call the reorder callback (for renumbering)
        if (typeof onReorderCallback === 'function') {
            onReorderCallback();
        }
    }

    /**
     * Sync the hidden table order to match the card order
     * @param {string} containerId - The container ID ('items-container', 'non-items-container', etc.)
     */
    function syncTableOrder(containerId) {
        let tableBodySelector;
        
        if (containerId === 'items-container') {
            tableBodySelector = '#items-table tbody';
        } else if (containerId === 'non-items-container') {
            tableBodySelector = '#non-items-table tbody';
        } else if (containerId === 'specifications-container') {
            tableBodySelector = '#items-specifications-table tbody';
        } else {
            return;
        }

        const container = document.getElementById(containerId);
        const tableBody = document.querySelector(tableBodySelector);
        
        if (!container || !tableBody) return;

        const cards = Array.from(container.children);
        const rows = Array.from(tableBody.children);

        // If counts don't match, we can't sync properly
        if (cards.length !== rows.length) {
            console.warn(`[itemReorder] Card count (${cards.length}) doesn't match table row count (${rows.length})`);
            return;
        }

        // Create a mapping of cards to their original index based on content matching
        // Then reorder rows to match card order
        
        // Simple approach: Create a document fragment with rows in new order
        const fragment = document.createDocumentFragment();
        
        cards.forEach((card, newIndex) => {
            // Find the row that corresponds to this card by matching the description input value
            const cardDescInput = card.querySelector('input[type="text"]');
            const cardDescValue = cardDescInput ? cardDescInput.value : '';
            
            // Find matching row
            let matchingRow = null;
            for (const row of rows) {
                const rowDescInput = row.querySelector('td:nth-child(2) input') || row.querySelector('input[type="text"]');
                if (rowDescInput && rowDescInput.value === cardDescValue) {
                    matchingRow = row;
                    break;
                }
            }
            
            if (matchingRow) {
                fragment.appendChild(matchingRow);
            }
        });

        // Clear and re-append rows
        tableBody.innerHTML = '';
        tableBody.appendChild(fragment);
    }

    // Expose functions globally
    window.itemReorder = {
        initDragDrop: initDragDrop,
        makeDraggable: makeDraggable,
        syncTableOrder: syncTableOrder
    };

})();
