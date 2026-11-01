
import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../api';

const AuditTrail = () => {
    const [auditData, setAuditData] = useState([]);
    const [loadingAudit, setLoadingAudit] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchAuditTrail();
    }, []);

    const fetchAuditTrail = async () => {
        setLoadingAudit(true);
        setError('');
        try {
          const [purchaseRes, salesRes] = await Promise.all([
              apiFetch(`/api/purchases`),
              apiFetch(`/api/sales`)
          ]);
  
          // Check for HTML error pages before parsing
          const pType = purchaseRes.headers.get("content-type");
          const sType = salesRes.headers.get("content-type");

          if (!pType || !pType.includes("application/json") || !sType || !sType.includes("application/json")) {
               throw new Error("Server returned invalid data format. Please check connection.");
          }
          
          if (!purchaseRes.ok || !salesRes.ok) throw new Error('Failed to fetch data');
          
          const purchaseData = await purchaseRes.json();
          const salesData = await salesRes.json();
  
          let audit = [];
          // Process Purchases
          purchaseData.forEach(purchase => {
              purchase.items.forEach(item => {
                  audit.push({
                      id: purchase._id,
                      date: purchase.date,
                      type: 'Purchase',
                      entity: purchase.vendorName || 'Unknown Vendor',
                      item: item.spiceName,
                      qty: item.quantityKg,
                      amount: item.total,
                      changeType: 'positive'
                  });
              });
          });
  
          // Process Sales
          salesData.forEach(sale => {
              sale.items.forEach(item => {
                  audit.push({
                      id: sale._id,
                      billNumber: sale.billNumber,
                      date: sale.date,
                      type: 'Sale',
                      entity: sale.customer ? sale.customer.name : 'Unknown Customer',
                      item: item.name,
                      qty: item.quantityKg,
                      amount: item.total,
                      changeType: 'negative'
                  });
              });
          });
  
          // Sort by date desc
          setAuditData(audit.sort((a, b) => new Date(b.date) - new Date(a.date)));
  
        } catch (err) {
            console.error(err);
            setError(err.message || 'Failed to load audit trail.');
        } finally {
            setLoadingAudit(false);
        }
    };

    const handleDelete = async (record) => {
        const isSale = record.type === 'Sale';
        const confirmMsg = isSale 
            ? `શું તમે ખરેખર બિલ નં ${record.billNumber || ''} (${record.entity}) ડિલીટ કરવા માંગો છો?\n\nઆ બિલની તમામ વસ્તુઓ ડિલીટ થઈ જશે.`
            : `શું તમે ખરેખર ${record.entity} પાસેથી કરેલી ખરીદી ડિલીટ કરવા માંગો છો?\n\nઆ ખરીદીની તમામ વસ્તુઓ ડિલીટ થઈ જશે.`;

        if (window.confirm(confirmMsg)) {
            try {
                const endpoint = isSale ? '/api/sales/delete' : '/api/purchases/delete';
                const res = await apiFetch(`${endpoint}?id=${record.id}`, { method: 'DELETE' });
                
                // Robust JSON check
                const contentType = res.headers.get("content-type");
                if (!contentType || !contentType.includes("application/json")) {
                    throw new Error("Server error: Invalid response");
                }

                const data = await res.json();
                
                if (res.ok) {
                    alert('ડિલીટ થઈ ગયું (Deleted Successfully).');
                    fetchAuditTrail();
                } else {
                    alert('Error: ' + (data.msg || 'Failed to delete'));
                }
            } catch (err) {
                console.error(err);
                alert('Server Error: ' + err.message);
            }
        }
    };

    return (
        <div className="card" style={{ height: '80vh', display: 'flex', flexDirection: 'column' }}>
            <h2 className="card-title">ખરીદ / વેચાણ યાદી (Audit Trail)</h2>
            {error && <div className="error-message" style={{marginBottom: '1rem'}}>{error}</div>}
            <div className="scrollable-content" style={{ flexGrow: 1, overflowY: 'auto' }}>
                {loadingAudit ? <p style={{textAlign: 'center', padding: '2rem'}}>ફેરફાર થઇ રહ્યો છે...</p> : (
                    <div className="table-wrapper">
                        <table className="styled-table">
                            <thead>
                                <tr>
                                    <th>તારીખ</th>
                                    <th>પ્રકાર</th>
                                    <th>નામ</th>
                                    <th>વસ્તુ</th>
                                    <th className="text-right">વજન (kg)</th>
                                    <th className="text-right">રકમ (₹)</th>
                                    <th className="text-right">અસર</th>
                                    <th className="text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {auditData.map((row, i) => (
                                    <tr key={i}>
                                        <td style={{ whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                                            {new Date(row.date).toLocaleString()}
                                        </td>
                                        <td>
                                            <span className={`audit-badge ${row.type === 'Sale' ? 'sale' : 'purchase'}`}>
                                                {row.type === 'Sale' ? 'વેચાણ' : 'ખરીદી'}
                                            </span>
                                        </td>
                                        <td>{row.entity}</td>
                                        <td style={{ fontWeight: '500' }}>{row.item}</td>
                                        <td className="text-right stock-number">{row.qty.toFixed(2)}</td>
                                        <td className="text-right">{row.amount ? row.amount.toFixed(2) : '0.00'}</td>
                                        <td className={`text-right ${row.changeType === 'positive' ? 'audit-positive' : 'audit-negative'}`}>
                                            {row.changeType === 'positive' ? '+' : '-'}{row.qty.toFixed(2)}
                                        </td>
                                        <td className="text-center">
                                            <button 
                                                className="btn-remove" 
                                                onClick={() => handleDelete(row)} 
                                                title="Delete Transaction"
                                            >
                                                &times;
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AuditTrail;