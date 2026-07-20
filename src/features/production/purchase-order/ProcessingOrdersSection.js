import React, { useState, useMemo, useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function ProcessingOrdersSection({ isOpen, toggleAccordion, processingBatches }) {
    const [filters, setFilters] = useState({ flavour: '', batch: '', fromDate: '', toDate: '' });
    const [sortConfig, setSortConfig] = useState({ key: 'processingDate', direction: 'descending' });

    const flattenedBatches = useMemo(() => {
        return processingBatches.flatMap(batch =>
            batch.flavourList.map(flavour => ({
                ...flavour,
                processingDate: batch.processingDate,
                batch: batch.batch,
            }))
        );
    }, [processingBatches]);

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
            items = items.filter(item => new Date(item.processingDate) >= new Date(filters.fromDate));
        }
        if (filters.toDate) {
            items = items.filter(item => new Date(item.processingDate) <= new Date(filters.toDate));
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
        doc.text('Processing Purchase Orders', 14, 22);

        const tableColumn = ["Processing Date", "Flavour", "KG", "Dol", "Batch #"];
        const tableRows = [];

        filteredAndSortedBatches.forEach(item => {
            const dole = Math.floor(parseFloat(item.orderQuantity) / 3) || 0;
            const rowData = [
                item.processingDate,
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

        doc.save(`processing-orders.pdf`);
    }, [filteredAndSortedBatches]);

    return (
        <section className={`accordion ${isOpen ? 'open' : ''}`}>
            <div className="accordion-header">
                <span onClick={() => toggleAccordion('processing')} style={{ flex: 1, cursor: 'pointer' }}>2. Processing Orders</span>
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
                                    <th rowSpan="2" className="sortable" style={{ width: '120px' }} onClick={() => requestSort('processingDate')}>Processing Date{getSortIndicator('processingDate')}</th>
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
                                    filteredAndSortedBatches.map(batch => (
                                        <tr key={`${batch.batch}-${batch.code}`}>
                                            <td>{batch.processingDate}</td>
                                            <td style={{ borderLeft: '1px solid #e2e8f0' }}><strong>{batch.name}</strong></td>
                                            <td style={{ textAlign: 'center', borderLeft: '1px solid #e2e8f0' }}>{batch.orderQuantity}</td>
                                            <td style={{ textAlign: 'center', borderLeft: '1px solid #e2e8f0' }}>{Math.floor(batch.orderQuantity / 3) || 0}</td>
                                            <td style={{ borderLeft: '1px solid #e2e8f0' }}>{batch.batch}</td>
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

export default ProcessingOrdersSection;