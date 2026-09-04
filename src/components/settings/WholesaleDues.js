
import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../../apiConfig';

const WholesaleDues = ({ user }) => {
    const [wholesaleDues, setWholesaleDues] = useState([]);
    const [loadingWholesale, setLoadingWholesale] = useState(false);
    const [selectedWholesaler, setSelectedWholesaler] = useState(null);
    
    // Ledger State
    const [ledgerItems, setLedgerItems] = useState([]);
    const [customerDetails, setCustomerDetails] = useState(null);
    const [stats, setStats] = useState({ totalDebit: 0, totalCredit: 0, currentBalance: 0 });
    
    const [paymentAmount, setPaymentAmount] = useState('');
    const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);

    useEffect(() => {
        fetchWholesaleDues();
    }, []);

    const fetchWholesaleDues = async () => {
        setLoadingWholesale(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/customers/wholesale/summary`);
            if (!response.ok) throw new Error('જથ્થાબંધ સારાંશ બતાવવામાં નિષ્ફળ થયાં');
            const data = await response.json();
            setWholesaleDues(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingWholesale(false);
        }
    };

    const fetchLedger = async (customerId) => {
        setLoadingWholesale(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/customers/ledger/${customerId}`);
            if (!response.ok) throw new Error('ખાતાવહી બતાવવામાં નિષ્ફળ');
            const data = await response.json();
            
            // Filter Lists for Wholesale/Whole Only
            // This ensures we don't mix Retail data, matching the dashboard view
            const filteredSales = data.sales.filter(s => s.type === 'Wholesale' || s.type === 'Retail - Whole');
            const filteredPayments = data.payments.filter(p => p.type === 'Wholesale' || p.type === 'Retail - Whole');

            // --- STATS CALCULATION ---
            // Source of Truth: The Sale Documents
            // Total Bill = Sum of Final Totals
            // Current Due = Sum of Borrowing (This matches the outside dashboard)
            // Total Paid = Bill - Due (Derived to ensure balance)
            
            let totalDebit = 0;
            let currentBalance = 0;

            filteredSales.forEach(sale => {
                totalDebit += sale.finalTotal || 0;
                currentBalance += sale.borrowing || 0;
            });

            const totalCredit = totalDebit - currentBalance;

            setStats({
                totalDebit,
                totalCredit,
                currentBalance
            });
            
            // --- LEDGER ITEMS CONSTRUCTION ---
            let allTransactions = [];

            // 1. Add Sales
            filteredSales.forEach(sale => {
                let typeLabel = '';
                if (sale.type === 'Retail - Whole') typeLabel = ' (Whole)';
                else if (sale.type === 'Wholesale') typeLabel = ' (WS)';

                allTransactions.push({
                    id: sale._id,
                    date: new Date(sale.date),
                    type: 'DEBIT', // Udhar
                    description: `Bill #${sale.billNumber || '-'}${typeLabel}: ${sale.items.length} items`,
                    subDescription: sale.items.map(i => `${i.name} (${i.quantityKg}kg)`).join(', '),
                    amount: sale.finalTotal,
                    raw: sale
                });
            });

            // 2. Add Payments
            filteredPayments.forEach(pay => {
                allTransactions.push({
                    id: pay._id,
                    date: new Date(pay.date),
                    type: 'CREDIT', // Jama
                    description: pay.note || 'Initial Payment (At Sale)',
                    amount: pay.amount,
                    raw: pay
                });
            });

            // 3. Sort Chronologically (Oldest First)
            allTransactions.sort((a, b) => a.date - b.date);

            // 4. Calculate Running Balance for visual table
            // Note: This visual running balance might strictly follow transactions listed.
            // If there are payments missing (e.g. marked as Retail but paid for Wholesale), 
            // the table end balance might slightly differ from 'currentBalance', but 'currentBalance'
            // at the top is the correct amount owed.
            let runningBalance = 0;
            
            const computedLedger = allTransactions.map(txn => {
                if (txn.type === 'DEBIT') {
                    runningBalance += txn.amount;
                } else {
                    runningBalance -= txn.amount;
                }
                return { ...txn, balance: runningBalance };
            });

            setLedgerItems(computedLedger);
            setCustomerDetails(data.customer);
            setSelectedWholesaler(customerId);

        } catch (err) {
            console.error(err);
            alert('Error: ' + err.message);
        } finally {
            setLoadingWholesale(false);
        }
    };

    const handleAddPayment = async (e) => {
        e.preventDefault();
        const amount = parseFloat(paymentAmount);
        if (!amount || amount <= 0) {
            alert("કૃપા કરીને માન્ય રકમ દાખલ કરો.");
            return;
        }
        if (!selectedWholesaler) return;

        setIsPaymentProcessing(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/customers/wholesale/pay`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customerId: selectedWholesaler, amount })
            });
            if (!res.ok) throw new Error('ચુકવણી નિષ્ફળ!');
            const data = await res.json();
            alert(data.msg);
            setPaymentAmount('');
            fetchLedger(selectedWholesaler); // Refresh ledger
        } catch (err) {
            alert(err.message);
        } finally {
            setIsPaymentProcessing(false);
        }
    };

    if (selectedWholesaler && customerDetails) {
        return (
          <div className="card">
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                  <button 
                    className="btn btn-secondary btn-sm" 
                    onClick={() => { setSelectedWholesaler(null); fetchWholesaleDues(); }}
                    style={{borderRadius: '50%', width: '32px', height: '32px', padding: 0, display: 'flex', justifyContent: 'center'}}
                  >
                      ←
                  </button>
                  <div>
                      <h2 className="card-title" style={{border: 'none', margin: 0, padding: 0}}>
                          {customerDetails.name}
                      </h2>
                      <span style={{fontSize: '0.9rem', color: 'var(--text-secondary)'}}>
                          {customerDetails.mobileNumber} {customerDetails.address ? ` - ${customerDetails.address}` : ''}
                      </span>
                  </div>
              </div>

              {/* Summary Cards */}
              <div className="analytics-grid" style={{gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '1.5rem'}}>
                  <div className="stat-card" style={{padding: '1rem', borderTop: '4px solid var(--text-main)'}}>
                      <div className="stat-label">કુલ ખરીદી (TOTAL BILL)</div>
                      <div className="stat-value">₹{stats.totalDebit.toFixed(2)}</div>
                  </div>
                  <div className="stat-card" style={{padding: '1rem', borderTop: '4px solid var(--success-text)'}}>
                      <div className="stat-label">કુલ જમા (TOTAL PAID)</div>
                      <div className="stat-value" style={{color: 'var(--success-text)'}}>₹{stats.totalCredit.toFixed(2)}</div>
                  </div>
                  <div className="stat-card" style={{padding: '1rem', borderTop: '4px solid var(--danger-text)', background: 'var(--danger-bg)'}}>
                      <div className="stat-label">બાકી રકમ (CURRENT DUE)</div>
                      <div className="stat-value" style={{color: 'var(--danger-text)'}}>₹{stats.currentBalance.toFixed(2)}</div>
                  </div>
              </div>

              {/* Payment Form */}
              <div style={{ background: 'var(--bg-hover)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
                  <form onSubmit={handleAddPayment} style={{display: 'flex', gap: '1rem', alignItems: 'flex-end'}}>
                      <div style={{flex: 1}}>
                          <label style={{fontSize: '0.85rem', marginBottom: '0.25rem', display: 'block'}}>નવી રકમ જમા કરો (Add Payment)</label>
                          <input 
                              type="number" 
                              placeholder="Amount (₹)" 
                              value={paymentAmount}
                              onChange={(e) => setPaymentAmount(e.target.value)}
                              style={{padding: '0.5rem'}}
                              min="1"
                          />
                      </div>
                      <button type="submit" className="btn btn-primary" disabled={isPaymentProcessing}>
                          {isPaymentProcessing ? 'Processing...' : 'જમા કરો (Submit)'}
                      </button>
                  </form>
              </div>

              {/* Ledger Table */}
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Statement (હિસાબ)</h3>
              <div className="table-wrapper">
                  <table className="styled-table">
                      <thead>
                          <tr>
                              <th style={{width: '15%'}}>તારીખ</th>
                              <th style={{width: '40%'}}>વિગત</th>
                              <th className="text-right" style={{width: '15%', color: 'var(--danger-text)'}}>ઉધાર (BILL)</th>
                              <th className="text-right" style={{width: '15%', color: 'var(--success-text)'}}>જમા (PAID)</th>
                              <th className="text-right" style={{width: '15%'}}>બાકી (BALANCE)</th>
                          </tr>
                      </thead>
                      <tbody>
                          {ledgerItems.length === 0 ? (
                              <tr><td colSpan="5" className="text-center">No transactions found.</td></tr>
                          ) : (
                              ledgerItems.map((item) => (
                                  <tr key={item.id} style={{backgroundColor: item.type === 'CREDIT' ? 'rgba(220, 252, 231, 0.3)' : 'transparent'}}>
                                      <td style={{color: 'var(--text-secondary)', fontSize: '0.85rem'}}>
                                          {item.date.toLocaleDateString()}
                                      </td>
                                      <td>
                                          <div style={{fontWeight: '500'}}>{item.description}</div>
                                          {item.subDescription && (
                                              <div style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>
                                                  {item.subDescription}
                                              </div>
                                          )}
                                      </td>
                                      <td className="text-right" style={{fontWeight: '500'}}>
                                          {item.type === 'DEBIT' ? item.amount.toFixed(2) : '-'}
                                      </td>
                                      <td className="text-right" style={{fontWeight: '500', color: 'var(--success-text)'}}>
                                          {item.type === 'CREDIT' ? item.amount.toFixed(2) : '-'}
                                      </td>
                                      <td className="text-right" style={{fontWeight: '700', color: item.balance > 0 ? 'var(--danger-text)' : 'var(--success-text)'}}>
                                          {item.balance.toFixed(2)}
                                      </td>
                                  </tr>
                              ))
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
        );
    }

    return (
      <div className="card">
          <h2 className="card-title">જથ્થાબંધ ગ્રાહકો અને બાકી લેણાં</h2>
          <p style={{fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem'}}>
              હિસાબ જોવા માટે ગ્રાહકના નામ સામે 'વિગત' બટન પર ક્લિક કરો.
          </p>
          
          {loadingWholesale ? (
               <div style={{textAlign: 'center', padding: '3rem'}}>Loading Customers...</div>
          ) : (
            <div className="table-wrapper">
                <table className="styled-table">
                    <thead>
                        <tr>
                            <th>ગ્રાહકનું નામ</th>
                            <th>મોબાઈલ નંબર</th>
                            <th className="text-center">કેટેગરી</th>
                            <th className="text-right">બાકી રકમ (₹)</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {wholesaleDues.length === 0 ? (
                            <tr><td colSpan="5" className="text-center">કોઈ બાકી લેણાં નથી.</td></tr>
                        ) : (
                            wholesaleDues.map(w => (
                                <tr key={w._id}>
                                    <td style={{fontWeight: '600'}}>{w.customerName}</td>
                                    <td>{w.mobileNumber}</td>
                                    <td className="text-center">
                                    {w.types && w.types.length > 0 
                                        ? w.types.map(t => t === 'Retail - Whole' ? 'Whole Chili' : t).join(', ')
                                        : 'Wholesale'
                                    }
                                    </td>
                                    <td className="text-right" style={{color: 'var(--danger-text)', fontWeight: 'bold', fontSize: '1.1em'}}>
                                        {w.totalDue.toFixed(2)}
                                    </td>
                                    <td>
                                        <button 
                                            className="btn btn-sm btn-secondary"
                                            onClick={() => fetchLedger(w._id)}
                                        >
                                            વિગત
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
          )}
      </div>
    );
};

export default WholesaleDues;
