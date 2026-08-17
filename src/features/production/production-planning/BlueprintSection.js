import React, { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const BlueprintSection = ({
    isOpen,
    toggleAccordion,
    plannedBatches,
    expandedBatches,
    toggleBatchBand,
    handleEditMatrix,
    handleDeleteBlueprint,
    handleActualProductionChange,
    handleColdRoomTransferChange,
    handleMoveAllToColdRoom,
    handleBatchComplete,
    handleBatchNumberChange
}) => {
    // Checkbox state map keyed by date
    const [moveAllStates, setMoveAllStates] = useState({});
    // Local batch numbers input state mapped by item database ID
    const [localBatchNumbers, setLocalBatchNumbers] = useState({});

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

    const sortedBatches = Object.values(plannedBatches).sort((a, b) => new Date(b.processingDate) - new Date(a.processingDate));

    const handleDownloadPDF = (e, batch) => {
        e.stopPropagation();
        const doc = new jsPDF();
        doc.setFontSize(22);
        doc.text(`Production Plan`, 14, 22);

        doc.setFontSize(12);
        doc.text(`Date: ${batch.processingDate}`, 14, 32);

        const tableColumn = ["Flavour", "Quantity (KG)", "Dol", "Batch Number"];
        const tableRows = [];

        let totalKg = 0;
        Object.keys(batch.flavours).forEach(f => {
            const item = batch.flavours[f];
            if (item && item.production > 0) {
                const kg = item.production;
                const dole = Math.floor(kg / 3);
                tableRows.push([f, `${kg}`, `${dole}`, item.batchNumber || '']);
                totalKg += kg;
            }
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            foot: [
                [{ content: 'Total', styles: { halign: 'left', fontStyle: 'bold' } },
                 { content: `${totalKg}`, styles: { halign: 'left', fontStyle: 'bold' } },
                 { content: `${Math.floor(totalKg / 3)}`, styles: { halign: 'left', fontStyle: 'bold' } },
                 { content: '' }]
            ],
            startY: 40,
            showFoot: 'lastPage',
        });

        doc.save(`production-plan-${batch.processingDate}.pdf`);
    };

    const onCheckboxChange = (dateKey, checked) => {
        setMoveAllStates(prev => ({ ...prev, [dateKey]: checked }));
        handleMoveAllToColdRoom(dateKey, checked);
    };

    const onItemBatchChange = (itemId, value) => {
        setLocalBatchNumbers(prev => ({ ...prev, [itemId]: value }));
    };

    const onItemBatchSave = (itemId, oldVal, newVal) => {
        const trimmed = (newVal || '').trim();
        if (trimmed && trimmed !== oldVal) {
            handleBatchNumberChange(itemId, oldVal, trimmed);
        }
    };

    return (
        <div className="accordion">
            <div className="accordion-header" onClick={() => toggleAccordion('blueprint')}>
                <span>2. Production Plan Blueprint</span>
                <span>▲</span>
            </div>
            <div className="accordion-content">
                {sortedBatches.length === 0 ? (
                    <div className="empty-state">No blueprints generated yet.</div>
                ) : (
                    sortedBatches.map(batch => {
                        const dateKey = batch.processingDate;
                        const batchFlavours = batch.flavours;
                        const batchTotals = Object.values(batchFlavours).reduce((acc, item) => {
                            if (item) {
                                acc.targetKg += item.production || 0;
                                const actual = item.actualProduction !== undefined && item.actualProduction !== null ? item.actualProduction : (item.production || 0);
                                acc.actualKg += Number(actual) || 0;

                                const cold = item.coldRoomTransfer !== undefined && item.coldRoomTransfer !== null ? item.coldRoomTransfer : actual;
                                acc.coldTransferKg += Number(cold) || 0;
                            }
                            return acc;
                        }, { targetKg: 0, actualKg: 0, coldTransferKg: 0 });

                        // Filter flavours that will be visible in the table
                        const visibleFlavourKeys = Object.keys(batchFlavours).filter(f => {
                            const item = batchFlavours[f];
                            return item && (item.production > 0 || item.actualProduction > 0);
                        });

                        return (
                            <div key={batch.id} className="batch-group">
                                <div className="batch-header" onClick={() => toggleBatchBand(dateKey)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>📅 Date: {batch.processingDate}</span>
                                    <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <button className="btn-ghost" onClick={(e) => handleDownloadPDF(e, batch)}>Download 📥</button>
                                        <button className="btn-ghost" onClick={() => handleEditMatrix(dateKey)}>Edit</button>
                                        <button className="btn-ghost delete" onClick={() => handleDeleteBlueprint(dateKey)}>Delete</button>
                                    </div>
                                </div>
                                {expandedBatches[dateKey] && (
                                    <div className="batch-body">
                                        <div className="table-responsive-wrapper">
                                            <table style={{ borderCollapse: 'collapse', border: '1px solid var(--line)', width: '100%' }}>
                                                <thead>
                                                    <tr style={{ borderBottom: '2px solid var(--line)' }}>
                                                        <th style={{ border: '1px solid var(--line)', padding: '12px 8px' }}>Flavour</th>
                                                        <th style={{ border: '1px solid var(--line)', padding: '12px 8px', textAlign: 'center', width: '130px' }}>Target Production (KG)</th>
                                                        <th style={{ border: '1px solid var(--line)', padding: '12px 8px', textAlign: 'center', width: '130px' }}>Actual Production (KG)</th>
                                                        <th style={{ border: '1px solid var(--line)', padding: '12px 8px', textAlign: 'center', width: '180px' }}>Transfer to Cold Room (KG)</th>
                                                        <th style={{ border: '1px solid var(--line)', padding: '12px 8px', textAlign: 'center', width: '140px' }}>Batch Number</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {visibleFlavourKeys.map((f) => {
                                                        const item = batchFlavours[f];
                                                        
                                                        // Prefill values
                                                        const actualPrefill = item.actualProduction !== undefined && item.actualProduction !== null ? item.actualProduction : item.production;
                                                        const coldRoomPrefill = item.coldRoomTransfer !== undefined && item.coldRoomTransfer !== null ? item.coldRoomTransfer : actualPrefill;
                                                        
                                                        const currentItemBatch = item.batchNumber || '';
                                                        const displayBatchNo = localBatchNumbers[item.id] !== undefined ? localBatchNumbers[item.id] : currentItemBatch;

                                                        return (<tr key={f} style={{ borderBottom: '1px solid var(--line)' }}>
                                                            <td style={{ border: '1px solid var(--line)', padding: '10px 8px' }}><strong>{f}</strong></td>
                                                            <td style={{ border: '1px solid var(--line)', padding: '10px 8px', textAlign: 'center', fontWeight: '600', color: 'var(--blue-deep)' }}>{item.production}</td>
                                                            <td style={{ border: '1px solid var(--line)', padding: '10px 8px', textAlign: 'center' }}>
                                                                <input type="number"
                                                                    step="3"
                                                                    value={actualPrefill === '' ? '' : actualPrefill}
                                                                    onChange={(e) => handleActualProductionChange(dateKey, f, e.target.value)}
                                                                    className="table-input" placeholder="0" style={{ textAlign: 'center', width: '90px' }} />
                                                            </td>
                                                            <td style={{ border: '1px solid var(--line)', padding: '10px 8px', textAlign: 'center' }}>
                                                                <input type="number"
                                                                    step="3"
                                                                    value={coldRoomPrefill === '' ? '' : coldRoomPrefill}
                                                                    onChange={(e) => handleColdRoomTransferChange(dateKey, f, e.target.value)}
                                                                    className="table-input" placeholder="0" style={{ textAlign: 'center', width: '120px' }} />
                                                            </td>
                                                            <td style={{ border: '1px solid var(--line)', padding: '10px 8px', textAlign: 'center' }}>
                                                                <input type="text"
                                                                    value={displayBatchNo}
                                                                    onChange={(e) => onItemBatchChange(item.id, e.target.value)}
                                                                    onBlur={() => onItemBatchSave(item.id, currentItemBatch, displayBatchNo)}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') {
                                                                            onItemBatchSave(item.id, currentItemBatch, displayBatchNo);
                                                                        }
                                                                    }}
                                                                    className="table-input" style={{ textAlign: 'center', width: '100px' }} />
                                                            </td>
                                                        </tr>);
                                                    })}
                                                </tbody>
                                                <tfoot>
                                                    <tr className="totals-row" style={{ borderTop: '2px solid var(--line)' }}>
                                                        <td style={{ border: '1px solid var(--line)', padding: '8px' }}><strong>Total</strong></td>
                                                        <td style={{ border: '1px solid var(--line)', padding: '8px', textAlign: 'center' }}><strong>{batchTotals.targetKg} kg</strong></td>
                                                        <td style={{ border: '1px solid var(--line)', padding: '8px', textAlign: 'center' }}><strong>{batchTotals.actualKg} kg</strong></td>
                                                        <td style={{ border: '1px solid var(--line)', padding: '8px', textAlign: 'center' }}><strong>{batchTotals.coldTransferKg} kg</strong></td>
                                                        <td style={{ border: '1px solid var(--line)', padding: '8px' }}></td>
                                                    </tr>
                                                    <tr className="totals-row sub-total-row">
                                                        <td style={{ border: '1px solid var(--line)', padding: '8px' }}></td>
                                                        <td style={{ border: '1px solid var(--line)', padding: '8px', textAlign: 'center' }}><strong>{Math.floor(batchTotals.targetKg / 3) || 0} dol</strong></td>
                                                        <td style={{ border: '1px solid var(--line)', padding: '8px', textAlign: 'center' }}><strong>{Math.floor(batchTotals.actualKg / 3) || 0} dol</strong></td>
                                                        <td style={{ border: '1px solid var(--line)', padding: '8px', textAlign: 'center' }}><strong>{Math.floor(batchTotals.coldTransferKg / 3) || 0} dol</strong></td>
                                                        <td style={{ border: '1px solid var(--line)', padding: '8px' }}></td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                        <div style={{ textAlign: 'right', marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1.5rem' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '500', fontSize: '14px' }}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={!!moveAllStates[dateKey]} 
                                                    onChange={(e) => onCheckboxChange(dateKey, e.target.checked)}
                                                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                                />
                                                Transfer all to Cold Room
                                            </label>
                                            <button className="btn-primary" onClick={() => {
                                                const hasError = Object.keys(batchFlavours).some(f => {
                                                    const item = batchFlavours[f];
                                                    const actual = item.actualProduction !== undefined && item.actualProduction !== null ? Number(item.actualProduction) : item.production;
                                                    const cold = item.coldRoomTransfer !== undefined && item.coldRoomTransfer !== null ? Number(item.coldRoomTransfer) : actual;
                                                    return cold > actual;
                                                });
                                                if (hasError) {
                                                    alert("Error: Transfer to Cold Room quantity cannot exceed Actual Production quantity!");
                                                    return;
                                                }
                                                handleBatchComplete(dateKey, 'Completed');
                                            }}>
                                                Complete Production
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