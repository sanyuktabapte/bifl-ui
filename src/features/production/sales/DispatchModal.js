import React, { useState, useEffect, useMemo, useRef } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import AutocompleteInput from '../../../components/common/AutocompleteInput';
import { fetchDispatchPreviewApi } from '../../../services/saleService';

function DispatchModal({ isOpen, order, flavours = [], onConfirmDispatch, onClose }) {
    const [rows, setRows] = useState([]);
    const [downloadingPdf, setDownloadingPdf] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const lastInputRef = useRef(null);

    // Initialize rows from order items
    useEffect(() => {
        if (isOpen && order) {
            const itemsToMap = (order.flavours && order.flavours.length > 0)
                ? order.flavours
                : (order.orderFlavourList || []);

            const aggregatedMap = new Map();
            itemsToMap.forEach(item => {
                const itemCode = item.code || item.flavourCode || '';
                const itemName = item.name || item.flavourName || '';

                const matchedFlavour = flavours.find(f =>
                    (itemCode && f.code?.toLowerCase() === itemCode.toLowerCase()) ||
                    (itemName && f.name?.toLowerCase() === itemName.toLowerCase())
                );

                const finalCode = matchedFlavour ? matchedFlavour.code : itemCode;
                const finalName = matchedFlavour ? matchedFlavour.name : itemName;
                const key = (finalCode || finalName).trim().toUpperCase();

                const qty = parseFloat(item.orderQuantity) || 0;
                if (!key) return;

                if (aggregatedMap.has(key)) {
                    const existing = aggregatedMap.get(key);
                    existing.orderQuantity = (parseFloat(existing.orderQuantity) || 0) + qty;
                } else {
                    aggregatedMap.set(key, {
                        id: Math.random(),
                        name: finalName,
                        code: finalCode,
                        orderQuantity: qty > 0 ? qty : (item.orderQuantity !== undefined ? item.orderQuantity : '')
                    });
                }
            });

            const initialRows = Array.from(aggregatedMap.values());
            setRows(initialRows.length > 0 ? initialRows : [{ id: Date.now(), name: '', code: '', orderQuantity: '' }]);
        }
    }, [isOpen, order, flavours]);

    const { totalKg, totalDol } = useMemo(() => {
        return rows.reduce((totals, row) => {
            const kg = parseFloat(row.orderQuantity);
            if (!isNaN(kg)) {
                totals.totalKg += kg;
                totals.totalDol += Math.floor(kg / 3);
            }
            return totals;
        }, { totalKg: 0, totalDol: 0 });
    }, [rows]);

    if (!isOpen || !order) return null;

    const formatBatchNo = (b) => {
        if (!b) return '';
        return String(b).startsWith('#') ? b : `#${b}`;
    };

    const handleAddRow = () => {
        const newRow = {
            id: Date.now(),
            name: '',
            code: '',
            orderQuantity: ''
        };
        setRows(prevRows => [...prevRows, newRow]);
    };

    const handleRemoveRow = (id) => {
        if (rows.length <= 1) return;
        setRows(rows.filter(row => row.id !== id));
    };

    const handleRowChange = (id, field, value, selectedObj) => {
        setRows(currentRows => {
            let newRows = currentRows.map(row => {
                if (row.id === id) {
                    if (field === 'name') {
                        let code = selectedObj?.code || '';
                        let name = selectedObj?.name || value;

                        if (!code && typeof value === 'string') {
                            const cleanVal = value.trim();
                            const matched = flavours.find(f =>
                                f.code.toLowerCase() === cleanVal.toLowerCase() ||
                                f.name.toLowerCase() === cleanVal.toLowerCase() ||
                                `${f.code} - ${f.name}`.toLowerCase() === cleanVal.toLowerCase()
                            );
                            if (matched) {
                                code = matched.code;
                                name = matched.name;
                            }
                        }

                        return {
                            ...row,
                            name: name,
                            code: code
                        };
                    } else if (field === 'dol') {
                        const dolVal = value === '' ? '' : parseInt(value, 10);
                        const kgVal = dolVal === '' || isNaN(dolVal) ? '' : dolVal * 3;
                        return { ...row, orderQuantity: kgVal };
                    } else if (field === 'orderQuantity') {
                        return { ...row, orderQuantity: value };
                    }
                    return { ...row, [field]: value };
                }
                return row;
            });
            return newRows;
        });
    };

    const getRowDisplayValue = (row) => {
        if (row.code && row.name) return `${row.code} - ${row.name}`;
        if (row.name) return row.name;
        if (row.code) return row.code;
        return '';
    };

    const getValidPayload = () => {
        const validRows = rows.filter(r => (r.name || r.code) && parseFloat(r.orderQuantity) > 0);
        if (validRows.length === 0) return null;

        const orderFlavourList = validRows.map(r => {
            let cleanCode = r.code;
            if (!cleanCode) {
                const matchedFlavour = flavours.find(f =>
                    (r.code && f.code?.toLowerCase() === r.code?.toLowerCase()) ||
                    (r.name && f.name?.toLowerCase() === r.name?.toLowerCase()) ||
                    (r.name && `${f.code} - ${f.name}`.toLowerCase() === r.name?.toLowerCase()) ||
                    (r.name && r.name.toLowerCase().startsWith(f.code.toLowerCase()))
                );
                cleanCode = matchedFlavour ? matchedFlavour.code : r.name;
            }
            if (cleanCode && cleanCode.includes('-')) {
                cleanCode = cleanCode.split('-')[0].trim();
            }
            return {
                flavourCode: cleanCode ? cleanCode.trim().toUpperCase() : 'KM',
                orderQuantity: parseInt(r.orderQuantity, 10)
            };
        });

        return {
            storeId: order.storeId || order.masterStore?.id,
            orderFlavourList
        };
    };

    // 📄 Download PDF Dispatch List with FIFO Allocations
    const handleDownloadPdf = async () => {
        const payload = getValidPayload();
        if (!payload) {
            alert('Please add at least one flavour with valid quantity before downloading dispatch list.');
            return;
        }

        setDownloadingPdf(true);
        try {
            const previewData = await fetchDispatchPreviewApi(order.id || order.orderId, payload);

            if (!previewData || !previewData.items || previewData.items.length === 0) {
                alert('No dispatch allocation items returned from server.');
                return;
            }

            const doc = new jsPDF();
            doc.setFontSize(20);
            doc.text('Dispatch Allocation List', 14, 22);

            const storeName = order.masterStore?.name || order.store || 'NA';
            const formattedOrderId = order.orderId ? `SO-${order.orderId}` : `SO-${order.id}`;

            doc.setFontSize(10);
            doc.text(`Order ID: ${formattedOrderId}`, 14, 32);
            doc.text(`Store: ${storeName}`, 14, 38);
            doc.text(`Order Date: ${order.orderDate || 'NA'}`, 14, 44);
            doc.text(`Dispatch Date: ${new Date().toISOString().split('T')[0]}`, 14, 50);

            const tableColumn = ["#", "Flavour", "Batch No.", "Quantity (Dol)", "Total (Dol)"];
            const tableRows = [];
            let grandTotalDol = 0;

            previewData.items.forEach((item, index) => {
                const itemDol = item.orderedKg / 3;
                const itemDolFormatted = Number.isInteger(itemDol) ? `${itemDol} dol` : `${itemDol.toFixed(1)} dol`;

                grandTotalDol += itemDol;

                // Consolidate allocations by batch number
                const rawAllocs = item.allocations && item.allocations.length > 0
                    ? item.allocations
                    : [{ batchNumber: '100', allocatedKg: item.orderedKg }];

                const allocMap = new Map();
                rawAllocs.forEach(a => {
                    const bNo = a.batchNumber || '100';
                    const kg = a.allocatedKg || 0;
                    allocMap.set(bNo, (allocMap.get(bNo) || 0) + kg);
                });

                const allocs = Array.from(allocMap.entries()).map(([batchNumber, allocatedKg]) => ({
                    batchNumber,
                    allocatedKg
                }));

                const spanCount = allocs.length;

                allocs.forEach((alloc, allocIdx) => {
                    const allocDol = alloc.allocatedKg / 3;
                    const allocDolFormatted = Number.isInteger(allocDol) ? `${allocDol} dol` : `${allocDol.toFixed(1)} dol`;

                    if (allocIdx === 0) {
                        tableRows.push([
                            { content: String(index + 1), rowSpan: spanCount, styles: { valign: 'middle', halign: 'center' } },
                            { content: item.flavourName || item.flavourCode, rowSpan: spanCount, styles: { valign: 'middle', fontStyle: 'bold' } },
                            { content: formatBatchNo(alloc.batchNumber), styles: { halign: 'center' } },
                            { content: allocDolFormatted, styles: { halign: 'right' } },
                            { content: itemDolFormatted, rowSpan: spanCount, styles: { valign: 'middle', halign: 'right', fontStyle: 'bold' } }
                        ]);
                    } else {
                        tableRows.push([
                            { content: formatBatchNo(alloc.batchNumber), styles: { halign: 'center' } },
                            { content: allocDolFormatted, styles: { halign: 'right' } }
                        ]);
                    }
                });
            });

            const totalDolFormatted = Number.isInteger(grandTotalDol) ? `${grandTotalDol} dol` : `${grandTotalDol.toFixed(1)} dol`;

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
                    0: { halign: 'center', cellWidth: 12 },
                    1: { halign: 'left', fontStyle: 'bold' },
                    2: { halign: 'center', cellWidth: 35 },
                    3: { halign: 'right', cellWidth: 35 },
                    4: { halign: 'right', fontStyle: 'bold', cellWidth: 35 }
                },
                foot: [
                    [
                        { content: 'Grand Total', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } },
                        { content: totalDolFormatted, styles: { halign: 'right', fontStyle: 'bold' } }
                    ]
                ],
                footStyles: {
                    fillColor: [241, 245, 249],
                    textColor: [15, 23, 42],
                    fontStyle: 'bold'
                },
                startY: 56,
                showFoot: 'lastPage',
            });

            doc.save(`dispatch-list-${formattedOrderId}.pdf`);
        } catch (err) {
            console.error("Error downloading dispatch list:", err);
            alert("Failed to generate dispatch list: " + err.message);
        } finally {
            setDownloadingPdf(false);
        }
    };

    // 🚚 Confirm & Dispatch Order
    const handleConfirm = async () => {
        const payload = getValidPayload();
        if (!payload) {
            alert('Please add at least one flavour with valid quantity before dispatching.');
            return;
        }

        setIsSubmitting(true);
        try {
            await onConfirmDispatch(payload);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="overlay open" onClick={onClose}>
            <div className="modal" style={{ width: '660px', overflow: 'visible' }} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <h2 style={{ margin: 0 }}>Dispatch Order</h2>
                    <button className="btn-ghost" onClick={onClose} style={{ padding: '4px 8px', fontSize: '16px' }}>✕</button>
                </div>
                <div className="modal-sub" style={{ marginBottom: '16px' }}>
                    Edit flavour quantities or add/remove items before dispatching order <strong>{order.orderId ? `SO-${order.orderId}` : `SO-${order.id}`}</strong>.
                </div>

                {/* Order Summary Info Cards */}
                <div className="row" style={{ overflow: 'visible', marginBottom: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--line)' }}>
                    <div>
                        <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ink-soft)', fontWeight: 700 }}>Order ID</div>
                        <div style={{ fontWeight: 700, color: 'var(--blue-deep)', fontSize: '14px', marginTop: '2px' }}>{order.orderId ? `SO-${order.orderId}` : `SO-${order.id}`}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ink-soft)', fontWeight: 700 }}>Store</div>
                        <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: '14px', marginTop: '2px' }}>{order.masterStore?.name || order.store || 'NA'}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ink-soft)', fontWeight: 700 }}>Order Date</div>
                        <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: '13px', marginTop: '2px' }}>{order.orderDate}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ink-soft)', fontWeight: 700 }}>Total Volume</div>
                        <div style={{ fontWeight: 800, color: 'var(--blue-deep)', fontSize: '14px', marginTop: '2px' }}>
                            {Math.round(totalKg)} kg ({totalDol} dol)
                        </div>
                    </div>
                </div>

                {/* Flavour Editing Table - Exact Match with OrderModal */}
                <div className="flavour-table-head">
                    <span className="label">Flavours Request (Code or Name)</span>
                </div>
                <div style={{ overflow: 'visible' }}>
                    <table className="flavour-table" id="flavourTable" style={{ overflow: 'visible' }}>
                        <thead>
                            <tr>
                                <th style={{ width: '32px' }}>#</th>
                                <th>Flavour (Priority Code / Name)</th>
                                <th style={{ width: '85px' }}>KG</th>
                                <th style={{ width: '70px' }}>Dol</th>
                                <th style={{ width: '95px', textAlign: 'center' }}>Stock</th>
                                <th style={{ width: '30px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, index) => {
                                const matchedFlavour = flavours.find(f =>
                                    (row.code && f.code?.toLowerCase() === row.code?.toLowerCase()) ||
                                    (row.name && f.name?.toLowerCase() === row.name?.toLowerCase())
                                );
                                const currentColdStock = matchedFlavour ? (matchedFlavour.coldRoomStock ?? 0) : null;
                                const inProcessStock = matchedFlavour ? (matchedFlavour.inProcessStock ?? matchedFlavour.inProcessQuantity ?? 0) : 0;
                                const orderQty = parseFloat(row.orderQuantity) || 0;
                                const remainingStock = currentColdStock !== null ? (currentColdStock - orderQty) : null;

                                return (
                                    <tr key={row.id}>
                                        <td className="rownum">{index + 1}</td>
                                        <td style={{ position: 'relative' }}>
                                            <AutocompleteInput
                                                ref={index === rows.length - 1 ? lastInputRef : null}
                                                value={getRowDisplayValue(row)}
                                                onChange={(nameValue, selectedObj) => handleRowChange(row.id, 'name', nameValue, selectedObj)}
                                                onEnterPress={handleAddRow}
                                                items={flavours}
                                                placeholder="Type code (e.g. EL, KK) or name..."
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                min="0"
                                                step="3"
                                                className="flavour-kg"
                                                placeholder="0"
                                                value={row.orderQuantity}
                                                onChange={(e) => handleRowChange(row.id, 'orderQuantity', e.target.value)}
                                            />
                                        </td>
                                        <td className="dol-val">{Math.floor(parseFloat(row.orderQuantity) / 3) || 0}</td>
                                        <td
                                            className="dol-val"
                                            style={{
                                                textAlign: 'center',
                                                fontWeight: '600',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            {remainingStock !== null ? (
                                                <>
                                                    <span style={{ color: remainingStock >= 0 ? 'var(--green)' : 'var(--red)' }}>
                                                        {remainingStock}
                                                    </span>
                                                    <span style={{ color: '#d97706', fontSize: '12px', marginLeft: '3px' }}>
                                                        ({inProcessStock})
                                                    </span>
                                                </>
                                            ) : '-'}
                                        </td>
                                        <td>
                                            <button
                                                type="button"
                                                className="rm-row"
                                                title="Remove row"
                                                onClick={() => handleRemoveRow(row.id)}
                                                style={{ visibility: rows.length > 1 ? 'visible' : 'hidden' }}
                                            >
                                                ✕
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="totals-row">
                                <td colSpan="2">Total Volume</td>
                                <td id="totalKg">{Math.round(totalKg)} kg</td>
                                <td id="totaldol">{totalDol} dol</td>
                                <td></td>
                                <td>
                                    <button type="button" className="add-row-btn" title="Add flavour row" onClick={handleAddRow}>+</button>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Modal Footer Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', borderTop: '1px solid var(--line)', paddingTop: '14px' }}>
                    <button
                        type="button"
                        className="btn-ghost"
                        onClick={handleDownloadPdf}
                        disabled={downloadingPdf || isSubmitting}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                        {downloadingPdf ? '⏳ Generating PDF...' : '📄 Download Dispatch List'}
                    </button>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button type="button" className="btn-ghost" onClick={onClose} disabled={isSubmitting}>
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn-primary"
                            disabled={isSubmitting || totalKg <= 0}
                            onClick={handleConfirm}
                        >
                            {isSubmitting ? '⏳ Dispatching...' : 'Confirm & Dispatch 🚚'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default DispatchModal;
