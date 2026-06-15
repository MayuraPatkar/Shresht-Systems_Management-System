/**
 * Supplier Module Forms & Modals
 */

class SupplierForms {
    private modalId = 'supplier-modal';
    private formId = 'supplier-form';
    private validator!: any;

    constructor() {
        this.init();
    }

    public init() {
        const form = document.getElementById(this.formId) as HTMLFormElement;
        if (form) {
            form.onsubmit = (e) => this.handleSubmit(e);

            // Initialize Unified Form Validator
            if ((window as any).FormValidator && (window as any).Validators) {
                const V = (window as any).Validators;
                this.validator = new (window as any).FormValidator(form);

                // Register rules
                this.validator.registerField('supplier_name', [V.required('Supplier Name is required')]);
                this.validator.registerField('phone', [
                    V.required('Phone Number is required'),
                    V.phone(true, 'Please enter a valid 10-digit phone number'),
                    {
                        validate: (val: string) => {
                            const cleanedPhone = val.trim();
                            const altInput = form.querySelector('[name="alternate_phone"]') as HTMLInputElement;
                            const cleanedAlt = altInput ? altInput.value.trim() : '';
                            if (cleanedPhone && cleanedAlt && cleanedPhone === cleanedAlt) {
                                return 'Phone number cannot be the same as alternate phone number';
                            }
                            return true;
                        }
                    }
                ]);
                this.validator.registerField('alternate_phone', [
                    V.phone(false, 'Please enter a valid 10-digit phone number'),
                    {
                        validate: (val: string) => {
                            const cleanedAlt = val.trim();
                            const phoneInput = form.querySelector('[name="phone"]') as HTMLInputElement;
                            const cleanedPhone = phoneInput ? phoneInput.value.trim() : '';
                            if (cleanedPhone && cleanedAlt && cleanedPhone === cleanedAlt) {
                                return 'Alternate phone number cannot be the same as phone number';
                            }
                            return true;
                        }
                    }
                ]);
                this.validator.registerField('email', [
                    V.email(false, 'Please enter a valid email address')
                ]);
                this.validator.registerField('billing_address.line1', [V.required('Address is required')]);
                this.validator.registerField('billing_address.city', [V.required('City is required')]);
                this.validator.registerField('billing_address.state', [V.required('State is required')]);
                this.validator.registerField('billing_address.pincode', [
                    V.required('Pincode is required'),
                    V.pincode(true, 'Please enter a valid 6-digit pincode')
                ]);
                this.validator.registerField('gstin', [
                    V.gstin(false, 'Please enter a valid 15-character GSTIN')
                ]);
            }

            // Bind Numeric Input restrictions
            if ((window as any).setupNumericInput) {
                const phoneInput = form.querySelector('[name="phone"]') as HTMLInputElement;
                const altPhoneInput = form.querySelector('[name="alternate_phone"]') as HTMLInputElement;
                const pincodeInput = form.querySelector('[name="billing_address.pincode"]') as HTMLInputElement;
                const accountInput = form.querySelector('[name="bank_details.account_number"]') as HTMLInputElement;

                if (phoneInput) (window as any).setupNumericInput(phoneInput, 10);
                if (altPhoneInput) (window as any).setupNumericInput(altPhoneInput, 10);
                if (pincodeInput) (window as any).setupNumericInput(pincodeInput, 6);
                if (accountInput) (window as any).setupNumericInput(accountInput, 20); // Arbitrary large max length for bank account

                // Cross-validate phone and alternate phone to clear matching errors on change
                if (phoneInput && altPhoneInput) {
                    phoneInput.addEventListener('input', () => {
                        if (this.validator && altPhoneInput.value.trim() !== '') {
                            this.validator.validateField('alternate_phone');
                        }
                    });
                    altPhoneInput.addEventListener('input', () => {
                        if (this.validator && phoneInput.value.trim() !== '') {
                            this.validator.validateField('phone');
                        }
                    });
                }
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
            if (this.validator) this.validator.clearAllErrors();
            modal.classList.remove('hidden');
            setTimeout(() => {
                const nameInput = form.querySelector('[name="supplier_name"]') as HTMLInputElement;
                if (nameInput) nameInput.focus();
            }, 50);
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
        elements['alternate_phone'].value = supplier.alternate_phone || '';
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

        if (this.validator) this.validator.clearAllErrors();
        modal.classList.remove('hidden');
        setTimeout(() => {
            const nameInput = form.querySelector('[name="supplier_name"]') as HTMLInputElement;
            if (nameInput) nameInput.focus();
        }, 50);
    }

    closeModal() {
        const modal = document.getElementById(this.modalId);
        if (modal) modal.classList.add('hidden');
        if (this.validator) this.validator.clearAllErrors();
    }

    private async handleSubmit(e: Event) {
        e.preventDefault();
        const form = e.target as HTMLFormElement;

        // Custom validation check
        if (this.validator && !this.validator.validateAll()) {
            return;
        }

        const formData = new FormData(form);
        const id = (document.getElementById('supplier-id') as HTMLInputElement).value;

        const data = {
            supplier_name: String(formData.get('supplier_name') || '').trim(),
            phone: String(formData.get('phone') || '').replace(/\D/g, '').slice(0, 10),
            alternate_phone: String(formData.get('alternate_phone') || '').replace(/\D/g, '').slice(0, 10) || undefined,
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

