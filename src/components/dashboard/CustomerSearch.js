
import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../../api';

const CustomerSearch = ({ mobile, name, address, onFormChange, onCustomerSelect }) => {
  const [debouncedMobile, setDebouncedMobile] = useState('');
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [customerInputStep, setCustomerInputStep] = useState('name');
  const [isLoading, setIsLoading] = useState(false);
  const [foundCustomer, setFoundCustomer] = useState(null);
  
  const customerInfoInputRef = useRef(null);

  // Debounce mobile input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedMobile(mobile?.length === 10 ? mobile : '');
    }, 300);
    return () => clearTimeout(timer);
  }, [mobile]);

  // Focus management
  useEffect(() => {
    if (isNewCustomer && customerInputStep === 'address' && customerInfoInputRef.current) {
        customerInfoInputRef.current.focus();
    }
  }, [isNewCustomer, customerInputStep]);

  // Search Customer
  useEffect(() => {
    const search = async () => {
        if (!debouncedMobile) {
            setIsNewCustomer(false);
            setFoundCustomer(null);
            onCustomerSelect(null);
            return;
        }

        setIsLoading(true);
        try {
            const res = await apiFetch(`/api/customers/lookup/${debouncedMobile}`);
            if (res.ok) {
                const customer = await res.json();
                setFoundCustomer(customer);
                setIsNewCustomer(false);
                onFormChange('customerName', customer.name);
                onFormChange('customerAddress', customer.address || '');
                onCustomerSelect(customer);
            } else if (res.status === 404) {
                setFoundCustomer(null);
                setIsNewCustomer(true);
                onFormChange('customerName', '');
                onFormChange('customerAddress', '');
                setCustomerInputStep('name');
                onCustomerSelect(null);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };
    search();
  }, [debouncedMobile, onFormChange, onCustomerSelect]);

  const handleNewCustomerKeyDown = (e) => {
    if (e.key === 'Enter' && customerInputStep === 'name') {
      e.preventDefault();
      if (name?.trim()) {
        setCustomerInputStep('address');
      } else {
        alert('Please enter a name.');
      }
    }
  };

  const renderFields = () => {
    if (isLoading) {
        return (
            <div className="form-group">
              <label>ગ્રાહકની માહિતી</label>
              <div className="customer-info-display placeholder">શોધી રહ્યાં છે...</div>
            </div>
        );
    }

    if (foundCustomer) {
        return (
            <div className="customer-details-grid">
              <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>ગ્રાહકની માહિતી</label>
                  <div className="customer-info-display" style={{ height: '100%' }}>
                      <span>
                        <span style={{ fontWeight: 600 }}>{foundCustomer.name}</span>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-light)' }}> - {foundCustomer.address || 'સરનામું નથી'}</span>
                      </span>
                  </div>
              </div>
            </div>
        );
    }

    if (isNewCustomer) {
        return (
            <div className="form-group">
              <label htmlFor="customer-entry">
                {customerInputStep === 'name' ? 'ગ્રાહકનું નામ' : 'ગ્રાહકનું સરનામું'}
              </label>
              {customerInputStep === 'name' ? (
                  <input
                    id="customer-entry"
                    type="text"
                    placeholder="નામ લખો અને Enter દબાવો"
                    value={name}
                    onChange={(e) => onFormChange('customerName', e.target.value)}
                    onKeyDown={handleNewCustomerKeyDown}
                    autoFocus
                  />
              ) : (
                  <input
                    id="customer-entry"
                    ref={customerInfoInputRef}
                    type="text"
                    placeholder="સરનામું લખો"
                    value={address}
                    onChange={(e) => onFormChange('customerAddress', e.target.value)}
                  />
              )}
            </div>
        );
    }

    return (
        <div className="form-group">
            <label>ગ્રાહકની માહિતી</label>
            <div className="customer-info-display placeholder">ગ્રાહકની વિગતો શોધવા માટે મોબાઇલ નંબર દાખલ કરો</div>
        </div>
    );
  };

  return (
    <div className="card customer-details-card">
        <h2 className="card-title">ગ્રાહકની વિગતો</h2>
        <div className="form-group">
            <label htmlFor="customerMobile">ગ્રાહકનો મોબાઈલ નંબર</label>
            <input
                id="customerMobile"
                type="tel"
                placeholder="૧૦ અંકનો મોબાઇલ નંબર દાખલ કરો."
                maxLength="10"
                value={mobile}
                onChange={(e) => onFormChange('customerMobile', e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
            />
        </div>
        {renderFields()}
    </div>
  );
};

export default CustomerSearch;
