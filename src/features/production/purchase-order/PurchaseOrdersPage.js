import React, { useState, useMemo, useCallback } from 'react';
import { pendingOrdersList, masterFlavourList, processingBatchList, completedBatchList, masterStoreList } from '../../../assets/mockData';
import NewOrderModal from './NewOrderModal';
import ProcessingOrdersSection from './ProcessingOrdersSection';
import PendingOrdersSection from './PendingOrdersSection';
import CompletedOrdersSection from './CompletedOrdersSection';

function PurchaseOrdersPage() {
    const [orders, setOrders] = useState(pendingOrdersList);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditingPending, setIsEditingPending] = useState(false);
    const [accordions, setAccordions] = useState({ pending: true, processing: false, completedOrders: false });
    const toggleAccordion = useCallback((accordionKey) => {
        setAccordions(prev => ({
            pending: false,
            processing: false,
            completedOrders: false,
            [accordionKey]: !prev[accordionKey]
        }));
    }, []);

    const handleEditPending = useCallback(() => {
        setIsEditingPending(true);
        setIsModalOpen(true);
    }, []);

    const handleCloseModal = useCallback(() => {
        setIsModalOpen(false);
        setIsEditingPending(false);
    }, []);

    const handleSaveOrder = useCallback((newOrders) => {
        if (isEditingPending) {
            // Replace all pending orders with the new list from the modal
            setOrders(prevOrders => {
                const nonPending = prevOrders.filter(o => o.status !== 'Pending');
                return [...nonPending, ...newOrders];
            });
        } else {
            // Original logic for adding/updating orders
            setOrders(prevOrders => {
                const updatedOrders = [...prevOrders];

                newOrders.forEach(newOrder => {
                    const existingPendingOrderIndex = updatedOrders.findIndex(
                        order => order.id === newOrder.id && order.status === 'Pending'
                    );

                    if (existingPendingOrderIndex !== -1) {
                        // If a pending order for this flavor exists, update its quantity
                        const existingOrder = updatedOrders[existingPendingOrderIndex];
                        updatedOrders[existingPendingOrderIndex] = {
                            ...existingOrder,
                            orderQuantity: existingOrder.orderQuantity + newOrder.orderQuantity,
                        };
                    } else {
                        // Otherwise, add it as a new order
                        updatedOrders.push(newOrder);
                    }
                });
                return updatedOrders;
            });
        }
        handleCloseModal();
    }, [isEditingPending, handleCloseModal]);

    const pendingOrders = useMemo(() => orders.filter(o => o.status === 'Pending'), [orders]);

    return (
        <div className="container">
            <div className="page-head">
                <div>
                    <div className="crumb">Factory Module</div>
                    <h1>Purchase Orders</h1>
                </div>
                <button className="btn-primary" onClick={() => setIsModalOpen(true)}>+ Add New Order</button>
            </div>

            <PendingOrdersSection
                isOpen={accordions.pending}
                toggleAccordion={toggleAccordion}
                orders={pendingOrders}
                onEdit={handleEditPending}
            />

            <ProcessingOrdersSection
                isOpen={accordions.processing}
                toggleAccordion={toggleAccordion}
                processingBatches={processingBatchList}
            />

            <CompletedOrdersSection
                isOpen={accordions.completedOrders}
                toggleAccordion={toggleAccordion}
                completedBatches={completedBatchList}
            />

            <NewOrderModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSaveOrder}
                flavours={masterFlavourList}
                stores={masterStoreList}
                ordersToEdit={isEditingPending ? pendingOrders : null}
            />
        </div>
    );
}

export default PurchaseOrdersPage;