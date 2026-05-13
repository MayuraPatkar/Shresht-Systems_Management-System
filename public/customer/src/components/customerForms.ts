/**
 * Customer Module Forms & Modals
 */

class CustomerForms {
    private modalId = 'customer-modal';
    private formId = 'customer-form';

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

    private getDisplayName(customer: any): string {
        const firstName = customer?.customer?.first_name || '';
        const lastName = customer?.customer?.last_name || '';
        return `${firstName} ${lastName}`.trim() || customer?.customer?.name || '';
    }

    openAddModal() {
        const modal = document.getElementById(this.modalId);
        const title = document.getElementById('modal-title');
        const idInput = document.getElementById('customer-id') as HTMLInputElement;
        const form = document.getElementById(this.formId) as HTMLFormElement;

        if (modal && title && idInput && form) {
            title.textContent = 'Add New Customer';
            idInput.value = '';
            form.reset();
            modal.classList.remove('hidden');
        }
    }

    openEditModal(customer: any) {
        const modal = document.getElementById(this.modalId);
        const title = document.getElementById('modal-title');
        const idInput = document.getElementById('customer-id') as HTMLInputElement;
        const form = document.getElementById(this.formId) as HTMLFormElement;

        if (!modal || !title || !idInput || !form) return;

        title.textContent = 'Edit Customer';
        idInput.value = customer._id;

        const fallbackName = this.getDisplayName(customer);
        
        // Populate form fields
        const elements = form.elements as any;
        elements['customer.first_name'].value = customer.customer?.first_name || fallbackName || '';
        elements['customer.last_name'].value = customer.customer?.last_name || '';
        elements['customer.phone'].value = customer.customer?.phone || '';
        elements['customer.alternate_phone'].value = customer.customer?.alternate_phone || '';
        elements['customer.email'].value = customer.customer?.email || '';
        elements['gstin'].value = customer.gstin || '';
        elements['customer_type'].value = customer.customer_type || 'Individual';
        elements['is_active'].value = customer.is_active.toString();
        elements['remarks'].value = customer.remarks || '';
        elements['billing_address.line1'].value = customer.billing_address?.line1 || '';
        elements['billing_address.line2'].value = customer.billing_address?.line2 || '';
        elements['billing_address.city'].value = customer.billing_address?.city || '';
        elements['billing_address.state'].value = customer.billing_address?.state || 'Karnataka';
        elements['billing_address.pincode'].value = customer.billing_address?.pincode || '';

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
        const id = (document.getElementById('customer-id') as HTMLInputElement).value;
        const firstName = String(formData.get('customer.first_name') || '').trim();
        const lastName = String(formData.get('customer.last_name') || '').trim();
        const displayName = `${firstName} ${lastName}`.trim();

        const data = {
            customer: {
                first_name: firstName,
                last_name: lastName,
                name: displayName || firstName,
                phone: String(formData.get('customer.phone') || '').replace(/\D/g, '').slice(0, 10),
                alternate_phone: String(formData.get('customer.alternate_phone') || '').replace(/\D/g, '').slice(0, 10),
                email: String(formData.get('customer.email') || '').trim().toLowerCase()
            },
            gstin: String(formData.get('gstin') || '').trim().toUpperCase(),
            customer_type: formData.get('customer_type'),
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
            await customerApi.saveCustomer(data, id);
            showAlert(id ? 'Customer updated successfully' : 'Customer added successfully');
            this.closeModal();
            if (typeof fetchCustomers === 'function') fetchCustomers();
            if ((window as any).fetchFullDetails) (window as any).fetchFullDetails();
        } catch (error: any) {
            showAlert(error.message || 'Failed to save customer');
        }
    }
}

(window as any).customerForms = new CustomerForms();
