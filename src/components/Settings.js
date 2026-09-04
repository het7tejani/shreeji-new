
import React, { useState } from 'react';
import UpdateStock from './UpdateStock';
import ChangePassword from './settings/ChangePassword';
import ManageSpices from './settings/ManageSpices';
import WholesaleDues from './settings/WholesaleDues';
import CustomerList from './settings/CustomerList';
import KhedutList from './settings/KhedutList';
import AuditTrail from './settings/AuditTrail';
import DataManagement from './settings/DataManagement';
import Revenue from './settings/Revenue';
import AddCustomer from './settings/AddCustomer';
import WhatsAppMarketing from './settings/WhatsAppMarketing';
import PasswordPromptModal from './PasswordPromptModal';

const Settings = ({ user, onLogout, spices, onUpdateSpices }) => {
  const [activeTab, setActiveTab] = useState('stock'); // Default to stock
  const [isPasswordPromptOpen, setIsPasswordPromptOpen] = useState(false);
  const [pendingTab, setPendingTab] = useState(null);

  const handleLogoutClick = () => {
    if (window.confirm("શું તમે ખરેખર બહાર નીકળવા માંગો છો?")) {
      onLogout();
    }
  };

  const handleProtectedClick = (tabName) => {
      setPendingTab(tabName);
      setIsPasswordPromptOpen(true);
  };

  const onAuthorized = () => {
      if (pendingTab) {
          setActiveTab(pendingTab);
          setPendingTab(null);
      }
  };

  const renderContent = () => {
    switch (activeTab) {
        case 'revenue':
            return <Revenue />;
        case 'password':
            return <ChangePassword user={user} />;
        case 'stock':
            return (
                <div className="card">
                    <UpdateStock user={user} />
                </div>
            );
        case 'spices':
            return <ManageSpices spices={spices} onUpdateSpices={onUpdateSpices} user={user} />;
        case 'wholesale':
            return <WholesaleDues user={user} />;
        case 'data':
            return <DataManagement user={user} />;
        case 'customers':
            return <CustomerList />;
        case 'khedut':
            return <KhedutList />;
        case 'add-customer':
            return <AddCustomer />;
        case 'audit':
            return <AuditTrail />;
        case 'marketing':
            return <WhatsAppMarketing />;
        default:
            return null;
    }
  };

  return (
    <div className="settings-layout page-container">
      <PasswordPromptModal
          isOpen={isPasswordPromptOpen}
          onClose={() => { setIsPasswordPromptOpen(false); setPendingTab(null); }}
          onVerify={onAuthorized}
          user={user}
      />
      <div className="settings-sidebar card">
        <ul>
          <li>
            <button 
              className={`btn-link-menu ${activeTab === 'revenue' ? 'active' : ''}`} 
              onClick={() => handleProtectedClick('revenue')}
            >
              <strong>આવક/જાવક</strong>
            </button>
          </li>
          <li>
            <button 
              className={`btn-link-menu ${activeTab === 'marketing' ? 'active' : ''}`} 
              onClick={() => setActiveTab('marketing')}
            >
              <strong>વોટ્સએપ</strong>
            </button>
          </li>
          <li>
            <button 
              className={`btn-link-menu ${activeTab === 'stock' ? 'active' : ''}`} 
              onClick={() => setActiveTab('stock')}
            >
              <strong>સ્ટોક અપડેટ કરો</strong>
            </button>
          </li>
          <li>
            <button 
              className={`btn-link-menu ${activeTab === 'wholesale' ? 'active' : ''}`} 
              onClick={() => setActiveTab('wholesale')}
            >
              <strong>હોલસેલ ગ્રાહક - ઉધાર</strong>
            </button>
          </li>
          <li>
            <button 
              className={`btn-link-menu ${activeTab === 'spices' ? 'active' : ''}`} 
              onClick={() => setActiveTab('spices')}
            >
              <strong>મસાલા ઉમેરો/કાઢો</strong>
            </button>
          </li>
          <li>
            <button 
              className={`btn-link-menu ${activeTab === 'customers' ? 'active' : ''}`} 
              onClick={() => setActiveTab('customers')}
            >
              <strong>ગ્રાહકોની યાદી</strong>
            </button>
          </li>
          <li>
            <button 
              className={`btn-link-menu ${activeTab === 'khedut' ? 'active' : ''}`} 
              onClick={() => setActiveTab('khedut')}
            >
              <strong>ખેડૂતોની યાદી</strong>
            </button>
          </li>
          <li>
            <button 
              className={`btn-link-menu ${activeTab === 'add-customer' ? 'active' : ''}`} 
              onClick={() => setActiveTab('add-customer')}
            >
              <strong>નવા ગ્રાહક ઉમેરો</strong>
            </button>
          </li>
          <li>
            <button 
              className={`btn-link-menu ${activeTab === 'audit' ? 'active' : ''}`} 
              onClick={() => setActiveTab('audit')}
            >
              <strong>ખરીદ/વેચાણ યાદી</strong> 
            </button>
          </li>
          <li>
            <button 
              className={`btn-link-menu ${activeTab === 'password' ? 'active' : ''}`} 
              onClick={() => setActiveTab('password')}
            >
              <strong>પાસવર્ડ બદલો</strong>
            </button>
          </li>
          <li>
            <button 
              className={`btn-link-menu ${activeTab === 'data' ? 'active' : ''}`} 
              onClick={() => setActiveTab('data')}
            >
              <strong>ડેટા ડાઉનલોડ કરો </strong>
            </button>
          </li>
          <li>
            <hr style={{ margin: '1rem 0', border: 'none', borderTop: '1px solid var(--border-color)' }} />
          </li>
          <li>
            <button 
              className="btn-link-menu" 
              style={{ color: 'var(--danger-color)' }}
              onClick={handleLogoutClick}
            >
              Log out
            </button>
          </li>
        </ul>
      </div>
      <div className="settings-content">
        {renderContent()}
      </div>
    </div>
  );
};

export default Settings;
