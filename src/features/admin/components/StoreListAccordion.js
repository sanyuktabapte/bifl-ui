import React from 'react';

const StoreListAccordion = ({ stores, isOpen, onToggle, onAddStore, onToggleStatus }) => {
    return (
        <section className={`accordion ${isOpen ? 'open' : ''}`}>
            <div className="accordion-header" onClick={onToggle}>
                <span>Master Store List ({stores.length})</span>
                <div className="accordion-actions">
                    <button
                        className="btn-primary"
                        style={{ marginRight: '1rem' }}
                        onClick={(e) => { e.stopPropagation(); onAddStore(); }}
                    >
                        + Add New Store
                    </button>
                    <span>{isOpen ? '▲' : '▼'}</span>
                </div>
            </div>

            {isOpen && (
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
                                        <div className="toggle-container">
                                            <label className="switch-label">
                                                <input
                                                    type="checkbox"
                                                    className="hidden-checkbox"
                                                    checked={store.status === 'active'}
                                                    onChange={() => onToggleStatus(store.id)}
                                                />
                                                <span 
                                                    className="slider-track"
                                                    style={{ backgroundColor: store.status === 'active' ? '#10b981' : '#cbd5e1' }}
                                                >
                                                    <span 
                                                        className="slider-thumb"
                                                        style={{ transform: store.status === 'active' ? 'translateX(18px)' : 'translateX(0px)' }} 
                                                    />
                                                </span>
                                            </label>
                                            <span 
                                                className="status-label-text"
                                                style={{ color: store.status === 'active' ? '#10b981' : '#64748b' }}
                                            >
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
    );
};

export default StoreListAccordion;
