import React, { useState, useEffect, useMemo, useCallback } from 'react';
import BatchModal from './BatchModal';
import { fetchBatchesApi, createBatchApi, updateBatchApi, deleteBatchApi } from '../../../services/batchService';

function BatchesPage() {
    const [batches, setBatches] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBatch, setEditingBatch] = useState(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [filterDate, setFilterDate] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'createdDate', direction: 'desc' });

    // Load live batches from backend
    const loadBatches = useCallback(async () => {
        try {
            const data = await fetchBatchesApi();
            if (data && Array.isArray(data)) {
                setBatches(data);
            }
        } catch (err) {
            console.error("Backend batches fetch error:", err);
            setBatches([]);
        }
    }, []);

    useEffect(() => {
        loadBatches();
    }, [loadBatches]);

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

    const filteredBatches = useMemo(() => {
        return batches.filter(batch => {
            const matchesSearch = !searchQuery || batch.batchNumber.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesDate = !filterDate || batch.createdDate === filterDate;
            
            const active = Number(batch.active !== undefined ? batch.active : (batch.inProcess || 0));
            const available = Number(batch.available !== undefined ? batch.available : 0);
            const isCompleted = (available === 0 && active === 0);

            return matchesSearch && matchesDate && !isCompleted;
        }).sort((a, b) => {
            if (!sortConfig.key) return 0;
            let valA = a[sortConfig.key];
            let valB = b[sortConfig.key];

            if (sortConfig.key === 'createdDate') {
                valA = new Date(valA).getTime();
                valB = new Date(valB).getTime();
            } else if (sortConfig.key === 'deficit') {
                const getDef = (b) => Number(b.deficit !== undefined ? b.deficit : Math.max(0, ((Number(b.active || b.inProcess) || 0) + (Number(b.completed) || 0)) - (Number(b.totalStickers) || 0)));
                valA = getDef(a);
                valB = getDef(b);
            } else if (typeof valA === 'string') {
                valA = valA.toLowerCase();
                valB = valB.toLowerCase();
            }

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [batches, searchQuery, filterDate, sortConfig]);

    const stats = useMemo(() => {
        const totalBatches = batches.length;
        const totalStickers = batches.reduce((acc, b) => acc + (Number(b.totalStickers) || 0), 0);
        const availableStickers = batches.reduce((acc, b) => acc + (Number(b.available) || 0), 0);
        const activeStickers = batches.reduce((acc, b) => acc + (Number(b.active || b.inProcess) || 0), 0);
        const completedStickers = batches.reduce((acc, b) => acc + (Number(b.completed) || 0), 0);
        const totalDeficit = batches.reduce((acc, b) => {
            const def = Number(b.deficit !== undefined ? b.deficit : Math.max(0, ((Number(b.active || b.inProcess) || 0) + (Number(b.completed) || 0)) - (Number(b.totalStickers) || 0)));
            return acc + def;
        }, 0);
        return { totalBatches, totalStickers, availableStickers, activeStickers, completedStickers, totalDeficit };
    }, [batches]);

    const handleOpenCreateModal = () => {
        setEditingBatch(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (batch) => {
        setEditingBatch(batch);
        setIsModalOpen(true);
    };

    const handleSaveBatch = async (batchData) => {
        try {
            if (editingBatch && editingBatch.id && typeof editingBatch.id === 'number' && editingBatch.id < 1000000000000) {
                await updateBatchApi(editingBatch.id, {
                    batchNumber: batchData.batchNumber,
                    createdDate: batchData.createdDate,
                    totalStickers: batchData.totalStickers
                });
            } else {
                await createBatchApi({
                    batchNumber: batchData.batchNumber,
                    createdDate: batchData.createdDate,
                    totalStickers: batchData.totalStickers
                });
            }
            await loadBatches();
        } catch (err) {
            console.error("Backend save error, updating local state:", err);
            // Optimistic local state update
            if (editingBatch) {
                setBatches(prev => prev.map(b => {
                    if (b.id === editingBatch.id) {
                        const act = b.active || b.inProcess || 0;
                        const comp = b.completed || 0;
                        const totalConsumed = act + comp;
                        const newTotal = Number(batchData.totalStickers) || 0;
                        const avail = Math.max(0, newTotal - totalConsumed);
                        const def = Math.max(0, totalConsumed - newTotal);
                        const status = def > 0 ? 'Pending' : totalConsumed === 0 ? 'Available' : avail > 0 ? 'Active' : 'Completed';
                        return { ...b, ...batchData, available: avail, deficit: def, status };
                    }
                    return b;
                }));
            } else {
                setBatches(prev => [{
                    ...batchData,
                    id: Date.now(),
                    available: batchData.totalStickers,
                    active: 0,
                    completed: 0,
                    deficit: 0,
                    status: 'Available'
                }, ...prev]);
            }
        }
    };

    const handleDeleteBatch = async (batchId, batchNo) => {
        if (!window.confirm(`Are you sure you want to delete batch '${batchNo}'?`)) return;

        try {
            await deleteBatchApi(batchId);
            await loadBatches();
        } catch (err) {
            console.error("Delete batch error:", err);
            setBatches(prev => prev.filter(b => b.id !== batchId));
        }
    };

    const existingBatchNumbers = batches.map(b => b.batchNumber);

    const formatBatchNo = (bNo) => {
        if (!bNo) return '';
        return String(bNo).startsWith('#') ? bNo : `#${bNo}`;
    };

    return (
        <div className="container">
            {/* Page Header */}
            <div className="page-head">
                <div>
                    <div className="crumb">Factory Module</div>
                    <h1>Batches Management</h1>
                </div>
                <button className="btn-primary" onClick={handleOpenCreateModal}>+ Add New Batch</button>
            </div>

            {/* Quick Stats Banner */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '18px' }}>
                <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: '14px 18px', boxShadow: 'var(--shadow)' }}>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--ink-soft)', fontWeight: 700, marginBottom: '4px' }}>Total Batches</div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--navy)' }}>{stats.totalBatches}</div>
                </div>
                <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: '14px 18px', boxShadow: 'var(--shadow)' }}>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--ink-soft)', fontWeight: 700, marginBottom: '4px' }}>Total Stickers</div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--navy)' }}>{stats.totalStickers.toLocaleString()}</div>
                </div>
                <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: '14px 18px', boxShadow: 'var(--shadow)' }}>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--ink-soft)', fontWeight: 700, marginBottom: '4px' }}>Available</div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#1E40AF' }}>{stats.availableStickers.toLocaleString()}</div>
                </div>
                <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: '14px 18px', boxShadow: 'var(--shadow)' }}>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--ink-soft)', fontWeight: 700, marginBottom: '4px' }}>Active</div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#D97706' }}>{stats.activeStickers.toLocaleString()}</div>
                </div>
                <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: '14px 18px', boxShadow: 'var(--shadow)' }}>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--ink-soft)', fontWeight: 700, marginBottom: '4px' }}>Completed</div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#15803D' }}>{stats.completedStickers.toLocaleString()}</div>
                </div>
                <div style={{ background: stats.totalDeficit > 0 ? '#FEF2F2' : 'var(--card)', border: stats.totalDeficit > 0 ? '1.5px solid #FCA5A5' : '1px solid var(--line)', borderRadius: 'var(--radius)', padding: '14px 18px', boxShadow: 'var(--shadow)' }}>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: stats.totalDeficit > 0 ? '#991B1B' : 'var(--ink-soft)', fontWeight: 700, marginBottom: '4px' }}>Pending</div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: stats.totalDeficit > 0 ? '#DC2626' : 'var(--navy)' }}>{stats.totalDeficit.toLocaleString()}</div>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="filters">
                <div className="field">
                    <label>Search Batch Number</label>
                    <input
                        type="text"
                        placeholder="Search e.g. 101"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="field">
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
                    >
                        Clear Filters
                    </button>
                )}
            </div>

            {/* Batches Table */}
            <table>
                <thead>
                    <tr>
                        <th className="sortable" onClick={() => handleSort('createdDate')}>
                            Created Date {sortConfig.key === 'createdDate' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                        </th>
                        <th className="sortable" onClick={() => handleSort('batchNumber')}>
                            Batch Number {sortConfig.key === 'batchNumber' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                        </th>
                        <th className="sortable" onClick={() => handleSort('totalStickers')} style={{ textAlign: 'center' }}>
                            Total Stickers {sortConfig.key === 'totalStickers' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                        </th>
                        <th className="sortable" onClick={() => handleSort('available')} style={{ textAlign: 'center' }}>
                            Available {sortConfig.key === 'available' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                        </th>
                        <th className="sortable" onClick={() => handleSort('active')} style={{ textAlign: 'center' }}>
                            Active {sortConfig.key === 'active' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                        </th>
                        <th className="sortable" onClick={() => handleSort('completed')} style={{ textAlign: 'center' }}>
                            Completed {sortConfig.key === 'completed' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                        </th>
                        <th className="sortable" onClick={() => handleSort('deficit')} style={{ textAlign: 'center' }}>
                            Pending {sortConfig.key === 'deficit' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                        </th>
                        <th className="sortable" onClick={() => handleSort('status')} style={{ textAlign: 'center' }}>
                            Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                        </th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredBatches.length === 0 ? (
                        <tr>
                            <td colSpan="9" style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--ink-soft)', fontStyle: 'italic' }}>
                                No batches found. Click <strong>+ Add New Batch</strong> to create one.
                            </td>
                        </tr>
                    ) : (
                        filteredBatches.map((batch) => {
                            const total = Number(batch.totalStickers) || 0;
                            const active = Number(batch.active !== undefined ? batch.active : (batch.inProcess || 0));
                            const completed = Number(batch.completed || 0);
                            const totalConsumed = active + completed;
                            const deficit = Number(batch.deficit !== undefined ? batch.deficit : Math.max(0, totalConsumed - total));

                            return (
                                <tr key={batch.id}>
                                    <td>{formatDate(batch.createdDate)}</td>
                                    <td>
                                        <span style={{ fontWeight: 700, color: 'var(--blue-deep)' }}>
                                            {formatBatchNo(batch.batchNumber)}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--navy)' }}>
                                        {batch.totalStickers}
                                    </td>
                                    <td style={{ textAlign: 'center', fontWeight: 700, color: batch.available > 0 ? '#1E40AF' : 'var(--ink-soft)' }}>
                                        {batch.available}
                                    </td>
                                    <td style={{ textAlign: 'center', fontWeight: 600, color: '#D97706' }}>
                                        {active}
                                    </td>
                                    <td style={{ textAlign: 'center', fontWeight: 600, color: '#15803D' }}>
                                        {completed}
                                    </td>
                                    <td style={{ textAlign: 'center', fontWeight: 700, fontSize: '14px', color: deficit > 0 ? '#DC2626' : 'var(--ink-soft)' }}>
                                        {deficit}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        {deficit > 0 ? (
                                            <span style={{
                                                background: '#FEF2F2',
                                                color: '#DC2626',
                                                border: '1px solid #FCA5A5',
                                                padding: '3px 8px',
                                                borderRadius: '4px',
                                                fontSize: '11px',
                                                fontWeight: 700,
                                                whiteSpace: 'nowrap'
                                            }}>
                                                Pending
                                            </span>
                                        ) : totalConsumed === 0 ? (
                                            <span style={{
                                                background: '#F0FDF4',
                                                color: '#16A34A',
                                                border: '1px solid #BBF7D0',
                                                padding: '3px 8px',
                                                borderRadius: '4px',
                                                fontSize: '11px',
                                                fontWeight: 700,
                                                whiteSpace: 'nowrap'
                                            }}>
                                                Available
                                            </span>
                                        ) : batch.available > 0 ? (
                                            <span style={{
                                                background: '#EFF6FF',
                                                color: '#2563EB',
                                                border: '1px solid #BFDBFE',
                                                padding: '3px 8px',
                                                borderRadius: '4px',
                                                fontSize: '11px',
                                                fontWeight: 700,
                                                whiteSpace: 'nowrap'
                                            }}>
                                                Active
                                            </span>
                                        ) : (
                                            <span style={{
                                                background: '#F1F5F9',
                                                color: '#64748B',
                                                border: '1px solid #CBD5E1',
                                                padding: '3px 8px',
                                                borderRadius: '4px',
                                                fontSize: '11px',
                                                fontWeight: 700,
                                                whiteSpace: 'nowrap'
                                            }}>
                                                Completed
                                            </span>
                                        )}
                                    </td>
                                    <td className="actions-cell">
                                        <button
                                            className="btn-icon"
                                            onClick={() => handleOpenEditModal(batch)}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            className="btn-icon delete"
                                            onClick={() => handleDeleteBatch(batch.id, batch.batchNumber)}
                                            disabled={(active > 0 || completed > 0)}
                                            style={(active > 0 || completed > 0) ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>

            {/* Add / Edit Batch Modal */}
            <BatchModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveBatch}
                editingBatch={editingBatch}
                existingBatchNumbers={existingBatchNumbers}
            />
        </div>
    );
}

export default BatchesPage;
