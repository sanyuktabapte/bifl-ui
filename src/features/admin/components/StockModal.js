import React from 'react';

const StockModal = ({
    isOpen,
    stockForm,
    setStockForm,
    onSubmit,
    onClose
}) => {
    if (!isOpen) return null;

    return (
        <div className="overlay open">
            <div className="modal" style={{ width: '400px' }}>
                <div className="modal-header">
                    <h2>Edit Master Stock</h2>
                </div>
                <div className="modal-sub">Update physical stock quantities for <strong>{stockForm.name} ({stockForm.code})</strong>.</div>
                <form onSubmit={onSubmit}>
                    <div className="modal-body">
                        <div className="row">
                            <div className="field">
                                <label>Factory Stock *</label>
                                <input
                                    type="number" required min="0" placeholder="Kg"
                                    value={stockForm.factoryStock} onChange={(e) => setStockForm({ ...stockForm, factoryStock: e.target.value })}
                                />
                            </div>
                            <div className="field">
                                <label>Cold Room Stock *</label>
                                <input
                                    type="number" required min="0" placeholder="Kg"
                                    value={stockForm.coldRoomStock} onChange={(e) => setStockForm({ ...stockForm, coldRoomStock: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn-primary">
                            Update Stock
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default StockModal;
