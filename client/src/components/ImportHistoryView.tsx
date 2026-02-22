import React, { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, Eye, Loader, Calendar, User, FileText, History } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Swal from 'sweetalert2';
import { importAPI } from '../services/api';
import { useDarkMode } from '../context/DarkModeContext';

interface ImportOperation {
  id: string;
  admin_name: string;
  csv_file_name: string;
  total_rows: number;
  successful_imports: number;
  failed_imports: number;
  skipped_rows: number;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface ImportHistoryViewProps {
  onNavigate?: (view: string, importId?: string) => void;
}

export const ImportHistoryView: React.FC<ImportHistoryViewProps> = ({ onNavigate }) => {
  const { t } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const [imports, setImports] = useState<ImportOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  });

  const statusColors: Record<string, string> = {
    pending: isDarkMode ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-800' : 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    completed: isDarkMode ? 'bg-green-900/30 text-green-400 border border-green-800' : 'bg-green-100 text-green-800 border border-green-200',
    failed: isDarkMode ? 'bg-red-900/30 text-red-400 border border-red-800' : 'bg-red-100 text-red-800 border border-red-200',
  };

  const statusLabels: Record<string, string> = {
    pending: t('bulkImport.statusPendingActivation'),
    completed: t('bulkImport.importSuccess'),
    failed: t('bulkImport.importFailed'),
  };

  const fetchImportHistory = async (page: number = 1) => {
    try {
      setLoading(true);
      const response = await importAPI.getImportHistory({
        page,
        limit: pagination.limit,
        sortBy,
        sortOrder,
      });

      const { imports: fetchedImports, pagination: paginationData } = response.data;
      setImports(fetchedImports);
      setPagination(paginationData);
    } catch (error) {
      console.error('Error fetching import history:', error);
      Swal.fire(t('bulkImport.importFailed'), t('bulkImport.errorProcessingError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImportHistory(1);
  }, [sortBy, sortOrder]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleViewDetails = (importId: string) => {
    if (onNavigate) {
      onNavigate('import-detail', importId);
    }
  };

  const handlePreviousPage = () => {
    if (pagination.page > 1) {
      fetchImportHistory(pagination.page - 1);
    }
  };

  const handleNextPage = () => {
    if (pagination.page < pagination.pages) {
      fetchImportHistory(pagination.page + 1);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) return <ChevronDown className={`w-4 h-4 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`} />;
    return sortOrder === 'asc' ? (
      <ChevronUp className={`w-4 h-4 ${isDarkMode ? 'text-coop-yellow' : 'text-coop-green'}`} />
    ) : (
      <ChevronDown className={`w-4 h-4 ${isDarkMode ? 'text-coop-yellow' : 'text-coop-green'}`} />
    );
  };

  if (loading && imports.length === 0) {
    return (
      <div className={`flex items-center justify-center h-96 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
        <Loader className={`w-8 h-8 animate-spin ${isDarkMode ? 'text-coop-yellow' : 'text-coop-green'}`} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className={`border-b pb-4 ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
        <div className="flex items-center gap-3 mb-2">
          <div className={`w-10 h-10 flex items-center justify-center rounded-lg font-black transition-colors duration-300 ${isDarkMode ? 'bg-coop-yellow text-slate-900' : 'bg-coop-green text-white'}`}>
            <History size={20} />
          </div>
          <div>
            <h2 className={`text-xl md:text-2xl font-black uppercase tracking-tight transition-colors duration-300 ${isDarkMode ? 'text-coop-yellow' : 'text-gray-900'}`}>
              {t('bulkImport.importHistoryTitle')}
            </h2>
            <p className={`text-[9px] font-black uppercase tracking-widest mt-1 transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>
              CSV Import Records
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`rounded-lg shadow-lg overflow-hidden border transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
        {imports.length === 0 ? (
          <div className={`text-center py-16 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">{t('bulkImport.noImports')}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full" role="table" aria-label="Import history">
                <thead className={`border-b-2 ${isDarkMode ? 'bg-slate-900 border-coop-yellow/30' : 'bg-gray-100 border-gray-300'}`}>
                  <tr>
                    <th className="px-6 py-4 text-left" scope="col">
                      <button
                        onClick={() => handleSort('createdAt')}
                        className={`flex items-center gap-2 font-black text-xs uppercase tracking-widest focus:outline-none focus:ring-2 rounded px-2 py-1 transition-colors ${isDarkMode ? 'text-slate-300 hover:text-coop-yellow focus:ring-coop-yellow' : 'text-gray-700 hover:text-coop-green focus:ring-coop-green'}`}
                        aria-label={`Sort by ${t('bulkImport.importDate')}`}
                      >
                        {t('bulkImport.importDate')} <SortIcon field="createdAt" />
                      </button>
                    </th>
                    <th className="px-6 py-4 text-left" scope="col">
                      <button
                        onClick={() => handleSort('admin_name')}
                        className={`flex items-center gap-2 font-black text-xs uppercase tracking-widest focus:outline-none focus:ring-2 rounded px-2 py-1 transition-colors ${isDarkMode ? 'text-slate-300 hover:text-coop-yellow focus:ring-coop-yellow' : 'text-gray-700 hover:text-coop-green focus:ring-coop-green'}`}
                        aria-label={`Sort by ${t('bulkImport.importedBy')}`}
                      >
                        {t('bulkImport.importedBy')} <SortIcon field="admin_name" />
                      </button>
                    </th>
                    <th className={`px-6 py-4 text-left font-black text-xs uppercase tracking-widest ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`} scope="col">{t('bulkImport.csvFileName')}</th>
                    <th className={`px-6 py-4 text-center font-black text-xs uppercase tracking-widest ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`} scope="col">{t('bulkImport.totalMembers')}</th>
                    <th className="px-6 py-4 text-center" scope="col">
                      <button
                        onClick={() => handleSort('successful_imports')}
                        className={`flex items-center gap-2 mx-auto font-black text-xs uppercase tracking-widest focus:outline-none focus:ring-2 rounded px-2 py-1 transition-colors ${isDarkMode ? 'text-slate-300 hover:text-coop-yellow focus:ring-coop-yellow' : 'text-gray-700 hover:text-coop-green focus:ring-coop-green'}`}
                        aria-label={`Sort by ${t('bulkImport.successCount')}`}
                      >
                        {t('bulkImport.successCount')} <SortIcon field="successful_imports" />
                      </button>
                    </th>
                    <th className={`px-6 py-4 text-center font-black text-xs uppercase tracking-widest ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`} scope="col">{t('bulkImport.failureCount')}</th>
                    <th className={`px-6 py-4 text-center font-black text-xs uppercase tracking-widest ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`} scope="col">{t('bulkImport.skippedRows')}</th>
                    <th className={`px-6 py-4 text-center font-black text-xs uppercase tracking-widest ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`} scope="col">{t('bulkImport.status')}</th>
                    <th className={`px-6 py-4 text-center font-black text-xs uppercase tracking-widest ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`} scope="col">{t('bulkImport.viewDetails')}</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-slate-700' : 'divide-gray-200'}`}>
                  {imports.map((importOp) => (
                    <tr key={importOp.id} className={`transition-all duration-150 ${isDarkMode ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'}`}>
                      <td className={`px-6 py-4 text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                        <div className="flex items-center gap-2">
                          <Calendar className={`w-4 h-4 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`} aria-hidden="true" />
                          <span className="font-medium">{formatDate(importOp.created_at)}</span>
                        </div>
                      </td>
                      <td className={`px-6 py-4 text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                        <div className="flex items-center gap-2">
                          <User className={`w-4 h-4 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`} aria-hidden="true" />
                          <span className="font-medium">{importOp.admin_name}</span>
                        </div>
                      </td>
                      <td className={`px-6 py-4 text-sm truncate max-w-xs font-mono ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                        {importOp.csv_file_name}
                      </td>
                      <td className={`px-6 py-4 text-sm text-center font-bold ${isDarkMode ? 'text-slate-200' : 'text-gray-800'}`}>
                        {importOp.total_rows}
                      </td>
                      <td className="px-6 py-4 text-sm text-center">
                        <span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold ${isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-800'}`}>
                          {importOp.successful_imports}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-center">
                        <span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold ${isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-800'}`}>
                          {importOp.failed_imports}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-center">
                        <span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold ${isDarkMode ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-800'}`}>
                          {importOp.skipped_rows}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-center">
                        <span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold uppercase ${statusColors[importOp.status]}`}>
                          {statusLabels[importOp.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleViewDetails(importOp.id)}
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wide transition-all shadow-sm hover:shadow-md active:scale-95 focus:outline-none focus:ring-2 ${isDarkMode ? 'bg-coop-yellow text-slate-900 hover:bg-coop-yellow/80 focus:ring-coop-yellow' : 'bg-coop-green text-white hover:bg-coop-darkGreen focus:ring-coop-green'}`}
                          aria-label={`View details for import on ${formatDate(importOp.created_at)}`}
                        >
                          <Eye className="w-4 h-4" aria-hidden="true" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className={`px-6 py-5 border-t-2 flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors duration-300 ${isDarkMode ? 'bg-slate-900 border-coop-yellow/30' : 'bg-gray-100 border-gray-300'}`}>
              <div className={`text-xs font-bold uppercase tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                {t('bulkImport.pagination', { current: pagination.page, total: pagination.pages })}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handlePreviousPage}
                  disabled={pagination.page === 1}
                  className={`px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md active:scale-95 text-xs font-bold uppercase tracking-wide focus:outline-none focus:ring-2 ${isDarkMode ? 'bg-slate-700 border border-slate-600 text-slate-300 hover:bg-slate-600 focus:ring-slate-500' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-coop-green'}`}
                  aria-label="Previous page"
                >
                  Previous
                </button>
                <button
                  onClick={handleNextPage}
                  disabled={pagination.page === pagination.pages}
                  className={`px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md active:scale-95 text-xs font-bold uppercase tracking-wide focus:outline-none focus:ring-2 ${isDarkMode ? 'bg-coop-yellow text-slate-900 hover:bg-coop-yellow/80 focus:ring-coop-yellow' : 'bg-coop-green text-white hover:bg-coop-darkGreen focus:ring-coop-green'}`}
                  aria-label="Next page"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
