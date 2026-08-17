import React, { useState, useEffect, useMemo, useRef } from 'react';

const AutocompleteInput = React.forwardRef(({
    value = '',
    onChange,
    onEnterPress = () => { },
    items = [],
    error,
    errorMessage,
    placeholder,
    className = ''
}, ref) => {
    const [inputValue, setInputValue] = useState(value);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef(null);

    const setRefs = (element) => {
        inputRef.current = element;
        if (typeof ref === 'function') {
            ref(element);
        } else if (ref) {
            ref.current = element;
        }
    };

    useEffect(() => {
        setInputValue(value || '');
    }, [value]);

    // Normalize items into consistent structured objects
    const normalizedItems = useMemo(() => {
        if (!Array.isArray(items)) return [];
        return items.map(item => {
            if (typeof item === 'object' && item !== null) {
                return {
                    code: item.code || '',
                    name: item.name || item.label || '',
                    raw: item,
                    displayText: item.code ? `${item.code} - ${item.name}` : (item.name || item.label || '')
                };
            }
            const stringVal = String(item);
            const codeMatch = stringVal.match(/\(([^)]+)\)$/) || stringVal.match(/^([A-Z0-9]+)\s*-\s*/);
            if (codeMatch) {
                const code = codeMatch[1];
                const name = stringVal.replace(/\([^)]+\)$/, '').replace(/^[A-Z0-9]+\s*-\s*/, '').trim();
                return {
                    code,
                    name,
                    raw: item,
                    displayText: `${code} - ${name}`
                };
            }
            return {
                code: '',
                name: stringVal,
                raw: item,
                displayText: stringVal
            };
        });
    }, [items]);

    // Priority filter: Code match (exact, prefix, contains) > Name match (prefix, contains)
    const suggestions = useMemo(() => {
        const query = (inputValue || '').trim().toLowerCase();
        if (!query) return [];

        const exactCode = [];
        const codeStart = [];
        const codeContains = [];
        const nameStart = [];
        const nameContains = [];

        normalizedItems.forEach(item => {
            const codeLower = item.code.toLowerCase();
            const nameLower = item.name.toLowerCase();

            if (codeLower && codeLower === query) {
                exactCode.push(item);
            } else if (codeLower && codeLower.startsWith(query)) {
                codeStart.push(item);
            } else if (codeLower && codeLower.includes(query)) {
                codeContains.push(item);
            } else if (nameLower && nameLower.startsWith(query)) {
                nameStart.push(item);
            } else if (nameLower && nameLower.includes(query)) {
                nameContains.push(item);
            }
        });

        return [...exactCode, ...codeStart, ...codeContains, ...nameStart, ...nameContains];
    }, [inputValue, normalizedItems]);

    // ONLY update local input value while typing (do NOT commit to parent until Enter or Mouse Click)
    const handleChange = (e) => {
        const val = e.target.value;
        setInputValue(val);
        setShowSuggestions(true);
        setActiveIndex(0);
    };

    // Commit selection to parent
    const handleSelect = (selectedItem) => {
        if (!selectedItem) return;
        const valToSet = selectedItem.displayText;
        setInputValue(valToSet);
        if (typeof onChange === 'function') {
            onChange(valToSet, selectedItem);
        }
        setShowSuggestions(false);
    };

    const commitCurrentInputOrSelection = () => {
        if (showSuggestions && suggestions.length > 0) {
            const selected = suggestions[activeIndex] || suggestions[0];
            handleSelect(selected);
        } else if (inputValue) {
            const query = inputValue.trim().toLowerCase();
            const matched = normalizedItems.find(i =>
                i.code.toLowerCase() === query ||
                i.name.toLowerCase() === query
            );
            if (matched) {
                handleSelect(matched);
            } else if (typeof onChange === 'function') {
                onChange(inputValue, null);
            }
        }
        setShowSuggestions(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            commitCurrentInputOrSelection();
            onEnterPress();
        } else if (e.key === 'ArrowDown') {
            if (showSuggestions && suggestions.length > 0) {
                e.preventDefault();
                setActiveIndex(prev => (prev + 1) % suggestions.length);
            }
        } else if (e.key === 'ArrowUp') {
            if (showSuggestions && suggestions.length > 0) {
                e.preventDefault();
                setActiveIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
            }
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
        }
    };

    const handleBlur = () => {
        setTimeout(() => {
            if (showSuggestions) {
                commitCurrentInputOrSelection();
            }
        }, 150);
    };

    return (
        <div className="autocomplete-wrapper" style={{ position: 'relative', width: '100%' }}>
            <input
                type="text"
                ref={setRefs}
                className={`autocomplete-input ${className} ${error ? 'invalid' : ''}`}
                placeholder={placeholder || "Type code (e.g. EL) or name..."}
                autoComplete="off"
                value={inputValue}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                    if (inputValue) {
                        const query = inputValue.trim().toLowerCase();
                        const isExactMatch = normalizedItems.some(item => 
                            item.displayText.toLowerCase() === query ||
                            item.name.toLowerCase() === query ||
                            (item.code && item.code.toLowerCase() === query)
                        );
                        if (!isExactMatch) {
                            setShowSuggestions(true);
                        }
                    }
                }}
                onBlur={handleBlur}
            />
            {showSuggestions && suggestions.length > 0 && (
                <div className="autocomplete-list">
                    {suggestions.map((item, index) => (
                        <div
                            key={`${item.code}-${item.name}-${index}`}
                            className={`autocomplete-item ${index === activeIndex ? 'active-opt' : ''}`}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelect(item);
                                onEnterPress();
                            }}
                        >
                            {item.code ? (
                                <div className="suggestion-content">
                                    <span className="code-pill">{item.code}</span>
                                    <span className="flavour-name">{item.name}</span>
                                </div>
                            ) : (
                                <span>{item.displayText}</span>
                            )}
                        </div>
                    ))}
                </div>
            )}
            <div className={`row-error ${error ? 'show' : ''}`}>
                {errorMessage}
            </div>
        </div>
    );
});

export default React.memo(AutocompleteInput);