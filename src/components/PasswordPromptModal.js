
import React, { useState } from 'react';
import { apiFetch } from '../api';

const PasswordPromptModal = ({ isOpen, onClose, onVerify, user }) => {
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) {
    return null;
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!password) {
        setError('Password cannot be empty.');
        return;
    }
    setIsVerifying(true);
    setError('');

    try {
      const response = await apiFetch(`/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username, password }),
      }, { redirectOn401: false });

      // Check content type before parsing JSON to avoid crashes
      const contentType = response.headers.get("content-type");
      let errorData = {};
      
      if (contentType && contentType.indexOf("application/json") !== -1) {
         const data = await response.json();
         if (response.ok) {
             onVerify(); // Callback on success
             handleClose();
             return;
         }
         errorData = data;
      } else {
         // Handle non-JSON response (likely HTML 404/500)
         const text = await response.text();
         console.error("Server returned non-JSON:", text);
         throw new Error("Server Error: Received invalid response format.");
      }

      throw new Error(errorData.msg || 'Failed to verify password.');
      
    } catch (err) {
      setError(err.message);
    } finally {
      setIsVerifying(false);
    }
  };
  
  const handleClose = () => {
    setPassword('');
    setError('');
    setIsVerifying(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Authorization Required</h3>
        <p>Please enter your password to proceed.</p>
        <form onSubmit={handlePasswordSubmit}>
          <div className="form-group" style={{marginBottom: '0.5rem'}}>
            <label htmlFor="modal-password">Password</label>
            <input
              id="modal-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              disabled={isVerifying}
            />
          </div>
          {error && <p className="error-message">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={isVerifying}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isVerifying}>
              {isVerifying ? 'Verifying...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordPromptModal;