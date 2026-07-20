import React, { useState, useMemo, useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function PendingOrdersSection({ isOpen, toggleAccordion, orders, onEdit }) {
    const [filters, setFilters] = useState({ flavour: '', fromDate: '', toDate: '' });
    const [sortConfig, setSortConfig] = useState({ key: 'orderDate', direction: 'descending' });

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
        setFilters({ flavour: '', fromDate: '', toDate: '' });
    }, []);

    const filteredAndSortedOrders = useMemo(() => {
        let filteredItems = orders.filter(order => {
            const filterText = filters.flavour.toLowerCase();
            const flavourMatch = !filterText || order.name.toLowerCase().includes(filterText) || order.id.toLowerCase().includes(filterText);
            const fromDateMatch = !filters.fromDate || new Date(order.orderDate) >= new Date(filters.fromDate);
            const toDateMatch = !filters.toDate || new Date(order.orderDate) <= new Date(filters.toDate);
            return flavourMatch && fromDateMatch && toDateMatch;
        });

        if (sortConfig.key) {
            filteredItems.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }

        return filteredItems;
    }, [orders, filters, sortConfig]);

    const handleDownload = useCallback(() => {
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.text('Pending Purchase Orders', 14, 22);

        const tableColumn = ["Date", "Flavour", "KG", "Dol", "Status"];
        const tableRows = [];

        filteredAndSortedOrders.forEach(order => {
            const dole = Math.floor(parseFloat(order.orderQuantity) / 3) || 0;
            const rowData = [
                order.orderDate,
                `${order.name} (${order.id})`,
                order.orderQuantity,
                dole,
                order.status
            ];
            tableRows.push(rowData);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 30,
        });

        doc.save(`pending-orders.pdf`);
    }, [filteredAndSortedOrders]);

    return (
        <section className={`accordion ${isOpen ? 'open' : ''}`}>
            <div className="accordion-header">
                <span onClick={() => toggleAccordion('pending')} style={{ flex: 1, cursor: 'pointer' }}>1. Pending Orders</span>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button
                        className="btn-icon"
                        onClick={onEdit}
                        style={{ marginRight: '1rem' }}
                    >Edit</button>
                    <button className="btn-icon download" onClick={handleDownload}>
                        Download
                    </button>
                </div>
                <span>{isOpen ? '▲' : '▼'}</span>
            </div>
            {isOpen && (
                <div className="accordion-content">
                    <div className="filters">
                        <div className="field">
                            <label>Flavour</label>
                            <input type="text" name="flavour" value={filters.flavour} onChange={handleFilterChange} placeholder="" />
                        </div>
                        <div className="field"><label>From Date</label><input type="date" name="fromDate" value={filters.fromDate} onChange={handleFilterChange} /></div>
                        <div className="field"><label>To Date</label><input type="date" name="toDate" value={filters.toDate} onChange={handleFilterChange} /></div>
                        <button className="btn-ghost" onClick={resetFilters}>Reset</button>
                    </div>
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        <table style={{ border: '1px solid #e2e8f0', width: '100%' }}>
                            <thead>
                                <tr>
                                    <th rowSpan="2" style={{ width: '120px' }} className="sortable" onClick={() => requestSort('orderDate')}>Order Date <span className="sort-arrow">{getSortIndicator('orderDate')}</span></th>
                                    <th rowSpan="2" style={{ borderLeft: '1px solid #e2e8f0' }} className="sortable" onClick={() => requestSort('name')}>Flavour <span className="sort-arrow">{getSortIndicator('name')}</span></th>
                                    <th colSpan="2" className="main-col-header sortable" style={{ borderLeft: '1px solid #e2e8f0' }} onClick={() => requestSort('orderQuantity')}>Quantity <span className="sort-arrow">{getSortIndicator('orderQuantity')}</span></th>
                                    <th rowSpan="2" style={{ borderLeft: '1px solid #e2e8f0' }} className="sortable" onClick={() => requestSort('status')}>Status <span className="sort-arrow">{getSortIndicator('status')}</span></th>
                                </tr>
                                <tr>
                                    <th style={{ width: '90px', textAlign: 'center' }}>KG</th>
                                    <th style={{ width: '70px', textAlign: 'center', borderLeft: '1px solid #e2e8f0' }}>Dol</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAndSortedOrders.map(order => (
                                    <tr key={order.id}>
                                        <td>{order.orderDate}</td>
                                        <td style={{ borderLeft: '1px solid #e2e8f0' }}><strong>{order.name}</strong></td>
                                        <td style={{ textAlign: 'center', borderLeft: '1px solid #e2e8f0' }}>{order.orderQuantity}</td>
                                        <td style={{ textAlign: 'center', borderLeft: '1px solid #e2e8f0' }}>{Math.floor(order.orderQuantity / 3) || 0}</td>
                                        <td style={{ borderLeft: '1px solid #e2e8f0' }}><span className={`status ${order.status.toLowerCase()}`}>{order.status}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </section>
    );
}

export default PendingOrdersSection;