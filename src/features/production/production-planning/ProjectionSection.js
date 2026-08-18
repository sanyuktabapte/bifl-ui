import React, { useState } from 'react';

const ProjectionSection = ({
    isOpen,
    toggleAccordion,
    projectionMatrix,
    allFlavors,
    totals,
    handleProductionChange,
    batchNumberInput,
    setBatchNumberInput,
    handleGeneratePlan,
    handleReset,
    isExistingPlan,
}) => {

    const handleKeyDown = (e, index) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const inputs = document.querySelectorAll('.projection-input');
            if (inputs && inputs.length > index + 1) {
                inputs[index + 1].focus();
            }
        }
    };

    if (!isOpen) {
        return (
            <div className="accordion">
                <div className="accordion-header" onClick={() => toggleAccordion('projection')}>
                    <span>1. Projection</span>
                    <span>▼</span>
                </div>
            </div>
        );
    }

    return (
        <div className="accordion open">
            <div className="accordion-header" onClick={() => toggleAccordion('projection')}>
                <span>1. Projection</span>
                <div className="header-actions">
                    <button className="btn-header-action" onClick={(e) => {
                        e.stopPropagation();
                        handleReset();
                    }}>Reset</button>
                    <span>▲</span>
                </div>
            </div>
            <div className="accordion-content">
                {Object.keys(projectionMatrix).filter(f => projectionMatrix[f]?.orderVol > 0 || projectionMatrix[f]?.production > 0).length === 0 ? (
                    <div className="empty-state">No pending orders</div>
                ) : (
                    <div>
                        <div className="table-responsive-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th rowSpan="2">Flavour</th>
                                    <th colSpan="2" className="main-col-header">Opening Stock</th>
                                    <th className="main-col-header">Order</th>
                                    <th className="main-col-header">Closing Stock</th>
                                    <th className="main-col-header">Production</th>
                                </tr>
                                <tr>
                                    <th className="main-col-start" style={{ width: '90px' }}>Factory</th>
                                    <th className="sub-col" style={{ width: '90px' }}>Cold Room</th>
                                    <th className="main-col-start" style={{ width: '90px' }}>KG</th>
                                    <th className="main-col-start" style={{ width: '90px' }}>KG</th>
                                    <th className="main-col-start" style={{ width: '90px' }}>KG</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.keys(projectionMatrix).map((f, index) => {
                                    const data = projectionMatrix[f];
                                    if (!data) return null; // Safeguard, though keys should exist
                                    const closing = (data.opening || 0) + (data.coldRoomStock || 0) + (data.production || 0) - (data.orderVol || 0);

                                    if (data.orderVol <= 0 && data.production <= 0) {
                                        return null;
                                    }
                                    return (
                                        <tr key={f}>
                                            <td><strong>{f}</strong></td>
                                            <td className="main-col-start">{data.opening || 0}</td>
                                            <td className="sub-col">{data.coldRoomStock || 0}</td>
                                            <td className="main-col-start" style={{ color: '#D97706', fontWeight: 600 }}>{data.orderVol}</td>
                                            <td className="main-col-start" style={{ fontWeight: 600, color: closing >= 0 ? 'var(--green)' : 'var(--red)' }}>{closing}</td>
                                            <td className="main-col-start">
                                                <input type="number" step="3" value={data.production || ''} onChange={(e) => handleProductionChange(f, e.target.value)} onKeyDown={(e) => handleKeyDown(e, index)} className="table-input projection-input" placeholder="0" />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="totals-row">
                                    <td rowSpan="2"><strong>Total</strong></td>
                                    <td colSpan="2" className="main-col-start"><strong>{totals.totalOpen} kg</strong></td>
                                    <td className="main-col-start"><strong>{totals.totalOrder} kg</strong></td>
                                    <td className="main-col-start"><strong>{totals.totalClose} kg</strong></td>
                                    <td className="main-col-start"><strong>{totals.totalProd} kg</strong></td>
                                </tr>
                                <tr className="totals-row sub-total-row">
                                    <td colSpan="2" className="main-col-start"><strong>{totals.totalOpenDol} dol</strong></td>
                                    <td className="main-col-start"><strong>{totals.totalOrderDol} dol</strong></td>
                                    <td className="main-col-start"><strong>{totals.totalCloseDol} dol</strong></td>
                                    <td className="main-col-start"><strong>{totals.totalProdDol} dol</strong></td>
                                </tr>
                            </tfoot>
                        </table>
                        </div>
                    </div>
                )}
                <div className="generator-bar">
                    <div className="generator-actions">
                        <div className="field">
                            <label>Target Batch Number</label>
                            <input type="text" placeholder="e.g. BATCH-101" value={batchNumberInput} onChange={(e) => setBatchNumberInput(e.target.value)} />
                        </div>
                        <button className="btn-primary" onClick={handleGeneratePlan}>
                            {isExistingPlan ? 'Update Plan →' : 'Generate Plan →'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default React.memo(ProjectionSection);