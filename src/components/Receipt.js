
import React from 'react';

// ==========================================
// 1. RECEIPT PREVIEW (For WhatsApp Image)
// ==========================================
export const ReceiptPreview = ({ 
  items, 
  subtotal, 
  labor = 0,
  commission = 0,
  discount = 0,
  borrowing, 
  total, 
  amountPaid,
  customerName,
  customerMobile,
  billNo,
  isPurchase = false,
  pricePer20Kg = false,
  isWholeChili = false,
  receiptTitle
}) => {
  
  // Common Calculations
  const totalGross = items.reduce((acc, i) => acc + (parseFloat(i.grossWeight) || parseFloat(i.quantityKg) || 0), 0);
  const totalBardan = items.reduce((acc, i) => acc + (parseFloat(i.bardan) || 0), 0);
  const totalNet = items.reduce((acc, i) => acc + (parseFloat(i.quantityKg) || 0), 0);
  const totalBags = items.reduce((acc, i) => acc + (parseInt(i.bags) || 0), 0);

  // --- STYLES ---
  // Sales: Yellow Background, Red Borders
  const salesStyle = {
      bg: '#fffbeb',
      text: '#451a03',
      border: '#b91c1c',
      headerText: '#b91c1c',
      headerBg: '#fee2e2',
      headerTextContrast: '#451a03',
      rowBottom: '#fca5a5',
      footerBg: '#fff7ed'
  };

  // Purchase: White Background, Blue/Slate Borders
  const purchaseStyle = {
      bg: '#ffffff',
      text: '#0f172a',
      border: '#334155',
      headerText: '#334155',
      headerBg: '#e2e8f0',
      headerTextContrast: '#0f172a',
      rowBottom: '#cbd5e1',
      footerBg: '#f1f5f9'
  };

  const theme = isPurchase ? purchaseStyle : salesStyle;

  return (
    <div 
      id="receipt-capture" 
      style={{
        width: '400px', 
        backgroundColor: theme.bg,
        color: theme.text,
        fontFamily: "'Poppins', sans-serif", 
        padding: '20px',
        border: `2px solid ${theme.border}`,
        fontSize: '13px',
        position: 'relative'
      }}
    >
       {/* Header */}
       <div style={{textAlign: 'center', borderBottom: `2px solid ${theme.border}`, paddingBottom: '10px', marginBottom: '15px'}}>
          <h2 style={{margin: '0', fontSize: '1.8em', color: theme.headerText, fontWeight: '800'}}>
              {isPurchase ? 'Purchase Record' : 'શ્રીજી મસાલા'}
          </h2>
          <p style={{margin: '5px 0 0', fontSize: '0.9em', fontWeight: '600'}}>
            {receiptTitle ? receiptTitle : (isPurchase ? 'ખરીદી બિલ (Purchase Voucher)' : (isWholeChili ? 'આખું મરચું બિલ' : 'રીટેઈલ બિલ'))}
          </p>
       </div>

       {/* Customer/Vendor Details */}
       <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '15px'}}>
          <div style={{flex: 1}}>
             <div style={{display: 'flex', marginBottom: '4px'}}>
               <span style={{width: '60px', fontWeight: 'bold', color: theme.headerText}}>{isPurchase ? 'Vendor:' : 'Name:'}</span>
               <span style={{borderBottom: `1px dashed ${theme.text}`, flex: 1, paddingLeft: '5px'}}>{customerName}</span>
             </div>
             <div style={{display: 'flex'}}>
               <span style={{width: '60px', fontWeight: 'bold', color: theme.headerText}}>Mobile:</span>
               <span style={{borderBottom: `1px dashed ${theme.text}`, flex: 1, paddingLeft: '5px'}}>{customerMobile || '-'}</span>
             </div>
          </div>
          <div style={{textAlign: 'right', minWidth: '100px'}}>
             <div style={{marginBottom: '4px'}}>
                <span style={{fontWeight: 'bold', color: theme.headerText}}>{isPurchase ? 'Ref No:' : 'Bill No:'} </span> {billNo}
             </div>
             <div>
                <span style={{fontWeight: 'bold', color: theme.headerText}}>Date: </span> {new Date().toLocaleDateString('en-GB')}
             </div>
          </div>
       </div>

       {/* Table */}
       <table style={{width: '100%', borderCollapse: 'collapse', marginBottom: '15px', border: `1px solid ${theme.border}`}}>
          <thead>
            <tr style={{backgroundColor: theme.headerBg, color: theme.headerTextContrast}}>
              <th style={{textAlign: 'left', padding: '6px', borderRight: `1px solid ${theme.bg}`}}>Item</th>
              {isWholeChili && <th style={{textAlign: 'center', padding: '6px', borderRight: `1px solid ${theme.bg}`, width: '30px'}}>Bag</th>}
              <th style={{textAlign: 'right', padding: '6px', borderRight: `1px solid ${theme.bg}`, width: '50px'}}>Weight</th>
              <th style={{textAlign: 'right', padding: '6px', borderRight: `1px solid ${theme.bg}`, width: '50px'}}>Rate</th>
              <th style={{textAlign: 'right', padding: '6px', width: '60px'}}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} style={{borderBottom: `1px solid ${theme.rowBottom}`}}>
                <td style={{padding: '6px', borderRight: `1px solid ${theme.border}`, fontWeight: '600'}}>
                    {item.name || item.spiceName}
                </td>
                {isWholeChili && <td style={{textAlign: 'center', padding: '6px', borderRight: `1px solid ${theme.border}`}}>{item.bags || '-'}</td>}
                <td style={{textAlign: 'right', padding: '6px', borderRight: `1px solid ${theme.border}`}}>
                    {(item.grossWeight || item.quantityKg || 0).toFixed(2)}
                </td>
                <td style={{textAlign: 'right', padding: '6px', borderRight: `1px solid ${theme.border}`}}>
                  {Math.round(item.amountPerKg || item.pricePerKg || 0)}
                </td>
                <td style={{textAlign: 'right', padding: '6px', fontWeight: '600'}}>{Math.round(item.total || 0)}</td>
              </tr>
            ))}
          </tbody>
       </table>

       {/* Footer Section */}
       <div style={{display: 'flex', border: `1px solid ${theme.border}`, borderRadius: '4px'}}>
           {/* Left Footer (Weight Details) */}
           <div style={{flex: 1, borderRight: `1px solid ${theme.border}`, padding: '8px', fontSize: '0.9em'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '4px'}}>
                    <span>Gross Wt:</span>
                    <span style={{fontWeight: 'bold'}}>{totalGross.toFixed(2)}</span>
                </div>
                {(totalBardan > 0 || totalBags > 0) && (
                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: theme.headerText}}>
                        <span>Bardan/Bags:</span>
                        <span>- {totalBardan.toFixed(2)}</span>
                    </div>
                )}
                <div style={{display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${theme.border}`, paddingTop: '4px'}}>
                    <span style={{fontWeight: 'bold'}}>Net Weight:</span>
                    <span style={{fontWeight: 'bold', fontSize: '1.1em'}}>{totalNet.toFixed(2)}</span>
                </div>
           </div>

           {/* Right Footer (Amount Details) */}
           <div style={{flex: 1.2, padding: '8px', backgroundColor: theme.footerBg}}>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '4px'}}>
                 <span>Subtotal:</span>
                 <span>{subtotal.toFixed(2)}</span>
              </div>
              {labor > 0 && (
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '4px'}}>
                    <span>+ Majuri:</span>
                    <span>{labor.toFixed(2)}</span>
                  </div>
              )}
              {commission > 0 && (
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '4px'}}>
                    <span>+ Dalali:</span>
                    <span>{commission.toFixed(2)}</span>
                  </div>
              )}
              {discount > 0 && (
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: 'green'}}>
                    <span>- Discount:</span>
                    <span>{discount.toFixed(2)}</span>
                  </div>
              )}
              
              {amountPaid > 0 && (
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: 'green'}}>
                    <span>Paid:</span>
                    <span>{amountPaid.toFixed(2)}</span>
                  </div>
              )}
              
              {borrowing > 0 && (
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#b91c1c', fontWeight: 'bold'}}>
                    <span>Due:</span>
                    <span>{borrowing.toFixed(2)}</span>
                  </div>
              )}

              <div style={{display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${theme.border}`, paddingTop: '4px', marginTop: '4px'}}>
                 <span style={{fontWeight: 'bold', color: theme.headerText, fontSize: '1.1em'}}>Grand Total:</span>
                 <span style={{fontWeight: 'bold', color: theme.headerText, fontSize: '1.2em'}}>₹{total.toFixed(0)}</span>
              </div>
           </div>
       </div>
       
       {!isPurchase && (
        <div style={{textAlign: 'center', marginTop: '15px', fontSize: '0.8em', color: '#78350f', fontStyle: 'italic'}}>
            Thank you! Visit Again.
        </div>
       )}
    </div>
  );
};

