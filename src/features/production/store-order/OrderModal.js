import React, { useState, useRef, useEffect, useMemo } from 'react';
import AutocompleteInput from '../../../components/common/AutocompleteInput';

function OrderModal({ isOpen, onClose, stores, orders, flavours = [], onSave, editingOrder }) {
    const handleModalContentClick = (e) => {
        e.stopPropagation();
    };

    const [store, setStore] = useState('');
    const [date, setDate] = useState('');
    const [rows, setRows] = useState([{ id: 1, name: '', code: '', orderQuantity: '', error: false }]);
    const lastInputRef = useRef(null);
    const kgInputRefs = useRef([]);
    const [focusTarget, setFocusTarget] = useState('flavour');

    const { totalKg, totalDole } = useMemo(() => {
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
                setStore(editingOrder.store || '');
                setDate(editingOrder.orderDate || new Date().toISOString().split('T')[0]);

                const itemsToMap = (editingOrder.flavours && editingOrder.flavours.length > 0)
                    ? editingOrder.flavours
                    : (editingOrder.orderFlavourList || []);

                const initialRows = itemsToMap.map(item => {
                    const itemCode = item.code || item.flavourCode || '';
                    const itemName = item.name || '';

                    const matchedFlavour = flavours.find(f =>
                        (itemCode && f.code.toLowerCase() === itemCode.toLowerCase()) ||
                        (itemName && f.name.toLowerCase() === itemName.toLowerCase())
                    );

                    const finalCode = matchedFlavour ? matchedFlavour.code : itemCode;
                    const finalName = matchedFlavour ? matchedFlavour.name : itemName;

                    return {
                        id: Math.random(),
                        name: finalName,
                        code: finalCode,
                        orderQuantity: item.orderQuantity !== undefined ? item.orderQuantity : '',
                        error: false
                    };
                });

                setRows(initialRows.length > 0 ? initialRows : [{ id: 1, name: '', code: '', orderQuantity: '', error: false }]);
            } else {
                setStore('');
                setDate(new Date().toISOString().split('T')[0]);
                setRows([{ id: 1, name: '', code: '', orderQuantity: '', error: false }]);
            }
        }
    }, [isOpen, editingOrder, flavours]);

    useEffect(() => {
        if (focusTarget === 'flavour' && lastInputRef.current) {
            lastInputRef.current.focus();
        } else if (focusTarget === 'kg') {
            const lastKgInput = kgInputRefs.current[rows.length - 1];
            if (lastKgInput) {
                lastKgInput.focus();
                if (typeof lastKgInput.select === 'function') {
                    lastKgInput.select();
                }
            }
        }
    }, [rows.length, focusTarget]);

    const handleAddRow = () => {
        const newRow = {
            id: Date.now(),
            name: '',
            code: '',
            orderQuantity: '',
            error: false
        };
        setRows(prevRows => [...prevRows, newRow]);
    };

    const handleRemoveRow = (id) => {
        if (rows.length <= 1) return;
        setRows(rows.filter(row => row.id !== id));
    };

    const handleRowChange = (id, field, value, selectedObj) => {
        setRows(currentRows => {
            let newRows = currentRows.map(row => {
                if (row.id === id) {
                    if (field === 'name') {
                        let code = selectedObj?.code || '';
                        let name = selectedObj?.name || value;

                        if (!code && typeof value === 'string') {
                            const cleanVal = value.trim();
                            const matched = flavours.find(f =>
                                f.code.toLowerCase() === cleanVal.toLowerCase() ||
                                f.name.toLowerCase() === cleanVal.toLowerCase()
                            );
                            if (matched) {
                                code = matched.code;
                                name = matched.name;
                            }
                        }

                        return { ...row, name, code, error: false };
                    } else {
                        return { ...row, [field]: value };
                    }
                }
                return row;
            });

            const seen = new Set();
            return newRows.reverse().map(row => {
                const identifier = (row.code || row.name).trim().toLowerCase();
                if (!identifier || !seen.has(identifier)) {
                    if (identifier) seen.add(identifier);
                    return { ...row, error: false };
                }
                return { ...row, error: true };
            }).reverse();
        });
    };

    const handleSave = () => {
        if (!store || !date) {
            alert('Please fill all required fields.');
            return;
        }

        const selectedStoreObj = stores.find(s =>
            s.name === store ||
            `${s.name}, ${s.address}` === store ||
            s.name.toLowerCase() === store.toLowerCase()
        );
        const storeId = selectedStoreObj ? selectedStoreObj.id : (stores[0]?.id || 1);

        const validRows = rows.filter(r => (r.name || r.code) && r.orderQuantity);
        if (validRows.length === 0) {
            alert('Please add at least one flavour with order quantity.');
            return;
        }

        const orderFlavourList = validRows.map(r => {
            const flavourObj = flavours.find(f => f.name === r.name || f.code === r.code);
            return {
                flavourCode: r.code || (flavourObj ? flavourObj.code : 'EL'),
                orderQuantity: parseInt(r.orderQuantity, 10)
            };
        });

        const newId = editingOrder ? editingOrder.orderId : null;
        const newOrderData = {
            id: editingOrder?.id,
            orderId: newId,
            storeId: storeId,
            store: store,
            batch: 'NA',
            orderDate: date || new Date().toISOString().split('T')[0],
            flavours: validRows.map(({ id, error, ...item }) => item),
            orderFlavourList: orderFlavourList,
            status: editingOrder ? editingOrder.status : 'Pending',
        };
        onSave(newOrderData);
    };

    if (!isOpen) return null;

    const getRowDisplayValue = (row) => {
        if (row.code && row.name) return `${row.code} - ${row.name}`;
        if (row.name) return row.name;
        if (row.code) return row.code;
        return '';
    };

    return (
        <div className="overlay open">
            <div className="modal" onClick={handleModalContentClick} style={{ width: '560px', overflow: 'visible' }}>
                <h2 id="modalTitle">{editingOrder ? 'Edit Store Order' : 'New Store Order'}</h2>
                <div className="modal-sub">Enter the store, order date, and requested flavour quantities.</div>

                <div className="row" style={{ overflow: 'visible', marginBottom: '1.25rem' }}>
                    <div className="field" style={{ position: 'relative' }}>
                        <label>Store Name *</label>
                        <AutocompleteInput
                            value={store}
                            onChange={setStore}
                            items={stores.map(s => s.name)}
                            placeholder="Type or select a store..."
                            onEnterPress={() => { }}
                        />
                    </div>
                    <div className="field">
                        <label>Order Date *</label>
                        <input type="date" id="orderDate" value={date} onChange={(e) => setDate(e.target.value)} />
                    </div>
                </div>

                <div className="flavour-table-head">
                    <span className="label">Flavours Request (Code or Name)</span>
                </div>
                <div style={{ overflow: 'visible' }}>
                    <table className="flavour-table" id="flavourTable" style={{ overflow: 'visible' }}>
                        <thead>
                            <tr>
                                <th style={{ width: '32px' }}>#</th>
                                <th>Flavour (Priority Code / Name)</th>
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
                                            value={getRowDisplayValue(row)}
                                            onChange={(nameValue, selectedObj) => handleRowChange(row.id, 'name', nameValue, selectedObj)}
                                            onEnterPress={() => {
                                                setFocusTarget('flavour');
                                                handleAddRow();
                                            }}
                                            items={flavours}
                                            error={row.error}
                                            errorMessage="Duplicate entry"
                                            placeholder="Type code (e.g. EL, KK) or name..."
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="number"
                                            ref={el => kgInputRefs.current[index] = el}
                                            min="0"
                                            step="3"
                                            className="flavour-kg"
                                            placeholder="0"
                                            value={row.orderQuantity}
                                            onChange={(e) => handleRowChange(row.id, 'orderQuantity', e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    if (index < rows.length - 1) {
                                                        const nextKgInput = kgInputRefs.current[index + 1];
                                                        if (nextKgInput) {
                                                            nextKgInput.focus();
                                                            if (typeof nextKgInput.select === 'function') {
                                                                nextKgInput.select();
                                                            }
                                                        }
                                                    } else {
                                                        setFocusTarget('kg');
                                                        handleAddRow();
                                                    }
                                                }
                                            }}
                                        />
                                    </td>
                                    <td className="dole-val">{Math.floor(parseFloat(row.orderQuantity) / 3) || 0}</td>
                                    <td>
                                        <button
                                            type="button"
                                            className="rm-row"
                                            title="Remove row"
                                            onClick={() => handleRemoveRow(row.id)}
                                            style={{ visibility: rows.length > 1 ? 'visible' : 'hidden' }}
                                        >
                                            ✕
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="totals-row">
                                <td colSpan="2">Total Volume</td>
                                <td id="totalKg">{Math.round(totalKg)} kg</td>
                                <td id="totalDole">{totalDole} dol</td>
                                <td>
                                    <button type="button" className="add-row-btn" title="Add flavour row" onClick={handleAddRow}>+</button>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
                    <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
                    <button type="button" className="btn-primary" onClick={handleSave}>Save Order</button>
                </div>
            </div>
        </div>
    );
}

export default React.memo(OrderModal);