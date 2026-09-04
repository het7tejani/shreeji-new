
import React, { useState } from 'react';
import API_BASE_URL from '../../apiConfig';

const ManageSpices = ({ spices, onUpdateSpices, user }) => {
    const [newSpiceName, setNewSpiceName] = useState('');
    // Default is Ground, user cannot change it anymore as per requirement
    const newSpiceCategory = 'Ground';

    const handleAddSpice = async (e) => {
        e.preventDefault();
        if (!newSpiceName.trim()) return;
        
        try {
            const res = await fetch(`${API_BASE_URL}/api/spices/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newSpiceName, category: newSpiceCategory })
            });
            
            // Safe JSON check
            const contentType = res.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                throw new Error("Server returned invalid response. Try again.");
            }

            if (!res.ok) throw new Error('Failed to add spice');
            
            setNewSpiceName('');
            if (onUpdateSpices) onUpdateSpices();
            alert('Spice added successfully');
        } catch (err) {
            alert(err.message);
        }
    };

    const handleDeleteSpice = async (id, name) => {
        if (window.confirm(`Are you sure you want to delete ${name}? Historical records will be preserved.`)) {
            try {
                const res = await fetch(`${API_BASE_URL}/api/spices/${id}`, { method: 'DELETE' });
                
                // Safe JSON check
                const contentType = res.headers.get("content-type");
                if (!contentType || !contentType.includes("application/json")) {
                    throw new Error("Server returned invalid response.");
                }

                if (!res.ok) throw new Error('Failed to delete spice');
                if (onUpdateSpices) onUpdateSpices();
                alert('Spice deleted successfully');
            } catch (err) {
                alert(err.message);
            }
        }
    };

    return (
        <div className="card">
            <h2 className="card-title">Manage Spices</h2>
            <div className="table-wrapper">
                <table className="styled-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>મસાલાનું નામ</th>
                            <th>પ્રકાર</th>
                            <th>સ્ટોક (kg)</th>
                            <th className="text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {spices.map(spice => (
                            <tr key={spice.id}>
                                <td>{spice.id}</td>
                                <td>{spice.name}</td>
                                <td>
                                    <span className={`audit-badge ${spice.category === 'Whole' ? 'sale' : 'primary'}`}>
                                        {spice.category === 'Whole' ? 'આખું (Whole)' : 'દળેલું (Grind)'}
                                    </span>
                                </td>
                                <td>{spice.stock}</td>
                                <td className="text-right">
                                    <button className="btn-remove" onClick={() => handleDeleteSpice(spice.id, spice.name)} title="Delete Spice">
                                        &times;
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <form onSubmit={handleAddSpice} style={{marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem'}}>
                <h4 style={{marginTop: 0}}>નવા મસાલા ઉમેરો</h4>
                <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
                    <input 
                        type="text" 
                        placeholder="Enter spice name" 
                        value={newSpiceName} 
                        onChange={(e) => setNewSpiceName(e.target.value)}
                        required 
                        style={{flex: 1}}
                    />
                    <button type="submit" className="btn btn-primary">ઉમેરો</button>
                </div>
            </form>
        </div>
    );
};

export default ManageSpices;