import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
    fetchAllSaleOrders,
    completeSaleOrderApi,
    createAndCompleteSaleApi,
    dispatchOrderApi,
    convertToSaleApi
} from '../../../services/saleService';
import { updateStoreOrderApi } from '../../../services/storeOrderService';
import { fetchAdminDashboard } from '../../../services/adminService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import AutocompleteInput from '../../../components/common/AutocompleteInput';
import DispatchModal from './DispatchModal';

function SalePage() {
    const [originalItems, setOriginalItems] = useState([]);
    const [showWarningModal, setShowWarningModal] = useState(false);
    const [warningPayload, setWarningPayload] = useState(null);
    const [orders, setOrders] = useState([]);
    const [stores, setStores] = useState([]);
    const [flavours, setFlavours] = useState([]);
    const [filters, setFilters] = useState({ store: '', fromDate: '', toDate: '', status: 'ALL' });
    const [sortConfig, setSortConfig] = useState({ key: 'orderDate', direction: 'descending' });

    // FIFO Dispatch Modal State
    const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
    const [selectedDispatchOrder, setSelectedDispatchOrder] = useState(null);

    // Convert / Edit Modal State Management
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeOrder, setActiveOrder] = useState(null);
    const [editableItems, setEditableItems] = useState([]);
    const [isCreating, setIsCreating] = useState(false);
    const flavourInputRefs = useRef([]);
    const kgInputRefs = useRef([]);

    const loadBackendData = useCallback(async () => {
        try {
            const [allOrders, adminData] = await Promise.all([
                fetchAllSaleOrders().catch(() => null),
                fetchAdminDashboard().catch(() => null)
            ]);

            if (adminData) {
                if (adminData.storeList && adminData.storeList.length > 0) setStores(adminData.storeList);
                if (adminData.flavourList && adminData.flavourList.length > 0) setFlavours(adminData.flavourList);
            }

            if (allOrders !== null) {
                setOrders(allOrders);
            }
        } catch (err) {
            console.error("Backend error loading sale page data:", err);
        }
    }, []);

    useEffect(() => {
        loadBackendData();
    }, [loadBackendData]);

    useEffect(() => {
        if (isModalOpen) {
            flavourInputRefs.current = flavourInputRefs.current.slice(0, editableItems.length);
            kgInputRefs.current = kgInputRefs.current.slice(0, editableItems.length);

            if (flavourInputRefs.current[flavourInputRefs.current.length - 1]) {
                flavourInputRefs.current[flavourInputRefs.current.length - 1].focus();
            }
        }
    }, [isModalOpen, editableItems.length]);

    const resetFilters = useCallback(() => {
        setFilters({ store: '', fromDate: '', toDate: '', status: 'ALL' });
    }, []);

    const requestSort = useCallback((key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    }, [sortConfig]);

    const getSortIndicator = (name) => {
        if (sortConfig.key === name) {
            return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
        }
        return '';
    };

    // 🚚 Open Dispatch Modal with FIFO Preview
    const handleOpenDispatch = (order) => {
        setSelectedDispatchOrder(order);
        setIsDispatchModalOpen(true);
    };

    // 🚚 Confirm & Dispatch Order
    const handleConfirmDispatch = async (payload) => {
        if (!selectedDispatchOrder) return;
        try {
            await dispatchOrderApi(selectedDispatchOrder.id, payload);
            setIsDispatchModalOpen(false);
            setSelectedDispatchOrder(null);
            await loadBackendData();
        } catch (err) {
            console.error("Error dispatching order:", err);
            alert("Dispatch failed: " + err.message);
        }
    };

    // ✏️ Convert to Sale (Mark Completed)
    const handleConvertToSale = async (order) => {
        try {
            await convertToSaleApi(order.id);
            await loadBackendData();
        } catch (err) {
            console.error("Error converting to sale:", err);
            alert("Failed to convert to sale: " + err.message);
        }
    };

    // 📄 Download PDF Invoice
    const handleDownloadInvoice = (order) => {
        const doc = new jsPDF();
        doc.setFontSize(22);
        doc.text('Tax Invoice / Sale Bill', 14, 22);

        const storeName = order.masterStore?.name || order.store || 'NA';
        const formattedOrderId = order.orderId ? `SO-${order.orderId}` : `SO-${order.id}`;

        doc.setFontSize(11);
        doc.text(`Invoice / Order: ${formattedOrderId}`, 14, 32);
        doc.text(`Store: ${storeName}`, 14, 38);
        doc.text(`Order Date: ${order.orderDate || 'NA'}`, 14, 44);
        doc.text(`Completed Date: ${order.completedDate || 'NA'}`, 14, 50);

        const tableColumn = ["#", "Flavour", "Quantity (KG)", "Dol", "Unit Price", "Total Amount"];
        const tableRows = [];
        let totalKg = 0;
        let totalDol = 0;
        let totalAmount = 0;

        // Aggregate by flavour in case items were split across batches
        const flavourMap = new Map();
        (order.flavours || []).forEach(item => {
            const key = item.flavourCode || item.flavourName;
            const existing = flavourMap.get(key);
            const qty = parseFloat(item.orderQuantity) || 0;
            if (existing) {
                existing.quantity += qty;
            } else {
                flavourMap.set(key, {
                    code: item.flavourCode,
                    name: item.flavourName || item.flavourCode,
                    quantity: qty
                });
            }
        });

        let index = 1;
        flavourMap.forEach((item) => {
            const flavour = flavours.find(f => (f.name && item.name && f.name.toLowerCase() === item.name.toLowerCase()) || f.code === item.code);
            const price = flavour?.price || 0;
            const quantity = item.quantity;
            const dol = Math.floor(quantity / 3) || 0;
            const amount = quantity * price;

            totalKg += quantity;
            totalDol += dol;
            totalAmount += amount;

            const rowData = [
                index++,
                item.name,
                `${quantity} kg`,
                `${dol} dol`,
                `Rs. ${price}`,
                `Rs. ${amount.toLocaleString()}`
            ];
            tableRows.push(rowData);
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
                2: { halign: 'right', cellWidth: 32 },
                3: { halign: 'right', cellWidth: 24 },
                4: { halign: 'right', cellWidth: 28 },
                5: { halign: 'right', fontStyle: 'bold', cellWidth: 35 }
            },
            foot: [
                [
                    { content: 'Grand Total', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } },
                    { content: `${totalKg} kg`, styles: { halign: 'right', fontStyle: 'bold' } },
                    { content: `${totalDol} dol`, styles: { halign: 'right', fontStyle: 'bold' } },
                    { content: '', styles: { fontStyle: 'bold' } },
                    { content: `Rs. ${totalAmount.toLocaleString()}`, styles: { halign: 'right', fontStyle: 'bold' } }
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

        doc.save(`invoice-${formattedOrderId}.pdf`);
    };

    const handleAddNewSale = () => {
        setIsCreating(true);
        setActiveOrder({
            orderId: `SO-${Date.now()}`,
            store: '',
            storeId: '',
            orderDate: new Date().toISOString().split('T')[0],
            status: 'Pending',
            batch: 'NA'
        });
        const initial = [{ uniqueId: Math.random(), name: '', code: '', orderQuantity: '' }];
        setEditableItems(initial);
        setOriginalItems(initial);
        setIsModalOpen(true);
    };


    const handleSaveAndInvoice = async () => {
        let selectedStoreId = activeOrder.storeId;
        let storeName = activeOrder.store;

        if (isCreating) {
            const foundStore = stores.find(s => s.name === activeOrder.store);
            if (!foundStore) {
                alert("Please select a valid store.");
                return;
            }
            selectedStoreId = foundStore.id;
            storeName = foundStore.name;
        }

        const payload = {
            storeId: selectedStoreId,
            batch: activeOrder.batch || 'NA',
            orderFlavourList: editableItems.map(item => ({
                flavourCode: item.code || flavours.find(f => f.name === item.name)?.code || '',
                orderQuantity: parseFloat(item.orderQuantity) || 0
            }))
        };

        // Check for negative stock
        let hasNegativeStock = false;
        editableItems.forEach(item => {
            const flavour = flavours.find(f => f.name === item.name);
            const remainingStock = (item.closingStock !== undefined ? item.closingStock : flavour?.factoryStock || 0) - (parseFloat(item.orderQuantity) || 0);
            if (remainingStock < 0) {
                hasNegativeStock = true;
            }
        });

        let isOriginal = true;
        if (editableItems.length !== originalItems.length) isOriginal = false;
        else {
            editableItems.forEach((item, i) => {
                if (item.code !== originalItems[i].code || parseFloat(item.orderQuantity) !== parseFloat(originalItems[i].orderQuantity)) {
                    isOriginal = false;
                }
            });
        }

        if (hasNegativeStock && !isOriginal) {
            setWarningPayload(payload);
            setShowWarningModal(true);
            return;
        }

        try {
            if (isCreating) {
                await createAndCompleteSaleApi(payload);
            } else {
                await completeSaleOrderApi(activeOrder.id, payload);
            }
            await loadBackendData();
        } catch (err) {
            console.error("Backend sale error:", err);
            alert("Error: Failed to process sale in database.");
            return;
        }

        // Generate PDF Invoice
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.text('Invoice', 14, 22);

        doc.setFontSize(12);
        doc.text(`Order ID: ${activeOrder.orderId}`, 14, 32);
        doc.text(`Store: ${storeName}`, 14, 38);
        doc.text(`Date: ${activeOrder.orderDate}`, 14, 44);

        const tableColumn = ["#", "Flavour", "KG", "Dol", "Price", "Amount"];
        const tableRows = [];

        editableItems.forEach((item, index) => {
            const flavour = flavours.find(f => f.name === item.name);
            const price = flavour?.price || 0;
            const dol = Math.floor(parseFloat(item.orderQuantity) / 3) || 0;
            const amount = (parseFloat(item.orderQuantity) || 0) * price;
            const rowData = [index + 1, item.name, item.orderQuantity, dol, price, amount.toLocaleString()];
            tableRows.push(rowData);
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
                2: { halign: 'right', cellWidth: 32 },
                3: { halign: 'right', cellWidth: 24 },
                4: { halign: 'right', cellWidth: 28 },
                5: { halign: 'right', fontStyle: 'bold', cellWidth: 35 }
            },
            foot: [
                [{ content: 'Total', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } },
                { content: `${totalKg} kg`, styles: { halign: 'right', fontStyle: 'bold' } },
                { content: `${totalDol} dol`, styles: { halign: 'right', fontStyle: 'bold' } },
                { content: '', styles: { fontStyle: 'bold' } },
                { content: `Rs. ${totalAmount.toLocaleString()}`, styles: { halign: 'right', fontStyle: 'bold' } }]
            ],
            footStyles: {
                fillColor: [241, 245, 249],
                textColor: [15, 23, 42],
                fontStyle: 'bold'
            },
            startY: 50,
            showFoot: 'lastPage',
        });

        doc.save(`invoice-${activeOrder.orderId}.pdf`);
        setIsModalOpen(false);
    };

    const handlePlanProduction = async () => {
        if (!isCreating && activeOrder && warningPayload) {
            try {
                await updateStoreOrderApi(activeOrder.id, { ...warningPayload, status: 'Pending' });
                await loadBackendData();
                setIsModalOpen(false);
                setShowWarningModal(false);
            } catch (err) {
                console.error("Error updating order to pending", err);
            }
        } else {
            setShowWarningModal(false);
        }
    };

    const handleKeepOriginalOrder = () => {
        const clonedOriginals = originalItems.map(item => ({ ...item, uniqueId: Math.random() }));
        setEditableItems(clonedOriginals);
        setShowWarningModal(false);
    };

    const handleFlavourEnter = (index) => {
        if (kgInputRefs.current[index]) {
            kgInputRefs.current[index].focus();
        }
    };

    const handleKgEnter = (e, index) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (index === editableItems.length - 1) {
                handleAddItem();
            } else {
                flavourInputRefs.current[index + 1]?.focus();
            }
        }
    };

    const handleItemChange = (uniqueId, field, value, selectedObj) => {
        setEditableItems(prevItems => {
            const newItems = prevItems.map(item => {
                if (item.uniqueId === uniqueId) {
                    if (field === 'name') {
                        let code = selectedObj?.code || '';
                        let name = selectedObj?.name || value;

                        if (!code && typeof value === 'string') {
                            const cleanVal = value.trim();
                            const codeMatch = cleanVal.match(/^([A-Z0-9]+)\s*-\s*(.*)$/);
                            let searchVal = cleanVal;
                            let searchCode = null;
                            if (codeMatch) {
                                searchCode = codeMatch[1];
                                searchVal = codeMatch[2];
                            }

                            const matched = flavours.find(f =>
                                (searchCode && f.code.toLowerCase() === searchCode.toLowerCase()) ||
                                f.code.toLowerCase() === searchVal.toLowerCase() ||
                                f.name.toLowerCase() === searchVal.toLowerCase()
                            );
                            if (matched) {
                                code = matched.code;
                                name = matched.name;
                            }
                        }
                        return { ...item, name, code, error: false };
                    }
                    return { ...item, [field]: value };
                }
                return item;
            });

            const seen = new Set();
            return newItems.map(item => {
                if (item.name && seen.has(item.name)) {
                    return { ...item, error: true };
                }
                if (item.name) {
                    seen.add(item.name);
                }
                return { ...item, error: false };
            });
        });
    };

    const handleAddItem = () => {
        setEditableItems(prev => [...prev, {
            uniqueId: Math.random(),
            name: '',
            code: '',
            orderQuantity: '',
            error: false
        }]);
    };

    const handleRemoveItem = (uniqueId) => {
        if (editableItems.length > 1) {
            setEditableItems(prev => prev.filter(item => item.uniqueId !== uniqueId));
        }
    };



    const { totalKg, totalDol, totalAmount } = useMemo(() => {
        return editableItems.reduce((acc, item) => {
            const kg = parseFloat(item.orderQuantity) || 0;
            const flavour = flavours.find(f => f.name === item.name);
            const price = flavour?.price || 0;
            acc.totalKg += kg;
            acc.totalDol += Math.floor(kg / 3);
            acc.totalAmount += kg * price;
            return acc;
        }, { totalKg: 0, totalDol: 0, totalAmount: 0 });
    }, [editableItems, flavours]);

    const handleFilterChange = useCallback((e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    }, []);

    const filteredOrders = useMemo(() => {
        let filteredItems = [...orders];

        if (filters.store) {
            filteredItems = filteredItems.filter(order => {
                const sName = order.masterStore?.name || order.store || '';
                return sName.toLowerCase().includes(filters.store.toLowerCase());
            });
        }
        if (filters.fromDate) {
            filteredItems = filteredItems.filter(order => new Date(order.orderDate) >= new Date(filters.fromDate));
        }
        if (filters.toDate) {
            filteredItems = filteredItems.filter(order => new Date(order.orderDate) <= new Date(filters.toDate));
        }
        if (filters.status && filters.status !== 'ALL') {
            filteredItems = filteredItems.filter(order => order.status && order.status.toLowerCase() === filters.status.toLowerCase());
        } else {
            // Only active in-flight orders: ready & dispatched
            filteredItems = filteredItems.filter(order => ['ready', 'dispatched'].includes((order.status || '').toLowerCase()));
        }
        return filteredItems;
    }, [orders, filters]);

    const pendingOrders = useMemo(() => {
        const list = [...filteredOrders];

        if (sortConfig.key) {
            list.sort((a, b) => {
                const valA = sortConfig.key === 'store' ? (a.masterStore?.name || a.store || '') : a[sortConfig.key];
                const valB = sortConfig.key === 'store' ? (b.masterStore?.name || b.store || '') : b[sortConfig.key];
                if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return list;
    }, [filteredOrders, sortConfig]);

    return (
        <div className="container">
            <div className="page-head">
                <div>
                    <div className="crumb">Factory Module</div>
                    <h1>Sale Operations</h1>
                </div>
                <button className="btn-primary" onClick={handleAddNewSale}>+ Add New Sale</button>
            </div>

            <div className="filters">
                <div className="field">
                    <label>Store</label>
                    <AutocompleteInput
                        value={filters.store}
                        onChange={(value) => handleFilterChange({ target: { name: 'store', value } })}
                        items={stores.map(store => store.name)}
                        placeholder="All Stores"
                    />
                </div>
                <div className="field">
                    <label>Status</label>
                    <select name="status" value={filters.status} onChange={handleFilterChange} style={{ height: '40px', borderRadius: '6px', border: '1px solid var(--line)', padding: '0 10px', background: 'var(--card)', color: 'var(--ink)' }}>
                        <option value="ALL">All Active Statuses (Ready, Dispatched)</option>
                        <option value="Ready">Ready</option>
                        <option value="Dispatched">Dispatched</option>
                    </select>
                </div>
                <div className="field">
                    <label>From Date</label>
                    <input type="date" name="fromDate" value={filters.fromDate} onChange={handleFilterChange} />
                </div>
                <div className="field">
                    <label>To Date</label>
                    <input type="date" name="toDate" value={filters.toDate} onChange={handleFilterChange} />
                </div>
                <button className="btn-ghost" onClick={resetFilters}>Reset</button>
            </div>

            <div className="table-responsive-wrapper" style={{ background: 'var(--card)', borderRadius: 'var(--radius)', border: '1px solid var(--line)', overflow: 'hidden' }}>
                <table>
                    <thead>
                        <tr>
                            <th className="sortable" onClick={() => requestSort('id')}>ORDER ID <span className="sort-arrow">{getSortIndicator('id')}</span></th>
                            <th className="sortable" onClick={() => requestSort('orderDate')}>ORDER DATE <span className="sort-arrow">{getSortIndicator('orderDate')}</span></th>
                            <th className="sortable" onClick={() => requestSort('store')}>STORE NAME <span className="sort-arrow">{getSortIndicator('store')}</span></th>
                            <th style={{ textAlign: 'center' }}>STATUS</th>
                            <th style={{ textAlign: 'center', width: '220px' }}>ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pendingOrders.length === 0 ? (
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'center', color: 'var(--ink-soft)', padding: '30px', fontStyle: 'italic', fontWeight: '500' }}>
                                    No active in-flight orders found matching filter criteria.
                                </td>
                            </tr>
                        ) : (
                            pendingOrders.map((order, i) => {
                                const status = (order.status || '').toLowerCase();
                                const formattedId = order.orderId ? `SO-${order.orderId}` : `SO-${order.id}`;

                                return (
                                    <tr key={order.id || i}>
                                        <td style={{ fontWeight: 600, color: 'var(--blue-deep)' }}>{formattedId}</td>
                                        <td>{order.orderDate}</td>
                                        <td><strong>{order.masterStore?.name || order.store || 'NA'}</strong></td>
                                        <td style={{ textAlign: 'center' }}>
                                            {status === 'ready' && (
                                                <span style={{ background: '#E0F2FE', color: '#0369A1', padding: '4px 10px', borderRadius: '6px', fontWeight: 700, fontSize: '12px' }}>
                                                    READY
                                                </span>
                                            )}
                                            {status === 'dispatched' && (
                                                <span style={{ background: '#EDE9FE', color: '#6D28D9', padding: '4px 10px', borderRadius: '6px', fontWeight: 700, fontSize: '12px' }}>
                                                    DISPATCHED
                                                </span>
                                            )}
                                            {!['ready', 'dispatched'].includes(status) && (
                                                <span className="status ready">{order.status}</span>
                                            )}
                                        </td>
                                        <td className="actions-cell" style={{ textAlign: 'center' }}>
                                            {status === 'ready' && (
                                                <button
                                                    className="btn-primary"
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px' }}
                                                    onClick={() => handleOpenDispatch(order)}
                                                >
                                                    🚚 Dispatch
                                                </button>
                                            )}
                                            {status === 'dispatched' && (
                                                <button
                                                    className="btn-primary"
                                                    style={{ background: '#4F46E5', borderColor: '#4338CA', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px' }}
                                                    onClick={() => handleConvertToSale(order)}
                                                >
                                                    Convert to Sale ✏️
                                                </button>
                                            )}
                                            {status === 'completed' && (
                                                <button
                                                    className="btn-ghost"
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px' }}
                                                    onClick={() => handleDownloadInvoice(order)}
                                                >
                                                    📄 Invoice
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* ================= FIFO DISPATCH BREAKDOWN MODAL ================= */}
            <DispatchModal
                isOpen={isDispatchModalOpen}
                order={selectedDispatchOrder}
                flavours={flavours}
                onConfirmDispatch={handleConfirmDispatch}
                onClose={() => {
                    setIsDispatchModalOpen(false);
                    setSelectedDispatchOrder(null);
                }}
            />

            {/* ================= MODAL DIALOG COMPONENT ================= */}
            {isModalOpen && activeOrder && (
                <div className="overlay open">
                    <div className="modal" style={{ width: '700px' }}>

                        <h2>{isCreating ? 'New Sale Order' : 'Convert to Sale'}</h2>
                        {isCreating ? (
                            <div className="field" style={{ paddingBottom: '10px' }}>
                                <label>Store Name</label>
                                <AutocompleteInput
                                    value={activeOrder.store}
                                    onChange={(val) => setActiveOrder(prev => ({ ...prev, store: val }))}
                                    items={stores.map(s => s.name)}
                                    placeholder="Type store name..."
                                />
                            </div>
                        ) : (
                            <div className="modal-sub">{activeOrder.store} (Order #{activeOrder.orderId})</div>
                        )}

                        <div className="modal-section">
                            <h4 className="modal-section-title">Current Store Order List</h4>
                            <table className="flavour-table" style={{ border: '1px solid #e2e8f0' }}>
                                <thead>
                                    <tr>
                                        <th style={{ width: '40px' }}>Sr.</th>
                                        <th>Name</th>
                                        <th style={{ width: '80px', textAlign: 'center' }}>KG</th>
                                        <th style={{ width: '80px', textAlign: 'center' }}>Dol</th>
                                        <th style={{ width: '80px', textAlign: 'center' }}>Amount</th>
                                        <th style={{ width: '80px', textAlign: 'center' }}>Stock</th>
                                        <th style={{ width: '30px' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {editableItems.map((item, index) => {
                                        const flavour = flavours.find(f => f.name === item.name);
                                        const originalStock = (flavour?.factoryStock || 0) + (flavour?.coldRoomStock || 0);
                                        const orderQuantity = parseFloat(item.orderQuantity) || 0;
                                        const amount = orderQuantity * (flavour?.price || 0);
                                        const remainingStock = originalStock - orderQuantity;
                                        return (
                                            <tr key={item.uniqueId}>
                                                <td className="rownum">{index + 1}</td>
                                                <td>
                                                    <AutocompleteInput
                                                        ref={el => flavourInputRefs.current[index] = el}
                                                        value={item.code && item.name ? `${item.code} - ${item.name}` : (item.name || '')}
                                                        onChange={(val, selectedObj) => handleItemChange(item.uniqueId, 'name', val, selectedObj)}
                                                        items={flavours}
                                                        placeholder="Type flavour..."
                                                        onEnterPress={() => handleFlavourEnter(index)}
                                                        error={item.error}
                                                        errorMessage="Duplicate"
                                                    />
                                                </td>
                                                <td>
                                                    <input type="number" min="0" step="3" value={item.orderQuantity}
                                                        ref={el => kgInputRefs.current[index] = el}
                                                        onChange={(e) => handleItemChange(item.uniqueId, 'orderQuantity', e.target.value)}
                                                        onKeyDown={(e) => handleKgEnter(e, index)} className="table-input" style={{ textAlign: 'center' }} />
                                                </td>
                                                <td className="dol-val" style={{ textAlign: 'center' }}>{Math.floor(item.orderQuantity / 3) || 0}</td>
                                                <td className="dol-val" style={{ textAlign: 'center' }}>{amount.toLocaleString()}</td>
                                                <td
                                                    className="dol-val"
                                                    style={{ textAlign: 'center', color: remainingStock >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: '600' }}
                                                >
                                                    {remainingStock}
                                                </td>
                                                <td>
                                                    <button className="remove-row-btn" onClick={() => handleRemoveItem(item.uniqueId)}>×</button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    <tr className="total-row">
                                        <td colSpan="2"><strong>Total</strong></td>
                                        <td style={{ textAlign: 'center' }}><strong>{totalKg}</strong></td>
                                        <td style={{ textAlign: 'center' }}><strong>{totalDol}</strong></td>
                                        <td style={{ textAlign: 'center' }}><strong>{totalAmount.toLocaleString()}</strong></td>
                                        <td></td>
                                        <td>
                                            <button className="add-row-btn" onClick={handleAddItem}>+</button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="modal-actions">
                            <button className="btn-ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
                            <button className="btn-primary" onClick={handleSaveAndInvoice}>Generate Invoice & Sale 🧾</button>
                        </div>

                    </div>
                </div>
            )}

            {/* Warning Popup for Negative Stock */}
            {showWarningModal && (
                <div className="overlay open" style={{ zIndex: 1100 }}>
                    <div className="modal" style={{ width: '400px', textAlign: 'center' }}>
                        <h3 style={{ color: 'var(--red)', marginBottom: '15px' }}>Stock Alert</h3>
                        <p style={{ marginBottom: '25px', lineHeight: '1.5' }}>
                            One or more items are not in stock.
                        </p>
                        <div className="modal-actions" style={{ justifyContent: 'center', gap: '15px' }}>
                            <button className="btn-ghost" onClick={handleKeepOriginalOrder}>Keep Original Order</button>
                            <button className="btn-primary" onClick={handlePlanProduction}>Plan Production</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SalePage;
