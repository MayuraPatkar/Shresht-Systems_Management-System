/**
 * Customer Module Forms & Modals
 */

class CustomerForms {
    private modalId = 'customer-modal';
    private formId = 'customer-form';

    private validator!: any;

    constructor() {
        this.init();
    }

    public init() {
        const form = document.getElementById(this.formId) as HTMLFormElement;
        if (form) {
            form.onsubmit = (e) => this.handleSubmit(e);

            // Initialize Form Validator
            if ((window as any).FormValidator && (window as any).Validators) {
                const V = (window as any).Validators;
                this.validator = new (window as any).FormValidator(form);
                
                // Register rules
                this.validator.registerField('customer.first_name', [V.required('First name is required')]);
                this.validator.registerField('customer.phone', [
                    V.required('Phone number is required'),
                    V.phone(true, 'Please enter a valid 10-digit phone number'),
                    {
                        validate: (val: string) => {
                            const cleanedPhone = val.trim();
                            const altInput = form.querySelector('[name="customer.alternate_phone"]') as HTMLInputElement;
                            const cleanedAlt = altInput ? altInput.value.trim() : '';
                            if (cleanedPhone && cleanedAlt && cleanedPhone === cleanedAlt) {
                                return 'Phone number cannot be the same as alternate phone number';
                            }
                            return true;
                        }
                    }
                ]);
                this.validator.registerField('customer.alternate_phone', [
                    V.phone(false, 'Please enter a valid 10-digit phone number'),
                    {
                        validate: (val: string) => {
                            const cleanedAlt = val.trim();
                            const phoneInput = form.querySelector('[name="customer.phone"]') as HTMLInputElement;
                            const cleanedPhone = phoneInput ? phoneInput.value.trim() : '';
                            if (cleanedPhone && cleanedAlt && cleanedPhone === cleanedAlt) {
                                return 'Alternate phone number cannot be the same as phone number';
                            }
                            return true;
                        }
                    }
                ]);
                this.validator.registerField('customer.email', [
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
                    {
                        validate: (val: string) => {
                            const typeSelect = form.querySelector('[name="customer_type"]') as HTMLSelectElement;
                            const customerType = typeSelect ? typeSelect.value : 'Individual';
                            const isB2B = customerType === 'Commercial' || customerType === 'Government';
                            const validatorRule = V.gstin(isB2B, isB2B ? 'GSTIN is required for B2B customers' : 'Please enter a valid 15-digit GSTIN');
                            return validatorRule.validate(val);
                        }
                    }
                ]);
            }

            // Bind type change listener for dynamic validation updating
            const typeSelect = form.querySelector('[name="customer_type"]') as HTMLSelectElement;
            if (typeSelect) {
                typeSelect.addEventListener('change', () => {
                    this.updateGstinLabel();
                    if (this.validator) {
                        this.validator.validateField('gstin');
                    }
                });
            }

            // Bind Numeric Input restrictions
            if ((window as any).setupNumericInput) {
                const phoneInput = form.querySelector('[name="customer.phone"]') as HTMLInputElement;
                const altPhoneInput = form.querySelector('[name="customer.alternate_phone"]') as HTMLInputElement;
                const pincodeInput = form.querySelector('[name="billing_address.pincode"]') as HTMLInputElement;

                if (phoneInput) (window as any).setupNumericInput(phoneInput, 10);
                if (altPhoneInput) (window as any).setupNumericInput(altPhoneInput, 10);
                if (pincodeInput) (window as any).setupNumericInput(pincodeInput, 6);

                // Cross-validate phone and alternate phone to clear matching errors on change
                if (phoneInput && altPhoneInput) {
                    phoneInput.addEventListener('input', () => {
                        if (this.validator && altPhoneInput.value.trim() !== '') {
                            this.validator.validateField('customer.alternate_phone');
                        }
                    });
                    altPhoneInput.addEventListener('input', () => {
                        if (this.validator && phoneInput.value.trim() !== '') {
                            this.validator.validateField('customer.phone');
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

    private updateGstinLabel() {
        const form = document.getElementById(this.formId) as HTMLFormElement;
        if (!form) return;
        const typeSelect = form.querySelector('[name="customer_type"]') as HTMLSelectElement;
        const gstinInput = document.getElementById('gstin-input') as HTMLInputElement;
        const gstinLabel = gstinInput?.previousElementSibling as HTMLLabelElement;
        if (typeSelect && gstinLabel) {
            const customerType = typeSelect.value;
            const isB2B = customerType === 'Commercial' || customerType === 'Government';
            if (isB2B) {
                gstinLabel.innerHTML = 'GST Number <span class="text-red-500">*</span>';
            } else {
                gstinLabel.innerHTML = 'GST Number';
            }
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
            this.updateGstinLabel();
            if (this.validator) this.validator.clearAllErrors();
            modal.classList.remove('hidden');
            const firstNameInput = form.querySelector('[name="customer.first_name"]') as HTMLInputElement;
            if (firstNameInput) {
                setTimeout(() => firstNameInput.focus(), 50);
            }
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

        this.updateGstinLabel();

        if (this.validator) this.validator.clearAllErrors();
        modal.classList.remove('hidden');
        const firstNameInput = form.querySelector('[name="customer.first_name"]') as HTMLInputElement;
        if (firstNameInput) {
            setTimeout(() => firstNameInput.focus(), 50);
        }
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
