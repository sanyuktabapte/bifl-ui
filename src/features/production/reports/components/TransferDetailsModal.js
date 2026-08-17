import React from 'react';

const TransferDetailsModal = ({ isOpen, transfer, onClose, onDownload }) => {
    if (!isOpen || !transfer) return null;

    return (
        <div className="overlay open">
            <div className="modal" style={{ maxWidth: '600px', width: '100%' }}>
                <div className="modal-header">
                    <h2>Internal Transfer Details</h2>
                </div>
                <div className="modal-sub">
                    Date: {transfer.transferDate} | Status: <span style={{ color: 'var(--green)' }}>COMPLETED</span>
                </div>
                <div className="modal-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid var(--line)' }}>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--ink-soft)' }}>SOURCE</div>
                            <div style={{ fontWeight: '700', color: 'var(--navy)' }}>{transfer.source}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '11px', color: 'var(--ink-soft)' }}>DESTINATION</div>
                            <div style={{ fontWeight: '700', color: 'var(--navy)' }}>{transfer.destination}</div>
                        </div>
                    </div>
                    <div style={{ border: '1px solid var(--line)', borderRadius: '8px', overflow: 'hidden' }}>
                        <table>
                            <thead style={{ background: '#f1f5f9' }}>
                                <tr>
                                    <th>FLAVOUR</th>
                                    <th style={{ textAlign: 'right' }}>QUANTITY (KG)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(transfer.items || []).map((item, idx) => (
                                    <tr key={idx}>
                                        <td>{item.flavourName || item.flavourCode}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{item.quantity}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{ background: '#f8fafc' }}>
                                    <td style={{ fontWeight: 'bold', textAlign: 'right' }}>TOTAL VOLUME:</td>
                                    <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--blue)' }}>
                                        {(transfer.items || []).reduce((acc, curr) => acc + (curr.quantity || 0), 0)} kg
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    <div className="modal-actions" style={{ marginTop: '24px' }}>
                        <button className="btn-primary" onClick={() => onDownload(transfer)}>Download Receipt</button>
                        <button className="btn-ghost" onClick={onClose}>Close</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TransferDetailsModal;
