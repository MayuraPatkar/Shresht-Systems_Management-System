/**
 * Reusable Custom SVG Charting Engine for Shresht Systems
 */

class ChartRenderer {
    // Tooltip reference
    private static tooltip: HTMLElement | null = null;

    private static getOrCreateTooltip(): HTMLElement {
        if (!this.tooltip) {
            this.tooltip = document.createElement('div');
            this.tooltip.className = 'chart-tooltip hidden';
            this.tooltip.id = 'chart-tooltip-bubble';
            document.body.appendChild(this.tooltip);
        }
        return this.tooltip;
    }

    private static showTooltip(text: string, x: number, y: number) {
        const tooltipEl = this.getOrCreateTooltip();
        tooltipEl.innerHTML = text;
        tooltipEl.classList.remove('hidden');
        tooltipEl.style.left = `${x + 10}px`;
        tooltipEl.style.top = `${y - 15}px`;
    }

    private static hideTooltip() {
        const tooltipEl = this.getOrCreateTooltip();
        tooltipEl.classList.add('hidden');
    }

    private static clearContainer(container: HTMLElement): { width: number; height: number } {
        container.innerHTML = '';
        const rect = container.getBoundingClientRect();
        return {
            width: rect.width || 400,
            height: rect.height || 260
        };
    }

    private static setupResponsive(container: HTMLElement, drawFn: () => void) {
        if ((container as any)._resizeObserver) {
            (container as any)._resizeObserver.disconnect();
        }
        const observer = new ResizeObserver(() => {
            // debounce slightly
            if ((container as any)._resizeTimeout) {
                clearTimeout((container as any)._resizeTimeout);
            }
            (container as any)._resizeTimeout = setTimeout(() => {
                drawFn();
            }, 150);
        });
        observer.observe(container);
        (container as any)._resizeObserver = observer;
    }

