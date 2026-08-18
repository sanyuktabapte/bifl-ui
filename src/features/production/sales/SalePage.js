import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { fetchAllSaleOrders, completeSaleOrderApi, createAndCompleteSaleApi } from '../../../services/saleService';
import { updateStoreOrderApi } from '../../../services/storeOrderService';
import { fetchAdminDashboard } from '../../../services/adminService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import AutocompleteInput from '../../../components/common/AutocompleteInput';

function SalePage() {
    const [originalItems, setOriginalItems] = useState([]);
    const [showWarningModal, setShowWarningModal] = useState(false);
    const [warningPayload, setWarningPayload] = useState(null);
    const [orders, setOrders] = useState([]);
    const [stores, setStores] = useState([]);
    const [flavours, setFlavours] = useState([]);
    const [filters, setFilters] = useState({ store: '', fromDate: '', toDate: '' });
    const [sortConfig, setSortConfig] = useState({ key: 'orderDate', direction: 'descending' });

    // Modal State Management
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
        setFilters({ store: '', fromDate: '', toDate: '' });
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

    const openSaleModal = (order) => {
        setIsCreating(false);
        setActiveOrder({
            id: order.id,
            orderId: order.orderId || `SO-${order.id}`,
            store: order.masterStore?.name || '',
            storeId: order.masterStore?.id,
            orderDate: order.orderDate,
            status: order.status,
            batch: order.batch || 'NA'
        });
        const initialItems = (order.flavours || []).map(f => ({
            uniqueId: Math.random(),
            name: f.flavourName || '',
            code: f.flavourCode || '',
            orderQuantity: f.orderQuantity || ''
        }));
        setEditableItems(initialItems);
        setOriginalItems(JSON.parse(JSON.stringify(initialItems)));
        setIsModalOpen(true);
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
        setEditableItems([{ uniqueId: Math.random(), name: '', code: '', orderQuantity: '' }]);
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
            const dole = Math.floor(parseFloat(item.orderQuantity) / 3) || 0;
            const amount = (parseFloat(item.orderQuantity) || 0) * price;
            const rowData = [index + 1, item.name, item.orderQuantity, dole, price, amount.toLocaleString()];
            tableRows.push(rowData);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            foot: [
                [{ content: 'Total', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } },
                { content: String(totalKg), styles: { fontStyle: 'bold' } },
                { content: String(totalDol), styles: { fontStyle: 'bold' } },
                { content: '', styles: { fontStyle: 'bold' } },
                { content: totalAmount.toLocaleString(), styles: { fontStyle: 'bold' } }]
            ],
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
        return filteredItems;
    }, [orders, filters]);

    const pendingOrders = useMemo(() => {
        const pending = [];
        filteredOrders.forEach(order => {
            if (order.status === 'Ready') {
                pending.push(order);
            }
        });

        if (sortConfig.key) {
            pending.sort((a, b) => {
                const valA = sortConfig.key === 'store' ? (a.masterStore?.name || a.store || '') : a[sortConfig.key];
                const valB = sortConfig.key === 'store' ? (b.masterStore?.name || b.store || '') : b[sortConfig.key];
                if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return pending;
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
                    <label>From Date</label>
                    <input type="date" name="fromDate" value={filters.fromDate} onChange={handleFilterChange} />
                </div>
                <div className="field">
                    <label>To Date</label>
                    <input type="date" name="toDate" value={filters.toDate} onChange={handleFilterChange} />
                </div>
                <button className="btn-ghost" onClick={resetFilters}>Reset</button>
            </div>

            <table>
                <thead>
                    <tr>
                        <th className="sortable" onClick={() => requestSort('id')}>ORDER ID <span className="sort-arrow">{getSortIndicator('id')}</span></th>
                        <th className="sortable" onClick={() => requestSort('orderDate')}>ORDER DATE <span className="sort-arrow">{getSortIndicator('orderDate')}</span></th>
                        <th className="sortable" onClick={() => requestSort('store')}>STORE NAME <span className="sort-arrow">{getSortIndicator('store')}</span></th>
                        <th>STATUS</th>
                        <th>ACTIONS</th>
                    </tr>
                </thead>
                <tbody>
                    {pendingOrders.length === 0 ? (
                        <tr>
                            <td colSpan="5" style={{ textAlign: 'center', color: 'var(--ink-soft)', padding: '24px', fontStyle: 'italic', fontWeight: '500' }}>
                                No ready orders
                            </td>
                        </tr>
                    ) : (
                        pendingOrders.map((order, i) => (
                            <tr key={order.id || i}>
                                <td>{order.orderId || order.id}</td>
                                <td>{order.orderDate}</td>
                                <td><strong>{order.masterStore?.name || order.store || 'NA'}</strong></td>
                                <td><span className="status ready">{order.status}</span></td>
                                <td className="actions-cell">
                                    <button className="btn-primary" onClick={() => openSaleModal(order)}>
                                        Convert to Sale ✏️
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>

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
                                                <td className="dole-val" style={{ textAlign: 'center' }}>{Math.floor(item.orderQuantity / 3) || 0}</td>
                                                <td className="dole-val" style={{ textAlign: 'center' }}>{amount.toLocaleString()}</td>
                                                <td
                                                    className="dole-val"
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
