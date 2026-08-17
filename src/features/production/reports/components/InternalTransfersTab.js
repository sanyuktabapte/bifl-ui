import React from 'react';

const InternalTransfersTab = ({ transfers, handleViewTransfer, handleDownloadTransfer, handleDeleteTransfer }) => {
    return (
        <div className="accordion open">
            <div className="accordion-header">
                <span>Internal Transfer Logs</span>
            </div>
            <div className="accordion-content">
                <table>
                    <thead>
                        <tr>
                            <th>DATE</th>
                            <th>SOURCE</th>
                            <th>DESTINATION</th>
                            <th>STATUS</th>
                            <th>ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transfers.length === 0 ? (
                            <tr><td colSpan="5" style={{ textAlign: 'center', padding: '1rem' }}>No transfers recorded yet.</td></tr>
                        ) : (
                            transfers.map((item) => (
                                <tr key={item.id}>
                                    <td>{item.transferDate}</td>
                                    <td>
                                        <span style={{ background: item.source === 'Factory' ? '#e0f2fe' : item.source === 'Cold Room' ? '#f3e8ff' : '#f1f5f9', color: item.source === 'Factory' ? '#0369a1' : item.source === 'Cold Room' ? '#6b21a8' : '#334155', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>
                                            {item.source}
                                        </span>
                                    </td>
                                    <td>
                                        <span style={{ background: item.destination === 'Factory' ? '#e0f2fe' : item.destination === 'Cold Room' ? '#f3e8ff' : '#f1f5f9', color: item.destination === 'Factory' ? '#0369a1' : item.destination === 'Cold Room' ? '#6b21a8' : '#334155', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>
                                            {item.destination}
                                        </span>
                                    </td>
                                    <td><span className="status completed">COMPLETED</span></td>
                                    <td className="actions-cell">
                                        <button className="btn-icon" onClick={() => handleViewTransfer(item)} style={{ marginRight: '8px' }}>View</button>
                                        <button className="btn-icon download" onClick={() => handleDownloadTransfer(item)} style={{ marginRight: '8px' }}>Download</button>
                                        <button className="btn-icon delete" onClick={() => handleDeleteTransfer(item.id)}>Delete</button>
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

export default InternalTransfersTab;
