import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ProjectionSection from './ProjectionSection';
import BlueprintSection from './BlueprintSection';
import { fetchProjection, fetchPlans, generatePlanApi, updateProductionPlanApi, updatePlanStatusApi, deletePlanApi } from '../../../services/productionPlanningService';
import { fetchBatchesApi } from '../../../services/batchService';
import { fetchAdminDashboard } from '../../../services/adminService';

function ProductionPlanningPage() {
    const [accordions, setAccordions] = useState({ projection: true, blueprint: true, completed: true });
    const [projectionMatrix, setProjectionMatrix] = useState({});
    const [masterFlavours, setMasterFlavours] = useState([]);
    const [targetBatchNo, setTargetBatchNo] = useState('');
    const [allBatches, setAllBatches] = useState([]);
    const [availableBatches, setAvailableBatches] = useState([]);
    const [expandedBlueprints, setExpandedBlueprints] = useState({});
    const [blueprintData, setBlueprintData] = useState({});
    const [editingPlan, setEditingPlan] = useState(null); // { planId, batchNumber }

    const allFlavors = useMemo(() => Object.keys(projectionMatrix), [projectionMatrix]);

    // Load Projections & Plans from backend
    const loadBackendData = useCallback(async () => {
        try {
            const [projections, plans, batchList, adminData] = await Promise.all([
                fetchProjection().catch(() => null),
                fetchPlans().catch(() => null),
                fetchBatchesApi().catch(() => []),
                fetchAdminDashboard().catch(() => null)
            ]);

            if (adminData && adminData.flavourList) {
                setMasterFlavours(adminData.flavourList);
            }

            if (batchList && Array.isArray(batchList)) {
                setAllBatches(batchList);
                const avail = batchList.filter(b => (Number(b.available) || 0) > 0);
                setAvailableBatches(avail);
            }

            if (projections !== null) {
                // Pre-populate projection matrix from master list and pending orders
                const matrix = {};
                projections.forEach(item => {
                    matrix[item.flavourName] = {
                        code: item.flavourCode,
                        opening: item.factoryStock || 0,
                        coldRoomStock: item.coldRoomStock || 0,
                        inProcess: item.inProcessQuantity || 0,
                        orderVol: item.orderQuantity || 0,
                        production: 0,
                        batchNumber: ''
                    };
                });
                setProjectionMatrix(matrix);
            }

            if (plans !== null) {
                const blueprints = {};
                const completedList = [];
                const idMapping = {};

                plans.forEach(plan => {
                    idMapping[plan.batchNumber] = plan.id;

                    if (plan.status === 'Scheduled' || plan.status === 'In Production' || plan.status === 'Processing') {
                        const batchKey = plan.batchNumber ? String(plan.batchNumber).replace(/^BATCH-/i, '') : '100';
                        if (!blueprints[batchKey]) {
                            blueprints[batchKey] = {
                                id: plan.id,
                                batchNumber: batchKey,
                                planDate: plan.planDate || new Date().toISOString().split('T')[0],
                                flavours: {},
                                planId: plan.id,
                                status: plan.status
                            };
                        }

                        if (plan.items) {
                            plan.items.forEach(item => {
                                const name = item.flavour?.name || item.flavourCode;
                                blueprints[batchKey].flavours[name] = {
                                    id: item.id,
                                    flavourCode: item.flavour?.code,
                                    production: item.targetProduction || 0,
                                    actualProduction: item.actualProduction !== undefined && item.actualProduction !== null ? item.actualProduction : (item.targetProduction || 0),
                                    coldRoomTransfer: item.coldRoomTransfer !== undefined && item.coldRoomTransfer !== null ? item.coldRoomTransfer : 
                                                      (item.actualProduction !== undefined && item.actualProduction !== null ? item.actualProduction : (item.targetProduction || 0)),
                                    batchNumber: item.batchNumber || plan.batchNumber,
                                    planId: plan.id,
                                    status: plan.status
                                };
                            });
                        }
                    } else if (plan.status === 'Completed') {
                        const flavoursMap = {};
                        if (plan.items) {
                            plan.items.forEach(item => {
                                const name = item.flavour?.name || item.flavourCode;
                                flavoursMap[name] = {
                                    actualProduction: item.actualProduction !== undefined && item.actualProduction !== null ? item.actualProduction : (item.targetProduction || 0)
                                };
                            });
                        }
                        const completedFlavoursList = Object.keys(flavoursMap).map(fName => ({
                            name: fName,
                            flavourCode: flavoursMap[fName].flavourCode,
                            actualProduction: flavoursMap[fName].actualProduction
                        }));

                        completedList.push({
                            id: plan.id,
                            batch: plan.batchNumber,
                            completedDate: plan.planDate || new Date().toISOString().split('T')[0],
                            flavours: completedFlavoursList,
                            status: 'Completed'
                        });
                    }
                });

                setBlueprintData(blueprints);
            } else {
                setBlueprintData({});
            }
        } catch (err) {
            console.error("Error loading backend production planning data:", err);
        }
    }, []);

    useEffect(() => {
        loadBackendData();
    }, [loadBackendData]);

    const toggleAccordion = useCallback((accordionKey) => {
        setAccordions(prev => ({
            ...prev,
            [accordionKey]: !prev[accordionKey]
        }));
    }, []);

    const toggleBatchBand = useCallback((batchKey) => setExpandedBlueprints(prev => ({ ...prev, [batchKey]: !prev[batchKey] })), []);

    const handleProductionChange = useCallback((flavour, value) => {
        setProjectionMatrix(prev => {
            if (!prev[flavour]) return prev;
            const numVal = value === '' ? '' : Number(value);
            const currentBatch = prev[flavour].batchNumber;
            let newBatch = currentBatch;
            if (Number(numVal) > 0 && (!currentBatch || currentBatch.trim() === '')) {
                newBatch = targetBatchNo;
            } else if (Number(numVal) <= 0) {
                newBatch = '';
            }
            return {
                ...prev,
                [flavour]: { ...prev[flavour], production: numVal, batchNumber: newBatch }
            };
        });
    }, [targetBatchNo]);

    const handleTargetBatchChange = useCallback((val) => {
        setTargetBatchNo(val);
        setProjectionMatrix(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(f => {
                if ((Number(next[f].production) || 0) > 0) {
                    next[f] = { ...next[f], batchNumber: val };
                }
            });
            return next;
        });
    }, []);

    const handleBatchNumberChange = useCallback((flavour, batchVal) => {
        setProjectionMatrix(prev => {
            if (!prev[flavour]) return prev;
            return {
                ...prev,
                [flavour]: { ...prev[flavour], batchNumber: batchVal }
            };
        });
    }, []);

    const handleReset = useCallback(() => {
        setEditingPlan(null);
        setTargetBatchNo('');
        setProjectionMatrix(prev => {
            const resetMatrix = { ...prev };
            Object.keys(resetMatrix).forEach(f => {
                resetMatrix[f] = { ...resetMatrix[f], production: 0, batchNumber: '' };
            });
            return resetMatrix;
        });
    }, []);

    const handleCancelEdit = useCallback(() => {
        setEditingPlan(null);
        setTargetBatchNo('');
        setProjectionMatrix(prev => {
            const resetMatrix = { ...prev };
            Object.keys(resetMatrix).forEach(f => {
                resetMatrix[f] = { ...resetMatrix[f], production: 0, batchNumber: '' };
            });
            return resetMatrix;
        });
    }, []);

    const handleAddSurplusFlavour = useCallback((flavourObj) => {
        if (!flavourObj) return;
        const rawObj = flavourObj.raw || flavourObj;
        const fCode = rawObj.code || flavourObj.code;
        const fName = rawObj.name || flavourObj.name;
        if (!fName && !fCode) return;

        // Lookup in masterFlavours list to ensure latest live balances
        const masterMatch = masterFlavours.find(mf =>
            (fCode && mf.code?.toLowerCase() === fCode.toLowerCase()) ||
            (fName && mf.name?.toLowerCase() === fName.toLowerCase())
        );

        const targetName = masterMatch ? masterMatch.name : (fName || fCode);
        const targetCode = masterMatch ? masterMatch.code : (fCode || fName);
        const factoryStock = masterMatch ? (masterMatch.factoryStock || 0) : (rawObj.factoryStock || 0);
        const coldRoomStock = masterMatch ? (masterMatch.coldRoomStock || 0) : (rawObj.coldRoomStock || 0);
        const inProcess = masterMatch ? (masterMatch.inProcessStock || masterMatch.inProcessQuantity || 0) : (rawObj.inProcessQuantity || rawObj.inProcessStock || 0);

        setProjectionMatrix(prev => {
            if (prev[targetName]) {
                return {
                    ...prev,
                    [targetName]: {
                        ...prev[targetName],
                        opening: prev[targetName].opening !== undefined && prev[targetName].opening !== 0 ? prev[targetName].opening : factoryStock,
                        coldRoomStock: prev[targetName].coldRoomStock !== undefined && prev[targetName].coldRoomStock !== 0 ? prev[targetName].coldRoomStock : coldRoomStock,
                        inProcess: prev[targetName].inProcess !== undefined && prev[targetName].inProcess !== 0 ? prev[targetName].inProcess : inProcess,
                        isSurplus: true,
                        batchNumber: prev[targetName].batchNumber || targetBatchNo || ''
                    }
                };
            }
            return {
                ...prev,
                [targetName]: {
                    code: targetCode,
                    opening: factoryStock,
                    coldRoomStock: coldRoomStock,
                    inProcess: inProcess,
                    orderVol: 0,
                    production: 0,
                    batchNumber: targetBatchNo || '',
                    isSurplus: true
                }
            };
        });
    }, [masterFlavours, targetBatchNo]);

    const handleRemoveSurplusFlavour = useCallback((flavourName) => {
        setProjectionMatrix(prev => {
            if (!prev[flavourName]) return prev;
            if (Number(prev[flavourName].orderVol) <= 0) {
                const next = { ...prev };
                delete next[flavourName];
                return next;
            }
            return {
                ...prev,
                [flavourName]: {
                    ...prev[flavourName],
                    production: 0,
                    batchNumber: '',
                    isSurplus: false
                }
            };
        });
    }, []);

    const handleActualProductionChange = useCallback((batchKey, flavourName, value) => {
        setBlueprintData(prev => {
            const updatedBlueprint = { ...prev };
            if (updatedBlueprint[batchKey] && updatedBlueprint[batchKey].flavours[flavourName]) {
                const item = updatedBlueprint[batchKey].flavours[flavourName];
                const numericVal = value === '' ? '' : Number(value);
                item.actualProduction = numericVal;
                item.coldRoomTransfer = numericVal;
            }
            return updatedBlueprint;
        });
    }, []);

    const handleColdRoomTransferChange = useCallback((batchKey, flavourName, value) => {
        setBlueprintData(prev => {
            const updatedBlueprint = { ...prev };
            if (updatedBlueprint[batchKey] && updatedBlueprint[batchKey].flavours[flavourName]) {
                updatedBlueprint[batchKey].flavours[flavourName].coldRoomTransfer = value === '' ? '' : Number(value);
            }
            return updatedBlueprint;
        });
    }, []);

    const handleMoveAllToColdRoom = useCallback((batchKey, checked) => {
        setBlueprintData(prev => {
            const updatedBlueprint = { ...prev };
            if (updatedBlueprint[batchKey] && updatedBlueprint[batchKey].flavours) {
                Object.keys(updatedBlueprint[batchKey].flavours).forEach(f => {
                    const item = updatedBlueprint[batchKey].flavours[f];
                    if (checked) {
                        const actual = item.actualProduction !== undefined && item.actualProduction !== null ? item.actualProduction : (item.production || 0);
                        item.coldRoomTransfer = actual;
                    } else {
                        item.coldRoomTransfer = 0;
                    }
                });
            }
            return updatedBlueprint;
        });
    }, []);

    const handleGeneratePlan = useCallback(async () => {
        const itemsPayload = [];
        let hasActiveFlavors = false;
        const missingBatchFlavours = [];

        Object.keys(projectionMatrix).forEach(f => {
            const data = projectionMatrix[f];
            const targetProd = Number(data.production) || 0;
            if (targetProd > 0) {
                hasActiveFlavors = true;
                const rowBatch = data.batchNumber ? String(data.batchNumber).trim() : (targetBatchNo ? String(targetBatchNo).trim() : '');
                if (!rowBatch) {
                    missingBatchFlavours.push(f);
                } else {
                    itemsPayload.push({
                        flavourCode: data.code || f.substring(0, 2).toUpperCase(),
                        targetProduction: targetProd,
                        batchNumber: rowBatch
                    });
                }
            }
        });

        if (!hasActiveFlavors) {
            return alert("Please enter production quantities (>0) for at least one flavour.");
        }

        if (missingBatchFlavours.length > 0) {
            return alert(`Please specify a valid Batch Number for: ${missingBatchFlavours.join(', ')}`);
        }

        try {
            if (editingPlan && editingPlan.planId) {
                // Update existing blueprint preserving batch number
                await updateProductionPlanApi(editingPlan.planId, {
                    planId: editingPlan.planId,
                    batchNumber: editingPlan.batchNumber,
                    items: itemsPayload
                });
                setEditingPlan(null);
            } else {
                const payload = {
                    batchNumber: targetBatchNo || undefined,
                    items: itemsPayload
                };
                const res = await generatePlanApi(payload);
                // Auto-expand the newly generated plans
                if (Array.isArray(res)) {
                    const expanded = {};
                    res.forEach(p => {
                        if (p.batchNumber) expanded[p.batchNumber] = true;
                    });
                    setExpandedBlueprints(prev => ({ ...prev, ...expanded }));
                }
            }
            
            // Reset projection production matrix and target batch
            setTargetBatchNo('');
            setProjectionMatrix(prev => {
                const next = { ...prev };
                Object.keys(next).forEach(k => {
                    next[k] = { ...next[k], production: 0, batchNumber: '' };
                });
                return next;
            });

            await loadBackendData();
            
        } catch (err) {
            console.error("Backend generatePlan error:", err);
            alert(err.message || "Error: Failed to save/update production plan in database.");
        }
    }, [projectionMatrix, targetBatchNo, editingPlan, loadBackendData]);

    const handleUpdateBatchStatus = useCallback(async (batchKey, newStatus) => {
        const batchObj = blueprintData[batchKey];
        if (!batchObj || !batchObj.planId) return;

        try {
            const itemsPayload = [];
            Object.keys(batchObj.flavours).forEach(fName => {
                const item = batchObj.flavours[fName];
                if (item) {
                    itemsPayload.push({
                        flavourCode: item.flavourCode || allFlavors.find(fl => fl.name === fName)?.code || '',
                        targetProduction: item.production || 0,
                        actualProduction: item.actualProduction !== undefined && item.actualProduction !== '' ? Number(item.actualProduction) : (item.production || 0),
                        coldRoomTransfer: item.coldRoomTransfer !== undefined && item.coldRoomTransfer !== '' ? Number(item.coldRoomTransfer) : 
                                          (item.actualProduction !== undefined && item.actualProduction !== '' ? Number(item.actualProduction) : (item.production || 0))
                    });
                }
            });

            await updatePlanStatusApi(batchObj.planId, newStatus, itemsPayload);
            await loadBackendData();
        } catch (err) {
            console.error("Backend status update error:", err);
            alert("Error: Failed to update batch status in database.");
        }
    }, [blueprintData, allFlavors, loadBackendData]);

    const handleDeleteBlueprint = useCallback(async (batchKey) => {
        const batchObj = blueprintData[batchKey];
        if (!batchObj || !batchObj.planId) return;

        if (!window.confirm(`Are you sure you want to delete blueprint for batch '${batchKey}'?`)) return;

        try {
            await deletePlanApi(batchObj.planId);
            await loadBackendData();
        } catch (err) {
            console.error("Backend deletePlan error:", err);
            alert("Error: Failed to delete blueprint from database.");
        }
    }, [blueprintData, loadBackendData]);

    const handleEditMatrix = useCallback((batchKey) => {
        const batchObj = blueprintData[batchKey];
        if (!batchObj) return;

        setEditingPlan({
            planId: batchObj.planId,
            batchNumber: batchObj.batchNumber
        });

        setAccordions(prev => ({ ...prev, projection: true }));
        window.scrollTo({ top: 0, behavior: 'smooth' });

        setProjectionMatrix(prev => {
            const updated = { ...prev };
            Object.keys(updated).forEach(f => {
                updated[f] = { ...updated[f], production: 0 };
            });
            if (batchObj.flavours) {
                Object.keys(batchObj.flavours).forEach(fName => {
                    if (updated[fName]) {
                        updated[fName].production = batchObj.flavours[fName].production || 0;
                    }
                });
            }
            return updated;
        });
    }, [blueprintData]);

    const totals = useMemo(() => {
        let totalOpen = 0;
        let totalOrder = 0;
        let totalClose = 0;
        let totalProd = 0;

        Object.keys(projectionMatrix).forEach(f => {
            const data = projectionMatrix[f];
            if (!data) return;
            const coldRoom = Number(data.coldRoomStock) || 0;
            const inProc = Number(data.inProcess) || 0;
            const orderVol = Number(data.orderVol) || 0;
            const production = Number(data.production) || 0;
            const isShortfall = (coldRoom + inProc) < orderVol;

            if (data.isSurplus || isShortfall || production > 0) {
                const opening = (data.opening || 0) + coldRoom + inProc;
                const closing = opening + production - orderVol;

                totalOpen += opening;
                totalOrder += orderVol;
                totalClose += closing;
                totalProd += production;
            }
        });

        return {
            totalOpen,
            totalOrder,
            totalClose,
            totalProd,
            totalOpenDol: Math.floor(totalOpen / 3),
            totalOrderDol: Math.floor(totalOrder / 3),
            totalCloseDol: Math.floor(totalClose / 3),
            totalProdDol: Math.floor(totalProd / 3)
        };
    }, [projectionMatrix]);

    return (
        <div className="container">
            <div className="page-head">
                <div>
                    <div className="crumb">Factory Module</div>
                    <h1>Production Planning</h1>
                </div>
            </div>

            <ProjectionSection
                isOpen={accordions.projection}
                toggleAccordion={toggleAccordion}
                projectionMatrix={projectionMatrix}
                allFlavors={allFlavors}
                masterFlavours={masterFlavours}
                totals={totals}
                handleProductionChange={handleProductionChange}
                targetBatchNo={targetBatchNo}
                handleTargetBatchChange={handleTargetBatchChange}
                handleBatchNumberChange={handleBatchNumberChange}
                handleAddSurplusFlavour={handleAddSurplusFlavour}
                handleRemoveSurplusFlavour={handleRemoveSurplusFlavour}
                allBatches={allBatches}
                availableBatches={availableBatches}
                handleGeneratePlan={handleGeneratePlan}
                handleReset={handleReset}
                editingPlan={editingPlan}
                handleCancelEdit={handleCancelEdit}
            />

            <BlueprintSection
                isOpen={accordions.blueprint}
                toggleAccordion={toggleAccordion}
                plannedBatches={blueprintData}
                expandedBatches={expandedBlueprints}
                batches={allBatches}
                toggleBatchBand={toggleBatchBand}
                handleEditMatrix={handleEditMatrix}
                handleDeleteBlueprint={handleDeleteBlueprint}
                handleActualProductionChange={handleActualProductionChange}
                handleColdRoomTransferChange={handleColdRoomTransferChange}
                handleMoveAllToColdRoom={handleMoveAllToColdRoom}
                handleBatchComplete={handleUpdateBatchStatus}
            />
        </div>
    );
}

export default ProductionPlanningPage;