import React, { useState, useMemo, useEffect } from 'react';
import { Product } from '../types';
import { parseCurrency } from '../services/fileParser';
import { XIcon, TrashIcon, MinusCircleIcon, PlusCircleIcon } from './Icons';

interface ManualInputModalProps {
    onPrint: (products: Product[]) => void;
    onClose: () => void;
    allProducts: Product[];
}

const formatCurrencyForDisplay = (value: number): string => {
    if (isNaN(value) || value === 0) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

const initialFormData = {
    sanPham: '',
    msp: '',
    giaGoc: '',
    giaGiam: '',
    thuongERP: '',
    thuongNong: '',
    khuyenMai: ''
};

interface InputFieldProps {
    name: keyof Omit<typeof initialFormData, 'khuyenMai'>;
    label: string;
    placeholder: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    error?: string;
    required?: boolean;
    type?: string;
    inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
}

// Define InputField outside of the main component to prevent re-creation on every render.
const InputField: React.FC<InputFieldProps> = ({ name, label, placeholder, value, onChange, error, required = false, type = 'text', inputMode }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-slate-700 mb-1">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <input
            type={type}
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            inputMode={inputMode}
            className={`w-full px-3 py-2 text-base border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${error ? 'border-red-500' : 'border-slate-300'}`}
        />
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
);


const ManualInputModal: React.FC<ManualInputModalProps> = ({ onPrint, onClose, allProducts }) => {
    const [manualProducts, setManualProducts] = useState<Product[]>([]);
    const [formData, setFormData] = useState(initialFormData);
    const [errors, setErrors] = useState<Partial<typeof formData>>({});
    
    const productMap = useMemo(() => new Map(allProducts.map(p => [p.msp, p])), [allProducts]);

    useEffect(() => {
        if (formData.msp && productMap.has(formData.msp)) {
            const product = productMap.get(formData.msp);
            if (product) {
                setFormData({
                    sanPham: product.sanPham,
                    msp: product.msp,
                    giaGoc: String(parseCurrency(product.giaGoc)),
                    giaGiam: String(parseCurrency(product.giaGiam)),
                    thuongERP: String(product.thuongERP),
                    thuongNong: String(product.thuongNong),
                    khuyenMai: product.khuyenMai
                });
            }
        }
    }, [formData.msp, productMap]);

    const tongThuong = useMemo(() => {
        const erp = parseCurrency(formData.thuongERP);
        const nong = parseCurrency(formData.thuongNong);
        return nong * 0.4 + erp;
    }, [formData.thuongERP, formData.thuongNong]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;

        const numericFields = new Set(['msp', 'giaGoc', 'giaGiam', 'thuongERP', 'thuongNong']);
        let processedValue = value;

        if (numericFields.has(name)) {
            // Allow only digits
            processedValue = value.replace(/\D/g, '');
        }

        // If the MSP field is being cleared, reset the entire form to prevent stale data.
        if (name === 'msp' && processedValue === '') {
            setFormData(initialFormData);
        } else {
            setFormData(prev => ({ ...prev, [name]: processedValue }));
        }

        if (errors[name as keyof typeof errors]) {
            setErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };

    const validate = (): boolean => {
        const newErrors: Partial<typeof formData> = {};
        if (!formData.sanPham.trim()) newErrors.sanPham = 'Tên sản phẩm là bắt buộc.';
        if (!formData.msp.trim()) newErrors.msp = 'Mã sản phẩm là bắt buộc.';
        if (!formData.giaGiam.trim()) newErrors.giaGiam = 'Giá bán là bắt buộc.';
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleAddProduct = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        const newProduct: Product = {
            sanPham: formData.sanPham.trim(),
            msp: formData.msp.trim(),
            giaGoc: formatCurrencyForDisplay(parseCurrency(formData.giaGoc)),
            giaGiam: formatCurrencyForDisplay(parseCurrency(formData.giaGiam)),
            khuyenMai: formData.khuyenMai.trim(),
            thuongERP: parseCurrency(formData.thuongERP),
            thuongNong: parseCurrency(formData.thuongNong),
            tongThuong: tongThuong,
            ngayIn: new Date().toLocaleDateString('vi-VN'),
            selected: false,
            quantity: 1,
        };

        setManualProducts(prev => [...prev, newProduct]);
        setFormData(initialFormData); // Reset form for next entry
        setErrors({});
    };

    const handleQuantityChange = (index: number, delta: number) => {
        setManualProducts(prev =>
            prev.map((p, i) =>
                i === index ? { ...p, quantity: Math.max(1, p.quantity + delta) } : p
            )
        );
    };

    const handleRemoveProduct = (index: number) => {
        setManualProducts(prev => prev.filter((_, i) => i !== index));
    };

    const handlePrint = () => {
        if (manualProducts.length > 0) {
            onPrint(manualProducts);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div 
                className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]" 
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 flex-shrink-0">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                        <h2 className="text-xl font-bold text-slate-900">Nhập thông tin sản phẩm thủ công</h2>
                        <button type="button" onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors" aria-label="Đóng">
                            <XIcon className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleAddProduct} className="p-6 pt-2 space-y-4 flex-shrink-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField name="sanPham" label="Tên sản phẩm" placeholder="Ví dụ: iPhone 15 Pro Max" required value={formData.sanPham} onChange={handleChange} error={errors.sanPham} />
                        <InputField name="msp" label="Mã sản phẩm (MSP)" placeholder="Ví dụ: 123456789" required value={formData.msp} onChange={handleChange} error={errors.msp} type="tel" inputMode="numeric" />
                        <InputField name="giaGoc" label="Giá gốc (nếu có)" placeholder="Nhập số, ví dụ: 34990000" value={formData.giaGoc} onChange={handleChange} error={errors.giaGoc} type="tel" inputMode="numeric" />
                        <InputField name="giaGiam" label="Giá bán" placeholder="Nhập số, ví dụ: 29990000" required value={formData.giaGiam} onChange={handleChange} error={errors.giaGiam} type="tel" inputMode="numeric" />
                        <InputField name="thuongERP" label="Thưởng ERP (nếu có)" placeholder="Nhập số, ví dụ: 50000" value={formData.thuongERP} onChange={handleChange} error={errors.thuongERP} type="tel" inputMode="numeric" />
                        <InputField name="thuongNong" label="Thưởng Nóng (nếu có)" placeholder="Nhập số, ví dụ: 100000" value={formData.thuongNong} onChange={handleChange} error={errors.thuongNong} type="tel" inputMode="numeric" />
                    </div>
                     <div>
                        <label htmlFor="khuyenMai" className="block text-sm font-medium text-slate-700 mb-1">
                            Khuyến mãi (nếu có)
                        </label>
                        <textarea
                            id="khuyenMai" name="khuyenMai" value={formData.khuyenMai} onChange={handleChange}
                            placeholder="Nội dung khuyến mãi..." rows={1}
                            className="w-full px-3 py-2 text-base border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                    <div className="flex justify-between items-center pt-2">
                        <div className="text-sm">
                            <span className="text-slate-600">Tổng thưởng tạm tính: </span>
                            <span className="font-bold text-violet-600">{formatCurrencyForDisplay(tongThuong)}</span>
                        </div>
                        <button type="submit" className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-blue-600 text-blue-50 hover:bg-blue-700 h-10 px-6 py-2">
                            Thêm sản phẩm
                        </button>
                    </div>
                </form>

                {manualProducts.length > 0 && (
                    <div className="flex-grow overflow-y-auto px-6 space-y-3 border-t border-slate-200 py-4">
                        {manualProducts.map((p, index) => (
                            <div key={index} className="flex items-center justify-between gap-4 p-3 bg-slate-50 rounded-lg">
                                <div className="flex-grow min-w-0">
                                    <p className="font-semibold text-slate-800 truncate">{p.sanPham}</p>
                                    <p className="text-xs text-slate-500">MSP: {p.msp}</p>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                    <button onClick={() => handleQuantityChange(index, -1)} disabled={p.quantity <= 1} className="text-slate-400 hover:text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors" title="Giảm số lượng">
                                        <MinusCircleIcon className="h-6 w-6" />
                                    </button>
                                    <span className="font-bold text-lg text-slate-800 w-8 text-center">{p.quantity}</span>
                                    <button onClick={() => handleQuantityChange(index, 1)} className="text-slate-400 hover:text-slate-600 transition-colors" title="Tăng số lượng">
                                        <PlusCircleIcon className="h-6 w-6" />
                                    </button>
                                </div>
                                <button onClick={() => handleRemoveProduct(index)} className="p-1 text-slate-400 hover:text-red-600 transition-colors" title="Xóa sản phẩm">
                                    <TrashIcon className="h-5 w-5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                
                <div className="p-6 flex justify-end items-center gap-3 border-t border-slate-200 flex-shrink-0">
                    <button type="button" onClick={onClose} className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-slate-100 h-10 px-4 py-2">
                        Hủy
                    </button>
                    <button type="button" onClick={handlePrint} disabled={manualProducts.length === 0} className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-indigo-600 text-indigo-50 hover:bg-indigo-700 h-10 px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        In Sticker ({manualProducts.reduce((acc, p) => acc + p.quantity, 0)})
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ManualInputModal;