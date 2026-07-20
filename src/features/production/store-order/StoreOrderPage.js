import React, { useState, useMemo, useCallback } from 'react';
import { masterStoreList, masterFlavourList, storeOrders } from '../../../assets/mockData';
import OrderModal from './OrderModal';
import jsPDF from 'jspdf';
import AutocompleteInput from '../../../components/common/AutocompleteInput'; // Assuming FlavourInput is now AutocompleteInput
import 'jspdf-autotable';

function StoreOrderPage() {
    const [orders, setOrders] = useState(storeOrders);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState(null);

    const handleOpenModal = useCallback(() => {
        setIsModalOpen(true);
    }, []);

    const handleCloseModal = useCallback(() => {
        setEditingOrder(null); // Clear editing state when modal closes
        setIsModalOpen(false);
    }, []);

    const [filters, setFilters] = useState({
        store: '',
        fromDate: '',
        toDate: '',
    });

    const [sortConfig, setSortConfig] = useState({ key: 'orderDate', direction: 'descending' });

    const filteredAndSortedOrders = useMemo(() => {
        let filteredItems = [...orders];

        // Apply filters
        if (filters.store) {
            filteredItems = filteredItems.filter(order => order.store === filters.store);
        }
        if (filters.fromDate) {
            filteredItems = filteredItems.filter(order => new Date(order.orderDate) >= new Date(filters.fromDate));
        }
        if (filters.toDate) {
            filteredItems = filteredItems.filter(order => new Date(order.orderDate) <= new Date(filters.toDate));
        }

        // Apply sorting to the filtered items
        const sortableItems = [...filteredItems];
        if (sortConfig.key) {
            sortableItems.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
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
            if (sortConfig.direction === 'ascending') {
                return ' ▲';
            }
            return ' ▼';
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

    const handleDelete = useCallback((orderId) => {
        if (window.confirm('Are you sure you want to delete this order?')) {
            setOrders(prevOrders => prevOrders.filter(order => order.orderId !== orderId));
        }
    }, []);

    const handleDownload = useCallback((order) => {
        const doc = new jsPDF();

        // Title
        doc.setFontSize(20);
        doc.text('Store Order', 14, 22);

        // Order Details
        doc.setFontSize(12);
        doc.text(`Order ID: ${order.orderId}`, 14, 32);
        doc.text(`Store: ${order.store}`, 14, 38);
        doc.text(`Date: ${order.orderDate}`, 14, 44);
        // Table
        const tableColumn = ["#", "Flavour", "KG", "Dol"];
        const tableRows = [];

        order.flavours.forEach((item, index) => {
            const dole = Math.floor(parseFloat(item.orderQuantity) / 3) || 0;
            const rowData = [index + 1, item.name, item.orderQuantity, dole];
            tableRows.push(rowData);
        });

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 50,
        });

        doc.save(`order-${order.orderId}.pdf`);
    }, []);

    const handleSaveOrder = useCallback((savedOrder) => {
        const isEditing = orders.some(order => order.orderId === savedOrder.orderId);
        if (isEditing) {
            setOrders(orders.map(order => order.orderId === savedOrder.orderId ? savedOrder : order));
        } else {
            // When creating a new order, ensure it gets a new, unique ID.
            const newOrderWithId = { ...savedOrder, orderId: Math.max(0, ...orders.map(o => o.orderId || 0)) + 1 };
            setOrders([...orders, newOrderWithId]);
        }
        handleCloseModal();
    }, [orders, handleCloseModal]);

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
                    {filteredAndSortedOrders.map(order => (
                        <tr key={order.orderId}>
                            <td data-label="Order ID">{order.orderId}</td>
                            <td data-label="Date">{order.orderDate}</td>
                            <td data-label="Store">{order.store}</td>
                            <td data-label="Status"><span className={`status ${order.status.toLowerCase()}`}>{order.status}</span></td>
                            <td data-label="Actions" className="actions-cell">
                                {order.status === 'Pending' && (
                                    <>
                                        <button className="btn-icon" onClick={() => handleEdit(order)}>Edit</button>
                                        <button className="btn-icon delete" onClick={() => handleDelete(order.orderId)}>Delete</button>
                                    </>
                                )}
                                <button className="btn-icon download" onClick={() => handleDownload(order)}>Download</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <OrderModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                stores={masterStoreList}
                orders={orders}
                flavours={masterFlavourList}
                onSave={handleSaveOrder}
                editingOrder={editingOrder} />
        </div>
    );
}

export default StoreOrderPage;