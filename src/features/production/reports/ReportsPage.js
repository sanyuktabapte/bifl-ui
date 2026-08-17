import React, { useState, useEffect, useMemo } from 'react';
import { fetchPlans } from '../../../services/productionPlanningService';
import { fetchAllSaleOrders } from '../../../services/saleService';
import { fetchAdminDashboard } from '../../../services/adminService';
import { fetchAllTransfers, deleteTransferApi } from '../../../services/internalTransferService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Import extracted components
import ProductionBatchesTab from './components/ProductionBatchesTab';
import StoreOrdersTab from './components/StoreOrdersTab';
import SalesTab from './components/SalesTab';
import InternalTransfersTab from './components/InternalTransfersTab';
import InvoiceModal from './components/InvoiceModal';
import BatchDetailsModal from './components/BatchDetailsModal';
import TransferDetailsModal from './components/TransferDetailsModal';

function ReportsPage({ initialTab = 'production' }) {
    const [activeTab, setActiveTab] = useState(initialTab);
    const [productionPlans, setProductionPlans] = useState([]);
    const [storeOrders, setStoreOrders] = useState([]);
    const [flavours, setFlavours] = useState([]);
    const [transfers, setTransfers] = useState([]);
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
            const [plans, orders, adminData, transferList] = await Promise.all([
                fetchPlans().catch(() => []),
                fetchAllSaleOrders().catch(() => []),
                fetchAdminDashboard().catch(() => null),
                fetchAllTransfers().catch(() => [])
            ]);
            setProductionPlans(plans);
            setStoreOrders(orders);
            setTransfers(transferList.sort((a, b) => b.id - a.id));
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
        return storeOrders.filter(o => o.status === 'Completed');
    }, [storeOrders]);

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
            foot: [
                [{ content: 'Total', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } },
                { content: String(totalTarget), styles: { fontStyle: 'bold' } },
                { content: String(totalActual), styles: { fontStyle: 'bold' } },
                { content: String(totalCold), styles: { fontStyle: 'bold' } },
                { content: String(totalFactory), styles: { fontStyle: 'bold' } }]
            ],
            startY: 50,
            showFoot: 'lastPage',
        });

        doc.save(`production-batch-${plan.batchNumber}.pdf`);
    };

    const handleDownloadSale = (order) => {
        const storeName = order.masterStore?.name || order.store || 'NA';
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.text('Invoice', 14, 22);

        doc.setFontSize(12);
        doc.text(`Order ID: ${order.orderId || order.id}`, 14, 32);
        doc.text(`Store: ${storeName}`, 14, 38);
        doc.text(`Date: ${order.completedDate || order.orderDate || 'NA'}`, 14, 44);

        const tableColumn = ["#", "Flavour", "KG", "Dol", "Price", "Amount"];
        const tableRows = [];
        let totalKg = 0;
        let totalDol = 0;
        let totalAmount = 0;

        (order.flavours || []).forEach((item, index) => {
            const flavour = flavours.find(f => f.name.toLowerCase() === item.flavourName.toLowerCase() || f.code === item.flavourCode);
            const price = flavour?.price || 0;
            const quantity = parseFloat(item.orderQuantity) || 0;
            const dole = Math.floor(quantity / 3) || 0;
            const amount = quantity * price;

            totalKg += quantity;
            totalDol += dole;
            totalAmount += amount;

            const rowData = [index + 1, item.flavourName, quantity, dole, price, amount.toLocaleString()];
            tableRows.push(rowData);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            foot: [
                [{ content: 'Total', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } },
                { content: String(totalKg), styles: { fontStyle: 'bold' } },
                { content: String(totalDol), styles: { fontStyle: 'bold' } },
                { content: '', styles: { fontStyle: 'bold' } },
                { content: totalAmount.toLocaleString(), styles: { fontStyle: 'bold' } }]
            ],
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
