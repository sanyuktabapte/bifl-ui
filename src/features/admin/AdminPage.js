import React, { useEffect, useCallback } from "react";
import { fetchAdminDashboard, addStoreApi, addFlavourApi, updateFlavourApi, updateStoreStatusApi, deleteFlavourApi } from "../../services/adminService";

// Extracted Components
import StoreListAccordion from './components/StoreListAccordion';
import FlavourListAccordion from './components/FlavourListAccordion';
import StockListAccordion from './components/StockListAccordion';
import BatchListAccordion from './components/BatchListAccordion';
import StoreModal from './components/StoreModal';
import FlavourModal from './components/FlavourModal';
import StockModal from './components/StockModal';

export default function AdminPanel() {
    // State Management for Data
    const [stores, setStores] = React.useState([]);
    const [flavours, setFlavours] = React.useState([]);
    const [batches, setBatches] = React.useState([]);

    // Accordion Toggle States
    const [isStoreOpen, setIsStoreOpen] = React.useState(false);
    const [isFlavourOpen, setIsFlavourOpen] = React.useState(false);
    const [isStockOpen, setIsStockOpen] = React.useState(false);
    const [isBatchOpen, setIsBatchOpen] = React.useState(false);

    // Modal Visibility States
    const [isStoreModalOpen, setIsStoreModalOpen] = React.useState(false);
    const [isFlavourModalOpen, setIsFlavourModalOpen] = React.useState(false);
    const [isStockModalOpen, setIsStockModalOpen] = React.useState(false);

    // Form Field States
    const [storeForm, setStoreForm] = React.useState({ name: '', address: '' });
    const [flavourForm, setFlavourForm] = React.useState({ code: '', name: '', category: 'Classic', price: '', factoryStock: '', coldRoomStock: '' });
    const [stockForm, setStockForm] = React.useState({ code: '', name: '', factoryStock: '', coldRoomStock: '' });
    const [editingFlavourCode, setEditingFlavourCode] = React.useState(null); // Tracks if modal is in Edit mode
    const [flavourFilter, setFlavourFilter] = React.useState('');
    const [stockFilter, setStockFilter] = React.useState('');
    const [batchFilter, setBatchFilter] = React.useState('');

    // Fetch Dashboard Data from Backend
    const loadDashboardData = useCallback(async () => {
        try {
            const data = await fetchAdminDashboard();
            if (data) {
                setFlavours(data.flavourList || []);
                setStores(data.storeList || []);
                setBatches(data.batchList || []);
            }
        } catch (err) {
            console.error("Backend error loading admin dashboard:", err);
        }
    }, []);

    useEffect(() => {
        loadDashboardData();
    }, [loadDashboardData]);

    // --- STORE ACTIONS ---
    const handleStoreSubmit = async (e) => {
        e.preventDefault();
        if (!storeForm.name || !storeForm.address) return;

        const newStorePayload = {
            name: storeForm.name,
            address: storeForm.address,
            status: 'active'
        };

        try {
            await addStoreApi(newStorePayload);
            await loadDashboardData();
        } catch (err) {
            console.error("Backend addStore error:", err);
            alert("Error: Failed to add store to backend database.");
        }

        setStoreForm({ name: '', address: '' });
        setIsStoreModalOpen(false);
    };

    const handleStoreStatusToggle = async (storeId) => {
        const storeToToggle = stores.find(s => s.id === storeId);
        if (!storeToToggle) return;
        const newStatus = storeToToggle.status === 'active' ? 'inactive' : 'active';

        try {
            await updateStoreStatusApi(storeId, newStatus);
            await loadDashboardData();
        } catch (err) {
            console.error("Backend store status toggle error:", err);
            alert("Error: Failed to update store status in database.");
        }
    };

    // --- FLAVOUR ACTIONS ---
    const openAddFlavourModal = () => {
        setEditingFlavourCode(null);
        setFlavourForm({ code: '', name: '', category: 'Classic', price: '', factoryStock: '', coldRoomStock: '' });
        setIsFlavourModalOpen(true);
    };

    const openEditFlavourModal = (flavour) => {
        setEditingFlavourCode(flavour.code);
        setFlavourForm({ ...flavour });
        setIsFlavourModalOpen(true);
    };

    const handleFlavourSubmit = async (e) => {
        e.preventDefault();
        if (!flavourForm.name || !flavourForm.price) return;
        if (!editingFlavourCode && (flavourForm.factoryStock === '' || flavourForm.coldRoomStock === '')) return;

        const flavourPayload = {
            code: flavourForm.code || flavourForm.name.split(' ').map(w => w[0]).join('').toUpperCase(),
            name: flavourForm.name,
            category: flavourForm.category,
            price: Number(flavourForm.price),
            factoryStock: Number(flavourForm.factoryStock || 0),
            coldRoomStock: Number(flavourForm.coldRoomStock || 0)
        };

        try {
            if (editingFlavourCode) {
                await updateFlavourApi(editingFlavourCode, flavourPayload);
            } else {
                await addFlavourApi(flavourPayload);
            }
            await loadDashboardData();
        } catch (err) {
            console.error("Backend flavour submit error:", err);
            alert("Error: Failed to save flavour to backend database.");
        }

        setIsFlavourModalOpen(false);
    };

    const openEditStockModal = (flavour) => {
        setStockForm({
            code: flavour.code,
            name: flavour.name,
            factoryStock: flavour.factoryStock,
            coldRoomStock: flavour.coldRoomStock
        });
        setIsStockModalOpen(true);
    };

    const handleStockSubmit = async (e) => {
        e.preventDefault();
        if (stockForm.factoryStock === '' || stockForm.coldRoomStock === '') return;

        const existing = flavours.find(f => f.code === stockForm.code);
        if (!existing) return;

        const payload = {
            ...existing,
            factoryStock: Number(stockForm.factoryStock),
            coldRoomStock: Number(stockForm.coldRoomStock)
        };

        try {
            await updateFlavourApi(stockForm.code, payload);
            await loadDashboardData();
        } catch (err) {
            console.error("Backend stock submit error:", err);
            alert("Error: Failed to update stock in database.");
        }
        setIsStockModalOpen(false);
    };

    const handleFlavourDelete = async (code) => {
        if (!window.confirm(`Are you sure you want to delete flavour '${code}'?`)) return;
        try {
            await deleteFlavourApi(code);
            await loadDashboardData();
        } catch (err) {
            console.error("Backend delete flavour error:", err);
            alert("Error: Failed to delete flavour from database.");
        }
    };

    const filteredFlavours = React.useMemo(() => {
        if (!flavourFilter) {
            return flavours;
        }
        return flavours.filter(f =>
            (f.name && f.name.toLowerCase().includes(flavourFilter.toLowerCase())) ||
            (f.code && f.code.toLowerCase().includes(flavourFilter.toLowerCase())) ||
            (f.category && f.category.toLowerCase().includes(flavourFilter.toLowerCase()))
        );
    }, [flavours, flavourFilter]);

    const filteredStock = React.useMemo(() => {
        if (!stockFilter) {
            return flavours;
        }
        return flavours.filter(f =>
            (f.name && f.name.toLowerCase().includes(stockFilter.toLowerCase())) ||
            (f.code && f.code.toLowerCase().includes(stockFilter.toLowerCase()))
        );
    }, [flavours, stockFilter]);

    const filteredBatches = React.useMemo(() => {
        if (!batchFilter) return batches;
        const q = batchFilter.toLowerCase();
        return batches.filter(b =>
            (b.batchNumber && b.batchNumber.toLowerCase().includes(q)) ||
            (b.status && b.status.toLowerCase().includes(q)) ||
            (b.flavours && b.flavours.some(f =>
                (f.flavourName && f.flavourName.toLowerCase().includes(q)) ||
                (f.flavourCode && f.flavourCode.toLowerCase().includes(q))
            ))
        );
    }, [batches, batchFilter]);

    return (
        <div className="container">
            <div className="page-head">
                <div>
                    <div className="crumb">System Settings</div>
                    <h1>Admin Management Panel</h1>
                </div>
            </div>

            {/* ================= ACCORDION 1: MASTER STORE LIST ================= */}
            <StoreListAccordion
                stores={stores}
                isOpen={isStoreOpen}
                onToggle={() => setIsStoreOpen(!isStoreOpen)}
                onAddStore={() => setIsStoreModalOpen(true)}
                onToggleStatus={handleStoreStatusToggle}
            />

            {/* ================= ACCORDION 2: MASTER FLAVOUR LIST ================= */}
            <FlavourListAccordion
                flavours={flavours}
                filteredFlavours={filteredFlavours}
                flavourFilter={flavourFilter}
                setFlavourFilter={setFlavourFilter}
                isOpen={isFlavourOpen}
                onToggle={() => setIsFlavourOpen(!isFlavourOpen)}
                onAddFlavour={openAddFlavourModal}
                onEditFlavour={openEditFlavourModal}
                onDeleteFlavour={handleFlavourDelete}
            />

            {/* ================= ACCORDION 3: MASTER STOCK ================= */}
            <StockListAccordion
                filteredStock={filteredStock}
                stockFilter={stockFilter}
                setStockFilter={setStockFilter}
                isOpen={isStockOpen}
                onToggle={() => setIsStockOpen(!isStockOpen)}
                onEditStock={openEditStockModal}
            />

            {/* ================= ACCORDION 4: MASTER BATCHES ================= */}
            <BatchListAccordion
                batches={batches}
                filteredBatches={filteredBatches}
                batchFilter={batchFilter}
                setBatchFilter={setBatchFilter}
                isOpen={isBatchOpen}
                onToggle={() => setIsBatchOpen(!isBatchOpen)}
            />

            {/* ================= MODALS ================= */}
            <StoreModal
                isOpen={isStoreModalOpen}
                storeForm={storeForm}
                setStoreForm={setStoreForm}
                onSubmit={handleStoreSubmit}
                onClose={() => setIsStoreModalOpen(false)}
            />

            <FlavourModal
                isOpen={isFlavourModalOpen}
                flavourForm={flavourForm}
                setFlavourForm={setFlavourForm}
                editingFlavourCode={editingFlavourCode}
                onSubmit={handleFlavourSubmit}
                onClose={() => setIsFlavourModalOpen(false)}
            />

            <StockModal
                isOpen={isStockModalOpen}
                stockForm={stockForm}
                setStockForm={setStockForm}
                onSubmit={handleStockSubmit}
                onClose={() => setIsStockModalOpen(false)}
            />
        </div>
    );
}