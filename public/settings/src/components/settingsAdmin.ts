/**
 * Admin and Company Information Management Component
 */

declare var settingsApi: any;

class SettingsAdmin {
    private originalAdminData: AdminData | null = null;

    init(): void {
        // Company info editing
        document.getElementById("edit-company-info-button")?.addEventListener("click", () => this.enterEditMode());
        document.getElementById("save-company-info-button")?.addEventListener("click", () => this.saveCompanyInfo());
        document.getElementById("cancel-edit-company-button")?.addEventListener("click", () => this.exitEditMode());

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

        // Logout
        document.getElementById("logout-button")?.addEventListener("click", () => this.handleLogout());
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

        const emailEl = document.getElementById("admin-email");
        if (emailEl) emailEl.textContent = data.email;

        const websiteEl = document.getElementById("admin-website");
        if (websiteEl) websiteEl.textContent = data.website;

        const gstinEl = document.getElementById("admin-gstin");
        if (gstinEl) gstinEl.textContent = data.gstin;

        const bankNameEl = document.getElementById("bank-name");
        if (bankNameEl) bankNameEl.textContent = data.bank_details.bank_name;

        const accountHolderElement = document.getElementById("account-holder");
        if (accountHolderElement && data.bank_details.account_holder_name) {
            accountHolderElement.textContent = data.bank_details.account_holder_name;
        }

        const accountNumberEl = document.getElementById("account-number");
        if (accountNumberEl) accountNumberEl.textContent = data.bank_details.account_number;

        const ifscCodeEl = document.getElementById("ifsc-code");
        if (ifscCodeEl) ifscCodeEl.textContent = data.bank_details.ifsc_code;

        const branchNameEl = document.getElementById("branch-name");
        if (branchNameEl) branchNameEl.textContent = data.bank_details.branch;
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

            const editAddressInput = document.getElementById("edit-address") as HTMLTextAreaElement;
            if (editAddressInput) editAddressInput.value = addressStr;

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

        const addressInput = (document.getElementById("edit-address") as HTMLTextAreaElement).value.trim();
        const stateInput = (document.getElementById("edit-state") as HTMLInputElement).value.trim();
        
        const updatedData: Partial<AdminData> = {
            company_name: (document.getElementById("edit-company") as HTMLInputElement).value.trim(),
            address: {
                line1: addressInput,
                line2: '',
                city: '',
                state: stateInput,
                pincode: '',
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

        // Validate required fields
        if (!updatedData.company_name || !addressInput || !updatedData.phone?.ph1 || !updatedData.email) {
            (window as any).electronAPI.showAlert1("Please fill in all required fields (Company, Address, Phone 1, Email)");
            saveButton.disabled = false;
            saveButton.innerHTML = originalContent;
            return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(updatedData.email)) {
            (window as any).electronAPI.showAlert1("Please enter a valid email address");
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
        const username = (document.getElementById("username") as HTMLInputElement).value.trim();

        if (!username) {
            (window as any).electronAPI.showAlert1("Username cannot be empty.");
            return;
        }

        // Validate username (alphanumeric and underscore only, 3-20 chars)
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        if (!usernameRegex.test(username)) {
            (window as any).electronAPI.showAlert1("Username must be 3-20 characters and contain only letters, numbers, and underscores.");
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
            })
            .catch((error: any) => {
                console.error("Error changing username:", error);
                (window as any).electronAPI.showAlert1("Failed to change username. Please try again.");
            })
            .finally(() => {
                changeButton.disabled = false;
                changeButton.innerHTML = originalContent;
            });
    }

    private handleChangePassword(): void {
        const oldPassword = (document.getElementById("old-password") as HTMLInputElement).value.trim();
        const newPassword = (document.getElementById("new-password") as HTMLInputElement).value.trim();
        const confirmPassword = (document.getElementById("confirm-password") as HTMLInputElement).value.trim();

        if (!oldPassword || !newPassword || !confirmPassword) {
            (window as any).electronAPI.showAlert1("All password fields are required.");
            return;
        }

        if (newPassword !== confirmPassword) {
            (window as any).electronAPI.showAlert1("New password and confirm password do not match.");
            return;
        }

        // Basic password strength validation
        if (newPassword.length < 4) {
            (window as any).electronAPI.showAlert1("New password must be at least 4 characters long.");
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
                    (document.getElementById("old-password") as HTMLInputElement).value = "";
                    (document.getElementById("new-password") as HTMLInputElement).value = "";
                    (document.getElementById("confirm-password") as HTMLInputElement).value = "";
                }
            })
            .catch((error: any) => {
                console.error("Error changing password:", error);
                (window as any).electronAPI.showAlert1("Failed to change password. Please try again.");
            })
            .finally(() => {
                changeButton.disabled = false;
                changeButton.innerHTML = originalContent;
            });
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
}

declare var settingsAdmin: any;
(window as any).settingsAdmin = new SettingsAdmin();
