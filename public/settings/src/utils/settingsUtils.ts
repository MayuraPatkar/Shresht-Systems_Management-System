/**
 * Settings Module Utilities
 */

class SettingsUtils {
    toggleSection(sectionId: string): void {
        const sections = [
            "admin-info-section",
            "change-credentials-section",
            "data-backup-section",
            "preferences-section",
            "security-section",
            "integrations-section",
            "about-section"
        ];

        // Cleanup when leaving about section
        const currentAboutSection = document.getElementById("about-section");
        if (currentAboutSection && !currentAboutSection.classList.contains('hidden') && sectionId !== "about-section") {
            if (typeof (window as any).settingsSystem !== 'undefined' && typeof (window as any).settingsSystem.cleanup === 'function') {
                (window as any).settingsSystem.cleanup();
            } else if (typeof (window as any).cleanupSystemModule === 'function') {
                (window as any).cleanupSystemModule();
            }
        }

        sections.forEach((id) => {
            const sectionElement = document.getElementById(id);
            if (sectionElement) {
                if (id === sectionId) {
                    sectionElement.classList.remove('hidden');
                    sectionElement.classList.add('fade-in');
                    // Focus first input
                    const firstInput = sectionElement.querySelector('input, select, textarea') as HTMLElement;
                    if (firstInput) setTimeout(() => firstInput.focus(), 50);
                } else {
                    sectionElement.classList.add('hidden');
                    sectionElement.classList.remove('fade-in');
                }
            }
        });
    }

    formatChangelogDate(dateStr: string): string {
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (e) {
            return dateStr;
        }
    }

    getChangeTypeIcon(type: string): string {
        const icons: Record<string, string> = {
            'feature': '<i class="fas fa-star text-yellow-500"></i>',
            'improvement': '<i class="fas fa-arrow-up text-blue-500"></i>',
            'bugfix': '<i class="fas fa-bug text-red-500"></i>',
            'security': '<i class="fas fa-shield-alt text-green-500"></i>',
            'breaking': '<i class="fas fa-exclamation-triangle text-orange-500"></i>'
        };
        return icons[type] || '<i class="fas fa-circle text-gray-400"></i>';
    }

    getChangeTypeBadge(type: string): string {
        const badges: Record<string, string> = {
            'feature': 'bg-yellow-100 text-yellow-800',
            'improvement': 'bg-blue-100 text-blue-800',
            'bugfix': 'bg-red-100 text-red-800',
            'security': 'bg-green-100 text-green-800',
            'breaking': 'bg-orange-100 text-orange-800'
        };
        return badges[type] || 'bg-gray-100 text-gray-800';
    }
}

declare var settingsUtils: any;
(window as any).settingsUtils = new SettingsUtils();
