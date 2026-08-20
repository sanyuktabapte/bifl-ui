import React, { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const BlueprintSection = ({
    isOpen,
    toggleAccordion,
    plannedBatches,
    expandedBatches,
    batches = [],
    toggleBatchBand,
    handleEditMatrix,
    handleDeleteBlueprint,
    handleActualProductionChange,
    handleColdRoomTransferChange,
    handleMoveAllToColdRoom,
    handleBatchComplete,
}) => {
    // Checkbox state map keyed by batchNumber
    const [moveAllStates, setMoveAllStates] = useState({});

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

    // Sort batches by batchNumber or plan date
    const sortedBatches = Object.values(plannedBatches).sort((a, b) => (a.batchNumber || '').localeCompare(b.batchNumber || ''));

    const handleDownloadPDF = (e, batch) => {
        e.stopPropagation();
        const doc = new jsPDF();
        doc.setFontSize(22);
        doc.text(`Production Plan Blueprint`, 14, 22);

        doc.setFontSize(12);
        doc.text(`Batch: ${batch.batchNumber}`, 14, 32);
        doc.text(`Date: ${batch.planDate || new Date().toISOString().split('T')[0]}`, 14, 38);
        doc.text(`Status: ${batch.status || 'Processing'}`, 14, 44);

        const tableColumn = ["Flavour", "Target (KG)", "Dol", "Actual (KG)", "Cold Room (KG)"];
        const tableRows = [];

        let totalTargetKg = 0;
        let totalActualKg = 0;
        let totalColdKg = 0;

        const batchFlavours = batch.flavours || {};
        Object.keys(batchFlavours).forEach((f) => {
            const item = batchFlavours[f];
            if (item && (item.production > 0 || item.actualProduction > 0)) {
                const target = item.production || 0;
                const actual = item.actualProduction !== undefined && item.actualProduction !== null ? item.actualProduction : target;
                const cold = item.coldRoomTransfer !== undefined && item.coldRoomTransfer !== null ? item.coldRoomTransfer : actual;

                totalTargetKg += Number(target) || 0;
                totalActualKg += Number(actual) || 0;
                totalColdKg += Number(cold) || 0;

                const rowData = [
                    f,
                    `${target} kg`,
                    `${Math.floor(target / 3) || 0} dol`,
                    `${actual} kg`,
                    `${cold} kg`
                ];
                tableRows.push(rowData);
            }
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            theme: 'grid',
            headStyles: {
                fillColor: [30, 41, 59],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                halign: 'center'
            },
            styles: {
                fontSize: 9,
                cellPadding: 4,
                lineColor: [226, 232, 240],
                lineWidth: 0.1
            },
            columnStyles: {
                0: { halign: 'left' },
                1: { halign: 'right', cellWidth: 35 },
                2: { halign: 'right', cellWidth: 25 },
                3: { halign: 'right', cellWidth: 35 },
                4: { halign: 'right', cellWidth: 40 }
            },
            foot: [
                [
                    { content: 'Total Volume (KG)', styles: { halign: 'left', fontStyle: 'bold' } },
                    { content: `${totalTargetKg} kg`, styles: { halign: 'right', fontStyle: 'bold' } },
                    { content: `${Math.floor(totalTargetKg / 3)} dol`, styles: { halign: 'right', fontStyle: 'bold' } },
                    { content: `${totalActualKg} kg`, styles: { halign: 'right', fontStyle: 'bold' } },
                    { content: `${totalColdKg} kg`, styles: { halign: 'right', fontStyle: 'bold' } }
                ]
            ],
            footStyles: {
                fillColor: [241, 245, 249],
                textColor: [15, 23, 42],
                fontStyle: 'bold'
            },
            startY: 50,
            showFoot: 'lastPage',
        });

        doc.save(`production-plan-${batch.batchNumber}.pdf`);
    };

    const onCheckboxChange = (batchKey, checked) => {
        setMoveAllStates(prev => ({ ...prev, [batchKey]: checked }));
        handleMoveAllToColdRoom(batchKey, checked);
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
                        const batchKey = batch.batchNumber;
                        const batchFlavours = batch.flavours || {};
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

                        const cleanBatchNo = String(batchKey || '').replace(/^#/, '').trim();
                        const targetDols = Math.ceil((batchTotals.targetKg || 0) / 3.0);
                        const isNaBatch = cleanBatchNo.toUpperCase() === 'NA';

                        const matchedBatch = batches.find(b => 
                            String(b.batchNumber || '').replace(/^#/, '').trim().toLowerCase() === cleanBatchNo.toLowerCase()
                        );

                        const registeredStickers = matchedBatch ? (Number(matchedBatch.totalStickers ?? matchedBatch.total) || 0) : 0;
                        const pendingStickers = isNaBatch ? targetDols : Math.max(0, targetDols - registeredStickers);
                        const hasPendingStickers = pendingStickers > 0;

                        const displayBatchNo = batch.batchNumber ? (String(batch.batchNumber).startsWith('#') ? batch.batchNumber : `#${batch.batchNumber}`) : '';

                        return (
                            <div key={batch.id || batchKey} className="batch-group" style={{ marginBottom: '16px', border: hasPendingStickers ? '1.5px solid #FCA5A5' : '1px solid var(--line)', borderRadius: '8px' }}>
                                <div
                                    className="batch-header"
                                    onClick={() => toggleBatchBand(batchKey)}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        background: hasPendingStickers ? '#FFF5F5' : 'var(--card)'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ fontWeight: 700, color: 'var(--blue-deep)', fontSize: '15px' }}>
                                            📦 Batch: {displayBatchNo}
                                        </span>
                                        <span style={{ color: 'var(--ink-soft)', fontSize: '13px' }}>
                                            📅 {batch.planDate || 'Today'}
                                        </span>
                                        {hasPendingStickers ? (
                                            <span style={{ 
                                                background: '#FEE2E2', 
                                                color: '#991B1B', 
                                                padding: '3px 10px', 
                                                borderRadius: '4px', 
                                                fontSize: '12px', 
                                                fontWeight: 700, 
                                                border: '1px solid #FCA5A5', 
                                                display: 'inline-flex', 
                                                alignItems: 'center', 
                                                gap: '4px' 
                                            }}>
                                                ⚠️ Pending stickers for batch {cleanBatchNo} = {pendingStickers}
                                            </span>
                                        ) : (
                                            <span style={{ background: '#FEF3C7', color: '#B45309', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
                                                {batch.status || 'Processing'}
                                            </span>
                                        )}
                                    </div>
                                    <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <button className="btn-ghost" onClick={(e) => handleDownloadPDF(e, batch)}>Download 📥</button>
                                        <button className="btn-ghost" onClick={() => handleEditMatrix(batchKey)}>Edit</button>
                                        <button className="btn-ghost delete" onClick={() => handleDeleteBlueprint(batchKey)}>Delete</button>
                                    </div>
                                </div>
                                {expandedBatches[batchKey] && (
                                    <div className="batch-body">
                                        <div className="table-responsive-wrapper">
                                            <table style={{ borderCollapse: 'collapse', border: '1px solid var(--line)', width: '100%' }}>
                                                <thead>
                                                    <tr style={{ borderBottom: '2px solid var(--line)' }}>
                                                        <th style={{ border: '1px solid var(--line)', padding: '12px 8px' }}>Flavour</th>
                                                        <th style={{ border: '1px solid var(--line)', padding: '12px 8px', textAlign: 'center', width: '150px' }}>Target Production (KG)</th>
                                                        <th style={{ border: '1px solid var(--line)', padding: '12px 8px', textAlign: 'center', width: '150px' }}>Actual Production (KG)</th>
                                                        <th style={{ border: '1px solid var(--line)', padding: '12px 8px', textAlign: 'center', width: '200px' }}>Transfer to Cold Room (KG)</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {visibleFlavourKeys.map((f) => {
                                                        const item = batchFlavours[f];
                                                        
                                                        // Prefill values
                                                        const actualPrefill = item.actualProduction !== undefined && item.actualProduction !== null ? item.actualProduction : item.production;
                                                        const coldRoomPrefill = item.coldRoomTransfer !== undefined && item.coldRoomTransfer !== null ? item.coldRoomTransfer : actualPrefill;

                                                        return (
                                                            <tr key={f} style={{ borderBottom: '1px solid var(--line)' }}>
                                                                <td style={{ border: '1px solid var(--line)', padding: '10px 8px' }}><strong>{f}</strong></td>
                                                                <td style={{ border: '1px solid var(--line)', padding: '10px 8px', textAlign: 'center', fontWeight: 600, color: 'var(--blue-deep)' }}>
                                                                    {item.production}
                                                                </td>
                                                                <td style={{ border: '1px solid var(--line)', padding: '10px 8px', textAlign: 'center' }}>
                                                                    <input
                                                                        type="number"
                                                                        step="3"
                                                                        value={actualPrefill === '' ? '' : actualPrefill}
                                                                        onChange={(e) => handleActualProductionChange(batchKey, f, e.target.value)}
                                                                        className="table-input"
                                                                        placeholder="0"
                                                                        style={{ textAlign: 'center', width: '100px' }}
                                                                    />
                                                                </td>
                                                                <td style={{ border: '1px solid var(--line)', padding: '10px 8px', textAlign: 'center' }}>
                                                                    <input
                                                                        type="number"
                                                                        step="3"
                                                                        value={coldRoomPrefill === '' ? '' : coldRoomPrefill}
                                                                        onChange={(e) => handleColdRoomTransferChange(batchKey, f, e.target.value)}
                                                                        className="table-input"
                                                                        placeholder="0"
                                                                        style={{ textAlign: 'center', width: '130px' }}
                                                                    />
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                                <tfoot>
                                                    <tr className="totals-row" style={{ borderTop: '2px solid var(--line)' }}>
                                                        <td style={{ border: '1px solid var(--line)', padding: '8px' }}><strong>Total</strong></td>
                                                        <td style={{ border: '1px solid var(--line)', padding: '8px', textAlign: 'center' }}><strong>{batchTotals.targetKg} kg</strong></td>
                                                        <td style={{ border: '1px solid var(--line)', padding: '8px', textAlign: 'center' }}><strong>{batchTotals.actualKg} kg</strong></td>
                                                        <td style={{ border: '1px solid var(--line)', padding: '8px', textAlign: 'center' }}><strong>{batchTotals.coldTransferKg} kg</strong></td>
                                                    </tr>
                                                    <tr className="totals-row sub-total-row">
                                                        <td style={{ border: '1px solid var(--line)', padding: '8px' }}></td>
                                                        <td style={{ border: '1px solid var(--line)', padding: '8px', textAlign: 'center' }}><strong>{Math.floor(batchTotals.targetKg / 3) || 0} dol</strong></td>
                                                        <td style={{ border: '1px solid var(--line)', padding: '8px', textAlign: 'center' }}><strong>{Math.floor(batchTotals.actualKg / 3) || 0} dol</strong></td>
                                                        <td style={{ border: '1px solid var(--line)', padding: '8px', textAlign: 'center' }}><strong>{Math.floor(batchTotals.coldTransferKg / 3) || 0} dol</strong></td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                        <div style={{ textAlign: 'right', marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1.5rem' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '500', fontSize: '14px' }}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={!!moveAllStates[batchKey]} 
                                                    onChange={(e) => onCheckboxChange(batchKey, e.target.checked)}
                                                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                                />
                                                Transfer all to Cold Room
                                            </label>
                                            <button
                                                className="btn-primary"
                                                onClick={() => {
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
                                                    handleBatchComplete(batchKey, 'Completed');
                                                }}
                                            >
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