
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import ReactDOMServer from 'react-dom/server';
import Receipt, { ReceiptPreview } from './Receipt';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import CustomerSearch from './dashboard/CustomerSearch';
import BillingTable from './dashboard/BillingTable';
import BillSummary from './dashboard/BillSummary';
import html2canvas from 'html2canvas';
import { apiFetch } from '../api';

function WholesellerDashboard({ spices, onStockUpdate }) {
  const [lastBill, setLastBill] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [salesHistory, setSalesHistory] = useState([]);
  const [totalDues, setTotalDues] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter for Ground spices only (default)
  const groundSpices = useMemo(() => {
    return spices.filter(s => s.category === 'Ground' || !s.category);
  }, [spices]);

  // Form State - matching Dashboard.js structure for component reuse
  const [formData, setFormData] = useState({
    customerMobile: '',
    customerName: '',
    customerAddress: '',
    discount: '',
    borrowing: '',
    items: []
  });

  // Sync items with spices
  useEffect(() => {
      setFormData(prev => {
          const newItems = groundSpices.map(s => {
              const existing = prev.items.find(i => i.spiceId === s.id);
              return existing ? existing : { spiceId: s.id, name: s.name, quantityKg: '', amountPerKg: '' };
          });
          return { ...prev, items: newItems };
      });
  }, [groundSpices]);

  const handleFormChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleItemChange = (index, field, value) => {
    setFormData(prev => {
        const newItems = [...prev.items];
        newItems[index] = { ...newItems[index], [field]: value };
        return { ...prev, items: newItems };
    });
  };

  const resetForm = () => {
      setFormData({
        customerMobile: '',
        customerName: '',
        customerAddress: '',
        discount: '',
        borrowing: '',
        items: groundSpices.map(s => ({ spiceId: s.id, name: s.name, quantityKg: '', amountPerKg: '' }))
      });
      setSelectedCustomer(null);
      setSalesHistory([]);
      setTotalDues(0);
      setLastBill(null);
  };

  // History Fetching
  useEffect(() => {
    if (selectedCustomer) {
        setFormData(prev => ({
            ...prev,
            customerMobile: selectedCustomer.mobileNumber,
            customerName: selectedCustomer.name,
            customerAddress: selectedCustomer.address || ''
        }));
        fetchSalesHistory(selectedCustomer.mobileNumber);
    } else {
        setSalesHistory([]);
        setTotalDues(0);
    }
  }, [selectedCustomer]);

  const fetchSalesHistory = async (mobile) => {
      try {
        const res = await apiFetch(`/api/customers/sales/${mobile}`);
        if (res.ok) {
            const data = await res.json();
            setSalesHistory(data);
            const dues = data.reduce((sum, sale) => sum + (sale.borrowing || 0), 0);
            setTotalDues(dues);
        }
      } catch (e) { console.error(e); }
  };

  const onSubmit = async (isThermalMode) => {
      if (!formData.customerMobile || formData.customerMobile.length !== 10) {
          alert("મોબાઈલ નંબર ફરજીયાત ૧૦ અંકો નો હોવો જોઈએ.");
          return;
      }
      if (!formData.customerName) {
          alert("ગ્રાહકનું નામ જરૂરી છે.");
          return;
      }

      // Filter valid items
      const itemsToBill = formData.items
        .filter(i => {
            const qty = parseFloat(i.quantityKg) || 0;
            const rate = parseFloat(i.amountPerKg) || 0;
            return qty > 0 && rate > 0;
        })
        .map(i => {
            const qty = parseFloat(i.quantityKg) || 0;
            const rate = parseFloat(i.amountPerKg) || 0;
            return { 
                spiceId: i.spiceId,
                name: i.name,
                quantityKg: qty, 
                amountPerKg: rate,
                total: qty * rate,
            };
        });

      if (itemsToBill.length === 0) {
          alert("કૃપા કરીને ઓછામાં ઓછી એક માન્ય વસ્તુ ઉમેરો (વજન > 0)");
          return;
      }

      // Check stock
      for (const item of itemsToBill) {
          const spice = groundSpices.find(s => s.id === item.spiceId);
          if (spice && item.quantityKg > spice.stock) {
              alert(` ${spice.name}નો પુરતો જથ્થો ઉપલબ્ધ નથી. ઉપલબ્ધ : ${spice.stock.toFixed(2)}kg`);
              return;
          }
      }

      setIsProcessing(true);

      const subTotal = itemsToBill.reduce((acc, i) => acc + i.total, 0);
      const discountVal = parseFloat(formData.discount) || 0;
      const finalTotal = Math.max(0, subTotal - discountVal);
      const borrowingVal = parseFloat(formData.borrowing) || 0;
      const amountToPay = finalTotal - borrowingVal;

      const payload = {
        customerInfo: {
            mobileNumber: formData.customerMobile,
            name: formData.customerName,
            address: formData.customerAddress
        },
        items: itemsToBill,
        subTotal,
        discount: discountVal,
        finalTotal,
        borrowing: borrowingVal,
        amountToPay,
        saleSource: 'Wholesale'
      };

      try {
        const res = await apiFetch(`/api/spices/sell`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.msg || 'બિલ બનાવવામાં મુશ્કેલી આવી રહી છે!');
        }

        const data = await res.json();
        const billNumber = data.sale.billNumber;

        // Receipt
        const receiptHTML = ReactDOMServer.renderToStaticMarkup(
            <Receipt 
              title="Wholesale Receipt"
              billNo={billNumber}
              customerName={formData.customerName}
              customerMobile={formData.customerMobile}
              customerAddress={formData.customerAddress}
              items={itemsToBill} 
              subtotal={finalTotal} 
              borrowing={borrowingVal} 
              total={amountToPay} 
              type={isThermalMode ? 'thermal' : 'preprinted'}
            />
        );
        const receiptWindow = window.open('', '_blank');
        receiptWindow.document.write(receiptHTML);
        receiptWindow.document.close();
        receiptWindow.print();
        
        setLastBill({ ...payload, items: itemsToBill, billNumber });
        alert('બિલ સફળતા પૂર્વક બની ગયું છે!');
        
        if (onStockUpdate) onStockUpdate();

      } catch (err) {
          alert(err.message);
      } finally {
          setIsProcessing(false);
      }
  };

  const handleWhatsAppShare = async () => {
      if (!lastBill) return;
      
      const element = document.getElementById('receipt-capture');
      if (!element) {
          alert("Receipt preview not found.");
          return;
      }
      
      const confirmSend = window.confirm(`Send bill to ${lastBill.customerInfo.name} (${lastBill.customerInfo.mobileNumber}) via WhatsApp?`);
      if (!confirmSend) return;

      setIsProcessing(true);

      try {
          const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff' });
          const base64Data = canvas.toDataURL('image/png').split(',')[1];

          const payload = {
              numbers: [lastBill.customerInfo.mobileNumber],
              message: `શ્રીજી મસાલા (Wholesale) - Bill #${lastBill.billNumber}\nતમારી ખરીદી બદલ આભાર.`,
              image: {
                  mimetype: 'image/png',
                  data: base64Data,
                  filename: `invoice_${lastBill.billNumber}.png`
              }
          };

          const res = await apiFetch(`/api/whatsapp/send`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });

          if (res.ok) {
              alert('બિલ સફળતાપૂર્વક મોકલવામાં આવ્યું છે! (Bill Sent Successfully)');
          } else {
               const errData = await res.json();
               if (window.confirm(`Auto-send failed (${errData.msg}).\n\nManually send via WhatsApp Web?`)) {
                   canvas.toBlob(async (blob) => {
                       try {
                           const item = new ClipboardItem({ "image/png": blob });
                           await navigator.clipboard.write([item]);
                           alert("Image Copied! Paste in WhatsApp.");
                           window.open(`https://web.whatsapp.com/send?phone=91${lastBill.customerInfo.mobileNumber}`, '_blank');
                       } catch (clipErr) {
                           alert("Clipboard failed. Please download PDF.");
                       }
                   });
               }
          }
      } catch (err) {
          console.error("Capture failed:", err);
          alert("Failed to generate image.");
      } finally {
          setIsProcessing(false);
      }
  };

  // Keyboard shortcut F2
  useEffect(() => {
    const handleKeyDown = (e) => {
        if (e.key === 'F2') {
            e.preventDefault();
            onSubmit(false); 
        } else if (e.key === 'Escape') {
            if (window.confirm("Clear form?")) {
                resetForm();
            }
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  return (
      <form onSubmit={(e) => e.preventDefault()}>
         {/* Hidden Receipt for Capture */}
        <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
            {lastBill && (
                <ReceiptPreview 
                    items={lastBill.items}
                    subtotal={lastBill.finalTotal} 
                    borrowing={lastBill.borrowing} 
                    total={lastBill.amountToPay} 
                    customerName={lastBill.customerInfo.name}
                    customerMobile={lastBill.customerInfo.mobileNumber}
                    billNo={lastBill.billNumber}
                />
            )}
        </div>

        <div className="customer-section">
            <CustomerSearch 
                mobile={formData.customerMobile}
                name={formData.customerName}
                address={formData.customerAddress}
                onFormChange={handleFormChange}
                onCustomerSelect={setSelectedCustomer} 
            />
            <div className="card purchase-history-card">
                <h2 className="card-title">
                    અગાઉની ખરીદ માહિતી
                    {totalDues > 0 && <span style={{color: 'var(--danger-text)', fontSize: '0.9em'}}> Due: ₹{totalDues.toFixed(2)}</span>}
                </h2>
                <div className="scrollable-content">
                    {salesHistory.length > 0 ? (
                        <div className="table-wrapper">
                            <table className="styled-table">
                                <thead><tr><th>તારીખ </th><th>વસ્તુ</th><th className="text-right">વજન</th><th className="text-right">રકમ</th></tr></thead>
                                <tbody>
                                    {salesHistory.flatMap(sale => sale.items.map(item => (
                                        <tr key={`${sale._id}-${item.spiceId}`}>
                                            <td>{new Date(sale.date).toLocaleDateString()}</td>
                                            <td>{item.name}</td>
                                            <td className="text-right">{item.quantityKg.toFixed(2)}</td>
                                            <td className="text-right">{item.total.toFixed(2)}</td>
                                        </tr>
                                    )))}
                                </tbody>
                            </table>
                        </div>
                    ) : <p>ઇતિહાસ કે ગ્રાહક પસંદ કરેલ નથી.</p>}
                </div>
            </div>
        </div>

        <div className="card">
            <BillingTable 
                spices={groundSpices} 
                items={formData.items} 
                onItemChange={handleItemChange} 
            />
            <BillSummary 
                items={formData.items}
                discount={formData.discount}
                borrowing={formData.borrowing}
                onFormChange={handleFormChange}
                onGenerateBill={(isThermal) => {
                    if (lastBill) {
                        resetForm();
                    } else {
                        onSubmit(isThermal);
                    }
                }}
                isProcessing={isProcessing}
                hasLastBill={!!lastBill}
                onDownloadPDF={() => lastBill && generateInvoicePDF({ 
                    customerName: lastBill.customerInfo.name, 
                    customerMobile: lastBill.customerInfo.mobileNumber,
                    ...lastBill 
                })}
                onShareWhatsApp={handleWhatsAppShare}
            />
        </div>
      </form>
  );
}

export default WholesellerDashboard;
