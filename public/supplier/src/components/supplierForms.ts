/**
 * Supplier Module Forms & Modals
 */

class SupplierForms {
    private modalId = 'supplier-modal';
    private formId = 'supplier-form';

    constructor() {
        this.init();
    }

    public init() {
        const form = document.getElementById(this.formId) as HTMLFormElement;
        if (form) {
            form.onsubmit = (e) => this.handleSubmit(e);

            // Limit pincode to numbers only
            const pincodeInput = form.querySelector('[name="billing_address.pincode"]') as HTMLInputElement;
            if (pincodeInput) {
                pincodeInput.addEventListener('input', () => {
                    pincodeInput.value = pincodeInput.value.replace(/[^0-9]/g, '');
                });
            }

            // Limit bank account number to numbers only
            const accountInput = form.querySelector('[name="bank_details.account_number"]') as HTMLInputElement;
            if (accountInput) {
                accountInput.addEventListener('input', () => {
                    accountInput.value = accountInput.value.replace(/[^0-9]/g, '');
                });
            }

            // Limit phone number to numbers only
            const phoneInput = form.querySelector('[name="phone"]') as HTMLInputElement;
            if (phoneInput) {
                phoneInput.addEventListener('input', () => {
                    phoneInput.value = phoneInput.value.replace(/[^0-9]/g, '');
                });
            }
        }

        const closeBtn = document.getElementById('close-modal');
        if (closeBtn) {
            closeBtn.onclick = () => this.closeModal();
        }

        const cancelBtn = document.getElementById('cancel-btn');
        if (cancelBtn) {
            cancelBtn.onclick = () => this.closeModal();
        }

        const gstinInput = document.getElementById('gstin-input') as HTMLInputElement;
        if (gstinInput) {
            gstinInput.addEventListener('input', () => {
                gstinInput.value = gstinInput.value.toUpperCase();
            });
        }
    }

    openAddModal() {
        const modal = document.getElementById(this.modalId);
        const title = document.getElementById('modal-title');
        const idInput = document.getElementById('supplier-id') as HTMLInputElement;
        const form = document.getElementById(this.formId) as HTMLFormElement;

        if (modal && title && idInput && form) {
            title.textContent = 'Add New Supplier';
            idInput.value = '';
            form.reset();
            modal.classList.remove('hidden');
        }
    }

    openEditModal(supplier: any) {
        const modal = document.getElementById(this.modalId);
        const title = document.getElementById('modal-title');
        const idInput = document.getElementById('supplier-id') as HTMLInputElement;
        const form = document.getElementById(this.formId) as HTMLFormElement;

        if (!modal || !title || !idInput || !form) return;

        title.textContent = 'Edit Supplier';
        idInput.value = supplier._id;
        
        // Populate form fields
        const elements = form.elements as any;
        elements['supplier_name'].value = supplier.supplier_name || '';
        elements['phone'].value = supplier.phone || '';
        elements['email'].value = supplier.email || '';
        elements['gstin'].value = supplier.gstin || '';
        elements['supplier_type'].value = supplier.supplier_type || 'Vendor';
        elements['is_active'].value = supplier.is_active.toString();
        elements['remarks'].value = supplier.remarks || '';
        elements['billing_address.line1'].value = supplier.billing_address?.line1 || '';
        elements['billing_address.line2'].value = supplier.billing_address?.line2 || '';
        elements['billing_address.city'].value = supplier.billing_address?.city || '';
        elements['billing_address.state'].value = supplier.billing_address?.state || 'Karnataka';
        elements['billing_address.pincode'].value = supplier.billing_address?.pincode || '';

        // Bank details
        elements['bank_details.account_name'].value = supplier.bank_details?.account_name || '';
        elements['bank_details.bank_name'].value = supplier.bank_details?.bank_name || '';
        elements['bank_details.account_number'].value = supplier.bank_details?.account_number || '';
        elements['bank_details.ifsc'].value = supplier.bank_details?.ifsc || '';

        modal.classList.remove('hidden');
    }

    closeModal() {
        const modal = document.getElementById(this.modalId);
        if (modal) modal.classList.add('hidden');
    }

    private async handleSubmit(e: Event) {
        e.preventDefault();
        const form = e.target as HTMLFormElement;

        // Trigger HTML5 validation
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const formData = new FormData(form);
        const id = (document.getElementById('supplier-id') as HTMLInputElement).value;

        const data = {
            supplier_name: String(formData.get('supplier_name') || '').trim(),
            phone: String(formData.get('phone') || '').replace(/\D/g, '').slice(0, 10),
            email: String(formData.get('email') || '').trim().toLowerCase(),
            gstin: String(formData.get('gstin') || '').trim().toUpperCase(),
            supplier_type: formData.get('supplier_type'),
            is_active: formData.get('is_active') === 'true',
            remarks: formData.get('remarks'),
            billing_address: {
                line1: formData.get('billing_address.line1'),
                line2: formData.get('billing_address.line2'),
                city: formData.get('billing_address.city'),
                state: formData.get('billing_address.state'),
                pincode: formData.get('billing_address.pincode')
            },
            bank_details: {
                account_name: formData.get('bank_details.account_name'),
                bank_name: formData.get('bank_details.bank_name'),
                account_number: formData.get('bank_details.account_number'),
                ifsc: formData.get('bank_details.ifsc')
            }
        };

        try {
            await supplierApi.saveSupplier(data, id);
            showAlert(id ? 'Supplier updated successfully' : 'Supplier added successfully');
            this.closeModal();
            if (typeof fetchSuppliers === 'function') fetchSuppliers();
            if ((window as any).fetchFullDetails) (window as any).fetchFullDetails();
        } catch (error: any) {
            showAlert(error.message || 'Failed to save supplier');
        }
    }
}

(window as any).supplierForms = new SupplierForms();

