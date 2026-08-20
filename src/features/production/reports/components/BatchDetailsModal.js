import React from 'react';

const BatchDetailsModal = ({ isOpen, plan, onClose, onDownload }) => {
    if (!isOpen || !plan) return null;

    return (
        <div className="overlay open">
            <div className="modal" style={{ width: '600px' }}>
                <h2>Production Batch Details</h2>
                <div className="modal-sub">View batch info and production volumes.</div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px', fontSize: '14px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid var(--line)' }}>
                    <div>
                        <strong>Batch Number:</strong> {plan.batchNumber ? (String(plan.batchNumber).startsWith('#') ? plan.batchNumber : `#${plan.batchNumber}`) : ''}
                    </div>
                    <div>
                        <strong>Plan Date:</strong> {plan.planDate}
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                        <strong>Status:</strong> <span className="status completed">COMPLETED</span>
                    </div>
                </div>

                <table className="flavour-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Flavour</th>
                            <th style={{ textAlign: 'center' }}>Target</th>
                            <th style={{ textAlign: 'center' }}>Actual</th>
                            <th style={{ textAlign: 'center' }}>Cold Room</th>
                            <th style={{ textAlign: 'center' }}>Factory</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(plan.items || []).map((item, index) => {
                            const target = item.targetProduction || 0;
                            const actual = item.actualProduction != null ? item.actualProduction : target;
                            const cold = item.coldRoomTransfer != null ? item.coldRoomTransfer : actual;
                            const factory = Math.max(0, actual - cold);

                            return (
                                <tr key={index}>
                                    <td>{index + 1}</td>
                                    <td><strong>{item.flavour?.name || 'NA'}</strong></td>
                                    <td style={{ textAlign: 'center' }}>{target}</td>
                                    <td style={{ textAlign: 'center' }}>{actual}</td>
                                    <td style={{ textAlign: 'center' }}>{cold}</td>
                                    <td style={{ textAlign: 'center' }}>{factory}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot>
                        <tr className="totals-row">
                            <td colSpan="2" style={{ textAlign: 'right' }}>Total</td>
                            <td style={{ textAlign: 'center' }}>
                                {plan.items.reduce((sum, item) => sum + (item.targetProduction || 0), 0)} kg
                            </td>
                            <td style={{ textAlign: 'center' }}>
                                {plan.items.reduce((sum, item) => sum + (item.actualProduction != null ? item.actualProduction : (item.targetProduction || 0)), 0)} kg
                            </td>
                            <td style={{ textAlign: 'center' }}>
                                {plan.items.reduce((sum, item) => sum + (item.coldRoomTransfer != null ? item.coldRoomTransfer : (item.actualProduction != null ? item.actualProduction : (item.targetProduction || 0))), 0)} kg
                            </td>
                            <td style={{ textAlign: 'center' }}>
                                {plan.items.reduce((sum, item) => {
                                    const target = item.targetProduction || 0;
                                    const actual = item.actualProduction != null ? item.actualProduction : target;
                                    const cold = item.coldRoomTransfer != null ? item.coldRoomTransfer : actual;
                                    const factory = Math.max(0, actual - cold);
                                    return sum + factory;
                                }, 0)} kg
                            </td>
                        </tr>
                        <tr className="totals-row">
                            <td colSpan="2" style={{ textAlign: 'right' }}>Total Dol</td>
                            <td style={{ textAlign: 'center' }}>
                                {Math.floor(plan.items.reduce((sum, item) => sum + (item.targetProduction || 0), 0) / 3)} dol
                            </td>
                            <td style={{ textAlign: 'center' }}>
                                {Math.floor(plan.items.reduce((sum, item) => sum + (item.actualProduction != null ? item.actualProduction : (item.targetProduction || 0)), 0) / 3)} dol
                            </td>
                            <td style={{ textAlign: 'center' }}>
                                {Math.floor(plan.items.reduce((sum, item) => sum + (item.coldRoomTransfer != null ? item.coldRoomTransfer : (item.actualProduction != null ? item.actualProduction : (item.targetProduction || 0))), 0) / 3)} dol
                            </td>
                            <td style={{ textAlign: 'center' }}>
                                {Math.floor(plan.items.reduce((sum, item) => {
                                    const target = item.targetProduction || 0;
                                    const actual = item.actualProduction != null ? item.actualProduction : target;
                                    const cold = item.coldRoomTransfer != null ? item.coldRoomTransfer : actual;
                                    const factory = Math.max(0, actual - cold);
                                    return sum + factory;
                                }, 0) / 3)} dol
                            </td>
                        </tr>
                    </tfoot>
                </table>

                <div className="modal-actions">
                    <button className="btn-primary" onClick={() => onDownload(plan)}>Download PDF</button>
                    <button className="btn-ghost" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
};

export default BatchDetailsModal;
