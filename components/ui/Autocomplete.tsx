'use client';

import React, { useState, useRef, useEffect } from 'react';

interface AutocompleteProps {
  label?: string;
  placeholder?: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

export function Autocomplete({
  label,
  placeholder = 'Escribe para buscar...',
  options,
  value,
  onChange,
  required = false,
}: AutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [filteredOptions, setFilteredOptions] = useState<string[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update input value when prop value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Filter options based on input
  useEffect(() => {
    if (!inputValue.trim()) {
      setFilteredOptions(options);
      return;
    }

    const searchTerm = inputValue.toLowerCase();
    const filtered = options.filter((option) => {
      const optionLower = option.toLowerCase();
      // Extract number from format "(3914)"
      const numberMatch = option.match(/\((\d+)\)/);
      const number = numberMatch ? numberMatch[1] : '';
      
      // Search in both the full text and the number
      return optionLower.includes(searchTerm) || number.includes(searchTerm);
    });

    setFilteredOptions(filtered);
  }, [inputValue, options]);

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
          <div className="absolute z-50 w-full mt-1 max-h-60 overflow-auto bg-white border border-gray-300 rounded-lg shadow-lg">
            {filteredOptions.map((option, index) => (
              <div
                key={index}
                onClick={() => handleOptionClick(option)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`px-3 py-2 cursor-pointer text-sm ${
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

        {isOpen && filteredOptions.length === 0 && inputValue && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg px-3 py-2 text-sm text-gray-500">
            No se encontraron resultados
          </div>
        )}
      </div>
    </div>
  );
}
