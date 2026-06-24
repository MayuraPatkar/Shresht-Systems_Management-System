// @ts-nocheck
/**
 * globalSearch.ts
 *
 * Global Search bar functionality for the SSMS Dashboard header.
 * Provides debounced search, categorized dropdown results, and keyboard navigation.
 */

(function () {
    'use strict';

    interface SearchResult {
        category: string;
        id: string;
        title: string;
        subtitle: string;
        url: string;
        icon: string;
    }

    // ── Category display config ────────────────────────────────────────────────
    const CATEGORY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
        'Customer':       { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: '#3b82f6' },
        'Supplier':       { bg: 'bg-indigo-50',  text: 'text-indigo-700',  dot: '#6366f1' },
        'Invoice':        { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: '#10b981' },
        'Quotation':      { bg: 'bg-teal-50',    text: 'text-teal-700',    dot: '#14b8a6' },
        'Purchase Order': { bg: 'bg-rose-50',    text: 'text-rose-700',    dot: '#f43f5e' },
        'Purchase Bill':  { bg: 'bg-red-50',     text: 'text-red-700',     dot: '#ef4444' },
        'Service':        { bg: 'bg-cyan-50',    text: 'text-cyan-700',    dot: '#06b6d4' },
        'Stock Item':     { bg: 'bg-orange-50',  text: 'text-orange-700',  dot: '#f97316' },
        'Payment':        { bg: 'bg-green-50',   text: 'text-green-700',   dot: '#22c55e' },
        'Voucher':        { bg: 'bg-purple-50',  text: 'text-purple-700',  dot: '#a855f7' },
    };

    class GlobalSearch {
        private input: HTMLInputElement | null = null;
        private dropdown: HTMLElement | null = null;
        private debounceTimer: ReturnType<typeof setTimeout> | null = null;
        private lastQuery = '';
        private activeIndex = -1;
        private items: HTMLElement[] = [];

        init() {
            this.input = document.getElementById('global-search-input') as HTMLInputElement;
            this.dropdown = document.getElementById('global-search-dropdown');

            if (!this.input || !this.dropdown) return;

            this.input.addEventListener('input', () => this.onInput());
            this.input.addEventListener('keydown', (e: KeyboardEvent) => this.onKeyDown(e));
            this.input.addEventListener('focus', () => {
                if (this.input!.value.trim().length >= 2) {
                    this.showDropdown();
                }
            });

            // Close on outside click
            document.addEventListener('click', (e: MouseEvent) => {
                const wrapper = document.getElementById('global-search-wrapper');
                if (wrapper && !wrapper.contains(e.target as Node)) {
                    this.hideDropdown();
                }
            });
        }

        private onInput() {
            const q = this.input!.value.trim();

            if (this.debounceTimer) clearTimeout(this.debounceTimer);

            if (q.length < 2) {
                this.hideDropdown();
                return;
            }

            if (q === this.lastQuery) {
                this.showDropdown();
                return;
            }

            // Show loading state
            this.renderLoading();
            this.showDropdown();

            this.debounceTimer = setTimeout(() => this.doSearch(q), 300);
        }

        private onKeyDown(e: KeyboardEvent) {
            if (!this.dropdown || this.dropdown.classList.contains('hidden')) return;

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    this.moveActive(1);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.moveActive(-1);
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (this.activeIndex >= 0 && this.items[this.activeIndex]) {
                        (this.items[this.activeIndex] as HTMLAnchorElement).click();
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    this.hideDropdown();
                    this.input!.blur();
                    break;
            }
        }

        private moveActive(delta: number) {
            const count = this.items.length;
            if (count === 0) return;

            this.setActive(-1); // clear current
            this.activeIndex = Math.max(0, Math.min(count - 1, this.activeIndex + delta));
            this.setActive(this.activeIndex);
            this.items[this.activeIndex].scrollIntoView({ block: 'nearest' });
        }

        private setActive(idx: number) {
            this.items.forEach((el, i) => {
                if (i === idx) {
                    el.classList.add('bg-slate-50');
                    el.setAttribute('aria-selected', 'true');
                } else {
                    el.classList.remove('bg-slate-50');
                    el.setAttribute('aria-selected', 'false');
                }
            });
        }

        private async doSearch(q: string) {
            this.lastQuery = q;
            try {
                const res = await fetch(`/search?q=${encodeURIComponent(q)}`);
                if (!res.ok) throw new Error('Request failed');
                const data = await res.json();
                // Guard: if input changed while request was in flight, ignore stale result
                if (this.input!.value.trim() !== q) return;
                this.renderResults(data.results || []);
            } catch (_err) {
                this.renderError();
            }
        }

        // ── Rendering ─────────────────────────────────────────────────────────

        private renderLoading() {
            this.dropdown!.innerHTML = `
                <div class="flex items-center gap-2.5 px-4 py-3.5 text-sm text-slate-400">
                    <i class="fas fa-spinner fa-spin text-blue-400"></i>
                    <span>Searching...</span>
                </div>`;
            this.items = [];
            this.activeIndex = -1;
        }

        private renderError() {
            this.dropdown!.innerHTML = `
                <div class="flex items-center gap-2.5 px-4 py-3.5 text-sm text-red-500">
                    <i class="fas fa-exclamation-circle"></i>
                    <span>Search unavailable. Try again.</span>
                </div>`;
            this.items = [];
        }

        private renderResults(results: SearchResult[]) {
            this.activeIndex = -1;
            this.items = [];

            if (results.length === 0) {
                this.dropdown!.innerHTML = `
                    <div class="flex flex-col items-center gap-2 px-4 py-6 text-sm text-slate-400">
                        <i class="fas fa-search text-xl text-slate-300"></i>
                        <span>No results for <strong class="text-slate-500">"${this.escapeHtml(this.lastQuery)}"</strong></span>
                    </div>`;
                return;
            }

            // Group by category
            const grouped: Record<string, SearchResult[]> = {};
            for (const r of results) {
                if (!grouped[r.category]) grouped[r.category] = [];
                grouped[r.category].push(r);
            }

            let html = '';
            const cats = Object.keys(grouped);
            cats.forEach((cat, ci) => {
                const cfg = CATEGORY_COLORS[cat] || { bg: 'bg-slate-50', text: 'text-slate-600', dot: '#94a3b8' };
                html += `
                    <div class="px-3 pt-${ci === 0 ? '2.5' : '2'} pb-0.5">
                        <span class="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${cfg.text}">
                            <span class="w-1.5 h-1.5 rounded-full inline-block flex-shrink-0" style="background:${cfg.dot}"></span>
                            ${this.escapeHtml(cat)}
                        </span>
                    </div>`;
                for (const r of grouped[cat]) {
                    html += `
                        <a href="${r.url}"
                           data-search-item
                           class="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer transition-colors rounded-lg mx-1 group"
                           role="option" aria-selected="false">
                            <span class="w-7 h-7 rounded-md flex-shrink-0 flex items-center justify-center ${cfg.bg} ${cfg.text} text-xs">
                                <i class="fas ${r.icon}"></i>
                            </span>
                            <div class="flex-1 min-w-0">
                                <div class="text-sm font-semibold text-slate-800 truncate group-hover:text-slate-900">
                                    ${this.highlight(this.escapeHtml(r.title), this.lastQuery)}
                                </div>
                                ${r.subtitle ? `<div class="text-[11px] text-slate-400 truncate mt-0.5">${this.escapeHtml(r.subtitle)}</div>` : ''}
                            </div>
                        </a>`;
                }
                if (ci < cats.length - 1) {
                    html += `<div class="border-t border-slate-100 mx-3 my-1"></div>`;
                }
            });

            this.dropdown!.innerHTML = html;

            // Cache navigable items
            this.items = Array.from(this.dropdown!.querySelectorAll('[data-search-item]')) as HTMLElement[];
        }

        /** Highlights the query substring in text (case-insensitive) */
        private highlight(escaped: string, q: string): string {
            if (!q) return escaped;
            const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            return escaped.replace(new RegExp(`(${escapedQ})`, 'gi'), '<mark class="bg-yellow-100 text-slate-900 rounded px-0.5 font-bold not-italic">$1</mark>');
        }

        private escapeHtml(str: string): string {
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        private showDropdown() {
            this.dropdown!.classList.remove('hidden');
        }

        private hideDropdown() {
            this.dropdown!.classList.add('hidden');
            this.activeIndex = -1;
        }
    }

    // Initialise on DOMContentLoaded
    document.addEventListener('DOMContentLoaded', () => {
        const gs = new GlobalSearch();
        gs.init();
        (window as any).globalSearch = gs;
    });
})();
