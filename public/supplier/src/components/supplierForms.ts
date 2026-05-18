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

    private getDisplayName(supplier: any): string {
        const firstName = supplier?.supplier?.first_name || '';
        const lastName = supplier?.supplier?.last_name || '';
        return `${firstName} ${lastName}`.trim() || supplier?.supplier?.name || '';
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

        const fallbackName = this.getDisplayName(supplier);
        
        // Populate form fields
        const elements = form.elements as any;
        elements['supplier.first_name'].value = supplier.supplier?.first_name || fallbackName || '';
        elements['supplier.last_name'].value = supplier.supplier?.last_name || '';
        elements['supplier.phone'].value = supplier.supplier?.phone || '';
        elements['supplier.alternate_phone'].value = supplier.supplier?.alternate_phone || '';
        elements['supplier.email'].value = supplier.supplier?.email || '';
        elements['gstin'].value = supplier.gstin || '';
        elements['supplier_type'].value = supplier.supplier_type || 'Vendor';
        elements['is_active'].value = supplier.is_active.toString();
        elements['remarks'].value = supplier.remarks || '';
        elements['billing_address.line1'].value = supplier.billing_address?.line1 || '';
        elements['billing_address.line2'].value = supplier.billing_address?.line2 || '';
        elements['billing_address.city'].value = supplier.billing_address?.city || '';
        elements['billing_address.state'].value = supplier.billing_address?.state || 'Karnataka';
        elements['billing_address.pincode'].value = supplier.billing_address?.pincode || '';

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
        const firstName = String(formData.get('supplier.first_name') || '').trim();
        const lastName = String(formData.get('supplier.last_name') || '').trim();
        const displayName = `${firstName} ${lastName}`.trim();

        const data = {
            supplier: {
                first_name: firstName,
                last_name: lastName,
                name: displayName || firstName,
                phone: String(formData.get('supplier.phone') || '').replace(/\D/g, '').slice(0, 10),
                alternate_phone: String(formData.get('supplier.alternate_phone') || '').replace(/\D/g, '').slice(0, 10),
                email: String(formData.get('supplier.email') || '').trim().toLowerCase()
            },
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

