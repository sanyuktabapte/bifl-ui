import React from 'react';

const StoreModal = ({ isOpen, storeForm, setStoreForm, onSubmit, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="overlay open">
            <div className="modal" style={{ width: '460px' }}>
                <div className="modal-header">
                    <h2>Add New Retail Store</h2>
                </div>
                <div className="modal-sub">Enter the details for the new retail store.</div>
                <form onSubmit={onSubmit}>
                    <div className="modal-body">
                        <div className="field" style={{ marginBottom: '1rem' }}>
                            <label>Store Name *</label>
                            <input
                                type="text" required placeholder="e.g. Mohite Foods"
                                value={storeForm.name} onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                            />
                        </div>
                        <div className="field">
                            <label>Address Location *</label>
                            <input
                                type="text" required placeholder="e.g. Navi Mumbai"
                                value={storeForm.address} onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn-primary">Add Store</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default StoreModal;
