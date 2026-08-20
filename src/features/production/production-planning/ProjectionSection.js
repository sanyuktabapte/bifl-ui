import React, { useMemo } from 'react';

const ProjectionSection = ({
    isOpen,
    toggleAccordion,
    projectionMatrix,
    allFlavors,
    totals,
    handleProductionChange,
    availableBatches = [],
    handleGeneratePlan,
    handleReset,
    editingPlan,
    handleCancelEdit,
}) => {

    const handleKeyDown = (e, index) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const inputs = document.querySelectorAll('.projection-input');
            if (inputs && inputs.length > index + 1) {
                inputs[index + 1].focus();
            }
        }
    };

    const totalPlannedKg = totals.totalProd || 0;

    // Calculate FIFO allocation breakdown in real time with NA overflow support & Edit Mode preservation
    const fifoAllocation = useMemo(() => {
        const needed = Math.ceil(totalPlannedKg / 3);

        if (editingPlan) {
            const isNa = editingPlan.batchNumber === 'NA';
            return {
                parts: [{
                    batchNumber: editingPlan.batchNumber,
                    stickers: needed,
                    kg: totalPlannedKg,
                    isPending: isNa
                }],
                needed,
                totalAvailableStickers: needed,
                hasOverflow: isNa,
                isEditing: true
            };
        }

        const sorted = [...availableBatches]
            .filter(b => (Number(b.available) || 0) > 0)
            .sort((a, b) => {
                const dateA = new Date(a.createdDate).getTime();
                const dateB = new Date(b.createdDate).getTime();
                if (dateA !== dateB) return dateA - dateB;
                return (a.batchNumber || '').localeCompare(b.batchNumber || '');
            });

        const totalAvailableStickers = sorted.reduce((acc, b) => acc + (Number(b.available) || 0), 0);

        let remainingNeeded = needed;
        const parts = [];

        for (const b of sorted) {
            if (remainingNeeded <= 0) break;
            const take = Math.min(remainingNeeded, Number(b.available) || 0);
            if (take > 0) {
                parts.push({
                    batchNumber: b.batchNumber,
                    stickers: take,
                    kg: take * 3,
                    isPending: false
                });
                remainingNeeded -= take;
            }
        }

        // Any overflow is allocated to pseudo batch 'NA'
        if (remainingNeeded > 0) {
            parts.push({
                batchNumber: 'NA',
                stickers: remainingNeeded,
                kg: remainingNeeded * 3,
                isPending: true
            });
        }

        return { parts, needed, totalAvailableStickers, hasOverflow: remainingNeeded > 0, isEditing: false };
    }, [totalPlannedKg, availableBatches, editingPlan]);

    if (!isOpen) {
        return (
            <div className="accordion">
                <div className="accordion-header" onClick={() => toggleAccordion('projection')}>
                    <span>1. Projection</span>
                    <span>▼</span>
                </div>
            </div>
        );
    }

    return (
        <div className="accordion open">
            <div className="accordion-header" onClick={() => toggleAccordion('projection')}>
                <span>1. Projection</span>
                <div className="header-actions">
                    <button className="btn-header-action" onClick={(e) => {
                        e.stopPropagation();
                        handleReset();
                    }}>Reset</button>
                    <span>▲</span>
                </div>
            </div>
            <div className="accordion-content">
                {editingPlan && (
                    <div style={{
                        background: '#FEF3C7',
                        border: '1px solid #FCD34D',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '16px' }}>✏️</span>
                            <span style={{ fontWeight: 700, color: '#92400E', fontSize: '14px' }}>
                                Editing Blueprint: <strong>{editingPlan.batchNumber ? (String(editingPlan.batchNumber).startsWith('#') ? editingPlan.batchNumber : `#${editingPlan.batchNumber}`) : ''}</strong>
                            </span>
                            <span style={{ fontSize: '12px', color: '#B45309', background: '#FDE68A', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                                Batch Number Preserved
                            </span>
                        </div>
                        <button
                            className="btn-ghost"
                            onClick={handleCancelEdit}
                            style={{ fontSize: '12px', color: '#92400E', padding: '4px 8px', fontWeight: 600 }}
                        >
                            ✕ Cancel Edit
                        </button>
                    </div>
                )}

                {Object.keys(projectionMatrix).filter(f => projectionMatrix[f]?.orderVol > 0 || projectionMatrix[f]?.production > 0 || projectionMatrix[f]?.inProcess > 0).length === 0 ? (
                    <div className="empty-state">No pending orders</div>
                ) : (
                    <div>
                        <div className="table-responsive-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th rowSpan="2">Flavour</th>
                                        <th colSpan="3" className="main-col-header">Opening Stock</th>
                                        <th className="main-col-header">Order</th>
                                        <th className="main-col-header">Closing Stock</th>
                                        <th className="main-col-header">Production</th>
                                    </tr>
                                    <tr>
                                        <th className="main-col-start" style={{ width: '85px' }}>Factory</th>
                                        <th className="sub-col" style={{ width: '85px' }}>Cold Room</th>
                                        <th className="sub-col" style={{ width: '85px' }}>In Process</th>
                                        <th className="main-col-start" style={{ width: '90px' }}>KG</th>
                                        <th className="main-col-start" style={{ width: '90px' }}>KG</th>
                                        <th className="main-col-start" style={{ width: '90px' }}>KG</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.keys(projectionMatrix).map((f, index) => {
                                        const data = projectionMatrix[f];
                                        if (!data) return null;
                                        const closing = (data.opening || 0) + (data.coldRoomStock || 0) + (data.inProcess || 0) + (data.production || 0) - (data.orderVol || 0);

                                        if (data.orderVol <= 0 && data.production <= 0 && (data.inProcess || 0) <= 0) {
                                            return null;
                                        }

                                        return (
                                            <tr key={f}>
                                                <td><strong>{f}</strong></td>
                                                <td className="main-col-start">{data.opening || 0}</td>
                                                <td className="sub-col">{data.coldRoomStock || 0}</td>
                                                <td className="sub-col" style={{ color: '#EAB308', fontWeight: 600 }}>{data.inProcess || 0}</td>
                                                <td className="main-col-start" style={{ color: '#2563EB', fontWeight: 600 }}>{data.orderVol}</td>
                                                <td className="main-col-start" style={{ fontWeight: 600, color: closing >= 0 ? 'var(--green)' : 'var(--red)' }}>{closing}</td>
                                                <td className="main-col-start">
                                                    <input
                                                        type="number"
                                                        step="3"
                                                        value={data.production || ''}
                                                        onChange={(e) => handleProductionChange(f, e.target.value)}
                                                        onKeyDown={(e) => handleKeyDown(e, index)}
                                                        className="table-input projection-input"
                                                        placeholder="0"
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="totals-row">
                                        <td rowSpan="2"><strong>Total</strong></td>
                                        <td colSpan="3" className="main-col-start"><strong>{totals.totalOpen} kg</strong></td>
                                        <td className="main-col-start"><strong>{totals.totalOrder} kg</strong></td>
                                        <td className="main-col-start"><strong>{totals.totalClose} kg</strong></td>
                                        <td className="main-col-start"><strong>{totals.totalProd} kg</strong></td>
                                    </tr>
                                    <tr className="totals-row sub-total-row">
                                        <td colSpan="3" className="main-col-start"><strong>{totals.totalOpenDol} dol</strong></td>
                                        <td className="main-col-start"><strong>{totals.totalOrderDol} dol</strong></td>
                                        <td className="main-col-start"><strong>{totals.totalCloseDol} dol</strong></td>
                                        <td className="main-col-start"><strong>{totals.totalProdDol} dol</strong></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                )}
                <div className="generator-bar">
                    {/* Dynamic FIFO Allocation Preview */}
                    {totalPlannedKg > 0 ? (
                        <div style={{
                            padding: '10px 14px',
                            borderRadius: '8px',
                            background: '#EFF6FF',
                            border: '1px solid #BFDBFE',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            fontSize: '13px'
                        }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: 600, color: '#1E40AF' }}>
                                    {editingPlan ? '🔒 Preserved Batch Target :' : '⚡ Allocating Batches :'}
                                </span>
                                {fifoAllocation.parts.map((p, idx) => (
                                    <span
                                        key={p.batchNumber + '-' + idx}
                                        style={{
                                            background: p.isPending ? '#FEF2F2' : '#DBEAFE',
                                            color: p.isPending ? '#991B1B' : '#1E40AF',
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            fontWeight: 700,
                                            fontSize: '12px',
                                            border: p.isPending ? '1px solid #FCA5A5' : '1px solid #93C5FD',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        <span>{p.batchNumber ? (String(p.batchNumber).startsWith('#') ? p.batchNumber : `#${p.batchNumber}`) : ''}</span>
                                        <span style={{ fontWeight: 500, color: p.isPending ? '#DC2626' : '#2563EB' }}>
                                            ({p.stickers} {p.isPending ? 'stickers pending' : 'stickers'} / {p.kg} KG)
                                        </span>
                                        {idx < fifoAllocation.parts.length - 1 && <span style={{ marginLeft: '4px', color: '#64748B' }}>+</span>}
                                    </span>
                                ))}
                            </div>
                            {!editingPlan && fifoAllocation.hasOverflow && (
                                <div style={{ fontSize: '12px', color: '#B91C1C', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span>⚠️</span>
                                    <span>
                                        Available stickers ({fifoAllocation.totalAvailableStickers}) exhausted. Overflow will be assigned to pseudo batch <strong>#NA</strong> and tracked under Deficit on Batches Management.
                                    </span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="generator-hint">
                            💡 {editingPlan ? `Editing Blueprint ${editingPlan.batchNumber ? (String(editingPlan.batchNumber).startsWith('#') ? editingPlan.batchNumber : `#${editingPlan.batchNumber}`) : ''} — batch number will be preserved.` : 'Batch numbers would be assigned automatically'}
                        </div>
                    )}

                    <div className="generator-actions">
                        {editingPlan && (
                            <button
                                className="btn-ghost"
                                onClick={handleCancelEdit}
                            >
                                Cancel Edit
                            </button>
                        )}
                        <button
                            className="btn-primary"
                            onClick={handleGeneratePlan}
                            disabled={totalPlannedKg <= 0}
                        >
                            {editingPlan ? 'Update Blueprint 💾' : 'Generate Plan →'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default React.memo(ProjectionSection);