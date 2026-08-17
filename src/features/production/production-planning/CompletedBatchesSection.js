import React, { useState, useMemo, useCallback } from 'react';

const CompletedBatchesSection = ({
    isOpen,
    toggleAccordion,
    completedBatchList = []
}) => {
    const [filters, setFilters] = useState({ batch: '', fromDate: '', toDate: '' });
    const [expandedBatches, setExpandedBatches] = useState({});

    const toggleBatchBand = useCallback((batchNo) => {
        setExpandedBatches(prev => ({ ...prev, [batchNo]: !prev[batchNo] }));
    }, []);

    const handleFilterChange = useCallback((e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    }, []);

    const resetFilters = useCallback(() => {
        setFilters({ batch: '', fromDate: '', toDate: '' });
    }, []);

    const filteredBatches = useMemo(() => {
        return (completedBatchList || []).filter(batch => {
            const batchMatch = !filters.batch || String(batch.batch).toLowerCase().includes(filters.batch.toLowerCase());
            const fromDateMatch = !filters.fromDate || new Date(batch.completedDate) >= new Date(filters.fromDate);
            const toDateMatch = !filters.toDate || new Date(batch.completedDate) <= new Date(filters.toDate);
            return batchMatch && fromDateMatch && toDateMatch;
        });
    }, [completedBatchList, filters]);

    if (!isOpen) {
        return (
            <div className="accordion">
                <div className="accordion-header" onClick={() => toggleAccordion('completed')}>
                    <span>3. Completed Production</span>
                    <span>▼</span>
                </div>
            </div>
        );
    }

    return (
        <div className="accordion open">
            <div className="accordion-header" onClick={() => toggleAccordion('completed')}>
                <span>3. Completed Production</span>
                <span>▲</span>
            </div>
            <div className="accordion-content">
                <div className="filters">
                    <div className="field">
                        <label>Batch #</label>
                        <input type="text" name="batch" value={filters.batch} onChange={handleFilterChange} placeholder="Enter batch number..." />
                    </div>
                    <div className="field"><label>From Date</label><input type="date" name="fromDate" value={filters.fromDate} onChange={handleFilterChange} /></div>
                    <div className="field"><label>To Date</label><input type="date" name="toDate" value={filters.toDate} onChange={handleFilterChange} /></div>
                    <button className="btn-ghost" onClick={resetFilters}>Reset</button>
                </div>

                {filteredBatches.length === 0 ? (
                    <div className="empty-state">No batches completed yet.</div>
                ) : (
                    filteredBatches.map(batch => {
                        const batchFlavours = batch.flavours || [];
                        const batchTotals = batchFlavours.reduce((acc, item) => {
                            const qty = item.actualProduction || item.orderQuantity || 0;
                            acc.targetKg += qty;
                            acc.actualKg += qty;
                            return acc;
                        }, { targetKg: 0, actualKg: 0 });

                        return (
                            <div key={batch.batch} className="batch-group">
                                <div className="batch-header" onClick={() => toggleBatchBand(batch.batch)}>
                                    <span>📦 Batch: #{batch.batch}</span>
                                </div>
                                {expandedBatches[batch.batch] && (
                                    <div className="batch-body">
                                        <div className="table-responsive-wrapper">
                                            <table>
                                                <thead>
                                                    <tr>
                                                        <th rowSpan="2" style={{ width: '110px' }}>Completed Date</th>
                                                        <th rowSpan="2">Flavour</th>
                                                        <th className="main-col-header">Target Production</th>
                                                        <th className="main-col-header" style={{ borderRight: '1px solid #e2e8f0' }}>Actual Production</th>
                                                        <th rowSpan="2">Status</th>
                                                    </tr>
                                                    <tr>
                                                        <th className="main-col-start" style={{ width: '90px' }}>KG</th>
                                                        <th className="main-col-start" style={{ width: '90px', borderRight: '1px solid #e2e8f0' }}>KG</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {batchFlavours.map(item => {
                                                        const targetProduction = item.actualProduction || item.orderQuantity || 0;
                                                        const actualProduction = targetProduction;
                                                        const name = item.name || item.flavourCode || '';
                                                        return (
                                                            <tr key={name}>
                                                                <td>{batch.completedDate}</td>
                                                                <td><strong>{name}</strong></td>
                                                                <td className="main-col-start" style={{ fontWeight: 600, color: 'var(--blue-deep)' }}>{targetProduction}</td>
                                                                <td className="main-col-start" style={{ borderRight: '1px solid #e2e8f0' }}>{actualProduction}</td>
                                                                <td><span className="status completed">Completed</span></td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                                <tfoot>
                                                    <tr className="totals-row">
                                                        <td rowSpan="2" colSpan="2"><strong>Total</strong></td>
                                                        <td className="main-col-start"><strong>{batchTotals.targetKg} kg</strong></td>
                                                        <td className="main-col-start" style={{ borderRight: '1px solid #e2e8f0' }}><strong>{batchTotals.actualKg} kg</strong></td>
                                                        <td></td>
                                                    </tr>
                                                    <tr className="totals-row sub-total-row">
                                                        <td className="main-col-start"><strong>{Math.floor(batchTotals.targetKg / 3) || 0} dol</strong></td>
                                                        <td className="main-col-start" style={{ borderRight: '1px solid #e2e8f0' }}><strong>{Math.floor(batchTotals.actualKg / 3) || 0} dol</strong></td>
                                                        <td></td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default React.memo(CompletedBatchesSection);