import React, { useState, useEffect } from 'react';

function BatchModal({ isOpen, onClose, onSave, editingBatch, existingBatchNumbers = [] }) {
    const [date, setDate] = useState('');
    const [batchNumber, setBatchNumber] = useState('');
    const [totalStickers, setTotalStickers] = useState('');
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (isOpen) {
            if (editingBatch) {
                setDate(editingBatch.createdDate || new Date().toISOString().split('T')[0]);
                setBatchNumber(editingBatch.batchNumber || '');
                setTotalStickers(editingBatch.totalStickers !== undefined ? editingBatch.totalStickers : '');
            } else {
                setDate(new Date().toISOString().split('T')[0]);
                setBatchNumber('');
                setTotalStickers('');
            }
            setErrors({});
        }
    }, [isOpen, editingBatch]);

    if (!isOpen) return null;

    const validate = () => {
        const errs = {};
        if (!date) {
            errs.date = 'Date is required';
        }
        if (!batchNumber || !batchNumber.trim()) {
            errs.batchNumber = 'Batch Number is required';
        } else {
            const trimmed = batchNumber.trim().toUpperCase();
            const isDuplicate = existingBatchNumbers.some(
                b => b.toUpperCase() === trimmed && (!editingBatch || editingBatch.batchNumber.toUpperCase() !== trimmed)
            );
            if (isDuplicate) {
                errs.batchNumber = 'This Batch Number already exists';
            }
        }
        const parsedStickers = parseInt(totalStickers, 10);
        if (isNaN(parsedStickers) || parsedStickers < 1) {
            errs.totalStickers = 'Total Stickers must be at least 1';
        }
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validate()) return;

        onSave({
            ...(editingBatch ? { id: editingBatch.id } : {}),
            createdDate: date,
            batchNumber: batchNumber.trim(),
            totalStickers: parseInt(totalStickers, 10)
        });
        onClose();
    };

    return (
        <div className="overlay open" onClick={onClose}>
            <div className="modal" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
                <h2>{editingBatch ? 'Edit Batch' : 'Add New Batch'}</h2>
                <div className="modal-sub">
                    {editingBatch ? 'Update batch details and total stickers.' : 'Register a new production batch with initial sticker inventory.'}
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                        {/* 1. Date */}
                        <div className="field">
                            <label>Date <span style={{ color: 'var(--red)' }}>*</span></label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className={errors.date ? 'invalid' : ''}
                            />
                            {errors.date && <div className="error-text show">{errors.date}</div>}
                        </div>

                        {/* 2. Batch Number */}
                        <div className="field">
                            <label>Batch Number <span style={{ color: 'var(--red)' }}>*</span></label>
                            <input
                                type="text"
                                placeholder="Enter Batch Number (e.g. 101)"
                                value={batchNumber}
                                onChange={(e) => setBatchNumber(e.target.value)}
                                className={errors.batchNumber ? 'invalid' : ''}
                                autoFocus
                            />
                            {errors.batchNumber && <div className="error-text show">{errors.batchNumber}</div>}
                        </div>

                        {/* 3. Total Stickers */}
                        <div className="field">
                            <label>Total Stickers <span style={{ color: 'var(--red)' }}>*</span></label>
                            <input
                                type="number"
                                min="1"
                                placeholder="Enter Total Stickers (e.g. 150)"
                                value={totalStickers}
                                onChange={(e) => setTotalStickers(e.target.value)}
                                className={errors.totalStickers ? 'invalid' : ''}
                            />
                            {errors.totalStickers && <div className="error-text show">{errors.totalStickers}</div>}
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <button type="button" className="btn-ghost" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary">
                            {editingBatch ? 'Save Changes' : 'Create Batch'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default React.memo(BatchModal);
