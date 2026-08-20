import React from 'react';

const SalesTab = ({ completedSales, handleViewSale, handleDownloadSale }) => {
    return (
        <div className="accordion open">
            <div className="accordion-header">
                <span>Completed Supplies (Sales History)</span>
            </div>
            <div className="accordion-content">
                <table>
                    <thead>
                        <tr>
                            <th>ORDER ID</th>
                            <th>ORDER DATE</th>
                            <th>STORE NAME</th>
                            <th style={{ textAlign: 'center' }}>TOTAL QUANTITY</th>
                            <th>COMPLETED DATE</th>
                            <th style={{ textAlign: 'center' }}>STATUS</th>
                            <th style={{ textAlign: 'center' }}>ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {completedSales.length === 0 ? (
                            <tr><td colSpan="7" style={{ textAlign: 'center', padding: '1rem', fontStyle: 'italic', color: 'var(--ink-soft)' }}>No completed sales records yet.</td></tr>
                        ) : (
                            completedSales.map((order) => {
                                const formattedId = order.orderId ? `SO-${order.orderId}` : `SO-${order.id}`;
                                const totalKg = (order.flavours || []).reduce((sum, f) => sum + (parseFloat(f.orderQuantity) || 0), 0);
                                const totalDol = Math.floor(totalKg / 3);

                                return (
                                    <tr key={order.id}>
                                        <td style={{ fontWeight: 600, color: 'var(--blue-deep)' }}>{formattedId}</td>
                                        <td>{order.orderDate || 'NA'}</td>
                                        <td><strong>{order.masterStore?.name || order.store || 'NA'}</strong></td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span style={{ fontWeight: 600 }}>{totalKg} KG</span> <span style={{ color: 'var(--ink-soft)', fontSize: '12px' }}>({totalDol} dol)</span>
                                        </td>
                                        <td>{order.completedDate || 'NA'}</td>
                                        <td style={{ textAlign: 'center' }}><span className="status completed">COMPLETED</span></td>
                                        <td className="actions-cell" style={{ textAlign: 'center' }}>
                                            <button className="btn-icon" onClick={() => handleViewSale(order)} style={{ marginRight: '8px' }}>View</button>
                                            <button className="btn-icon download" onClick={() => handleDownloadSale(order)}>📄 Download Invoice</button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SalesTab;
