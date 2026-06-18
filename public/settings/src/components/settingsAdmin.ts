/**
 * Admin and Company Information Management Component
 */

declare var settingsApi: any;

class SettingsAdmin {
    private originalAdminData: AdminData | null = null;
    private rawAccountNumber: string = "";
    private accountMasked: boolean = true;

    init(): void {
        // Company info editing and exporting
        document.getElementById("edit-company-info-button")?.addEventListener("click", () => this.enterEditMode());
        document.getElementById("save-company-info-button")?.addEventListener("click", () => this.saveCompanyInfo());
        document.getElementById("cancel-edit-company-button")?.addEventListener("click", () => this.exitEditMode());
        document.getElementById("export-company-info-button")?.addEventListener("click", () => this.exportCompanyDetails());
        document.getElementById("toggle-account-mask-btn")?.addEventListener("click", () => this.toggleAccountMask());

        // Credential management
        document.getElementById("change-username-button")?.addEventListener("click", () => this.handleChangeUsername());
        document.getElementById("change-password-button")?.addEventListener("click", () => this.handleChangePassword());

        // Keyboard navigation for username change
        document.getElementById("username")?.addEventListener("keydown", (e) => {
            if (e.key === "Enter") this.handleChangeUsername();
        });

        // Keyboard navigation for password change
        const passwordFields = ["old-password", "new-password", "confirm-password"];
        passwordFields.forEach(id => {
            document.getElementById(id)?.addEventListener("keydown", (e) => {
                if (e.key === "Enter") this.handleChangePassword();
            });
        });

        // Clear username validation errors on typing
        const usernameInput = document.getElementById("username") as HTMLInputElement;
        usernameInput?.addEventListener("input", () => this.clearFieldError(usernameInput));

        // Clear password validation errors on typing
        passwordFields.forEach(id => {
            const input = document.getElementById(id) as HTMLInputElement;
            input?.addEventListener("input", () => this.clearFieldError(input));
        });

        // Clear company details validation errors on typing
        const companyFields = [
            "edit-address-line1", "edit-address-line2", "edit-address-city", 
            "edit-address-pincode", "edit-state", "edit-gstin", 
            "edit-phone1", "edit-phone2", "edit-email", "edit-website", 
            "edit-bank-name", "edit-account-holder", "edit-account-number", 
            "edit-ifsc", "edit-branch"
        ];
        companyFields.forEach(id => {
            const input = document.getElementById(id) as HTMLInputElement;
            input?.addEventListener("input", () => this.clearFieldError(input));
        });

        // Restrict to numeric input with length constraints
        const numericInputs = [
            { id: "edit-address-pincode", max: 6 },
            { id: "edit-phone1", max: 10 },
            { id: "edit-phone2", max: 10 },
            { id: "edit-account-number", max: undefined }
        ];
        numericInputs.forEach(item => {
            const input = document.getElementById(item.id) as HTMLInputElement;
            if (input && (window as any).setupNumericInput) {
                (window as any).setupNumericInput(input, item.max);
            }
        });

        // Restrict State, Bank Name, and Account Holder to alphabetic characters and spaces only
        const alphaFields = ["edit-state", "edit-bank-name", "edit-account-holder"];
        alphaFields.forEach(id => {
            const input = document.getElementById(id) as HTMLInputElement;
            input?.addEventListener("input", () => {
                input.value = input.value.replace(/[^a-zA-Z\s]/g, "");
            });
        });

        // Auto-uppercase GSTIN and IFSC inputs, and cap GSTIN at 15 characters
        const gstinInput = document.getElementById("edit-gstin") as HTMLInputElement;
        gstinInput?.addEventListener("input", () => {
            gstinInput.value = gstinInput.value.toUpperCase().slice(0, 15);
        });

        const ifscInput = document.getElementById("edit-ifsc") as HTMLInputElement;
        ifscInput?.addEventListener("input", () => {
            ifscInput.value = ifscInput.value.toUpperCase();
        });

        // Interactive password toggles
        document.querySelectorAll(".password-toggle-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const button = e.currentTarget as HTMLButtonElement;
                const icon = button.querySelector("i");
                const input = button.previousElementSibling as HTMLInputElement;
                if (input && icon) {
                    if (input.type === "password") {
                        input.type = "text";
                        icon.classList.remove("fa-eye");
                        icon.classList.add("fa-eye-slash");
                    } else {
                        input.type = "password";
                        icon.classList.remove("fa-eye-slash");
                        icon.classList.add("fa-eye");
                    }
                }
            });
        });



        // Logout
        document.getElementById("logout-button")?.addEventListener("click", () => this.handleLogout());

        // Copy to clipboard actions
        document.querySelectorAll(".copy-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const targetBtn = e.currentTarget as HTMLButtonElement;
                this.handleCopyText(targetBtn);
            });
        });

        // Prevent mouse wheel scroll from modifying number input values
        document.addEventListener("wheel", (e) => {
            const target = e.target as HTMLElement;
            if (target && target.tagName === "INPUT" && (target as HTMLInputElement).type === "number") {
                e.preventDefault();
            }
        }, { passive: false });
    }

    fetchAdminInfo(): void {
        settingsApi.getAdminInfo()
            .then((data: AdminData) => {
                this.originalAdminData = data;
                this.updateAdminDisplay(data);
            })
            .catch((error: any) => {
                console.error("Error loading admin info:", error);
                (window as any).electronAPI.showAlert1("Failed to load admin information. Please try again.");
            });
    }

    private updateAdminDisplay(data: AdminData): void {
        const companyNameEl = document.getElementById("admin-company-name");
        if (companyNameEl) companyNameEl.textContent = data.company_name || 'Shresht Systems';

        const addr = data.address || {};
        const addressStr = typeof addr === 'string' ? addr : [addr.line1, addr.line2, addr.city, addr.state ? addr.state + (addr.pincode ? ' - ' + addr.pincode : '') : ''].filter(Boolean).join(', ');
        
        const addressEl = document.getElementById("admin-address");
        if (addressEl) addressEl.textContent = addressStr;

        const stateEl = document.getElementById("admin-state");
        if (stateEl) stateEl.textContent = typeof addr === 'object' ? (addr.state || '') : (data.state || '');

        const contact1El = document.getElementById("admin-contact1");
        if (contact1El) contact1El.textContent = data.phone.ph1;

        const contact2El = document.getElementById("admin-contact2");
        if (contact2El) contact2El.textContent = data.phone.ph2;

        const emailEl = document.getElementById("admin-email") as HTMLAnchorElement;
        if (emailEl) {
            emailEl.textContent = data.email || "-";
            if (data.email) {
                emailEl.href = `mailto:${data.email}`;
            } else {
                emailEl.removeAttribute("href");
            }
        }

        const websiteEl = document.getElementById("admin-website") as HTMLAnchorElement;
        if (websiteEl) {
            websiteEl.textContent = data.website || "-";
            if (data.website) {
                let url = data.website.trim();
                if (!/^https?:\/\//i.test(url)) {
                    url = `https://${url}`;
                }
                websiteEl.href = url;
            } else {
                websiteEl.removeAttribute("href");
            }
        }

        const gstinEl = document.getElementById("admin-gstin");
        if (gstinEl) gstinEl.textContent = data.gstin || "-";

        const bankNameEl = document.getElementById("bank-name");
        if (bankNameEl) bankNameEl.textContent = data.bank_details.bank_name || "-";

        const accountHolderElement = document.getElementById("account-holder");
        if (accountHolderElement) {
            accountHolderElement.textContent = data.bank_details.account_holder_name || "-";
        }

        this.rawAccountNumber = data.bank_details.account_number || "";
        this.renderAccountNumber();

        const ifscCodeEl = document.getElementById("ifsc-code");
        if (ifscCodeEl) ifscCodeEl.textContent = data.bank_details.ifsc_code || "-";

        const branchNameEl = document.getElementById("branch-name");
        if (branchNameEl) branchNameEl.textContent = data.bank_details.branch || "-";
    }

    private enterEditMode(): void {
        document.getElementById("company-view-mode")?.classList.add("hidden");
        document.getElementById("bank-view-mode")?.classList.add("hidden");
        document.getElementById("company-edit-mode")?.classList.remove("hidden");
        document.getElementById("bank-edit-mode")?.classList.remove("hidden");

        document.getElementById("edit-company-info-button")?.classList.add("hidden");
        
        const actionsEl = document.getElementById("edit-company-actions");
        if (actionsEl) {
            actionsEl.classList.remove("hidden");
            actionsEl.classList.add("flex");
        }

        if (this.originalAdminData) {
            const addr = this.originalAdminData.address || {};
            const addressStr = typeof addr === 'string' ? addr : [addr.line1, addr.line2, addr.city, addr.state ? addr.state + (addr.pincode ? ' - ' + addr.pincode : '') : ''].filter(Boolean).join(', ');
            
            const editCompanyInput = document.getElementById("edit-company") as HTMLInputElement;
            if (editCompanyInput) editCompanyInput.value = this.originalAdminData.company_name || '';

            const editAddressLine1Input = document.getElementById("edit-address-line1") as HTMLInputElement;
            if (editAddressLine1Input) editAddressLine1Input.value = (typeof addr === 'object' ? addr.line1 : addressStr) || '';

            const editAddressLine2Input = document.getElementById("edit-address-line2") as HTMLInputElement;
            if (editAddressLine2Input) editAddressLine2Input.value = (typeof addr === 'object' ? addr.line2 : '') || '';

            const editAddressCityInput = document.getElementById("edit-address-city") as HTMLInputElement;
            if (editAddressCityInput) editAddressCityInput.value = (typeof addr === 'object' ? addr.city : '') || '';

            const editAddressPincodeInput = document.getElementById("edit-address-pincode") as HTMLInputElement;
            if (editAddressPincodeInput) editAddressPincodeInput.value = (typeof addr === 'object' ? addr.pincode : '') || '';

            const editStateInput = document.getElementById("edit-state") as HTMLInputElement;
            if (editStateInput) editStateInput.value = (typeof addr === 'object' ? addr.state : this.originalAdminData.state) || '';

            const editPhone1Input = document.getElementById("edit-phone1") as HTMLInputElement;
            if (editPhone1Input) editPhone1Input.value = this.originalAdminData.phone?.ph1 || '';

            const editPhone2Input = document.getElementById("edit-phone2") as HTMLInputElement;
            if (editPhone2Input) editPhone2Input.value = this.originalAdminData.phone?.ph2 || '';

            const editEmailInput = document.getElementById("edit-email") as HTMLInputElement;
            if (editEmailInput) editEmailInput.value = this.originalAdminData.email || '';

            const editWebsiteInput = document.getElementById("edit-website") as HTMLInputElement;
            if (editWebsiteInput) editWebsiteInput.value = this.originalAdminData.website || '';

            const editGstinInput = document.getElementById("edit-gstin") as HTMLInputElement;
            if (editGstinInput) editGstinInput.value = this.originalAdminData.gstin || '';

            const editBankNameInput = document.getElementById("edit-bank-name") as HTMLInputElement;
            if (editBankNameInput) editBankNameInput.value = this.originalAdminData.bank_details?.bank_name || '';

            const editAccountHolderInput = document.getElementById("edit-account-holder") as HTMLInputElement;
            if (editAccountHolderInput) editAccountHolderInput.value = this.originalAdminData.bank_details?.account_holder_name || '';

            const editAccountNumberInput = document.getElementById("edit-account-number") as HTMLInputElement;
            if (editAccountNumberInput) editAccountNumberInput.value = this.originalAdminData.bank_details?.account_number || '';

            const editIfscInput = document.getElementById("edit-ifsc") as HTMLInputElement;
            if (editIfscInput) editIfscInput.value = this.originalAdminData.bank_details?.ifsc_code || '';

            const editBranchInput = document.getElementById("edit-branch") as HTMLInputElement;
            if (editBranchInput) editBranchInput.value = this.originalAdminData.bank_details?.branch || '';
        }
    }

    private exitEditMode(): void {
        document.getElementById("company-view-mode")?.classList.remove("hidden");
        document.getElementById("bank-view-mode")?.classList.remove("hidden");
        document.getElementById("company-edit-mode")?.classList.add("hidden");
        document.getElementById("bank-edit-mode")?.classList.add("hidden");

        document.getElementById("edit-company-info-button")?.classList.remove("hidden");
        
        const actionsEl = document.getElementById("edit-company-actions");
        if (actionsEl) {
            actionsEl.classList.add("hidden");
            actionsEl.classList.remove("flex");
        }
    }

    private saveCompanyInfo(): void {
        const saveButton = document.getElementById("save-company-info-button") as HTMLButtonElement;
        if (!saveButton) return;
        const originalContent = saveButton.innerHTML;
        saveButton.disabled = true;
        saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        const line1Input = (document.getElementById("edit-address-line1") as HTMLInputElement).value.trim();
        const line2Input = (document.getElementById("edit-address-line2") as HTMLInputElement).value.trim();
        const cityInput = (document.getElementById("edit-address-city") as HTMLInputElement).value.trim();
        const stateInput = (document.getElementById("edit-state") as HTMLInputElement).value.trim();
        const pincodeInput = (document.getElementById("edit-address-pincode") as HTMLInputElement).value.trim();
        
        const updatedData: Partial<AdminData> = {
            company_name: (document.getElementById("edit-company") as HTMLInputElement).value.trim(),
            address: {
                line1: line1Input,
                line2: line2Input,
                city: cityInput,
                state: stateInput,
                pincode: pincodeInput,
                country: 'India'
            },
            phone: {
                ph1: (document.getElementById("edit-phone1") as HTMLInputElement).value.trim(),
                ph2: (document.getElementById("edit-phone2") as HTMLInputElement).value.trim()
            },
            email: (document.getElementById("edit-email") as HTMLInputElement).value.trim(),
            website: (document.getElementById("edit-website") as HTMLInputElement).value.trim(),
            gstin: (document.getElementById("edit-gstin") as HTMLInputElement).value.trim(),
            bank_details: {
                bank_name: (document.getElementById("edit-bank-name") as HTMLInputElement).value.trim(),
                account_holder_name: (document.getElementById("edit-account-holder") as HTMLInputElement).value.trim(),
                account_number: (document.getElementById("edit-account-number") as HTMLInputElement).value.trim(),
                ifsc_code: (document.getElementById("edit-ifsc") as HTMLInputElement).value.trim(),
                branch: (document.getElementById("edit-branch") as HTMLInputElement).value.trim()
            }
        };

        // Validate fields
        let hasError = false;

        const line1El = document.getElementById("edit-address-line1") as HTMLInputElement;
        if (!line1Input) {
            this.showFieldError(line1El, "Address Line 1 is required.");
            hasError = true;
        }

        const line2El = document.getElementById("edit-address-line2") as HTMLInputElement;
        if (!line2Input) {
            this.showFieldError(line2El, "Address Line 2 is required.");
            hasError = true;
        }

        const cityEl = document.getElementById("edit-address-city") as HTMLInputElement;
        if (!cityInput) {
            this.showFieldError(cityEl, "City is required.");
            hasError = true;
        }

        const stateEl = document.getElementById("edit-state") as HTMLInputElement;
        if (!stateInput) {
            this.showFieldError(stateEl, "State is required.");
            hasError = true;
        } else if (!/^[a-zA-Z\s]+$/.test(stateInput)) {
            this.showFieldError(stateEl, "State must contain only letters and spaces.");
            hasError = true;
        }

        const pincodeEl = document.getElementById("edit-address-pincode") as HTMLInputElement;
        if (!pincodeInput) {
            this.showFieldError(pincodeEl, "Pincode is required.");
            hasError = true;
        } else if (pincodeInput.length !== 6) {
            this.showFieldError(pincodeEl, "Pincode must be exactly 6 digits.");
            hasError = true;
        }

        const phone1El = document.getElementById("edit-phone1") as HTMLInputElement;
        const phone1Val = updatedData.phone?.ph1 || "";
        if (!phone1Val) {
            this.showFieldError(phone1El, "Phone 1 is required.");
            hasError = true;
        } else if (phone1Val.length !== 10) {
            this.showFieldError(phone1El, "Phone 1 must be exactly 10 digits.");
            hasError = true;
        }

        const phone2El = document.getElementById("edit-phone2") as HTMLInputElement;
        const phone2Val = updatedData.phone?.ph2 || "";
        if (!phone2Val) {
            this.showFieldError(phone2El, "Phone 2 is required.");
            hasError = true;
        } else if (phone2Val.length !== 10) {
            this.showFieldError(phone2El, "Phone 2 must be exactly 10 digits.");
            hasError = true;
        }

        const emailEl = document.getElementById("edit-email") as HTMLInputElement;
        const emailVal = updatedData.email || "";
        if (!emailVal) {
            this.showFieldError(emailEl, "Email is required.");
            hasError = true;
        } else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(emailVal)) {
                this.showFieldError(emailEl, "Please enter a valid email address.");
                hasError = true;
            }
        }

        const gstinEl = document.getElementById("edit-gstin") as HTMLInputElement;
        const gstinVal = updatedData.gstin || "";
        if (!gstinVal) {
            this.showFieldError(gstinEl, "GSTIN is required.");
            hasError = true;
        } else if (gstinVal.length !== 15) {
            this.showFieldError(gstinEl, "GSTIN must be exactly 15 characters.");
            hasError = true;
        }

        const websiteEl = document.getElementById("edit-website") as HTMLInputElement;
        const websiteVal = updatedData.website || "";
        if (!websiteVal) {
            this.showFieldError(websiteEl, "Website URL is required.");
            hasError = true;
        } else {
            const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/i;
            if (!urlPattern.test(websiteVal)) {
                this.showFieldError(websiteEl, "Please enter a valid website URL.");
                hasError = true;
            }
        }

        const bankNameEl = document.getElementById("edit-bank-name") as HTMLInputElement;
        const bankNameVal = updatedData.bank_details?.bank_name || "";
        if (!bankNameVal) {
            this.showFieldError(bankNameEl, "Bank name is required.");
            hasError = true;
        } else if (!/^[a-zA-Z\s]+$/.test(bankNameVal)) {
            this.showFieldError(bankNameEl, "Bank name must contain only letters and spaces.");
            hasError = true;
        }

        const accHolderEl = document.getElementById("edit-account-holder") as HTMLInputElement;
        const accHolderVal = updatedData.bank_details?.account_holder_name || "";
        if (!accHolderVal) {
            this.showFieldError(accHolderEl, "Account holder is required.");
            hasError = true;
        } else if (!/^[a-zA-Z\s]+$/.test(accHolderVal)) {
            this.showFieldError(accHolderEl, "Account holder name must contain only letters and spaces.");
            hasError = true;
        }

        const accNoEl = document.getElementById("edit-account-number") as HTMLInputElement;
        const accNoVal = updatedData.bank_details?.account_number || "";
        if (!accNoVal) {
            this.showFieldError(accNoEl, "Account number is required.");
            hasError = true;
        }

        const ifscEl = document.getElementById("edit-ifsc") as HTMLInputElement;
        const ifscVal = updatedData.bank_details?.ifsc_code || "";
        if (!ifscVal) {
            this.showFieldError(ifscEl, "IFSC Code is required.");
            hasError = true;
        }

        const branchEl = document.getElementById("edit-branch") as HTMLInputElement;
        const branchVal = updatedData.bank_details?.branch || "";
        if (!branchVal) {
            this.showFieldError(branchEl, "Branch is required.");
            hasError = true;
        }

        if (hasError) {
            saveButton.disabled = false;
            saveButton.innerHTML = originalContent;
            return;
        }

        settingsApi.updateCompanyInfo(updatedData)
            .then((data: { success: boolean; message?: string; admin: AdminData }) => {
                if (data.success) {
                    (window as any).electronAPI.showAlert1("Company information updated successfully!");
                    this.originalAdminData = data.admin;
                    this.updateAdminDisplay(data.admin);
                    this.exitEditMode();
                } else {
                    (window as any).electronAPI.showAlert1(`Failed to update: ${data.message}`);
                }
            })
            .catch((error: any) => {
                console.error("Error updating company info:", error);
                (window as any).electronAPI.showAlert1("Failed to update company information. Please try again.");
            })
            .finally(() => {
                saveButton.disabled = false;
                saveButton.innerHTML = originalContent;
            });
    }

    private handleChangeUsername(): void {
        const usernameInput = document.getElementById("username") as HTMLInputElement;
        const username = usernameInput.value.trim();

        this.clearFieldError(usernameInput);

        if (!username) {
            this.showFieldError(usernameInput, "Username cannot be empty.");
            return;
        }

        // Validate username (alphanumeric and underscore only, 3-20 chars)
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        if (!usernameRegex.test(username)) {
            this.showFieldError(usernameInput, "Username must be 3-20 characters and contain only letters, numbers, and underscores.");
            return;
        }

        // Check if the username is identical to the current one
        if (this.originalAdminData && this.originalAdminData.username === username) {
            this.showFieldError(usernameInput, "New username must be different from current username.");
            return;
        }

        const changeButton = document.getElementById("change-username-button") as HTMLButtonElement;
        if (!changeButton) return;
        const originalContent = changeButton.innerHTML;
        changeButton.disabled = true;
        changeButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Changing...';

        settingsApi.changeUsername(username)
            .then((data: { success: boolean; message: string }) => {
                (window as any).electronAPI.showAlert1(data.message);
                sessionStorage.setItem('username', username);
                if (this.originalAdminData) {
                    this.originalAdminData.username = username;
                }
                usernameInput.value = "";
            })
            .catch((error: any) => {
                console.error("Error changing username:", error);
                const msg = error.message || "Failed to change username. Please try again.";
                if (msg.toLowerCase().includes("different") || msg.toLowerCase().includes("username")) {
                    this.showFieldError(usernameInput, msg);
                } else {
                    (window as any).electronAPI.showAlert1(msg);
                }
            })
            .finally(() => {
                changeButton.disabled = false;
                changeButton.innerHTML = originalContent;
            });
    }

    private handleChangePassword(): void {
        const oldPasswordInput = document.getElementById("old-password") as HTMLInputElement;
        const newPasswordInput = document.getElementById("new-password") as HTMLInputElement;
        const confirmPasswordInput = document.getElementById("confirm-password") as HTMLInputElement;

        const oldPassword = oldPasswordInput.value.trim();
        const newPassword = newPasswordInput.value.trim();
        const confirmPassword = confirmPasswordInput.value.trim();

        this.clearFieldError(oldPasswordInput);
        this.clearFieldError(newPasswordInput);
        this.clearFieldError(confirmPasswordInput);

        let hasError = false;
        if (!oldPassword) {
            this.showFieldError(oldPasswordInput, "Old password is required.");
            hasError = true;
        }
        if (!newPassword) {
            this.showFieldError(newPasswordInput, "New password is required.");
            hasError = true;
        }
        if (!confirmPassword) {
            this.showFieldError(confirmPasswordInput, "Confirm password is required.");
            hasError = true;
        }
        if (hasError) return;

        if (newPassword !== confirmPassword) {
            this.showFieldError(confirmPasswordInput, "New password and confirm password do not match.");
            return;
        }

        if (oldPassword === newPassword) {
            this.showFieldError(newPasswordInput, "New password must be different from old password.");
            return;
        }

        // Basic password strength validation
        if (newPassword.length < 4) {
            this.showFieldError(newPasswordInput, "New password must be at least 4 characters long.");
            return;
        }

        const changeButton = document.getElementById("change-password-button") as HTMLButtonElement;
        if (!changeButton) return;
        const originalContent = changeButton.innerHTML;
        changeButton.disabled = true;
        changeButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Changing...';

        settingsApi.changePassword(oldPassword, newPassword)
            .then((data: { success: boolean; message: string }) => {
                (window as any).electronAPI.showAlert1(data.message);
                if (data.message.includes("success")) {
                    oldPasswordInput.value = "";
                    newPasswordInput.value = "";
                    confirmPasswordInput.value = "";
                }
            })
            .catch((error: any) => {
                console.error("Error changing password:", error);
                const msg = error.message || "Failed to change password. Please try again.";
                if (msg.toLowerCase().includes("invalid old password")) {
                    this.showFieldError(oldPasswordInput, msg);
                } else if (msg.toLowerCase().includes("different")) {
                    this.showFieldError(newPasswordInput, msg);
                } else {
                    (window as any).electronAPI.showAlert1(msg);
                }
            })
            .finally(() => {
                changeButton.disabled = false;
                changeButton.innerHTML = originalContent;
            });
    }

    private showFieldError(input: HTMLInputElement, message: string): void {
        this.clearFieldError(input);

        // Apply error borders and focus ring classes
        input.classList.add('border-red-500', 'focus:border-red-555', 'focus:ring-red-500/20');
        input.style.borderColor = '#ef4444';
        input.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';

        // Accessibility attributes
        input.setAttribute('aria-invalid', 'true');
        const errorId = `${input.id}-error`;
        input.setAttribute('aria-describedby', errorId);

        // Create error message node
        const errorMsg = document.createElement('div');
        errorMsg.id = errorId;
        errorMsg.className = 'text-[11px] font-semibold text-red-655 mt-1 transition-all duration-200 ease-in-out error-message-inline';
        errorMsg.textContent = message;

        const parent = input.parentElement;
        if (parent) {
            if (parent.classList.contains('relative')) {
                parent.parentElement?.appendChild(errorMsg);
            } else {
                parent.appendChild(errorMsg);
            }
        }
    }

    private clearFieldError(input: HTMLInputElement): void {
        input.classList.remove('border-red-500', 'focus:border-red-550', 'focus:ring-red-500/20');
        input.style.borderColor = '';
        input.style.boxShadow = '';
        input.removeAttribute('aria-invalid');
        input.removeAttribute('aria-describedby');

        const errorId = `${input.id}-error`;
        const errorMsg = document.getElementById(errorId);
        if (errorMsg) {
            errorMsg.remove();
        }
    }

    private handleLogout(): void {
        (window as any).electronAPI.showAlert2('Are you sure you want to log out?');
        (window as any).electronAPI.receiveAlertResponse((response: string) => {
            if (response === 'Yes') {
                sessionStorage.clear();
                window.location.href = '/';
            }
        });
    }

    private exportCompanyDetails(): void {
        const btn = document.getElementById("export-company-info-button") as HTMLButtonElement;
        if (!btn) return;
        const originalHTML = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting...';
        settingsApi.exportCompanyInfo()
            .then((data: any) => {
                if (data.success) {
                    (window as any).electronAPI.showAlert1(data.message || "Company details exported successfully!");
                } else {
                    (window as any).electronAPI.showAlert1("Failed to export company details: " + (data.message || "Unknown error"));
                }
            })
            .catch((error: any) => {
                console.error("Error exporting company details:", error);
                (window as any).electronAPI.showAlert1("Failed to export company details. Please try again.");
            })
            .finally(() => {
                btn.disabled = false;
                btn.innerHTML = originalHTML;
            });
    }

    private toggleAccountMask(): void {
        this.accountMasked = !this.accountMasked;
        this.renderAccountNumber();
    }

    private renderAccountNumber(): void {
        const accountNumberEl = document.getElementById("account-number");
        const maskIconEl = document.getElementById("account-mask-icon");
        if (!accountNumberEl) return;

        if (this.accountMasked) {
            const raw = this.rawAccountNumber || "";
            if (raw.length > 4) {
                const last4 = raw.slice(-4);
                accountNumberEl.textContent = `•••• •••• ${last4}`;
            } else {
                accountNumberEl.textContent = "••••";
            }
            if (maskIconEl) {
                maskIconEl.className = "fas fa-eye text-xs";
            }
        } else {
            accountNumberEl.textContent = this.rawAccountNumber;
            if (maskIconEl) {
                maskIconEl.className = "fas fa-eye-slash text-xs";
            }
        }
    }



    private handleCopyText(btn: HTMLButtonElement): void {
        const targetSelector = btn.getAttribute("data-clipboard-target");
        if (!targetSelector) return;
        
        let textToCopy = "";
        
        if (targetSelector === "#account-number") {
            textToCopy = this.rawAccountNumber;
        } else {
            const targetEl = document.querySelector(targetSelector);
            if (!targetEl) return;
            textToCopy = targetEl.textContent?.trim() || "";
        }
        
        if (!textToCopy || textToCopy === "-") {
            (window as any).electronAPI.showAlert1("Nothing to copy.");
            return;
        }
        
        navigator.clipboard.writeText(textToCopy)
            .then(() => {
                const icon = btn.querySelector("i");
                if (icon) {
                    const originalClass = icon.className;
                    icon.className = "fas fa-check text-emerald-600";
                    setTimeout(() => {
                        icon.className = originalClass;
                    }, 1500);
                }
            })
            .catch(err => {
                console.error("Failed to copy text:", err);
            });
    }
}

declare var settingsAdmin: any;
(window as any).settingsAdmin = new SettingsAdmin();
