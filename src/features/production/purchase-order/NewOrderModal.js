import React, { useState, useRef, useEffect, useMemo } from 'react';
import AutocompleteInput from '../../../components/common/AutocompleteInput'; // Reusing the autocomplete component

function NewOrderModal({ isOpen, onClose, onSave, flavours, stores: masterStoreList, ordersToEdit }) {
    const [date, setDate] = useState('');
    const [store, setStore] = useState('');
    const [rows, setRows] = useState([{ id: Date.now(), flavour: null, orderQuantity: '' }]);
    const [focusTarget, setFocusTarget] = useState('flavour'); // 'flavour' or 'kg'
    const lastInputRef = useRef(null);
    const kgInputRefs = useRef([]);

    // Pre-fill date and reset form when modal opens for creating or editing
    useEffect(() => {
        if (isOpen) {
            if (ordersToEdit && ordersToEdit.length > 0) {
                // Note: Store is not part of pending orders, so it won't be pre-filled in edit mode.
                // Editing mode: Populate with existing pending orders
                setDate(ordersToEdit[0]?.orderDate || new Date().toISOString().split('T')[0]);
                setRows(ordersToEdit.map(order => ({
                    // Use a unique value for the row key, Date.now() is fine here for initial render
                    id: Date.now() + Math.random(),
                    flavour: { code: order.code, name: order.name },
                    orderQuantity: order.orderQuantity
                })));
            } else {
                // Creating mode: Start with a fresh form
                setStore('');
                setDate(new Date().toISOString().split('T')[0]);
                setRows([{ id: Date.now(), flavour: null, orderQuantity: '' }]);
            }
        }
    }, [isOpen, ordersToEdit]);

    // Focus new row's input
    useEffect(() => {
        if (!isOpen) return;
        if (focusTarget === 'flavour' && lastInputRef.current) {
            lastInputRef.current.focus();
        } else if (focusTarget === 'kg') {
            const lastKgInput = kgInputRefs.current[kgInputRefs.current.length - 1];
            if (lastKgInput) {
                lastKgInput.focus();
            }
        }
    }, [rows.length, isOpen, focusTarget]);

    const flavourOptions = useMemo(() => flavours.map(f => ({ code: f.code, name: f.name })), [flavours]);
    const flavourSearchItems = useMemo(() => flavours.map(f => `${f.name} (${f.code})`), [flavours]);
    const storeSearchItems = useMemo(() => masterStoreList.map(s => s.name), [masterStoreList]);

    const handleAddRow = () => {
        setRows(prev => [...prev, { id: Date.now(), flavour: null, orderQuantity: '' }]);
        setFocusTarget('flavour');
    };

    const handleRemoveRow = (id) => {
        if (rows.length > 1) {
            setRows(prev => prev.filter(row => row.id !== id));
        }
    };

    const handleRowChange = (id, field, value) => {
        setRows(prev =>
            prev.map(row => {
                let updatedRow = { ...row };
                if (row.id === id) {
                    if (field === 'flavour') {
                        let foundFlavour = null;
                        if (value) {
                            const lowerCaseValue = value.toLowerCase();

                            // Priority 1: Check for an exact ID match first.
                            foundFlavour = flavourOptions.find(f => f.code.toLowerCase() === lowerCaseValue) || null;

                            // Priority 2: If no ID match, check for a full autocomplete selection "Name (ID)"
                            if (!foundFlavour) {
                                const match = value.match(/^(.*) \((.*)\)$/);
                                if (match) {
                                    foundFlavour = flavourOptions.find(f => f.code.toLowerCase() === match[2].toLowerCase()) || null;
                                }
                            }

                            // Priority 4: If still no match, check for a name match.
                            if (!foundFlavour) {
                                foundFlavour = flavourOptions.find(f => f.name.toLowerCase() === lowerCaseValue) || null;
                            }
                        }
                        updatedRow.flavour = foundFlavour;
                        return updatedRow;
                    }
                    updatedRow[field] = value;
                    return updatedRow;
                }
                return updatedRow;
            })
        );
    };

    const handleKgInputKeyDown = (e, index) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (index === rows.length - 1) {
                setFocusTarget('kg');
                setRows(prev => [...prev, { id: Date.now(), flavour: null, orderQuantity: '' }]);
            } else {
                kgInputRefs.current[index + 1]?.focus();
            }
        }
    };

    const handleSave = () => {
        if (!store) {
            alert("Please select a store before saving.");
            return;
        }

        const validRows = rows.filter(row => row.flavour && row.orderQuantity > 0);

        if (validRows.length === 0) {
            alert("Please add at least one flavour with a valid quantity.");
            return;
        }

        // Mapper to create the newOrder object in the desired format
        const newOrder = {
            orderId: Date.now(), // Using timestamp for a unique ID
            storeName: store,
            orderDate: date,
            status: "Pending",
            flavourList: validRows.map(row => ({
                name: row.flavour.name,
                orderQuantity: parseFloat(row.orderQuantity)
            }))
        };

        // NOTE: The onSave prop currently expects an array of individual flavor objects.
        // This console.log shows the correctly mapped object.
        // The parent component's onSave handler will need to be updated to accept this new format.

        // For now, to keep the UI working, I will adapt the new object back to the old format.
        // This part should be replaced when the backend integration is ready.
        const ordersForUi = newOrder.flavourList.map(f => ({ code: f.name, name: f.name, orderDate: newOrder.orderDate, status: newOrder.status, orderQuantity: f.orderQuantity }));
        onSave(ordersForUi);
    };

    const { totalKg, totalDol } = useMemo(() => {
        return rows.reduce((acc, row) => {
            const kg = parseFloat(row.orderQuantity) || 0;
            acc.totalKg += kg;
            acc.totalDol += Math.floor(kg / 3);
            return acc;
        }, { totalKg: 0, totalDol: 0 });
    }, [rows]);

    if (!isOpen) return null;

    return (
        <div className="overlay open">
            <div className="modal" onClick={e => e.stopPropagation()}>
                <h2>New Purchase Order</h2>
                <div className="modal-sub">Add flavours and quantities for production.</div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                    <div className="field" style={{ flex: 1 }}>
                        <label>Store Name</label>
                        <AutocompleteInput
                            value={store}
                            onChange={(value) => setStore(value)}
                            items={storeSearchItems}
                            placeholder="Type store name..."
                        />
                    </div>
                    <div className="field">
                        <label>Order Date</label>
                        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: '140px' }} />
                    </div>
                </div>

                <table className="flavor-table" style={{ marginTop: '1rem', border: '1px solid #e2e8f0' }}>
                    <thead>
                        <tr>
                            <th style={{ width: '32px' }}>#</th>
                            <th>Flavour (Name or ID)</th>
                            <th style={{ width: '90px' }}>KG</th>
                            <th style={{ width: '80px' }}>Dol</th>
                            <th style={{ width: '30px' }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, index) => (
                            <tr key={row.id}>
                                <td className="rownum">{index + 1}</td>
                                <td>
                                    <AutocompleteInput
                                        ref={index === rows.length - 1 ? lastInputRef : null}
                                        value={row.flavour ? `${row.flavour.name} (${row.flavour.code})` : ''}
                                        onChange={(val) => handleRowChange(row.id, 'flavour', val)}
                                        items={flavourSearchItems}
                                        placeholder="Type flavour name or ID..."
                                        onEnterPress={handleAddRow}
                                    />
                                </td>
                                <td>
                                    <input
                                        ref={el => kgInputRefs.current[index] = el}
                                        type="text" value={row.orderQuantity}
                                        onChange={(e) => handleRowChange(row.id, 'orderQuantity', e.target.value)}
                                        onKeyDown={(e) => handleKgInputKeyDown(e, index)} />
                                </td>
                                <td className="dole-val">{Math.floor(parseFloat(row.orderQuantity) / 3) || 0}</td>
                                <td><button type="button" className="rm-row" title="Remove row" onClick={() => handleRemoveRow(row.id)} style={{ visibility: rows.length > 1 ? 'visible' : 'hidden' }}>✕</button></td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="totals-row">
                            <td colSpan="2">Total</td>
                            <td>{totalKg}</td>
                            <td>{totalDol}</td>
                            <td><button type="button" className="add-row-btn" title="Add flavor row" onClick={handleAddRow}>+</button></td>
                        </tr>
                    </tfoot>
                </table>

                <div className="modal-actions">
                    <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
                    <button type="button" className="btn-primary" onClick={handleSave}>Save Order</button>
                </div>
            </div>
        </div>
    );
}

export default NewOrderModal;