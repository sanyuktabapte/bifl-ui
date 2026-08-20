import React, { useState, useEffect, useMemo } from 'react';
import { fetchPlans } from '../../../services/productionPlanningService';
import { fetchAllSaleOrders, fetchCompletedSalesApi } from '../../../services/saleService';
import { fetchAdminDashboard } from '../../../services/adminService';
import { fetchAllTransfers, deleteTransferApi } from '../../../services/internalTransferService';
import { fetchBatchesApi } from '../../../services/batchService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Import extracted components
import ProductionBatchesTab from './components/ProductionBatchesTab';
import StoreOrdersTab from './components/StoreOrdersTab';
import SalesTab from './components/SalesTab';
import InternalTransfersTab from './components/InternalTransfersTab';
import BatchesReportTab from './components/BatchesReportTab';
import InvoiceModal from './components/InvoiceModal';
import BatchDetailsModal from './components/BatchDetailsModal';
import TransferDetailsModal from './components/TransferDetailsModal';

function ReportsPage({ initialTab = 'production' }) {
    const [activeTab, setActiveTab] = useState(initialTab);
    const [productionPlans, setProductionPlans] = useState([]);
    const [storeOrders, setStoreOrders] = useState([]);
    const [completedSalesOrders, setCompletedSalesOrders] = useState([]);
    const [flavours, setFlavours] = useState([]);
    const [transfers, setTransfers] = useState([]);
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(false);

    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedSaleOrder, setSelectedSaleOrder] = useState(null);

    const [isViewBatchModalOpen, setIsViewBatchModalOpen] = useState(false);
    const [selectedBatchPlan, setSelectedBatchPlan] = useState(null);

    const [isViewTransferModalOpen, setIsViewTransferModalOpen] = useState(false);
    const [selectedTransfer, setSelectedTransfer] = useState(null);

    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

    const loadReportData = async () => {
        setLoading(true);
        try {
            const [plans, activeOrders, completedOrders, adminData, transferList, batchList] = await Promise.all([
                fetchPlans().catch(() => []),
                fetchAllSaleOrders().catch(() => []),
                fetchCompletedSalesApi().catch(() => []),
                fetchAdminDashboard().catch(() => null),
                fetchAllTransfers().catch(() => []),
                fetchBatchesApi().catch(() => [])
            ]);
            setProductionPlans(plans);
            setStoreOrders(activeOrders);
            setCompletedSalesOrders(completedOrders);
            setTransfers(transferList.sort((a, b) => b.id - a.id));
            setBatches(batchList || []);
            if (adminData && adminData.flavourList) {
                setFlavours(adminData.flavourList);
            }
        } catch (error) {
            console.error("Error loading report data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReportData();
    }, []);

    // Filtered lists
    const completedBatches = useMemo(() => {
        return productionPlans.filter(p => p.status === 'Completed');
    }, [productionPlans]);

    const readyOrders = useMemo(() => {
        return storeOrders.filter(o => o.status === 'Ready');
    }, [storeOrders]);

    const completedSales = useMemo(() => {
        return completedSalesOrders;
    }, [completedSalesOrders]);

    const handleViewSale = (order) => {
        setSelectedSaleOrder(order);
        setIsViewModalOpen(true);
    };

    const handleViewBatch = (plan) => {
        setSelectedBatchPlan(plan);
        setIsViewBatchModalOpen(true);
    };

    const handleViewTransfer = (transfer) => {
        setSelectedTransfer(transfer);
        setIsViewTransferModalOpen(true);
    };

    const handleDownloadTransfer = (transfer) => {
        const doc = new jsPDF();
        doc.setFontSize(22);
        doc.text(`Internal Transfer Receipt`, 14, 22);

        doc.setFontSize(12);
        doc.text(`Transfer ID: ${transfer.id}`, 14, 32);
        doc.text(`Date: ${transfer.transferDate}`, 14, 38);
        doc.text(`Source: ${transfer.source}`, 14, 44);
        doc.text(`Destination: ${transfer.destination}`, 14, 50);
        doc.text(`Status: Completed`, 14, 56);

        const tableColumn = ["#", "Flavour", "Quantity (KG)"];
        const tableRows = [];
        let totalQty = 0;

        (transfer.items || []).forEach((item, index) => {
            const qty = item.quantity || 0;
            totalQty += qty;
            tableRows.push([index + 1, item.flavourName || item.flavourCode, qty]);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            foot: [
                [{ content: 'Total Volume', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } },
                { content: String(totalQty), styles: { fontStyle: 'bold' } }]
            ],
            startY: 65,
            showFoot: 'lastPage',
        });

        doc.save(`transfer-${transfer.id}.pdf`);
    };

    const handleDeleteTransfer = async (transferId) => {
        if (!window.confirm("Are you sure you want to delete this transfer? This will revert the physical stock quantities.")) return;
        try {
            await deleteTransferApi(transferId);
            await loadReportData();
        } catch (error) {
            console.error("Failed to delete transfer:", error);
            alert("Failed to delete transfer. It may have already been removed.");
        }
    };

    const handleDownloadBatch = (plan) => {
        const doc = new jsPDF();
        doc.setFontSize(22);
        doc.text(`Production Batch Report`, 14, 22);

        doc.setFontSize(12);
        doc.text(`Batch Number: ${plan.batchNumber}`, 14, 32);
        doc.text(`Plan Date: ${plan.planDate}`, 14, 38);
        doc.text(`Status: Completed`, 14, 44);

        const tableColumn = ["#", "Flavour", "Target (KG)", "Actual (KG)", "Cold Room (KG)", "Factory (KG)"];
        const tableRows = [];
        let totalTarget = 0;
        let totalActual = 0;
        let totalCold = 0;
        let totalFactory = 0;

        (plan.items || []).forEach((item, index) => {
            const flavourName = item.flavour?.name || 'NA';
            const target = item.targetProduction || 0;
            const actual = item.actualProduction != null ? item.actualProduction : target;
            const cold = item.coldRoomTransfer != null ? item.coldRoomTransfer : actual;
            const factory = Math.max(0, actual - cold);

            totalTarget += target;
            totalActual += actual;
            totalCold += cold;
            totalFactory += factory;

            const rowData = [index + 1, flavourName, target, actual, cold, factory];
            tableRows.push(rowData);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            theme: 'grid',
            headStyles: {
                fillColor: [30, 41, 59],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                halign: 'center'
            },
            styles: {
                fontSize: 9,
                cellPadding: 4,
                lineColor: [226, 232, 240],
                lineWidth: 0.1
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 12 },
                1: { halign: 'left', fontStyle: 'bold' },
                2: { halign: 'right', cellWidth: 28 },
                3: { halign: 'right', cellWidth: 28 },
                4: { halign: 'right', cellWidth: 32 },
                5: { halign: 'right', fontStyle: 'bold', cellWidth: 28 }
            },
            foot: [
                [{ content: 'Total', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } },
                { content: `${totalTarget} kg`, styles: { halign: 'right', fontStyle: 'bold' } },
                { content: `${totalActual} kg`, styles: { halign: 'right', fontStyle: 'bold' } },
                { content: `${totalCold} kg`, styles: { halign: 'right', fontStyle: 'bold' } },
                { content: `${totalFactory} kg`, styles: { halign: 'right', fontStyle: 'bold' } }]
            ],
            footStyles: {
                fillColor: [241, 245, 249],
                textColor: [15, 23, 42],
                fontStyle: 'bold'
            },
            startY: 50,
            showFoot: 'lastPage',
        });

        doc.save(`production-batch-${plan.batchNumber}.pdf`);
    };

    const handleDownloadSale = (order) => {
        const storeName = order.masterStore?.name || order.store || 'NA';
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.text('Tax Invoice / Sale Bill', 14, 22);

        doc.setFontSize(10);
        doc.text(`Order ID: ${order.orderId ? `SO-${order.orderId}` : `SO-${order.id}`}`, 14, 32);
        doc.text(`Store: ${storeName}`, 14, 38);
        doc.text(`Date: ${order.completedDate || order.orderDate || 'NA'}`, 14, 44);

        const tableColumn = ["#", "Flavour", "Quantity (KG)", "Dol", "Unit Price", "Total Amount"];
        const tableRows = [];
        let totalKg = 0;
        let totalDol = 0;
        let totalAmount = 0;

        (order.flavours || []).forEach((item, index) => {
            const flavour = flavours.find(f => f.name.toLowerCase() === item.flavourName?.toLowerCase() || f.code === item.flavourCode);
            const price = flavour?.price || 0;
            const quantity = parseFloat(item.orderQuantity) || 0;
            const dol = Math.floor(quantity / 3) || 0;
            const amount = quantity * price;

            totalKg += quantity;
            totalDol += dol;
            totalAmount += amount;

            const rowData = [index + 1, item.flavourName, `${quantity} kg`, `${dol} dol`, `Rs. ${price}`, `Rs. ${amount.toLocaleString()}`];
            tableRows.push(rowData);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            theme: 'grid',
            headStyles: {
                fillColor: [30, 41, 59],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                halign: 'center'
            },
            styles: {
                fontSize: 9,
                cellPadding: 4,
                lineColor: [226, 232, 240],
                lineWidth: 0.1
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 12 },
                1: { halign: 'left', fontStyle: 'bold' },
                2: { halign: 'right', cellWidth: 32 },
                3: { halign: 'right', cellWidth: 24 },
                4: { halign: 'right', cellWidth: 28 },
                5: { halign: 'right', fontStyle: 'bold', cellWidth: 35 }
            },
            foot: [
                [{ content: 'Grand Total', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } },
                { content: `${totalKg} kg`, styles: { halign: 'right', fontStyle: 'bold' } },
                { content: `${totalDol} dol`, styles: { halign: 'right', fontStyle: 'bold' } },
                { content: '', styles: { fontStyle: 'bold' } },
                { content: `Rs. ${totalAmount.toLocaleString()}`, styles: { halign: 'right', fontStyle: 'bold' } }]
            ],
            footStyles: {
                fillColor: [241, 245, 249],
                textColor: [15, 23, 42],
                fontStyle: 'bold'
            },
            startY: 50,
            showFoot: 'lastPage',
        });

        doc.save(`invoice-${order.orderId || order.id}.pdf`);
    };

    return (
        <div className="container">
            <div className="page-head">
                <div>
                    <div className="crumb">Factory Module</div>
                    <h1>Reports Dashboard</h1>
                </div>
                <button className="btn-ghost" onClick={loadReportData} disabled={loading}>
                    {loading ? 'Refreshing...' : '🔄 Refresh Data'}
                </button>
            </div>

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '1px solid var(--line)', paddingBottom: '8px' }}>
                <button
                    className={`btn-ghost ${activeTab === 'production' ? 'btn-primary' : ''}`}
                    onClick={() => setActiveTab('production')}
                    style={{ borderBottom: activeTab === 'production' ? '2px solid var(--blue)' : 'none', borderRadius: '4px 4px 0 0' }}
                >
                    Production Reports
                </button>
                <button
                    className={`btn-ghost ${activeTab === 'store-orders' ? 'btn-primary' : ''}`}
                    onClick={() => setActiveTab('store-orders')}
                    style={{ borderBottom: activeTab === 'store-orders' ? '2px solid var(--blue)' : 'none', borderRadius: '4px 4px 0 0' }}
                >
                    Store Order Reports (Ready)
                </button>
                <button
                    className={`btn-ghost ${activeTab === 'sales' ? 'btn-primary' : ''}`}
                    onClick={() => setActiveTab('sales')}
                    style={{ borderBottom: activeTab === 'sales' ? '2px solid var(--blue)' : 'none', borderRadius: '4px 4px 0 0' }}
                >
                    Sale Completed Reports
                </button>
                <button
                    className={`btn-ghost ${activeTab === 'internal-transfers' ? 'btn-primary' : ''}`}
                    onClick={() => setActiveTab('internal-transfers')}
                    style={{ borderBottom: activeTab === 'internal-transfers' ? '2px solid var(--blue)' : 'none', borderRadius: '4px 4px 0 0' }}
                >
                    Internal Transfers
                </button>
                <button
                    className={`btn-ghost ${activeTab === 'batches' ? 'btn-primary' : ''}`}
                    onClick={() => setActiveTab('batches')}
                    style={{ borderBottom: activeTab === 'batches' ? '2px solid var(--blue)' : 'none', borderRadius: '4px 4px 0 0' }}
                >
                    Batches
                </button>
            </div>

            {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center' }}>Loading report data...</div>
            ) : (
                <>
                    {activeTab === 'production' && (
                        <ProductionBatchesTab
                            completedBatches={completedBatches}
                            handleViewBatch={handleViewBatch}
                            handleDownloadBatch={handleDownloadBatch}
                        />
                    )}

                    {activeTab === 'store-orders' && (
                        <StoreOrdersTab readyOrders={readyOrders} />
                    )}

                    {activeTab === 'sales' && (
                        <SalesTab
                            completedSales={completedSales}
                            handleViewSale={handleViewSale}
                            handleDownloadSale={handleDownloadSale}
                        />
                    )}

                    {activeTab === 'internal-transfers' && (
                        <InternalTransfersTab
                            transfers={transfers}
                            handleViewTransfer={handleViewTransfer}
                            handleDownloadTransfer={handleDownloadTransfer}
                            handleDeleteTransfer={handleDeleteTransfer}
                        />
                    )}

                    {activeTab === 'batches' && (
                        <BatchesReportTab
                            batches={batches}
                        />
                    )}
                </>
            )}

            <InvoiceModal
                isOpen={isViewModalOpen}
                order={selectedSaleOrder}
                flavours={flavours}
                onClose={() => setIsViewModalOpen(false)}
                onDownload={handleDownloadSale}
            />

            <BatchDetailsModal
                isOpen={isViewBatchModalOpen}
                plan={selectedBatchPlan}
                onClose={() => setIsViewBatchModalOpen(false)}
                onDownload={handleDownloadBatch}
            />

            <TransferDetailsModal
                isOpen={isViewTransferModalOpen}
                transfer={selectedTransfer}
                onClose={() => setIsViewTransferModalOpen(false)}
                onDownload={handleDownloadTransfer}
            />
        </div>
    );
}

export default ReportsPage;
