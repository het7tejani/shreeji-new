
import React, { useState } from 'react';

const BillSummary = ({ items, discount, borrowing, onFormChange, onGenerateBill, isProcessing, hasLastBill, onDownloadPDF, onShareWhatsApp }) => {
  const [isThermalMode, setIsThermalMode] = useState(false);

  // Calculate totals locally
  const subTotal = items.reduce((acc, item) => {
    const qty = parseFloat(item.quantityKg) || 0;
    const rate = parseFloat(item.amountPerKg) || 0;
    return acc + (qty * rate);
  }, 0);

  const finalTotal = Math.max(0, subTotal - (parseFloat(discount) || 0));
  const amountToPay = finalTotal - (parseFloat(borrowing) || 0);

  const handleWheel = (e) => e.target.blur();

  return (
    <div className="summary-footer">
      <div className="summary-group">
         <div className="summary-item">
          <label>Subtotal</label>
          <span className="summary-value">₹{subTotal.toFixed(2)}</span>
        </div>
        <div className="summary-item">
          <label htmlFor="discount">Discount</label>
          <input
            id="discount"
            type="number"
            min="0"
            className="summary-input"
            placeholder="0.00"
            onWheel={handleWheel}
            value={discount ?? ''}
            onChange={(e) => onFormChange('discount', e.target.value)}
          />
        </div>
        <div className="summary-item">
          <label>કુલ રકમ</label>
          <span className="summary-value final-total">₹{finalTotal.toFixed(2)}</span>
        </div>
        <div className="summary-item">
          <label htmlFor="borrowing">બાકી</label>
          <input
            id="borrowing"
            type="number"
            min="0"
            className="summary-input"
            placeholder="0.00"
            onWheel={handleWheel}
            value={borrowing ?? ''}
            onChange={(e) => onFormChange('borrowing', e.target.value)}
          />
        </div>
        <div className="summary-item payment-total">
          <label>ચૂકવવાની રકમ</label>
          <span className="summary-value amount-to-pay">₹{amountToPay.toFixed(2)}</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'flex-end' }}>
         <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-secondary)'}}>
            <input 
                type="checkbox" 
                checked={isThermalMode} 
                onChange={(e) => setIsThermalMode(e.target.checked)} 
                style={{width: 'auto'}}
            />
            Thermal Mode
         </label>

          <div className="bill-actions">
            {!hasLastBill ? (
                <button 
                  type="button"
                  className="btn btn-primary" 
                  onClick={() => onGenerateBill(isThermalMode)} 
                  disabled={isProcessing || subTotal <= 0}
                  style={{minWidth: '150px'}}
                >
                  {isProcessing ? 'Processing...' : 'બિલ બનવો (F2)'}
                </button>
            ) : (
                <>
                    <button 
                        type="button" 
                        className="btn btn-primary" 
                        onClick={() => onGenerateBill(isThermalMode)}
                        disabled={isProcessing}
                    >
                        નવુ બિલ બનાવો
                    </button>
                    <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={onDownloadPDF} 
                        title="Download PDF Invoice"
                    >
                        📄 Download PDF
                    </button>
                    <button 
                        type="button" 
                        className="btn btn-whatsapp" 
                        onClick={onShareWhatsApp}
                        disabled={isProcessing}
                    >
                        {isProcessing ? 'Sending...' : '📱 Send WhatsApp'}
                    </button>
                </>
            )}
          </div>
      </div>
    </div>
  );
};

export default BillSummary;
