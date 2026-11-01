
import React, { useState, useEffect } from "react";
import { apiFetch } from '../api';

const UpdateStock = ({ user }) => {
  const [spices, setSpices] = useState([]);
  // Structure: { [id]: { addQty: '', pricePer20Kg: '' } }
  const [inputs, setInputs] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    fetchSpices();
  }, []);

  // Auto-dismiss message after 5 seconds
  useEffect(() => {
    let timer;
    if (message.text) {
      timer = setTimeout(() => {
        setMessage({ type: "", text: "" });
      }, 5000);
    }
    return () => clearTimeout(timer);
  }, [message]);

  const fetchSpices = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/spices`);
      const data = await res.json();
      setSpices(data);
      setInputs({}); // Reset inputs on fetch
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Failed to load spices." });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (id, field, value) => {
    setInputs((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const calculateRowTotal = (qty, price20) => {
    const q = parseFloat(qty) || 0;
    const p = parseFloat(price20) || 0;
    if (q <= 0 || p <= 0) return 0;
    return (q / 20) * p;
  };

  const performUpdate = async () => {
    setSaving(true);
    setMessage({ type: "", text: "" });

    // 1. Prepare items for the Purchase API
    const purchaseItems = [];
    let grandTotal = 0;

    spices.forEach((spice) => {
      const input = inputs[spice.id] || {};
      const qty = parseFloat(input.addQty) || 0;
      const price20 = parseFloat(input.pricePer20Kg) || 0;

      if (qty > 0) {
        // Calculate price per kg for backend consistency
        const pricePerKg = price20 > 0 ? price20 / 20 : 0;
        const total = calculateRowTotal(qty, price20);

        purchaseItems.push({
          spiceId: spice.id,
          spiceName: spice.name,
          quantityKg: qty,
          pricePerKg: pricePerKg,
          total: total
        });

        grandTotal += total;
      }
    });

    if (purchaseItems.length === 0) {
      setMessage({ type: "error", text: "Please enter quantity for at least one spice." });
      setSaving(false);
      return;
    }

    // 2. Construct Payload mimicking a Purchase to record investment
    const payload = {
        vendorName: "Manual Stock Adjustment", // Auto-assigned vendor
        vendorMobile: "",
        items: purchaseItems,
        grandTotal: grandTotal
    };

    try {
      // Using /purchase endpoint ensures stock is incremented ($inc) 
      // AND it creates a transaction record for Revenue calculation.
      const res = await apiFetch(`/api/spices/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Update failed");

      // Refresh data
      await fetchSpices();
      setMessage({ type: "success", text: "Stock added and investment recorded successfully!" });
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Failed to update stock." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  const totalInvestment = spices.reduce((acc, spice) => {
      const input = inputs[spice.id] || {};
      return acc + calculateRowTotal(input.addQty, input.pricePer20Kg);
  }, 0);

  return (
    <div>
      {message.text && (
        <div className={`toast-notification ${message.type}`}>
          <span>{message.text}</span>
          <button
            className="toast-close"
            onClick={() => setMessage({ type: "", text: "" })}
          >
            &times;
          </button>
        </div>
      )}
      <h2 className="card-title" style={{ textAlign: "center" }}>
        નવો સ્ટોક ઉમેરો 
      </h2>
      <p style={{textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '1rem'}}>
        અહીં ઉમેરેલ સ્ટોક "ખરીદી" તરીકે ગણવામાં આવશે.
      </p>

      <div className="table-wrapper">
        <table className="styled-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>મસાલાનું નામ</th>
              <th className="text-right">હાલનો સ્ટોક (kg)</th>
              <th className="text-right" style={{ width: "120px" }}>
                ઉમેરો (kg)
              </th>
              <th className="text-right" style={{ width: "120px" }}>
                ભાવ / 20kg
              </th>
              <th className="text-right">રોકાણ (₹)</th>
            </tr>
          </thead>
          <tbody>
            {spices.map((spice) => {
              const input = inputs[spice.id] || {};
              const rowTotal = calculateRowTotal(input.addQty, input.pricePer20Kg);

              return (
                <tr key={spice.id}>
                  <td>{spice.id}</td>
                  <td>{spice.name}</td>
                  <td className="text-right">{spice.stock}</td>
                  <td className="text-right">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0"
                      value={input.addQty || ''}
                      onChange={(e) =>
                        handleInputChange(spice.id, 'addQty', e.target.value)
                      }
                      onFocus={(e) => e.target.select()}
                      style={{
                        width: "100%",
                        padding: "0.5rem",
                        textAlign: "right",
                        border: "1px solid var(--border-color)",
                        borderRadius: "4px",
                      }}
                    />
                  </td>
                  <td className="text-right">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={input.pricePer20Kg || ''}
                      onChange={(e) =>
                        handleInputChange(spice.id, 'pricePer20Kg', e.target.value)
                      }
                      onFocus={(e) => e.target.select()}
                      style={{
                        width: "100%",
                        padding: "0.5rem",
                        textAlign: "right",
                        border: "1px solid var(--border-color)",
                        borderRadius: "4px",
                      }}
                    />
                  </td>
                  <td className="text-right" style={{fontWeight: 'bold', color: 'var(--primary-color)'}}>
                      {rowTotal > 0 ? rowTotal.toFixed(2) : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
              <tr style={{backgroundColor: 'var(--bg-hover)', fontWeight: 'bold'}}>
                  <td colSpan="5" className="text-right">કુલ રોકાણ :</td>
                  <td className="text-right" style={{fontSize: '1.1em', color: 'var(--primary-color)'}}>
                      {totalInvestment.toFixed(2)}
                  </td>
              </tr>
          </tfoot>
        </table>
      </div>
      <div style={{ marginTop: "1.5rem", textAlign: "right" }}>
        <button
          className="btn btn-primary"
          onClick={performUpdate}
          disabled={saving || totalInvestment <= 0}
        >
          {saving ? "Saving..." : "સ્ટોક ઉમેરો"}
        </button>
      </div>
    </div>
  );
};

export default UpdateStock;
