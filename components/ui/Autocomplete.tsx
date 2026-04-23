'use client';

import React, { useState, useRef, useEffect } from 'react';

interface AutocompleteProps {
  label?: string;
  placeholder?: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
  /** When provided, shows an "Add new" option when no results match (e.g. for adding new Comunidad) */
  onAddNew?: (value: string) => Promise<void>;
  /** Label for the add-new option, e.g. "Agregar como nueva comunidad" */
  addNewLabel?: string;
}

export function Autocomplete({
  label,
  placeholder = 'Escribe para buscar...',
  options,
  value,
  onChange,
  required = false,
  error,
  onAddNew,
  addNewLabel,
}: AutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [filteredOptions, setFilteredOptions] = useState<string[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const showAddNew = Boolean(
    onAddNew &&
    isOpen &&
    filteredOptions.length === 0 &&
    inputValue.trim() &&
    !isAddingNew
  );

  // Close dropdown when clicking/tapping outside (touch + mouse for iOS)
  useEffect(() => {
    function handlePointerOutside(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (wrapperRef.current && target && !wrapperRef.current.contains(target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handlePointerOutside);
    document.addEventListener('touchstart', handlePointerOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handlePointerOutside);
      document.removeEventListener('touchstart', handlePointerOutside);
    };
  }, []);

  // Update input value when prop value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const safeOptions = Array.isArray(options) ? options : [];

  // Filter options based on input
  useEffect(() => {
    if (!inputValue.trim()) {
      setFilteredOptions(safeOptions);
      return;
    }

    const searchTerm = inputValue.toLowerCase();
    const filtered = safeOptions.filter((option) => {
      const optionLower = option.toLowerCase();
      // Extract number from format "(3914)"
      const numberMatch = option.match(/\((\d+)\)/);
      const number = numberMatch ? numberMatch[1] : '';
      
      // Search in both the full text and the number
      return optionLower.includes(searchTerm) || number.includes(searchTerm);
    });

    setFilteredOptions(filtered);
  }, [inputValue, safeOptions]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleOptionClick = (option: string) => {
    setInputValue(option);
    onChange(option);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleAddNew = async () => {
    const newValue = inputValue.trim();
    if (!newValue || !onAddNew) return;
    setIsAddingNew(true);
    try {
      await onAddNew(newValue);
      setInputValue(newValue);
      onChange(newValue);
      setIsOpen(false);
      setHighlightedIndex(-1);
    } catch (err) {
      console.error('Add new failed:', err);
    } finally {
      setIsAddingNew(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        return;
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => 
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (showAddNew) {
          handleAddNew();
          return;
        }
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleOptionClick(filteredOptions[highlightedIndex]);
        } else if (filteredOptions.length === 1) {
          handleOptionClick(filteredOptions[0]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleFocus = () => {
    setIsOpen(true);
  };

  return (
    <div className="w-full" ref={wrapperRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
        
        {isOpen && filteredOptions.length > 0 && (
          <div
            className="absolute z-[100] w-full mt-1 max-h-60 overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y bg-white border border-gray-300 rounded-lg shadow-lg [-webkit-overflow-scrolling:touch]"
            role="listbox"
          >
            {filteredOptions.map((option, index) => (
              <div
                key={index}
                role="option"
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleOptionClick(option)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`px-3 py-2 cursor-pointer text-sm select-none ${
                  index === highlightedIndex
                    ? 'bg-orange-100 text-orange-900'
                    : 'hover:bg-gray-100 text-gray-900'
                }`}
              >
                {option}
              </div>
            ))}
          </div>
        )}

        {showAddNew && (
          <div className="absolute z-[100] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleAddNew}
              className="w-full px-3 py-2 text-left text-sm text-orange-600 hover:bg-orange-50 font-medium flex items-center gap-2 touch-manipulation"
            >
              <span aria-hidden>+</span>
              {addNewLabel ? addNewLabel.replace('{value}', inputValue.trim()) : `Agregar "${inputValue.trim()}" como nueva comunidad`}
            </button>
          </div>
        )}

        {isOpen && filteredOptions.length === 0 && inputValue && !showAddNew && (
          <div className="absolute z-[100] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg px-3 py-2 text-sm text-gray-500">
            {isAddingNew ? 'Agregando...' : 'No se encontraron resultados'}
          </div>
        )}

      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
