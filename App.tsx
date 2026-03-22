
import React, { useState, useCallback, useEffect, useRef, Component } from 'react';
import { Product, InventoryItem } from './types';
import { PrintSettings, defaultModernPositions, ModernLayoutPositions } from './services/printService';
import { parseProductFile, saveData, loadData, clearData, saveEmployeeName, parseCurrency, saveDisplayedProducts, parseInventoryFile, saveInventoryData } from './services/fileParser';
import { uploadProductsToFirestore, uploadInventoryToFirestore, fetchProductsFromFirestore, fetchInventoryFromFirestore, saveListToFirestore, saveUserState, fetchUserState } from './services/firebaseService';
import { printPriceTags } from './services/printService';
import * as XLSX from 'xlsx';
import ResultsDisplay from './components/ResultsDisplay';
import { LogoIcon, CheckCircleIcon, WarningIcon } from './components/Icons';
import Scanner from './components/Scanner';
import PrintSettingsModal from './components/PrintSettingsModal';
import LayoutSelectionModal from './components/LayoutSelectionModal';
import ManualInputModal from './components/ManualInputModal';
import ControlPanel from './components/ControlPanel';
import PdfPreviewModal from './components/PdfPreviewModal';
import InventoryToolbar from './components/InventoryToolbar';
import FilterModal from './components/FilterModal';
import BottomNavigation from './components/BottomNavigation';
import Login from './components/Login';
import UserManagementModal from './components/UserManagementModal';
import ChangePasswordModal from './components/ChangePasswordModal';
import SavedListsModal from './components/SavedListsModal';
import SaveListModal from './components/SaveListModal';
import AlertModal from './components/AlertModal';
import SuperAdminModal from './components/SuperAdminModal';
import UserGuideModal from './components/UserGuideModal';
import { Info, ShieldAlert } from 'lucide-react';
import { User } from 'firebase/auth';
import { auth, db } from './firebase';
import { collection, query, where, getDocs, limit, orderBy, doc, getDoc } from 'firebase/firestore';
import { clearStoreDataOnFirestore, validateConnection } from './services/firebaseService';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let displayMessage = "Đã xảy ra lỗi không mong muốn.";
      try {
        const errObj = JSON.parse(this.state.error.message);
        if (errObj.error) displayMessage = `Lỗi Firestore: ${errObj.error} (${errObj.operationType} at ${errObj.path})`;
      } catch (e) {
        displayMessage = this.state.error?.message || displayMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
          <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-red-100">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-4 mx-auto">
              <WarningIcon className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 text-center mb-2">Rất tiếc, đã có lỗi xảy ra</h2>
            <p className="text-slate-600 text-center mb-6">{displayMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              Tải lại trang
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App(): React.JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [inventoryFilters, setInventoryFilters] = useState<{
    maSieuThi: string[];
    nganhHang: string[];
    nhomHang: string[];
    keyword: string;
  }>({
    maSieuThi: [],
    nganhHang: [],
    nhomHang: [],
    keyword: ''
  });
  const [useInventoryQuantity, setUseInventoryQuantity] = useState(false);
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [showNoResults, setShowNoResults] = useState(false);
  const [uploadTimestamp, setUploadTimestamp] = useState<Date | null>(null);
  const [inventoryUploadTimestamp, setInventoryUploadTimestamp] = useState<Date | null>(null);
  const [fileExportDate, setFileExportDate] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [duplicateError, setDuplicateError] = useState<boolean>(false);
  const [highlightedMsp, setHighlightedMsp] = useState<string | null>(null);
  const [employeeName, setEmployeeName] = useState('');
  const [isEditingEmployeeName, setIsEditingEmployeeName] = useState(false);
  const debounceTimeout = useRef<number | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isClearAllConfirmOpen, setIsClearAllConfirmOpen] = useState(false);
  const [showManagerInstructions, setShowManagerInstructions] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'tools'>('home');
  const [isSavedListsModalOpen, setIsSavedListsModalOpen] = useState(false);
  const [isSaveListModalOpen, setIsSaveListModalOpen] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean; message: string; title?: string }>({
    isOpen: false,
    message: '',
    title: 'Thông báo'
  });

  const showAlert = (message: string, title: string = "Thông báo") => {
    setAlertConfig({ isOpen: true, message, title });
  };

  useEffect(() => {
    setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
  }, []);

  const [isPrintSettingsOpen, setIsPrintSettingsOpen] = useState(false);
  const [modernPositions, setModernPositions] = useState<ModernLayoutPositions>(() => {
    const saved = localStorage.getItem('modernPositions');
    return saved ? JSON.parse(saved) : defaultModernPositions;
  });

  useEffect(() => {
    localStorage.setItem('modernPositions', JSON.stringify(modernPositions));
  }, [modernPositions]);

  const [printSettings, setPrintSettings] = useState<PrintSettings>(() => {
    // Default settings with all options enabled.
    const masterDefaults: PrintSettings = {
        showOriginalPrice: true,
        showPromotion: true,
        showBonus: true,
        showQrCode: true,
        showEmployeeName: true,
        sortByName: true,
        shortenPrice: true,
        tagsPerPage: 4, // Default layout if nothing is saved
        customFontData: null,
        customFontName: null,
        customSecondaryFontData: null,
        customSecondaryFontName: null,
        stickerStyle: 'default'
    };

    try {
        const savedSettingsJSON = localStorage.getItem('printSettings');
        if (savedSettingsJSON) {
            const savedSettings = JSON.parse(savedSettingsJSON);
            // Override all boolean settings with master defaults, but keep saved layout and font info.
            return {
                ...masterDefaults,
                shortenPrice: typeof savedSettings.shortenPrice === 'boolean' ? savedSettings.shortenPrice : masterDefaults.shortenPrice,
                tagsPerPage: savedSettings.tagsPerPage || masterDefaults.tagsPerPage,
                customFontData: savedSettings.customFontData || null,
                customFontName: savedSettings.customFontName || null,
                customSecondaryFontData: savedSettings.customSecondaryFontData || null,
                customSecondaryFontName: savedSettings.customSecondaryFontName || null,
                stickerStyle: savedSettings.stickerStyle || 'default'
            };
        }
    } catch (e) {
        console.error("Could not load print settings from localStorage", e);
    }
    
    // Return master defaults for a new session.
    return masterDefaults;
  });
  
  const [isLayoutModalOpen, setIsLayoutModalOpen] = useState(false);
  const [printAction, setPrintAction] = useState<'selected' | 'all' | 'manual' | null>(null);
  const [productToPrint, setProductToPrint] = useState<Product | null>(null);
  const [productsForPrintingSession, setProductsForPrintingSession] = useState<Product[]>([]);
  const [isManualInputOpen, setIsManualInputOpen] = useState(false);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [isSuperAdminModalOpen, setIsSuperAdminModalOpen] = useState(false);
  const [isUserGuideOpen, setIsUserGuideOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  useEffect(() => {
    try {
        localStorage.setItem('printSettings', JSON.stringify(printSettings));
    } catch (e) {
        console.error("Could not save print settings to localStorage", e);
    }
  }, [printSettings]);

  useEffect(() => {
    const initializeApp = async () => {
      // Load local settings first (employee name, etc.)
      const savedData = await loadData();
      
      // Load user-specific state from Firestore
      let userState = null;
      if (user) {
        userState = await fetchUserState(user.uid);
      }

      if (savedData) {
        // Prefer Firestore state for displayedProducts if it exists
        if (userState && userState.displayedProducts) {
          setDisplayedProducts(userState.displayedProducts);
        } else if (user) {
          // If logged in but no Firestore state AND we are initializing for a new user,
          // we MUST clear the local state to prevent data leak from previous session
          setDisplayedProducts([]);
          setAllProducts([]);
          setInventory([]);
        } else {
          setDisplayedProducts(savedData.displayedProducts || []);
        }

        // Apply inventory filters from Firestore if they exist
        if (userState && userState.inventoryFilters) {
          setInventoryFilters(userState.inventoryFilters);
        }

        if(savedData.fileInfo && savedData.fileInfo.fileName) {
          const savedFileNames = savedData.fileInfo.fileName;
          const fileList = savedFileNames.split(',').map(f => f.trim()).filter(Boolean);
          if (fileList.length > 1) {
              setFileName(`${fileList.length} tệp đã được tải lên`);
          } else {
              setFileName(savedFileNames);
          }
          setUploadTimestamp(savedData.fileInfo.uploadTimestamp ? new Date(savedData.fileInfo.uploadTimestamp) : null);
          setFileExportDate(savedData.fileInfo.fileExportDate);
        }
        setInventoryUploadTimestamp(savedData.inventoryUploadTimestamp ? new Date(savedData.inventoryUploadTimestamp) : null);
        
        // Default employee name to username or email if available
        let defaultName = userData?.username || '';
        if (defaultName === '21707' || defaultName === 'lts.truongson') {
            defaultName = ''; // Force Super Admin to enter their name
        } else if (!defaultName && userData?.email) {
            defaultName = userData.email.split('@')[0];
        }
        
        const name = defaultName || savedData.employeeName || '';
        setEmployeeName(name);
        if (!name) {
          setIsEditingEmployeeName(true);
        }
      } else {
        // New user or cleared local data
        setDisplayedProducts([]);
        
        let defaultName = userData?.username || '';
        if (defaultName === '21707' || defaultName === 'lts.truongson') {
            defaultName = '';
        } else if (!defaultName && userData?.email) {
            defaultName = userData.email.split('@')[0];
        }
        setEmployeeName(defaultName);
        setIsEditingEmployeeName(!defaultName);
      }

      // Load data from Firestore if user is logged in
      if (user && userData && userData.storeId) {
        loadFirestoreData(userData.storeId);
        // Show instructions for managers if they have no data
        if (userData.role === 'admin' && allProducts.length === 0 && inventory.length === 0) {
          setShowManagerInstructions(true);
        }
      } else {
        setIsInitializing(false);
      }
    };
    
    if (user) {
        initializeApp();
    } else {
        setIsInitializing(false);
    }
  }, [user, userData]);

  const loadFirestoreData = async (storeId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Verify store has an admin (for Staff users)
      if (userData?.role === 'staff') {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('storeId', '==', storeId), where('role', '==', 'admin'), limit(1));
        
        let adminCheckSnapshot;
        let retries = 3;
        while (retries > 0) {
            try {
                adminCheckSnapshot = await getDocs(q);
                break;
            } catch (err: any) {
                console.warn(`Lỗi kiểm tra admin (còn ${retries - 1} lần thử):`, err);
                retries--;
                if (retries === 0) throw err;
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        if (adminCheckSnapshot!.empty) {
          setError(`Mã kho "${storeId}" hiện không có Quản trị viên quản lý. Bạn không thể xem dữ liệu.`);
          setAllProducts([]);
          setInventory([]);
          setIsLoading(false);
          setIsInitializing(false);
          return;
        }
      }

      // Smart Sync: Check metadata for latest update timestamps (Only 2 reads total)
      const productMetaRef = doc(db, 'stores', storeId, 'metadata', 'products');
      const inventoryMetaRef = doc(db, 'stores', storeId, 'metadata', 'inventory');
      
      let prodMetaSnap, invMetaSnap;
      let retries = 3;
      while (retries > 0) {
          try {
              [prodMetaSnap, invMetaSnap] = await Promise.all([
                  getDoc(productMetaRef),
                  getDoc(inventoryMetaRef)
              ]);
              break;
          } catch (err: any) {
              console.warn(`Lỗi tải metadata (còn ${retries - 1} lần thử):`, err);
              retries--;
              if (retries === 0) throw err;
              await new Promise(resolve => setTimeout(resolve, 1000));
          }
      }

      // We know prodMetaSnap and invMetaSnap are defined here because if it failed completely it would have thrown
      const firestoreLatestProducts = prodMetaSnap!.exists() ? prodMetaSnap!.data().lastUpdated?.toMillis() || 0 : 0;
      const firestoreLatestInv = invMetaSnap!.exists() ? invMetaSnap!.data().lastUpdated?.toMillis() || 0 : 0;

      // Compare with local timestamps
      const localLatestProducts = uploadTimestamp?.getTime() || 0;
      const localLatestInv = inventoryUploadTimestamp?.getTime() || 0;

      const shouldFetchProducts = firestoreLatestProducts > localLatestProducts || allProducts.length === 0;
      const shouldFetchInventory = firestoreLatestInv > localLatestInv || inventory.length === 0;

      if (shouldFetchProducts || shouldFetchInventory) {
          const fetchPromises = [];
          if (shouldFetchProducts) fetchPromises.push(fetchProductsFromFirestore(storeId));
          else fetchPromises.push(Promise.resolve(allProducts));

          if (shouldFetchInventory) fetchPromises.push(fetchInventoryFromFirestore(storeId));
          else fetchPromises.push(Promise.resolve(inventory));

          const [firestoreProducts, firestoreInventory] = await Promise.all(fetchPromises);
          
          if (shouldFetchProducts && firestoreProducts.length > 0) {
              setAllProducts(firestoreProducts);
              if (firestoreLatestProducts > 0) setUploadTimestamp(new Date(firestoreLatestProducts));
              // Save to local IndexedDB
              saveData(firestoreProducts, {
                  fileName: fileName || 'Dữ liệu từ server',
                  uploadTimestamp: new Date(firestoreLatestProducts),
                  fileExportDate: fileExportDate
              });
          }

          if (shouldFetchInventory && firestoreInventory.length > 0) {
              setInventory(firestoreInventory);
              if (firestoreLatestInv > 0) setInventoryUploadTimestamp(new Date(firestoreLatestInv));
              // Save to local IndexedDB
              saveInventoryData(firestoreInventory, new Date(firestoreLatestInv));
          }
      } else {
          // Data is already up to date locally
          if (firestoreLatestProducts > 0) setUploadTimestamp(new Date(firestoreLatestProducts));
          if (firestoreLatestInv > 0) setInventoryUploadTimestamp(new Date(firestoreLatestInv));
      }

    } catch (err: any) {
      console.error("Error loading from Firestore:", err);
      let displayError = "Lỗi tải dữ liệu từ server. Vui lòng kiểm tra kết nối mạng hoặc quyền truy cập.";
      try {
        const errObj = JSON.parse(err.message);
        if (errObj.error) {
          displayError = `Lỗi hệ thống: ${errObj.error}`;
          if (errObj.error.includes('insufficient permissions')) {
            displayError = "Bạn không có quyền truy cập dữ liệu của kho này. Vui lòng liên hệ Admin để kiểm tra quyền hạn.";
          } else if (errObj.error.includes('Quota exceeded')) {
            displayError = "Hệ thống đã hết hạn mức truy cập miễn phí trong ngày. Vui lòng quay lại vào ngày mai hoặc nâng cấp gói dịch vụ.";
          }
        }
      } catch (e) {
        if (err.message) displayError = err.message;
      }
      setError(displayError);
    } finally {
      setIsLoading(false);
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    // Do not save to DB during initial load, wait for data to be restored first.
    if (!isInitializing) {
      saveDisplayedProducts(displayedProducts);
      
      // Save user state to Firestore
      if (user) {
        saveUserState(user.uid, {
          displayedProducts,
          inventoryFilters
        });
      }
    }
  }, [displayedProducts, inventoryFilters, isInitializing, user]);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (userData?.role !== 'admin') {
        showAlert("Chỉ quản trị viên mới có quyền tải file bảng giá.");
        return;
    }

    const files = event.target.files;
    if (files && files.length > 0) {
      setIsLoading(true);
      setError(null);
      // We don't necessarily want to clear inventory when loading products, 
      // but the user might want a fresh start. 
      // For now, let's keep inventory unless explicitly cleared.
      // await clearData(); 
      setAllProducts([]);
      setDisplayedProducts([]);
      setFileName(null);
      setSearchQuery('');
      setUploadTimestamp(null);
      setFileExportDate(null);
      
      try {
        let latestExportDate: string | null = null;
        const fileNames: string[] = [];
        const productMap = new Map<string, Product>();
        let partialError = null;

        // Auto-clear old data for admin
        if (userData && userData.storeId) {
            await clearStoreDataOnFirestore(userData.storeId, 'products');
        }

        // Iterate directly over the FileList. `for...of` is supported and preserves the `File` type.
        for (const file of files) {
          fileNames.push(file.name);
          try {
            const { products, exportDate } = await parseProductFile(file);
            for (const product of products) {
              if (!productMap.has(product.msp)) {
                productMap.set(product.msp, product);
              }
            }
            if (!latestExportDate || (exportDate && exportDate > latestExportDate)) {
              latestExportDate = exportDate;
            }
          } catch (fileParseError) {
            console.error(`Lỗi khi xử lý tệp ${file.name}:`, fileParseError);
            partialError = `Lỗi khi xử lý tệp '${file.name}'. Các tệp hợp lệ khác đã được tải lên.`;
          }
        }

        const combinedProducts = Array.from(productMap.values());
        if (combinedProducts.length === 0 && partialError) {
            setError(partialError || 'Không có sản phẩm nào được tải lên. Vui lòng kiểm tra lại định dạng tệp.');
            setIsLoading(false);
            if (event.target) event.target.value = '';
            return;
        } else if (partialError) {
            setError(partialError);
        }

        const newUploadTimestamp = new Date();
        setAllProducts(combinedProducts);

        const fileNamesForStorage = fileNames.join(', ');
        let displayFileName: string | null = null;
        if (fileNames.length === 1) {
            displayFileName = fileNames[0];
        } else if (fileNames.length > 1) {
            displayFileName = `${fileNames.length} tệp đã được tải lên`;
        }
        setFileName(displayFileName);
        
        setUploadTimestamp(newUploadTimestamp);
        setFileExportDate(latestExportDate);
        
        // Save to Local IndexedDB
        await saveData(combinedProducts, {
          fileName: fileNamesForStorage,
          uploadTimestamp: newUploadTimestamp,
          fileExportDate: latestExportDate
        });

        // Upload to Firestore
        if (userData && userData.storeId) {
            await uploadProductsToFirestore(userData.storeId, combinedProducts);
        }

      } catch (err) {
        setError('Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.');
        console.error(err);
      } finally {
        setIsLoading(false);
        if (event.target) {
            event.target.value = '';
        }
      }
    }
  }, [userData]);
  
  const handleDownloadSampleInventory = useCallback((itemsToUse?: InventoryItem[]) => {
    const targetInventory = itemsToUse || inventory;
    if (targetInventory.length === 0) return;

    // Group inventory by nganhHang
    const groupedByNganhHang = targetInventory.reduce((acc, item) => {
      const nganhHang = item.nganhHang || 'Khong_xac_dinh';
      if (!acc[nganhHang]) {
        acc[nganhHang] = [];
      }
      if (item.maSanPham) {
        acc[nganhHang].push(item.maSanPham);
      }
      return acc;
    }, {} as Record<string, string[]>);

    // Create and download a file for each nganhHang
    const downloadFiles = async () => {
      const entries = Object.entries(groupedByNganhHang) as [string, string[]][];
      for (let i = 0; i < entries.length; i++) {
        const [nganhHang, maSanPhams] = entries[i];
        if (maSanPhams.length === 0) continue;

        // Deduplicate maSanPham for each file
        const uniqueMaSanPhams = Array.from(new Set(maSanPhams));

        const wb = XLSX.utils.book_new();
        
        const data = [['Mã sản phẩm']];
        uniqueMaSanPhams.forEach(msp => {
          data.push([msp]);
        });

        const ws = XLSX.utils.aoa_to_sheet(data);
        
        // Format all cells in the first column as text
        const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
        for (let R = range.s.r; R <= range.e.r; ++R) {
          const cellAddress = XLSX.utils.encode_cell({ c: 0, r: R });
          if (!ws[cellAddress]) continue;
          ws[cellAddress].t = 's'; // Set type to string
          ws[cellAddress].z = '@'; // Set format to text
        }

        XLSX.utils.book_append_sheet(wb, ws, 'Sample');
        
        // Sanitize filename to remove invalid characters
        const safeFileName = nganhHang.replace(/[/\\?%*:|"<>]/g, '-');
        
        // Generate Excel file and trigger download
        XLSX.writeFile(wb, `${safeFileName}.xls`, { bookType: 'biff8' });

        // Add a small delay to prevent browser from blocking multiple downloads
        if (i < entries.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
    };

    downloadFiles();
  }, [inventory]);

  const handleInventoryFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (userData?.role !== 'admin') {
        showAlert("Chỉ quản trị viên mới có quyền tải file tồn kho.");
        return;
    }

    const file = event.target.files?.[0];
    if (file) {
      setIsLoading(true);
      setError(null);
      try {
        // Auto-clear old data for admin
        if (userData && userData.storeId) {
            await clearStoreDataOnFirestore(userData.storeId, 'inventory');
        }

        const items = await parseInventoryFile(file);
        const newTimestamp = new Date();
        setInventory(items);
        setInventoryUploadTimestamp(newTimestamp);
        
        // Save to Local IndexedDB
        await saveInventoryData(items, newTimestamp);

        // Upload to Firestore
        if (userData && userData.storeId) {
            await uploadInventoryToFirestore(userData.storeId, items);
        }

        setError(null);
        
        // Auto-download template after processing
        setTimeout(() => {
            handleDownloadSampleInventory(items);
        }, 500);

      } catch (err) {
        setError('Lỗi khi xử lý file tồn kho. Vui lòng kiểm tra định dạng file.');
        console.error(err);
      } finally {
        setIsLoading(false);
        if (event.target) event.target.value = '';
      }
    }
  }, [userData, handleDownloadSampleInventory]);

  const handleInventoryFilterChange = useCallback((key: string, value: string | string[]) => {
    setInventoryFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleClearInventoryFilters = useCallback(() => {
    setInventoryFilters({
      maSieuThi: [],
      nganhHang: [],
      nhomHang: [],
      keyword: ''
    });
  }, []);

  // Effect to apply inventory filters
  useEffect(() => {
    const { maSieuThi, nganhHang, nhomHang, keyword } = inventoryFilters;
    
    // If no filters are active, don't auto-update displayedProducts 
    // (unless we want to show everything, but that's usually too much)
    if (maSieuThi.length === 0 && nganhHang.length === 0 && nhomHang.length === 0 && !keyword) {
      return;
    }

    const filteredInventory = inventory.filter(item => {
      const keywordLower = keyword.toLowerCase();
      return (
        (maSieuThi.length === 0 || maSieuThi.includes(item.maSieuThi)) &&
        (nganhHang.length === 0 || nganhHang.includes(item.nganhHang)) &&
        (nhomHang.length === 0 || nhomHang.includes(item.nhomHang)) &&
        (!keyword || 
          item.maSanPham.toLowerCase().includes(keywordLower) || 
          item.tenSanPham.toLowerCase().includes(keywordLower)
        )
      );
    });

    const inventoryMap = new Map(filteredInventory.map(item => [item.maSanPham, item.tongSoLuong]));

    const matchingMsps = new Set(filteredInventory.map(item => item.maSanPham));
    const matchingProducts = allProducts
      .filter(p => matchingMsps.has(p.msp))
      .map(p => ({ 
          ...p, 
          selected: false, 
          quantity: useInventoryQuantity ? (inventoryMap.get(p.msp) || 1) : 1 
      }));

    setDisplayedProducts(matchingProducts);
  }, [inventoryFilters, inventory, allProducts]); // Removed useInventoryQuantity from here

  const handleUseInventoryQuantityChange = useCallback((checked: boolean) => {
    setUseInventoryQuantity(checked);
    setDisplayedProducts(prev => {
      const inventoryMap = new Map(inventory.map(item => [item.maSanPham, item.tongSoLuong]));
      return prev.map(p => ({
        ...p,
        quantity: checked ? (inventoryMap.get(p.msp) || 1) : 1
      }));
    });
  }, [inventory]);

  const handleEmployeeNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmployeeName(e.target.value);
  };
  
  const handleSaveEmployeeName = useCallback(() => {
    const trimmedName = employeeName.trim();
    setEmployeeName(trimmedName);
    saveEmployeeName(trimmedName);
    if (trimmedName) {
      setIsEditingEmployeeName(false);
    }
  }, [employeeName]);
  
  const handleEmployeeNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      setSuggestions([]);
      setShowNoResults(false);
      return;
    }

    debounceTimeout.current = window.setTimeout(() => {
      const filteredSuggestions = allProducts.filter(p =>
        p.msp?.trim().toLowerCase().includes(query) ||
        p.sanPham?.trim().toLowerCase().includes(query)
      ).slice(0, 10);
      
      setSuggestions(filteredSuggestions);
      setShowNoResults(query.length > 0 && filteredSuggestions.length === 0);
    }, 200);

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [searchQuery, allProducts]);

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setDuplicateError(false);
    setShowNoResults(false);
  };
  
  const handleSuggestionClick = (product: Product) => {
    setDuplicateError(false);
    const existingMspSet = new Set(displayedProducts.map(p => p.msp));
    
    if (existingMspSet.has(product.msp)) {
        setDuplicateError(true);
        const mspToHighlight = product.msp;
        setHighlightedMsp(mspToHighlight);
        
        const element = document.querySelector(`[data-msp="${mspToHighlight}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        setTimeout(() => {
            setHighlightedMsp(null);
        }, 2000);
    } else {
        const inventoryItem = inventory.find(item => item.maSanPham === product.msp);
        const qty = useInventoryQuantity && inventoryItem ? inventoryItem.tongSoLuong : 1;
        setDisplayedProducts(prevProducts => [{...product, selected: false, quantity: qty}, ...prevProducts]);
    }
    setSearchQuery('');
    setSuggestions([]);
    setShowNoResults(false);
  };

  const handleScanSuccess = (scannedCode: string): boolean => {
    const product = allProducts.find(p => p.msp === scannedCode);

    if (!product) {
      return false; // Product not found in the master list
    }

    setDisplayedProducts(prevProducts => {
      const existingProductIndex = prevProducts.findIndex(p => p.msp === scannedCode);

      if (existingProductIndex > -1) {
        // Product exists, increment quantity
        const newProducts = [...prevProducts]; // Create a copy
        const existingProduct = newProducts[existingProductIndex];
        newProducts[existingProductIndex] = { ...existingProduct, quantity: existingProduct.quantity + 1 };
        return newProducts;
      } else {
        // Product does not exist, add it to the top
        const inventoryItem = inventory.find(item => item.maSanPham === product.msp);
        const qty = useInventoryQuantity && inventoryItem ? inventoryItem.tongSoLuong : 1;
        return [{ ...product, selected: false, quantity: qty }, ...prevProducts];
      }
    });
    
    return true;
  };

  const handleToggleSelect = (msp: string) => {
    setDisplayedProducts(prev =>
      prev.map(p => (p.msp === msp ? { ...p, selected: !p.selected } : p))
    );
  };

  const handleQuantityChange = (msp: string, delta: number) => {
    setDisplayedProducts(prev =>
      prev.map(p =>
        p.msp === msp
          ? { ...p, quantity: Math.max(1, p.quantity + delta) }
          : p
      )
    );
  };

  const handleSetQuantity = (msp: string, newQuantity: number) => {
    const qty = Math.max(1, Math.floor(newQuantity));
    setDisplayedProducts(prev =>
      prev.map(p => (p.msp === msp ? { ...p, quantity: qty } : p))
    );
  };

  const handlePrintSingle = (product: Product) => {
    setProductToPrint(product);
    setIsLayoutModalOpen(true);
  };

  const handlePrintSelected = () => {
    const selectedProducts = displayedProducts.filter(p => p.selected);
    if (selectedProducts.length > 0) {
      setPrintAction('selected');
      setIsLayoutModalOpen(true);
    }
  };

  const handlePrintAll = () => {
    if (displayedProducts.length > 0) {
      setPrintAction('all');
      setIsLayoutModalOpen(true);
    }
  };
  
  const executePrint = async (tagsPerPage: PrintSettings['tagsPerPage']) => {
    const settingsWithLayout = { ...printSettings, tagsPerPage };
    let productsToPrint: Product[] = [];
  
    if (productToPrint) {
      productsToPrint = [productToPrint];
    } else if (printAction === 'all') {
      productsToPrint = displayedProducts;
    } else if (printAction === 'selected') {
      productsToPrint = displayedProducts.filter(p => p.selected);
    } else if (printAction === 'manual') {
      productsToPrint = productsForPrintingSession;
    }
  
    if (settingsWithLayout.sortByName) {
      productsToPrint = [...productsToPrint].sort((a, b) => 
        a.sanPham.localeCompare(b.sanPham, 'vi', { sensitivity: 'base' })
      );
    }
  
    if (productsToPrint.length > 0) {
        setIsPrinting(true);
      try {
        const result = await printPriceTags(productsToPrint, employeeName, settingsWithLayout);
        if (typeof result === 'string') {
          setPdfPreviewUrl(result);
        }
      } catch (e) {
        console.error(e);
        setError("Không thể tạo tệp. Vui lòng thử lại.");
      } finally {
        setIsPrinting(false);
      }
    }
  
    setIsLayoutModalOpen(false);
    setPrintAction(null);
    setProductToPrint(null); // Reset
    setProductsForPrintingSession([]);
  };

  const handleShowTopBonus = useCallback(() => {
    const inventoryMap = new Map(inventory.map(item => [item.maSanPham, item.tongSoLuong]));
    const sortedProducts: Product[] = allProducts.slice()
        .filter((p): p is Product => !!(p && p.msp))
        .sort((a, b) => b.tongThuong - a.tongThuong)
        .map((p): Product => ({...p, selected: false, quantity: useInventoryQuantity ? (inventoryMap.get(p.msp) || 1) : 1}));
    setDisplayedProducts(sortedProducts);
  }, [allProducts, inventory, useInventoryQuantity]);

  const handleShowTopDiscount = useCallback(() => {
      const inventoryMap = new Map(inventory.map(item => [item.maSanPham, item.tongSoLuong]));
      const sortedProducts: Product[] = allProducts.slice()
        .filter((p): p is Product => !!(p && p.msp))
        .sort((a, b) => {
            const discountA = parseCurrency(a.giaGoc) - parseCurrency(a.giaGiam);
            const discountB = parseCurrency(b.giaGoc) - parseCurrency(b.giaGiam);
            return discountB - discountA;
        })
        .map((p): Product => ({...p, selected: false, quantity: useInventoryQuantity ? (inventoryMap.get(p.msp) || 1) : 1}));
      setDisplayedProducts(sortedProducts);
  }, [allProducts, inventory, useInventoryQuantity]);

  const executeReset = useCallback(async () => {
    setDisplayedProducts([]); // Direct update to empty array
    saveDisplayedProducts([]);
    setSearchQuery('');
    setSuggestions([]);
    setShowNoResults(false);
    setDuplicateError(false);
    setError(null);
    setIsResetConfirmOpen(false);
  }, []);

  const executeClearAll = useCallback(async () => {
    setIsLoading(true);
    try {
        if (userData && userData.storeId) {
            await Promise.all([
                clearStoreDataOnFirestore(userData.storeId, 'products'),
                clearStoreDataOnFirestore(userData.storeId, 'inventory')
            ]);
        }
        setAllProducts([]);
        setInventory([]);
        setDisplayedProducts([]);
        setFileName(null);
        setUploadTimestamp(null);
        setInventoryUploadTimestamp(null);
        setFileExportDate(null);
        await clearData();
        showAlert("Đã xóa toàn bộ dữ liệu tồn kho và giá.");
    } catch (err) {
        console.error(err);
        setError("Lỗi khi xóa dữ liệu hệ thống.");
    } finally {
        setIsLoading(false);
        setIsClearAllConfirmOpen(false);
    }
  }, [userData]);

  const handleReset = () => {
    setIsResetConfirmOpen(true);
  };

  const handleClearAll = () => {
    setIsClearAllConfirmOpen(true);
  };

  const handleExport = () => {
    if (displayedProducts.length === 0) return;

    const dataToExport = {
        employeeName: employeeName,
        products: displayedProducts.map(p => ({
            msp: p.msp,
            quantity: p.quantity,
        })),
    };

    const jsonString = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Create custom filename: [Employee Name] - Danh_sach_san_pham_[Date]_[Time].json
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    
    const dateTimeStr = `${day}-${month}-${year}_${hour}-${minute}`;
    const safeEmployeeName = employeeName.trim() || 'Khong_ten';
    
    link.download = `${safeEmployeeName} - Danh_sach_san_pham_${dateTimeStr}.json`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleTriggerImport = () => {
    importInputRef.current?.click();
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      const productMap = new Map(allProducts.filter(p => !!(p && p.msp)).map(p => [p.msp, p]));
      
      const allNewDisplayedProducts: Product[] = [];
      const allNotFoundMsps = new Set<string>();
      const fileProcessingErrors: string[] = [];
      let lastValidEmployeeName: string | null = null;

      for (const file of files) {
          try {
              const text = await file.text();
              const parsedJson = JSON.parse(text);
              
              let productList: { msp: string; quantity: number }[] = [];
              
              // Check for new format { employeeName, products } or old format [ ...products ]
              if (typeof parsedJson === 'object' && !Array.isArray(parsedJson) && parsedJson.products) {
                  // New format
                  if (Array.isArray(parsedJson.products)) {
                      productList = parsedJson.products;
                  } else {
                      throw new Error("Trường 'products' trong tệp phải là một mảng.");
                  }
                  
                  if (typeof parsedJson.employeeName === 'string') {
                      lastValidEmployeeName = parsedJson.employeeName;
                  }
              } else if (Array.isArray(parsedJson)) {
                  // Old format
                  productList = parsedJson;
              } else {
                  throw new Error("Định dạng tệp không hợp lệ.");
              }

              for (const item of productList) {
                  if (!item || typeof item !== 'object' || !item.msp) {
                      continue; // Skip invalid items in the JSON array.
                  }

                  if (productMap.has(item.msp)) {
                      const product = productMap.get(item.msp);
                      if (product) {
                          const newProduct: Product = {
                              ...(product as Product),
                              selected: false,
                              quantity: item.quantity > 0 ? item.quantity : 1,
                          };
                          allNewDisplayedProducts.push(newProduct);
                      }
                  } else {
                      allNotFoundMsps.add(item.msp);
                  }
              }
          } catch (err) {
              const errorMessage = err instanceof Error ? err.message : 'Lỗi không xác định.';
              fileProcessingErrors.push(`Lỗi xử lý tệp '${file.name}': ${errorMessage}`);
              console.error(`Error processing file ${file.name}:`, err);
          }
      }

      setDisplayedProducts(allNewDisplayedProducts);

      // After processing all files, if we found a valid employee name, update it.
      if (lastValidEmployeeName !== null) {
          const trimmedName = lastValidEmployeeName.trim();
          setEmployeeName(trimmedName);
          saveEmployeeName(trimmedName);
          if (trimmedName) {
              setIsEditingEmployeeName(false);
          }
      }
      
      const errorMessages: string[] = Array.from(fileProcessingErrors);
      if (allNotFoundMsps.size > 0) {
          const notFoundArray = Array.from(allNotFoundMsps);
          errorMessages.push(`Không tìm thấy ${notFoundArray.length} mã sản phẩm trong dữ liệu hiện tại: ${notFoundArray.join(', ')}`);
      }

      if (errorMessages.length > 0) {
          setError(errorMessages.join('\n'));
      } else {
          setError(null);
      }

      if (event.target) {
          event.target.value = '';
      }
  };

  const handleManualPrint = (products: Product[]) => {
    setIsManualInputOpen(false);
    // Filter to ensure we only have valid products.
    const validProducts = products.filter(p => {
      return !!(p && p.msp && typeof p.msp === 'string' && p.msp.trim() !== '');
    });
    setProductsForPrintingSession(validProducts);
    setPrintAction('manual');
    setIsLayoutModalOpen(true);
  };

  const handleSaveList = () => {
    if (!user || !userData?.storeId) {
      showAlert('Vui lòng đăng nhập để sử dụng tính năng này.');
      return;
    }
    if (displayedProducts.length === 0) {
      showAlert('Không có sản phẩm nào để lưu.');
      return;
    }
    setIsSaveListModalOpen(true);
  };

  const onConfirmSaveList = async (listName: string) => {
    setIsSaveListModalOpen(false);
    try {
      setIsLoading(true);
      const itemsToSave = displayedProducts.map(p => ({
        msp: p.msp,
        quantity: p.quantity,
      }));
      await saveListToFirestore(userData.storeId, user.uid, listName, itemsToSave);
      showAlert('Đã lưu danh sách thành công!');
    } catch (err) {
      console.error('Error saving list:', err);
      showAlert('Có lỗi xảy ra khi lưu danh sách. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const isSuperAdmin = userData?.username === 'admin' || userData?.username === '21707' || user?.email === 'lts.truongson@gmail.com' || user?.email === 'lts.truongson@example.com' || user?.email === 'admin@example.com';

  const handleViewSavedLists = () => {
    if (!user || !userData?.storeId) {
      showAlert('Vui lòng đăng nhập để xem danh sách đã lưu.');
      return;
    }
    setIsSavedListsModalOpen(true);
  };

  const handleLoadSavedList = (savedItems: any[]) => {
    const reconstructedProducts: Product[] = [];
    for (const item of savedItems) {
      const product = allProducts.find(p => p.msp === item.msp);
      if (product) {
        reconstructedProducts.push({ ...product, quantity: item.quantity || 1, selected: false });
      } else if (item.sanPham) {
        // Fallback for older saved lists that had full product info
        reconstructedProducts.push({ ...item, selected: false });
      }
    }
    
    if (reconstructedProducts.length === 0) {
        showAlert('Không tìm thấy sản phẩm nào trong danh sách này (có thể do dữ liệu gốc đã bị xóa).');
        return;
    }
    
    setDisplayedProducts(reconstructedProducts);
    saveDisplayedProducts(reconstructedProducts);
  };

  if (isInitializing) {
     return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
     );
  }

  if (!user) {
    return <Login onLoginSuccess={(user, data) => {
      setUser(user);
      setUserData(data);
    }} />;
  }

  return (
    <ErrorBoundary>
      <div className={`min-h-screen bg-white text-slate-800 flex flex-col items-center ${isMobile ? 'p-0' : 'p-4 sm:p-6 lg:p-8'} ${isMobile ? 'pb-24' : ''}`}>
        <div className="w-full max-w-7xl mx-auto">
          <header className={`${isMobile ? 'sticky top-0 z-50 bg-white border-b border-slate-100 p-2 mb-2' : 'mb-8'}`}>
            <div className={`flex items-center justify-between gap-2 ${isMobile ? '' : 'flex-col sm:flex-row bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-6'}`}>
              <div className="flex items-center gap-2 min-w-0">
                {!isMobile && (
                  <div className="bg-indigo-50 p-2 rounded-lg">
                    <LogoIcon className="h-8 w-8 text-indigo-600" />
                  </div>
                )}
                <div className="min-w-0">
                  <h1 className={`${isMobile ? 'text-sm' : 'text-lg sm:text-xl md:text-2xl'} font-bold text-slate-900 tracking-tight leading-tight truncate uppercase`}>
                    {isMobile ? 'IN STICKER EVENT' : 'CÔNG CỤ IN STICKER SẢN PHẨM EVENT'}
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    {!isMobile && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${userData?.role === 'admin' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                          {userData?.role === 'admin' ? 'Quản trị viên' : 'Nhân viên'}
                      </span>
                    )}
                    {userData?.storeId && !isMobile && (
                        <span className="text-[10px] font-medium text-slate-500">Kho: {userData.storeId}</span>
                    )}
                    {(uploadTimestamp || inventoryUploadTimestamp) && (
                        <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                            Cập nhật: {new Date(Math.max(uploadTimestamp?.getTime() || 0, inventoryUploadTimestamp?.getTime() || 0)).toLocaleString('vi-VN')}
                        </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!isMobile && (
                  <button
                    onClick={() => setIsChangePasswordOpen(true)}
                    className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 hover:text-indigo-600 rounded-lg transition-colors border border-slate-200"
                  >
                    Đổi mật khẩu
                  </button>
                )}
                {!isMobile && (
                  <button
                    onClick={() => setIsUserGuideOpen(true)}
                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
                    title="Hướng dẫn sử dụng"
                  >
                    <Info className="h-5 w-5" />
                  </button>
                )}
                <button
                  onClick={async () => {
                    await auth.signOut();
                    setUser(null);
                    setUserData(null);
                    setAllProducts([]);
                    setInventory([]);
                    setDisplayedProducts([]);
                    setFileName(null);
                    setUploadTimestamp(null);
                    setInventoryUploadTimestamp(null);
                    setFileExportDate(null);
                    setSearchQuery('');
                    setSuggestions([]);
                    await clearData();
                  }}
                  className={`${isMobile ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-sm'} font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-100 uppercase`}
                >
                  Đăng xuất
                </button>
              </div>
            </div>
          </header>

          <main className={`flex flex-col lg:flex-row ${isMobile ? 'gap-2' : 'gap-8'}`}>
            <ControlPanel 
              employeeName={employeeName}
              isEditingEmployeeName={isEditingEmployeeName}
              searchQuery={searchQuery}
              suggestions={suggestions}
              showNoResults={showNoResults}
              allProducts={allProducts}
              displayedProducts={displayedProducts}
              isLoading={isLoading}
              fileName={fileName}
              isMobile={isMobile}
              uploadTimestamp={uploadTimestamp}
              inventoryUploadTimestamp={inventoryUploadTimestamp}
              hasInventory={inventory.length > 0}
              userRole={userData?.role}
              onEmployeeNameChange={handleEmployeeNameChange}
              onSaveEmployeeName={handleSaveEmployeeName}
              onEmployeeNameKeyDown={handleEmployeeNameKeyDown}
              onSetIsEditingEmployeeName={setIsEditingEmployeeName}
              onSearchChange={handleSearchInputChange}
              onOpenScanner={() => setIsScannerOpen(true)}
              onSuggestionClick={handleSuggestionClick}
              onFileChange={handleFileChange}
              onInventoryFileChange={handleInventoryFileChange}
              onDownloadSampleInventory={handleDownloadSampleInventory}
              onShowTopBonus={handleShowTopBonus}
              onShowTopDiscount={handleShowTopDiscount}
              onOpenManualInput={() => setIsManualInputOpen(true)}
              onReset={handleReset}
              onClearAll={handleClearAll}
              onTriggerImport={handleTriggerImport}
              onExport={handleExport}
              onOpenPrintSettings={() => setIsPrintSettingsOpen(true)}
              onPrintSelected={handlePrintSelected}
              onPrintAll={handlePrintAll}
              onOpenUserManagement={() => setIsUserManagementOpen(true)}
              onOpenSuperAdminTools={isSuperAdmin ? () => setIsSuperAdminModalOpen(true) : undefined}
              onSaveList={handleSaveList}
              onViewSavedLists={handleViewSavedLists}
              onOpenUserGuide={() => setIsUserGuideOpen(true)}
              activeTab={activeTab}
              showManagerInstructions={showManagerInstructions}
              onCloseInstructions={() => setShowManagerInstructions(false)}
            />
            <div className={`flex-1 ${isMobile ? 'px-2 space-y-2' : 'space-y-4'} ${isMobile && activeTab === 'tools' ? 'hidden' : ''}`}>
               {isLoading && (
                  <div className="text-center p-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-2 text-slate-600">Đang xử lý tệp...</p>
                  </div>
                )}
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4" role="alert">
                    <div className="flex items-center gap-3">
                        <WarningIcon className="h-5 w-5 text-red-500 shrink-0" />
                        <p className="text-sm font-medium">{error}</p>
                    </div>
                    <button 
                        onClick={() => userData?.storeId && loadFirestoreData(userData.storeId)}
                        className="whitespace-nowrap px-4 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-bold"
                    >
                        Thử lại
                    </button>
                  </div>
                )}
                {duplicateError && (
                    <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 rounded-md" role="alert">
                        <p className="font-bold">Sản phẩm đã có</p>
                        <p>Sản phẩm này đã có trong danh sách kết quả của bạn.</p>
                    </div>
                )}

              <input type="file" ref={importInputRef} onChange={handleImport} accept=".json" className="hidden" multiple />

              {!isMobile && (
                <InventoryToolbar 
                  inventory={inventory}
                  filters={inventoryFilters}
                  useInventoryQuantity={useInventoryQuantity}
                  onFilterChange={handleInventoryFilterChange}
                  onClearFilters={handleClearInventoryFilters}
                  onUseInventoryQuantityChange={handleUseInventoryQuantityChange}
                />
              )}

              <ResultsDisplay 
                results={displayedProducts} 
                hasData={allProducts.length > 0} 
                highlightedMsp={highlightedMsp}
                onToggleSelect={handleToggleSelect}
                onQuantityChange={handleQuantityChange}
                onSetQuantity={handleSetQuantity}
                onPrintSingle={handlePrintSingle}
                isMobile={isMobile}
              />
            </div>
          </main>
        </div>

        {isMobile && (
          <BottomNavigation
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onScanClick={() => setIsScannerOpen(true)}
            onSaveListClick={handleSaveList}
            onFilterClick={() => setIsFilterModalOpen(true)}
          />
        )}

        {isFilterModalOpen && (
          <FilterModal
            isOpen={isFilterModalOpen}
            onClose={() => setIsFilterModalOpen(false)}
            inventory={inventory}
            filters={inventoryFilters}
            useInventoryQuantity={useInventoryQuantity}
            onFilterChange={handleInventoryFilterChange}
            onClearFilters={handleClearInventoryFilters}
            onUseInventoryQuantityChange={handleUseInventoryQuantityChange}
          />
        )}

        {isScannerOpen && (
          <Scanner
            onScanSuccess={handleScanSuccess}
            onClose={() => setIsScannerOpen(false)}
          />
        )}

        {isPrintSettingsOpen && (
            <PrintSettingsModal
                settings={printSettings}
                onSettingsChange={setPrintSettings}
                onClose={() => setIsPrintSettingsOpen(false)}
            />
        )}
        
        {isLayoutModalOpen && (
            <LayoutSelectionModal
                onSelect={executePrint}
                stickerStyle={printSettings.stickerStyle || 'default'}
                onStickerStyleChange={(style) => setPrintSettings({ ...printSettings, stickerStyle: style })}
                modernPositions={modernPositions}
                onModernPositionsChange={setModernPositions}
                onClose={() => {
                  setIsLayoutModalOpen(false);
                  setProductToPrint(null);
                  setPrintAction(null);
                  setProductsForPrintingSession([]);
                }}
            />
        )}

        {isManualInputOpen && (
          <ManualInputModal
            onPrint={handleManualPrint}
            onClose={() => setIsManualInputOpen(false)}
            allProducts={allProducts}
          />
        )}

        {isUserManagementOpen && (
          <UserManagementModal
            isOpen={isUserManagementOpen}
            onClose={() => setIsUserManagementOpen(false)}
            storeId={userData?.storeId}
            currentUserId={user?.uid || ''}
          />
        )}

        {isChangePasswordOpen && (
          <ChangePasswordModal
            isOpen={isChangePasswordOpen}
            onClose={() => setIsChangePasswordOpen(false)}
          />
        )}
        
        {pdfPreviewUrl && (
          <PdfPreviewModal
              url={pdfPreviewUrl}
              fileName={`in-gia-sticker-${new Date().toISOString().slice(0, 10)}.pdf`}
              onClose={() => setPdfPreviewUrl(null)}
          />
        )}
        
        {isResetConfirmOpen && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsResetConfirmOpen(false)}>
              <div 
                  className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 space-y-4" 
                  onClick={(e) => e.stopPropagation()}
              >
                  <div className="text-center">
                      <WarningIcon className="mx-auto h-12 w-12 text-amber-500"/>
                      <h2 className="text-xl font-bold text-slate-900 mt-2">Xác nhận Xóa</h2>
                      <p className="text-slate-600 mt-1">Bạn có chắc chắn muốn xóa toàn bộ danh sách sản phẩm đang hiển thị không? (Dữ liệu gốc trong hệ thống vẫn được giữ nguyên)</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                      <button onClick={() => setIsResetConfirmOpen(false)} className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-slate-100 h-10 px-4 py-2">
                          Hủy
                      </button>
                      <button onClick={executeReset} className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-red-600 text-red-50 hover:bg-red-700 h-10 px-4 py-2">
                          Xóa
                      </button>
                  </div>
              </div>
          </div>
        )}

        {isClearAllConfirmOpen && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsClearAllConfirmOpen(false)}>
              <div 
                  className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 space-y-4" 
                  onClick={(e) => e.stopPropagation()}
              >
                  <div className="text-center">
                      <ShieldAlert className="mx-auto h-12 w-12 text-red-500"/>
                      <h2 className="text-xl font-bold text-slate-900 mt-2">Xác nhận Xóa Hệ Thống</h2>
                      <p className="text-slate-600 mt-1">Hành động này sẽ xóa TOÀN BỘ dữ liệu tồn kho và bảng giá trên hệ thống. Bạn có chắc chắn muốn tiếp tục?</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                      <button onClick={() => setIsClearAllConfirmOpen(false)} className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-slate-100 h-10 px-4 py-2">
                          Hủy
                      </button>
                      <button onClick={executeClearAll} className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-red-600 text-red-50 hover:bg-red-700 h-10 px-4 py-2">
                          Xác nhận Xóa
                      </button>
                  </div>
              </div>
          </div>
        )}

        {isSavedListsModalOpen && userData?.storeId && user && (
          <SavedListsModal
            storeId={userData.storeId}
            userId={user.uid}
            isAdmin={userData.role === 'admin'}
            onClose={() => setIsSavedListsModalOpen(false)}
            onLoadList={handleLoadSavedList}
          />
        )}

        {isPrinting && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex flex-col items-center justify-center backdrop-blur-sm">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-400"></div>
            <p className="text-white mt-4 text-lg font-medium">Đang tạo tệp PDF...</p>
          </div>
        )}

        <SaveListModal
          isOpen={isSaveListModalOpen}
          onClose={() => setIsSaveListModalOpen(false)}
          onSave={onConfirmSaveList}
          defaultName={`Danh sách ${new Date().toLocaleDateString('vi-VN')}`}
        />

        <UserGuideModal 
          isOpen={isUserGuideOpen} 
          onClose={() => setIsUserGuideOpen(false)} 
          userRole={userData?.role}
        />

        <AlertModal
          isOpen={alertConfig.isOpen}
          onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
          message={alertConfig.message}
          title={alertConfig.title}
        />

        {isSuperAdmin && (
          <SuperAdminModal
            isOpen={isSuperAdminModalOpen}
            onClose={() => setIsSuperAdminModalOpen(false)}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
