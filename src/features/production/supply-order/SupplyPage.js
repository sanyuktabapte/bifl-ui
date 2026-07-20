import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { storeOrders, masterStoreList, masterFlavourList } from '../../../assets/mockData';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import AutocompleteInput from '../../../components/common/AutocompleteInput';

function SupplyPage() {
    const [orders, setOrders] = useState(storeOrders);
    const [filters, setFilters] = useState({ store: '', fromDate: '', toDate: '' });
    const [sortConfig, setSortConfig] = useState({ key: 'orderDate', direction: 'descending' });

    // Modal State Management
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeOrder, setActiveOrder] = useState(null);
    const [editableItems, setEditableItems] = useState([]);
    const [isCreating, setIsCreating] = useState(false);
    const flavourInputRefs = useRef([]);
    const kgInputRefs = useRef([]);

    useEffect(() => {
        if (isModalOpen) {
            // Reset refs on modal open or when items change
            flavourInputRefs.current = flavourInputRefs.current.slice(0, editableItems.length);
            kgInputRefs.current = kgInputRefs.current.slice(0, editableItems.length);

            // Focus the last flavour input if a new row was just added
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
        // Deep clone order so we can manipulate it before saving
        setActiveOrder(JSON.parse(JSON.stringify(order)));
        // Initialize editable state for the modal table
        setEditableItems(order.flavours.map(f => ({ ...f, uniqueId: Math.random() })));
        setIsModalOpen(true);
    };

    const handleAddNewSupply = () => {
        setIsCreating(true);
        setActiveOrder({
            orderId: `SO-${Date.now()}`, // Temp ID
            store: '',
            orderDate: new Date().toISOString().split('T')[0],
            status: 'Pending',
            flavours: []
        });
        setEditableItems([{ uniqueId: Math.random(), name: '', orderQuantity: '' }]);
        setIsModalOpen(true);
    };

    // Finalize Invoice and Move Store to Completed Section
    const handleSaveAndInvoice = () => {
        // 1. Create the payload for the backend
        const storeName = isCreating ? activeOrder.store : activeOrder.store;

        if (isCreating && !storeName) {
            alert("Please select a store.");
            return;
        }

        const completedOrderPayload = {
            orderId: activeOrder.orderId,
            completedDate: new Date().toISOString().split('T')[0],
            batch: activeOrder.batch, // Assuming batch comes from the active order
            storeName: storeName,
            flavourList: editableItems.map(item => ({
                name: item.name,
                quantity: parseFloat(item.orderQuantity) || 0
            })),
            status: "Completed"
        };

        // 2. Simulate backend call by logging the payload
        console.log("Data to be sent to backend:", completedOrderPayload);

        if (isCreating) {
            // Add a new order to the list
            const newOrder = {
                ...activeOrder,
                store: storeName,
                flavours: editableItems.map(({ name, orderQuantity }) => ({ name, orderQuantity })),
                status: 'Completed', // Assuming new supplies are immediately completed
                completedDate: completedOrderPayload.completedDate,
            };
            setOrders(prev => [...prev, newOrder]);
        } else {
            // 3. Update local state to reflect the change for an existing order
            setOrders(prevOrders =>
                prevOrders.map(order => {
                    if (order.orderId === activeOrder.orderId) {
                        return {
                            ...order,
                            status: 'Completed',
                            completedDate: completedOrderPayload.completedDate,
                            flavours: editableItems.map(({ name, orderQuantity }) => ({ name, orderQuantity })) // Update flavours list
                        };
                    }
                    return order;
                })
            );
        }

        // 4. Generate PDF Invoice
        const doc = new jsPDF();

        // PDF Title
        doc.setFontSize(20);
        doc.text('Invoice', 14, 22);

        // 2. Order Details
        doc.setFontSize(12);
        doc.text(`Order ID: ${activeOrder.orderId}`, 14, 32);
        doc.text(`Store: ${storeName}`, 14, 38);
        doc.text(`Date: ${activeOrder.orderDate}`, 14, 44);

        // PDF Table
        const tableColumn = ["#", "Flavour", "KG", "Dol", "Price", "Amount"];
        const tableRows = [];

        editableItems.forEach((item, index) => {
            const flavour = masterFlavourList.find(f => f.name === item.name);
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

        // Save the PDF
        doc.save(`invoice-${activeOrder.orderId}.pdf`);

        setIsModalOpen(false);
    };

    const handleFlavourEnter = (index) => {
        // Move focus to the KG input in the same row
        if (kgInputRefs.current[index]) {
            kgInputRefs.current[index].focus();
        }
    };

    const handleKgEnter = (e, index) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            // If it's the last row, add a new one
            if (index === editableItems.length - 1) {
                handleAddItem();
            } else {
                // Otherwise, move focus to the next flavour input
                flavourInputRefs.current[index + 1]?.focus();
            }
        }
    };

    const handleItemChange = (uniqueId, field, value) => {
        setEditableItems(prevItems => {
            const newItems = prevItems.map(item => {
                if (item.uniqueId === uniqueId) {
                    if (field === 'name') {
                        const lowerCaseValue = value.toLowerCase();
                        // Find by full "Name (Code)" string, or by name, or by code
                        const newFlavour = masterFlavourList.find(f =>
                            `${f.name} (${f.code})`.toLowerCase() === lowerCaseValue ||
                            f.name.toLowerCase() === lowerCaseValue ||
                            f.code.toLowerCase() === lowerCaseValue
                        );
                        return { ...item, name: newFlavour?.name || value, code: newFlavour?.code || '', error: false };
                    }
                    return { ...item, [field]: value };
                }
                return item;
            });

            // Check for duplicates and set error flag
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
        }
        );
    };

    const handleAddItem = () => {
        setEditableItems(prev => [...prev, {
            uniqueId: Math.random(),
            name: '',
            orderQuantity: '',
            error: false
        }]);
    };

    const handleRemoveItem = (uniqueId) => {
        if (editableItems.length > 1) {
            setEditableItems(prev => prev.filter(item => item.uniqueId !== uniqueId));
        }
    };

    const flavourOptions = useMemo(() => masterFlavourList.map(f => ({ code: f.code, name: f.name })), []);
    const flavourSearchItems = useMemo(() => masterFlavourList.map(f => `${f.name} (${f.code})`), []);

    const { totalKg, totalDol, totalAmount } = useMemo(() => {
        return editableItems.reduce((acc, item) => {
            const kg = parseFloat(item.orderQuantity) || 0;
            const flavour = masterFlavourList.find(f => f.name === item.name);
            const price = flavour?.price || 0;
            acc.totalKg += kg;
            acc.totalDol += Math.floor(kg / 3);
            acc.totalAmount += kg * price;
            return acc;
        }, { totalKg: 0, totalDol: 0, totalAmount: 0 });
    }, [editableItems]);

    const handleFilterChange = useCallback((e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    }, []);

    const filteredOrders = useMemo(() => {
        let filteredItems = [...orders];

        if (filters.store) {
            filteredItems = filteredItems.filter(order => order.store.toLowerCase().includes(filters.store.toLowerCase()));
        }
        if (filters.fromDate) {
            filteredItems = filteredItems.filter(order => new Date(order.orderDate) >= new Date(filters.fromDate));
        }
        if (filters.toDate) {
            filteredItems = filteredItems.filter(order => new Date(order.orderDate) <= new Date(filters.toDate));
        }
        return filteredItems;
    }, [orders, filters]);

    const { pendingOrders, completedOrders } = useMemo(() => {
        const pending = [];
        const completed = [];
        filteredOrders.forEach(order => {
            if (order.status === 'Pending') {
                pending.push(order);
            } else {
                completed.push(order);
            }
        });

        // Apply sorting
        const sortList = (list) => {
            if (sortConfig.key) {
                list.sort((a, b) => {
                    if (a[sortConfig.key] < b[sortConfig.key]) {
                        return sortConfig.direction === 'ascending' ? -1 : 1;
                    }
                    if (a[sortConfig.key] > b[sortConfig.key]) {
                        return sortConfig.direction === 'ascending' ? 1 : -1;
                    }
                    return 0;
                });
            }
        };

        sortList(pending);
        sortList(completed);

        return { pendingOrders: pending, completedOrders: completed };
    }, [filteredOrders, sortConfig]);

    return (
        <div className="container">
            <div className="page-head">
                <div>
                    <div className="crumb">Factory Module</div>
                    <h1>Supply Operations</h1>
                </div>
                <button className="btn-primary" onClick={handleAddNewSupply}>+ Add New Supply</button>
            </div>

            <div className="filters">
                <div className="field">
                    <label>Store</label>
                    <AutocompleteInput
                        value={filters.store}
                        onChange={(value) => handleFilterChange({ target: { name: 'store', value } })}
                        items={masterStoreList.map(store => store.name)}
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

            {/* 1. PENDING SUPPLIES PANEL */}
            <section className="accordion open">
                <div className="accordion-header">
                    <span>1. Process Supplies</span>
                    <span>▲</span>
                </div>
                <div className="accordion-content">
                    <table>
                        <thead>
                            <tr>
                                <th className="sortable" onClick={() => requestSort('orderId')}>Order ID <span className="sort-arrow">{getSortIndicator('orderId')}</span></th>
                                <th className="sortable" onClick={() => requestSort('orderDate')}>Order Date <span className="sort-arrow">{getSortIndicator('orderDate')}</span></th>
                                <th className="sortable" onClick={() => requestSort('store')}>Store Name <span className="sort-arrow">{getSortIndicator('store')}</span></th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingOrders.map((order) => (
                                <tr key={order.orderId}>
                                    <td>{order.orderId}</td>
                                    <td>{order.orderDate}</td>
                                    <td><strong>{order.store}</strong></td>
                                    <td><span className="status pending">PENDING</span></td>
                                    <td className="actions-cell">
                                        <button className="btn-primary" onClick={() => openSaleModal(order)}>
                                            Convert to Sale ✏️
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* 2. COMPLETED SUPPLIES PANEL */}
            <section className="accordion open">
                <div className="accordion-header">
                    <span>2. Completed Supplies</span>
                    <span>▲</span>
                </div>
                <div className="accordion-content">
                    <table>
                        <thead>
                            <tr>
                                <th className="sortable" onClick={() => requestSort('orderId')}>ORDER ID <span className="sort-arrow">{getSortIndicator('orderId')}</span></th>
                                <th className="sortable" onClick={() => requestSort('completedDate')}>DATE SUPPLIED <span className="sort-arrow">{getSortIndicator('completedDate')}</span></th>
                                <th className="sortable" onClick={() => requestSort('store')}>STORE <span className="sort-arrow">{getSortIndicator('store')}</span></th>
                                <th>STATUS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {completedOrders.length === 0 ? (
                                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '1rem' }}>No completed supplies yet.</td></tr>
                            ) : (
                                completedOrders.map((order, i) => (
                                    <tr key={i}>
                                        <td>{order.orderId}</td>
                                        <td>{order.completedDate}</td>
                                        <td>{order.store}</td>
                                        <td><span className="status completed">COMPLETED</span></td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* ================= MODAL DIALOG COMPONENT ================= */}
            {isModalOpen && activeOrder && (
                <div className="overlay open">
                    <div className="modal" style={{ width: '700px' }}>

                        {/* Modal Header */}
                        <h2>{isCreating ? 'New Supply Order' : 'Convert to Sale'}</h2>
                        {isCreating ? (
                            <div className="field" style={{ paddingBottom: '10px' }}>
                                <label>Store Name</label>
                                <AutocompleteInput
                                    value={activeOrder.store}
                                    onChange={(val) => setActiveOrder(prev => ({ ...prev, store: val }))}
                                    items={masterStoreList.map(s => s.name)}
                                    placeholder="Type store name..."
                                />
                            </div>
                        ) : (
                            <div className="modal-sub">{activeOrder.store} (Order #{activeOrder.orderId})</div>
                        )}


                        {/* Current Store Order Table */}
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
                                        const flavour = masterFlavourList.find(f => f.name === item.name);
                                        const originalStock = flavour?.stock || 0;
                                        const orderQuantity = parseFloat(item.orderQuantity) || 0;
                                        const amount = orderQuantity * (flavour?.price || 0);
                                        const remainingStock = originalStock - orderQuantity;
                                        return (
                                            <tr key={item.uniqueId}>
                                                <td className="rownum">{index + 1}</td>
                                                <td>
                                                    <AutocompleteInput
                                                        ref={el => flavourInputRefs.current[index] = el}
                                                        value={item.name}
                                                        onChange={(val) => handleItemChange(item.uniqueId, 'name', val)}
                                                        items={flavourSearchItems}
                                                        placeholder="Type flavour..."
                                                        onEnterPress={handleAddItem} // This was changed to handleAddItem in a previous step
                                                        error={item.error}
                                                        errorMessage="Duplicate"
                                                    />
                                                </td>
                                                <td>
                                                    <input type="number" min="0" step="0.5" value={item.orderQuantity}
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
                                                <td><button type="button" className="rm-row" title="Remove row" onClick={() => handleRemoveItem(item.uniqueId)} style={{ visibility: editableItems.length > 1 ? 'visible' : 'hidden' }}>✕</button></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="totals-row">
                                        <td colSpan="2"><strong>Total</strong></td>
                                        <td style={{ textAlign: 'center' }}><strong>{totalKg}</strong></td>
                                        <td style={{ textAlign: 'center' }}><strong>{totalDol}</strong></td>
                                        <td style={{ textAlign: 'center' }}><strong>{totalAmount.toLocaleString()}</strong></td>
                                        <td></td>
                                        <td style={{ textAlign: 'center' }}><button type="button" className="add-row-btn" title="Add flavour row" onClick={handleAddItem}>+</button></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Modal Bottom Footer Action Row */}
                        <div className="modal-actions">
                            <button className="btn-ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
                            <button className="btn-primary" onClick={handleSaveAndInvoice}>Generate Invoice & Supply 🧾</button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}

export default SupplyPage;