    /**
     * Render Area / Line Chart
     */
    static renderLineOrAreaChart(
        containerId: string, 
        data: { label: string; value: number; value2?: number }[], 
        options: { isArea?: boolean; color1?: string; color2?: string; label1?: string; label2?: string; unit?: string } = {}
    ) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const draw = () => {
            const { width, height } = this.clearContainer(container);
            if (data.length === 0) {
                this.renderEmptyState(container);
                return;
            }

            const isArea = options.isArea || false;
            const color1 = options.color1 || '#3b82f6'; // Blue
            const color2 = options.color2 || '#8b5cf6'; // Purple (if second series)
            const unit = options.unit || '₹';

            const padding = { top: 25, right: 20, bottom: 35, left: 55 };
            const chartWidth = width - padding.left - padding.right;
            const chartHeight = height - padding.top - padding.bottom;

            // Find scales
            const maxVal1 = Math.max(...data.map(d => d.value));
            const maxVal2 = options.label2 ? Math.max(...data.map(d => d.value2 || 0)) : 0;
            const maxVal = Math.max(10, maxVal1, maxVal2) * 1.15; // add buffer

            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', '100%');
            svg.setAttribute('height', '100%');
            svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

            // Draw Y-axis gridlines
            const gridLines = 4;
            for (let i = 0; i <= gridLines; i++) {
                const y = padding.top + (chartHeight / gridLines) * i;
                const val = maxVal - (maxVal / gridLines) * i;

                // line
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', `${padding.left}`);
                line.setAttribute('y1', `${y}`);
                line.setAttribute('x2', `${width - padding.right}`);
                line.setAttribute('y2', `${y}`);
                line.setAttribute('stroke', '#f1f5f9');
                line.setAttribute('stroke-width', '1.5');
                if (i < gridLines) line.setAttribute('stroke-dasharray', '4,4');
                svg.appendChild(line);

                // label
                const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                label.setAttribute('x', `${padding.left - 10}`);
                label.setAttribute('y', `${y + 4}`);
                label.setAttribute('text-anchor', 'end');
                label.setAttribute('font-size', '9');
                label.setAttribute('font-weight', '500');
                label.setAttribute('fill', '#94a3b8');
                label.textContent = this.formatShortNumber(val, unit);
                svg.appendChild(label);
            }

            // Draw X-axis labels
            const pointsCount = data.length;
            const xStep = pointsCount > 1 ? chartWidth / (pointsCount - 1) : chartWidth;

            // Generate Path Points
            const pts1: string[] = [];
            const pts2: string[] = [];

            data.forEach((d, idx) => {
                const x = padding.left + idx * xStep;
                const y1 = padding.top + chartHeight - (d.value / maxVal) * chartHeight;
                pts1.push(`${x},${y1}`);

                if (options.label2 && d.value2 !== undefined) {
                    const y2 = padding.top + chartHeight - (d.value2 / maxVal) * chartHeight;
                    pts2.push(`${x},${y2}`);
                }

                // X labels (limit density)
                const labelMod = Math.ceil(pointsCount / 8);
                if (idx % labelMod === 0 || idx === pointsCount - 1) {
                    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                    label.setAttribute('x', `${x}`);
                    label.setAttribute('y', `${height - padding.bottom + 20}`);
                    label.setAttribute('text-anchor', 'middle');
                    label.setAttribute('font-size', '9');
                    label.setAttribute('font-weight', '500');
                    label.setAttribute('fill', '#94a3b8');
                    label.textContent = d.label;
                    svg.appendChild(label);
                }
            });

            // If Area Chart (Series 1 only)
            if (isArea && pts1.length > 0) {
                // Gradient definition
                const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
                const gradId = `areaGrad-${containerId}`;
                const grad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
                grad.setAttribute('id', gradId);
                grad.setAttribute('x1', '0');
                grad.setAttribute('y1', '0');
                grad.setAttribute('x2', '0');
                grad.setAttribute('y2', '1');

                const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
                stop1.setAttribute('offset', '0%');
                stop1.setAttribute('stop-color', color1);
                stop1.setAttribute('stop-opacity', '0.25');

                const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
                stop2.setAttribute('offset', '100%');
                stop2.setAttribute('stop-color', color1);
                stop2.setAttribute('stop-opacity', '0.00');

                grad.appendChild(stop1);
                grad.appendChild(stop2);
                defs.appendChild(grad);
                svg.appendChild(defs);

                const areaPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                const pathData = `M${padding.left},${height - padding.bottom} L${pts1.join(' L')} L${padding.left + chartWidth},${height - padding.bottom} Z`;
                areaPath.setAttribute('d', pathData);
                areaPath.setAttribute('fill', `url(#${gradId})`);
                svg.appendChild(areaPath);
            }

            // Draw Series 1 Line
            if (pts1.length > 0) {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                line.setAttribute('d', `M${pts1.join(' L')}`);
                line.setAttribute('fill', 'none');
                line.setAttribute('stroke', color1);
                line.setAttribute('stroke-width', '2.5');
                line.setAttribute('stroke-linecap', 'round');
                line.setAttribute('stroke-linejoin', 'round');
                svg.appendChild(line);
            }

            // Draw Series 2 Line
            if (options.label2 && pts2.length > 0) {
                const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                line2.setAttribute('d', `M${pts2.join(' L')}`);
                line2.setAttribute('fill', 'none');
                line2.setAttribute('stroke', color2);
                line2.setAttribute('stroke-width', '2.5');
                line2.setAttribute('stroke-linecap', 'round');
                line2.setAttribute('stroke-linejoin', 'round');
                svg.appendChild(line2);
            }

            // Draw Interactive Target Points (hover circles)
            data.forEach((d, idx) => {
                const x = padding.left + idx * xStep;
                const y1 = padding.top + chartHeight - (d.value / maxVal) * chartHeight;

                const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                c.setAttribute('cx', `${x}`);
                c.setAttribute('cy', `${y1}`);
                c.setAttribute('r', '4');
                c.setAttribute('fill', '#ffffff');
                c.setAttribute('stroke', color1);
                c.setAttribute('stroke-width', '2');
                c.style.cursor = 'pointer';
                c.style.transition = 'all 0.1s ease';

                c.addEventListener('mouseenter', (e) => {
                    c.setAttribute('r', '6');
                    c.setAttribute('fill', color1);
                    const tooltipText = `
                        <div class="text-xs font-bold text-slate-400 mb-0.5">${d.label}</div>
                        <div class="flex items-center gap-1.5 mt-1 font-semibold">
                            <span class="inline-block w-2.5 h-2.5 rounded-full" style="background:${color1}"></span>
                            <span>${options.label1 || 'Value'}: ${unit === '₹' ? '₹' + d.value.toLocaleString() : d.value + unit}</span>
                        </div>
                    `;
                    this.showTooltip(tooltipText, e.clientX, e.clientY);
                });

                c.addEventListener('mousemove', (e) => {
                    const tooltipEl = this.getOrCreateTooltip();
                    tooltipEl.style.left = `${e.clientX + 10}px`;
                    tooltipEl.style.top = `${e.clientY - 15}px`;
                });

                c.addEventListener('mouseleave', () => {
                    c.setAttribute('r', '4');
                    c.setAttribute('fill', '#ffffff');
                    this.hideTooltip();
                });

                svg.appendChild(c);

                if (options.label2 && d.value2 !== undefined) {
                    const y2 = padding.top + chartHeight - (d.value2 / maxVal) * chartHeight;
                    const c2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                    c2.setAttribute('cx', `${x}`);
                    c2.setAttribute('cy', `${y2}`);
                    c2.setAttribute('r', '4');
                    c2.setAttribute('fill', '#ffffff');
                    c2.setAttribute('stroke', color2);
                    c2.setAttribute('stroke-width', '2');
                    c2.style.cursor = 'pointer';

                    c2.addEventListener('mouseenter', (e) => {
                        c2.setAttribute('r', '6');
                        c2.setAttribute('fill', color2);
                        const tooltipText = `
                            <div class="text-xs font-bold text-slate-400 mb-0.5">${d.label}</div>
                            <div class="flex items-center gap-1.5 mt-1 font-semibold">
                                <span class="inline-block w-2.5 h-2.5 rounded-full" style="background:${color2}"></span>
                                <span>${options.label2}: ${unit === '₹' ? '₹' + (d.value2 || 0).toLocaleString() : (d.value2 || 0) + unit}</span>
                            </div>
                        `;
                        this.showTooltip(tooltipText, e.clientX, e.clientY);
                    });

                    c2.addEventListener('mousemove', (e) => {
                        const tooltipEl = this.getOrCreateTooltip();
                        tooltipEl.style.left = `${e.clientX + 10}px`;
                        tooltipEl.style.top = `${e.clientY - 15}px`;
                    });

                    c2.addEventListener('mouseleave', () => {
                        c2.setAttribute('r', '4');
                        c2.setAttribute('fill', '#ffffff');
                        this.hideTooltip();
                    });

                    svg.appendChild(c2);
                }
            });

            container.appendChild(svg);
        };

