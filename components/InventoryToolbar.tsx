import React, { useMemo } from 'react';
import { InventoryItem } from '../types';
import MultiSelectDropdown from './MultiSelectDropdown';

interface InventoryToolbarProps {
  inventory: InventoryItem[];
  filters: {
    maSieuThi: string[];
    nganhHang: string[];
    nhomHang: string[];
    keyword: string;
  };
  useInventoryQuantity: boolean;
  onFilterChange: (key: string, value: string | string[]) => void;
  onClearFilters: () => void;
  onUseInventoryQuantityChange: (checked: boolean) => void;
}

const InventoryToolbar: React.FC<InventoryToolbarProps> = ({ 
  inventory, 
  filters, 
  useInventoryQuantity,
  onFilterChange,
  onClearFilters,
  onUseInventoryQuantityChange
}) => {
  const options = useMemo(() => {
    const maSieuThi = Array.from(new Set(inventory.map(item => item.maSieuThi))).sort();
    const nganhHang = Array.from(new Set(inventory.map(item => item.nganhHang))).sort();
    const nhomHang = Array.from(new Set(inventory.map(item => item.nhomHang))).sort();
    
    return { maSieuThi, nganhHang, nhomHang };
  }, [inventory]);

  if (inventory.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Bộ lọc tồn kho</h3>
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={useInventoryQuantity}
              onChange={(e) => onUseInventoryQuantityChange(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm font-medium text-slate-700">Tồn kho</span>
          </label>
        </div>
        <button 
          onClick={onClearFilters}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
        >
          Xóa bộ lọc
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MultiSelectDropdown
          label="Mã siêu thị"
          options={options.maSieuThi}
          selectedValues={filters.maSieuThi}
          onChange={(values) => onFilterChange('maSieuThi', values)}
          placeholder="Tất cả siêu thị"
        />

        <MultiSelectDropdown
          label="Ngành hàng"
          options={options.nganhHang}
          selectedValues={filters.nganhHang}
          onChange={(values) => onFilterChange('nganhHang', values)}
          placeholder="Tất cả ngành hàng"
        />

        <MultiSelectDropdown
          label="Nhóm hàng"
          options={options.nhomHang}
          selectedValues={filters.nhomHang}
          onChange={(values) => onFilterChange('nhomHang', values)}
          placeholder="Tất cả nhóm hàng"
        />
      </div>
    </div>
  );
};

export default InventoryToolbar;
