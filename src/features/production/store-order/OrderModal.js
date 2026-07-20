import React, { useState, useRef, useEffect, useMemo } from 'react';
import AutocompleteInput from '../../../components/common/AutocompleteInput';

function OrderModal({ isOpen, onClose, stores, orders, flavours, onSave, editingOrder }) {
    // This function stops the modal from closing when you click inside it.
    const handleModalContentClick = (e) => {
        e.stopPropagation();
    };

    const [store, setStore] = useState('');
    const [date, setDate] = useState('');
    // State to manage the flavour rows
    const [rows, setRows] = useState([{ id: 1, name: '', orderQuantity: '', error: false }]);
    const lastInputRef = useRef(null);
    const kgInputRefs = useRef([]);
    const [focusTarget, setFocusTarget] = useState('flavour');

    const flavourSearchItems = useMemo(() => flavours.map(f => `${f.name} (${f.code})`), [flavours]);


    const { totalKg, totalDole } = React.useMemo(() => {
        return rows.reduce((totals, row) => {
            const kg = parseFloat(row.orderQuantity);
            if (!isNaN(kg)) {
                totals.totalKg += kg;
                totals.totalDole += Math.floor(kg / 3);
            }
            return totals;
        }, { totalKg: 0, totalDole: 0 });
    }, [rows]);

    useEffect(() => {
        if (isOpen) {
            if (editingOrder) {
                // Populate form for editing
                setStore(editingOrder.store || '');
                setRows(editingOrder.flavours.map(item => ({ ...item, id: Math.random(), error: false })));
            } else {
                // Reset form for new order
                setStore('');
                setRows([{ id: 1, name: '', orderQuantity: '', error: false }]);
            }
        }
    }, [isOpen, editingOrder]);

    useEffect(() => {
        // When a new row is added, focus its input
        if (focusTarget === 'flavour' && lastInputRef.current) {
            lastInputRef.current.focus();
        } else if (focusTarget === 'kg') {
            const lastKgInput = kgInputRefs.current[kgInputRefs.current.length - 1];
            if (lastKgInput) {
                lastKgInput.focus();
            }
        }
    }, [rows.length, focusTarget]); // Effect runs when the number of rows changes


    // Function to add a new empty row
    const handleAddRow = () => {
        const newRow = {
            id: Date.now(), // Use a unique ID for the key
            name: '',
            orderQuantity: '',
            error: false
        };
        setRows([...rows, newRow]);
    };

    // Function to remove a row by its ID
    const handleRemoveRow = (id) => {
        // Prevent removing the last row
        if (rows.length <= 1) return;
        setRows(rows.filter(row => row.id !== id));
    };

    // Function to handle changes in the input fields of a row
    const handleRowChange = (id, field, value) => {
        setRows(currentRows => {
            let newRows = currentRows.map(row => {
                if (row.id === id) {
                    if (field === 'name') {
                        // Extract only the name part from "Flavour Name (ID)"
                        const nameOnly = value.replace(/ \(.*/, '');
                        const newFlavour = flavours.find(f => f.name === nameOnly);
                        return { ...row, name: newFlavour?.name || '', error: false };
                    } else {
                        return { ...row, [field]: value };
                    }
                }
                return row;
            });

            // Check for duplicates, flagging only the last occurrence
            const seen = new Set();
            return newRows.reverse().map(row => {
                if (!row.name || !seen.has(row.name)) {
                    if (row.name) seen.add(row.name);
                    return { ...row, error: false };
                }
                return { ...row, error: true };
            }).reverse();
        });
    };

    const handleSave = () => {
        // Basic validation
        if (!store || !date) {
            alert('Please fill all required fields and correct any errors.');
            return;
        }

        const newId = editingOrder ? editingOrder.orderId : null; // Let parent component assign new ID
        const newOrderData = {
            orderId: newId,
            store,
            batch: 'NA',
            orderDate: date || new Date().toISOString().split('T')[0],
            flavours: rows.filter(r => r.name && r.orderQuantity).map(({ id, error, ...item }) => item), // Save rows with data, remove transient 'error' and 'code' state
            status: editingOrder ? editingOrder.status : 'Pending',
        };
        onSave(newOrderData);
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className="overlay open">
            <div className="modal" onClick={handleModalContentClick}>
                <h2 id="modalTitle">{editingOrder ? 'Edit Store Order' : 'New Store Order'}</h2>
                <div className="modal-sub">Enter the store, a unique batch number, and the flavours requested.</div>

                <div className="row">
                    <div className="field" style={{ position: 'relative' }}>
                        <label>Store Name</label>
                        <AutocompleteInput
                            value={store}
                            onChange={setStore}
                            items={stores.map(s => s.name)}
                            placeholder="Select a store..."
                            onEnterPress={() => { }}
                        />
                    </div>
                    <div className="field">
                        <label>Date</label>
                        <input type="date" id="orderDate" value={date} onChange={(e) => setDate(e.target.value)} />
                    </div>
                </div>

                <div className="flavour-table-head">
                    <span className="label">Flavours</span>
                </div>
                <table className="flavour-table" id="flavourTable">
                    <thead>
                        <tr>
                            <th style={{ width: '32px' }}>#</th>
                            <th>Flavour</th>
                            <th style={{ width: '90px' }}>KG</th>
                            <th style={{ width: '80px' }}>Dol</th>
                            <th style={{ width: '30px' }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, index) => (
                            <tr key={row.id}>
                                <td className="rownum">{index + 1}</td>
                                <td style={{ position: 'relative' }}>
                                    <AutocompleteInput
                                        ref={index === rows.length - 1 ? lastInputRef : null}
                                        value={row.name}
                                        onChange={(nameValue) => handleRowChange(row.id, 'name', nameValue)}
                                        onEnterPress={() => {
                                            setFocusTarget('flavour');
                                            handleAddRow();
                                        }}
                                        items={flavourSearchItems}
                                        error={row.error}
                                        errorMessage="Duplicate entry"
                                        placeholder="Type flavour..."
                                    />
                                </td>
                                <td><input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    className="flavour-kg"
                                    value={row.orderQuantity} onChange={(e) => handleRowChange(row.id, 'orderQuantity', e.target.value)} /></td>
                                <td className="dole-val">{Math.floor(parseFloat(row.orderQuantity) / 3) || 0}</td>
                                <td><button type="button" className="rm-row" title="Remove row" onClick={() => handleRemoveRow(row.id)} style={{ visibility: rows.length > 1 ? 'visible' : 'hidden' }}>✕</button></td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="totals-row">
                            <td colSpan="2">Total</td>
                            <td id="totalKg">{Math.round(totalKg)}</td>
                            <td id="totalDole">{totalDole}</td>
                            <td>
                                <button type="button" className="add-row-btn" title="Add flavour row" onClick={handleAddRow}>+</button>
                            </td>
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

export default React.memo(OrderModal);