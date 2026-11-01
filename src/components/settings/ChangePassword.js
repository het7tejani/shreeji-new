
import React, { useState } from 'react';
import { apiFetch } from '../../api';

const ChangePassword = ({ user }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        if (newPassword.length < 4) {
            setError('નવો પાસવર્ડ ઓછામાં ઓછો 4 અક્ષર લાંબો હોવો જોઈએ.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('નવા પાસવર્ડ મેળ ખાતો નથી..');
            return;
        }

        setIsProcessing(true);

        try {
            const response = await apiFetch(`/api/auth/change-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    username: user.username, 
                    currentPassword, 
                    newPassword 
                }),
            });

            // Robust JSON handling
            const contentType = response.headers.get("content-type");
            let data;
            if (contentType && contentType.indexOf("application/json") !== -1) {
                data = await response.json();
            } else {
                throw new Error("Server Error: Non-JSON response received.");
            }

            if (!response.ok) {
                throw new Error(data.msg || 'An error occurred.');
            }
            setSuccessMessage(data.msg);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            setError(err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div style={{ maxWidth: '500px', margin: '0 auto' }}>
            <div className="card">
                <h2 className="card-title">પાસવર્ડ બદલો</h2>
                <form className="settings-form" onSubmit={handlePasswordSubmit}>
                    {error && <p className="error-message">{error}</p>}
                    {successMessage && <p className="success-message">{successMessage}</p>}
                    
                    <div className="form-group">
                        <label htmlFor="current-password">હાલનો પાસવર્ડ દાખલ કરો</label>
                        <input
                            id="current-password"
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            required
                        />
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="new-password">નવો પાસવર્ડ દાખલ કરો</label>
                        <input
                            id="new-password"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirm-password">ફરીવાર નવો પાસવર્ડ દાખલ કરો</label>
                        <input
                            id="confirm-password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={isProcessing}>
                        {isProcessing ? 'Updating...' : 'Update Password'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChangePassword;