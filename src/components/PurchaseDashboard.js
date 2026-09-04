
import React, { useState, useMemo, useEffect } from 'react';
import ReactDOMServer from 'react-dom/server';
import Receipt from './Receipt';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import API_BASE_URL from '../apiConfig';

const PurchaseDashboard = ({ spices, onStockUpdate, user }) => {
  const [vendorName, setVendorName] = useState('');
  const [vendorMobile, setVendorMobile] = useState('');
  const [vendorAddress, setVendorAddress] = useState('');
  
  // State map: { [spiceId]: { quantityKg: '', bagWeight: '', pricePerKg: '' } }
  const [purchaseItems, setPurchaseItems] = useState({});
  
  const [paidAmount, setPaidAmount] = useState(''); // New: Amount Paid

  const [isProcessing, setIsProcessing] = useState(false);
  const [isThermalMode, setIsThermalMode] = useState(false);
  const [lastPurchase, setLastPurchase] = useState(null);

  // Initialize state for inputs when spices load
  useEffect(() => {
    setPurchaseItems(prev => {
        const newState = {};
        spices.forEach(s => {
            // Preserve existing values if re-render happens, otherwise init empty
            newState[s.id] = prev[s.id] || { quantityKg: '', bagWeight: '', pricePerKg: '' };
        });
        return newState;
    });
  }, [spices]);

  const handleItemChange = (spiceId, field, value) => {
    setPurchaseItems(prev => ({
        ...prev,
        [spiceId]: {
            ...prev[spiceId],
            [field]: value
        }
    }));
  };

  const calculateRowTotal = (item) => {
    if (!item) return 0;
    const gross = parseFloat(item.quantityKg) || 0;
    const bag = parseFloat(item.bagWeight) || 0;
    const price = parseFloat(item.pricePerKg) || 0;
    const net = Math.max(0, gross - bag);
    // Math: (Weight / 20) * Price
    return (net / 20) * price;
  };
  
  const grandTotal = useMemo(() => {
    return spices.reduce((total, spice) => {
        const item = purchaseItems[spice.id];
        return total + calculateRowTotal(item);
    }, 0);
  }, [spices, purchaseItems]);
  
  // Calculate Balance (Baki)
  const balance = Math.max(0, grandTotal - (parseFloat(paidAmount) || 0));

  const resetForm = () => {
    setVendorName('');
    setVendorMobile('');
    setVendorAddress('');
    setPaidAmount('');
    const newState = {};
    spices.forEach(s => {
        newState[s.id] = { quantityKg: '', bagWeight: '', pricePerKg: '' };
    });
    setPurchaseItems(newState);
    // Don't reset lastPurchase so buttons stay visible
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!vendorName.trim()) {
      alert('કૃપા કરીને વેચાણકર્તાનું નામ દાખલ કરો..');
      return;
    }

    const validItems = spices.map(spice => {
      const item = purchaseItems[spice.id];
      if (!item) return null;

      const gross = parseFloat(item.quantityKg) || 0;
      const bag = parseFloat(item.bagWeight) || 0;
      const price = parseFloat(item.pricePerKg) || 0;
      const net = Math.max(0, gross - bag);
      
      if (net > 0 && price > 0) {
        return {
          spiceId: spice.id,
          spiceName: spice.name,
          quantityKg: net, // Send Net Weight to backend for stock
          grossWeight: gross,
          bardan: bag,
          pricePerKg: price,
          // Math: (Weight / 20) * Price
          total: (net / 20) * price,
        };
      }
      return null;
    }).filter(Boolean);

    if (validItems.length === 0) {
      alert('કૃપા કરીને ખરીદીમાં ઓછામાં ઓછી એક માન્ય વસ્તુ ઉમેરો (વજન > 0).');
      return;
    }
    
    setIsProcessing(true);
    const purchasePayload = {
        vendorName,
        vendorMobile,
        vendorAddress,
        items: validItems,
        grandTotal,
        paidAmount: parseFloat(paidAmount) || 0
    };

    try {
        const response = await fetch(`${API_BASE_URL}/api/purchases/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(purchasePayload),
        });

        if (!response.ok) {
        throw new Error('ખરીદીની નોંધણી કરવામાં નિષ્ફળ.');
        }
        
        // --- PRINT RECEIPT (Using Standard Receipt Component) ---
        const receiptHTML = ReactDOMServer.renderToStaticMarkup(
        <Receipt 
            title="Purchase Receipt"
            customerName={vendorName} // Map vendor to customerName for receipt
            customerMobile={vendorMobile}
            customerAddress={vendorAddress}
            items={validItems.map(item => ({
                ...item, 
                name: item.spiceName, 
                amountPerKg: item.pricePerKg // Map price to amount for receipt
            }))} 
            subtotal={grandTotal}
            discount={0}
            borrowing={balance} // Use balance as borrowing
            total={grandTotal}
            amountPaid={parseFloat(paidAmount) || 0}
            isPurchase={true}
            type={isThermalMode ? 'thermal' : 'preprinted'}
            pricePer20Kg={true}
        />
        );
        const receiptWindow = window.open('', '_blank');
        receiptWindow.document.write(receiptHTML);
        receiptWindow.document.close();
        receiptWindow.print();

        // Save for PDF download
        setLastPurchase({
            customerName: vendorName,
            customerMobile: vendorMobile,
            customerAddress: vendorAddress,
            items: validItems.map(item => ({...item, name: item.spiceName, amountPerKg: item.pricePerKg})), 
            subTotal: grandTotal,
            discount: 0,
            borrowing: balance,
            amountToPay: parseFloat(paidAmount) || 0, // Store actual paid amount for PDF/Records
            pricePer20Kg: true
        });

        alert('ખરીદીની સફળતાપૂર્વક નોંધણી થઈ!');
        resetForm();
        onStockUpdate(false); 

    } catch (error) {
        console.error('ખરીદીની નોંધણીમાં ભૂલ:', error);
        alert(error.message);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleDownloadPDF = () => {
      if (!lastPurchase) return;
      generateInvoicePDF(lastPurchase);
  };

  const handleWheel = (e) => e.target.blur();

  return (
    <div className="page-container">
      <div className="card">
        <h2 className="card-title" style={{textAlign: 'center'}}>નવી ખરીદી</h2>
        <form className="purchase-form" onSubmit={handleSubmit}>
          <h3 style={{marginTop: 0}}>વેચાણકર્તાની વિગત </h3>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="vendorName">વેચાણકર્તાનું નામ</label>
              <input 
                type="text" 
                id="vendorName" 
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                required 
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                    <label htmlFor="vendorMobile">મોબાઈલ નંબર</label>
                    <input 
                        type="tel" 
                        id="vendorMobile" 
                        value={vendorMobile}
                        maxLength="10"
                        placeholder="Optional"
                        onChange={(e) => setVendorMobile(e.target.value.replace(/[^0-9]/g, ''))}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="vendorAddress">સરનામું/ગામ</label>
                    <input 
                        type="text" 
                        id="vendorAddress" 
                        value={vendorAddress}
                        onChange={(e) => setVendorAddress(e.target.value)}
                    />
                </div>
            </div>
          </div>

          <h3>વસ્તુ</h3>
          <div className="table-wrapper">
            <table className="styled-table billing-table">
              <thead>
                <tr>
                  <th style={{width: '30%'}}>મસાલા</th>
                  <th style={{width: '15%'}} className="text-right">કુલ વજન</th>
                  <th style={{width: '15%'}} className="text-right">બારદાન (થેલો)</th>
                  <th style={{width: '20%'}} className="text-right">કિંમત/20kg (₹)</th>
                  <th style={{width: '20%'}} className="text-right">Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                {spices.map((spice) => {
                  const item = purchaseItems[spice.id] || { quantityKg: '', bagWeight: '', pricePerKg: '' };
                  const total = calculateRowTotal(item);

                  return (
                    <tr key={spice.id}>
                      <td>
                        {spice.name} (Cur: {spice.stock}kg)
                      </td>
                      <td>
                        <input 
                          type="number" 
                          step="0.01" 
                          min="0"
                          placeholder="0.00"
                          value={item.quantityKg}
                          onChange={(e) => handleItemChange(spice.id, 'quantityKg', e.target.value)}
                          onWheel={handleWheel}
                        />
                      </td>
                      <td>
                        <input 
                          type="number" 
                          step="0.001" 
                          min="0"
                          placeholder="0.000"
                          value={item.bagWeight}
                          onChange={(e) => handleItemChange(spice.id, 'bagWeight', e.target.value)}
                          onWheel={handleWheel}
                          style={{color: 'var(--danger-text)'}}
                        />
                      </td>
                      <td>
                        <input 
                          type="number" 
                          step="0.01"
                          min="0"
                          placeholder="0.00" 
                          value={item.pricePerKg}
                          onChange={(e) => handleItemChange(spice.id, 'pricePerKg', e.target.value)}
                          onWheel={handleWheel}
                        />
                      </td>
                      <td className="text-right">
                        <span className="item-total">{total.toFixed(2)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="summary-footer">
            <div className="summary-group">
                <div className="summary-item">
                  <label>કુલ રકમ</label>
                  <span className="summary-value final-total">₹{grandTotal.toFixed(2)}</span>
                </div>
                
                <div className="summary-item">
                  <label htmlFor="paidAmount" style={{color: 'var(--success-text)'}}>જમા</label>
                  <input
                    id="paidAmount"
                    type="number"
                    min="0"
                    className="summary-input"
                    placeholder="0.00"
                    onWheel={handleWheel}
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    style={{borderColor: 'var(--success-text)'}}
                  />
                </div>
                
                <div className="summary-item payment-total">
                  <label style={{color: 'var(--danger-text)'}}>બાકી</label>
                  <span className="summary-value amount-to-pay" style={{color: 'var(--danger-text)'}}>
                      ₹{balance.toFixed(2)}
                  </span>
                </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                 <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem'}}>
                    <input 
                        type="checkbox" 
                        checked={isThermalMode} 
                        onChange={(e) => setIsThermalMode(e.target.checked)} 
                        style={{width: 'auto'}}
                    />
                    Thermal Printer Mode
                 </label>
                <div className="bill-actions">
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={isProcessing || grandTotal <= 0}
                  >
                    {isProcessing ? 'Processing...' : 'Record Purchase'}
                  </button>
                  {lastPurchase && (
                    <button type="button" className="btn btn-secondary" onClick={handleDownloadPDF}>
                        Download PDF
                    </button>
                  )}
                </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PurchaseDashboard;
