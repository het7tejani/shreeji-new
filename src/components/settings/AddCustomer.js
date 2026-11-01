import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../../api';

const AddCustomer = () => {
    // Shared State
    const [activeTab, setActiveTab] = useState('single');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Single Entry State
    const [name, setName] = useState('');
    const [mobileNumber, setMobileNumber] = useState('');
    const [address, setAddress] = useState('');
    const [category, setCategory] = useState('Retail');
    const [notes, setNotes] = useState('');

    // Bulk Upload State
    const [bulkData, setBulkData] = useState([]);
    const [fileName, setFileName] = useState('');
    const fileInputRef = useRef(null);

    // Auto-dismiss message
    useEffect(() => {
        if (message.text) {
            const timer = setTimeout(() => {
                setMessage({ type: '', text: '' });
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    const handleSingleSubmit = async (e) => {
        e.preventDefault();
        if (!name || !mobileNumber) {
            setMessage({ type: 'error', text: 'નામ અને મોબાઈલ નંબર જરૂરી છે.' });
            return;
        }
        if (mobileNumber.length !== 10) {
            setMessage({ type: 'error', text: 'મોબાઈલ નંબર ૧૦ અંકનો હોવો જોઈએ.' });
            return;
        }

        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const response = await apiFetch(`/api/customers/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, mobileNumber, address, notes, category })
            });

            const contentType = response.headers.get("content-type");
            let data;
            if (contentType && contentType.indexOf("application/json") !== -1) {
                data = await response.json();
            } else {
                const text = await response.text();
                throw new Error(text || "Server Error");
            }

            if (!response.ok) {
                throw new Error(data.msg || 'ગ્રાહક ઉમેરવામાં નિષ્ફળ.');
            }

            setMessage({ type: 'success', text: 'ગ્રાહક સફળતાપૂર્વક ઉમેરાયા!' });
            setName('');
            setMobileNumber('');
            setAddress('');
            setCategory('Retail');
            setNotes('');
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Basic extension check (CSV is best for Excel exports)
        if (!file.name.endsWith('.csv')) {
            setMessage({ type: 'error', text: 'કૃપા કરીને CSV ફાઇલ અપલોડ કરો (Excel માંથી Save As CSV કરો).' });
            return;
        }

        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            parseCSV(text);
        };
        reader.readAsText(file);
    };

    const parseCSV = (text) => {
        // Robust CSV splitter that handles commas in quotes (like in addresses)
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
        if (lines.length < 2) {
            setMessage({ type: 'error', text: 'ફાઈલ ખાલી છે અથવા હેડર નથી.' });
            return;
        }

        const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
        const rows = lines.slice(1).map(line => {
            // Regex to split by comma but ignore commas inside double quotes
            const columns = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            const rowData = {};
            headers.forEach((h, i) => {
                let val = columns[i] ? columns[i].trim() : "";
                // Remove leading/trailing quotes if present
                val = val.replace(/^["']|["']$/g, "");
                rowData[h] = val;
            });
            return rowData;
        });

        // Map standard fields: name, address, mobile
        const formatted = rows.map(r => {
            const nameVal = r.name || r['customer name'] || r['નામ'] || r['customer'] || "";
            const mobileVal = (r.mobile || r['mobile number'] || r['mobile_number'] || r['ફોન'] || r['phone'] || "").toString().replace(/[^0-9]/g, "");
            const addressVal = r.address || r['village'] || r['સરનામું'] || r['ગામ'] || r['location'] || "";
            
            return {
                name: nameVal,
                mobileNumber: mobileVal,
                address: addressVal,
                category: '-' // Category defaults to "-" as it's not in Excel and will be assigned later
            };
        }).filter(r => r.name && r.mobileNumber && r.mobileNumber.length === 10);

        if (formatted.length === 0) {
            setMessage({ type: 'error', text: 'કોઈ માન્ય ગ્રાહક ડેટા મળ્યો નથી. ખાતરી કરો કે હેડર "name", "mobile", "address" છે.' });
        } else {
            setBulkData(formatted);
            setMessage({ type: 'success', text: `${formatted.length} ગ્રાહકો મળ્યા. અપલોડ કરવા માટે નીચેના બટન પર ક્લિક કરો.` });
        }
    };

    const handleBulkSubmit = async () => {
        if (bulkData.length === 0) {
            alert("No valid data found in file.");
            return;
        }

        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const res = await apiFetch(`/api/customers/bulk-add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customers: bulkData })
            });

            const data = await res.json();
            if (res.ok) {
                setMessage({ 
                    type: 'success', 
                    text: `સફળતાપૂર્વક અપલોડ! સફળ: ${data.successCount}, બાકી: ${data.skipCount} (પહેલાથી હોઈ શકે છે)` 
                });
                setBulkData([]);
                setFileName('');
            } else {
                throw new Error(data.msg || "Upload failed");
            }
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div className="card">
                <h2 className="card-title">ગ્રાહક ઉમેરો (Add Customers)</h2>
                
                {/* Tabs */}
                <div className="tab-navigation" style={{ width: '100%', marginBottom: '1.5rem' }}>
                    <button 
                        className={`tab-btn ${activeTab === 'single' ? 'active' : ''}`}
                        onClick={() => setActiveTab('single')}
                        style={{ flex: 1 }}
                    >
                        એક ગ્રાહક (Single Entry)
                    </button>
                    <button 
                        className={`tab-btn ${activeTab === 'bulk' ? 'active' : ''}`}
                        onClick={() => setActiveTab('bulk')}
                        style={{ flex: 1 }}
                    >
                        બલ્ક અપલોડ (Bulk Upload)
                    </button>
                </div>

                {message.text && (
                    <div className={`toast-notification ${message.type}`} style={{position: 'static', width: '100%', marginBottom: '1.5rem', transform: 'none', marginTop: 0}}>
                        <span>{message.text}</span>
                    </div>
                )}

                {activeTab === 'single' ? (
                    <form className="settings-form" onSubmit={handleSingleSubmit}>
                        <div className="form-group">
                            <label htmlFor="name">ગ્રાહકનું નામ *</label>
                            <input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter Name"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="mobile">મોબાઈલ નંબર *</label>
                            <input
                                id="mobile"
                                type="tel"
                                maxLength="10"
                                value={mobileNumber}
                                onChange={(e) => setMobileNumber(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                                placeholder="10 Digit Mobile Number"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="address">સરનામું (ગામ)</label>
                            <input
                                id="address"
                                type="text"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="Enter Address"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="category">ગ્રાહકનો પ્રકાર (Category)</label>
                            <select
                                id="category"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                            >
                                <option value="Retail">Retail (છૂટક)</option>
                                <option value="Wholesale">Wholesale (જથ્થાબંધ)</option>
                                <option value="Retail - Whole">Whole Chili (આખું)</option>
                            </select>
                        </div>

                        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                            {loading ? 'Saving...' : 'Save Customer'}
                        </button>
                    </form>
                ) : (
                    <div className="bulk-upload-section">
                        <div className="upload-box" onClick={() => fileInputRef.current.click()} style={{ padding: '2.5rem', marginBottom: '1.5rem' }}>
                            <input 
                                type="file" 
                                accept=".csv" 
                                onChange={handleFileChange}
                                ref={fileInputRef}
                                style={{display: 'none'}}
                            />
                            <div className="upload-icon">📊</div>
                            {fileName ? (
                                <div style={{fontWeight: 600, color: 'var(--primary-color)'}}>{fileName}</div>
                            ) : (
                                <>
                                    <div style={{fontWeight: 600, fontSize: '1.1rem'}}>Click to Select CSV File</div>
                                    <div style={{fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem'}}>
                                        Excel માંથી "Save As CSV" કરેલી ફાઇલ અપલોડ કરો.
                                    </div>
                                    <div style={{fontSize: '0.75rem', marginTop: '1rem', color: 'var(--text-muted)'}}>
                                        Format: name, mobile, address
                                    </div>
                                </>
                            )}
                        </div>

                        {bulkData.length > 0 && (
                            <div className="preview-section">
                                <h4 style={{ marginBottom: '0.75rem' }}>Preview ({bulkData.length} records)</h4>
                                <div className="table-wrapper" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                                    <table className="styled-table" style={{ fontSize: '0.85rem' }}>
                                        <thead>
                                            <tr>
                                                <th>નામ</th>
                                                <th>મોબાઈલ</th>
                                                <th>ગામ</th>
                                                <th>પ્રકાર</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {bulkData.map((row, i) => (
                                                <tr key={i}>
                                                    <td>{row.name}</td>
                                                    <td>{row.mobileNumber}</td>
                                                    <td>{row.address}</td>
                                                    <td>{row.category}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                                    <button 
                                        className="btn btn-primary" 
                                        style={{ flex: 1 }} 
                                        onClick={handleBulkSubmit}
                                        disabled={loading}
                                    >
                                        {loading ? 'અપલોડ થઈ રહ્યું છે...' : `બધા (${bulkData.length}) ગ્રાહકો ઉમેરો`}
                                    </button>
                                    <button 
                                        className="btn btn-secondary" 
                                        onClick={() => { setBulkData([]); setFileName(''); }}
                                        disabled={loading}
                                    >
                                        રદ કરો
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AddCustomer;