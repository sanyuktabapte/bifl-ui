import React from 'react';

const FlavourModal = ({
    isOpen,
    flavourForm,
    setFlavourForm,
    editingFlavourCode,
    onSubmit,
    onClose
}) => {
    if (!isOpen) return null;

    return (
        <div className="overlay open">
            <div className="modal" style={{ width: '460px' }}>
                <div className="modal-header">
                    <h2>{editingFlavourCode ? 'Edit Flavour' : 'Create New Flavour Item'}</h2>
                </div>
                <div className="modal-sub">Enter the details for the product flavour.</div>
                <form onSubmit={onSubmit}>
                    <div className="modal-body">
                        <div className="field" style={{ marginBottom: '1rem' }}>
                            <label>Flavour Code</label>
                            <input
                                type="text"
                                disabled={!!editingFlavourCode}
                                placeholder={editingFlavourCode ? "" : "e.g. LBC (Auto-generated if blank)"}
                                value={flavourForm.code} onChange={(e) => setFlavourForm({ ...flavourForm, code: e.target.value.toUpperCase() })}
                            />
                        </div>
                        <div className="field" style={{ marginBottom: '1rem' }}>
                            <label>Flavour Name *</label>
                            <input
                                type="text" required placeholder="e.g. Lotus Biscoff"
                                value={flavourForm.name} onChange={(e) => setFlavourForm({ ...flavourForm, name: e.target.value })}
                            />
                        </div>
                        <div className="field" style={{ marginBottom: '1rem' }}>
                            <label>Product Category</label>
                            <select
                                value={flavourForm.category}
                                onChange={(e) => setFlavourForm({ ...flavourForm, category: e.target.value })}
                            >
                                {['Classic', 'Fruit Fantasy', 'Premium Dryfruit', 'Royal', 'Chocolate & Brownie', 'Signature Edition'].map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <div className="row">
                            <div className="field">
                                <label>Base Price (₹) *</label>
                                <input
                                    type="number" required min="0" placeholder="Price"
                                    value={flavourForm.price} onChange={(e) => setFlavourForm({ ...flavourForm, price: e.target.value })}
                                />
                            </div>
                            {!editingFlavourCode && (
                                <div className="field">
                                    <label>Factory Stock *</label>
                                    <input
                                        type="number" required min="0" placeholder="Kg"
                                        value={flavourForm.factoryStock} onChange={(e) => setFlavourForm({ ...flavourForm, factoryStock: e.target.value })}
                                    />
                                </div>
                            )}
                        </div>
                        {!editingFlavourCode && (
                            <div className="field">
                                <label>Cold Room Stock *</label>
                                <input
                                    type="number" required min="0" placeholder="Kg"
                                    value={flavourForm.coldRoomStock} onChange={(e) => setFlavourForm({ ...flavourForm, coldRoomStock: e.target.value })}
                                />
                            </div>
                        )}
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn-primary">
                            {editingFlavourCode ? 'Save Changes' : 'Publish Flavour'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default FlavourModal;
