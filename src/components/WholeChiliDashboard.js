
import React, { useState, useEffect, useCallback } from 'react';
import ReactDOMServer from 'react-dom/server';
import Receipt, { ReceiptPreview } from './Receipt';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import CustomerSearch from './dashboard/CustomerSearch';
import html2canvas from 'html2canvas';
import API_BASE_URL from '../apiConfig';

function WholeChiliDashboard({ spices, onStockUpdate }) {
  const [lastBill, setLastBill] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [salesHistory, setSalesHistory] = useState([]);
  const [totalDues, setTotalDues] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isThermalMode, setIsThermalMode] = useState(false);

  // Default Stock Source: "Marchu"
  const stockItem = spices.find(s => s.name === 'Marchu') || spices.find(s => s.id === 1); 

  // Form State
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  
  // Rows for dynamic entry
  const [rows, setRows] = useState([{ id: Date.now(), itemName: 'મરચા ભારી', bhari: '', weight: '', bardan: '', rate: '' }]);
  
  // Additional Charges
  const [labor, setLabor] = useState(''); 
  const [commission, setCommission] = useState(''); 
  const [paidAmount, setPaidAmount] = useState(''); 
  
  // Calculated values
  const goodsValue = rows.reduce((acc, row) => {
      const w = parseFloat(row.weight) || 0; 
      const b = parseFloat(row.bardan) || 0; 
      const r = parseFloat(row.rate) || 0;
      
      const netWeight = Math.max(0, w - b);
      return acc + ((netWeight / 20) * r);
  }, 0);
  
  const totalLabor = parseFloat(labor) || 0;
  const totalCommission = parseFloat(commission) || 0;
  
  const grandTotal = Math.max(0, goodsValue + totalLabor + totalCommission);
  const borrowing = Math.max(0, grandTotal - (parseFloat(paidAmount) || 0));
  const amountToPay = parseFloat(paidAmount) || 0;

  const handleRowChange = (id, field, value) => {
    setRows(prev => prev.map(row => {
        if (row.id === id) {
            return { ...row, [field]: value };
        }
        return row;
    }));
  };

  const addRow = () => {
      setRows(prev => [...prev, { id: Date.now(), itemName: 'મરચા ભારી', bhari: '', weight: '', bardan: '', rate: '' }]);
  };

  const removeRow = (id) => {
      if (rows.length > 1) {
        setRows(prev => prev.filter(row => row.id !== id));
      } else {
          setRows([{ id: Date.now(), itemName: 'મરચા ભારી', bhari: '', weight: '', bardan: '', rate: '' }]);
      }
  };

  const resetForm = () => {
      setCustomerMobile('');
      setCustomerName('');
      setCustomerAddress('');
      setRows([{ id: Date.now(), itemName: 'મરચા ભારી', bhari: '', weight: '', bardan: '', rate: '' }]);
      setLabor('');
      setCommission('');
      setPaidAmount('');
      setSelectedCustomer(null);
      setSalesHistory([]);
      setTotalDues(0);
      setLastBill(null);
  };

  // Fetch Sales History
  useEffect(() => {
    if (selectedCustomer) {
        setCustomerMobile(selectedCustomer.mobileNumber);
        setCustomerName(selectedCustomer.name);
        setCustomerAddress(selectedCustomer.address || '');
        fetchSalesHistory(selectedCustomer.mobileNumber);
    } else {
        setSalesHistory([]);
        setTotalDues(0);
    }
  }, [selectedCustomer]);

  const fetchSalesHistory = async (mobile) => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/customers/sales/${mobile}`);
        if (res.ok) {
            const data = await res.json();
            setSalesHistory(data);
            const dues = data.reduce((sum, sale) => sum + (sale.borrowing || 0), 0);
            setTotalDues(dues);
        }
      } catch (e) { console.error(e); }
  };

  const handleFormChange = useCallback((field, value) => {
      if (field === 'customerMobile') setCustomerMobile(value);
      if (field === 'customerName') setCustomerName(value);
      if (field === 'customerAddress') setCustomerAddress(value);
  }, []);

  const onSubmit = async () => {
      if (!customerMobile || customerMobile.length !== 10) {
          alert("મોબાઈલ નંબર ૧૦ અંકનો હોવો જરૂરી છે.");
          return;
      }
      if (!customerName) {
          alert("ગ્રાહકનું નામ જરૂરી છે.");
          return;
      }
      if (!stockItem) {
          alert("Stock Item 'Marchu' not found. Please add it in Settings.");
          return;
      }

      // Filter valid items
      const itemsToBill = rows
        .filter(r => r.weight && parseFloat(r.weight) > 0)
        .map(r => {
            const b = parseInt(r.bhari) || 0;
            const w = parseFloat(r.weight) || 0;
            const bardan = parseFloat(r.bardan) || 0;
            const rate = parseFloat(r.rate) || 0;
            const net = Math.max(0, w - bardan);
            
            return {
                spiceId: stockItem.id, 
                name: r.itemName || 'મરચા ભારી', 
                bags: b,
                quantityKg: net, 
                grossWeight: w, 
                bardan: bardan, 
                amountPerKg: rate, 
                total: (net / 20) * rate
            };
        });

      if (itemsToBill.length === 0) {
          alert("કૃપા કરીને ઓછામાં ઓછી એક માન્ય એન્ટ્રી ઉમેરો (વજન > 0)");
          return;
      }

      // Stock Validation
      const totalWeightNeeded = itemsToBill.reduce((sum, item) => sum + item.quantityKg, 0);
      if (stockItem.stock < totalWeightNeeded) {
          alert(`સ્ટોક અપૂરતો છે! ઉપલબ્ધ (Marchu): ${stockItem.stock}kg, જરૂરી: ${totalWeightNeeded}kg`);
          return;
      }

      setIsProcessing(true);

      const payload = {
        customerInfo: {
            mobileNumber: customerMobile,
            name: customerName,
            address: customerAddress
        },
        items: itemsToBill,
        subTotal: goodsValue,
        labor: totalLabor,
        commission: totalCommission,
        discount: 0,
        finalTotal: grandTotal,
        borrowing: borrowing,
        amountToPay: amountToPay,
        saleSource: 'Retail - Whole' 
      };

      try {
        const res = await fetch(`${API_BASE_URL}/api/spices/sell`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.msg || 'બિલ બનાવવામાં નિષ્ફળ.');
        }

        const data = await res.json();
        const billNumber = data.sale.billNumber;

        // Receipt
        const receiptHTML = ReactDOMServer.renderToStaticMarkup(
            <Receipt 
              title="આખું મરચું - બિલ"
              billNo={billNumber}
              customerName={customerName}
              customerMobile={customerMobile}
              customerAddress={customerAddress}
              items={itemsToBill} 
              subtotal={goodsValue}
              labor={totalLabor}
              commission={totalCommission}
              discount={0}
              borrowing={borrowing} 
              total={grandTotal}
              amountPaid={amountToPay}
              type={isThermalMode ? 'thermal' : 'preprinted'}
              pricePer20Kg={true}
              isWholeChili={true}
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
      if (!element) { alert("Receipt preview not found."); return; }

      const confirmSend = window.confirm(`Send bill to ${lastBill.customerInfo.name} (${lastBill.customerInfo.mobileNumber}) via WhatsApp?`);
      if (!confirmSend) return;
      
      setIsProcessing(true);

      try {
          const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff' });
          const base64Data = canvas.toDataURL('image/png').split(',')[1];
          
          const payload = {
              numbers: [lastBill.customerInfo.mobileNumber],
              message: `શ્રીજી મસાલા (Whole Chili) - Bill #${lastBill.billNumber}\nતમારી ખરીદી બદલ આભાર.`,
              image: {
                  mimetype: 'image/png',
                  data: base64Data,
                  filename: `invoice_${lastBill.billNumber}.png`
              }
          };
          
          const res = await fetch(`${API_BASE_URL}/api/whatsapp/send`, {
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

  const handleWheel = (e) => e.target.blur();

  return (
      <form onSubmit={(e) => e.preventDefault()}>
        <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
            {lastBill && (
                <ReceiptPreview 
                    items={lastBill.items}
                    subtotal={lastBill.subTotal} 
                    labor={lastBill.labor}
                    commission={lastBill.commission}
                    discount={0}
                    borrowing={lastBill.borrowing} 
                    total={lastBill.finalTotal}
                    amountPaid={lastBill.amountToPay}
                    customerName={lastBill.customerInfo.name}
                    customerMobile={lastBill.customerInfo.mobileNumber}
                    billNo={lastBill.billNumber}
                    pricePer20Kg={true}
                    isWholeChili={true}
                />
            )}
        </div>

        <div className="customer-section">
            <CustomerSearch 
                mobile={customerMobile}
                name={customerName}
                address={customerAddress}
                onFormChange={handleFormChange}
                onCustomerSelect={setSelectedCustomer} 
            />
            <div className="card purchase-history-card">
                <h2 className="card-title">
                    અગાઉની ખરીદ માહિતી
                    {totalDues > 0 && <span style={{color: 'var(--danger-text)', fontSize: '0.9em'}}> બાકી: ₹{totalDues.toFixed(2)}</span>}
                </h2>
                <div className="scrollable-content">
                    {salesHistory.length > 0 ? (
                        <div className="table-wrapper">
                            <table className="styled-table">
                                <thead><tr><th>તારીખ</th><th>વિગત</th><th className="text-right">વજન</th><th className="text-right">રકમ</th></tr></thead>
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
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem', flexWrap: 'wrap', gap: '1rem'}}>
                 <div style={{display:'flex', alignItems:'center', gap:'15px', flexWrap: 'wrap'}}>
                    <h2 className="card-title" style={{margin:0, border:0}}>આખું મરચું</h2>
                    
                    {stockItem && (
                         <div className="stock-selection-container" style={{display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-hover)', padding: '0.4rem 1rem', borderRadius: '4px', border: '1px solid var(--border-color)'}}>
                            <span style={{fontWeight: '600', fontSize: '0.9rem'}}>મરચું:</span>
                            <span style={{fontSize: '0.95rem', color: stockItem.stock < 50 ? 'var(--danger-text)' : 'var(--success-text)', fontWeight: 'bold'}}>
                                {stockItem.stock.toFixed(2)} kg
                            </span>
                        </div>
                    )}
                </div>
                <button type="button" className="btn btn-sm btn-secondary" onClick={addRow}>+ નવી લાઈન</button>
            </div>
           
            <div className="table-wrapper">
                <table className="styled-table billing-table">
                    <thead>
                        <tr>
                            <th style={{width: '40px'}}>No.</th>
                            <th style={{width: '20%'}}>વિગત/નામ</th>
                            <th style={{width: '10%'}} className="text-right">ભારી (Bags)</th>
                            <th style={{width: '15%'}} className="text-right">વજન (kg)</th>
                            <th style={{width: '10%'}} className="text-right">બારદાન (kg)</th>
                            <th style={{width: '15%'}} className="text-right">ભાવ (20kg)</th>
                            <th style={{width: '15%'}} className="text-right">કુલ રકમ</th>
                            <th style={{width: '40px'}}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, index) => {
                            const w = parseFloat(row.weight) || 0;
                            const b = parseFloat(row.bardan) || 0;
                            const r = parseFloat(row.rate) || 0;
                            const net = Math.max(0, w - b);
                            const total = (net / 20) * r;
                            
                            return (
                                <tr key={row.id}>
                                    <td>{index + 1}</td>
                                    <td>
                                        <input 
                                            type="text"
                                            value={row.itemName}
                                            onChange={(e) => handleRowChange(row.id, 'itemName', e.target.value)}
                                            placeholder="Item Name"
                                            style={{textAlign: 'left'}}
                                        />
                                    </td>
                                    <td className="text-right">
                                        <input 
                                            type="number" 
                                            min="0"
                                            value={row.bhari}
                                            onChange={(e) => handleRowChange(row.id, 'bhari', e.target.value)}
                                            onWheel={handleWheel}
                                            placeholder="0"
                                            style={{textAlign: 'right'}}
                                        />
                                    </td>
                                    <td className="text-right">
                                        <input 
                                            type="number" 
                                            min="0" 
                                            step="0.01"
                                            value={row.weight}
                                            onChange={(e) => handleRowChange(row.id, 'weight', e.target.value)}
                                            onWheel={handleWheel}
                                            placeholder="0.00"
                                            style={{textAlign: 'right'}}
                                        />
                                    </td>
                                    <td className="text-right">
                                        <input 
                                            type="number" 
                                            min="0" 
                                            step="0.01"
                                            value={row.bardan}
                                            onChange={(e) => handleRowChange(row.id, 'bardan', e.target.value)}
                                            onWheel={handleWheel}
                                            placeholder="0.00"
                                            style={{textAlign: 'right', color: 'var(--danger-text)'}}
                                        />
                                    </td>
                                    <td className="text-right">
                                        <input 
                                            type="number" 
                                            min="0"
                                            value={row.rate}
                                            onChange={(e) => handleRowChange(row.id, 'rate', e.target.value)}
                                            onWheel={handleWheel}
                                            placeholder="0"
                                            style={{textAlign: 'right'}}
                                        />
                                    </td>
                                    <td className="text-right">
                                        {total > 0 ? total.toFixed(2) : '-'}
                                    </td>
                                    <td>
                                        <button type="button" className="btn-remove" onClick={() => removeRow(row.id)}>&times;</button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot>
                        <tr style={{backgroundColor: 'var(--bg-hover)', fontWeight: 'bold'}}>
                           <td></td>
                           <td>કુલ</td>
                           <td className="text-right">{rows.reduce((s,r)=>s+(parseInt(r.bhari)||0), 0)}</td>
                           <td className="text-right">{rows.reduce((s,r)=>s+(parseFloat(r.weight)||0), 0).toFixed(2)}</td>
                           <td className="text-right" style={{color: 'var(--danger-text)'}}>{rows.reduce((s,r)=>s+(parseFloat(r.bardan)||0), 0).toFixed(2)}</td>
                           <td className="text-right"></td>
                           <td className="text-right">{goodsValue.toFixed(2)}</td>
                           <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <div className="summary-footer">
                <div className="summary-group" style={{ display: 'flex', flexWrap: 'nowrap', flex: 1, gap: '1rem', justifyContent: 'space-between', alignItems: 'flex-end', overflowX: 'auto' }}>
                     
                     <div className="summary-item">
                        <label>Subtotal</label>
                        <span className="summary-value">₹{goodsValue.toFixed(2)}</span>
                     </div>

                     <div className="summary-item">
                        <label>મજૂરી</label>
                        <input 
                            type="number" 
                            className="summary-input" 
                            value={labor} 
                            onChange={(e) => setLabor(e.target.value)} 
                            onWheel={handleWheel}
                            placeholder="0"
                        />
                     </div>

                     <div className="summary-item">
                        <label>દલાલી</label>
                        <input 
                            type="number" 
                            className="summary-input" 
                            value={commission} 
                            onChange={(e) => setCommission(e.target.value)} 
                            onWheel={handleWheel}
                            placeholder="0"
                        />
                     </div>

                     <div className="summary-item">
                        <label>કુલ સરવાળો</label>
                        <span className="summary-value final-total" style={{color: 'var(--primary-color)'}}>₹{grandTotal.toFixed(2)}</span>
                     </div>
                     
                     <div className="summary-item">
                        <label style={{color: 'var(--success-text)'}}>જમા</label>
                        <input 
                            type="number" 
                            className="summary-input" 
                            value={paidAmount} 
                            onChange={(e) => setPaidAmount(e.target.value)} 
                            onWheel={handleWheel}
                            placeholder="0"
                            style={{borderColor: 'var(--success-text)'}}
                        />
                     </div>

                     <div className="summary-item payment-total">
                        <label style={{color: 'var(--danger-text)'}}>બાકી</label>
                        <span className="summary-value amount-to-pay" style={{color: 'var(--danger-text)'}}>₹{borrowing.toFixed(2)}</span>
                     </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'flex-end', marginLeft: 'auto' }}>
                     <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem'}}>
                        <input 
                            type="checkbox" 
                            checked={isThermalMode} 
                            onChange={(e) => setIsThermalMode(e.target.checked)} 
                            style={{width: 'auto'}}
                        />
                        Thermal Mode
                     </label>
                     <div className="bill-actions">
                        {!lastBill ? (
                             <button 
                                type="button"
                                className="btn btn-primary" 
                                onClick={onSubmit} 
                                disabled={isProcessing || goodsValue <= 0}
                                style={{minWidth: '150px'}}
                                >
                                {isProcessing ? '...' : 'બિલ બનાવો (F2)'}
                            </button>
                        ) : (
                             <>
                                <button type="button" className="btn btn-primary" onClick={resetForm}>New Bill</button>
                                <button type="button" className="btn btn-secondary" onClick={() => generateInvoicePDF({ 
                                    customerName: lastBill.customerInfo.name, 
                                    customerMobile: lastBill.customerInfo.mobileNumber,
                                    pricePer20Kg: true,
                                    ...lastBill 
                                })}>
                                    Download PDF
                                </button>
                                <button type="button" className="btn btn-whatsapp" onClick={handleWhatsAppShare} disabled={isProcessing}>
                                    {isProcessing ? 'Sending...' : 'Send WhatsApp'}
                                </button>
                            </>
                        )}
                     </div>
                </div>
            </div>
        </div>
      </form>
  );
}

export default WholeChiliDashboard;
