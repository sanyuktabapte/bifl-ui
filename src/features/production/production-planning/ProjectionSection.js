import React, { useState, useMemo } from 'react';
import AutocompleteInput from '../../../components/common/AutocompleteInput';

const ProjectionSection = ({
    isOpen,
    toggleAccordion,
    projectionMatrix,
    allFlavors,
    masterFlavours = [],
    totals,
    handleProductionChange,
    targetBatchNo = '',
    handleTargetBatchChange,
    handleBatchNumberChange,
    handleAddSurplusFlavour,
    handleRemoveSurplusFlavour,
    allBatches = [],
    availableBatches = [],
    handleGeneratePlan,
    handleReset,
    editingPlan,
    handleCancelEdit,
}) => {
    const [isAddingSurplus, setIsAddingSurplus] = useState(false);

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

    // Calculate planned dols per batch in UI for live available sticker deduction
    const batchPlannedDolsMap = useMemo(() => {
        const plannedMap = {};
        Object.keys(projectionMatrix).forEach(f => {
            const item = projectionMatrix[f];
            const prodKg = Number(item.production) || 0;
            if (prodKg > 0) {
                const b = (item.batchNumber ? String(item.batchNumber).trim() : (targetBatchNo ? String(targetBatchNo).trim() : '')) || '';
                if (b) {
                    const dols = Math.ceil(prodKg / 3);
                    plannedMap[b] = (plannedMap[b] || 0) + dols;
                }
            }
        });
        return plannedMap;
    }, [projectionMatrix, targetBatchNo]);

    // Calculate live dynamic remaining available / pending stickers for available batches
    const availableBatchesDynamic = useMemo(() => {
        if (!allBatches || allBatches.length === 0) return [];
        return allBatches
            .filter(b => (Number(b.available) || 0) > 0)
            .map(b => {
                const originalAvail = Number(b.available) || 0;
                const plannedDols = batchPlannedDolsMap[String(b.batchNumber).trim()] || 0;
                const remainingAvail = Math.max(0, originalAvail - plannedDols);
                const pendingDols = Math.max(0, plannedDols - originalAvail);
                return {
                    ...b,
                    originalAvail,
                    remainingAvail,
                    pendingDols
                };
            });
    }, [allBatches, batchPlannedDolsMap]);

    // Calculate planned batches summary for live badge display in generator bar
    const plannedBatchesSummary = useMemo(() => {
        const summary = {};
        Object.keys(projectionMatrix).forEach(f => {
            const item = projectionMatrix[f];
            const prod = Number(item.production) || 0;
            if (prod > 0) {
                const b = (item.batchNumber ? String(item.batchNumber).trim() : (targetBatchNo ? String(targetBatchNo).trim() : '')) || 'Unassigned';
                if (!summary[b]) {
                    summary[b] = { kg: 0, count: 0 };
                }
                summary[b].kg += prod;
                summary[b].count += 1;
            }
        });
        return summary;
    }, [projectionMatrix, targetBatchNo]);

    // Filter flavours: if (inProcess + coldRoomStock) >= orderVol (and production <= 0), do not show in projection unless it's a surplus row
    const visibleFlavours = useMemo(() => {
        return Object.keys(projectionMatrix).filter(f => {
            const data = projectionMatrix[f];
            if (!data) return false;
            if (data.isSurplus) return true;
            const coldRoom = Number(data.coldRoomStock) || 0;
            const inProc = Number(data.inProcess) || 0;
            const orderVol = Number(data.orderVol) || 0;
            const hasProduction = (Number(data.production) || 0) > 0;

            const isShortfall = (coldRoom + inProc) < orderVol;
            return isShortfall || hasProduction;
        });
    }, [projectionMatrix]);

    // List of master flavours available for surplus production
    const availableSurplusFlavours = useMemo(() => {
        if (!masterFlavours || masterFlavours.length === 0) return [];
        const currentSet = new Set(visibleFlavours.map(f => f.toLowerCase()));
        return masterFlavours.filter(mf => !currentSet.has(mf.name.toLowerCase()) && !currentSet.has((mf.code || '').toLowerCase()));
    }, [masterFlavours, visibleFlavours]);

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
                            type="button"
                            className="btn-ghost"
                            onClick={handleCancelEdit}
                            style={{ fontSize: '12px', color: '#92400E', padding: '4px 8px', fontWeight: 600 }}
                        >
                            ✕ Cancel Edit
                        </button>
                    </div>
                )}

                {visibleFlavours.length === 0 && !isAddingSurplus ? (
                    <div className="empty-state" style={{ padding: '24px 16px', textAlign: 'center' }}>
                        <div style={{ marginBottom: '12px', color: 'var(--ink-soft)' }}>No pending orders or stock shortfalls</div>
                        <button
                            type="button"
                            className="btn-ghost"
                            onClick={() => setIsAddingSurplus(true)}
                            style={{
                                fontSize: '12px',
                                color: '#2563EB',
                                padding: '6px 14px',
                                fontWeight: 700,
                                border: '1px dashed #BFDBFE',
                                borderRadius: '6px',
                                background: '#EFF6FF'
                            }}
                        >
                            + Add Flavour for Surplus Production
                        </button>
                    </div>
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
                                        <th className="main-col-header" style={{ width: '110px' }}>Batch No.</th>
                                        <th rowSpan="2" style={{ width: '38px' }}></th>
                                    </tr>
                                    <tr>
                                        <th className="main-col-start" style={{ width: '85px' }}>Factory</th>
                                        <th className="sub-col" style={{ width: '85px' }}>Cold Room</th>
                                        <th className="sub-col" style={{ width: '85px' }}>In Process</th>
                                        <th className="main-col-start" style={{ width: '90px' }}>KG</th>
                                        <th className="main-col-start" style={{ width: '90px' }}>KG</th>
                                        <th className="main-col-start" style={{ width: '90px' }}>KG</th>
                                        <th className="main-col-start" style={{ width: '110px' }}>Target</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visibleFlavours.map((f, index) => {
                                        const data = projectionMatrix[f];
                                        if (!data) return null;
                                        const closing = (data.opening || 0) + (data.coldRoomStock || 0) + (data.inProcess || 0) + (Number(data.production) || 0) - (Number(data.orderVol) || 0);

                                        const hasProduction = (Number(data.production) || 0) > 0;
                                        const isMissingBatch = hasProduction && (!data.batchNumber || String(data.batchNumber).trim() === '');

                                        return (
                                            <tr key={f} style={{ background: data.isSurplus ? '#F8FAFC' : 'inherit' }}>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <strong>{f}</strong>
                                                        {data.isSurplus && (
                                                            <span style={{
                                                                fontSize: '10px',
                                                                fontWeight: 700,
                                                                background: '#EFF6FF',
                                                                color: '#1E40AF',
                                                                padding: '1px 5px',
                                                                borderRadius: '4px',
                                                                border: '1px solid #BFDBFE',
                                                                textTransform: 'uppercase'
                                                            }}>
                                                                Surplus
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="main-col-start">{data.opening || 0}</td>
                                                <td className="sub-col">{data.coldRoomStock || 0}</td>
                                                <td className="sub-col" style={{ color: '#EAB308', fontWeight: 600 }}>{data.inProcess || 0}</td>
                                                <td className="main-col-start" style={{ color: data.isSurplus ? 'var(--ink-soft)' : '#2563EB', fontWeight: 600 }}>
                                                    {data.isSurplus ? (
                                                        <span>0 <small style={{ color: 'var(--ink-soft)' }}>kg</small></span>
                                                    ) : (
                                                        data.orderVol
                                                    )}
                                                </td>
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
                                                <td className="main-col-start">
                                                    <input
                                                        type="text"
                                                        value={data.batchNumber || ''}
                                                        onChange={(e) => handleBatchNumberChange(f, e.target.value)}
                                                        className="table-input"
                                                        placeholder=""
                                                        style={{
                                                            textAlign: 'center',
                                                            fontWeight: 700,
                                                            color: data.batchNumber ? '#1E40AF' : 'inherit',
                                                            background: isMissingBatch ? '#FEF2F2' : 'inherit',
                                                            borderColor: isMissingBatch ? '#EF4444' : undefined
                                                        }}
                                                    />
                                                </td>
                                                <td style={{ textAlign: 'center', padding: '4px' }}>
                                                    {data.isSurplus ? (
                                                        <button
                                                            type="button"
                                                            className="rm-row"
                                                            onClick={() => handleRemoveSurplusFlavour && handleRemoveSurplusFlavour(f)}
                                                            style={{ fontSize: '13px', color: '#DC2626', cursor: 'pointer' }}
                                                            title="Remove surplus flavour"
                                                        >
                                                            ✕
                                                        </button>
                                                    ) : null}
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {/* + Add Flavour for Surplus Production Row */}
                                    <tr style={{ background: '#FAFBFD', borderTop: '1px dashed #CBD5E1' }}>
                                        <td colSpan="9" style={{ padding: '8px 12px' }}>
                                            {!isAddingSurplus ? (
                                                <button
                                                    type="button"
                                                    className="btn-ghost"
                                                    onClick={() => setIsAddingSurplus(true)}
                                                    style={{
                                                        fontSize: '12px',
                                                        color: '#2563EB',
                                                        padding: '4px 10px',
                                                        fontWeight: 700,
                                                        border: '1px dashed #BFDBFE',
                                                        borderRadius: '6px',
                                                        background: '#EFF6FF',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px'
                                                    }}
                                                >
                                                    + Add Flavour for Surplus Production
                                                </button>
                                            ) : (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '440px' }}>
                                                    <div style={{ flex: 1 }}>
                                                        <AutocompleteInput
                                                            items={availableSurplusFlavours}
                                                            placeholder="Search & select master flavour for surplus..."
                                                            onChange={(val, selectedObj) => {
                                                                if (selectedObj) {
                                                                    handleAddSurplusFlavour && handleAddSurplusFlavour(selectedObj);
                                                                    setIsAddingSurplus(false);
                                                                } else if (typeof val === 'string' && val.trim()) {
                                                                    const matched = availableSurplusFlavours.find(mf => mf.name.toLowerCase() === val.trim().toLowerCase() || mf.code?.toLowerCase() === val.trim().toLowerCase());
                                                                    if (matched) {
                                                                        handleAddSurplusFlavour && handleAddSurplusFlavour(matched);
                                                                        setIsAddingSurplus(false);
                                                                    }
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="btn-ghost"
                                                        onClick={() => setIsAddingSurplus(false)}
                                                        style={{ fontSize: '12px', color: 'var(--ink-soft)', padding: '4px 8px' }}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                </tbody>
                                <tfoot>
                                    <tr className="totals-row">
                                        <td rowSpan="2"><strong>Total</strong></td>
                                        <td colSpan="3" className="main-col-start"><strong>{totals.totalOpen} kg</strong></td>
                                        <td className="main-col-start"><strong>{totals.totalOrder} kg</strong></td>
                                        <td className="main-col-start"><strong>{totals.totalClose} kg</strong></td>
                                        <td className="main-col-start"><strong>{totals.totalProd} kg</strong></td>
                                        <td colSpan="2" className="main-col-start"></td>
                                    </tr>
                                    <tr className="totals-row sub-total-row">
                                        <td colSpan="3" className="main-col-start"><strong>{totals.totalOpenDol} dol</strong></td>
                                        <td className="main-col-start"><strong>{totals.totalOrderDol} dol</strong></td>
                                        <td className="main-col-start"><strong>{totals.totalCloseDol} dol</strong></td>
                                        <td className="main-col-start"><strong>{totals.totalProdDol} dol</strong></td>
                                        <td colSpan="2" className="main-col-start"></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                )}

                {/* Bottom Control Bar with Target Batch, Dynamically Updated Available Batches, and Planning Batches */}
                <div className="generator-bar" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '16px',
                    marginTop: '16px',
                    padding: '12px 16px',
                    background: '#F8FAFC',
                    borderRadius: '8px',
                    border: '1px solid var(--line)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                        {/* Target Batch No. Input */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--navy)', whiteSpace: 'nowrap' }}>
                                Target Batch No.:
                            </label>
                            <input
                                type="text"
                                placeholder=""
                                value={targetBatchNo}
                                onChange={(e) => handleTargetBatchChange(e.target.value)}
                                style={{
                                    width: '95px',
                                    padding: '6px 10px',
                                    borderRadius: '6px',
                                    border: '1.5px solid var(--line)',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    color: 'var(--blue-deep)',
                                    textAlign: 'center',
                                    background: '#FFFFFF'
                                }}
                            />
                        </div>

                        {/* Available Batches Chips (Live Deducted UI Values & Deficit Tracking) */}
                        {availableBatchesDynamic.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>
                                    🏷️ Available:
                                </span>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                                    {availableBatchesDynamic.map(b => {
                                        const isSelected = targetBatchNo && String(b.batchNumber).toLowerCase() === String(targetBatchNo).toLowerCase();
                                        const hasDeficit = b.pendingDols > 0;
                                        const hasRemaining = b.remainingAvail > 0;

                                        let bg = '#FFFFFF';
                                        let textColor = '#1E40AF';
                                        let borderColor = '#BFDBFE';
                                        let badgeColor = '#2563EB';

                                        if (isSelected) {
                                            bg = hasDeficit ? '#DC2626' : '#1E40AF';
                                            textColor = '#FFFFFF';
                                            borderColor = hasDeficit ? '#DC2626' : '#1E40AF';
                                            badgeColor = '#FFFFFF';
                                        } else if (hasDeficit) {
                                            bg = '#FEF2F2';
                                            textColor = '#991B1B';
                                            borderColor = '#FCA5A5';
                                            badgeColor = '#DC2626';
                                        } else if (!hasRemaining) {
                                            bg = '#F1F5F9';
                                            textColor = '#64748B';
                                            borderColor = '#CBD5E1';
                                            badgeColor = '#94A3B8';
                                        }

                                        return (
                                            <button
                                                key={b.id || b.batchNumber}
                                                type="button"
                                                onClick={() => handleTargetBatchChange(b.batchNumber)}
                                                style={{
                                                    background: bg,
                                                    color: textColor,
                                                    border: `1px solid ${borderColor}`,
                                                    padding: '4px 9px',
                                                    borderRadius: '6px',
                                                    fontSize: '12px',
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '5px',
                                                    transition: 'all 0.15s ease'
                                                }}
                                                title={`Click to set Target Batch to #${b.batchNumber}`}
                                            >
                                                <span>🏷️ Batch {b.batchNumber}:</span>
                                                <span style={{ fontWeight: 700, color: badgeColor }}>
                                                    {hasDeficit ? `${b.pendingDols} pending` : b.remainingAvail}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Planning Batches Chips */}
                        {totalPlannedKg > 0 && Object.keys(plannedBatchesSummary).length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>
                                    Planning:
                                </span>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                                    {Object.entries(plannedBatchesSummary).map(([bNo, info]) => {
                                        const isUnassigned = bNo === 'Unassigned';
                                        const matchingBatch = allBatches?.find(b => String(b.batchNumber).trim().toLowerCase() === String(bNo).trim().toLowerCase());
                                        const isNew = !isUnassigned && (!matchingBatch || (Number(matchingBatch.totalStickers) || 0) === 0);
                                        const stickers = Math.ceil(info.kg / 3);

                                        let bg = '#EFF6FF';
                                        let textColor = '#1E40AF';
                                        let borderColor = '#BFDBFE';
                                        let subColor = '#2563EB';

                                        if (isUnassigned) {
                                            bg = '#FEF2F2';
                                            textColor = '#DC2626';
                                            borderColor = '#FCA5A5';
                                            subColor = '#DC2626';
                                        } else if (isNew) {
                                            bg = '#FAF5FF';
                                            textColor = '#7E22CE';
                                            borderColor = '#D8B4FE';
                                            subColor = '#9333EA';
                                        }

                                        return (
                                            <span
                                                key={bNo}
                                                style={{
                                                    background: bg,
                                                    color: textColor,
                                                    border: `1px solid ${borderColor}`,
                                                    padding: '4px 9px',
                                                    borderRadius: '6px',
                                                    fontSize: '12px',
                                                    fontWeight: 700,
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}
                                            >
                                                <span>
                                                    {isUnassigned ? '⚠️ Unassigned Batch' : isNew ? `✨ Batch ${bNo} (New)` : `🏷️ Batch ${bNo}`}
                                                </span>
                                                <span style={{ fontWeight: 500, fontSize: '11px', color: subColor }}>
                                                    ({stickers} dol / {info.kg} kg)
                                                </span>
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Generator Actions */}
                    <div className="generator-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        {editingPlan && (
                            <button
                                type="button"
                                className="btn-ghost"
                                onClick={handleCancelEdit}
                            >
                                Cancel Edit
                            </button>
                        )}
                        <button
                            type="button"
                            className="btn-primary"
                            onClick={handleGeneratePlan}
                            disabled={totalPlannedKg <= 0}
                            style={{ padding: '8px 20px', fontWeight: 700 }}
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