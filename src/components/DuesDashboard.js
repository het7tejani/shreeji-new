
import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../api';

const DuesDashboard = ({ user }) => {
  const [dues, setDues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // History Modal State
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [customerHistory, setCustomerHistory] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchDues = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch only Retail dues
      const response = await apiFetch(`/api/customers/dues?type=Retail`);
      
      if (!response.ok) {
        throw new Error('બાકી રકમ મેળવવામાં નિષ્ફળ:');
      }
      const data = await response.json();
      setDues(data);
    } catch (err) {
      setError(err.message);
      console.error("બાકી રકમ મેળવવામાં નિષ્ફળ:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDues();
  }, [fetchDues]);

  const handleSettleDue = async (saleId, currentBorrowing) => {
    const amountStr = prompt(`પતાવટ કરવાની રકમ દાખલ કરો (મહત્તમ ₹${currentBorrowing.toFixed(2)}):`);

    if (amountStr === null) {
      return;
    }

    const amount = parseFloat(amountStr);

    if (isNaN(amount) || amount <= 0) {
      alert('કૃપા કરીને માન્ય સંખ્યા દાખલ કરો.');
      return;
    }

    if (amount > currentBorrowing + 0.001) {
      alert('સમાધાનની રકમ બાકી રકમ કરતાં વધુ ન હોઈ શકે..');
      return;
    }
    
    try {
        const response = await apiFetch(`/api/customers/settle-due`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ saleId, amount }),
        });
  
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.msg || 'પતાવટ કરવામાં ભૂલ થઇ રહી છે.');
        }
  
        alert('સફળતાપૂર્વક પતાવટ!');
        fetchDues(); // Refresh the dues list
      } catch (error) {
        console.error('પતાવટ કરવામાં ભૂલ થઇ રહી છે:', error);
        alert(error.message);
      }
  };

  const handleViewHistory = async (customer) => {
    if (!customer || !customer._id) return;
    setLoadingHistory(true);
    setHistoryModalOpen(true);
    setCustomerHistory(null);

    try {
      // Fetch retail ledger
      const response = await apiFetch(`/api/customers/ledger/${customer._id}?type=Retail`);
      if (!response.ok) throw new Error('Failed to fetch ledger');
      const data = await response.json();
      setCustomerHistory({
          name: customer.name,
          payments: data.payments ? data.payments.sort((a,b) => new Date(b.date) - new Date(a.date)) : []
      });
    } catch (err) {
      console.error(err);
      alert('ઇતિહાસ મેળવવામાં ભૂલ.');
      setHistoryModalOpen(false);
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <div className="card">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
          <h2 className="card-title" style={{margin: 0, border: 'none', padding: 0}}>
              છૂટક ગ્રાહકોના બાકી લેણાં
          </h2>
      </div>

      {/* History Modal */}
      {historyModalOpen && (
        <div className="modal-overlay" onClick={() => setHistoryModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{maxWidth: '600px'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                <h3 style={{margin: 0}}>ચુકવણી ઇતિહાસ - {customerHistory?.name}</h3>
                <button onClick={() => setHistoryModalOpen(false)} className="btn-remove" style={{fontSize: '1.5rem'}}>&times;</button>
            </div>
            
            {loadingHistory ? (
                <p>Loading...</p>
            ) : (
                <div className="table-wrapper" style={{maxHeight: '400px', overflowY: 'auto'}}>
                    <table className="styled-table">
                        <thead>
                            <tr>
                                <th>તારીખ</th>
                                <th>નોંધ</th>
                                <th className="text-right">રકમ (₹)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customerHistory?.payments?.length > 0 ? (
                                customerHistory.payments.map(pay => (
                                    <tr key={pay._id}>
                                        <td>{new Date(pay.date).toLocaleDateString()}</td>
                                        <td style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>{pay.note}</td>
                                        <td className="text-right" style={{color: 'var(--success-text)', fontWeight: 'bold'}}>
                                            {pay.amount.toFixed(2)}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="3" className="text-center">કોઈ ચુકવણી ઇતિહાસ મળ્યો નથી.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
            <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setHistoryModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
          <div style={{textAlign: 'center', padding: '2rem'}}>Loading...</div>
      ) : error ? (
          <div className="error-message">Error: {error}</div>
      ) : dues.length > 0 ? (
        <div className="table-wrapper">
          <table className="styled-table">
            <thead>
              <tr>
                <th>તારીખ</th>
                <th>નામ</th>
                <th>મોબાઈલ નંબર</th>
                <th>ગામ</th>
                <th>ખરીદીની માહિતી</th>
                <th className="text-right">કુલ રકમ  (₹)</th>
                <th className="text-right">ચૂકવેલ રકમ  (₹)</th>
                <th className="text-right">બાકી રકમ (₹)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {dues.map(sale => (
                <tr key={sale._id}>
                  <td>{new Date(sale.date).toLocaleDateString()}</td>
                  <td style={{ maxWidth: '150px', wordWrap: 'break-word', whiteSpace: 'normal' }}>{sale.customer ? sale.customer.name : 'N/A'}</td>
                  <td>{sale.customer ? sale.customer.mobileNumber : 'N/A'}</td>
                  <td style={{ maxWidth: '200px', wordWrap: 'break-word', whiteSpace: 'normal' }}>{sale.customer ? sale.customer.address : 'N/A'}</td>
                  <td style={{ maxWidth: '250px', wordWrap: 'break-word', whiteSpace: 'normal' }}>
                    {sale.items.map(item => `${item.name} (${item.quantityKg}kg)`).join(', ')}
                  </td>
                  <td className="text-right">{sale.finalTotal.toFixed(2)}</td>
                  <td className="text-right">{sale.amountToPay.toFixed(2)}</td>
                  <td className="text-right" style={{color: 'var(--danger-color)', fontWeight: '600'}}>{sale.borrowing.toFixed(2)}</td>
                  <td style={{display: 'flex', gap: '0.5rem'}}>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleViewHistory(sale.customer)}
                      title="View Payment History"
                    >
                      વિગત
                    </button>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handleSettleDue(sale._id, sale.borrowing)}
                      disabled={sale.borrowing === 0}
                    >
                      પતાવટ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p style={{textAlign: 'center'}}>કોઈ બાકી લેણાં મળ્યા નથી.</p>
      )}
    </div>
  );
};

export default DuesDashboard;
