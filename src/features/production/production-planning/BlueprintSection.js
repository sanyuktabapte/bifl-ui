import React from 'react';

const BlueprintSection = ({
    isOpen,
    toggleAccordion,
    plannedBatches,
    expandedBatches,
    toggleBatchBand,
    handleEditMatrix,
    handleDeleteBlueprint,
    handleActualProductionChange,
    handleBatchComplete
}) => {
    if (!isOpen) {
        return (
            <div className="accordion">
                <div className="accordion-header" onClick={() => toggleAccordion('blueprint')}>
                    <span>2. Production Plan Blueprint</span>
                    <span>▼</span>
                </div>
            </div>
        );
    }

    return (
        <div className="accordion">
            <div className="accordion-header" onClick={() => toggleAccordion('blueprint')}>
                <span>2. Production Plan Blueprint</span>
                <span>▲</span>
            </div>
            <div className="accordion-content">
                {Object.keys(plannedBatches).length === 0 ? (
                    <div className="empty-state">No blueprints generated yet.</div>
                ) : (
                    Object.keys(plannedBatches).map(bNo => {
                        // Calculate totals for this batch
                        const batchFlavours = plannedBatches[bNo].flavours;
                        const batchTotals = Object.values(batchFlavours).reduce((acc, item) => {
                            if (item) {
                                acc.targetKg += item.production || 0;
                                acc.actualKg += item.actualProduction || 0;
                            }
                            return acc;
                        }, { targetKg: 0, actualKg: 0 });

                        return (
                            <div key={bNo} className="batch-group">
                                <div className="batch-header" onClick={() => toggleBatchBand(bNo)}>
                                    <span>📦 Batch Blueprint: #{bNo}</span>
                                    <div onClick={(e) => e.stopPropagation()}>
                                        <button className="btn-ghost" onClick={() => handleEditMatrix(bNo)}>Edit</button>
                                        <button className="btn-ghost delete" onClick={() => handleDeleteBlueprint(bNo)}>Delete</button>
                                    </div>
                                </div>
                                {expandedBatches[bNo] && (
                                    <div className="batch-body">
                                        <div className="table-responsive-wrapper">
                                            <table>
                                                <thead>
                                                    <tr>
                                                        <th rowSpan="2" style={{ width: '110px' }}>Processing Date</th>
                                                        <th rowSpan="2">Flavour</th>
                                                        <th className="main-col-header">Target Production</th>
                                                        <th className="main-col-header" style={{ borderRight: '1px solid #e2e8f0' }}>Actual Production</th>
                                                        <th rowSpan="2">Status</th>
                                                    </tr>
                                                    <tr>
                                                        <th className="main-col-start" style={{ width: '90px' }}>KG</th>
                                                        <th className="main-col-start" style={{ width: '90px', borderRight: '1px solid #e2e8f0' }}>KG</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {Object.keys(batchFlavours).map(f => {
                                                        const item = batchFlavours[f];
                                                        if (!item || (item.production === 0 && item.actualProduction === 0)) return null;
                                                        return (<tr key={f}>
                                                            <td>{plannedBatches[bNo].processingDate}</td>
                                                            <td><strong>{f}</strong></td>
                                                            <td className="main-col-start" style={{ fontWeight: 600, color: 'var(--blue-deep)' }}>{item.production}</td>
                                                            <td className="main-col-start" style={{ borderRight: '1px solid #e2e8f0' }}>
                                                                <input type="text"
                                                                    value={item.actualProduction || ''}
                                                                    onChange={(e) => handleActualProductionChange(bNo, f, e.target.value)}
                                                                    className="table-input" placeholder="0" /></td>
                                                            <td><span className={`status ${item.status?.toLowerCase()}`}>{item.status}</span></td>
                                                        </tr>);
                                                    })}
                                                </tbody>
                                                <tfoot>
                                                    <tr className="totals-row">
                                                        <td rowSpan="2" colSpan="2"><strong>Total</strong></td>
                                                        <td className="main-col-start"><strong>{batchTotals.targetKg} kg</strong></td>
                                                        <td className="main-col-start" style={{ borderRight: '1px solid #e2e8f0' }}><strong>{batchTotals.actualKg} kg</strong></td>
                                                        <td></td>
                                                    </tr>
                                                    <tr className="totals-row sub-total-row">
                                                        <td className="main-col-start"><strong>{Math.floor(batchTotals.targetKg / 3) || 0} dol</strong></td>
                                                        <td className="main-col-start" style={{ borderRight: '1px solid #e2e8f0' }}><strong>{Math.floor(batchTotals.actualKg / 3) || 0} dol</strong></td>
                                                        <td></td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                        <div style={{ textAlign: 'right', marginTop: '1rem' }}>
                                            <button className="btn-primary" onClick={() => handleBatchComplete(bNo)}>
                                                Mark Batch as Complete
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default React.memo(BlueprintSection);