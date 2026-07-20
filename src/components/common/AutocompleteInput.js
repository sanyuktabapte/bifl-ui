import React, { useState, useEffect } from 'react';

const AutocompleteInput = React.forwardRef(({ value, onChange, onEnterPress = () => { }, items, error, errorMessage, placeholder }, ref) => {
    const [inputValue, setInputValue] = useState(value);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        setInputValue(value);
    }, [value]);


    const handleChange = (e) => {
        const value = e.target.value;
        setInputValue(value);
        if (value) {
            const filteredSuggestions = items.filter(f =>
                f.toLowerCase().includes(value.toLowerCase())
            );
            setSuggestions(filteredSuggestions);
            setShowSuggestions(true);
            setActiveIndex(0);
        } else {
            setShowSuggestions(false);
        }
    };

    const handleSelect = (flavor) => {
        setInputValue(flavor);
        onChange(flavor);
        setShowSuggestions(false);
    };

    const handleKeyDown = (e) => {
        if (showSuggestions) {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (suggestions.length > 0) {
                    handleSelect(suggestions[activeIndex]);
                }
                onEnterPress();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex(prev => (prev + 1) % suggestions.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
            } else if (e.key === 'Escape') {
                setShowSuggestions(false);
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            onEnterPress();
        }
    };

    return (
        <div style={{ position: 'relative' }}>
            <input
                type="text"
                ref={ref}
                className={`autocomplete-input ${error ? 'invalid' : ''}`}
                placeholder={placeholder || "Start typing..."}
                autoComplete="off"
                value={inputValue}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onFocus={() => inputValue && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            />
            {showSuggestions && suggestions.length > 0 && (
                <div className="autocomplete-list">
                    {suggestions.map((flavor, index) => (
                        <div
                            key={flavor}
                            className={index === activeIndex ? 'active-opt' : ''}
                            onMouseDown={() => handleSelect(flavor)}
                        >
                            {flavor}
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