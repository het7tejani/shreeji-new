
import { jsPDF } from "jspdf";
import "jspdf-autotable";

export const generateInvoicePDF = (billData) => {
    const doc = new jsPDF();
    
    const title = "Spice Manager Invoice";
    const shopInfo = "Best Quality Spices";
    
    // Header
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(shopInfo, 14, 30);
    
    // Customer Details
    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.text(`Customer: ${billData.customerName || 'N/A'}`, 14, 45);
    doc.text(`Mobile: ${billData.customerMobile || 'N/A'}`, 14, 52);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 150, 45);
    
    // Table
    const tableColumn = ["Item", "Qty (kg)", "Rate (INR)", "Total (INR)"];
    const tableRows = [];
    
    billData.items.forEach(item => {
        const itemData = [
            item.name || item.spiceName,
            // Show Gross Weight if available, else Net Weight
            (item.grossWeight || item.quantityKg).toFixed(2),
            (item.amountPerKg || item.pricePerKg).toFixed(2),
            item.total.toFixed(2)
        ];
        tableRows.push(itemData);
    });
    
    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 60,
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 3 },
        headStyles: { fillColor: [79, 70, 229] } // Indigo color
    });
    
    // Summary
    const finalY = doc.lastAutoTable.finalY + 10;
    
    doc.setFontSize(11);
    doc.text(`Subtotal: Rs. ${billData.subTotal.toFixed(2)}`, 140, finalY, { align: 'left' });
    
    if (billData.discount > 0) {
        doc.text(`Discount: - Rs. ${billData.discount.toFixed(2)}`, 140, finalY + 7, { align: 'left' });
    }
    
    if (billData.borrowing > 0) {
        doc.text(`Due/Borrow: Rs. ${billData.borrowing.toFixed(2)}`, 140, finalY + 14, { align: 'left' });
    }
    
    doc.setFontSize(14);
    doc.setTextColor(22, 101, 52); // Green color
    doc.setFont(undefined, 'bold');
    doc.text(`Paid Amount: Rs. ${billData.amountToPay.toFixed(2)}`, 140, finalY + 24, { align: 'left' });
    
    // Footer
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.setFont(undefined, 'normal');
    doc.text("Thank you for your business!", 105, 280, { align: "center" });
    
    // Save
    const fileName = `Invoice_${billData.customerName.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
    doc.save(fileName);
};
