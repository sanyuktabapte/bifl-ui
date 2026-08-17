import React from 'react';

const SalesTab = ({ completedSales, handleViewSale, handleDownloadSale }) => {
    return (
        <div className="accordion open">
            <div className="accordion-header">
                <span>Completed Supplies (Sales)</span>
            </div>
            <div className="accordion-content">
                <table>
                    <thead>
                        <tr>
                            <th>ORDER ID</th>
                            <th>DATE SUPPLIED</th>
                            <th>STORE NAME</th>
                            <th>STATUS</th>
                            <th>ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {completedSales.length === 0 ? (
                            <tr><td colSpan="5" style={{ textAlign: 'center', padding: '1rem' }}>No sale records yet.</td></tr>
                        ) : (
                            completedSales.map((order) => (
                                <tr key={order.id}>
                                    <td>{order.orderId || order.id}</td>
                                    <td>{order.completedDate}</td>
                                    <td><strong>{order.masterStore?.name || order.store || 'NA'}</strong></td>
                                    <td><span className="status completed">COMPLETED</span></td>
                                    <td className="actions-cell">
                                        <button className="btn-icon" onClick={() => handleViewSale(order)} style={{ marginRight: '8px' }}>View</button>
                                        <button className="btn-icon download" onClick={() => handleDownloadSale(order)}>Download</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SalesTab;
