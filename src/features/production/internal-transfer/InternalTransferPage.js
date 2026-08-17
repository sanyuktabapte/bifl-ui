import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { fetchAdminDashboard } from '../../../services/adminService';
import { executeTransferApi } from '../../../services/internalTransferService';
import AutocompleteInput from '../../../components/common/AutocompleteInput';

function InternalTransferPage() {
    const [stores, setStores] = useState([]);
    const [flavours, setFlavours] = useState([]);
    
    // Transfer form state
    const [source, setSource] = useState('Factory');
    const [destination, setDestination] = useState('Cold Room');
    const [transferItems, setTransferItems] = useState([
        { uniqueId: Math.random(), name: '', code: '', quantity: '' }
    ]);
    const [stockSearchQuery, setStockSearchQuery] = useState('');
    
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const flavourInputRefs = useRef([]);
    const kgInputRefs = useRef([]);

    useEffect(() => {
        flavourInputRefs.current = flavourInputRefs.current.slice(0, transferItems.length);
        kgInputRefs.current = kgInputRefs.current.slice(0, transferItems.length);

        const lastIdx = transferItems.length - 1;
        if (lastIdx >= 0 && flavourInputRefs.current[lastIdx]) {
            flavourInputRefs.current[lastIdx].focus();
        }
    }, [transferItems.length]);

    const locationSearchItems = useMemo(() => {
        return ["Factory", "Cold Room", ...stores.map(s => s.name)];
    }, [stores]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const adminData = await fetchAdminDashboard().catch(() => null);

            if (adminData) {
                if (adminData.storeList && adminData.storeList.length > 0) setStores(adminData.storeList);
                if (adminData.flavourList && adminData.flavourList.length > 0) setFlavours(adminData.flavourList);
            }
        } catch (err) {
            console.error("Error loading transfer page data:", err);
            setErrorMsg("Failed to load backend data.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleItemChange = (uniqueId, field, val, selectedObj) => {
        setErrorMsg('');
        setSuccessMsg('');
        setTransferItems(prev => prev.map(item => {
            if (item.uniqueId === uniqueId) {
                if (field === 'name') {
                    let code = selectedObj?.code || '';
                    let name = selectedObj?.name || val;

                    if (!code && typeof val === 'string') {
                        const cleanVal = val.trim();
                        const matched = flavours.find(f =>
                            f.code.toLowerCase() === cleanVal.toLowerCase() ||
                            f.name.toLowerCase() === cleanVal.toLowerCase()
                        );
                        if (matched) {
                            code = matched.code;
                            name = matched.name;
                        }
                    }
                    return { ...item, name, code };
                } else {
                    return { ...item, [field]: val };
                }
            }
            return item;
        }));
    };

    const handleAddRow = () => {
        setTransferItems(prev => [...prev, { uniqueId: Math.random(), name: '', code: '', quantity: '' }]);
    };

    const handleRemoveRow = (uniqueId) => {
        if (transferItems.length > 1) {
            setTransferItems(prev => prev.filter(item => item.uniqueId !== uniqueId));
        }
    };

    const handleTransferSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        setSuccessMsg('');

        if (!source || !destination) {
            setErrorMsg("Please select both source and destination locations.");
            return;
        }

        if (source.trim().toLowerCase() === destination.trim().toLowerCase()) {
            setErrorMsg("Source and destination locations cannot be the same.");
            return;
        }

        // Filter out completely empty rows (no code and no quantity)
        const validItems = transferItems.filter(item => item.code || (item.quantity && parseInt(item.quantity) > 0));

        if (validItems.length === 0) {
            setErrorMsg("Please add at least one item to transfer.");
            return;
        }

        const itemsPayload = [];
        const seenFlavours = new Set();

        for (const item of validItems) {
            if (!item.code) {
                setErrorMsg("Please select a flavour for all rows with quantities.");
                return;
            }

            if (seenFlavours.has(item.code)) {
                setErrorMsg(`Duplicate flavour found: ${item.name || item.code}. Each flavour can only be added once.`);
                return;
            }
            seenFlavours.add(item.code);

            const qty = parseInt(item.quantity);
            if (isNaN(qty) || qty <= 0) {
                setErrorMsg(`Please enter a valid quantity greater than 0 for flavour: ${item.name || item.code}.`);
                return;
            }

            // Check stock availability if source is Factory/Cold Room
            const flavourObj = flavours.find(f => f.code === item.code);
            if (flavourObj) {
                if (source === 'Factory') {
                    const avail = flavourObj.factoryStock || 0;
                    if (avail < qty) {
                        setErrorMsg(`Insufficient stock in Factory for ${flavourObj.name}. Available: ${avail} kg, requested: ${qty} kg.`);
                        return;
                    }
                } else if (source === 'Cold Room') {
                    const avail = flavourObj.coldRoomStock || 0;
                    if (avail < qty) {
                        setErrorMsg(`Insufficient stock in Cold Room for ${flavourObj.name}. Available: ${avail} kg, requested: ${qty} kg.`);
                        return;
                    }
                }
            }

            itemsPayload.push({
                flavourCode: item.code,
                quantity: qty
            });
        }

        setLoading(true);
        try {
            const payload = {
                source,
                destination,
                items: itemsPayload
            };

            await executeTransferApi(payload);
            setSuccessMsg(`Successfully executed stock transfer from ${source} to ${destination}!`);
            
            // Reset form
            setTransferItems([{ uniqueId: Math.random(), name: '', code: '', quantity: '' }]);
            
            // Reload lists
            await loadData();
        } catch (err) {
            console.error("Transfer execution error:", err);
            setErrorMsg(err.message || "Failed to execute stock transfer.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container">
            <div className="page-head">
                <div>
                    <div className="crumb">Factory Module</div>
                    <h1>Internal Stock Transfer</h1>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '12px' }}>
                
                {/* 1. New Stock Transfer Card */}
                <div style={{ background: 'var(--card)', padding: '24px', borderRadius: '16px', border: '1px solid var(--line)', boxShadow: 'var(--shadow)' }}>
                    <h3 style={{ margin: '0 0 4px', color: 'var(--navy)' }}>New Stock Transfer</h3>
                    <p style={{ margin: '0 0 20px', fontSize: '13px', color: 'var(--ink-soft)' }}>Move physical inventory between warehouses or stores.</p>

                    {errorMsg && (
                        <div style={{ background: '#fef2f2', color: 'var(--red)', border: '1px solid #fecaca', padding: '12px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', fontWeight: '500' }}>
                            ⚠️ {errorMsg}
                        </div>
                    )}

                    {successMsg && (
                        <div style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '12px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', fontWeight: '500' }}>
                            ✅ {successMsg}
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '2.1fr 0.9fr', gap: '32px', alignItems: 'start' }}>
                        {/* Left: Form */}
                        <form onSubmit={handleTransferSubmit}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                <div className="field">
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '13px' }}>Source Location</label>
                                    <AutocompleteInput
                                        value={source}
                                        onChange={(val) => { setSource(val); setErrorMsg(''); setSuccessMsg(''); }}
                                        items={locationSearchItems}
                                        placeholder="Search location..."
                                    />
                                </div>

                                <div className="field">
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '13px' }}>Destination Location</label>
                                    <AutocompleteInput
                                        value={destination}
                                        onChange={(val) => { setDestination(val); setErrorMsg(''); setSuccessMsg(''); }}
                                        items={locationSearchItems}
                                        placeholder="Search location..."
                                    />
                                </div>
                            </div>

                            <div className="field" style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '13px' }}>Flavour list</label>
                                
                                <table className="flavor-table" style={{ marginTop: '0' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ width: '40px' }}>#</th>
                                            <th>FLAVOUR</th>
                                            <th style={{ width: '120px', textAlign: 'center' }}>KG</th>
                                            <th style={{ width: '40px' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {transferItems.map((item, index) => (
                                            <tr key={item.uniqueId}>
                                                <td className="rownum">{index + 1}</td>
                                                <td>
                                                    <AutocompleteInput
                                                        ref={(el) => (flavourInputRefs.current[index] = el)}
                                                        value={item.code && item.name ? `${item.code} - ${item.name}` : (item.name || '')}
                                                        onChange={(val, selectedObj) => handleItemChange(item.uniqueId, 'name', val, selectedObj)}
                                                        onEnterPress={handleAddRow}
                                                        items={flavours}
                                                        placeholder="Select flavour..."
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        ref={(el) => (kgInputRefs.current[index] = el)}
                                                        type="number"
                                                        min="1"
                                                        value={item.quantity}
                                                        onChange={(e) => handleItemChange(item.uniqueId, 'quantity', e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                if (index + 1 < transferItems.length) {
                                                                    kgInputRefs.current[index + 1]?.focus();
                                                                }
                                                            }
                                                        }}
                                                        className="flavour-kg"
                                                        placeholder="0"
                                                        style={{ padding: '8px', borderRadius: '6px', textAlign: 'center', width: '100%' }}
                                                    />
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <button
                                                        type="button"
                                                        className="rm-row"
                                                        onClick={() => handleRemoveRow(item.uniqueId)}
                                                        style={{ visibility: transferItems.length > 1 ? 'visible' : 'hidden', width: '22px', height: '22px', fontSize: '11px' }}
                                                    >
                                                        ✕
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="totals-row">
                                            <td colSpan="2" style={{ textAlign: 'right' }}>Total Volume</td>
                                            <td style={{ textAlign: 'center' }}>
                                                {transferItems.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0)} kg
                                            </td>
                                            <td>
                                                <button type="button" className="add-row-btn" onClick={handleAddRow} style={{ width: '24px', height: '24px', fontSize: '14px' }}>+</button>
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            <button
                                type="submit"
                                className="btn-primary"
                                disabled={loading}
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', fontWeight: '700', fontSize: '14px', marginTop: '12px' }}
                            >
                                {loading ? 'Processing Transfer...' : 'Confirm Stock Transfer 🔄'}
                            </button>
                        </form>

                        {/* Right: Available Master Stock */}
                        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid var(--line)', maxHeight: '420px', display: 'flex', flexDirection: 'column' }}>
                            <h4 style={{ margin: '0 0 4px', color: 'var(--navy)', fontSize: '14px' }}>Available Master Stock</h4>
                            <p style={{ margin: '0 0 12px', fontSize: '11px', color: 'var(--ink-soft)' }}>Cold Room + Factory combined stock</p>
                            
                            <input
                                type="text"
                                placeholder="Search flavour..."
                                value={stockSearchQuery}
                                onChange={(e) => setStockSearchQuery(e.target.value)}
                                style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--line)', marginBottom: '12px', fontSize: '12px', width: '100%' }}
                            />

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', paddingRight: '4px' }}>
                                {flavours
                                    .filter(f => 
                                        !stockSearchQuery || 
                                        f.name.toLowerCase().includes(stockSearchQuery.toLowerCase()) || 
                                        f.code.toLowerCase().includes(stockSearchQuery.toLowerCase())
                                    )
                                    .map(f => {
                                        const total = (f.factoryStock || 0) + (f.coldRoomStock || 0);
                                        return (
                                            <div key={f.code} style={{ padding: '8px 12px', background: '#fff', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <span style={{ fontWeight: '700', color: 'var(--navy)' }}>{f.code}</span>
                                                    <span style={{ color: 'var(--ink-soft)', marginLeft: '6px' }}>{f.name}</span>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontWeight: '700', color: 'var(--blue)' }}>{total} kg</div>
                                                    <div style={{ fontSize: '10px', color: 'var(--ink-soft)' }}>
                                                        Fact: {f.factoryStock || 0} | CR: {f.coldRoomStock || 0}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

export default InternalTransferPage;
