import React from 'react';

const BatchListAccordion = ({
    batches = [],
    filteredBatches = [],
    batchFilter = '',
    setBatchFilter,
    isOpen,
    onToggle
}) => {

    const formatBatchNo = (bNo) => {
        if (!bNo) return 'NA';
        const str = String(bNo).trim();
        return str.startsWith('#') ? str : `#${str}`;
    };

    const getStatusBadgeStyle = (status) => {
        switch (status) {
            case 'Available':
                return { background: '#DCFCE7', color: '#166534', border: '1px solid #BBF7D0' };
            case 'Active':
            case 'In Production':
                return { background: '#E0F2FE', color: '#0369A1', border: '1px solid #BAE6FD' };
            case 'Completed':
                return { background: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0' };
            case 'Pending':
                return { background: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA' };
            default:
                return { background: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB' };
        }
    };

    return (
        <section className={`accordion ${isOpen ? 'open' : ''}`}>
            <div className="accordion-header" onClick={onToggle}>
                <span>Master Batches ({filteredBatches.length})</span>
                <div className="accordion-actions">
                    <span>{isOpen ? '▲' : '▼'}</span>
                </div>
            </div>

            {isOpen && (
                <div className="accordion-content" style={{ padding: '20px' }}>
                    {/* Filter Bar */}
                    <div className="filters" style={{ marginBottom: '20px' }}>
                        <div className="field" style={{ flex: 1, maxWidth: '400px' }}>
                            <label>Filter by Batch Number or Flavour</label>
                            <input
                                type="text"
                                value={batchFilter}
                                onChange={(e) => setBatchFilter(e.target.value)}
                                placeholder="e.g. 100, Pineapple, KM"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                        {batchFilter && (
                            <button
                                className="btn-ghost"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setBatchFilter('');
                                }}
                            >
                                Reset
                            </button>
                        )}
                    </div>

                    {/* Batch Cards Grid / Stack */}
                    {filteredBatches.length === 0 ? (
                        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--ink-soft)', background: '#F8FAFC', borderRadius: '8px', border: '1px dashed var(--line)' }}>
                            No batches match the search criteria.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {filteredBatches.map((batch) => {
                                const totalDol = batch.totalDol || Math.floor((batch.totalKg || 0) / 3);
                                const totalConsumed = (batch.activeDols || 0) + (batch.completedDols || 0);

                                return (
                                    <div
                                        key={batch.id || batch.batchNumber}
                                        style={{
                                            background: '#ffffff',
                                            borderRadius: '10px',
                                            border: '1px solid var(--line)',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                            overflow: 'hidden'
                                        }}
                                    >
                                        {/* Batch Card Header */}
                                        <div
                                            style={{
                                                padding: '14px 20px',
                                                background: '#F8FAFC',
                                                borderBottom: '1px solid var(--line)',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                flexWrap: 'wrap',
                                                gap: '12px'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <span
                                                    style={{
                                                        fontSize: '16px',
                                                        fontWeight: '700',
                                                        color: 'var(--navy)',
                                                        letterSpacing: '-0.2px'
                                                    }}
                                                >
                                                    Batch {formatBatchNo(batch.batchNumber)}
                                                </span>
                                                <span
                                                    style={{
                                                        fontSize: '12px',
                                                        color: 'var(--ink-soft)',
                                                        background: '#fff',
                                                        padding: '3px 8px',
                                                        borderRadius: '4px',
                                                        border: '1px solid var(--line)'
                                                    }}
                                                >
                                                    📅 {batch.createdDate || 'NA'}
                                                </span>
                                                <span
                                                    style={{
                                                        padding: '3px 10px',
                                                        borderRadius: '12px',
                                                        fontSize: '11px',
                                                        fontWeight: '600',
                                                        ...getStatusBadgeStyle(batch.status)
                                                    }}
                                                >
                                                    {batch.status || 'Active'}
                                                </span>
                                            </div>

                                            {/* Summary Metrics Chips */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px' }}>
                                                <div>
                                                    <span style={{ color: 'var(--ink-soft)', marginRight: '4px' }}>Stickers:</span>
                                                    <strong style={{ color: 'var(--navy)' }}>{batch.totalStickers || 0}</strong>
                                                </div>
                                                <div>
                                                    <span style={{ color: 'var(--ink-soft)', marginRight: '4px' }}>Consumed:</span>
                                                    <strong style={{ color: '#0284C7' }}>{totalConsumed} dol</strong>
                                                </div>
                                                <div>
                                                    <span style={{ color: 'var(--ink-soft)', marginRight: '4px' }}>Available:</span>
                                                    <strong style={{ color: '#16A34A' }}>{batch.available || 0} dol</strong>
                                                </div>
                                                {batch.deficit > 0 && (
                                                    <div>
                                                        <span style={{ color: 'var(--ink-soft)', marginRight: '4px' }}>Pending:</span>
                                                        <strong style={{ color: '#DC2626' }}>{batch.deficit} dol</strong>
                                                    </div>
                                                )}
                                                <div>
                                                    <span style={{ color: 'var(--ink-soft)', marginRight: '4px' }}>Total Volume:</span>
                                                    <strong style={{ color: 'var(--navy)' }}>{batch.totalKg || 0} kg ({totalDol} dol)</strong>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Batch Flavour Items Table */}
                                        <div style={{ padding: '0' }}>
                                            {batch.flavours && batch.flavours.length > 0 ? (
                                                <table className="data-table" style={{ width: '100%', margin: 0, borderCollapse: 'collapse' }}>
                                                    <thead>
                                                        <tr style={{ background: '#FAFAFA', borderBottom: '1px solid var(--line)' }}>
                                                            <th style={{ width: '40px', textAlign: 'center', padding: '10px 12px', fontSize: '12px' }}>#</th>
                                                            <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '12px' }}>Flavour Code & Name</th>
                                                            <th style={{ textAlign: 'right', width: '130px', padding: '10px 12px', fontSize: '12px' }}>Quantity (KG)</th>
                                                            <th style={{ textAlign: 'right', width: '130px', padding: '10px 12px', fontSize: '12px' }}>Quantity (Dol)</th>
                                                            <th style={{ textAlign: 'right', width: '140px', padding: '10px 12px', fontSize: '12px' }}>Cold Room (KG)</th>
                                                            <th style={{ textAlign: 'center', width: '120px', padding: '10px 12px', fontSize: '12px' }}>Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {batch.flavours.map((fItem, fIdx) => (
                                                            <tr
                                                                key={fItem.flavourCode || fIdx}
                                                                style={{
                                                                    borderBottom: fIdx === batch.flavours.length - 1 ? 'none' : '1px solid #F1F5F9',
                                                                    background: fIdx % 2 === 0 ? '#ffffff' : '#FCFDFE'
                                                                }}
                                                            >
                                                                <td style={{ textAlign: 'center', color: 'var(--ink-soft)', fontSize: '12px', padding: '10px 12px' }}>
                                                                    {fIdx + 1}
                                                                </td>
                                                                <td style={{ padding: '10px 12px' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                        <span
                                                                            style={{
                                                                                fontWeight: '700',
                                                                                color: 'var(--navy)',
                                                                                background: '#F1F5F9',
                                                                                padding: '2px 6px',
                                                                                borderRadius: '4px',
                                                                                fontSize: '11px'
                                                                            }}
                                                                        >
                                                                            {fItem.flavourCode}
                                                                        </span>
                                                                        <span style={{ fontWeight: '500', color: 'var(--navy)', fontSize: '13px' }}>
                                                                            {fItem.flavourName || fItem.flavourCode}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                <td style={{ textAlign: 'right', fontWeight: '600', color: 'var(--navy)', fontSize: '13px', padding: '10px 12px' }}>
                                                                    {fItem.quantityKg || 0} kg
                                                                </td>
                                                                <td style={{ textAlign: 'right', fontWeight: '600', color: '#0284C7', fontSize: '13px', padding: '10px 12px' }}>
                                                                    {fItem.quantityDol || Math.floor((fItem.quantityKg || 0) / 3)} dol
                                                                </td>
                                                                <td style={{ textAlign: 'right', color: 'var(--ink-soft)', fontSize: '12px', padding: '10px 12px' }}>
                                                                    {fItem.coldRoomTransferKg || 0} kg
                                                                </td>
                                                                <td style={{ textAlign: 'center', padding: '10px 12px' }}>
                                                                    <span
                                                                        style={{
                                                                            padding: '2px 8px',
                                                                            borderRadius: '10px',
                                                                            fontSize: '11px',
                                                                            fontWeight: '500',
                                                                            ...getStatusBadgeStyle(fItem.status)
                                                                        }}
                                                                    >
                                                                        {fItem.status || 'Active'}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                    <tfoot>
                                                        <tr style={{ background: '#F8FAFC', borderTop: '1px solid var(--line)', fontWeight: '700' }}>
                                                            <td colSpan="2" style={{ textAlign: 'right', padding: '10px 12px', fontSize: '12px', color: 'var(--ink-soft)' }}>
                                                                Batch Total:
                                                            </td>
                                                            <td style={{ textAlign: 'right', padding: '10px 12px', fontSize: '13px', color: 'var(--navy)' }}>
                                                                {batch.totalKg || 0} kg
                                                            </td>
                                                            <td style={{ textAlign: 'right', padding: '10px 12px', fontSize: '13px', color: '#0284C7' }}>
                                                                {totalDol} dol
                                                            </td>
                                                            <td colSpan="2"></td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            ) : (
                                                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ink-soft)', fontSize: '13px', fontStyle: 'italic' }}>
                                                    No flavours produced or assigned under this batch yet.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </section>
    );
};

export default BatchListAccordion;
