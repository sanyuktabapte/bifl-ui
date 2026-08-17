import React from 'react';

const ProductionBatchesTab = ({ completedBatches, handleViewBatch, handleDownloadBatch }) => {
    return (
        <div className="accordion open">
            <div className="accordion-header">
                <span>Completed Production Batches</span>
            </div>
            <div className="accordion-content">
                <table>
                    <thead>
                        <tr>
                            <th>BATCH NO.</th>
                            <th>PLAN DATE</th>
                            <th>STATUS</th>
                            <th>ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {completedBatches.length === 0 ? (
                            <tr><td colSpan="4" style={{ textAlign: 'center', padding: '1rem' }}>No completed batches yet.</td></tr>
                        ) : (
                            completedBatches.map((plan) => (
                                <tr key={plan.id}>
                                    <td><strong>{plan.batchNumber}</strong></td>
                                    <td>{plan.planDate}</td>
                                    <td><span className="status completed">COMPLETED</span></td>
                                    <td className="actions-cell">
                                        <button className="btn-icon" onClick={() => handleViewBatch(plan)} style={{ marginRight: '8px' }}>View</button>
                                        <button className="btn-icon download" onClick={() => handleDownloadBatch(plan)}>Download</button>
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

export default ProductionBatchesTab;
