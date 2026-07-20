import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { storeOrders, masterFlavourList as initialFlavourList, pendingOrdersList, processingBatchList, completedBatchList as initialCompletedBatches, planBlueprintList, masterStoreList } from '../../../assets/mockData';
import ProjectionSection from './ProjectionSection';
import BlueprintSection from './BlueprintSection';
import CompletedBatchesSection from './CompletedBatchesSection';

function ProductionPlanningPage() {
    const [masterFlavourList, setMasterFlavourList] = useState(initialFlavourList);
    const [accordions, setAccordions] = useState({ projection: true, blueprint: true, completed: true });
    const [projectionMatrix, setProjectionMatrix] = useState({});
    const [batchNumberInput, setBatchNumberInput] = useState('');
    const [expandedBlueprints, setExpandedBlueprints] = useState({});
    const [blueprintData, setBlueprintData] = useState(() => {
        const initialBlueprints = {};
        processingBatchList.forEach(batch => {
            const flavours = {};
            batch.flavourList.forEach(flavour => {
                flavours[flavour.name] = {
                    production: flavour.orderQuantity, // Assuming orderQuantity is the target production
                    actualProduction: flavour.orderQuantity, // Pre-fill with target
                    status: 'Processing'
                };
            });
            initialBlueprints[batch.batch] = { processingDate: batch.processingDate, flavours: flavours };
        });
        return initialBlueprints;
    });
    const [productionOrders, setProductionOrders] = useState(pendingOrdersList);
    const [completedBatchList, setCompletedBatchList] = useState(initialCompletedBatches);

    const allFlavors = useMemo(() => masterFlavourList.map(f => f.name), []);

    const calculateAndSetProjection = useCallback(() => {
        // 1. Initialize matrix from flavourList, using openingStock
        const matrix = {};
        masterFlavourList.forEach(flavour => {
            matrix[flavour.name] = {
                opening: flavour.stock,
                orderVol: 0, // Initialize order volume to 0
                production: 0,
                status: 'Not-Pending' // Default status
            };
        });

        // 2. Aggregate pending orders from pendingOrdersList
        pendingOrdersList.forEach(order => {
            if (order.status === 'Pending' && matrix[order.name]) {
                matrix[order.name].orderVol += order.orderQuantity;
                matrix[order.name].status = 'Pending';
            }
        });

        setProjectionMatrix(matrix);
    }, [masterFlavourList]);

    // Compute projection matrix from Pending store orders on initial mount
    useEffect(() => {
        calculateAndSetProjection();
    }, [calculateAndSetProjection]);

    const toggleAccordion = useCallback((accordionKey) => {
        setAccordions(prev => ({
            ...prev,
            [accordionKey]: !prev[accordionKey]
        }));
    }, []);

    const toggleBatchBand = useCallback((bNo) => setExpandedBlueprints(prev => ({ ...prev, [bNo]: !prev[bNo] })), []);

    const handleProductionChange = useCallback((flavor, val) => {
        const numVal = parseFloat(val) || 0;
        setProjectionMatrix(prev => ({ ...prev, [flavor]: { ...prev[flavor], production: numVal } }));
    }, []);

    const handleActualProductionChange = useCallback((batchNo, flavour, value) => {
        const numValue = parseFloat(value) || 0;
        setBlueprintData(prev => {
            const updatedBlueprint = { ...prev };
            if (updatedBlueprint[batchNo] && updatedBlueprint[batchNo].flavours[flavour]) {
                updatedBlueprint[batchNo].flavours[flavour].actualProduction = numValue;
            }
            return updatedBlueprint;
        });
    }, []);

    const handleGeneratePlan = useCallback(() => {
        const trimmedBatch = batchNumberInput.trim();
        if (!trimmedBatch) return alert("Error: Please provide a valid Batch Number!");

        const flavoursData = {};
        let hasActiveFlavors = false;
        Object.keys(projectionMatrix).forEach(f => {
            const data = projectionMatrix[f];
            if (data && data.production > 0) { // Only include flavors with a production quantity
                flavoursData[f] = {
                    production: data.production,
                    actualProduction: 0, // Default actual to 0
                    status: 'Processing'
                };
                hasActiveFlavors = true;
            }
        });

        if (!hasActiveFlavors) return alert("No active flavors to generate a blueprint!");

        setBlueprintData(prev => ({ ...prev, [trimmedBatch]: { processingDate: new Date().toISOString().split('T')[0], flavours: flavoursData } }));

        setAccordions(prev => ({ ...prev, projection: false, blueprint: true }));
        setBatchNumberInput('');

        // Update order statuses from 'Pending' to 'Processing'
        setProductionOrders(prevOrders =>
            prevOrders.map(order =>
                order.status === 'Pending' ? { ...order, status: 'Processing' } : order
            )
        );
    }, [batchNumberInput, projectionMatrix, productionOrders]);

    const handleEditMatrix = useCallback((bNo) => {
        const targetedBatch = blueprintData[bNo]?.flavours;
        if (!targetedBatch) return;

        // Create a clean projection matrix for editing, showing only the blueprint's flavors.
        setProjectionMatrix(prev => {
            const matrix = { ...prev };
            // For each flavor in the matrix
            Object.keys(matrix).forEach(flavourName => {
                // Reset order volume to hide pending orders during edit
                matrix[flavourName].orderVol = 0;

                // Set production quantity if it exists in the blueprint, otherwise reset to 0
                if (targetedBatch[flavourName]) {
                    matrix[flavourName].production = targetedBatch[flavourName].production || 0;
                } else {
                    matrix[flavourName].production = 0;
                }
            });
            return matrix;
        });

        setBatchNumberInput(bNo);
        setAccordions(prev => ({ ...prev, projection: true, blueprint: false }));
    }, [blueprintData, projectionMatrix]);

    const handleBatchComplete = useCallback((batchNo) => {
        const batchToComplete = blueprintData[batchNo];
        if (!batchToComplete) return;

        // 1. Simulate backend call
        const payload = {
            batch: batchNo,
            completedDate: new Date().toISOString().split('T')[0],
            status: "Completed",
            flavourList: Object.entries(batchToComplete.flavours).map(([name, details]) => ({
                name,
                orderQuantity: details.actualProduction || 0
            }))
        };
        console.log("Backend Payload for Batch Completion:", payload);

        // 2. Update master flavour list stock
        setMasterFlavourList(prevFlavours => {
            const updatedFlavours = prevFlavours.map(flavour => {
                const batchFlavourDetails = batchToComplete.flavours[flavour.name];
                if (batchFlavourDetails) {
                    return {
                        ...flavour,
                        stock: flavour.stock + (batchFlavourDetails.actualProduction || 0)
                    };
                }
                return flavour;
            });
            return updatedFlavours;
        });

        // 3. Move batch from processing to completed
        const newCompletedBatch = {
            batch: batchNo,
            completedDate: payload.completedDate,
            status: "Completed",
            flavourList: payload.flavourList
        };

        setCompletedBatchList(prev => [newCompletedBatch, ...prev]);
        setBlueprintData(prev => {
            const { [batchNo]: _, ...rest } = prev;
            return rest;
        });
    }, [blueprintData]);

    const totals = useMemo(() => {
        const totals = {
            totalOpen: 0, totalOrder: 0, totalProd: 0, totalClose: 0,
            totalOpenDol: 0, totalOrderDol: 0, totalProdDol: 0, totalCloseDol: 0
        };
        if (!projectionMatrix) return totals;

        allFlavors.forEach(f => {
            const data = projectionMatrix[f] || {};
            if (data && (data.orderVol > 0 || data.production > 0)) {
                const opening = data.opening || 0;
                const orderVol = data.orderVol || 0;
                const production = data.production || 0;
                const closing = opening - orderVol + production;

                totals.totalOpen += opening;
                totals.totalOrder += orderVol;
                totals.totalProd += production;
                totals.totalClose += closing;

                totals.totalOpenDol += Math.floor(opening / 3);
                totals.totalOrderDol += Math.floor(orderVol / 3);
                totals.totalProdDol += Math.floor(production / 3);
                totals.totalCloseDol += Math.floor(closing / 3);
            }
        });
        return totals;
    }, [projectionMatrix, allFlavors]);

    const handleResetProjection = useCallback(() => {
        calculateAndSetProjection();
        // In a real app, you might refetch or reset to original mock data
        // For now, this just recalculates based on the current state
        setBatchNumberInput('');
        // To truly reset, we'd need to reset the productionOrders state
        // setProductionOrders(storeOrders);
    }, [calculateAndSetProjection]);

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
                handleReset={handleResetProjection}
            />

            <BlueprintSection
                isOpen={accordions.blueprint}
                toggleAccordion={toggleAccordion}
                plannedBatches={blueprintData}
                expandedBatches={expandedBlueprints}
                toggleBatchBand={toggleBatchBand}
                handleEditMatrix={handleEditMatrix}
                handleDeleteBlueprint={() => { }} // Placeholder
                handleActualProductionChange={handleActualProductionChange}
                handleBatchComplete={handleBatchComplete}
            />

            <CompletedBatchesSection
                isOpen={accordions.completed}
                toggleAccordion={toggleAccordion}
                completedBatches={completedBatchList}
                expandedBatches={expandedBlueprints}
                toggleBatchBand={toggleBatchBand}
            />
        </div>
    );
}

export default ProductionPlanningPage;