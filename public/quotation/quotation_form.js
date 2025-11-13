/*
  quotation_form.js
  This file contains all the logic for the multi-step quotation form,
  including navigation, adding/removing items, saving, loading, and printing.
  Relies on helpers from quotation_utils.js and preview logic from quotation_view.js
*/

document.addEventListener('DOMContentLoaded', () => {
    
    // --- Form Sections & Navigation ---
    const form = document.getElementById('quotation-form');
    const steps = document.querySelectorAll('.steps');
    const nextBtn = document.getElementById('next-btn');
    const prevBtn = document.getElementById('prev-btn');
    const stepIndicator = document.getElementById('step-indicator');
    const totalSteps = steps.length;
    let currentStep = 1;

    // --- Item & Charge Containers ---
    // These are now controlled by globalScript.js
    const itemsContainer = document.getElementById('items-container');
    const nonItemsContainer = document.getElementById('non-items-container');
    const specificationsContainer = document.getElementById('specifications-container');

    // --- Action Buttons (Step 6) ---
    const saveBtn = document.getElementById('save-btn');
    const printBtn = document.getElementById('print-btn');
    const savePdfBtn = document.getElementById('save-pdf-btn');

    // --- Form Inputs ---
    const quotationIdInput = document.getElementById('id');
    const projectNameInput = document.getElementById('project-name');
    const quotationDateInput = document.getElementById('quotation-date');
    const buyerNameInput = document.getElementById('buyer-name');
    const buyerAddressInput = document.getElementById('buyer-address');
    const buyerPhoneInput = document.getElementById('buyer-phone');
    const buyerEmailInput = document.getElementById('buyer-email');

    // --- Step Navigation Logic ---
    function showStep(stepNumber) {
        // Hide all steps
        steps.forEach(step => step.style.display = 'none');
        
        // Show the current step
        const activeStep = document.getElementById(`step-${stepNumber}`);
        if (activeStep) {
            activeStep.style.display = 'block';
        }

        // Update step indicator
        if (stepIndicator) {
            stepIndicator.textContent = `Step ${stepNumber} of ${totalSteps}`;
        }

        // Update button states
        if (prevBtn) {
            prevBtn.disabled = (stepNumber === 1);
        }
        if (nextBtn) {
            nextBtn.textContent = (stepNumber === totalSteps) ? 'Finish' : 'Next';
            // Hide "Next" button on the last step (preview step)
            nextBtn.style.display = (stepNumber === totalSteps) ? 'none' : 'inline-flex';
        }
        
        // --- FIX: Use the global updateSpecificationsTable function ---
        if (stepNumber === 5) {
            // This function is defined in globalScript.js
            if (typeof updateSpecificationsTable === 'function') {
                updateSpecificationsTable();
            }
        }
        if (stepNumber === 6) {
            // Generate preview when entering step 6
            generateFormPreview();
        }
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (currentStep < totalSteps) {
                currentStep++;
                showStep(currentStep);
            }
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentStep > 1) {
                currentStep--;
                showStep(currentStep);
            }
        });
    }

    // --- Item/Charge Logic ---
    // REMOVED: createItemCard, createNonItemCard, updateItemNumbers,
    // updateNonItemNumbers, updateSpecifications, and their button listeners.
    // This logic is now handled by globalScript.js.

    // --- Save/Preview/Load Logic ---

    // --- UPDATED: Switched to snake_case for server ---
    // --- REPLACE this entire function in quotation_form.js ---

    function collectFormData() {
        const formData = {
            // Use snake_case
            quotation_id: quotationIdInput.value || null,
            project_name: projectNameInput.value,
            quotation_date: quotationDateInput.value ? new Date(quotationDateInput.value).toISOString() : new Date().toISOString(),
            customer_name: buyerNameInput.value,
            customer_address: buyerAddressInput.value,
            customer_phone: buyerPhoneInput.value,
            customer_email: buyerEmailInput.value,
            subject: `Quotation for ${projectNameInput.value || 'Services'}`,
            headline: `${projectNameInput.value || 'Quotation Details'}`,
            letter1: 'Thank you for your interest in our products and services. We are pleased to submit the following quotation for your consideration.',
            letter2: ['High-Definition CCTV Cameras', 'Digital Video Recorder (DVR)', 'Professional Installation & Configuration'],
            letter3: 'We are confident that our solution will meet your security requirements effectively. All supplied hardware comes with a standard manufacturer warranty.',
            items: [],
            non_items: [] // Use snake_case
        };

        // Collect items
        const specCards = Array.from(specificationsContainer.querySelectorAll('.spec-card'));
        let specIndex = 0;

        Array.from(itemsContainer.querySelectorAll('.item-card')).forEach(card => {
            formData.items.push({
                description: card.querySelector('.item_name').value,
                HSN_SAC: card.querySelector('.hsn input').value, 
                quantity: toNumber(card.querySelector('.qty input').value),
                unit_price: toNumber(card.querySelector('.price input').value),
                rate: toNumber(card.querySelector('.rate input').value),
                specification: (specCards[specIndex] ? specCards[specIndex].querySelector('.specification input').value : '') || ''
            });
            specIndex++;
        });

        // Collect non-items
        Array.from(nonItemsContainer.querySelectorAll('.non-item-card')).forEach(card => {
            formData.non_items.push({
                description: card.querySelector('.description input').value,
                price: toNumber(card.querySelector('.price input').value),
                rate: toNumber(card.querySelector('.rate input').value),
                specification: (specCards[specIndex] ? specCards[specIndex].querySelector('.specification input').value : '') || ''
            });
            specIndex++;
        });

        // --- ADDED: TOTALS CALCULATION ---
        let totalAmountNoTax = 0;
        let totalTax = 0;

        formData.items.forEach(item => {
            // Values are already numbers from toNumber()
            const taxableValue = item.quantity * item.unit_price;
            const taxAmount = (taxableValue * item.rate) / 100;
            totalAmountNoTax += taxableValue;
            totalTax += taxAmount;
        });

        formData.non_items.forEach(item => {
            // Values are already numbers from toNumber()
            const taxableValue = item.price; // non-items don't have quantity
            const taxAmount = (taxableValue * item.rate) / 100;
            totalAmountNoTax += taxableValue;
            totalTax += taxAmount;
        });

        const totalAmountTax = totalAmountNoTax + totalTax;

        // Add the calculated totals to the formData
        formData.total_tax = totalTax;
        formData.total_amount_no_tax = totalAmountNoTax;
        formData.total_amount_tax = totalAmountTax;
        // --- END OF TOTALS CALCULATION ---

        return formData;
    }

    // Function to generate the preview in Step 6
    async function generateFormPreview() {
        const previewContainer = document.getElementById('preview-content');
        if (!previewContainer) return;
        
        previewContainer.innerHTML = "<p>Generating preview...</p>";
        
        // Call collectFormData, which now returns snake_case keys
        const formData = collectFormData(); 
        
        // --- Create a temporary camelCase version for generateViewPreviewHTML ---
        // This is a bridge, as generateViewPreviewHTML expects camelCase from the form
        const previewData = {
            quotationId: formData.quotation_id,
            projectName: formData.project_name,
            quotationDate: formData.quotation_date,
            customerName: formData.customer_name,
            customerAddress: formData.customer_address,
            customerPhone: formData.customer_phone,
            customerEmail: formData.customer_email,
            subject: formData.subject,
            headline: formData.headline,
            letter1: formData.letter1,
            letter2: formData.letter2,
            letter3: formData.letter3,
            items: formData.items.map(item => ({
                description: item.description,
                hsnSac: item.HSN_SAC,
                quantity: item.quantity,
                unitPrice: item.unit_price,
                rate: item.rate,
                specification: item.specification
            })),
            nonItems: formData.non_items.map(item => ({
                description: item.description,
                price: item.price,
                rate: item.rate,
                specification: item.specification
            }))
        };
        // --- End of bridge ---
        
        if (typeof generateViewPreviewHTML === 'function') {
            // Pass the camelCase bridge object to the preview function
            await generateViewPreviewHTML(previewData, 2);
        } else {
            previewContainer.innerHTML = "<p>Error: Preview generator is not loaded.</p>";
        }
    }

    // Function to load data into the form (for "Edit")
    async function openQuotation(quotationId) {
        // Reset form
        form.reset();
        // Clear containers by calling global remove functions
        if (typeof updateItemNumbers === 'function' && itemsContainer) {
            itemsContainer.innerHTML = '';
            document.querySelector("#items-table tbody").innerHTML = '';
            updateItemNumbers();
        }
        if (typeof updateNonItemNumbers === 'function' && nonItemsContainer) {
            nonItemsContainer.innerHTML = '';
            document.querySelector("#non-items-table tbody").innerHTML = '';
            updateNonItemNumbers();
        }
        if (specificationsContainer) {
            specificationsContainer.innerHTML = '';
        }
        currentStep = 1;
        
        
        // Set display
        document.getElementById('home').style.display = 'none';
        document.getElementById('view').style.display = 'none';
        document.getElementById('new').style.display = 'block';
        
        // Ensure Step 1 is active
        showStep(currentStep);

        if (!quotationId) {
            // This is a "New Quotation"
            quotationIdInput.value = '';
            projectNameInput.value = '';
            buyerNameInput.value = '';
            buyerAddressInput.value = '';
            buyerPhoneInput.value = '';
            buyerEmailInput.value = '';
            quotationDateInput.valueAsDate = new Date();
            return;
        }

        // Fetch data for the quotation to edit
        try {
            if(typeof showToast === 'function') showToast('Loading quotation data...', 'success');

            if (typeof fetchDocumentById !== 'function') {
                throw new Error("Error: Data loading function (fetchDocumentById) is not available.");
            }
            const data = await fetchDocumentById('quotation', quotationId);
            if (!data) {
                throw new Error('Failed to fetch quotation data.');
            }
            
            const quotation = data.quotation || data;

            // Populate Step 1
            quotationIdInput.value = quotation.quotation_id || '';
            projectNameInput.value = quotation.project_name || '';
            if (quotation.quotation_date) {
                quotationDateInput.value = new Date(quotation.quotation_date).toISOString().split('T')[0];
            }

            // Populate Step 2
            buyerNameInput.value = quotation.customer_name || '';
            buyerAddressInput.value = quotation.customer_address || '';
            buyerPhoneInput.value = quotation.customer_phone || '';
            buyerEmailInput.value = quotation.customer_email || '';

            // --- FIX: Use global addItem/addNonItem to populate ---
            // Populate Step 3 (Items)
            (quotation.items || []).forEach(item => {
                if(typeof addItem === 'function') {
                    addItem(); // Call global function
                    const newCard = itemsContainer.querySelector('.item-card:last-child');
                    if (newCard) {
                        // Find inputs
                        const descInput = newCard.querySelector('.item_name');
                        const hsnInput = newCard.querySelector('.hsn input');
                        const qtyInput = newCard.querySelector('.qty input');
                        const priceInput = newCard.querySelector('.price input');
                        const rateInput = newCard.querySelector('.rate input');

                        // Set values
                        descInput.value = item.description || '';
                        hsnInput.value = item.HSN_SAC || '';
                        qtyInput.value = item.quantity || '1';
                        priceInput.value = item.unit_price || '0';
                        rateInput.value = item.rate || '0';

                        // --- ADDED: Dispatch events to sync with hidden table ---
                        descInput.dispatchEvent(new Event('input', { bubbles: true }));
                        hsnInput.dispatchEvent(new Event('input', { bubbles: true }));
                        qtyInput.dispatchEvent(new Event('input', { bubbles: true }));
                        priceInput.dispatchEvent(new Event('input', { bubbles: true }));
                        rateInput.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                }
            });
            
            // Populate Step 4 (Non-Items)
            (quotation.non_items || []).forEach(item => {
                 if(typeof addNonItem === 'function') {
                    addNonItem(); // Call global function
                    const newCard = nonItemsContainer.querySelector('.non-item-card:last-child');
                    if (newCard) {
                        // Find inputs
                        const descInput = newCard.querySelector('.description input');
                        const priceInput = newCard.querySelector('.price input');
                        const rateInput = newCard.querySelector('.rate input');

                        // Set values
                        descInput.value = item.description || '';
                        priceInput.value = item.price || '0';
                        rateInput.value = item.rate || '0';

                        // --- ADDED: Dispatch events to sync with hidden table ---
                        descInput.dispatchEvent(new Event('input', { bubbles: true }));
                        priceInput.dispatchEvent(new Event('input', { bubbles: true }));
                        rateInput.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                 }
            });
            
            // Populate Step 5 (Specifications)
            // The globalScript.js updateSpecificationsTable function will run when
            // the user navigates to Step 5, and it will fetch specs from stock.
            // We need to pre-fill the specs from the saved quotation.
            if (typeof updateSpecificationsTable === 'function') {
                await updateSpecificationsTable(); // Run it once to build the structure
                
                // Now, override with saved data
                const allItems = (quotation.items || []).concat(quotation.non_items || []);
                const specCards = Array.from(specificationsContainer.querySelectorAll('.spec-card'));
                
                allItems.forEach((item, index) => {
                    if (specCards[index]) {
                        specCards[index].querySelector('.specification input').value = item.specification || '';
                    }
                });
            }

        } catch (err) {
            console.error('Error loading quotation for editing:', err);
            if(typeof showToast === 'function') showToast(err.message, 'error');
        }
    }

    // --- Global Functions Exposure ---
    window.openQuotation = openQuotation;
    
    // --- Button Event Listeners ---

    // --- UPDATED: Add validation and ID generation ---
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const formData = collectFormData(); // This now returns snake_case

            // --- VALIDATION BLOCK (using snake_case) ---
            if (!formData.project_name) { 
                const msg = "Project Name is required. Please go back to Step 1.";
                console.error(msg);
                if (typeof showToast === 'function') {
                    showToast(msg, 'error');
                } else if (window.electronAPI?.showAlert1) {
                    window.electronAPI.showAlert1(msg);
                } else {
                    alert(msg);
                }
                return; // Stop execution
            }

            // If quotation_id is empty (new quotation), generate one.
            if (!formData.quotation_id) {
                const pNameShort = formData.project_name.replace(/\s+/g, '').substring(0, 4).toUpperCase();
                const randomNum = Math.floor(1000 + Math.random() * 9000);
                formData.quotation_id = `Q-${pNameShort}-${randomNum}`;
                
                // Update the hidden input field in Step 1
                if(quotationIdInput) {
                    quotationIdInput.value = formData.quotation_id; 
                }
                
                const msg = `Quotation ID was missing. Generated new ID: ${formData.quotation_id}`;
                console.warn(msg);
                if (typeof showToast === 'function') showToast(msg, 'success');
            }
            // --- END OF VALIDATION BLOCK ---


            if (typeof sendDocumentToServer !== 'function') {
                console.error('Error: sendDocumentToServer function is not available.');
                if(typeof showToast === 'function') {
                    showToast('Error: Save function not loaded.', 'error');
                } else {
                    alert('Error: Save function not loaded.');
                }
                return;
            }

            const saveEndpoint = '/quotation/save-quotation';
            const successMsg = 'Quotation saved successfully!';

            try {
                // sendDocumentToServer is in documentManager.js
                const success = await sendDocumentToServer(saveEndpoint, formData, successMsg); 

                if (success) {
                    const homeBtn = document.getElementById('home-btn');
                    if (homeBtn) homeBtn.click();
                } else {
                    console.error('Failed to save quotation (server reported failure).');
                }

            } catch (err) {
                console.error('Critical error in save button listener:', err);
                if(typeof showToast === 'function') {
                    showToast('A critical error occurred. Check console.', 'error');
                } else {
                    alert('A critical error occurred. Check console.');
                }
            }
        });
    }
    
    // Add Print Button Listener (Step 6)
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            window.print();
        });
    }

    // Add Save PDF Button Listener (Step 6)
    if (savePdfBtn) {
        savePdfBtn.addEventListener('click', () => {
            window.print();
        });
    }
    
    // --- Initial setup ---
    showStep(currentStep); // Show step 1 on load
    if (quotationDateInput) {
        quotationDateInput.valueAsDate = new Date(); // Set default date
    }
});