import React from 'react';

const FlavourListAccordion = ({
    flavours,
    filteredFlavours,
    flavourFilter,
    setFlavourFilter,
    isOpen,
    onToggle,
    onAddFlavour,
    onEditFlavour,
    onDeleteFlavour
}) => {
    return (
        <section className={`accordion ${isOpen ? 'open' : ''}`}>
            <div className="accordion-header" onClick={onToggle}>
                <span>Master Flavour List ({filteredFlavours.length})</span>
                <div className="accordion-actions">
                    <button
                        className="btn-primary"
                        style={{ marginRight: '1rem' }}
                        onClick={(e) => { e.stopPropagation(); onAddFlavour(); }}
                    >
                        + Add New Flavour
                    </button>
                    <span>{isOpen ? '▲' : '▼'}</span>
                </div>
            </div>

            {isOpen && (
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
                                <th style={{ textAlign: 'center', width: '80px' }}>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredFlavours.map((flavour) => (
                                <tr key={flavour.code}>
                                    <td><span className="code-tag">{flavour.code}</span></td>
                                    <td><strong>{flavour.name}</strong></td>
                                    <td>{flavour.category}</td>
                                    <td>₹{flavour.price}</td>
                                    <td className="actions-cell" style={{ textAlign: 'center', display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                                        <button className="btn-icon" onClick={() => onEditFlavour(flavour)}>
                                            Edit
                                        </button>
                                        <button className="btn-icon delete" onClick={() => onDeleteFlavour(flavour.code)}>
                                            Delete
                                        </button>
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

export default FlavourListAccordion;