// ==========================================
// 2. SALES RECEIPT LAYOUT (Retail/Wholesale - UNCHANGED)
// ==========================================
const SalesReceiptLayout = ({ 
    items, 
    subtotal, 
    labor, 
    commission, 
    discount, 
    borrowing, 
    total, 
    customerName,
    customerMobile,
    customerAddress,
    billNo,
    isWholeChili
}) => {
    // ... (Same as before, no changes to this component) ...
    const prePrintedStyles = `
        @page { size: 130mm 188mm; margin: 0mm; }
        @media print {
            html, body { 
                width: 130mm; 
                height: 188mm; 
                margin: 0mm !important; 
                padding: 0mm !important; 
                overflow: hidden;
            }
            header, footer { display: none !important; }
        }
        body { font-family: 'Courier New', Courier, monospace; font-weight: bold; font-size: 14px; }
        
        .receipt-container { position: relative; width: 130mm; height: 187.5mm; overflow: hidden; }
        .field { position: absolute; white-space: nowrap; z-index: 10; }
        
        .customer-name { top: 42mm; left: 32mm; width: 65mm; }
        .mobile { top: 49mm; left: 20mm; width: 35mm; }
        .village { top: 49mm; left: 65mm; width: 35mm; }
        .invoice-no { top: 42mm; left: 112mm; width: 18mm; text-align: center; }
        .date { top: 49mm; left: 112mm; width: 18mm; text-align: center; }

        .items-container { position: absolute; top: 63mm; width: 100%; }
        .row { height: 6mm; position: relative; }
        .item-name { position: absolute; left: 0; width: 65mm; text-align: center; }
        .item-weight { position: absolute; left: 65mm; width: 20mm; text-align: center; }
        .item-rate { position: absolute; left: 85mm; width: 20mm; text-align: center; }
        .item-amount { position: absolute; left: 105mm; width: 25mm; text-align: center; }

        .grid-lines { position: absolute; top: 63mm; bottom: 0; left: 0; right: 0; pointer-events: none; }
        .vl { position: absolute; top: 0; bottom: 5mm; border-right: 1px dashed #000; }
        .vl-1 { left: 65mm; } 
        .vl-2 { left: 85mm; } 
        .vl-3 { left: 105mm; } 
        
        .hl { position: absolute; left: 85mm; width: 45mm; border-bottom: 1px dashed #000; }
        .hl-1 { top: 135mm; } 
        .hl-2 { top: 142mm; } 
        .hl-3 { top: 149mm; } 
        .hl-4 { top: 156mm; } 
        .hl-5 { top: 163mm; } 

        .hl-w { position: absolute; left: 65mm; width: 20mm; border-bottom: 1px dashed #000; }
        .hl-w-1 { top: 135mm; }
        .hl-w-2 { top: 142mm; }
        .hl-w-3 { top: 149mm; }
        .hl-w-4 { top: 156mm; }

        .footer-label { position: absolute; left: 85mm; width: 20mm; text-align: center; font-size: 12px; font-weight: bold; }
        .fl-1 { top: 136mm; } 
        .fl-2 { top: 143mm; } 
        .fl-3 { top: 150mm; } 
        .fl-4 { top: 157mm; } 

        .footer-amount { position: absolute; left: 105mm; width: 25mm; text-align: center; font-weight: bold; font-size: 14px; }
        .fa-1 { top: 136mm; }
        .fa-2 { top: 143mm; }
        .fa-3 { top: 150mm; }
        .fa-4 { top: 157mm; font-size: 16px; }
        
        .pending-box { position: absolute; top: 145mm; left: 18mm; width: 30mm; border: 2px solid #000; padding: 2px 5px; display: flex; justify-content: center; align-items: center; gap: 5px; }
        .pending-title { font-size: 16px; font-weight: 900; }
        .pending-amount { font-size: 18px; font-weight: 900; }
    `;

    return (
        <html>
        <head><title>Print</title><style>{prePrintedStyles}</style></head>
        <body>
            <div className="receipt-container">
                <div className="field customer-name">{customerName}</div>
                <div className="field mobile">{customerMobile}</div>
                <div className="field village">{customerAddress}</div>
                <div className="field invoice-no">{billNo}</div>
                <div className="field date">{new Date().toLocaleDateString('en-GB')}</div>

                <div className="items-container">
                    {items.map((item, index) => (
                        <div className="row" key={index}>
                            <span className="item-name">{item.name || item.spiceName} {isWholeChili && item.bags ? `(${item.bags} bags)` : ''}</span>
                            <span className="item-weight">{(item.grossWeight || item.quantityKg || 0).toFixed(2)}</span>
                            <span className="item-rate">{Math.round(item.amountPerKg || item.pricePerKg)}</span>
                            <span className="item-amount">{Math.round(item.total)}</span>
                        </div>
                    ))}
                </div>

                <div className="grid-lines">
                    <div className="vl vl-1"></div>
                    <div className="vl vl-2"></div>
                    <div className="vl vl-3"></div>
                    
                    <div className="hl hl-1"></div>
                    <div className="hl hl-2"></div>
                    <div className="hl hl-3"></div>
                    <div className="hl hl-4"></div>
                    <div className="hl hl-5"></div>

                    <div className="hl-w hl-w-1"></div>
                    <div className="hl-w hl-w-2"></div>
                    <div className="hl-w hl-w-3"></div>
                    <div className="hl-w hl-w-4"></div>
                </div>

                {borrowing > 0 && (
                    <div className="pending-box">
                        <span className="pending-title">બાકી :</span>
                        <span className="pending-amount">{Math.round(borrowing)}</span>
                    </div>
                )}

                <div className="footer-label fl-1">TOTAL</div>
                <div className="footer-amount fa-1">{subtotal.toFixed(0)}</div>

                <div className="footer-label fl-2">{labor > 0 ? 'Majuri' : 'S.G.S.T...%'}</div>
                <div className="footer-amount fa-2">{labor > 0 ? labor : ''}</div>

                <div className="footer-label fl-3">{commission > 0 ? 'Dalali' : (discount > 0 ? 'Discount' : 'C.G.S.T...%')}</div>
                <div className="footer-amount fa-3">{commission > 0 ? commission : (discount > 0 ? `-${discount}` : '')}</div>

                <div className="footer-label fl-4">G.TOTAL</div>
                <div className="footer-amount fa-4">{total.toFixed(0)}</div>
            </div>
        </body>
        </html>
    );
};

