// @ts-nocheck
/**
 * Unified Form Validation System
 * Used across Customer, Quotation, Invoice, and Supplier modules.
 */

(function () {
    // Validator Interface structure
    interface ValidationRule {
        validate: (value: string) => boolean | string;
    }

    // Common Validators
    const Validators = {
        required: (message = 'This field is required'): ValidationRule => ({
            validate: (val) => val.trim() !== '' || message
        }),
        phone: (required = true, message = 'Please enter a valid 10-digit phone number'): ValidationRule => ({
            validate: (val) => {
                const cleaned = val.trim();
                if (cleaned === '') return !required || message;
                return /^\d{10}$/.test(cleaned) || message;
            }
        }),
        pincode: (required = true, message = 'Please enter a valid 6-digit pincode'): ValidationRule => ({
            validate: (val) => {
                const cleaned = val.trim();
                if (cleaned === '') return !required || message;
                return /^\d{6}$/.test(cleaned) || message;
            }
        }),
        email: (required = false, message = 'Please enter a valid email address'): ValidationRule => ({
            validate: (val) => {
                const cleaned = val.trim();
                if (cleaned === '') return !required || message;
                // Standard RFC 5322 compliant regex for email formatting validation
                const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
                return emailRegex.test(cleaned) || message;
            }
        }),
        gstin: (required = false, message = 'Please enter a valid 15-digit GSTIN'): ValidationRule => ({
            validate: (val) => {
                const cleaned = val.trim();
                if (cleaned === '') return !required || message;
                const gstinRegex = /^[0-9a-zA-Z]{15}$/;
                return gstinRegex.test(cleaned) || message;
            }
        })
    };

    // Helper to restrict input fields to numeric only
    function setupNumericInput(input: HTMLInputElement, maxLength?: number) {
        if (!input) return;

        // Force numeric keypad on mobile devices
        input.setAttribute('inputmode', 'numeric');
        input.setAttribute('pattern', '[0-9]*');

        // Prevent typing non-digits
        input.addEventListener('keydown', (e: KeyboardEvent) => {
            const allowedKeys = [
                'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'Escape', 'End', 'Home'
            ];
            
            // Allow copy/paste/select modifier keys (Ctrl/Cmd)
            if (allowedKeys.includes(e.key) || e.ctrlKey || e.metaKey || e.altKey) {
                return;
            }

            // Block anything that is not a numeric digit
            if (!/^\d$/.test(e.key)) {
                e.preventDefault();
            }
        });

        // Sanitize paste and keystrokes dynamically
        const sanitizeInput = () => {
            let cleaned = input.value.replace(/\D/g, '');
            if (maxLength && cleaned.length > maxLength) {
                cleaned = cleaned.slice(0, maxLength);
            }
            if (input.value !== cleaned) {
                input.value = cleaned;
            }
        };

        input.addEventListener('input', sanitizeInput);
        input.addEventListener('paste', (e: ClipboardEvent) => {
            e.preventDefault();
            const pastedText = e.clipboardData?.getData('text') || '';
            const cleaned = pastedText.replace(/\D/g, '');
            
            // Calculate remaining length space
            const selection = window.getSelection()?.toString() || '';
            const selectionLength = selection ? selection.length : 0;
            const currentLenWithoutSelection = input.value.length - selectionLength;
            
            let allowedPasteLen = cleaned.length;
            if (maxLength) {
                allowedPasteLen = Math.max(0, maxLength - currentLenWithoutSelection);
            }

            const cleanPaste = cleaned.slice(0, allowedPasteLen);
            if (cleanPaste) {
                // Insert at cursor position
                const start = input.selectionStart || 0;
                const end = input.selectionEnd || 0;
                const text = input.value;
                input.value = text.slice(0, start) + cleanPaste + text.slice(end);
                // Trigger input event to clear validation
                input.dispatchEvent(new Event('input', { bubbles: true }));
                // Reposition cursor
                const newCursorPos = start + cleanPaste.length;
                input.setSelectionRange(newCursorPos, newCursorPos);
            }
        });
    }

    // Form Validator Class
    class FormValidator {
        private form: HTMLFormElement;
        private rules: Map<string, ValidationRule[]> = new Map();

        constructor(form: HTMLFormElement) {
            this.form = form;
            // Disable native browser validation bubble
            this.form.setAttribute('novalidate', '');
        }

        /**
         * Register validation rules for a form input element
         */
        public registerField(name: string, rules: ValidationRule[]) {
            this.rules.set(name, rules);
            const input = this.form.querySelector(`[name="${name}"]`) as HTMLElement;
            if (input) {
                // Clear errors automatically as user types or edits
                input.addEventListener('input', () => this.clearFieldError(input));
                input.addEventListener('change', () => this.clearFieldError(input));
            }
        }

        /**
         * Run validation check on a specific field
         */
        public validateField(name: string): boolean {
            const input = this.form.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
            if (!input) return true;

            const rules = this.rules.get(name);
            if (!rules) return true;

            const value = input.value;
            for (const rule of rules) {
                const result = rule.validate(value);
                if (typeof result === 'string') {
                    this.showFieldError(input, result);
                    return false;
                }
            }

            this.clearFieldError(input);
            return true;
        }

        /**
         * Validate all registered fields in the form
         * Focuses on the first invalid element if validation fails
         */
        public validateAll(): boolean {
            let isValid = true;
            let firstInvalidInput: HTMLElement | null = null;

            for (const name of this.rules.keys()) {
                const input = this.form.querySelector(`[name="${name}"]`) as HTMLElement;
                if (input) {
                    const fieldValid = this.validateField(name);
                    if (!fieldValid) {
                        isValid = false;
                        if (!firstInvalidInput) {
                            firstInvalidInput = input;
                        }
                    }
                }
            }

            if (firstInvalidInput) {
                firstInvalidInput.focus();
            }

            return isValid;
        }

        /**
         * Render custom inline validation error message below input
         */
        private showFieldError(input: HTMLElement, message: string) {
            this.clearFieldError(input);

            // Apply error borders and focus ring classes
            input.classList.add('border-red-500', 'focus:border-red-500', 'focus:ring-red-500/20');
            input.style.borderColor = '#ef4444';
            input.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';

            // Accessibility attributes
            input.setAttribute('aria-invalid', 'true');
            const errorId = `${input.id || input.getAttribute('name')?.replace(/\./g, '_')}-error`;
            input.setAttribute('aria-describedby', errorId);

            // Create error message node
            const errorMsg = document.createElement('div');
            errorMsg.id = errorId;
            errorMsg.className = 'text-[11px] font-semibold text-red-600 mt-1 transition-all duration-200 ease-in-out error-message-inline';
            errorMsg.textContent = message;

            const parent = input.parentElement;
            if (parent) {
                parent.appendChild(errorMsg);
            }
        }

        /**
         * Clear error state and messages for a field
         */
        private clearFieldError(input: HTMLElement) {
            input.classList.remove('border-red-500', 'focus:border-red-500', 'focus:ring-red-500/20');
            input.style.borderColor = '';
            input.style.boxShadow = '';
            input.removeAttribute('aria-invalid');
            input.removeAttribute('aria-describedby');

            const errorId = `${input.id || input.getAttribute('name')?.replace(/\./g, '_')}-error`;
            const errorMsg = document.getElementById(errorId);
            if (errorMsg) {
                errorMsg.remove();
            }
        }

        /**
         * Clear all displayed error messages in the form
         */
        public clearAllErrors() {
            for (const name of this.rules.keys()) {
                const input = this.form.querySelector(`[name="${name}"]`) as HTMLElement;
                if (input) {
                    this.clearFieldError(input);
                }
            }
        }
    }

    // Expose on global window object for all modules
    if (typeof window !== 'undefined') {
        window.Validators = Validators;
        window.setupNumericInput = setupNumericInput;
        window.FormValidator = FormValidator;
    }
})();
