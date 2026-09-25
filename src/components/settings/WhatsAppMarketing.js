
import React, { useState, useEffect, useRef } from 'react';
import API_BASE_URL from '../../apiConfig';

const WhatsAppMarketing = () => {
    const [customers, setCustomers] = useState([]);
    const [message, setMessage] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [imageBase64, setImageBase64] = useState(null); // For sending to API
    
    // Backend Status
    const [serverStatus, setServerStatus] = useState('LOADING'); // INITIALIZING, QR_READY, CONNECTING, READY, ERROR
    const [statusDetail, setStatusDetail] = useState('');
    const [qrCode, setQrCode] = useState(null);
    const [loadingCustomers, setLoadingCustomers] = useState(false);
    const [sending, setSending] = useState(false);
    
    const pollTimer = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchCustomers();
        checkStatus();
        
        // Poll status every 3 seconds
        pollTimer.current = setInterval(checkStatus, 3000);
        
        return () => {
            if (pollTimer.current) clearInterval(pollTimer.current);
        };
    }, []);

    const checkStatus = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/whatsapp/status`);
            if (res.ok) {
                const data = await res.json();
                setServerStatus(data.status);
                setStatusDetail(data.detail || '');
                if (data.status === 'QR_READY') {
                    setQrCode(data.qrCode);
                }
            } else if (res.status === 404) {
                 setServerStatus('BACKEND_NOT_UPDATED');
            }
        } catch (e) {
            console.error("Status check failed", e);
            // Don't set error state here to avoid flickering, just log it
        }
    };

    const fetchCustomers = async () => {
        setLoadingCustomers(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/customers`);
            if (!response.ok) throw new Error('Failed to fetch customers');
            const data = await response.json();
            
            // Filter valid mobile numbers
            const validCustomers = data
                .filter(c => c.mobileNumber && c.mobileNumber.length === 10)
                .map(c => ({
                    ...c,
                    selected: true
                }));
            
            setCustomers(validCustomers);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingCustomers(false);
        }
    };

    const handleDisconnect = async () => {
        if (!window.confirm("શું તમે ખરેખર WhatsApp બંધ કરવા માંગો છો? તમારે ફરીથી QR કોડ સ્કેન કરવો પડશે.")) return;
        
        setServerStatus('LOADING');
        try {
            await fetch(`${API_BASE_URL}/api/whatsapp/logout`, { method: 'POST' });
            // Status update will be picked up by next poll
        } catch (e) {
            console.error("Disconnect failed", e);
            alert("Failed to disconnect");
        }
    };

    const handleResetBot = async () => {
        if (!window.confirm("If you scan QR but it doesn't connect, use this.\nThis forces the server to restart the bot.\n\nContinue?")) return;

        setServerStatus('LOADING');
        try {
            await fetch(`${API_BASE_URL}/api/whatsapp/restart`, { method: 'POST' });
            alert("Bot is restarting. Please wait 1 minute for the QR code to appear.");
        } catch (e) {
            console.error("Restart failed", e);
            alert("Failed to restart bot");
        }
    };

    const handleSelectAll = (select) => {
        setCustomers(prev => prev.map(c => ({ ...c, selected: select })));
    };

    const handleImageChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedImage(file);
            
            // Convert to base64 for API
            const reader = new FileReader();
            reader.onloadend = () => {
                // whatsapp-web.js MessageMedia expects raw base64 without data prefix
                const base64String = reader.result.split(',')[1];
                setImageBase64({
                    mimetype: file.type,
                    data: base64String,
                    filename: file.name
                });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleOneClickSend = async () => {
        const selectedCustomers = customers.filter(c => c.selected);
        
        if (selectedCustomers.length === 0) {
            alert("કોઈ પણ ગ્રાહક પસંદ કરેલ નથી.");
            return;
        }
        if (!message && !selectedImage) {
            alert("મેસેજ લખો અથવા ફોટો પસંદ કરો.");
            return;
        }

        // Allow sending in CONNECTING state as well
        if (serverStatus !== 'READY' && serverStatus !== 'CONNECTING') {
            alert("WhatsApp તૈયાર નથી. કૃપા કરીને કનેક્શન ચકાસો.");
            return;
        }

        const confirmMsg = `તમે ${selectedCustomers.length} ગ્રાહકોને સંદેશા મોકલવા જઈ રહ્યા છો.\n\nApplication આ પ્રક્રિયા અદ્રશ્ય રીતે કરશે.\nશું તમને ખાતરી છે?`;
        
        if (!window.confirm(confirmMsg)) return;

        setSending(true);
        
        try {
            const payload = {
                numbers: selectedCustomers.map(c => c.mobileNumber),
                message: message,
                image: imageBase64
            };

            const res = await fetch(`${API_BASE_URL}/api/whatsapp/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.status === 404) {
                throw new Error("Backend Route Not Found. Make sure your local backend is running and apiConfig.js points to localhost.");
            }

            const data = await res.json();
            
            if (res.ok) {
                alert("Success! " + data.msg);
                setMessage('');
                setSelectedImage(null);
                setImageBase64(null);
            } else {
                alert("Error: " + data.msg);
            }
        } catch (err) {
            console.error(err);
            alert("Failed to initiate sending: " + err.message);
        } finally {
            setSending(false);
        }
    };

    // Render Logic based on Server Status
    if (serverStatus === 'BACKEND_NOT_UPDATED') {
        return (
            <div className="card" style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px'}}>
                <div style={{textAlign: 'center', color: 'var(--danger-text)'}}>
                    <h3>⚠️ API Route Missing</h3>
                    <p>Application હજુ સુધી WhatsApp સુવિધાઓને સપોર્ટ કરતું નથી.</p>
                    <p>If running locally, ensure <code>apiConfig.js</code> points to localhost.</p>
                </div>
            </div>
        );
    }
    
    // Show spinner ONLY for initial loading phases, NOT for CONNECTING (which means authenticated but syncing)
    if (serverStatus === 'INITIALIZING' || serverStatus === 'LOADING') {
        return (
            <div className="card" style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px'}}>
                <div style={{textAlign: 'center'}}>
                    <div className="spinner" style={{marginBottom: '1rem', fontSize: '2rem'}}>⏳</div>
                    <h3>જોડાણ થઈ રહ્યું છે...</h3>
                    <p>કૃપા કરીને રાહ જુઓ.</p>
                </div>
            </div>
        );
    }

    if (serverStatus === 'QR_READY' && qrCode) {
        return (
            <div className="card" style={{display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '400px'}}>
                <h2 className="card-title">તમારું વોટ્સઅપ જોડો.</h2>
                <p style={{marginBottom: '1.5rem', textAlign: 'center'}}>બધાને એકસાથે મેસેજ કરવા માટે તમારા WhatsApp વડે આ QR કોડ સ્કેન કરો.</p>
                <img src={qrCode} alt="Scan QR" style={{width: '264px', height: '264px', border: '1px solid #ccc'}} />
                <p style={{marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)'}}>રાહ જુઓ...</p>
                <button 
                    className="btn btn-sm btn-secondary" 
                    onClick={handleResetBot} 
                    style={{marginTop: '1rem'}}
                >
                    Stuck? Reset Bot
                </button>
            </div>
        );
    }

    if (serverStatus === 'ERROR') {
        return (
            <div className="card" style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px'}}>
                <div style={{textAlign: 'center', color: 'var(--danger-text)'}}>
                    <h3>⚠️ WhatsApp Error</h3>
                    <p>{statusDetail || 'Server પર WhatsApp શરૂ થઈ શક્યું નથી.'}</p>
                    <button className="btn btn-sm btn-secondary" onClick={handleResetBot} style={{marginTop: '1rem'}}>
                        Reset Bot
                    </button>
                </div>
            </div>
        );
    }

    // READY or CONNECTING STATE - Show full UI
    return (
        <div className="card" style={{ height: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                <h2 className="card-title" style={{margin: 0, border: 0}}>એકસાથે મેસેજ/ફોટા મોકલો</h2>
                <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
                    {serverStatus === 'CONNECTING' ? (
                        <span className="audit-badge sale">Syncing...</span>
                    ) : (
                        <span className="audit-badge purchase">Connected</span>
                    )}
                    <button className="btn btn-sm btn-danger" onClick={handleDisconnect}>Disconnect</button>
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
                <div className="form-group">
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows="4"
                        placeholder="તમારો મેસેજ અહીં લખો..."
                        style={{ resize: 'vertical' }}
                    />
                </div>
                
                <div className="form-group">
                    <div className="upload-box" onClick={() => fileInputRef.current.click()}>
                        <input 
                            type="file" 
                            accept="image/png, image/jpeg" 
                            onChange={handleImageChange}
                            ref={fileInputRef}
                            style={{display: 'none'}}
                        />
                        {selectedImage ? (
                            <>
                                <div className="upload-icon">🖼️</div>
                                <div style={{fontWeight: 600, color: 'var(--text-main)'}}>{selectedImage.name}</div>
                                <div style={{fontSize: '0.8rem', marginTop: '0.25rem'}}>Click to change</div>
                            </>
                        ) : (
                            <>
                                <div className="upload-icon">☁️</div>
                                <div style={{fontWeight: 500}}>Click to upload photo</div>
                                <div style={{fontSize: '0.8rem', opacity: 0.8}}>Supports JPG, PNG</div>
                            </>
                        )}
                    </div>
                </div>

                <div style={{margin: '1.5rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <h4 style={{margin: 0}}>ગ્રાહકો ({customers.filter(c => c.selected).length})</h4>
                    <div className="selection-controls" style={{display: 'flex', gap: '0.5rem'}}>
                        <button 
                            className="btn btn-sm btn-primary btn-pill" 
                            onClick={() => handleSelectAll(true)}
                        >
                            બધા
                        </button>
                        <button 
                            className="btn btn-sm btn-secondary btn-pill" 
                            onClick={() => handleSelectAll(false)}
                        >
                            રદ
                        </button>
                    </div>
                </div>

                <div className="marketing-queue-list">
                    {loadingCustomers ? <p style={{padding: '1rem'}}>ગ્રાહકો શોધી રહ્યા છીએ...</p> : (
                            customers.map(c => (
                            <div key={c._id} className="queue-item" onClick={() => {
                                const updated = customers.map(cust => cust._id === c._id ? {...cust, selected: !cust.selected} : cust);
                                setCustomers(updated);
                            }} style={{cursor: 'pointer'}}>
                                <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                                    <input 
                                        type="checkbox" 
                                        checked={c.selected} 
                                        onChange={() => {}} // Handled by div click
                                        className="round-checkbox"
                                        style={{margin: 0}}
                                    />
                                    <div>
                                        <div style={{fontWeight: 500}}>{c.name}</div>
                                        <div style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>{c.mobileNumber}</div>
                                    </div>
                                </div>
                            </div>
                            ))
                    )}
                </div>
            </div>

            <div className="floating-action-bar">
                <button 
                    className="btn btn-whatsapp" 
                    style={{width: '100%'}} 
                    onClick={handleOneClickSend} 
                    disabled={sending || customers.filter(c => c.selected).length === 0}
                >
                    {sending ? 'Sending to Queue...' : `Send to All (${customers.filter(c => c.selected).length})`}
                </button>
            </div>
        </div>
    );
};

export default WhatsAppMarketing;
