
import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../api';

const CustomerList = () => {
    const [customers, setCustomers] = useState([]);
    const [loadingCustomers, setLoadingCustomers] = useState(false);
    const [customerSearch, setCustomerSearch] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        setLoadingCustomers(true);
        setError('');
        try {
            const response = await apiFetch(`/api/customers`);
            if (!response.ok) {
                throw new Error(`ગ્રાહકોને લાવવામાં નિષ્ફળ (Status: ${response.status})`);
            }
            const data = await response.json();
            setCustomers(data);
        } catch (err) {
            console.error(err);
            setError(err.message || 'ગ્રાહક સૂચિ દેખાઈ શકાતી નથી.');
        } finally {
            setLoadingCustomers(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (window.confirm(`ચેતવણી: ${name} ને ડિલીટ કરવાથી તેમનો તમામ ખરીદ/વેચાણ ઈતિહાસ અને ઉધાર ડેટા કાયમ માટે નાશ પામશે.\n\nશું તમે આગળ વધવા માંગો છો?`)) {
            try {
                const res = await apiFetch(`/api/customers/${id}`, { method: 'DELETE' });
                const data = await res.json();
                
                if (res.ok) {
                    alert('ગ્રાહક અને તેમનો ડેટા સફળતાપૂર્વક ડિલીટ થઈ ગયા.');
                    fetchCustomers();
                } else {
                    alert('Error: ' + (data.msg || 'ડિલીટ કરવામાં નિષ્ફળ.'));
                }
            } catch (err) {
                console.error(err);
                alert('Server error while deleting customer.');
            }
        }
    };

    const filteredCustomers = Array.isArray(customers) ? customers.filter(c => 
        (c.name && c.name.toLowerCase().includes(customerSearch.toLowerCase())) ||
        (c.mobileNumber && c.mobileNumber.includes(customerSearch))
    ) : [];

    const handleDownloadCSV = () => {
        const dataToExport = filteredCustomers.length > 0 ? filteredCustomers : customers;

        if (dataToExport.length === 0) {
            alert("No data to export.");
            return;
        }

        // Define CSV Headers
        const headers = ["Name", "Mobile Number", "Address (Gam)", "Category", "Notes"];

        // Map data to CSV rows
        const csvRows = [
            headers.join(','), // Join headers
            ...dataToExport.map(c => {
                // Helper to escape double quotes and wrap content in quotes
                const escape = (text) => text ? `"${text.toString().replace(/"/g, '""')}"` : "";
                
                return [
                    escape(c.name),
                    escape(c.mobileNumber), // Force string for mobile to avoid scientific notation in some viewers
                    escape(c.address),
                    escape(c.tags ? c.tags.join(', ') : ''),
                    escape(c.notes)
                ].join(',');
            })
        ];

        const csvString = csvRows.join('\n');
        
        // Add BOM (\uFEFF) so Excel recognizes it as UTF-8 (Critical for Gujarati)
        const blob = new Blob(["\uFEFF" + csvString], { type: 'text/csv;charset=utf-8;' });
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `customers_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="card" style={{ height: '80vh', display: 'flex', flexDirection: 'column' }}>
            <h2 className="card-title">ગ્રાહકોની યાદી</h2>
            
            {error && <div className="error-message" style={{marginBottom: '1rem'}}>{error}</div>}
            
            <div className="form-group" style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
                <input 
                    type="text" 
                    placeholder="Search by name or mobile number..." 
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    style={{ marginBottom: '0', flex: 1 }}
                />
                <button className="btn btn-secondary" onClick={fetchCustomers} disabled={loadingCustomers}>
                    Refresh
                </button>
                <button 
                    className="btn btn-primary" 
                    onClick={handleDownloadCSV} 
                    disabled={loadingCustomers || customers.length === 0}
                    title="Download as Excel/CSV"
                    style={{whiteSpace: 'nowrap'}}
                >
                    ⬇ Download List
                </button>
            </div>

            <div className="scrollable-content" style={{ flexGrow: 1, overflowY: 'auto' }}>
                {loadingCustomers ? <p style={{textAlign: 'center', padding: '2rem'}}>ગ્રાહક નિર્દેશિકા બતાવી કરી રહ્યું છે...</p> : (
                    <div className="table-wrapper">
                        <table className="styled-table">
                            <thead>
                                <tr>
                                    <th>નામ</th>
                                    <th>મોબાઈલ નંબર</th>
                                    <th>સરનામું/ગામ</th>
                                    <th>પ્રકાર</th>
                                    <th>લખાણ</th>
                                    <th className="text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCustomers.map(c => (
                                    <tr key={c._id}>
                                        <td style={{ fontWeight: '500' }}>{c.name}</td>
                                        <td>{c.mobileNumber}</td>
                                        <td>{c.address || '-'}</td>
                                        <td>
                                            {c.tags && c.tags.length > 0 ? c.tags.map(tag => (
                                                <span key={tag} className={`audit-badge ${tag === 'Retail' ? 'sale' : 'purchase'}`} style={{marginRight: '4px'}}>
                                                    {tag}
                                                </span>
                                            )) : '-'}
                                        </td>
                                        <td style={{ fontSize: '0.9rem', color: 'var(--text-light)' }}>{c.notes || '-'}</td>
                                        <td className="text-right">
                                            <button 
                                                className="btn-remove" 
                                                onClick={() => handleDelete(c._id, c.name)} 
                                                title="Delete Customer"
                                                style={{fontSize: '1.2rem'}}
                                            >
                                                &times;
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredCustomers.length === 0 && !error && (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                                            કોઈ ગ્રાહક મળ્યા નથી..
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            <div style={{ marginTop: '1rem', textAlign: 'right', fontSize: '0.9rem', color: 'var(--text-light)' }}>
                કુલ ગ્રાહકો: {filteredCustomers.length}
            </div>
        </div>
    );
};

export default CustomerList;