// ==========================================
// 3. PURCHASE RECEIPT LAYOUT (Unified Font Size)
// ==========================================
const PurchaseReceiptLayout = ({ 
    items, 
    total, 
    customerName,
    customerMobile,
    billNo,
    borrowing
}) => {
    
    // Calculations
    const totalGross = items.reduce((acc, i) => acc + (parseFloat(i.grossWeight) || 0), 0);
    const totalBardan = items.reduce((acc, i) => acc + (parseFloat(i.bardan) || 0), 0);
    const totalNet = items.reduce((acc, i) => acc + (parseFloat(i.quantityKg) || 0), 0);

    // Updated styles for Purchase with consistent 14px font
    const styles = `
        @page { size: 130mm 188mm; margin: 0mm; }
        @media print {
            html, body { 
                width: 130mm; 
                height: 188mm; 
                margin: 0mm !important; 
                padding: 0mm !important; 
                overflow: hidden; 
            }
            header, footer { display: none !important; }
        }
        body { font-family: 'Courier New', Courier, monospace; font-weight: bold; font-size: 14px; }
        
        .receipt-container { 
            position: relative; 
            width: 130mm; 
            height: 187.5mm;
            overflow: hidden;
        }
        
        .field { position: absolute; white-space: nowrap; z-index: 10; }
        
        /* Header */
        .customer-name { top: 42mm; left: 32mm; width: 65mm; }
        .mobile { top: 49mm; left: 20mm; width: 35mm; }
        .invoice-no { top: 42mm; left: 112mm; width: 18mm; text-align: center; }
        .date { top: 49mm; left: 112mm; width: 18mm; text-align: center; }

        /* Columns */
        .items-container { position: absolute; top: 63mm; width: 100%; }
        .row { height: 6mm; position: relative; }
        
        .item-name { position: absolute; left: 0; width: 45mm; text-align: center; }
        .item-weight { position: absolute; left: 45mm; width: 40mm; text-align: center; font-size: 14px; }
        .item-rate { position: absolute; left: 85mm; width: 20mm; text-align: center; }
        .item-amount { position: absolute; left: 105mm; width: 25mm; text-align: center; }

        /* Grid Lines */
        .grid-lines { position: absolute; top: 63mm; bottom: 0; left: 0; right: 0; pointer-events: none; }
        .vl { position: absolute; top: 0; bottom: 5mm; border-right: 1px dashed #000; }
        .vl-1 { left: 45mm; } /* Vigat End */
        .vl-2 { left: 85mm; } /* Vajan End */
        .vl-3 { left: 105mm; } /* Bhav End */
        
        /* Left Footer Grid (Vigat + Vajan) - Spans 0mm to 85mm */
        .hl-left { position: absolute; left: 0mm; width: 85mm; border-bottom: 1px dashed #000; }
        .hl-l-1 { top: 135mm; }
        .hl-l-2 { top: 142mm; }
        .hl-l-3 { top: 149mm; }
        .hl-l-4 { top: 156mm; }

        /* Right Footer Grid - Only Bottom Line */
        .hl-right-bottom { position: absolute; left: 85mm; width: 45mm; border-bottom: 1px dashed #000; top: 156mm; }
        
        /* Left Footer Labels (Aligned Right in Vigat Column) */
        .left-label { position: absolute; left: 0mm; width: 45mm; text-align: right; padding-right: 5px; font-weight: bold; font-size: 14px; }
        
        /* Left Footer Values (Centered in Vajan Column) */
        .left-value { position: absolute; left: 45mm; width: 40mm; text-align: center; font-weight: bold; font-size: 14px; }

        /* Row Positions */
        .row-1 { top: 136mm; } /* Kul Vajan */
        .row-2 { top: 143mm; } /* Bardan */
        .row-3 { top: 150mm; } /* Net Vajan */
        .row-4 { top: 157mm; } /* Bhav/Extra */

        /* Right Footer Total */
        .total-label { position: absolute; left: 85mm; width: 20mm; top: 157mm; text-align: center; font-weight: bold; font-size: 14px; }
        .total-value { position: absolute; left: 105mm; width: 25mm; top: 157mm; text-align: center; font-weight: bold; font-size: 14px; }

        .pending-box { position: absolute; top: 140mm; left: 90mm; width: 35mm; border: 2px solid #000; padding: 4px; display: flex; justify-content: center; align-items: center; gap: 5px; }
        .pending-title { font-size: 16px; font-weight: 900; }
        .pending-amount { font-size: 18px; font-weight: 900; }
    `;

    return (
        <html>
        <head><title>Purchase</title><style>{styles}</style></head>
        <body>
            <div className="receipt-container">
                <div className="field customer-name">{customerName}</div>
                <div className="field mobile">{customerMobile}</div>
                <div className="field invoice-no">{billNo}</div>
                <div className="field date">{new Date().toLocaleDateString('en-GB')}</div>

                <div className="items-container">
                    {items.map((item, index) => (
                        <div className="row" key={index}>
                            <span className="item-name">{item.name || item.spiceName}</span>
                            <span className="item-weight">
                                {item.quantityKg.toFixed(2)}
                            </span>
                            <span className="item-rate">{Math.round(item.amountPerKg || item.pricePerKg)}</span>
                            <span className="item-amount">{Math.round(item.total)}</span>
                        </div>
                    ))}
                </div>

                <div className="grid-lines">
                    {/* Verticals */}
                    <div className="vl vl-1"></div>
                    <div className="vl vl-2"></div>
                    <div className="vl vl-3"></div>
                    
                    {/* Left Side Grid (4 Rows across Vigat & Vajan) */}
                    <div className="hl-left hl-l-1"></div>
                    <div className="hl-left hl-l-2"></div>
                    <div className="hl-left hl-l-3"></div>
                    <div className="hl-left hl-l-4"></div>

                    {/* Right Side Grid (Bottom Only) */}
                    <div className="hl-right-bottom"></div>
                </div>

                {/* Left Footer Data */}
                <div className="left-label row-1">કુલ વજન</div>
                <div className="left-value row-1">{totalGross.toFixed(2)}</div>

                <div className="left-label row-2">બારદાન</div>
                <div className="left-value row-2">{totalBardan.toFixed(2)}</div>

                <div className="left-label row-3">નેટ વજન</div>
                <div className="left-value row-3">{totalNet.toFixed(2)}</div>
                
                {/* Row 4 Left can be blank or Bhav */}
                <div className="left-label row-4">ભાવ</div>
                <div className="left-value row-4"></div>

                {borrowing > 0 && (
                    <div className="pending-box">
                        <span className="pending-title">બાકી :</span>
                        <span className="pending-amount">{Math.round(borrowing)}</span>
                    </div>
                )}

                {/* Right Footer Data (Only Total at Bottom) */}
                <div className="total-label">કુલ રૂપિયા</div>
                <div className="total-value">{total.toFixed(0)}</div>

            </div>
        </body>
        </html>
    );
};

// ==========================================
// 4. MAIN COMPONENT
// ==========================================
const Receipt = (props) => {
    if (props.isPurchase) {
        return <PurchaseReceiptLayout {...props} />;
    }
    return <SalesReceiptLayout {...props} />;
};

export default Receipt;
