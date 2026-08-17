import React from 'react';

const StockListAccordion = ({
    filteredStock,
    stockFilter,
    setStockFilter,
    isOpen,
    onToggle,
    onEditStock
}) => {
    return (
        <section className={`accordion ${isOpen ? 'open' : ''}`}>
            <div className="accordion-header" onClick={onToggle}>
                <span>Master Stock ({filteredStock.length})</span>
                <div className="accordion-actions">
                    <span>{isOpen ? '▲' : '▼'}</span>
                </div>
            </div>

            {isOpen && (
                <div className="accordion-content">
                    <div className="filters">
                        <div className="field">
                            <label>Filter by name or code</label>
                            <input
                                type="text"
                                value={stockFilter}
                                onChange={(e) => setStockFilter(e.target.value)}
                                placeholder="e.g. Mango, KP"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                        <button className="btn-ghost" onClick={(e) => { e.stopPropagation(); setStockFilter(''); }}>Reset</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px', padding: '16px' }}>
                        {filteredStock.map(flavour => {
                            const total = (flavour.factoryStock || 0) + (flavour.coldRoomStock || 0);
                            return (
                                <div key={flavour.code} style={{ padding: '12px 16px', background: '#fff', borderRadius: '8px', border: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <span style={{ fontWeight: '700', color: 'var(--navy)', marginRight: '6px' }}>{flavour.code}</span>
                                        <span style={{ color: 'var(--ink-soft)' }}>{flavour.name}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: '700', color: 'var(--blue)', fontSize: '14px' }}>{total} kg</div>
                                            <div style={{ fontSize: '11px', color: 'var(--ink-soft)', marginTop: '2px' }}>
                                                F: {flavour.factoryStock || 0} | CR: {flavour.coldRoomStock || 0}
                                            </div>
                                        </div>
                                        <button className="btn-icon" onClick={() => onEditStock(flavour)}>
                                            Edit
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </section>
    );
};

export default StockListAccordion;
