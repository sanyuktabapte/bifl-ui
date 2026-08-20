import React, { useState, useMemo } from 'react';

const BatchesReportTab = ({ batches = [] }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterDate, setFilterDate] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'createdDate', direction: 'desc' });

    // Format date as DD-MM-YYYY
    const formatDate = (dateStr) => {
        if (!dateStr) return 'NA';
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
    };

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    // Filter out batches that have completed/exhausted all available stickers (available === 0)
    const completedBatchesList = useMemo(() => {
        return batches.filter(batch => {
            const isCompletedOrExhausted = (Number(batch.available) || 0) <= 0;
            const matchesSearch = !searchQuery || batch.batchNumber.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesDate = !filterDate || batch.createdDate === filterDate;
            return isCompletedOrExhausted && matchesSearch && matchesDate;
        }).sort((a, b) => {
            if (!sortConfig.key) return 0;
            let valA = a[sortConfig.key];
            let valB = b[sortConfig.key];

            if (sortConfig.key === 'createdDate') {
                valA = new Date(valA).getTime();
                valB = new Date(valB).getTime();
            } else if (typeof valA === 'string') {
                valA = valA.toLowerCase();
                valB = valB.toLowerCase();
            }

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [batches, searchQuery, filterDate, sortConfig]);

    return (
        <div className="accordion open">
            <div className="accordion-header">
                <span>Completed / Exhausted Batches</span>
            </div>
            <div className="accordion-content">
                {/* Filters */}
                <div className="filters" style={{ marginBottom: '16px' }}>
                    <div className="field" style={{ minWidth: '200px' }}>
                        <label>Search Batch Number</label>
                        <input
                            type="text"
                            placeholder="Search e.g. BATCH-101"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="field" style={{ minWidth: '180px' }}>
                        <label>Filter by Date</label>
                        <input
                            type="date"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                        />
                    </div>
                    {(searchQuery || filterDate) && (
                        <button
                            className="btn-ghost"
                            onClick={() => {
                                setSearchQuery('');
                                setFilterDate('');
                            }}
                            style={{ alignSelf: 'flex-end', height: '40px' }}
                        >
                            Clear Filters
                        </button>
                    )}
                </div>

                {/* Table */}
                <div className="table-responsive-wrapper" style={{ background: 'var(--card)', borderRadius: 'var(--radius)', border: '1px solid var(--line)', overflow: 'hidden' }}>
                    <table style={{ borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th className="sortable" onClick={() => handleSort('createdDate')} style={{ width: '200px', borderRight: '1px solid var(--line)' }}>
                                    Date {sortConfig.key === 'createdDate' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                </th>
                                <th className="sortable" onClick={() => handleSort('batchNumber')} style={{ borderRight: '1px solid var(--line)' }}>
                                    Batch Number {sortConfig.key === 'batchNumber' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                </th>
                                <th className="sortable" onClick={() => handleSort('totalStickers')} style={{ textAlign: 'center', width: '200px' }}>
                                    Total Stickers {sortConfig.key === 'totalStickers' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {completedBatchesList.length === 0 ? (
                                <tr>
                                    <td colSpan="3" style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--ink-soft)' }}>
                                        No completed/exhausted batches found.
                                    </td>
                                </tr>
                            ) : (
                                completedBatchesList.map((batch) => (
                                    <tr key={batch.id}>
                                        <td style={{ fontWeight: 500, borderRight: '1px solid var(--line)' }}>
                                            {formatDate(batch.createdDate)}
                                        </td>
                                        <td style={{ borderRight: '1px solid var(--line)' }}>
                                            <span style={{ fontWeight: 700, color: 'var(--blue-deep)', background: '#EAF1FC', padding: '4px 10px', borderRadius: '6px', fontSize: '13px' }}>
                                                {batch.batchNumber ? (String(batch.batchNumber).startsWith('#') ? batch.batchNumber : `#${batch.batchNumber}`) : ''}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--navy)' }}>
                                            {batch.totalStickers}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default React.memo(BatchesReportTab);
