/**
 * Document Builder
 * Handles document assembly, pagination, and calculation logic
 */

/**
 * Calculation Engine for document totals
 */
class CalculationEngine {
    constructor(items = [], nonItems = []) {
        this.items = items;
        this.nonItems = nonItems;
        this.hasTax = this.checkIfHasTax();
    }

    /**
     * Check if any items have tax rate
     * @returns {boolean}
     */
    checkIfHasTax() {
        const itemsHaveTax = this.items.some(item => parseFloat(item.rate || 0) > 0);
        const nonItemsHaveTax = this.nonItems.some(item => parseFloat(item.rate || 0) > 0);
        return itemsHaveTax || nonItemsHaveTax;
    }

    /**
     * Calculate item totals and generate HTML
     * @returns {Object} Calculation results
     */
    calculate() {
        let totalPrice = 0;
        let totalCGST = 0;
        let totalSGST = 0;
        let totalTaxableValue = 0;
        let sno = 0;
        const renderableItems = [];

        // Process regular items
        this.items.forEach(item => {
            const description = item.description || "-";
            const hsnSac = item.HSN_SAC || "-";
            const qty = parseFloat(item.quantity || 0);
            const unitPrice = parseFloat(item.unit_price || 0);
            const rate = parseFloat(item.rate || 0);

            const taxableValue = qty * unitPrice;
            totalTaxableValue += taxableValue;

            let itemHTML = "";
            let rowTotal = taxableValue;

            if (this.hasTax && rate > 0) {
                const cgstPercent = rate / 2;
                const sgstPercent = rate / 2;
                const cgstValue = (taxableValue * cgstPercent) / 100;
                const sgstValue = (taxableValue * sgstPercent) / 100;
                rowTotal = taxableValue + cgstValue + sgstValue;

                totalCGST += cgstValue;
                totalSGST += sgstValue;

                itemHTML = `<tr>
                    <td>${++sno}</td>
                    <td>${description}</td>
                    <td>${hsnSac}</td>
                    <td>${qty}</td>
                    <td>${formatIndian(unitPrice, 2)}</td>
                    <td>${formatIndian(taxableValue, 2)}</td>
                    <td>${rate.toFixed(2)}</td>
                    <td>${formatIndian(rowTotal, 2)}</td>
                </tr>`;
            } else {
                itemHTML = `<tr>
                    <td>${++sno}</td>
                    <td>${description}</td>
                    <td>${hsnSac}</td>
                    <td>${qty}</td>
                    <td>${formatIndian(unitPrice, 2)}</td>
                    <td>${formatIndian(rowTotal, 2)}</td>
                </tr>`;
            }

            totalPrice += rowTotal;
            const CHARS_PER_LINE = 60;
            const rowCount = Math.ceil(description.length / CHARS_PER_LINE) || 1;
            renderableItems.push({ html: itemHTML, rowCount });
        });

        // Process non-items
        this.nonItems.forEach(item => {
            const description = item.description || "-";
            const price = parseFloat(item.price || 0);
            const rate = parseFloat(item.rate || 0);

            totalTaxableValue += price;
            let rowTotal = price;

            if (this.hasTax && rate > 0) {
                const cgstPercent = rate / 2;
                const sgstPercent = rate / 2;
                const cgstValue = (price * cgstPercent) / 100;
                const sgstValue = (price * sgstPercent) / 100;

                totalCGST += cgstValue;
                totalSGST += sgstValue;
                rowTotal += cgstValue + sgstValue;
            }

            totalPrice += rowTotal;

            const itemHTML = `<tr>
                <td>${++sno}</td>
                <td>${description}</td>
                <td>-</td>
                <td>-</td>
                ${this.hasTax ? `<td>-</td><td>-</td>` : ""}
                <td>${rate || '-'}</td>
                <td>${formatIndian(rowTotal, 2)}</td>
            </tr>`;

            const CHARS_PER_LINE = 60;
            const rowCount = Math.ceil(description.length / CHARS_PER_LINE) || 1;
            renderableItems.push({ html: itemHTML, rowCount });
        });

        const grandTotal = totalPrice;
        const roundOff = Math.round(grandTotal) - grandTotal;
        const finalTotal = totalPrice + roundOff;

        return {
            renderableItems,
            totals: {
                taxableValue: totalTaxableValue,
                cgst: totalCGST,
                sgst: totalSGST,
                total: finalTotal,
                totalTax: totalCGST + totalSGST
            },
            hasTax: this.hasTax,
            itemCount: sno
        };
    }

    /**
     * Calculate simple totals (for waybill, etc.)
     * @returns {Object} Simple calculation results
     */
    calculateSimple() {
        let itemsHTML = "";
        let sno = 0;

        this.items.forEach(item => {
            const description = item.description || "-";
            const hsnSac = item.HSN_SAC || "-";
            const qty = parseFloat(item.quantity || 0);
            const unitPrice = parseFloat(item.unit_price || 0);
            const rate = parseFloat(item.rate || 0);
            const total = (qty * unitPrice).toFixed(2);

            itemsHTML += `<tr>
                <td>${++sno}</td>
                <td>${description}</td>
                <td>${hsnSac}</td>
                <td>${qty}</td>
                <td>${unitPrice}</td>
                <td>${rate}</td>
                <td>${total}</td>
            </tr>`;
        });

        return { itemsHTML, itemCount: sno };
    }
}

