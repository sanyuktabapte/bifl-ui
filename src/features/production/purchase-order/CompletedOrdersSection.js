import React, { useState, useMemo, useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function CompletedOrdersSection({ isOpen, toggleAccordion, completedBatches }) {
    const [filters, setFilters] = useState({ flavour: '', batch: '', fromDate: '', toDate: '' });
    const [sortConfig, setSortConfig] = useState({ key: 'completedDate', direction: 'descending' });

    const flattenedBatches = useMemo(() => {
        return completedBatches.flatMap(batch =>
            batch.flavourList.map(flavour => ({
                ...flavour,
                completedDate: batch.completedDate,
                batch: batch.batch,
            }))
        );
    }, [completedBatches]);

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
        setFilters({ flavour: '', batch: '', fromDate: '', toDate: '' });
    }, []);

    const filteredAndSortedBatches = useMemo(() => {
        let items = [...flattenedBatches];

        if (filters.flavour) {
            const lowerCaseFilter = filters.flavour.toLowerCase();
            items = items.filter(item => item.name.toLowerCase().includes(lowerCaseFilter) || item.code.toLowerCase().includes(lowerCaseFilter));
        }
        if (filters.batch) {
            items = items.filter(b => String(b.batch).includes(filters.batch));
        }
        if (filters.fromDate) {
            items = items.filter(item => new Date(item.completedDate) >= new Date(filters.fromDate));
        }
        if (filters.toDate) {
            items = items.filter(item => new Date(item.completedDate) <= new Date(filters.toDate));
        }

        items.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (a[sortConfig.key] > b[sortConfig.key]) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });

        return items;
    }, [flattenedBatches, filters, sortConfig]);

    const handleDownload = useCallback(() => {
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.text('Completed Purchase Orders', 14, 22);

        const tableColumn = ["Completed Date", "Flavour", "KG", "Dol", "Batch #"];
        const tableRows = [];

        filteredAndSortedBatches.forEach(item => {
            const dole = Math.floor(parseFloat(item.orderQuantity) / 3) || 0;
            const rowData = [
                item.completedDate,
                `${item.name} (${item.code})`,
                item.orderQuantity,
                dole,
                item.batch
            ];
            tableRows.push(rowData);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 30,
        });

        doc.save(`completed-orders.pdf`);
    }, [filteredAndSortedBatches]);

    return (
        <section className={`accordion ${isOpen ? 'open' : ''}`}>
            <div className="accordion-header">
                <span onClick={() => toggleAccordion('completedOrders')} style={{ flex: 1, cursor: 'pointer' }}>3. Completed Orders</span>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button className="btn-icon download" onClick={handleDownload}>
                        Download
                    </button>
                </div>
                <span>{isOpen ? '▲' : '▼'}</span>
            </div>
            {isOpen && (
                <div className="accordion-content">
                    <div className="filters">
                        <div className="field"><label>Flavour</label><input type="text" name="flavour" value={filters.flavour} onChange={handleFilterChange} /></div>
                        <div className="field"><label>Batch #</label><input type="text" name="batch" value={filters.batch} onChange={handleFilterChange} /></div>
                        <div className="field"><label>From Date</label><input type="date" name="fromDate" value={filters.fromDate} onChange={handleFilterChange} /></div>
                        <div className="field"><label>To Date</label><input type="date" name="toDate" value={filters.toDate} onChange={handleFilterChange} /></div>
                        <button className="btn-ghost" onClick={resetFilters}>Reset</button>
                    </div>
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        <table style={{ border: '1px solid #e2e8f0', width: '100%' }}>
                            <thead>
                                <tr>
                                    <th rowSpan="2" className="sortable" style={{ width: '120px' }} onClick={() => requestSort('completedDate')}>Completed Date{getSortIndicator('completedDate')}</th>
                                    <th rowSpan="2" className="sortable" style={{ borderLeft: '1px solid #e2e8f0' }} onClick={() => requestSort('name')}>Flavour{getSortIndicator('name')}</th>
                                    <th colSpan="2" className="main-col-header" style={{ borderLeft: '1px solid #e2e8f0' }}>Quantity</th>
                                    <th rowSpan="2" className="sortable" style={{ borderLeft: '1px solid #e2e8f0' }} onClick={() => requestSort('batch')}>Batch #{getSortIndicator('batch')}</th>
                                </tr>
                                <tr>
                                    <th style={{ width: '90px', textAlign: 'center' }}>KG</th>
                                    <th style={{ width: '70px', textAlign: 'center', borderLeft: '1px solid #e2e8f0' }}>Dol</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAndSortedBatches.length > 0 ? (
                                    filteredAndSortedBatches.map(item => (
                                        <tr key={`${item.batch}-${item.code}`}>
                                            <td>{item.completedDate}</td>
                                            <td style={{ borderLeft: '1px solid #e2e8f0' }}><strong>{item.name}</strong></td>
                                            <td style={{ textAlign: 'center', borderLeft: '1px solid #e2e8f0' }}>{item.orderQuantity}</td>
                                            <td style={{ textAlign: 'center', borderLeft: '1px solid #e2e8f0' }}>{Math.floor(item.orderQuantity / 3) || 0}</td>
                                            <td style={{ borderLeft: '1px solid #e2e8f0' }}>{item.batch}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', padding: '1rem' }}>No matching records</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </section>
    );
}

export default CompletedOrdersSection;