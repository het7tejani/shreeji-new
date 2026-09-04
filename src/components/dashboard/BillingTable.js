
import React from 'react';

const BillingTable = ({ spices, items, onItemChange, pricePer20Kg }) => {
  const handleWheel = (e) => e.target.blur();

  return (
    <div className="table-wrapper">
      <table className="styled-table billing-table">
        <thead>
          <tr>
            <th style={{width: '40%'}}>મસાલા</th>
            <th style={{width: '20%'}} className="text-right">વજન (kg)</th>
            <th style={{width: '20%'}} className="text-right">
                {pricePer20Kg ? 'કિંમત/20kg (₹)' : 'કિંમત/kg (₹)'}
            </th>
            <th style={{width: '20%'}} className="text-right">કુલ રકમ (₹)</th>
          </tr>
        </thead>
        <tbody>
          {spices.map((spice, index) => {
            const isOutOfStock = spice.stock <= 0;
            const item = items[index] || {};
            const qty = parseFloat(item.quantityKg) || 0;
            const rate = parseFloat(item.amountPerKg) || 0;
            
            let total = qty * rate;
            if (pricePer20Kg) {
                total = (qty / 20) * rate;
            }

            return (
              <tr key={spice.id}>
                <td className={isOutOfStock ? 'out-of-stock' : ''}>
                  {spice.name} {isOutOfStock && `(Stock: ${spice.stock}kg)`}
                </td>
                <td>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    onWheel={handleWheel}
                    placeholder="0.00"
                    disabled={isOutOfStock}
                    value={item.quantityKg ?? ''}
                    onChange={(e) => onItemChange(index, 'quantityKg', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min="0"
                    onWheel={handleWheel}
                    placeholder="0.00"
                    disabled={isOutOfStock}
                    value={item.amountPerKg ?? ''}
                    onChange={(e) => onItemChange(index, 'amountPerKg', e.target.value)}
                  />
                </td>
                <td className="text-right">
                  <span className="item-total">
                    {total.toFixed(2)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default BillingTable;
