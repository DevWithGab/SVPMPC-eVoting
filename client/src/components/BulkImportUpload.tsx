import React, { useState, useRef } from 'react';
import { Upload, X, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Swal from 'sweetalert2';
import api from '../services/api';
import { useDarkMode } from '../context/DarkModeContext';

interface BulkImportUploadProps {
  onUploadComplete?: (data: any) => void;
  onCancel?: () => void;
}

interface ParsedCSVData {
  headers: string[];
  rows: Record<string, string>[];
  rowCount: number;
}

interface ValidationError {
  rowNumber: number;
  field: string;
  value: string;
  message: string;
}

export const BulkImportUpload: React.FC<BulkImportUploadProps> = ({ onUploadComplete, onCancel }) => {
  const { t } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedCSVData | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [importResult, setImportResult] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const REQUIRED_COLUMNS = ['member_id', 'name', 'phone_number'];
  const OPTIONAL_COLUMNS = ['email'];
  const ALL_VALID_COLUMNS = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS];

  const isValidPhoneNumber = (phone: string): boolean => {
    const phoneRegex = /^[\d\s\-()+]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 7;
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const parseCSV = (content: string): ParsedCSVData | null => {
    try {
      const lines = content.trim().split('\n');
      if (lines.length < 2) {
        throw new Error('CSV file must contain at least a header row and one data row');
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

      const missingColumns = REQUIRED_COLUMNS.filter(col => !headers.includes(col));
      if (missingColumns.length > 0) {
        throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
      }

      const unknownColumns = headers.filter(col => !ALL_VALID_COLUMNS.includes(col));
      if (unknownColumns.length > 0) {
        throw new Error(`Unknown columns: ${unknownColumns.join(', ')}`);
      }

      const rows: Record<string, string>[] = [];
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue;

        const values = lines[i].split(',').map(v => v.trim());
        const row: Record<string, string> = {};

        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });

        rows.push(row);
      }

      return {
        headers,
        rows,
        rowCount: rows.length
      };
    } catch (error: any) {
      throw new Error(`CSV parsing error: ${error.message}`);
    }
  };

  const validateCSVData = (data: ParsedCSVData): ValidationError[] => {
    const errors: ValidationError[] = [];
    const seenMemberIds = new Set<string>();
    const seenPhoneNumbers = new Set<string>();
    const seenEmails = new Set<string>();

    data.rows.forEach((row, index) => {
      const rowNumber = index + 2;

      REQUIRED_COLUMNS.forEach(col => {
        if (!row[col] || row[col].trim() === '') {
          errors.push({
            rowNumber,
            field: col,
            value: row[col] || '',
            message: `${col} is required`
          });
        }
      });

      if (row.phone_number && row.phone_number.trim() !== '') {
        if (!isValidPhoneNumber(row.phone_number)) {
          errors.push({
            rowNumber,
            field: 'phone_number',
            value: row.phone_number,
            message: 'Invalid phone number format'
          });
        }
      }

      if (row.email && row.email.trim() !== '') {
        if (!isValidEmail(row.email)) {
          errors.push({
            rowNumber,
            field: 'email',
            value: row.email,
            message: 'Invalid email format'
          });
        }
      }

      if (row.member_id && row.member_id.trim() !== '') {
        if (seenMemberIds.has(row.member_id)) {
          errors.push({
            rowNumber,
            field: 'member_id',
            value: row.member_id,
            message: 'Duplicate member_id'
          });
        }
        seenMemberIds.add(row.member_id);
      }

      if (row.phone_number && row.phone_number.trim() !== '') {
        if (seenPhoneNumbers.has(row.phone_number)) {
          errors.push({
            rowNumber,
            field: 'phone_number',
            value: row.phone_number,
            message: 'Duplicate phone number'
          });
        }
        seenPhoneNumbers.add(row.phone_number);
      }

      if (row.email && row.email.trim() !== '') {
        if (seenEmails.has(row.email)) {
          errors.push({
            rowNumber,
            field: 'email',
            value: row.email,
            message: 'Duplicate email'
          });
        }
        seenEmails.add(row.email);
      }
    });

    return errors;
  };

  const handleFileSelect = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      Swal.fire({
        icon: 'error',
        title: t('bulkImport.errorFileFormat'),
        text: t('bulkImport.errorFileFormat'),
        confirmButtonColor: '#2D7A3E'
      });
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const content = await file.text();

      const parsed = parseCSV(content);
      if (!parsed) {
        throw new Error('Failed to parse CSV');
      }

      const errors = validateCSVData(parsed);

      setUploadProgress(100);
      clearInterval(progressInterval);

      setParsedData(parsed);
      setValidationErrors(errors);
      setShowPreview(true);

      if (errors.length > 0) {
        Swal.fire({
          icon: 'warning',
          title: t('bulkImport.errorDetails'),
          html: `<p>${t('bulkImport.errorDetails')}: ${errors.length}</p><p>${t('bulkImport.viewDetails')}</p>`,
          confirmButtonColor: '#2D7A3E'
        });
      } else {
        Swal.fire({
          icon: 'success',
          title: t('bulkImport.uploadButton'),
          text: t('bulkImport.rowCount', { count: parsed.rowCount }),
          confirmButtonColor: '#2D7A3E',
          timer: 2000,
          showConfirmButton: false
        });
      }
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: t('bulkImport.importFailed'),
        text: error.message || t('bulkImport.errorFileUpload'),
        confirmButtonColor: '#2D7A3E'
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleConfirmImport = async () => {
    if (!parsedData || validationErrors.length > 0) {
      Swal.fire({
        icon: 'warning',
        title: t('bulkImport.confirmImport'),
        text: t('bulkImport.errorDetails'),
        confirmButtonColor: '#2D7A3E'
      });
      return;
    }

    const result = await Swal.fire({
      icon: 'question',
      title: t('bulkImport.confirmImport'),
      html: `<p>${t('bulkImport.confirmMessage', { count: parsedData.rowCount })}</p>`,
      showCancelButton: true,
      confirmButtonColor: '#2D7A3E',
      cancelButtonColor: '#d33',
      confirmButtonText: t('bulkImport.confirmImport'),
      cancelButtonText: t('bulkImport.cancelButton')
    });

    if (!result.isConfirmed) {
      return;
    }

    await processImport();
  };

  const processImport = async () => {
    try {
      setIsProcessing(true);
      setShowPreview(false);
      setShowResults(false);
      setProcessingProgress(0);

      const progressInterval = setInterval(() => {
        setProcessingProgress(prev => Math.min(prev + 15, 90));
      }, 500);

      // Convert parsed data to CSV format for backend processing
      const csvContent = [
        parsedData?.headers?.join(',') || '',
        ...(parsedData?.rows?.map(row => 
          (parsedData.headers || []).map(header => row[header] || '').join(',')
        ) || [])
      ].join('\n');

      const response = await api.post('/imports/confirm', {
        csvContent: csvContent,
        rowCount: parsedData?.rowCount,
        headers: parsedData?.headers || [],
      });

      clearInterval(progressInterval);
      setProcessingProgress(100);

      if (response.data.success) {
        setImportResult(response.data.data);
        setShowResults(true);

        Swal.fire({
          icon: 'success',
          title: t('bulkImport.importSuccess'),
          html: `<p>${t('bulkImport.successfulImports', { count: response.data.data.statistics.successful_imports })}</p>
                 ${response.data.data.statistics.failed_imports > 0 ? `<p>${t('bulkImport.failedImports', { count: response.data.data.statistics.failed_imports })}</p>` : ''}
                 ${response.data.data.statistics.skipped_rows > 0 ? `<p>${t('bulkImport.skippedRows', { count: response.data.data.statistics.skipped_rows })}</p>` : ''}`,
          confirmButtonColor: '#2D7A3E'
        });

        if (onUploadComplete) {
          onUploadComplete(response.data.data);
        }
      } else {
        throw new Error(response.data.error?.message || t('bulkImport.importFailed'));
      }
    } catch (error: any) {
      setProcessingProgress(0);
      Swal.fire({
        icon: 'error',
        title: t('bulkImport.importFailed'),
        text: error.response?.data?.error?.message || error.message || t('bulkImport.errorProcessingError'),
        confirmButtonColor: '#2D7A3E'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    setParsedData(null);
    setValidationErrors([]);
    setShowPreview(false);
    setShowResults(false);
    setImportResult(null);
    setUploadProgress(0);
    setProcessingProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-2 md:p-6 animate-fadeIn">
      {!showPreview && !showResults && !isProcessing ? (
        <div className="space-y-6">
          <div className={`text-center mb-8 border-b pb-4 ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
            <h2 className={`text-xl md:text-2xl font-black uppercase tracking-tight mb-2 ${isDarkMode ? 'text-coop-yellow' : 'text-gray-900'}`}>
              {t('bulkImport.title')}
            </h2>
            <p className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>
              {t('bulkImport.uploadSection')}
            </p>
          </div>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={t('bulkImport.dragDropText')}
            aria-describedby="file-upload-hint"
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300 focus:outline-none focus:ring-2 shadow-lg ${
              isDragging
                ? isDarkMode 
                  ? 'border-coop-yellow bg-coop-yellow/10 focus:ring-coop-yellow' 
                  : 'border-coop-green bg-green-50 focus:ring-coop-green'
                : isDarkMode
                  ? 'border-slate-600 hover:border-coop-yellow/50 focus:ring-coop-yellow bg-slate-800'
                  : 'border-gray-300 hover:border-coop-green/50 focus:ring-coop-green bg-white'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileInputChange}
              className="hidden"
              disabled={isUploading}
              aria-label={t('bulkImport.uploadButton')}
            />

            <Upload className={`w-12 h-12 mx-auto mb-4 ${isDarkMode ? 'text-coop-yellow' : 'text-coop-green'}`} aria-hidden="true" />
            <p className={`text-lg font-bold uppercase tracking-wide mb-2 ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>
              {t('bulkImport.dragDropText')}
            </p>
            <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`} id="file-upload-hint">
              {t('bulkImport.fileFormatHint')}
            </p>
          </div>

          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className={`font-bold uppercase tracking-wide ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>{t('bulkImport.uploadButton')}...</span>
                <span className={`font-bold ${isDarkMode ? 'text-coop-yellow' : 'text-coop-green'}`}>{uploadProgress}%</span>
              </div>
              <div className={`w-full rounded-full h-3 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}>
                <div
                  className={`h-3 rounded-full transition-all duration-300 ${isDarkMode ? 'bg-coop-yellow' : 'bg-coop-green'}`}
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className={`rounded-lg border-2 p-5 shadow-lg ${isDarkMode ? 'bg-slate-800 border-coop-yellow/30' : 'bg-blue-50 border-blue-300'}`} role="region" aria-label="Upload requirements">
            <h3 className={`font-black text-xs uppercase tracking-widest mb-3 ${isDarkMode ? 'text-coop-yellow' : 'text-blue-900'}`}>
              {t('bulkImport.uploadSection')}
            </h3>
            <ul className={`text-sm space-y-2 ${isDarkMode ? 'text-slate-300' : 'text-blue-800'}`}>
              <li className="flex items-start gap-2">
                <span className={isDarkMode ? 'text-coop-yellow' : 'text-blue-600'}>•</span>
                <span>{t('bulkImport.requiredColumns')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className={isDarkMode ? 'text-coop-yellow' : 'text-blue-600'}>•</span>
                <span>{t('bulkImport.optionalColumns')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className={isDarkMode ? 'text-coop-yellow' : 'text-blue-600'}>•</span>
                <span>{t('bulkImport.fileFormatHint')}</span>
              </li>
            </ul>
          </div>
        </div>
      ) : showPreview && !isProcessing && !showResults ? (
        <PreviewSection 
          parsedData={parsedData}
          validationErrors={validationErrors}
          handleCancel={handleCancel}
          handleConfirmImport={handleConfirmImport}
          isDarkMode={isDarkMode}
        />
      ) : isProcessing ? (
        <ProcessingSection processingProgress={processingProgress} isDarkMode={isDarkMode} />
      ) : showResults && importResult ? (
        <ResultsSection importResult={importResult} handleCancel={handleCancel} isDarkMode={isDarkMode} />
      ) : null}
    </div>
  );
};


// Preview and Results sections
const PreviewSection = ({ parsedData, validationErrors, handleCancel, handleConfirmImport, isDarkMode }: any) => {
  const { t } = useTranslation();
  return (
  <div className="space-y-6 animate-fadeIn">
    <div className={`flex items-center justify-between mb-6 pb-4 border-b ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
      <h2 className={`text-xl md:text-2xl font-black uppercase tracking-tight ${isDarkMode ? 'text-coop-yellow' : 'text-gray-900'}`}>
        {t('bulkImport.previewTitle')}
      </h2>
      <button
        onClick={handleCancel}
        className={`transition-all hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 rounded-lg p-2 ${isDarkMode ? 'text-slate-400 hover:text-coop-yellow focus:ring-coop-yellow' : 'text-gray-500 hover:text-gray-700 focus:ring-coop-green'}`}
        aria-label={t('bulkImport.cancelButton')}
      >
        <X className="w-6 h-6" aria-hidden="true" />
      </button>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className={`rounded-lg p-5 border-2 shadow-lg ${isDarkMode ? 'bg-slate-800 border-coop-yellow/30' : 'bg-blue-50 border-blue-300'}`} role="region" aria-label="Row count">
        <p className={`text-xs font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{t('bulkImport.rowCount', { count: parsedData?.rowCount || 0 })}</p>
        <p className={`text-3xl font-black ${isDarkMode ? 'text-coop-yellow' : 'text-blue-600'}`}>
          {parsedData?.rowCount || 0}
        </p>
      </div>
      <div className={`rounded-lg p-5 border-2 shadow-lg ${
        validationErrors.length === 0
          ? isDarkMode ? 'bg-slate-800 border-green-500/30' : 'bg-green-50 border-green-300'
          : isDarkMode ? 'bg-slate-800 border-red-500/30' : 'bg-red-50 border-red-300'
      }`} role="region" aria-label="Validation errors">
        <p className={`text-xs font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{t('bulkImport.errorDetails')}</p>
        <p className={`text-3xl font-black ${
          validationErrors.length === 0
            ? isDarkMode ? 'text-green-400' : 'text-green-600'
            : isDarkMode ? 'text-red-400' : 'text-red-600'
        }`}>
          {validationErrors.length}
        </p>
      </div>
      <div className={`rounded-lg p-5 border-2 shadow-lg ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-300'}`} role="region" aria-label="Column count">
        <p className={`text-xs font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{t('bulkImport.uploadSection')}</p>
        <p className={`text-3xl font-black ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
          {parsedData?.headers.length || 0}
        </p>
      </div>
    </div>

    {validationErrors.length > 0 && (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4" role="alert" aria-live="polite">
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" aria-hidden="true" />
          <h3 className="font-semibold text-red-900 dark:text-red-300">
            {t('bulkImport.errorDetails')} ({validationErrors.length})
          </h3>
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {validationErrors.map((error: ValidationError, idx: number) => (
            <div key={idx} className="text-sm text-red-800 dark:text-red-200 bg-red-100 dark:bg-red-900/40 p-2 rounded">
              <strong>Row {error.rowNumber}, {error.field}:</strong> {error.message}
              {error.value && <span className="block text-xs mt-1">Value: "{error.value}"</span>}
            </div>
          ))}
        </div>
      </div>
    )}

    {parsedData && validationErrors.length === 0 && (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" role="table" aria-label="CSV preview">
            <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300" scope="col">#</th>
                {parsedData.headers.map((header: string) => (
                  <th key={header} className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300" scope="col">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parsedData.rows.slice(0, 5).map((row: Record<string, string>, idx: number) => (
                <tr key={idx} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{idx + 1}</td>
                  {parsedData.headers.map((header: string) => (
                    <td key={`${idx}-${header}`} className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      {row[header] || '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {parsedData.rowCount > 5 && (
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
            {t('bulkImport.rowCount', { count: parsedData.rowCount })}
          </div>
        )}
      </div>
    )}

    <div className="flex gap-4 justify-end">
      <button
        onClick={handleCancel}
        className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
      >
        {t('bulkImport.cancelButton')}
      </button>
      <button
        onClick={handleConfirmImport}
        disabled={validationErrors.length > 0}
        className={`px-6 py-2 rounded-lg text-white font-semibold transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
          validationErrors.length > 0
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-green-600 hover:bg-green-700'
        }`}
        aria-label={t('bulkImport.confirmImport')}
      >
        <CheckCircle className="w-5 h-5" aria-hidden="true" />
        {t('bulkImport.confirmImport')}
      </button>
    </div>
  </div>
  );
};

const ProcessingSection = ({ processingProgress }: any) => {
  const { t } = useTranslation();
  return (
  <div className="space-y-6">
    <div className="text-center mb-8">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
        {t('bulkImport.importInProgress')}
      </h2>
      <p className="text-gray-600 dark:text-gray-400">
        {t('bulkImport.importInProgress')}
      </p>
    </div>

    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8">
      <div className="flex items-center justify-center mb-6">
        <Loader className="w-12 h-12 text-green-600 dark:text-green-400 animate-spin" />
      </div>
      <div className="space-y-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">{t('bulkImport.importInProgress')}...</span>
          <span className="text-gray-600 dark:text-gray-400">{processingProgress}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div
            className="bg-green-500 h-3 rounded-full transition-all duration-300"
            style={{ width: `${processingProgress}%` }}
          />
        </div>
      </div>
    </div>

    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
      <p className="text-sm text-blue-800 dark:text-blue-200">
        {t('bulkImport.importInProgress')}
      </p>
    </div>
  </div>
  );
};

const ResultsSection = ({ importResult, handleCancel }: any) => {
  const { t } = useTranslation();
  return (
  <div className="space-y-6">
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
        {t('bulkImport.importSuccess')}
      </h2>
      <button
        onClick={handleCancel}
        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        <X className="w-6 h-6" />
      </button>
    </div>

    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">{t('bulkImport.successCount')}</p>
        <p className="text-3xl font-bold text-green-600 dark:text-green-400">
          {importResult.statistics?.successful_imports || 0}
        </p>
      </div>
      <div className={`rounded-lg p-4 border ${
        (importResult.statistics?.failed_imports || 0) > 0
          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          : 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800'
      }`}>
        <p className="text-sm text-gray-600 dark:text-gray-400">{t('bulkImport.failureCount')}</p>
        <p className={`text-3xl font-bold ${
          (importResult.statistics?.failed_imports || 0) > 0
            ? 'text-red-600 dark:text-red-400'
            : 'text-gray-600 dark:text-gray-400'
        }`}>
          {importResult.statistics?.failed_imports || 0}
        </p>
      </div>
      <div className={`rounded-lg p-4 border ${
        (importResult.statistics?.skipped_rows || 0) > 0
          ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
          : 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800'
      }`}>
        <p className="text-sm text-gray-600 dark:text-gray-400">{t('bulkImport.skippedRows')}</p>
        <p className={`text-3xl font-bold ${
          (importResult.statistics?.skipped_rows || 0) > 0
            ? 'text-yellow-600 dark:text-yellow-400'
            : 'text-gray-600 dark:text-gray-400'
        }`}>
          {importResult.statistics?.skipped_rows || 0}
        </p>
      </div>
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">{t('bulkImport.totalMembers')}</p>
        <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
          {(importResult.statistics?.successful_imports || 0) + 
           (importResult.statistics?.failed_imports || 0) + 
           (importResult.statistics?.skipped_rows || 0)}
        </p>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h3 className="font-semibold text-gray-800 dark:text-white mb-3">{t('bulkImport.activationMethodSms')}</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">{t('bulkImport.successCount')}:</span>
            <span className="font-semibold text-green-600 dark:text-green-400">
              {importResult.statistics?.sms_sent_count || 0}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">{t('bulkImport.failureCount')}:</span>
            <span className="font-semibold text-red-600 dark:text-red-400">
              {importResult.statistics?.sms_failed_count || 0}
            </span>
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h3 className="font-semibold text-gray-800 dark:text-white mb-3">{t('bulkImport.activationMethodEmail')}</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">{t('bulkImport.successCount')}:</span>
            <span className="font-semibold text-green-600 dark:text-green-400">
              {importResult.statistics?.email_sent_count || 0}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">{t('bulkImport.failureCount')}:</span>
            <span className="font-semibold text-red-600 dark:text-red-400">
              {importResult.statistics?.email_failed_count || 0}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-green-900 dark:text-green-300 mb-1">
            {t('bulkImport.importSuccess')}
          </h3>
          <p className="text-sm text-green-800 dark:text-green-200">
            {t('bulkImport.memberStatusDashboard')}
          </p>
        </div>
      </div>
    </div>

    <div className="flex gap-4 justify-end">
      <button
        onClick={handleCancel}
        className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
      >
        {t('bulkImport.cancelButton')}
      </button>
    </div>
  </div>
  );
};