        draw();
        this.setupResponsive(container, draw);
    }

    /**
     * Render Bar Chart (Vertical)
     */
    static renderBarChart(
        containerId: string, 
        data: { name: string; value: number }[], 
        options: { color?: string; unit?: string } = {}
    ) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const draw = () => {
            const { width, height } = this.clearContainer(container);
            if (data.length === 0) {
                this.renderEmptyState(container);
                return;
            }

            const color = options.color || '#3765bc'; // Accent blue
            const unit = options.unit || '₹';

            const padding = { top: 25, right: 20, bottom: 35, left: 55 };
            const chartWidth = width - padding.left - padding.right;
            const chartHeight = height - padding.top - padding.bottom;

            const maxVal = Math.max(10, ...data.map(d => d.value)) * 1.15;

            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', '100%');
            svg.setAttribute('height', '100%');
            svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

            // Y grid
            const gridLines = 4;
            for (let i = 0; i <= gridLines; i++) {
                const y = padding.top + (chartHeight / gridLines) * i;
                const val = maxVal - (maxVal / gridLines) * i;

                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', `${padding.left}`);
                line.setAttribute('y1', `${y}`);
                line.setAttribute('x2', `${width - padding.right}`);
                line.setAttribute('y2', `${y}`);
                line.setAttribute('stroke', '#f1f5f9');
                line.setAttribute('stroke-width', '1.5');
                svg.appendChild(line);

                const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                label.setAttribute('x', `${padding.left - 10}`);
                label.setAttribute('y', `${y + 4}`);
                label.setAttribute('text-anchor', 'end');
                label.setAttribute('font-size', '9');
                label.setAttribute('font-weight', '500');
                label.setAttribute('fill', '#94a3b8');
                label.textContent = this.formatShortNumber(val, unit);
                svg.appendChild(label);
            }

            // Draw Columns
            const barCount = data.length;
            const barWidth = Math.max(10, (chartWidth / barCount) * 0.55);
            const xStep = chartWidth / barCount;

            data.forEach((d, idx) => {
                const colHeight = (d.value / maxVal) * chartHeight;
                const x = padding.left + idx * xStep + (xStep - barWidth) / 2;
                const y = padding.top + chartHeight - colHeight;

                const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                rect.setAttribute('x', `${x}`);
                rect.setAttribute('y', `${y}`);
                rect.setAttribute('width', `${barWidth}`);
                rect.setAttribute('height', `${Math.max(2, colHeight)}`);
                rect.setAttribute('rx', '4');
                rect.setAttribute('fill', color);
                rect.style.transition = 'all 0.15s ease';
                rect.style.cursor = 'pointer';

                rect.addEventListener('mouseenter', (e) => {
                    rect.setAttribute('fill', '#1d4ed8'); // darker hover
                    const tooltipText = `
                        <div class="text-xs font-bold text-slate-400 mb-0.5">${d.name}</div>
                        <div class="mt-1 font-semibold">${unit === '₹' ? '₹' : ''}${d.value.toLocaleString()}</div>
                    `;
                    this.showTooltip(tooltipText, e.clientX, e.clientY);
                });

                rect.addEventListener('mousemove', (e) => {
                    const tooltipEl = this.getOrCreateTooltip();
                    tooltipEl.style.left = `${e.clientX + 10}px`;
                    tooltipEl.style.top = `${e.clientY - 15}px`;
                });

                rect.addEventListener('mouseleave', () => {
                    rect.setAttribute('fill', color);
                    this.hideTooltip();
                });

                svg.appendChild(rect);

                // Label
                const labelText = d.name.length > 12 ? d.name.slice(0, 10) + '..' : d.name;
                const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                label.setAttribute('x', `${x + barWidth / 2}`);
                label.setAttribute('y', `${height - padding.bottom + 20}`);
                label.setAttribute('text-anchor', 'middle');
                label.setAttribute('font-size', '9');
                label.setAttribute('font-weight', '500');
                label.setAttribute('fill', '#94a3b8');
                label.textContent = labelText;
                svg.appendChild(label);
            });

            container.appendChild(svg);
        };

        draw();
        this.setupResponsive(container, draw);
    }

    /**
     * Render Horizontal Bar Chart
     */
    static renderHorizontalBarChart(
        containerId: string, 
        data: { name: string; value: number }[], 
        options: { color?: string; unit?: string } = {}
    ) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const draw = () => {
            const { width, height } = this.clearContainer(container);
            if (data.length === 0) {
                this.renderEmptyState(container);
                return;
            }

            const color = options.color || '#3765bc';
            const unit = options.unit || '₹';

            const padding = { top: 15, right: 40, bottom: 15, left: 100 };
            const chartWidth = width - padding.left - padding.right;
            const chartHeight = height - padding.top - padding.bottom;

            const maxVal = Math.max(10, ...data.map(d => d.value)) * 1.1;

            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', '100%');
            svg.setAttribute('height', '100%');
            svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

            const barCount = data.length;
            const barHeight = Math.max(8, (chartHeight / barCount) * 0.5);
            const yStep = chartHeight / barCount;

            data.forEach((d, idx) => {
                const barWidth = (d.value / maxVal) * chartWidth;
                const x = padding.left;
                const y = padding.top + idx * yStep + (yStep - barHeight) / 2;

                // Name label
                const nameLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                nameLabel.setAttribute('x', `${padding.left - 10}`);
                nameLabel.setAttribute('y', `${y + barHeight / 2 + 3}`);
                nameLabel.setAttribute('text-anchor', 'end');
                nameLabel.setAttribute('font-size', '9');
                nameLabel.setAttribute('font-weight', '600');
                nameLabel.setAttribute('fill', '#475569');
                nameLabel.textContent = d.name.length > 15 ? d.name.slice(0, 13) + '..' : d.name;
                svg.appendChild(nameLabel);

                // Bar
                const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                rect.setAttribute('x', `${x}`);
                rect.setAttribute('y', `${y}`);
                rect.setAttribute('width', `${Math.max(2, barWidth)}`);
                rect.setAttribute('height', `${barHeight}`);
                rect.setAttribute('rx', '3');
                rect.setAttribute('fill', color);
                rect.style.transition = 'all 0.15s ease';
                rect.style.cursor = 'pointer';

                rect.addEventListener('mouseenter', (e) => {
                    rect.setAttribute('fill', '#1d4ed8');
                    const tooltipText = `
                        <div class="text-xs font-bold text-slate-400 mb-0.5">${d.name}</div>
                        <div class="mt-1 font-semibold">${unit === '₹' ? '₹' : ''}${d.value.toLocaleString()}</div>
                    `;
                    this.showTooltip(tooltipText, e.clientX, e.clientY);
                });

                rect.addEventListener('mousemove', (e) => {
                    const tooltipEl = this.getOrCreateTooltip();
                    tooltipEl.style.left = `${e.clientX + 10}px`;
                    tooltipEl.style.top = `${e.clientY - 15}px`;
                });

                rect.addEventListener('mouseleave', () => {
                    rect.setAttribute('fill', color);
                    this.hideTooltip();
                });

                svg.appendChild(rect);

                // Value label on end of bar
                const valLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                valLabel.setAttribute('x', `${x + barWidth + 6}`);
                valLabel.setAttribute('y', `${y + barHeight / 2 + 3}`);
                valLabel.setAttribute('font-size', '9');
                valLabel.setAttribute('font-weight', '600');
                valLabel.setAttribute('fill', '#64748b');
                valLabel.textContent = this.formatShortNumber(d.value, unit);
                svg.appendChild(valLabel);
            });

            container.appendChild(svg);
        };

        draw();
        this.setupResponsive(container, draw);
    }

    /**
     * Render Donut or Pie Chart
     */
    static renderPieOrDonutChart(
        containerId: string, 
        data: { name: string; value: number }[], 
        options: { isDonut?: boolean; unit?: string } = {}
    ) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const draw = () => {
            const { width, height } = this.clearContainer(container);
            if (data.length === 0) {
                this.renderEmptyState(container);
                return;
            }

            const isDonut = options.isDonut !== false;
            const unit = options.unit || '₹';

            const palette = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#64748b', '#06b6d4'];

            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', '100%');
            svg.setAttribute('height', '100%');
            svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

            const cx = width * 0.35;
            const cy = height * 0.5;
            const r = Math.min(width * 0.28, height * 0.38);

            const total = data.reduce((sum, d) => sum + d.value, 0);
            let startAngle = 0;

            data.forEach((d, idx) => {
                if (d.value <= 0) return;
                const percentage = d.value / (total || 1);
                const angle = percentage * 360;

                const endAngle = startAngle + angle;
                const color = palette[idx % palette.length];

                // Arc path calculations
                const startRad = (startAngle - 90) * Math.PI / 180;
                const endRad = (endAngle - 90) * Math.PI / 180;

                const x1 = cx + r * Math.cos(startRad);
                const y1 = cy + r * Math.sin(startRad);
                const x2 = cx + r * Math.cos(endRad);
                const y2 = cy + r * Math.sin(endRad);

                const largeArcFlag = angle > 180 ? 1 : 0;

                let dPath = '';
                if (isDonut) {
                    const innerR = r * 0.65;
                    const ix1 = cx + innerR * Math.cos(startRad);
                    const iy1 = cy + innerR * Math.sin(startRad);
                    const ix2 = cx + innerR * Math.cos(endRad);
                    const iy2 = cy + innerR * Math.sin(endRad);

                    dPath = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${ix1} ${iy1} Z`;
                } else {
                    dPath = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
                }

                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', dPath);
                path.setAttribute('fill', color);
                path.setAttribute('stroke', '#ffffff');
                path.setAttribute('stroke-width', '1.5');
                path.style.transition = 'all 0.15s ease';
                path.style.cursor = 'pointer';

                path.addEventListener('mouseenter', (e) => {
                    path.setAttribute('opacity', '0.85');
                    const tooltipText = `
                        <div class="text-xs font-bold text-slate-400 mb-0.5">${d.name}</div>
                        <div class="mt-1 font-semibold">${unit === '₹' ? '₹' : ''}${d.value.toLocaleString()} (${(percentage * 100).toFixed(1)}%)</div>
                    `;
                    this.showTooltip(tooltipText, e.clientX, e.clientY);
                });

                path.addEventListener('mousemove', (e) => {
                    const tooltipEl = this.getOrCreateTooltip();
                    tooltipEl.style.left = `${e.clientX + 10}px`;
                    tooltipEl.style.top = `${e.clientY - 15}px`;
                });

                path.addEventListener('mouseleave', () => {
                    path.setAttribute('opacity', '1.0');
                    this.hideTooltip();
                });

                svg.appendChild(path);
                startAngle = endAngle;
            });

            // Draw Legends on the Right
            const legendX = cx + r + 30;
            const legendYStart = height * 0.15;
            const legendStep = 22;

            data.forEach((d, idx) => {
                const color = palette[idx % palette.length];
                const y = legendYStart + idx * legendStep;

                // Color box
                const box = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                box.setAttribute('x', `${legendX}`);
                box.setAttribute('y', `${y - 8}`);
                box.setAttribute('width', '10');
                box.setAttribute('height', '10');
                box.setAttribute('rx', '2');
                box.setAttribute('fill', color);
                svg.appendChild(box);

                // Label
                const pct = total > 0 ? ((d.value / total) * 100).toFixed(0) : '0';
                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.setAttribute('x', `${legendX + 16}`);
                text.setAttribute('y', `${y + 1}`);
                text.setAttribute('font-size', '9.5');
                text.setAttribute('font-weight', '500');
                text.setAttribute('fill', '#475569');
                text.textContent = `${d.name.length > 12 ? d.name.slice(0, 10) + '..' : d.name} (${pct}%)`;
                svg.appendChild(text);
            });

            container.appendChild(svg);
        };

        draw();
        this.setupResponsive(container, draw);
    }

    /**
     * Render Funnel Conversion Chart
     */
    static renderFunnelChart(containerId: string, data: { stage: string; value: number }[]) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const draw = () => {
            const { width, height } = this.clearContainer(container);
            if (data.length === 0) {
                this.renderEmptyState(container);
                return;
            }

            const padding = { top: 20, right: 30, bottom: 20, left: 30 };
            const chartWidth = width - padding.left - padding.right;
            const chartHeight = height - padding.top - padding.bottom;

            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', '100%');
            svg.setAttribute('height', '100%');
            svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

            const maxVal = Math.max(1, data[0].value);
            const blockCount = data.length;
            const blockHeight = chartHeight / blockCount;
            const gap = 6;

            const palette = ['#3b82f6', '#4f46e5', '#6366f1', '#8b5cf6'];

            data.forEach((d, idx) => {
                const nextVal = idx < blockCount - 1 ? data[idx + 1].value : d.value;

                // Width percentages based on maximum top level
                const topW = (d.value / maxVal) * chartWidth;
                const botW = (nextVal / maxVal) * chartWidth;

                const xTop1 = padding.left + (chartWidth - topW) / 2;
                const xTop2 = xTop1 + topW;

                const yTop = padding.top + idx * blockHeight;
                const yBot = yTop + blockHeight - gap;

                const xBot1 = padding.left + (chartWidth - botW) / 2;
                const xBot2 = xBot1 + botW;

                // Build polygon points: Top-Left -> Top-Right -> Bottom-Right -> Bottom-Left
                const pts = `${xTop1},${yTop} ${xTop2},${yTop} ${xBot2},${yBot} ${xBot1},${yBot}`;
                const color = palette[idx % palette.length];

                const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                poly.setAttribute('points', pts);
                poly.setAttribute('fill', color);
                poly.style.transition = 'all 0.15s ease';
                poly.style.cursor = 'pointer';

                poly.addEventListener('mouseenter', (e) => {
                    poly.setAttribute('opacity', '0.85');
                    const conversionFromTop = idx > 0 && data[0].value > 0 ? `(${(d.value / data[0].value * 100).toFixed(1)}% of total)` : '';
                    const tooltipText = `
                        <div class="text-xs font-bold text-slate-400 mb-0.5">${d.stage}</div>
                        <div class="mt-1 font-semibold">${d.value} Records ${conversionFromTop}</div>
                    `;
                    this.showTooltip(tooltipText, e.clientX, e.clientY);
                });

                poly.addEventListener('mousemove', (e) => {
                    const tooltipEl = this.getOrCreateTooltip();
                    tooltipEl.style.left = `${e.clientX + 10}px`;
                    tooltipEl.style.top = `${e.clientY - 15}px`;
                });

                poly.addEventListener('mouseleave', () => {
                    poly.setAttribute('opacity', '1.0');
                    this.hideTooltip();
                });

                svg.appendChild(poly);

                // Add text label overlay inside polygon
                const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                label.setAttribute('x', `${width / 2}`);
                label.setAttribute('y', `${yTop + blockHeight / 2 - 2}`);
                label.setAttribute('text-anchor', 'middle');
                label.setAttribute('fill', '#ffffff');
                label.setAttribute('font-size', '9.5');
                label.setAttribute('font-weight', 'bold');
                label.textContent = `${d.stage}: ${d.value}`;
                svg.appendChild(label);
            });

            container.appendChild(svg);
        };

        draw();
        this.setupResponsive(container, draw);
    }

    /**
     * Render Heatmap Grid
     */
    static renderHeatmap(containerId: string, matrix: number[][]) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const { width, height } = this.clearContainer(container);

        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const padding = { top: 20, right: 15, bottom: 25, left: 35 };

        const gridWidth = width - padding.left - padding.right;
        const gridHeight = height - padding.top - padding.bottom;

        const cellW = gridWidth / 24;
        const cellH = gridHeight / 7;

        // Find max element in matrix
        let maxVal = 1;
        for (let r = 0; r < 7; r++) {
            for (let c = 0; c < 24; c++) {
                if (matrix[r][c] > maxVal) maxVal = matrix[r][c];
            }
        }

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

        // Draw cells
        for (let r = 0; r < 7; r++) {
            // Label for Day of Week
            const dayLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            dayLabel.setAttribute('x', `${padding.left - 8}`);
            dayLabel.setAttribute('y', `${padding.top + r * cellH + cellH / 2 + 3}`);
            dayLabel.setAttribute('text-anchor', 'end');
            dayLabel.setAttribute('font-size', '8.5');
            dayLabel.setAttribute('font-weight', 'bold');
            dayLabel.setAttribute('fill', '#64748b');
            dayLabel.textContent = days[r];
            svg.appendChild(dayLabel);

            for (let c = 0; c < 24; c++) {
                const val = matrix[r][c];
                const x = padding.left + c * cellW;
                const y = padding.top + r * cellH;

                // Color scale
                let color = '#f8fafc'; // zero
                if (val > 0) {
                    const ratio = val / maxVal;
                    // HSL interpolation between light blue and primary blue
                    // H: 220, S: 85%, L: 95% -> 40%
                    const lightness = 96 - (ratio * 55);
                    color = `hsl(220, 85%, ${lightness}%)`;
                }

                const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                rect.setAttribute('x', `${x + 1}`);
                rect.setAttribute('y', `${y + 1}`);
                rect.setAttribute('width', `${cellW - 2}`);
                rect.setAttribute('height', `${cellH - 2}`);
                rect.setAttribute('fill', color);
                rect.setAttribute('rx', '1.5');
                rect.style.cursor = 'pointer';
                rect.className.baseVal = 'heatmap-cell';

                rect.addEventListener('mouseenter', (e) => {
                    const tooltipText = `
                        <div class="text-xs font-bold text-slate-400 mb-0.5">${days[r]} at ${c}:00</div>
                        <div class="mt-1 font-semibold">Sales: ₹${val.toLocaleString()}</div>
                    `;
                    this.showTooltip(tooltipText, e.clientX, e.clientY);
                });

                rect.addEventListener('mousemove', (e) => {
                    const tooltipEl = this.getOrCreateTooltip();
                    tooltipEl.style.left = `${e.clientX + 10}px`;
                    tooltipEl.style.top = `${e.clientY - 15}px`;
                });

                rect.addEventListener('mouseleave', () => {
                    this.hideTooltip();
                });

                svg.appendChild(rect);
            }
        }

        // Draw Hour axis labels
        for (let c = 0; c < 24; c += 2) {
            const x = padding.left + c * cellW + cellW / 2;
            const hourLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            hourLabel.setAttribute('x', `${x}`);
            hourLabel.setAttribute('y', `${height - padding.bottom + 14}`);
            hourLabel.setAttribute('text-anchor', 'middle');
            hourLabel.setAttribute('font-size', '8');
            hourLabel.setAttribute('font-weight', '500');
            hourLabel.setAttribute('fill', '#94a3b8');
            hourLabel.textContent = `${c}:00`;
            svg.appendChild(hourLabel);
        }

        container.appendChild(svg);
    }

    /**
     * Render Forecast Chart
     */
    static renderForecastChart(
        containerId: string, 
        history: { month: string; value: number }[], 
        predicted: { month: string; value: number },
        options: { color?: string; unit?: string } = {}
    ) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const draw = () => {
            const { width, height } = this.clearContainer(container);
            if (history.length === 0) {
                this.renderEmptyState(container);
                return;
            }

            const color = options.color || '#3b82f6';
            const unit = options.unit || '₹';

            const padding = { top: 25, right: 35, bottom: 35, left: 60 };
            const chartWidth = width - padding.left - padding.right;
            const chartHeight = height - padding.top - padding.bottom;

            const allPoints = [...history, predicted];
            const maxVal = Math.max(10, ...allPoints.map(p => p.value)) * 1.15;

            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', '100%');
            svg.setAttribute('height', '100%');
            svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

            // Y grid
            const gridLines = 4;
            for (let i = 0; i <= gridLines; i++) {
                const y = padding.top + (chartHeight / gridLines) * i;
                const val = maxVal - (maxVal / gridLines) * i;

                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', `${padding.left}`);
                line.setAttribute('y1', `${y}`);
                line.setAttribute('x2', `${width - padding.right}`);
                line.setAttribute('y2', `${y}`);
                line.setAttribute('stroke', '#f1f5f9');
                line.setAttribute('stroke-width', '1.5');
                svg.appendChild(line);

                const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                label.setAttribute('x', `${padding.left - 10}`);
                label.setAttribute('y', `${y + 4}`);
                label.setAttribute('text-anchor', 'end');
                label.setAttribute('font-size', '9');
                label.setAttribute('font-weight', '500');
                label.setAttribute('fill', '#94a3b8');
                label.textContent = this.formatShortNumber(val, unit);
                svg.appendChild(label);
            }

            // Generate Path Points
            const xStep = chartWidth / (allPoints.length - 1);
            const pts: string[] = [];

            allPoints.forEach((p, idx) => {
                const x = padding.left + idx * xStep;
                const y = padding.top + chartHeight - (p.value / maxVal) * chartHeight;
                pts.push(`${x},${y}`);

                // X label
                const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                label.setAttribute('x', `${x}`);
                label.setAttribute('y', `${height - padding.bottom + 20}`);
                label.setAttribute('text-anchor', 'middle');
                label.setAttribute('font-size', '9');
                label.setAttribute('font-weight', idx === allPoints.length - 1 ? 'bold' : '500');
                label.setAttribute('fill', idx === allPoints.length - 1 ? '#3b82f6' : '#94a3b8');
                label.textContent = p.month;
                svg.appendChild(label);
            });

            // Draw historical solid line
            const histPts = pts.slice(0, history.length);
            if (histPts.length > 0) {
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', `M${histPts.join(' L')}`);
                path.setAttribute('fill', 'none');
                path.setAttribute('stroke', color);
                path.setAttribute('stroke-width', '2.5');
                svg.appendChild(path);
            }

            // Draw predicted dashed line
            const predPts = pts.slice(history.length - 1);
            if (predPts.length > 0) {
                const pathPred = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                pathPred.setAttribute('d', `M${predPts.join(' L')}`);
                pathPred.setAttribute('fill', 'none');
                pathPred.setAttribute('stroke', '#e11d48'); // Rose color for forecast
                pathPred.setAttribute('stroke-width', '2.5');
                pathPred.setAttribute('stroke-dasharray', '5,5');
                svg.appendChild(pathPred);
            }

            // Draw circles for historical points
            history.forEach((h, idx) => {
                const pt = histPts[idx].split(',');
                const cx = parseFloat(pt[0]);
                const cy = parseFloat(pt[1]);

                const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                c.setAttribute('cx', `${cx}`);
                c.setAttribute('cy', `${cy}`);
                c.setAttribute('r', '4');
                c.setAttribute('fill', '#ffffff');
                c.setAttribute('stroke', color);
                c.setAttribute('stroke-width', '2');
                c.style.cursor = 'pointer';

                c.addEventListener('mouseenter', (e) => {
                    c.setAttribute('r', '6');
                    c.setAttribute('fill', color);
                    const tooltipText = `
                        <div class="text-xs font-bold text-slate-400 mb-0.5">${h.month} (Actual)</div>
                        <div class="mt-1 font-semibold">Revenue: ₹${h.value.toLocaleString()}</div>
                    `;
                    this.showTooltip(tooltipText, e.clientX, e.clientY);
                });

                c.addEventListener('mousemove', (e) => {
                    const tooltipEl = this.getOrCreateTooltip();
                    tooltipEl.style.left = `${e.clientX + 10}px`;
                    tooltipEl.style.top = `${e.clientY - 15}px`;
                });

                c.addEventListener('mouseleave', () => {
                    c.setAttribute('r', '4');
                    c.setAttribute('fill', '#ffffff');
                    this.hideTooltip();
                });

                svg.appendChild(c);
            });

            // Draw forecasted circle
            if (pts.length > 0) {
                const pt = pts[pts.length - 1].split(',');
                const cx = parseFloat(pt[0]);
                const cy = parseFloat(pt[1]);

                const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                c.setAttribute('cx', `${cx}`);
                c.setAttribute('cy', `${cy}`);
                c.setAttribute('r', '5');
                c.setAttribute('fill', '#ffffff');
                c.setAttribute('stroke', '#e11d48');
                c.setAttribute('stroke-width', '2.5');
                c.style.cursor = 'pointer';

                c.addEventListener('mouseenter', (e) => {
                    c.setAttribute('r', '7');
                    c.setAttribute('fill', '#e11d48');
                    const tooltipText = `
                        <div class="text-xs font-bold text-slate-400 mb-0.5">${predicted.month} (Forecasted)</div>
                        <div class="mt-1 font-semibold text-rose-500 font-bold">Projected: ₹${predicted.value.toLocaleString()}</div>
                    `;
                    this.showTooltip(tooltipText, e.clientX, e.clientY);
                });

                c.addEventListener('mousemove', (e) => {
                    const tooltipEl = this.getOrCreateTooltip();
                    tooltipEl.style.left = `${e.clientX + 10}px`;
                    tooltipEl.style.top = `${e.clientY - 15}px`;
                });

                c.addEventListener('mouseleave', () => {
                    c.setAttribute('r', '5');
                    c.setAttribute('fill', '#ffffff');
                    this.hideTooltip();
                });

                svg.appendChild(c);
            }

            container.appendChild(svg);
        };

        draw();
        this.setupResponsive(container, draw);
    }

    private static renderEmptyState(container: HTMLElement) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full w-full py-6 text-center text-slate-400 space-y-2">
                <i class="fas fa-chart-pie text-2xl text-slate-300"></i>
                <span class="text-xs font-medium">Insufficient data for chart</span>
            </div>
        `;
    }

    private static formatShortNumber(val: number, unit: string): string {
        if (val === 0) return `${unit}0`;
        const prefix = unit === '₹' ? '₹' : '';
        const suffix = unit !== '₹' ? unit : '';
        
        if (Math.abs(val) >= 10000000) {
            return `${prefix}${(val / 10000000).toFixed(1)}Cr${suffix}`;
        }
        if (Math.abs(val) >= 100000) {
            return `${prefix}${(val / 100000).toFixed(1)}L${suffix}`;
        }
        if (Math.abs(val) >= 1000) {
            return `${prefix}${(val / 1000).toFixed(0)}k${suffix}`;
        }
        return `${prefix}${val.toFixed(0)}${suffix}`;
    }
}

declare var chartRenderer: any;
(window as any).chartRenderer = ChartRenderer;
