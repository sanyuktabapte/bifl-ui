import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import AutocompleteInput from '../../../components/common/AutocompleteInput';
import { fetchDispatchPreviewApi } from '../../../services/saleService';
import { updateStoreOrderApi, updateOrderStatusApi } from '../../../services/storeOrderService';

function DispatchModal({ isOpen, order, flavours = [], onConfirmDispatch, onClose }) {
    const navigate = useNavigate();
    const [flavourGroups, setFlavourGroups] = useState([]);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);
    const [downloadingPdf, setDownloadingPdf] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [stockAlert, setStockAlert] = useState(null);

    const formatBatchNo = (b) => {
        if (!b) return '';
        return String(b).startsWith('#') ? b : `#${b}`;
    };

    // Initialize grouped flavour rows with FIFO batch allocations on modal open
    useEffect(() => {
        if (isOpen && order) {
            let isMounted = true;
            setIsLoadingPreview(true);

            const loadAllocations = async () => {
                try {
                    const preview = await fetchDispatchPreviewApi(order.id || order.orderId);
                    if (isMounted && preview && preview.items && preview.items.length > 0) {
                        const groups = preview.items.map((item, idx) => {
                            const itemOrderDol = Math.floor((item.orderedKg || 0) / 3);
                            const itemColdStockDol = Math.floor((item.availableColdRoomKg || 0) / 3);
                            const allocs = (item.allocations && item.allocations.length > 0)
                                ? item.allocations.map((a, aIdx) => {
                                    const aKg = parseFloat(a.allocatedKg) || 0;
                                    const aAvailKg = a.availableInBatchKg !== undefined ? a.availableInBatchKg : (item.availableColdRoomKg || aKg);
                                    return {
                                        id: `alloc-${item.flavourCode}-${aIdx}-${Date.now()}-${Math.random()}`,
                                        batchNumber: a.batchNumber || '100',
                                        dispatchDol: Math.floor(aKg / 3),
                                        dispatchKg: aKg,
                                        coldRoomStockDol: Math.floor(aAvailKg / 3),
                                        coldRoomStockKg: aAvailKg
                                    };
                                })
                                : [{
                                    id: `alloc-${item.flavourCode}-0-${Date.now()}-${Math.random()}`,
                                    batchNumber: '100',
                                    dispatchDol: itemOrderDol,
                                    dispatchKg: item.orderedKg || 0,
                                    coldRoomStockDol: itemColdStockDol,
                                    coldRoomStockKg: item.availableColdRoomKg || 0
                                }];

                            return {
                                id: `group-${item.flavourCode}-${idx}-${Date.now()}-${Math.random()}`,
                                flavourCode: item.flavourCode,
                                flavourName: item.flavourName || item.flavourCode,
                                orderDol: itemOrderDol,
                                requestedKg: item.orderedKg || 0,
                                coldRoomStockDol: itemColdStockDol,
                                coldRoomStockKg: item.availableColdRoomKg || 0,
                                allocations: allocs
                            };
                        });

                        setFlavourGroups(groups);
                        setIsLoadingPreview(false);
                        return;
                    }
                } catch (err) {
                    console.warn("Could not fetch dispatch preview from server, falling back to order items:", err);
                }

                // Fallback from order.flavours / order.orderFlavourList
                if (isMounted) {
                    const itemsToMap = (order.flavours && order.flavours.length > 0)
                        ? order.flavours
                        : (order.orderFlavourList || []);

                    const groupMap = new Map();
                    itemsToMap.forEach((item, idx) => {
                        const code = item.code || item.flavourCode || '';
                        const name = item.name || item.flavourName || code;
                        const qty = parseFloat(item.orderQuantity) || 0;
                        const dol = Math.floor(qty / 3);
                        const matchedFlavour = flavours.find(f => (code && f.code?.toLowerCase() === code.toLowerCase()) || (name && f.name?.toLowerCase() === name.toLowerCase()));
                        const finalCode = matchedFlavour ? matchedFlavour.code : code;
                        const finalName = matchedFlavour ? matchedFlavour.name : name;
                        const coldStockKg = matchedFlavour ? (matchedFlavour.coldRoomStock || 0) : qty;
                        const coldStockDol = Math.floor(coldStockKg / 3);
                        const bNo = item.batchNumber || '100';

                        const key = (finalCode || finalName).trim().toUpperCase();
                        if (groupMap.has(key)) {
                            const existing = groupMap.get(key);
                            existing.orderDol += dol;
                            existing.requestedKg += qty;
                            existing.allocations.push({
                                id: `alloc-${finalCode}-${existing.allocations.length}-${Date.now()}-${Math.random()}`,
                                batchNumber: bNo,
                                dispatchDol: dol,
                                dispatchKg: qty,
                                coldRoomStockDol: coldStockDol,
                                coldRoomStockKg: coldStockKg
                            });
                        } else {
                            groupMap.set(key, {
                                id: `group-${finalCode}-${idx}-${Date.now()}-${Math.random()}`,
                                flavourCode: finalCode,
                                flavourName: finalName,
                                orderDol: dol,
                                requestedKg: qty,
                                coldRoomStockDol: coldStockDol,
                                coldRoomStockKg: coldStockKg,
                                allocations: [{
                                    id: `alloc-${finalCode}-0-${Date.now()}-${Math.random()}`,
                                    batchNumber: bNo,
                                    dispatchDol: dol,
                                    dispatchKg: qty,
                                    coldRoomStockDol: coldStockDol,
                                    coldRoomStockKg: coldStockKg
                                }]
                            });
                        }
                    });

                    const initialGroups = Array.from(groupMap.values());
                    setFlavourGroups(initialGroups.length > 0 ? initialGroups : [{
                        id: `group-init-${Date.now()}`,
                        flavourCode: '',
                        flavourName: '',
                        orderDol: '',
                        requestedKg: 0,
                        coldRoomStockDol: 0,
                        coldRoomStockKg: 0,
                        allocations: [{
                            id: `alloc-init-${Date.now()}`,
                            batchNumber: '100',
                            dispatchDol: '',
                            dispatchKg: 0,
                            coldRoomStockDol: 0,
                            coldRoomStockKg: 0
                        }]
                    }]);
                    setIsLoadingPreview(false);
                }
            };

            loadAllocations();

            return () => {
                isMounted = false;
            };
        }
    }, [isOpen, order, flavours]);

    // Live totals across all groups and allocations
    const { totalDispatchDol, totalDispatchKg, totalOrderDol } = useMemo(() => {
        let totalDispatchDol = 0;
        let totalOrderDol = 0;

        flavourGroups.forEach(g => {
            totalOrderDol += (parseFloat(g.orderDol) || 0);
            (g.allocations || []).forEach(alloc => {
                const dDol = parseFloat(alloc.dispatchDol);
                if (!isNaN(dDol)) {
                    totalDispatchDol += dDol;
                }
            });
        });

        return {
            totalDispatchDol: Math.round(totalDispatchDol),
            totalDispatchKg: Math.round(totalDispatchDol * 3),
            totalOrderDol: Math.round(totalOrderDol)
        };
    }, [flavourGroups]);

    if (!isOpen || !order) return null;

    // Handle flavour autocomplete change
    const handleFlavourChange = (groupId, value, selectedObj) => {
        setFlavourGroups(prevGroups => {
            return prevGroups.map(group => {
                if (group.id !== groupId) return group;

                let code = selectedObj?.code || '';
                let name = selectedObj?.name || value;

                if (!code && typeof value === 'string') {
                    const cleanVal = value.trim();
                    const matched = flavours.find(f =>
                        f.code?.toLowerCase() === cleanVal.toLowerCase() ||
                        f.name?.toLowerCase() === cleanVal.toLowerCase() ||
                        `${f.code} - ${f.name}`.toLowerCase() === cleanVal.toLowerCase()
                    );
                    if (matched) {
                        code = matched.code;
                        name = matched.name;
                    }
                }

                const matchedFlavour = flavours.find(f => (code && f.code?.toLowerCase() === code.toLowerCase()) || (name && f.name?.toLowerCase() === name.toLowerCase()));
                const coldStockKg = matchedFlavour ? (matchedFlavour.coldRoomStock || 0) : (selectedObj?.coldRoomStock || 0);
                const coldStockDol = Math.floor(coldStockKg / 3);

                const updatedAllocs = group.allocations.map(a => ({
                    ...a,
                    coldRoomStockDol: coldStockDol,
                    coldRoomStockKg: coldStockKg
                }));

                return {
                    ...group,
                    flavourCode: code,
                    flavourName: name,
                    coldRoomStockDol: coldStockDol,
                    coldRoomStockKg: coldStockKg,
                    allocations: updatedAllocs
                };
            });
        });
    };

    // Handle editing order requested quantity (in dol) for a flavour group
    const handleOrderDolChange = (groupId, value) => {
        setFlavourGroups(prevGroups => {
            return prevGroups.map(group => {
                if (group.id !== groupId) return group;

                const oDol = value === '' ? '' : Math.max(0, parseInt(value, 10) || 0);
                const reqKg = oDol === '' ? 0 : oDol * 3;

                // If this group has only 1 allocation and dispatchDol is empty or 0, sync dispatchDol to oDol
                let updatedAllocs = group.allocations;
                if (group.allocations.length === 1 && (group.allocations[0].dispatchDol === '' || group.allocations[0].dispatchDol === 0)) {
                    updatedAllocs = [{
                        ...group.allocations[0],
                        dispatchDol: oDol,
                        dispatchKg: reqKg
                    }];
                }

                return {
                    ...group,
                    orderDol: oDol,
                    requestedKg: reqKg,
                    allocations: updatedAllocs
                };
            });
        });
    };

    // Handle editing batch sub-row fields
    const handleAllocationChange = (groupId, allocId, field, value) => {
        setFlavourGroups(prevGroups => {
            return prevGroups.map(group => {
                if (group.id !== groupId) return group;

                const updatedAllocs = group.allocations.map(alloc => {
                    if (alloc.id !== allocId) return alloc;

                    if (field === 'dispatchDol') {
                        const dolVal = value === '' ? '' : Math.max(0, parseInt(value, 10) || 0);
                        return {
                            ...alloc,
                            dispatchDol: dolVal,
                            dispatchKg: dolVal === '' ? 0 : dolVal * 3
                        };
                    } else if (field === 'batchNumber') {
                        return {
                            ...alloc,
                            batchNumber: value
                        };
                    }

                    return { ...alloc, [field]: value };
                });

                return {
                    ...group,
                    allocations: updatedAllocs
                };
            });
        });
    };

    // Add another batch line under a specific flavour
    const handleAddBatch = (groupId) => {
        setFlavourGroups(prevGroups => {
            return prevGroups.map(group => {
                if (group.id !== groupId) return group;

                const newAlloc = {
                    id: `alloc-${group.flavourCode}-${Date.now()}-${Math.random()}`,
                    batchNumber: '100',
                    dispatchDol: 0,
                    dispatchKg: 0,
                    coldRoomStockDol: group.coldRoomStockDol,
                    coldRoomStockKg: group.coldRoomStockKg
                };

                return {
                    ...group,
                    allocations: [...group.allocations, newAlloc]
                };
            });
        });
    };

    // Remove a batch sub-row
    const handleRemoveAllocation = (groupId, allocId) => {
        setFlavourGroups(prevGroups => {
            return prevGroups.map(group => {
                if (group.id !== groupId) return group;

                if (group.allocations.length <= 1) {
                    // If it's the last allocation in the group, check if it's the only group
                    return null;
                }

                return {
                    ...group,
                    allocations: group.allocations.filter(a => a.id !== allocId)
                };
            }).filter(Boolean);
        });
    };

    // Add an entirely new flavour group
    const handleAddFlavour = () => {
        const newGroup = {
            id: `group-new-${Date.now()}-${Math.random()}`,
            flavourCode: '',
            flavourName: '',
            orderDol: '',
            requestedKg: 0,
            coldRoomStockDol: 0,
            coldRoomStockKg: 0,
            allocations: [{
                id: `alloc-new-${Date.now()}-${Math.random()}`,
                batchNumber: '100',
                dispatchDol: '',
                dispatchKg: 0,
                coldRoomStockDol: 0,
                coldRoomStockKg: 0
            }]
        };
        setFlavourGroups(prev => [...prev, newGroup]);
    };

    // Build payload for backend dispatch endpoint
    const getValidPayload = () => {
        const orderFlavourList = [];

        flavourGroups.forEach(g => {
            let code = g.flavourCode;
            if (!code) {
                const matched = flavours.find(f => f.name?.toLowerCase() === g.flavourName?.toLowerCase());
                code = matched ? matched.code : g.flavourName;
            }

            (g.allocations || []).forEach(alloc => {
                const dDol = parseFloat(alloc.dispatchDol) || 0;
                if (dDol > 0 && code) {
                    orderFlavourList.push({
                        flavourCode: code,
                        orderQuantity: Math.round(dDol * 3),
                        batchNumber: alloc.batchNumber ? String(alloc.batchNumber).replace(/^#/i, '').trim() : '100'
                    });
                }
            });
        });

        if (orderFlavourList.length === 0) return null;

        return {
            storeId: order.storeId || order.masterStore?.id,
            orderFlavourList
        };
    };

    // 📄 Download PDF Dispatch List from exact grouped state
    const handleDownloadPdf = () => {
        const validGroups = flavourGroups.filter(g => (g.flavourCode || g.flavourName));
        if (validGroups.length === 0) {
            alert('Please specify dispatch quantities (>0) for at least one flavour before downloading the dispatch list.');
            return;
        }

        setDownloadingPdf(true);
        try {
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

            const tableColumn = ["#", "Flavour", "Order (Dol)", "Batch No.", "Dispatch (Dol)", "Dispatch (KG)"];
            const tableRows = [];
            let totalDol = 0;
            let totalKg = 0;

            validGroups.forEach((g, gIdx) => {
                const validAllocs = g.allocations.filter(a => (parseFloat(a.dispatchDol) || 0) > 0);
                const spanCount = Math.max(1, validAllocs.length);
                const allocList = validAllocs.length > 0 ? validAllocs : g.allocations;

                allocList.forEach((alloc, aIdx) => {
                    const dol = parseFloat(alloc.dispatchDol) || 0;
                    const kg = dol * 3;
                    totalDol += dol;
                    totalKg += kg;
                    const bNo = formatBatchNo(alloc.batchNumber);

                    if (aIdx === 0) {
                        tableRows.push([
                            { content: String(gIdx + 1), rowSpan: spanCount, styles: { valign: 'middle', halign: 'center' } },
                            { content: g.flavourName || g.flavourCode, rowSpan: spanCount, styles: { valign: 'middle', fontStyle: 'bold' } },
                            { content: `${g.orderDol || 0} dol`, rowSpan: spanCount, styles: { valign: 'middle', halign: 'center' } },
                            { content: bNo, styles: { halign: 'center' } },
                            { content: `${dol} dol`, styles: { halign: 'right' } },
                            { content: `${kg} kg`, styles: { halign: 'right' } }
                        ]);
                    } else {
                        tableRows.push([
                            { content: bNo, styles: { halign: 'center' } },
                            { content: `${dol} dol`, styles: { halign: 'right' } },
                            { content: `${kg} kg`, styles: { halign: 'right' } }
                        ]);
                    }
                });
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
                    0: { halign: 'center', cellWidth: 12 },
                    1: { halign: 'left', fontStyle: 'bold' },
                    2: { halign: 'center', cellWidth: 28 },
                    3: { halign: 'center', cellWidth: 28 },
                    4: { halign: 'right', cellWidth: 28 },
                    5: { halign: 'right', cellWidth: 28 }
                },
                foot: [
                    [
                        { content: 'Grand Total', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } },
                        { content: `${totalDol} dol`, styles: { halign: 'right', fontStyle: 'bold' } },
                        { content: `${totalKg} kg`, styles: { halign: 'right', fontStyle: 'bold' } }
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
            console.error("Error generating dispatch PDF:", err);
            alert("Failed to generate dispatch list: " + err.message);
        } finally {
            setDownloadingPdf(false);
        }
    };

    // 🚚 Confirm & Dispatch
    const handleConfirm = async () => {
        const payload = getValidPayload();
        if (!payload) {
            alert('Please enter dispatch quantities (>0) for at least one flavour before dispatching.');
            return;
        }

        // Validate that cold room total per flavour is not exceeded
        const flavourDispatchedMap = new Map();
        flavourGroups.forEach(g => {
            const fCode = g.flavourCode || g.flavourName;
            if (fCode) {
                const key = fCode.trim().toUpperCase();
                let groupDispatchedKg = 0;
                (g.allocations || []).forEach(a => {
                    groupDispatchedKg += ((parseFloat(a.dispatchDol) || 0) * 3);
                });
                flavourDispatchedMap.set(key, (flavourDispatchedMap.get(key) || 0) + groupDispatchedKg);
            }
        });

        let hasColdRoomShortfall = false;
        const shortfallItems = [];

        flavourDispatchedMap.forEach((reqKg, key) => {
            const matchedFlavour = flavours.find(f => f.code?.toUpperCase() === key || f.name?.toUpperCase() === key);
            const coldStockKg = matchedFlavour ? (matchedFlavour.coldRoomStock ?? 0) : reqKg;

            if (reqKg > coldStockKg) {
                hasColdRoomShortfall = true;
                const fName = matchedFlavour ? matchedFlavour.name : key;
                shortfallItems.push(`${fName} (Dispatch: ${Math.floor(reqKg / 3)} dol / ${reqKg} kg, Cold Room: ${Math.floor(coldStockKg / 3)} dol / ${coldStockKg} kg)`);
            }
        });

        if (hasColdRoomShortfall) {
            setStockAlert({
                message: `Insufficient Cold Room stock for: ${shortfallItems.join(', ')}`
            });
            return;
        }

        setIsSubmitting(true);
        try {
            await onConfirmDispatch(payload);
        } catch (err) {
            console.error("Error dispatching order:", err);
            const msg = err.message ? err.message.replace(/^Failed to dispatch order:\s*/i, '').replace(/^Dispatch failed:\s*/i, '') : "Insufficient Cold Room stock.";
            setStockAlert({ message: msg });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDiscardChanges = () => {
        setStockAlert(null);
    };

    const handlePlanProduction = async () => {
        setIsSubmitting(true);
        try {
            const payload = getValidPayload();
            const orderId = order.id || order.orderId;
            if (payload && orderId) {
                await updateStoreOrderApi(orderId, payload);
            } else if (orderId) {
                await updateOrderStatusApi(orderId, 'Pending');
            }
        } catch (err) {
            console.error("Error updating order to pending:", err);
            try {
                const orderId = order.id || order.orderId;
                if (orderId) {
                    await updateOrderStatusApi(orderId, 'Pending');
                }
            } catch (patchErr) {
                console.error("Error updating status to pending:", patchErr);
            }
        } finally {
            setIsSubmitting(false);
            setStockAlert(null);
            if (onClose) onClose();
            navigate('/store-orders');
        }
    };

    return (
        <div className="overlay open" onClick={onClose}>
            <div className="modal" style={{ width: '760px', maxWidth: '95vw', overflow: 'visible' }} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>🚚 Dispatch Order</span>
                        <span style={{ fontSize: '14px', color: 'var(--blue-deep)', background: '#EFF6FF', padding: '2px 8px', borderRadius: '4px', border: '1px solid #BFDBFE' }}>
                            {order.orderId ? `SO-${order.orderId}` : `SO-${order.id}`}
                        </span>
                    </h2>
                    <button type="button" className="btn-ghost" onClick={onClose} style={{ padding: '4px 8px', fontSize: '16px' }}>✕</button>
                </div>
                <div className="modal-sub" style={{ marginBottom: '16px' }}>
                    Review and adjust batch allocations and dispatch quantities (in Dol) before confirming dispatch.
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
                        <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ink-soft)', fontWeight: 700 }}>Total Dispatched</div>
                        <div style={{ fontWeight: 800, color: 'var(--blue-deep)', fontSize: '14px', marginTop: '2px' }}>
                            {totalDispatchDol} dol <span style={{ fontSize: '12px', color: 'var(--ink-soft)', fontWeight: 600 }}>({totalDispatchKg} kg)</span>
                        </div>
                    </div>
                </div>

                {/* Grouped Table Header */}
                <div className="flavour-table-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span className="label" style={{ fontWeight: 700, color: 'var(--navy)', fontSize: '13px' }}>
                        📋 Batch Allocation Table
                    </span>
                    {isLoadingPreview && (
                        <span style={{ fontSize: '12px', color: '#2563EB', fontWeight: 600 }}>
                            ⚡ Loading FIFO Allocations...
                        </span>
                    )}
                </div>

                {/* Grouped 5-Column Table with rowSpan */}
                <div style={{ border: '1px solid var(--line)', borderRadius: '8px', background: '#FFFFFF', overflow: 'visible' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ background: '#F8FAFC', borderBottom: '2px solid var(--line)', textAlign: 'left', color: 'var(--navy)' }}>
                                <th style={{ padding: '10px 14px', width: '34%' }}>FLAVOUR</th>
                                <th style={{ padding: '10px 10px', width: '14%', textAlign: 'center' }}>ORDER (DOL)</th>
                                <th style={{ padding: '10px 12px', width: '28%' }}>BATCH & DISPATCH (DOL)</th>
                                <th style={{ padding: '10px 12px', width: '16%', textAlign: 'center' }}>COLD ROOM STOCK</th>
                                <th style={{ padding: '10px 10px', width: '8%', textAlign: 'center' }}>ACTION</th>
                            </tr>
                        </thead>
                        <tbody>
                            {flavourGroups.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: 'var(--ink-soft)' }}>
                                        No flavour items added yet.
                                    </td>
                                </tr>
                            ) : (
                                flavourGroups.map((group, gIdx) => {
                                    const spanCount = group.allocations.length;
                                    const groupTotalDispatchDol = group.allocations.reduce((sum, a) => sum + (parseFloat(a.dispatchDol) || 0), 0);
                                    const hasShortfall = group.orderDol > 0 && groupTotalDispatchDol < group.orderDol;

                                    return group.allocations.map((alloc, aIdx) => {
                                        const isFirst = aIdx === 0;
                                        const isLast = aIdx === spanCount - 1;
                                        const isExceeded = (parseFloat(alloc.dispatchDol) || 0) > (alloc.coldRoomStockDol || 0) && (alloc.coldRoomStockDol > 0);

                                        return (
                                            <tr
                                                key={alloc.id}
                                                style={{
                                                    borderBottom: isLast ? '2px solid var(--line)' : '1px dashed #E2E8F0',
                                                    background: gIdx % 2 === 1 ? '#FAFBFD' : '#FFFFFF'
                                                }}
                                            >
                                                {/* 1. FLAVOUR (rowSpan) */}
                                                {isFirst && (
                                                    <td
                                                        rowSpan={spanCount}
                                                        style={{
                                                            padding: '10px 12px',
                                                            verticalAlign: 'top',
                                                            borderRight: '1px solid #F1F5F9',
                                                            overflow: 'visible'
                                                        }}
                                                    >
                                                        <AutocompleteInput
                                                            value={group.flavourCode && group.flavourName ? `${group.flavourCode} - ${group.flavourName}` : (group.flavourName || '')}
                                                            onChange={(val, selectedObj) => handleFlavourChange(group.id, val, selectedObj)}
                                                            items={flavours}
                                                            placeholder="Select flavour..."
                                                        />
                                                        <button
                                                            type="button"
                                                            className="btn-ghost"
                                                            onClick={() => handleAddBatch(group.id)}
                                                            style={{
                                                                fontSize: '11px',
                                                                color: '#2563EB',
                                                                padding: '2px 6px',
                                                                fontWeight: 600,
                                                                marginTop: '6px',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '2px',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            + Add Batch
                                                        </button>
                                                    </td>
                                                )}

                                                {/* 2. ORDER (DOL) (rowSpan) */}
                                                {isFirst && (
                                                    <td
                                                        rowSpan={spanCount}
                                                        style={{
                                                            padding: '10px 12px',
                                                            textAlign: 'center',
                                                            verticalAlign: 'middle',
                                                            borderRight: '1px solid #F1F5F9'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                step="1"
                                                                value={group.orderDol !== undefined ? group.orderDol : ''}
                                                                onChange={(e) => handleOrderDolChange(group.id, e.target.value)}
                                                                placeholder="0"
                                                                style={{
                                                                    width: '55px',
                                                                    padding: '5px 6px',
                                                                    textAlign: 'center',
                                                                    fontWeight: 700,
                                                                    fontSize: '13px',
                                                                    border: '1.5px solid var(--line)',
                                                                    borderRadius: '6px',
                                                                    background: '#FFFFFF'
                                                                }}
                                                            />
                                                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-soft)' }}>dol</span>
                                                        </div>
                                                        {group.orderDol > 0 && (
                                                            <span style={{ fontSize: '11px', color: 'var(--ink-soft)', display: 'block', marginTop: '2px' }}>
                                                                ({group.orderDol * 3} kg)
                                                            </span>
                                                        )}
                                                        {hasShortfall && (
                                                            <div style={{ fontSize: '10px', color: '#DC2626', fontWeight: 700, marginTop: '3px' }}>
                                                                ⚠️ {group.orderDol - groupTotalDispatchDol} dol short
                                                            </div>
                                                        )}
                                                    </td>
                                                )}

                                                {/* 3. BATCH & DISPATCH (DOL) */}
                                                <td style={{ padding: '8px 12px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <input
                                                            type="text"
                                                            value={alloc.batchNumber || ''}
                                                            onChange={(e) => handleAllocationChange(group.id, alloc.id, 'batchNumber', e.target.value)}
                                                            placeholder="Batch"
                                                            style={{
                                                                width: '68px',
                                                                padding: '5px 8px',
                                                                textAlign: 'center',
                                                                fontWeight: 700,
                                                                color: 'var(--blue-deep)',
                                                                border: '1.5px solid var(--line)',
                                                                borderRadius: '6px',
                                                                fontSize: '12px',
                                                                background: '#FFFFFF'
                                                            }}
                                                        />
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="1"
                                                            value={alloc.dispatchDol}
                                                            onChange={(e) => handleAllocationChange(group.id, alloc.id, 'dispatchDol', e.target.value)}
                                                            placeholder="0"
                                                            style={{
                                                                width: '60px',
                                                                padding: '5px 8px',
                                                                textAlign: 'center',
                                                                fontWeight: 700,
                                                                fontSize: '13px',
                                                                border: isExceeded ? '1.5px solid #EF4444' : '1.5px solid var(--line)',
                                                                background: isExceeded ? '#FEF2F2' : '#FFFFFF',
                                                                borderRadius: '6px'
                                                            }}
                                                        />
                                                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-soft)' }}>dol</span>
                                                    </div>
                                                </td>

                                                {/* 4. COLD ROOM STOCK */}
                                                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                                    <span style={{ fontWeight: 700, color: alloc.coldRoomStockDol > 0 ? '#1E40AF' : 'var(--ink-soft)', fontSize: '13px' }}>
                                                        {alloc.coldRoomStockDol || 0} dol
                                                    </span>
                                                    <span style={{ fontSize: '11px', color: 'var(--ink-soft)', display: 'block' }}>
                                                        ({(alloc.coldRoomStockDol || 0) * 3} kg)
                                                    </span>
                                                </td>

                                                {/* 5. ACTION */}
                                                <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                                    <button
                                                        type="button"
                                                        className="rm-row"
                                                        onClick={() => handleRemoveAllocation(group.id, alloc.id)}
                                                        style={{ fontSize: '14px', color: '#DC2626', cursor: 'pointer' }}
                                                        title="Remove batch line"
                                                    >
                                                        ✕
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    });
                                })
                            )}
                        </tbody>
                        <tfoot>
                            <tr className="totals-row" style={{ background: '#F8FAFC', borderTop: '2px solid var(--line)', fontWeight: 800 }}>
                                <td style={{ padding: '10px 14px' }}>
                                    <button
                                        type="button"
                                        className="btn-ghost"
                                        onClick={handleAddFlavour}
                                        style={{ fontSize: '12px', color: '#2563EB', padding: '4px 10px', fontWeight: 700, border: '1px dashed #BFDBFE', borderRadius: '6px', background: '#EFF6FF' }}
                                    >
                                        + Add Flavour
                                    </button>
                                </td>
                                <td style={{ textAlign: 'center', padding: '10px', color: 'var(--ink)' }}>
                                    {totalOrderDol} dol
                                </td>
                                <td style={{ padding: '10px 12px', color: 'var(--blue-deep)', fontSize: '14px' }}>
                                    Total: <strong>{totalDispatchDol} dol</strong> <span style={{ fontSize: '12px', color: 'var(--ink-soft)', fontWeight: 600 }}>({totalDispatchKg} kg)</span>
                                </td>
                                <td colSpan="2" style={{ padding: '10px 14px', textAlign: 'right', fontSize: '13px', color: totalDispatchDol < totalOrderDol ? '#DC2626' : 'var(--green)' }}>
                                    {totalDispatchDol < totalOrderDol ? `⚠️ Short by ${totalOrderDol - totalDispatchDol} dol` : '✓ Fully Covered'}
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
                        disabled={downloadingPdf || isSubmitting || totalDispatchDol <= 0}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
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
                            disabled={isSubmitting || totalDispatchDol <= 0}
                            onClick={handleConfirm}
                            style={{ padding: '8px 20px', fontWeight: 700 }}
                        >
                            {isSubmitting ? '⏳ Dispatching...' : 'Confirm & Dispatch 🚚'}
                        </button>
                    </div>
                </div>

                {/* Stock Alert Warning Modal */}
                {stockAlert && (
                    <div className="overlay open" style={{ zIndex: 1200 }}>
                        <div className="modal" style={{ width: '440px', textAlign: 'center', padding: '24px', borderRadius: '12px', background: 'var(--card)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ fontSize: '36px', marginBottom: '8px' }}>⚠️</div>
                            <h3 style={{ color: '#DC2626', margin: '0 0 10px 0', fontSize: '18px', fontWeight: 700 }}>Stock Alert</h3>
                            <p style={{ color: 'var(--ink)', fontSize: '14px', margin: '0 0 24px 0', lineHeight: '1.5' }}>
                                {stockAlert.message || 'One or more items exceed available Cold Room stock.'}
                            </p>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                                <button
                                    type="button"
                                    className="btn-ghost"
                                    style={{ border: '1px solid var(--line)', padding: '9px 16px', fontWeight: 600, borderRadius: '6px' }}
                                    onClick={handleDiscardChanges}
                                >
                                    Discard Changes
                                </button>
                                <button
                                    type="button"
                                    className="btn-primary"
                                    style={{ background: '#2563EB', padding: '9px 18px', fontWeight: 600, borderRadius: '6px' }}
                                    onClick={handlePlanProduction}
                                >
                                    Plan Production 🏭
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default DispatchModal;
