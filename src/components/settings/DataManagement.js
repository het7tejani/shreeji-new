
import React, { useState } from 'react';
import PasswordPromptModal from '../PasswordPromptModal';
import { apiFetch } from '../../api';

const DataManagement = ({ user }) => {
    const [isResetting, setIsResetting] = useState(false);
    const [isPasswordPromptOpen, setIsPasswordPromptOpen] = useState(false);
    const [resetStep, setResetStep] = useState(0); // 0: Idle, 1: First Pass, 2: Second Pass

    const handleExportData = async () => {
        try {
          const response = await apiFetch(`/api/settings/export`);
          if (!response.ok) throw new Error('Export failed');
          
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          
          const contentDisposition = response.headers.get('Content-Disposition');
          let filename = `spice_manager_backup_${Date.now()}.json`;
          if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
            if (filenameMatch && filenameMatch.length === 2) {
              filename = filenameMatch[1];
            }
          }
          a.download = filename;
          
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        } catch (error) {
          console.error("Export error:", error);
          alert("Failed to export data.");
        }
    };

    const performResetApi = async () => {
        setIsResetting(true);
        try {
            const res = await apiFetch(`/api/settings/reset-financial-year`, {
                method: 'POST'
            });
            const data = await res.json();
            if (res.ok) {
                alert(data.msg);
            } else {
                throw new Error(data.msg || 'Reset failed');
            }
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setIsResetting(false);
            setResetStep(0);
        }
    };

    const initiateReset = () => {
        setResetStep(1);
        setIsPasswordPromptOpen(true);
    };

    const handleModalClose = () => {
        setIsPasswordPromptOpen(false);
        setResetStep(0);
    };

    const onPasswordVerified = () => {
        setIsPasswordPromptOpen(false);

        // Use setTimeout to allow modal render cycle to finish before blocking UI with alert
        setTimeout(() => {
            if (resetStep === 1) {
                // Step 1 Verified: Show Warnings
                const confirm1 = window.confirm("⚠️ ચેતવણી: શું તમે ખરેખર નવું નાણાકીય વર્ષ શરૂ કરવા માંગો છો?\n\nઆ પ્રક્રિયા:\n1. સ્ટોક 0 (શૂન્ય) કરશે.\n2. આવક/જાવક (Revenue) કાઉન્ટર 0 થી શરૂ થશે.\n\nગ્રાહકોના બાકી લેણાં અને જૂનો ઈતિહાસ ડિલીટ થશે નહીં.");
                
                if (confirm1) {
                    const confirm2 = window.confirm("DOUBLE CHECK: Are you absolutely sure?\n\nThis will RESET STOCK to 0 and REVENUE counters.\n\nClick OK to enter password ONE MORE TIME to confirm.");
                    if (confirm2) {
                        setResetStep(2);
                        setIsPasswordPromptOpen(true); // Ask for password again
                    } else {
                        setResetStep(0);
                    }
                } else {
                    setResetStep(0);
                }
            } else if (resetStep === 2) {
                // Step 2 Verified: Execute
                performResetApi();
            }
        }, 100);
    };

    return (
        <div style={{ maxWidth: '500px', margin: '0 auto' }}>
             <PasswordPromptModal
                isOpen={isPasswordPromptOpen}
                onClose={handleModalClose}
                onVerify={onPasswordVerified}
                user={user}
            />
            <div className="card" style={{height: 'auto', padding: '2rem'}}>
                <h2 className="card-title" style={{ textAlign: 'center' }}>ડેટા ડાઉનલોડ</h2>
                <p style={{marginBottom: '1.5rem'}}>તમારા ગ્રાહકો, વેચાણ, ખરીદીનો ઇતિહાસ અને સ્ટોક ડેટાનો સંપૂર્ણ બેકઅપ ડાઉનલોડ કરો..</p>
                <button className="btn btn-secondary" style={{width: '100%', marginBottom: '2rem'}} onClick={handleExportData}>
                    Export Database (JSON)
                </button>

                <hr style={{margin: '2rem 0', borderColor: 'var(--border-color)'}} />

                <h3 style={{color: 'var(--danger-text)', marginTop: 0}}>Danger Zone</h3>
                <p style={{fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem'}}>
                    વર્ષ પૂરું થતાં સ્ટોક અને આવક રીસેટ કરવા માટે. (ગ્રાહક ડેટા અને ઉધાર બાકી રહેશે)
                </p>
                <button 
                    className="btn btn-danger" 
                    style={{width: '100%'}} 
                    onClick={initiateReset}
                    disabled={isResetting}
                >
                    {isResetting ? 'Processing...' : 'Start New Financial Year (Reset Stock & Revenue)'}
                </button>
            </div>
        </div>
    );
};

export default DataManagement;