/**
 * Pagination Manager for multi-page documents
 */
class PaginationManager {
    constructor(itemsPerPage = 15, summaryRowCount = 8) {
        this.itemsPerPage = itemsPerPage;
        this.summaryRowCount = summaryRowCount;
    }

    /**
     * Split renderable items into pages
     * @param {Array} renderableItems - Array of {html, rowCount} objects
     * @returns {Array} Array of page HTML strings
     */
    paginate(renderableItems) {
        const pages = [];
        let currentPageHTML = '';
        let currentPageRowCount = 0;

        renderableItems.forEach((item, index) => {
            const isLastItem = index === renderableItems.length - 1;
            const itemSpace = item.rowCount;
            const requiredSpaceForLastItem = itemSpace + this.summaryRowCount;

            // Check if we need a new page
            if (currentPageRowCount > 0 &&
                ((!isLastItem && currentPageRowCount + itemSpace > this.itemsPerPage) ||
                 (isLastItem && currentPageRowCount + requiredSpaceForLastItem > this.itemsPerPage))) {
                pages.push(currentPageHTML);
                currentPageHTML = '';
                currentPageRowCount = 0;
            }

            currentPageHTML += item.html;
            currentPageRowCount += itemSpace;
        });

        // Add the last page if it has content
        if (currentPageHTML !== '') {
            pages.push(currentPageHTML);
        }

        return pages;
    }
}

/**
 * Document Builder - Assembles complete documents
 */
class DocumentBuilder {
    constructor(type = 'generic') {
        this.type = type;
        this.sections = [];
    }

    /**
     * Add a section to the document
     * @param {string} html - Section HTML
     */
    addSection(html) {
        this.sections.push(html);
        return this; // Allow chaining
    }

    /**
     * Build and return complete document HTML
     * @returns {string} Complete document HTML
     */
    build() {
        return this.sections.join('\n');
    }

    /**
     * Wrap content in document container
     * @param {string} content - Content HTML
     * @returns {string} Wrapped HTML
     */
    wrapInContainer(content) {
        return `<div class="preview-container doc-quotation">
    ${content}
</div>`;
    }

    /**
     * Build paginated document
     * @param {Object} options - Build options
     * @returns {string} Complete paginated document HTML
     */
    buildPaginated(options) {
        const {
            documentId,
            documentType = 'Document',
            headerData = {},
            itemPages = [],
            summaryHTML = '',
            footerMessage = null
        } = options;

        const pages = itemPages.map((pageHTML, index) => {
            const isLastPage = index === itemPages.length - 1;
            
            let sections = [];
            sections.push(SectionRenderers.renderHeader());
            sections.push(SectionRenderers.renderTitle(documentType, documentId));
            
            // Add header data section only on first page
            if (index === 0 && headerData.buyerInfo) {
                sections.push(`
                <div class="third-section">
                    ${headerData.buyerInfo}
                    ${headerData.infoSection || ''}
                </div>`);
            }

            // Add items table
            sections.push(SectionRenderers.renderItemsTable(pageHTML, null, headerData.hasTax));

            // Add continuation text if not last page
            if (!isLastPage) {
                sections.push(SectionRenderers.renderContinuation());
            }

            // Add summary section on last page
            if (isLastPage && summaryHTML) {
                sections.push(summaryHTML);
            }

            // Add footer
            sections.push(SectionRenderers.renderFooter(footerMessage));

            return this.wrapInContainer(sections.join('\n'));
        }).join('\n');

        return pages;
    }
}

/**
 * Helper function to build a simple single-page document
 * @param {Object} options - Document options
 * @returns {string} Document HTML
 */
function buildSimpleDocument(options) {
    const {
        documentId,
        documentType,
        buyerInfo,
        infoSection,
        itemsHTML,
        itemColumns = null,
        footerMessage = null,
        additionalSections = []
    } = options;

    const builder = new DocumentBuilder(documentType.toLowerCase());
    
    builder.addSection(SectionRenderers.renderHeader());
    builder.addSection(SectionRenderers.renderTitle(documentType, documentId));
    
    if (buyerInfo || infoSection) {
        builder.addSection(`
        <div class="third-section">
            ${buyerInfo || ''}
            ${infoSection || ''}
        </div>`);
    }
    
    builder.addSection(SectionRenderers.renderItemsTable(itemsHTML, itemColumns));
    
    // Add any additional sections
    additionalSections.forEach(section => builder.addSection(section));
    
    builder.addSection(SectionRenderers.renderSignatory());
    builder.addSection(SectionRenderers.renderFooter(footerMessage));
    
    return builder.wrapInContainer(builder.build());
}

// Export classes and functions globally
if (typeof window !== 'undefined') {
    window.CalculationEngine = CalculationEngine;
    window.PaginationManager = PaginationManager;
    window.DocumentBuilder = DocumentBuilder;
    window.buildSimpleDocument = buildSimpleDocument;
}
