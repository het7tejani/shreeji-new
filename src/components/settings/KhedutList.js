
import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../../apiConfig';

const KhedutList = () => {
    const [kheduts, setKheduts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        fetchKheduts();
    }, []);

    const fetchKheduts = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await fetch(`${API_BASE_URL}/api/purchases/vendors`);
            if (!response.ok) {
                throw new Error(`Failed to fetch vendors (Status: ${response.status})`);
            }
            const data = await response.json();
            setKheduts(data);
        } catch (err) {
            console.error(err);
            setError(err.message || 'ખેડૂત યાદી દેખાઈ શકાતી નથી.');
        } finally {
            setLoading(false);
        }
    };

    const filteredKheduts = kheduts.filter(k => 
        (k.name && k.name.toLowerCase().includes(search.toLowerCase())) ||
        (k.mobile && k.mobile.includes(search))
    );

    const handleDownloadCSV = () => {
        if (filteredKheduts.length === 0) {
            alert("No data to export.");
            return;
        }

        const headers = ["Name (ખેડૂત)", "Mobile", "Address (સરનામું)", "Total Purchase (₹)", "Last Date", "Txn Count"];

        const csvRows = [
            headers.join(','),
            ...filteredKheduts.map(k => {
                const escape = (text) => text ? `"${text.toString().replace(/"/g, '""')}"` : "";
                return [
                    escape(k.name),
                    escape(k.mobile || '-'),
                    escape(k.address || '-'),
                    k.totalAmount.toFixed(2),
                    new Date(k.lastPurchaseDate).toLocaleDateString(),
                    k.purchaseCount
                ].join(',');
            })
        ];

        const csvString = csvRows.join('\n');
        const blob = new Blob(["\uFEFF" + csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `khedut_list_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="card" style={{ height: '80vh', display: 'flex', flexDirection: 'column' }}>
            <h2 className="card-title">ખેડૂતોની યાદી</h2>
            
            {error && <div className="error-message" style={{marginBottom: '1rem'}}>{error}</div>}
            
            <div className="form-group" style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
                <input 
                    type="text" 
                    placeholder="Search by name or mobile..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ marginBottom: '0', flex: 1 }}
                />
                <button className="btn btn-secondary" onClick={fetchKheduts} disabled={loading}>
                    Refresh
                </button>
                <button 
                    className="btn btn-primary" 
                    onClick={handleDownloadCSV} 
                    disabled={loading || kheduts.length === 0}
                    title="Download as CSV"
                    style={{whiteSpace: 'nowrap'}}
                >
                    ⬇ Download List
                </button>
            </div>

            <div className="scrollable-content" style={{ flexGrow: 1, overflowY: 'auto' }}>
                {loading ? <p style={{textAlign: 'center', padding: '2rem'}}>યાદી લોડ થઈ રહી છે...</p> : (
                    <div className="table-wrapper">
                        <table className="styled-table">
                            <thead>
                                <tr>
                                    <th>નામ</th>
                                    <th>મોબાઈલ નંબર</th>
                                    <th>સરનામું/ગામ</th>
                                    <th className="text-right">કુલ ખરીદી (₹)</th>
                                    <th className="text-center">છેલ્લી તારીખ</th>
                                    <th className="text-center">વ્યવહાર</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredKheduts.map((k, i) => (
                                    <tr key={i}>
                                        <td style={{ fontWeight: '500' }}>{k.name}</td>
                                        <td>{k.mobile || '-'}</td>
                                        <td>{k.address || '-'}</td>
                                        <td className="text-right" style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>
                                            {k.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="text-center" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                            {new Date(k.lastPurchaseDate).toLocaleDateString()}
                                        </td>
                                        <td className="text-center">
                                            <span className="audit-badge purchase">{k.purchaseCount}</span>
                                        </td>
                                    </tr>
                                ))}
                                {filteredKheduts.length === 0 && !error && (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                                            કોઈ ખેડૂત ડેટા મળ્યો નથી.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            <div style={{ marginTop: '1rem', textAlign: 'right', fontSize: '0.9rem', color: 'var(--text-light)' }}>
                કુલ ખેડૂત: {filteredKheduts.length} | કુલ ખરીદી: ₹{filteredKheduts.reduce((acc, k) => acc + k.totalAmount, 0).toLocaleString('en-IN')}
            </div>
        </div>
    );
};

export default KhedutList;
