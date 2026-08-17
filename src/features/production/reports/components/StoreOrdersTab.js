import React from 'react';

const StoreOrdersTab = ({ readyOrders }) => {
    return (
        <div className="accordion open">
            <div className="accordion-header">
                <span>Production Ready Orders</span>
            </div>
            <div className="accordion-content">
                <table>
                    <thead>
                        <tr>
                            <th>ORDER ID</th>
                            <th>ORDER DATE</th>
                            <th>STORE NAME</th>
                            <th>STATUS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {readyOrders.length === 0 ? (
                            <tr><td colSpan="4" style={{ textAlign: 'center', padding: '1rem' }}>No ready orders currently.</td></tr>
                        ) : (
                            readyOrders.map((order) => (
                                <tr key={order.id}>
                                    <td>{order.orderId || order.id}</td>
                                    <td>{order.orderDate}</td>
                                    <td><strong>{order.masterStore?.name || order.store || 'NA'}</strong></td>
                                    <td><span className="status ready">READY</span></td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default StoreOrdersTab;
