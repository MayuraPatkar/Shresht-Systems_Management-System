document.getElementById('logo').addEventListener('click', () => {
    window.location = '/dashboard';
})

let invoiceNumber = '';

function print() {
    const projectName = document.getElementById("projectName").value;
    invoiceNumber = document.getElementById("invoiceNumber").value;
    const poNumber = document.getElementById("poNumber").value;
    const poDate = document.getElementById("poDate").value;
    const dcNumber = document.getElementById("dcNumber").value;
    const dcDate = document.getElementById("dcDate").value;
    const transportMode = document.getElementById("transportMode").value;
    const vehicleNumber = document.getElementById("vehicleNumber").value;
    const placeSupply = document.getElementById("placeSupply").value;
    const ewayBillNumber = document.getElementById("ewayBillNumber").value;
    const buyerName = document.getElementById("buyerName").value;
    const buyerAddress = document.getElementById("buyerAddress").value;
    const buyerPhone = document.getElementById("buyerPhone").value;

    const itemsTable = document.getElementById("items-table").getElementsByTagName("tbody")[0];
    const totalAmount = document.getElementById("totalAmount").value;
    const cgstTotal = document.getElementById("cgstTotal").value;
    const sgstTotal = document.getElementById("sgstTotal").value;
    const roundOff = document.getElementById("roundOff").value;
    const invoiceTotal = document.getElementById("invoiceTotal").value;

    let itemsHTML = "";
    for (let i = 0; i < itemsTable.rows.length; i++) {
        const row = itemsTable.rows[i];
        itemsHTML += `<tr>
            <td>${row.cells[0].querySelector("input").value}</td>
            <td>${row.cells[1].querySelector("input").value}</td>
            <td>${row.cells[2].querySelector("input").value}</td>
            <td>${row.cells[3].querySelector("input").value}</td>
            <td>${row.cells[4].querySelector("input").value}</td>
            <td>${row.cells[5].querySelector("input").value}</td>
            <td>${row.cells[6].querySelector("input").value}</td>
            <td>${row.cells[7].querySelector("input").value}</td>
            <td>${row.cells[8].querySelector("input").value}</td>
            <td>${row.cells[9].querySelector("input").value}</td>
            <td>${row.cells[10].querySelector("input").value}</td>
        </tr>`;
    }

    previewContent = `
    <div class="invoice-container">
    <div class="header">
        <div class="logo">
    <img src="" alt="Shresht Logo">        </div>
        <div class="company-details">
            <h1>SHRESHT SYSTEMS</h1>
            <p>3-125-13, Harshitha, Udupi Ontibettu, Hiradka - 576113</p>
            <p>Ph: 7204657707 / 9901730305 | GSTIN: 29AGCPN4093N1ZS</p>
            <p>Email: shreshtsystems@gmail.com | Website: www.shreshtsystems.com</p>
        </div>
    </div>
    <hr>
    <div class="info-section">
        <table>
            <tr>
                <td>Invoice No: ${invoiceNumber}</td>
                <td>Project: ${projectName}</td>
                <td>P.O No: ${poNumber}</td>
            </tr>
            <tr>
                <td>P.O Date: ${poDate}</td>
                <td>D.C No: ${dcNumber}</td>
                <td>D.C Date: ${dcDate}</td>
            </tr>
        </table>
    </div>
    <hr>
    <div class="buyer-details">
        <table>
            <tr>
                <td>Buyer: ${buyerName}</td>
                <td>Address: ${buyerAddress}</td>
                <td>Phone: ${buyerPhone}</td>
            </tr>
            <tr>
                <td>Transportation: ${transportMode}</td>
                <td>Vehicle No: ${vehicleNumber}</td>
                <td>Place Supply: ${placeSupply}</td>
            </tr>
            <tr>
                <td colspan="3">E-Way Bill: ${ewayBillNumber}</td>
            </tr>
        </table>
    </div>
    <hr>
    <table class="items-table" border="1">
        <thead>
            <tr>
                <th>Description</th>
                <th>HSN/SAC</th>
                <th>Qty</th>
                <th>UOM</th>
                <th>Rate</th>
                <th>Taxable Value</th>
                <th>CGST (%)</th>
                <th>CGST (₹)</th>
                <th>SGST (%)</th>
                <th>SGST (₹)</th>
                <th>Total Price (₹)</th>
            </tr>
        </thead>
        <tbody>
            ${itemsHTML}
        </tbody>
    </table>
    <hr>
    <div class="totals">
        <p>Total: ₹${totalAmount}</p>
        <p>CGST Total: ₹${cgstTotal}</p>
        <p>SGST Total: ₹${sgstTotal}</p>
        <p>Round Off: ₹${roundOff}</p>
        <h3>Invoice Total: ₹${invoiceTotal}</h3>
    </div>
    <hr>
    <div class="bank-details">
        <p><strong>Bank Name:</strong> canara Bank</p>
        <p><strong>Branch Name:</strong> ShanthiNagar Manipal</p>
        <p><strong>Account No:</strong> xxxxxxxxxxx</p>
        <p><strong>IFSC Code:</strong> yyyyyyyy</p>
    </div>
    <hr>
    <div class="declaration">
        <p>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</p>
    </div>
    <div class="signature">
        <p>For SHRESHT SYSTEMS</p>
        <div class="signature-space"></div>
        <p><strong>Authorized Signatory</strong></p>
    </div>
    <footer>
        <p>This is a computer-generated invoice.</p>
    </footer>
</div>
    `;

}

function edit() {
    window.location.href = `/project/invoice/edit/${invoiceNumber}`;
}