import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ProjectionSection from './ProjectionSection';
import BlueprintSection from './BlueprintSection';
import { fetchProjection, fetchPlans, generatePlanApi, updatePlanStatusApi, deletePlanApi, updateItemBatchNumberApi } from '../../../services/productionPlanningService';

function ProductionPlanningPage() {
    const [masterFlavourList, setMasterFlavourList] = useState([]);
    const [accordions, setAccordions] = useState({ projection: true, blueprint: true, completed: true });
    const [projectionMatrix, setProjectionMatrix] = useState({});
    const [batchNumberInput, setBatchNumberInput] = useState('');
    const [expandedBlueprints, setExpandedBlueprints] = useState({});
    const [blueprintData, setBlueprintData] = useState({});
    const [completedBatchList, setCompletedBatchList] = useState([]);
    const [planIdMap, setPlanIdMap] = useState({});
    const isExistingPlan = false;

    const allFlavors = useMemo(() => masterFlavourList.map(f => f.name), [masterFlavourList]);

    // Load Projections & Plans from backend
    const loadBackendData = useCallback(async () => {
        try {
            const [projections, plans] = await Promise.all([
                fetchProjection().catch(() => null),
                fetchPlans().catch(() => null)
            ]);

            if (projections !== null) {
                // Pre-populate projection matrix from master list and pending orders
                const matrix = {};
                projections.forEach(item => {
                    matrix[item.flavourName] = {
                        code: item.flavourCode,
                        opening: item.factoryStock || 0,
                        coldRoomStock: item.coldRoomStock || 0,
                        orderVol: item.orderQuantity || 0,
                        production: 0
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
                    const dateKey = plan.planDate || new Date().toISOString().split('T')[0];

                    if (plan.status === 'Scheduled' || plan.status === 'In Production' || plan.status === 'Processing') {
                        if (!blueprints[dateKey]) {
                            blueprints[dateKey] = {
                                id: dateKey,
                                batchNumber: plan.batchNumber, // Fallback/default batch number representation
                                processingDate: dateKey,
                                flavours: {},
                                planIds: [],
                                status: plan.status
                            };
                        }
                        
                        blueprints[dateKey].planIds.push(plan.id);

                        if (plan.items) {
                            plan.items.forEach(item => {
                                const name = item.flavour?.name || item.flavourCode;
                                blueprints[dateKey].flavours[name] = {
                                    id: item.id,
                                    flavourCode: item.flavour?.code,
                                    production: (blueprints[dateKey].flavours[name]?.production || 0) + (item.targetProduction || 0),
                                    actualProduction: (blueprints[dateKey].flavours[name]?.actualProduction || 0) + (item.actualProduction !== undefined && item.actualProduction !== null ? item.actualProduction : (item.targetProduction || 0)),
                                    coldRoomTransfer: blueprints[dateKey].flavours[name]?.coldRoomTransfer !== undefined && blueprints[dateKey].flavours[name]?.coldRoomTransfer !== null ?
                                                      ((blueprints[dateKey].flavours[name]?.coldRoomTransfer || 0) + item.coldRoomTransfer) : 
                                                      ((blueprints[dateKey].flavours[name]?.actualProduction || 0) + (item.actualProduction !== undefined && item.actualProduction !== null ? item.actualProduction : (item.targetProduction || 0))),
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
                setCompletedBatchList(completedList);
                setPlanIdMap(idMapping);
            } else {
                setBlueprintData({});
                setCompletedBatchList([]);
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

    const toggleBatchBand = useCallback((dateKey) => setExpandedBlueprints(prev => ({ ...prev, [dateKey]: !prev[dateKey] })), []);

    const handleProductionChange = useCallback((flavor, val) => {
        const numVal = parseFloat(val) || 0;
        setProjectionMatrix(prev => ({ ...prev, [flavor]: { ...prev[flavor], production: numVal } }));
    }, []);

    const handleActualProductionChange = useCallback((dateKey, flavour, value) => {
        const numValue = parseFloat(value) || 0;
        setBlueprintData(prev => {
            const updatedBlueprint = { ...prev };
            if (updatedBlueprint[dateKey] && updatedBlueprint[dateKey].flavours[flavour]) {
                updatedBlueprint[dateKey].flavours[flavour].actualProduction = numValue;
            }
            return updatedBlueprint;
        });
    }, []);

    const handleColdRoomTransferChange = useCallback((dateKey, flavour, value) => {
        const numValue = parseFloat(value) || 0;
        setBlueprintData(prev => {
            const updatedBlueprint = { ...prev };
            if (updatedBlueprint[dateKey] && updatedBlueprint[dateKey].flavours[flavour]) {
                updatedBlueprint[dateKey].flavours[flavour].coldRoomTransfer = numValue;
            }
            return updatedBlueprint;
        });
    }, []);

    const handleMoveAllToColdRoom = useCallback((dateKey, shouldMoveAll) => {
        setBlueprintData(prev => {
            const updatedBlueprint = { ...prev };
            const dateObj = updatedBlueprint[dateKey];
            if (dateObj && dateObj.flavours) {
                Object.keys(dateObj.flavours).forEach(f => {
                    const item = dateObj.flavours[f];
                    if (item) {
                        const actual = item.actualProduction !== undefined && item.actualProduction !== null ? item.actualProduction : item.production;
                        item.coldRoomTransfer = shouldMoveAll ? actual : 0;
                    }
                });
            }
            return updatedBlueprint;
        });
    }, []);

    const handleGeneratePlan = useCallback(async () => {
        const trimmedBatch = batchNumberInput.trim() || 'NA';

        const itemsPayload = [];
        let hasActiveFlavors = false;

        Object.keys(projectionMatrix).forEach(f => {
            const data = projectionMatrix[f];
            const targetProd = Number(data.production) || 0;
            if (targetProd > 0) {
                hasActiveFlavors = true;
                itemsPayload.push({
                    flavourCode: data.code || f.substring(0, 2).toUpperCase(),
                    targetProduction: targetProd
                });
            }
        });

        if (!hasActiveFlavors) {
            return alert("Please enter production quantities (>0) for at least one flavour.");
        }

        const payload = {
            batchNumber: trimmedBatch,
            items: itemsPayload
        };

        try {
            await generatePlanApi(payload);
            setBatchNumberInput('');
            await loadBackendData();
            
            // Auto-expand the newly generated plan's batch band
            const newPlanDate = new Date().toISOString().split('T')[0];
            setExpandedBlueprints(prev => ({ ...prev, [newPlanDate]: true }));
            
        } catch (err) {
            console.error("Backend generatePlan error:", err);
            alert("Error: Failed to generate production plan in database.");
        }
    }, [batchNumberInput, projectionMatrix, loadBackendData]);

    const handleUpdateBatchStatus = useCallback(async (dateKey, newStatus) => {
        const dateObj = blueprintData[dateKey];
        if (!dateObj || !dateObj.planIds || dateObj.planIds.length === 0) return;

        try {
            for (const dbPlanId of dateObj.planIds) {
                const itemsPayload = [];
                Object.keys(dateObj.flavours).forEach(fName => {
                    const item = dateObj.flavours[fName];
                    if (item && item.planId === dbPlanId) {
                        itemsPayload.push({
                            flavourCode: item.flavourCode || allFlavors.find(fl => fl.name === fName)?.code || '',
                            targetProduction: item.production || 0,
                            actualProduction: item.actualProduction !== undefined && item.actualProduction !== '' ? Number(item.actualProduction) : (item.production || 0),
                            coldRoomTransfer: item.coldRoomTransfer !== undefined && item.coldRoomTransfer !== '' ? Number(item.coldRoomTransfer) : 
                                              (item.actualProduction !== undefined && item.actualProduction !== '' ? Number(item.actualProduction) : (item.production || 0))
                        });
                    }
                });

                await updatePlanStatusApi(dbPlanId, newStatus, itemsPayload);
            }
            await loadBackendData();
        } catch (err) {
            console.error("Backend status update error:", err);
            alert("Error: Failed to update batch status in database.");
        }
    }, [blueprintData, allFlavors, loadBackendData]);

    const handleDeleteBlueprint = useCallback(async (dateKey) => {
        const dateObj = blueprintData[dateKey];
        if (!dateObj || !dateObj.planIds || dateObj.planIds.length === 0) return;

        if (!window.confirm(`Are you sure you want to delete all plan blueprints for date '${dateKey}'?`)) return;

        try {
            for (const dbPlanId of dateObj.planIds) {
                await deletePlanApi(dbPlanId);
            }
            await loadBackendData();
        } catch (err) {
            console.error("Backend deletePlan error:", err);
            alert("Error: Failed to delete blueprint from database.");
        }
    }, [blueprintData, loadBackendData]);

    const handleEditMatrix = useCallback((dateKey) => {
        const dateObj = blueprintData[dateKey];
        if (!dateObj) return;

        const firstBatchNo = Object.values(dateObj.flavours)[0]?.batchNumber || '';
        setBatchNumberInput(firstBatchNo);

        setProjectionMatrix(prev => {
            const updated = { ...prev };
            Object.keys(updated).forEach(f => {
                updated[f] = { ...updated[f], production: 0 };
            });
            if (dateObj.flavours) {
                Object.keys(dateObj.flavours).forEach(fName => {
                    if (updated[fName]) {
                        updated[fName].production = dateObj.flavours[fName].production || 0;
                    }
                });
            }
            return updated;
        });
    }, [blueprintData]);

    const handleBatchNumberChange = useCallback(async (itemId, oldBatchNo, newBatchNumber) => {
        try {
            await updateItemBatchNumberApi(itemId, oldBatchNo, newBatchNumber);
            await loadBackendData();
        } catch (err) {
            console.error("Backend updateItemBatchNumber error:", err);
        }
    }, [loadBackendData]);

    const handleReset = useCallback(() => {
        setBatchNumberInput('');
        loadBackendData();
    }, [loadBackendData]);



    const totals = useMemo(() => {
        let totalOpen = 0;
        let totalOrder = 0;
        let totalClose = 0;
        let totalProd = 0;

        Object.keys(projectionMatrix).forEach(f => {
            const data = projectionMatrix[f];
            const opening = (data.opening || 0) + (data.coldRoomStock || 0);
            const orderVol = data.orderVol || 0;
            const production = data.production || 0;
            const closing = opening + production - orderVol;

            totalOpen += opening;
            totalOrder += orderVol;
            totalClose += closing;
            totalProd += production;
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
                totals={totals}
                handleProductionChange={handleProductionChange}
                batchNumberInput={batchNumberInput}
                setBatchNumberInput={setBatchNumberInput}
                handleGeneratePlan={handleGeneratePlan}
                handleReset={handleReset}
                isExistingPlan={isExistingPlan}
            />

            <BlueprintSection
                isOpen={accordions.blueprint}
                toggleAccordion={toggleAccordion}
                plannedBatches={blueprintData}
                expandedBatches={expandedBlueprints}
                toggleBatchBand={toggleBatchBand}
                handleEditMatrix={handleEditMatrix}
                handleDeleteBlueprint={handleDeleteBlueprint}
                handleActualProductionChange={handleActualProductionChange}
                handleColdRoomTransferChange={handleColdRoomTransferChange}
                handleMoveAllToColdRoom={handleMoveAllToColdRoom}
                handleBatchComplete={handleUpdateBatchStatus}
                handleBatchNumberChange={handleBatchNumberChange}
            />
        </div>
    );
}

export default ProductionPlanningPage;