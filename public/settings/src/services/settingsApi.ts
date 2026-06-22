/**
 * Settings API Service
 */

class SettingsApi {
    private async request(url: string, options: RequestInit = {}): Promise<any> {
        const username = sessionStorage.getItem('username') || '';
        const headers = new Headers(options.headers || {});
        if (username) {
            headers.set('x-username', username);
        }
        options.headers = headers;

        const response = await fetch(url, options);
        if (!response.ok) {
            let errorMsg = `HTTP error! status: ${response.status}`;
            try {
                const errData = await response.json();
                if (errData && errData.message) {
                    errorMsg = errData.message;
                }
            } catch (e) {
                // Ignore parsing errors on non-json error responses
            }
            throw new Error(errorMsg);
        }
        return response.json();
    }

    async getAdminInfo(): Promise<AdminData> {
        return this.request("/admin/admin-info");
    }

    async updateCompanyInfo(data: Partial<AdminData>): Promise<{ success: boolean; message?: string; admin: AdminData }> {
        return this.request("/settings/company-info", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
    }

    async changeUsername(username: string): Promise<{ success: boolean; message: string }> {
        return this.request("/admin/change-username", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username })
        });
    }

    async changePassword(oldPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
        return this.request("/admin/change-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ oldPassword, newPassword })
        });
    }

    async getBackupStatus(): Promise<{ success: boolean; tools: Record<string, boolean> }> {
        return this.request("/settings/backup/status");
    }

    async getPreferences(): Promise<{ success: boolean; settings: SystemPreferences }> {
        return this.request("/settings/preferences");
    }

    async savePreferences(preferences: Partial<SystemPreferences>): Promise<{ success: boolean; message?: string }> {
        return this.request("/settings/preferences", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(preferences)
        });
    }

    async exportData(type: string): Promise<{ success: boolean; message?: string; fileSize?: number }> {
        return this.request(`/settings/backup/export/${type}`);
    }

    async restoreCollection(formData: FormData): Promise<{ success: boolean; message: string; fileSize?: number }> {
        return this.request("/settings/backup/restore-collection", {
            method: "POST",
            body: formData
        });
    }

    async restoreDatabase(formData: FormData): Promise<{ success: boolean; message: string; warning?: string; fileSize?: number }> {
        return this.request("/settings/backup/restore-database", {
            method: "POST",
            body: formData
        });
    }

    async triggerManualBackup(): Promise<{ success: boolean; message?: string; path?: string; fileSize?: number }> {
        return this.request("/settings/backup/manual", { method: "POST" });
    }

    async updateWhatsAppPreferences(data: { phoneNumberId: string; enabled: boolean }): Promise<{ success: boolean; message?: string }> {
        return this.request("/settings/preferences/whatsapp", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
    }

    async saveWhatsAppToken(token: string): Promise<{ success: boolean; message?: string }> {
        return this.request("/settings/preferences/whatsapp/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token })
        });
    }

    async updateCloudinaryPreferences(data: { cloudName: string; apiKey: string; apiSecret: string }): Promise<{ success: boolean; message?: string }> {
        return this.request("/settings/preferences/cloudinary", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
    }

    async getSystemInfo(): Promise<{ success: boolean; system: SystemStaticInfo }> {
        return this.request("/settings/system-info");
    }

    async getDatabaseStats(): Promise<{ success: boolean; stats: DatabaseStats }> {
        return this.request("/settings/database/stats");
    }

    async getLogsStats(): Promise<{ success: boolean; stats: any }> {
        return this.request("/settings/logs/stats");
    }

    async exportCompanyInfo(): Promise<{ success: boolean; message?: string }> {
        return this.request("/settings/company-info/export");
    }
}

declare var settingsApi: any;
(window as any).settingsApi = new SettingsApi();
