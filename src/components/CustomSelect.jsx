import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

const CustomSelect = ({ value, onChange, options, placeholder, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%', opacity: disabled ? 0.5 : 1 }}>
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{ 
          width: '100%', padding: '1.1rem 1.25rem', borderRadius: '12px', background: '#151b23', 
          border: isOpen && !disabled ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.05)', 
          color: (value && !disabled) ? '#fff' : '#94a3b8', 
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          transition: 'all 0.2s',
          boxShadow: isOpen && !disabled ? '0 0 0 3px rgba(16, 185, 129, 0.1)' : 'none'
        }}
        onMouseOver={(e) => (!isOpen && !disabled) && (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)')}
        onMouseOut={(e) => (!isOpen && !disabled) && (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)')}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {(() => {
            if (!value) return placeholder;
            const selectedOpt = options && options.find(o => (typeof o === 'object' ? o.value : o) === value);
            return selectedOpt ? (typeof selectedOpt === 'object' ? selectedOpt.label : selectedOpt) : value;
          })()}
        </span>
        <ChevronDown size={18} style={{ transition: 'transform 0.2s', transform: isOpen && !disabled ? 'rotate(180deg)' : 'rotate(0)' }} />
      </div>

      {isOpen && !disabled && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '0.5rem',
          background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px', zIndex: 50, maxHeight: '300px', overflowY: 'auto',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          padding: '0.5rem'
        }}>
          <div 
            onClick={() => { onChange(''); setIsOpen(false); }}
            style={{
              padding: '0.75rem 1rem', borderRadius: '8px', cursor: 'pointer',
              color: !value ? '#10b981' : '#cbd5e1',
              background: !value ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
              marginBottom: '0.2rem', transition: 'background 0.2s'
            }}
            onMouseOver={(e) => { if(value) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
            onMouseOut={(e) => { if(value) e.currentTarget.style.background = 'transparent' }}
          >
            {placeholder}
          </div>
          
          {options && options.map((opt, idx) => {
            const optLabel = typeof opt === 'object' ? opt.label : opt;
            const optValue = typeof opt === 'object' ? opt.value : opt;
            const isSelected = value === optValue;
            
            return (
              <div 
                key={idx}
                onClick={() => { onChange(optValue); setIsOpen(false); }}
                style={{
                  padding: '0.75rem 1rem', borderRadius: '8px', cursor: 'pointer',
                  color: isSelected ? '#10b981' : '#cbd5e1',
                  background: isSelected ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                  marginBottom: '0.2rem', transition: 'background 0.2s'
                }}
                onMouseOver={(e) => { if(!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                onMouseOut={(e) => { if(!isSelected) e.currentTarget.style.background = 'transparent' }}
              >
                {optLabel}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
