import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { masterStoreList as initialStores, masterFlavourList as initialFlavours, storeOrders as initialStoreOrders } from '../../../assets/mockData';
import OrderModal from './OrderModal';
import jsPDF from 'jspdf';
import AutocompleteInput from '../../../components/common/AutocompleteInput';
import 'jspdf-autotable';
import { fetchActiveOrders, createStoreOrderApi, updateStoreOrderApi, deleteStoreOrderApi } from '../../../services/storeOrderService';
import { fetchAdminDashboard } from '../../../services/adminService';

function StoreOrderPage() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [stores, setStores] = useState([]);
    const [flavours, setFlavours] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState(null);

    const [filters, setFilters] = useState({
        store: '',
        fromDate: '',
        toDate: '',
    });

    const [sortConfig, setSortConfig] = useState({ key: 'orderDate', direction: 'descending' });

    // Fetch live backend data
    const loadBackendData = useCallback(async () => {
        try {
            const [activeOrders, adminData] = await Promise.all([
                fetchActiveOrders().catch(() => null),
                fetchAdminDashboard().catch(() => null)
            ]);

            if (adminData) {
                if (adminData.storeList && adminData.storeList.length > 0) setStores(adminData.storeList);
                if (adminData.flavourList && adminData.flavourList.length > 0) setFlavours(adminData.flavourList);
            }

            if (activeOrders !== null) {
                setOrders(activeOrders);
            }
        } catch (err) {
            console.error("Backend error loading store orders, using mock fallback:", err);
        }
    }, []);

    useEffect(() => {
        loadBackendData();
    }, [loadBackendData]);

    const handleOpenModal = useCallback(() => {
        setIsModalOpen(true);
    }, []);

    const handleCloseModal = useCallback(() => {
        setEditingOrder(null);
        setIsModalOpen(false);
    }, []);

    const filteredAndSortedOrders = useMemo(() => {
        let filteredItems = [...orders];

        if (filters.store) {
            filteredItems = filteredItems.filter(order => order.store === filters.store || (order.store && order.store.includes(filters.store)));
        }
        if (filters.fromDate) {
            filteredItems = filteredItems.filter(order => new Date(order.orderDate) >= new Date(filters.fromDate));
        }
        if (filters.toDate) {
            filteredItems = filteredItems.filter(order => new Date(order.orderDate) <= new Date(filters.toDate));
        }

        const sortableItems = [...filteredItems];
        if (sortConfig.key) {
            sortableItems.sort((a, b) => {
                const valA = a[sortConfig.key] || '';
                const valB = b[sortConfig.key] || '';
                if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [orders, filters, sortConfig]);

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

    const handleFilterChange = useCallback((e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    }, []);

    const resetFilters = useCallback(() => {
        setFilters({
            store: '',
            fromDate: '',
            toDate: '',
        });
    }, []);

    const handleEdit = useCallback((orderToEdit) => {
        setEditingOrder(orderToEdit);
        handleOpenModal();
    }, [handleOpenModal]);

    const handleDelete = useCallback(async (orderIdentifier) => {
        if (!window.confirm('Are you sure you want to delete this order?')) return;

        const targetOrder = orders.find(o => o.id === orderIdentifier || o.orderId === orderIdentifier);
        const dbId = targetOrder ? targetOrder.id : orderIdentifier;

        try {
            if (dbId) {
                await deleteStoreOrderApi(dbId);
                await loadBackendData();
            } else {
                throw new Error("Order ID not found for deletion.");
            }
        } catch (err) {
            console.error("Backend deleteStoreOrder error:", err);
            alert("Error: Failed to delete order from backend database.");
        }
    }, [orders, loadBackendData]);

    const handleDownload = useCallback((order) => {
        const doc = new jsPDF();

        doc.setFontSize(20);
        doc.text('Store Order', 14, 22);

        doc.setFontSize(12);
        doc.text(`Order ID: ${order.orderId || order.id}`, 14, 32);
        doc.text(`Store: ${order.store || ''}`, 14, 38);
        doc.text(`Date: ${order.orderDate || ''}`, 14, 44);

        const tableColumn = ["#", "Flavour", "KG", "Dol"];
        const tableRows = [];

        const flavourItems = order.flavours || [];
        flavourItems.forEach((item, index) => {
            const dole = Math.floor(parseFloat(item.orderQuantity) / 3) || 0;
            const rowData = [index + 1, item.name, item.orderQuantity, dole];
            tableRows.push(rowData);
        });

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 50,
        });

        doc.save(`order-${order.orderId || order.id}.pdf`);
    }, []);

    const handleSaveOrder = useCallback(async (savedOrder) => {
        const payload = {
            storeId: savedOrder.storeId,
            batch: savedOrder.batch || 'NA',
            orderFlavourList: savedOrder.orderFlavourList || []
        };

        try {
            let res;
            if (savedOrder.id) {
                res = await updateStoreOrderApi(savedOrder.id, payload);
            } else {
                res = await createStoreOrderApi(payload);
            }
            handleCloseModal();
            await loadBackendData();

            if (res && (res.status === 'Ready' || res.status === 'READY')) {
                if (window.confirm("Order is READY! Would you like to proceed to Sale Operations to process the supply?")) {
                    navigate("/sale");
                }
            }
        } catch (err) {
            console.error("Backend error saving store order:", err);
            alert("Error: Failed to save order to backend database.");
            handleCloseModal();
        }
    }, [orders, handleCloseModal, loadBackendData, navigate]);

    return (
        <div className="container">
            <div className="page-head">
                <div>
                    <div className="crumb">Factory Module</div>
                    <h1>Store Order</h1>
                </div>
                <button className="btn-primary" onClick={handleOpenModal}>+ Add New Order</button>
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
                        <th className="sortable" onClick={() => requestSort('orderId')}>Order ID <span className="sort-arrow">{getSortIndicator('orderId')}</span></th>
                        <th className="sortable" onClick={() => requestSort('orderDate')}>Date <span className="sort-arrow">{getSortIndicator('orderDate')}</span></th>
                        <th className="sortable" onClick={() => requestSort('store')}>Store <span className="sort-arrow">{getSortIndicator('store')}</span></th>
                        <th className="sortable" onClick={() => requestSort('status')}>Status <span className="sort-arrow">{getSortIndicator('status')}</span></th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredAndSortedOrders.length === 0 ? (
                        <tr>
                            <td colSpan="5" style={{ textAlign: 'center', color: 'var(--ink-soft)', padding: '24px', fontStyle: 'italic', fontWeight: '500' }}>
                                No pending orders
                            </td>
                        </tr>
                    ) : (
                        filteredAndSortedOrders.map(order => (
                            <tr key={order.id || order.orderId}>
                                <td data-label="Order ID">{order.orderId || order.id}</td>
                                <td data-label="Date">{order.orderDate}</td>
                                <td data-label="Store">{order.store}</td>
                                <td data-label="Status"><span className={`status ${(order.status || 'pending').toLowerCase()}`}>{order.status}</span></td>
                                <td data-label="Actions" className="actions-cell">
                                    {order.status === 'Pending' && (
                                        <>
                                            <button className="btn-icon" onClick={() => handleEdit(order)}>Edit</button>
                                            <button className="btn-icon delete" onClick={() => handleDelete(order.id || order.orderId)}>Delete</button>
                                        </>
                                    )}
                                    <button className="btn-icon download" onClick={() => handleDownload(order)}>Download</button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>

            <OrderModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                stores={stores}
                orders={orders}
                flavours={flavours}
                onSave={handleSaveOrder}
                editingOrder={editingOrder} />
        </div>
    );
}

export default StoreOrderPage;