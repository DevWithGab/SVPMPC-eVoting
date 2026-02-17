import React, { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, Eye, Loader, Calendar, User, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Swal from 'sweetalert2';
import { importAPI } from '../services/api';

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
    pending: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
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
    if (sortBy !== field) return <ChevronDown className="w-4 h-4 text-gray-400" />;
    return sortOrder === 'asc' ? (
      <ChevronUp className="w-4 h-4 text-green-600" />
    ) : (
      <ChevronDown className="w-4 h-4 text-green-600" />
    );
  };

  if (loading && imports.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">{t('bulkImport.importHistoryTitle')}</h2>

        {imports.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">{t('bulkImport.noImports')}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort('createdAt')}
                        className="flex items-center gap-2 font-semibold text-gray-700 hover:text-green-600"
                      >
                        {t('bulkImport.importDate')} <SortIcon field="createdAt" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort('admin_name')}
                        className="flex items-center gap-2 font-semibold text-gray-700 hover:text-green-600"
                      >
                        {t('bulkImport.importedBy')} <SortIcon field="admin_name" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">{t('bulkImport.csvFileName')}</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">{t('bulkImport.totalMembers')}</th>
                    <th className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleSort('successful_imports')}
                        className="flex items-center gap-2 font-semibold text-gray-700 hover:text-green-600 mx-auto"
                      >
                        {t('bulkImport.successCount')} <SortIcon field="successful_imports" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">{t('bulkImport.failureCount')}</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">{t('bulkImport.skippedRows')}</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">{t('bulkImport.status')}</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">{t('bulkImport.viewDetails')}</th>
                  </tr>
                </thead>
                <tbody>
                  {imports.map((importOp) => (
                    <tr key={importOp.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {formatDate(importOp.created_at)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          {importOp.admin_name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 truncate max-w-xs">
                        {importOp.csv_file_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-center font-semibold text-gray-700">
                        {importOp.total_rows}
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-semibold">
                          {importOp.successful_imports}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <span className="inline-block bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-semibold">
                          {importOp.failed_imports}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <span className="inline-block bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs font-semibold">
                          {importOp.skipped_rows}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${statusColors[importOp.status]}`}>
                          {statusLabels[importOp.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleViewDetails(importOp.id)}
                          className="inline-flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
                        >
                          <Eye className="w-4 h-4" />
                          {t('bulkImport.viewDetails')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                {t('bulkImport.pagination', { current: pagination.page, total: pagination.pages })}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handlePreviousPage}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={handleNextPage}
                  disabled={pagination.page === pagination.pages}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
