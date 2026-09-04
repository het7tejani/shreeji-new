
import React from 'react';

const StockManagement = ({ spices }) => {
  return (
    <div className="page-container">
        <div className="card">
          <h2 className="card-title">સ્ટોકનું ટૂંકમાં વર્ણન</h2>
          <div className="scrollable-content">
            <div className="table-wrapper">
              <table className="styled-table">
                <thead>
                  <tr>
                    <th>મસાલા</th>
                    <th>પ્રકાર</th>
                    <th className="text-right">હાલનો જથ્થો (kg)</th>
                  </tr>
                </thead>
                <tbody>
                  {spices.map(spice => (
                    <tr key={spice.id}>
                      <td style={{ fontWeight: '500' }}>{spice.name}</td>
                      <td>
                        <span className={`audit-badge ${spice.category === 'Whole' ? 'sale' : 'purchase'}`}>
                            {spice.category === 'Whole' ? 'આખું (Whole)' : 'દળેલું (Grind)'}
                        </span>
                      </td>
                      <td className="text-right stock-number" style={{ color: spice.stock < 10 ? 'var(--danger-text)' : 'inherit' }}>
                          {spice.stock.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
    </div>
  );
};

export default StockManagement;
