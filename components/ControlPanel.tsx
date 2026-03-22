import React, { useMemo } from 'react';
import { Product } from '../types';
import FileUpload from './FileUpload';
import SearchBar from './SearchBar';
import { PrintIcon, SettingsIcon, StarIcon, TagIcon, TrashIcon, ExportIcon, ImportIcon, PenSquareIcon, InventoryIcon, FilePlusIcon, UserIcon } from './Icons';
import { Trash2, ShieldAlert, Info } from 'lucide-react';

interface ControlPanelProps {
    employeeName: string;
    isEditingEmployeeName: boolean;
    searchQuery: string;
    suggestions: Product[];
    showNoResults: boolean;
    allProducts: Product[];
    displayedProducts: Product[];
    isLoading: boolean;
    fileName: string | null;
    isMobile: boolean;
    uploadTimestamp: Date | null;
    inventoryUploadTimestamp: Date | null;
    hasInventory: boolean;
    userRole?: 'admin' | 'staff';
    activeTab?: 'home' | 'tools';

    onEmployeeNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSaveEmployeeName: () => void;
    onEmployeeNameKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    onSetIsEditingEmployeeName: (isEditing: boolean) => void;
    onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onOpenScanner: () => void;
    onSuggestionClick: (product: Product) => void;
    onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onInventoryFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onDownloadSampleInventory: () => void;
    onShowTopBonus: () => void;
    onShowTopDiscount: () => void;
    onOpenManualInput: () => void;
    onReset: () => void;
    onClearAll: () => void;
    onTriggerImport: () => void;
    onExport: () => void;
    onOpenPrintSettings: () => void;
    onPrintSelected: () => void;
    onPrintAll: () => void;
    onOpenUserManagement?: () => void;
    onOpenSuperAdminTools?: () => void;
    onSaveList: () => void;
    onViewSavedLists: () => void;
    onOpenUserGuide?: () => void;
    showManagerInstructions?: boolean;
    onCloseInstructions?: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = (props) => {
    const selectedCount = useMemo(() => props.displayedProducts.filter(p => p.selected).length, [props.displayedProducts]);
    const isEmployeeNameEmpty = !props.employeeName || props.employeeName.trim() === '';
    const isAdmin = props.userRole === 'admin';
    
    return (
        <aside className={`w-full lg:w-96 lg:flex-shrink-0 bg-white p-6 rounded-xl shadow-sm border border-slate-200 self-start space-y-6 ${props.isMobile && props.activeTab === 'home' ? 'contents' : 'flex flex-col'}`}>
            <div className={`flex flex-col gap-4 ${props.isMobile && props.activeTab === 'home' ? 'hidden' : ''}`}>
                <div className="w-full">
                    <div className="flex items-center justify-between mb-1">
                        <label htmlFor="employee-name-input" className="block text-sm font-medium text-slate-700">
                            Thông tin người in <span className="text-red-500">*</span>
                        </label>
                        {isAdmin && (
                            <button 
                                onClick={props.onClearAll}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-full transition-colors flex items-center gap-1"
                                title="Xóa toàn bộ dữ liệu tồn kho và giá trên hệ thống"
                            >
                                <Trash2 className="h-4 w-4" />
                                <span className="text-xs font-medium">Xóa dữ liệu</span>
                            </button>
                        )}
                    </div>
                    {props.isEditingEmployeeName || !props.employeeName ? (
                        <div className="relative">
                            <input
                                id="employee-name-input"
                                type="text"
                                placeholder="Nhập tên/mã NV (Bắt buộc)"
                                value={props.employeeName}
                                onChange={props.onEmployeeNameChange}
                                onBlur={props.onSaveEmployeeName}
                                onKeyDown={props.onEmployeeNameKeyDown}
                                className={`w-full px-3 py-2 text-base border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${isEmployeeNameEmpty ? 'border-red-300 bg-red-50 placeholder-red-300' : 'border-slate-300'}`}
                                autoFocus={!props.employeeName}
                            />
                            {isEmployeeNameEmpty && (
                                <p className="absolute -bottom-5 left-0 text-[10px] text-red-500 font-medium">Cần nhập thông tin để tìm kiếm</p>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 h-10 px-1 border border-transparent">
                            <p className="font-bold text-lg text-slate-900 truncate" title={props.employeeName}>{props.employeeName}</p>
                            <button
                                onClick={() => props.onSetIsEditingEmployeeName(true)}
                                className="text-sm text-indigo-600 hover:underline focus:outline-none flex-shrink-0"
                            >
                                (Sửa)
                            </button>
                        </div>
                    )}
                </div>

                {isAdmin && (
                    <div className="pt-2 border-t border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-semibold text-slate-800">Nhập dữ liệu (Admin)</h3>
                            <div className="flex items-center gap-1">
                                <a 
                                    href="https://report.mwgroup.vn/home/dashboard/17" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-xs font-bold text-red-600 underline hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                                >
                                    Lấy File Tồn Kho
                                </a>
                                <button 
                                    onClick={props.onOpenUserGuide}
                                    className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                                    title="Xem hướng dẫn"
                                >
                                    <Info className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="relative">
                                <input
                                    type="file"
                                    id="inventory-file-input"
                                    onChange={props.onInventoryFileChange}
                                    accept=".xlsx, .xls"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    disabled={props.isLoading}
                                />
                                <label
                                    htmlFor="inventory-file-input"
                                    className={`flex flex-col items-center justify-center p-3 rounded-xl border border-dashed transition-all text-center h-full ${props.isLoading ? 'bg-slate-50 border-slate-200 cursor-not-allowed' : 'bg-indigo-50 border-indigo-200 hover:border-indigo-400 text-indigo-700'}`}
                                >
                                    <InventoryIcon className="h-6 w-6 mb-1" />
                                    <span className="text-xs font-semibold">Tải File Tồn Kho</span>
                                    {props.inventoryUploadTimestamp && (
                                        <span className="text-[10px] mt-1 opacity-80">
                                            {props.inventoryUploadTimestamp.toLocaleTimeString('vi-VN')}
                                        </span>
                                    )}
                                </label>
                            </div>
                            <div className="relative">
                                <input
                                    type="file"
                                    id="price-file-input"
                                    onChange={props.onFileChange}
                                    accept=".xlsx, .xls"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    disabled={props.isLoading}
                                    multiple
                                />
                                <label
                                    htmlFor="price-file-input"
                                    className={`flex flex-col items-center justify-center p-3 rounded-xl border border-dashed transition-all text-center h-full ${props.isLoading ? 'bg-slate-50 border-slate-200 cursor-not-allowed' : 'bg-emerald-50 border-emerald-200 hover:border-emerald-400 text-emerald-700'}`}
                                >
                                    <FilePlusIcon className="h-6 w-6 mb-1" />
                                    <span className="text-xs font-semibold">Tải File Bảng Giá</span>
                                    {props.uploadTimestamp && (
                                        <span className="text-[10px] mt-1 opacity-80">
                                            {props.uploadTimestamp.toLocaleTimeString('vi-VN')}
                                        </span>
                                    )}
                                </label>
                            </div>
                        </div>
                        {props.fileName && (
                            <p className="text-xs text-slate-500 truncate mt-2 text-center" title={props.fileName}>
                                Đã tải: {props.fileName}
                            </p>
                        )}
                    </div>
                )}

                {isAdmin && props.showManagerInstructions && (
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 relative animate-in fade-in slide-in-from-top-2 duration-500">
                        <button 
                            onClick={props.onCloseInstructions}
                            className="absolute top-2 right-2 text-indigo-400 hover:text-indigo-600"
                        >
                            <TrashIcon className="h-4 w-4" />
                        </button>
                        <h3 className="text-sm font-bold text-indigo-900 mb-2 flex items-center gap-2">
                            <ShieldAlert className="h-4 w-4" />
                            Hướng dẫn cho Quản lý
                        </h3>
                        <div className="space-y-3 text-[11px] leading-relaxed text-indigo-800">
                            <p><strong>Bước 1:</strong> Click vào <span className="text-red-600 font-bold">"Lấy file tồn kho"</span> &gt; Chọn các nhóm cần in giá: ĐGD, DCNB, Phụ Kiện &gt; Chọn siêu thị &gt; Chọn trạng thái MỚI &gt; Xem báo cáo &gt; Tải file về máy.</p>
                            <p><strong>Bước 2:</strong> Upload file vừa tải ở bước 1 vào mục <strong>"Tải File tồn kho"</strong>.</p>
                            <p><strong>Bước 3:</strong> Chờ dữ liệu xử lý =&gt; <span className="text-emerald-600 font-bold">File mẫu in giá sẽ tự động được tải xuống máy.</span></p>
                            <p><strong>Bước 4:</strong> Vào ERP &gt; In giá &gt; Chọn lần lượt từng ngành hàng (ĐGD, DCNB, Phụ kiện) &gt; Nhóm hàng chọn Tất cả &gt; Thêm sản phẩm &gt; Nhập Excel &gt; Chọn file mẫu vừa tải ở bước 3 &gt; Chọn mẫu in 81 &gt; In bảng giá &gt; Xuất file định dạng "Data-only(*.xlsx)". Sau khi làm xong cho tất cả ngành hàng, vào <strong>"Tải File bảng giá"</strong> chọn tất cả các file giá vừa xuất &gt; Bấm OK.</p>
                        </div>
                    </div>
                )}

                {(isAdmin || props.onOpenSuperAdminTools) && (
                    <div className="pt-2 border-t border-slate-200 space-y-2">
                        {isAdmin && props.onOpenUserManagement && (
                            <button 
                                onClick={props.onOpenUserManagement}
                                className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors text-sm font-semibold"
                            >
                                <UserIcon className="h-4 w-4" />
                                Quản lý người dùng
                            </button>
                        )}
                        {props.onOpenSuperAdminTools && (
                            <button 
                                onClick={props.onOpenSuperAdminTools}
                                className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors text-sm font-bold border border-red-100"
                            >
                                <ShieldAlert className="h-4 w-4" />
                                Super Admin Tools
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className={`${isEmployeeNameEmpty ? "opacity-60 pointer-events-none grayscale" : ""} ${props.isMobile ? "fixed bottom-14 left-0 right-0 p-2 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-40" : ""}`}>
                <SearchBar
                    searchQuery={props.searchQuery}
                    onSearchChange={props.onSearchChange}
                    onIconClick={props.onOpenScanner}
                    disabled={props.allProducts.length === 0 || props.isLoading || isEmployeeNameEmpty}
                    suggestions={props.suggestions}
                    onSuggestionClick={props.onSuggestionClick}
                    showNoResults={props.showNoResults}
                    isMobile={props.isMobile}
                />
            </div>

             {props.allProducts.length > 0 && !props.isLoading && (
                 <div className={`${props.isMobile && props.activeTab === 'home' ? 'hidden' : ''}`}>
                    <div className="pt-4 border-t border-slate-200">
                         <h3 className="text-base font-semibold text-slate-800 mb-3">Công cụ nhanh</h3>
                         <div className="grid grid-cols-2 gap-3">
                             <button onClick={props.onShowTopBonus} disabled={isEmployeeNameEmpty} title="Hiển thị tất cả sản phẩm có thưởng" className="inline-flex items-center gap-2 justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-slate-100 hover:text-slate-900 h-10 px-3 py-2 disabled:opacity-50">
                                <StarIcon className="h-4 w-4 text-amber-500" /> Top Thưởng
                            </button>
                            <button onClick={props.onShowTopDiscount} disabled={isEmployeeNameEmpty} title="Hiển thị tất cả sản phẩm có giảm giá" className="inline-flex items-center gap-2 justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-slate-100 hover:text-slate-900 h-10 px-3 py-2 disabled:opacity-50">
                                <TagIcon className="h-4 w-4 text-green-600" /> Top Giảm
                            </button>
                            <button onClick={props.onOpenManualInput} title="Nhập sản phẩm thủ công để in" className="inline-flex items-center gap-2 justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-slate-100 hover:text-slate-900 h-10 px-3 py-2 col-span-2">
                                <PenSquareIcon className="h-4 w-4 text-blue-600" /> Nhập sản phẩm thủ công
                            </button>
                         </div>
                    </div>
                    
                    <div className="pt-4 border-t border-slate-200">
                        <h3 className="text-base font-semibold text-slate-800 mb-3">Thao tác</h3>
                        <div className="flex items-center gap-2 mb-3">
                            <button onClick={props.onSaveList} disabled={props.displayedProducts.length === 0} title="Lưu danh sách hiện tại" className="flex-1 inline-flex items-center gap-2 justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-slate-100 hover:text-slate-900 h-9 px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                Lưu DS
                            </button>
                            <button onClick={props.onViewSavedLists} title="Xem danh sách đã lưu" className="flex-1 inline-flex items-center gap-2 justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-slate-100 hover:text-slate-900 h-9 px-3 py-2">
                                DS đã lưu
                            </button>
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                            <button onClick={props.onTriggerImport} title="Nhập danh sách sản phẩm từ file .json" className="flex-1 inline-flex items-center gap-2 justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-slate-100 hover:text-slate-900 h-9 px-3 py-2">
                                <ImportIcon className="h-4 w-4 text-slate-600" />
                                Nhập
                            </button>
                            <button onClick={props.onExport} disabled={props.displayedProducts.length === 0} title="Xuất danh sách sản phẩm hiện tại ra file .json" className="flex-1 inline-flex items-center gap-2 justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-slate-100 hover:text-slate-900 h-9 px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                <ExportIcon className="h-4 w-4 text-slate-600" />
                                Xuất
                            </button>
                            <button onClick={props.onReset} disabled={props.displayedProducts.length === 0} title="Xóa danh sách đang hiển thị" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-slate-100 hover:text-slate-900 h-9 w-9 p-0 disabled:opacity-50 disabled:cursor-not-allowed">
                                <TrashIcon className="h-4 w-4 text-slate-600" />
                            </button>
                             <button onClick={props.onOpenPrintSettings} title="Tùy chỉnh thông tin hiển thị trên sticker" className="inline-flex items-center gap-2 justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-slate-100 hover:text-slate-900 h-9 w-9 p-0">
                                <SettingsIcon className="h-4 w-4 text-slate-600" />
                            </button>
                        </div>
                        <div className="flex flex-col gap-3">
                            <button onClick={props.onPrintSelected} disabled={selectedCount === 0} className="w-full inline-flex items-center gap-2 justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-indigo-600 text-indigo-50 hover:bg-indigo-700 h-10 px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                <PrintIcon className="h-4 w-4" /> In đã chọn ({selectedCount})
                            </button>
                            <button onClick={props.onPrintAll} disabled={props.displayedProducts.length === 0} className="w-full inline-flex items-center gap-2 justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-indigo-600 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 h-10 px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                In tất cả ({props.displayedProducts.length})
                            </button>
                        </div>
                    </div>
                </div>
             )}
        </aside>
    );
};

export default ControlPanel;