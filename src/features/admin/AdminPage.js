import React from "react";
import { masterStoreList as initialStores, masterFlavourList as initialFlavours } from "../../assets/mockData";

export default function AdminPanel() {
    // State Management for Data
    const [stores, setStores] = React.useState(initialStores || []);
    const [flavours, setFlavours] = React.useState(initialFlavours || []);

    // Accordion Toggle States
    const [isStoreOpen, setIsStoreOpen] = React.useState(false);
    const [isFlavourOpen, setIsFlavourOpen] = React.useState(false);

    // Modal Visibility States
    const [isStoreModalOpen, setIsStoreModalOpen] = React.useState(false);
    const [isFlavourModalOpen, setIsFlavourModalOpen] = React.useState(false);

    // Form Field States
    const [storeForm, setStoreForm] = React.useState({ name: '', address: '' });
    const [flavourForm, setFlavourForm] = React.useState({ code: '', name: '', category: '', price: '', stock: '' });
    const [editingFlavourCode, setEditingFlavourCode] = React.useState(null); // Tracks if modal is in Edit mode
    const [flavourFilter, setFlavourFilter] = React.useState('');

    // --- STORE ACTIONS ---
    const handleStoreSubmit = (e) => {
        e.preventDefault();
        if (!storeForm.name || !storeForm.address) return;

        const newStore = {
            id: stores.length + 1, // Automatic sequential ID generation
            name: storeForm.name,
            address: storeForm.address,
            status: 'active' // Default status for new stores
        };

        setStores([...stores, newStore]);
        setStoreForm({ name: '', address: '' });
        setIsStoreModalOpen(false);
    };

    const handleStoreStatusToggle = (storeId) => {
        setStores(prevStores =>
            prevStores.map(store =>
                store.id === storeId
                    ? { ...store, status: store.status === 'active' ? 'inactive' : 'active' }
                    : store
            )
        );
    };

    // --- FLAVOUR ACTIONS ---
    const openAddFlavourModal = () => {
        setEditingFlavourCode(null);
        setFlavourForm({ code: '', name: '', category: 'Classic', price: '', stock: '' });
        setIsFlavourModalOpen(true);
    };

    const openEditFlavourModal = (flavour) => {
        setEditingFlavourCode(flavour.code);
        setFlavourForm({ ...flavour });
        setIsFlavourModalOpen(true);
    };

    const handleFlavourSubmit = (e) => {
        e.preventDefault();
        if (!flavourForm.name || !flavourForm.price || flavourForm.stock === '') return;

        if (editingFlavourCode) {
            // EDIT MODE
            setFlavours(prev => prev.map(f => f.code === editingFlavourCode ? {
                ...flavourForm,
                price: Number(flavourForm.price),
                stock: Number(flavourForm.stock)
            } : f));
        } else {
            // ADD NEW MODE
            const generatedCode = flavourForm.code.toUpperCase() || flavourForm.name.split(' ').map(w => w[0]).join('').toUpperCase();

            const newFlavour = {
                code: generatedCode,
                name: flavourForm.name,
                category: flavourForm.category,
                price: Number(flavourForm.price),
                stock: Number(flavourForm.stock)
            };
            setFlavours([...flavours, newFlavour]);
        }

        setIsFlavourModalOpen(false);
    };

    const filteredFlavours = React.useMemo(() => {
        if (!flavourFilter) {
            return flavours;
        }
        return flavours.filter(f =>
            f.name.toLowerCase().includes(flavourFilter.toLowerCase()) ||
            f.code.toLowerCase().includes(flavourFilter.toLowerCase()) ||
            f.category.toLowerCase().includes(flavourFilter.toLowerCase())
        );
    }, [flavours, flavourFilter]);

    return (
        <div className="container">
            <div className="page-head">
                <div>
                    <div className="crumb">System Settings</div>
                    <h1>Admin Management Panel</h1>
                </div>
            </div>

            {/* ================= ACCORDION 1: MASTER FLAVOUR LIST ================= */}
            <section className={`accordion ${isFlavourOpen ? 'open' : ''}`}>
                <div className="accordion-header" onClick={() => setIsFlavourOpen(!isFlavourOpen)}>
                    <span>Master Flavour List ({filteredFlavours.length} / {flavours.length})</span>
                    <div className="accordion-actions">
                        <button
                            className="btn-primary"
                            style={{ marginRight: '1rem' }}
                            onClick={(e) => { e.stopPropagation(); openAddFlavourModal(); }}
                        >
                            + Add New Flavour
                        </button>
                        <span>{isFlavourOpen ? '▲' : '▼'}</span>
                    </div>
                </div>

                {isFlavourOpen && (
                    <div className="accordion-content">
                        <div className="filters">
                            <div className="field">
                                <label>Filter by name, code, or category</label>
                                <input
                                    type="text"
                                    value={flavourFilter}
                                    onChange={(e) => setFlavourFilter(e.target.value)}
                                    placeholder="e.g. Mango, KP, Classic"
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                            <button className="btn-ghost" onClick={(e) => { e.stopPropagation(); setFlavourFilter(''); }}>Reset</button>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th style={{ width: '80px' }}>CODE</th>
                                    <th>FLAVOUR NAME</th>
                                    <th>CATEGORY</th>
                                    <th>PRICE (₹)</th>
                                    <th>STOCK BALANCE</th>
                                    <th style={{ textAlign: 'center', width: '100px' }}>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredFlavours.map((flavour) => (
                                    <tr key={flavour.code}>
                                        <td><span className="code-tag">{flavour.code}</span></td>
                                        <td><strong>{flavour.name}</strong></td>
                                        <td>{flavour.category}</td>
                                        <td>₹{flavour.price}</td>
                                        <td>
                                            <strong style={{ color: flavour.stock < 10 ? 'var(--orange)' : 'inherit' }}>
                                                {flavour.stock}
                                            </strong>
                                        </td>
                                        <td className="actions-cell" style={{ textAlign: 'center' }}>
                                            <button className="btn-icon" onClick={() => openEditFlavourModal(flavour)}>
                                                Edit
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* ================= ACCORDION 2: MASTER STORE LIST ================= */}
            <section className={`accordion ${isStoreOpen ? 'open' : ''}`}>
                <div className="accordion-header" onClick={() => setIsStoreOpen(!isStoreOpen)}>
                    <span>Master Store List ({stores.length})</span>
                    <div className="accordion-actions">
                        <button
                            className="btn-primary"
                            style={{ marginRight: '1rem' }}
                            onClick={(e) => { e.stopPropagation(); setIsStoreModalOpen(true); }}
                        >
                            + Add New Store
                        </button>
                        <span>{isStoreOpen ? '▲' : '▼'}</span>
                    </div>
                </div>

                {isStoreOpen && (
                    <div className="accordion-content">
                        <table>
                            <thead>
                                <tr>
                                    <th style={{ width: '80px' }}>ID</th>
                                    <th>STORE NAME</th>
                                    <th>ADDRESS LOCATION</th>
                                    <th style={{ width: '180px', textAlign: 'center' }}>STATUS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stores.map((store) => (
                                    <tr key={store.id}>
                                        <td><span className="code-tag">{store.id}</span></td>
                                        <td><strong>{store.name}</strong></td>
                                        <td>{store.address}</td>
                                        <td>
                                            {/* CUSTOM MODERN TOGGLE SLIDER SWITCH */}
                                            <div style={styles.toggleContainer}>
                                                <label style={styles.switchLabel}>
                                                    <input
                                                        type="checkbox"
                                                        style={styles.hiddenCheckbox}
                                                        checked={store.status === 'active'}
                                                        onChange={() => handleStoreStatusToggle(store.id)}
                                                    />
                                                    <span style={{
                                                        ...styles.sliderTrack,
                                                        backgroundColor: store.status === 'active' ? '#10b981' : '#cbd5e1'
                                                    }}>
                                                        <span style={{
                                                            ...styles.sliderThumb,
                                                            transform: store.status === 'active' ? 'translateX(18px)' : 'translateX(0px)'
                                                        }} />
                                                    </span>
                                                </label>
                                                <span style={{
                                                    ...styles.statusLabelText,
                                                    color: store.status === 'active' ? '#10b981' : '#64748b'
                                                }}>
                                                    {store.status === 'active' ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* ================= MODAL: ADD STORE ================= */}
            {isStoreModalOpen && (
                <div className="overlay open">
                    <div className="modal" style={{ width: '460px' }}>
                        <div className="modal-header">
                            <h2>Add New Retail Store</h2>
                        </div>
                        <div className="modal-sub">Enter the details for the new retail store.</div>
                        <form onSubmit={handleStoreSubmit}>
                            <div className="modal-body">
                                <div className="field" style={{ marginBottom: '1rem' }}>
                                    <label>Store Name *</label>
                                    <input
                                        type="text" required placeholder="e.g. Mohite Foods"
                                        value={storeForm.name} onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                                    />
                                </div>
                                <div className="field">
                                    <label>Address / Area *</label>
                                    <input
                                        type="text" required placeholder="e.g. Jalgaon"
                                        value={storeForm.address} onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-ghost" onClick={() => setIsStoreModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn-primary">Save Store</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ================= MODAL: ADD / EDIT FLAVOUR ================= */}
            {isFlavourModalOpen && (
                <div className="overlay open">
                    <div className="modal" style={{ width: '460px' }}>
                        <div className="modal-header">
                            <h2>{editingFlavourCode ? 'Edit Product Flavour' : 'Create New Flavour Item'}</h2>
                        </div>
                        <div className="modal-sub">Enter the details for the product flavour.</div>
                        <form onSubmit={handleFlavourSubmit}>
                            <div className="modal-body">
                                <div className="field" style={{ marginBottom: '1rem' }}>
                                    <label>Flavour Code</label>
                                    <input
                                        type="text"
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
                                    <div className="field">
                                        <label>Stock *</label>
                                        <input
                                            type="number" required min="0" placeholder="Kg"
                                            value={flavourForm.stock} onChange={(e) => setFlavourForm({ ...flavourForm, stock: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-ghost" onClick={() => setIsFlavourModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn-primary">
                                    {editingFlavourCode ? 'Save Changes' : 'Publish Flavour'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// Scoped inline CSS specifically tracking the toggle button node variations
const styles = {
    toggleContainer: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '12px',
        justifyContent: 'center',
        width: '100%'
    },
    switchLabel: {
        position: 'relative',
        display: 'inline-block',
        width: '38px',
        height: '20px',
        cursor: 'pointer',
        margin: 0
    },
    hiddenCheckbox: {
        opacity: 0,
        width: 0,
        height: 0,
        margin: 0,
        padding: 0
    },
    sliderTrack: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: '20px',
        transition: 'background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 3px'
    },
    sliderThumb: {
        height: '14px',
        width: '14px',
        borderRadius: '50%',
        backgroundColor: '#ffffff',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
        transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'block'
    },
    statusLabelText: {
        fontSize: '13px',
        fontWeight: '500',
        minWidth: '55px',
        textAlign: 'left',
        userSelect: 'none',
        transition: 'color 0.2s ease'
    }
};