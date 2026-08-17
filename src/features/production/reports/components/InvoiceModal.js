import React from 'react';

const InvoiceModal = ({ isOpen, order, flavours, onClose, onDownload }) => {
    if (!isOpen || !order) return null;

    return (
        <div className="overlay open">
            <div className="modal" style={{ width: '600px' }}>
                <h2>Invoice Details</h2>
                <div className="modal-sub">View billing summary and supplied items.</div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px', fontSize: '14px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid var(--line)' }}>
                    <div>
                        <strong>Order ID:</strong> {order.orderId || order.id}
                    </div>
                    <div>
                        <strong>Date Supplied:</strong> {order.completedDate || 'NA'}
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                        <strong>Store Name:</strong> {order.masterStore?.name || order.store || 'NA'}
                    </div>
                </div>

                <table className="flavour-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Flavour</th>
                            <th style={{ textAlign: 'center' }}>KG</th>
                            <th style={{ textAlign: 'center' }}>Dol</th>
                            <th style={{ textAlign: 'center' }}>Price</th>
                            <th style={{ textAlign: 'center' }}>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(order.flavours || []).map((item, index) => {
                            const flavour = flavours.find(f => f.name.toLowerCase() === item.flavourName.toLowerCase() || f.code === item.flavourCode);
                            const price = flavour?.price || 0;
                            const quantity = parseFloat(item.orderQuantity) || 0;
                            const dole = Math.floor(quantity / 3) || 0;
                            const amount = quantity * price;

                            return (
                                <tr key={index}>
                                    <td>{index + 1}</td>
                                    <td><strong>{item.flavourName}</strong></td>
                                    <td style={{ textAlign: 'center' }}>{quantity}</td>
                                    <td style={{ textAlign: 'center' }}>{dole}</td>
                                    <td style={{ textAlign: 'center' }}>{price}</td>
                                    <td style={{ textAlign: 'center' }}>{amount.toLocaleString()}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot>
                        <tr className="totals-row">
                            <td colSpan="2" style={{ textAlign: 'right' }}>Total</td>
                            <td style={{ textAlign: 'center' }}>
                                {order.flavours.reduce((sum, item) => sum + (parseFloat(item.orderQuantity) || 0), 0)}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                                {order.flavours.reduce((sum, item) => sum + Math.floor((parseFloat(item.orderQuantity) || 0) / 3), 0)}
                            </td>
                            <td></td>
                            <td style={{ textAlign: 'center' }}>
                                {order.flavours.reduce((sum, item) => {
                                    const flavour = flavours.find(f => f.name.toLowerCase() === item.flavourName.toLowerCase() || f.code === item.flavourCode);
                                    const price = flavour?.price || 0;
                                    return sum + ((parseFloat(item.orderQuantity) || 0) * price);
                                }, 0).toLocaleString()}
                            </td>
                        </tr>
                    </tfoot>
                </table>

                <div className="modal-actions" style={{ marginTop: '24px' }}>
                    <button className="btn-ghost" onClick={onClose}>Close</button>
                    <button className="btn-primary" onClick={() => {
                        onDownload(order);
                        onClose();
                    }}>Download Invoice ⬇️</button>
                </div>
            </div>
        </div>
    );
};

export default InvoiceModal;
