// @ts-nocheck
(function () {
    async function viewPurchase(purchaseId: string) {
        try {
            let data;
            if ((window as any).purchaseApi) {
                data = await (window as any).purchaseApi.fetchPurchaseById(purchaseId);
            } else {
                const response = await fetch(`/purchase/${purchaseId}`);
                if (!response.ok) throw new Error("Failed to fetch purchase");
                data = await response.json();
            }
            
            const purchase = data.purchase;
            
            const formatIndian = (window as any).formatIndian || ((n, f) => n.toFixed(f));

            // Fill Project Details
            const viewInvoiceId = document.getElementById('view-purchase-invoice-iD');
            if (viewInvoiceId) viewInvoiceId.textContent = purchase.purchase_invoice_no || purchase.purchase_no || '-';
            
            const viewDate = document.getElementById('view-purchase-date');
            if (viewDate) {
                viewDate.textContent = (window as any).formatDateDisplay ? 
                    (window as any).formatDateDisplay(purchase.purchase_date) : 
                    new Date(purchase.purchase_date).toLocaleDateString();
            }

            // Buyer/Supplier Details
            const snapshot = purchase.supplier_snapshot || {};
            const viewName = document.getElementById('view-supplier-name');
            if (viewName) viewName.textContent = snapshot.name || '-';
            
            const viewAddress = document.getElementById('view-supplier-address');
            if (viewAddress) {
                const addr = snapshot.address || {};
                const addressParts = [];
                if (addr.line1) addressParts.push(addr.line1);
                if (addr.line2) addressParts.push(addr.line2);
                if (addr.city) addressParts.push(addr.city);
                if (addr.state || addr.pincode) {
                    const statePin = [addr.state, addr.pincode].filter(Boolean).join(" - ");
                    addressParts.push(statePin);
                }
                viewAddress.textContent = addressParts.join(", ") || '-';
            }
            
            const viewPhone = document.getElementById('view-supplier-phone');
            if (viewPhone) viewPhone.textContent = snapshot.phone || '-';
            
            const viewEmail = document.getElementById('view-supplier-email');
            if (viewEmail) viewEmail.textContent = snapshot.email || '-';
            
            const viewGstin = document.getElementById('view-buyerGSTIN');
            if (viewGstin) viewGstin.textContent = snapshot.gstin || '-';

            // Item List - clear and populate
            const viewItemsTableBody = document.querySelector("#view-items-table tbody");
            const viewSpecificationsTableBody = document.querySelector("#view-specifications-table tbody");
            
            if (viewItemsTableBody) viewItemsTableBody.innerHTML = "";
            if (viewSpecificationsTableBody) viewSpecificationsTableBody.innerHTML = "";

            let itemNumber = 1;
            let totalTaxable = 0;
            let totalTaxAmount = 0;

            (purchase.items || []).forEach((item: any) => {
                const qty = parseFloat(item.quantity || 0);
                const unitPrice = parseFloat(item.unit_price || 0);
                const rate = parseFloat(item.gst_rate || item.rate || 0);
                const taxableValue = qty * unitPrice;
                const taxAmount = (taxableValue * rate) / 100;

                totalTaxable += taxableValue;
                totalTaxAmount += taxAmount;

                if (viewItemsTableBody) {
                    const row = document.createElement("tr");
                    row.innerHTML = `
                        <td class="px-4 py-3 text-sm text-gray-900">${itemNumber}</td>
                        <td class="px-4 py-3 text-sm text-gray-900">${item.description || '-'}</td>
                        <td class="px-4 py-3 text-sm text-gray-900">${item.hsn_sac || item.HSN_SAC || '-'}</td>
                        <td class="px-4 py-3 text-sm text-gray-900">${item.brand || item.company || '-'}</td>
                        <td class="px-4 py-3 text-sm text-gray-900">${item.category || '-'}</td>
                        <td class="px-4 py-3 text-sm text-gray-900">${qty}</td>
                        <td class="px-4 py-3 text-sm text-gray-900">${item.unit || 'pc'}</td>
                        <td class="px-4 py-3 text-sm text-gray-900">${formatIndian(unitPrice, 2)}</td>
                        <td class="px-4 py-3 text-sm font-semibold text-gray-900">${rate}%</td>
                    `;
                    viewItemsTableBody.appendChild(row);
                }

                if (viewSpecificationsTableBody) {
                    const specRow = document.createElement("tr");
                    specRow.innerHTML = `
                        <td class="px-4 py-3 text-sm text-gray-900">${itemNumber}</td>
                        <td class="px-4 py-3 text-sm text-gray-900">${item.description || '-'}</td>
                        <td class="px-4 py-3 text-sm text-gray-900">${item.specification || '-'}</td>
                    `;
                    viewSpecificationsTableBody.appendChild(specRow);
                }
                
                itemNumber++;
            });

            // Set totals
            const viewSubtotal = document.getElementById('view-subtotal');
            if (viewSubtotal) viewSubtotal.textContent = `₹ ${formatIndian(totalTaxable, 2)}`;
            
            const viewTax = document.getElementById('view-tax');
            if (viewTax) viewTax.textContent = `₹ ${formatIndian(totalTaxAmount, 2)}`;
            
            const grandTotal = totalTaxable + totalTaxAmount;
            const roundOff = Math.round(grandTotal) - grandTotal;
            const totalAmount = grandTotal + roundOff;
            
            const viewGrandTotal = document.getElementById('view-grand-total');
            if (viewGrandTotal) viewGrandTotal.textContent = `₹ ${formatIndian(totalAmount, 2)}`;

            // Hide other sections, show view section
            const home = document.getElementById('home');
            if (home) home.style.display = 'none';
            
            const newSection = document.getElementById('new');
            if (newSection) newSection.style.display = 'none';
            
            const viewSection = document.getElementById('view');
            if (viewSection) viewSection.style.display = 'block';

            // Update header elements visibility contextually
            if (typeof (window as any).updateHeaderVisibility === 'function') {
                (window as any).updateHeaderVisibility();
            }

        } catch (error) {
            console.error("Error fetching purchase:", error);
            if ((window as any).electronAPI) {
                (window as any).electronAPI.showAlert1("Failed to fetch purchase. Please try again later.");
            } else {
                alert("Failed to fetch purchase details.");
            }
        }
    }

    (window as any).viewPurchase = viewPurchase;
})();
