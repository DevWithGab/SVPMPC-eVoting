import React, { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, ArrowLeft, Loader, Calendar, User, FileText, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import Swal from 'sweetalert2';
import { importAPI } from '../services/api';

interface ImportMember {
  id: string;
  member_id: string;
  name: string;
  phone_number: string;
  email?: string;
  activation_status: 'pending_activation' | 'activated' | 'sms_failed' | 'email_failed' | 'token_expired';
  activation_method?: 'sms' | 'email';
  sms_sent_at?: string;
  email_sent_at?: string;
  activated_at?: string;
  temporary_password_expires?: string;
}

interface ImportDetail {
  id: string;
  admin_name: string;
  csv_file_name: string;
  total_rows: number;
  successful_imports: number;
  failed_imports: number;
  skipped_rows: number;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  sms_sent_count?: number;
  sms_failed_count?: number;
  email_sent_count?: number;
  email_failed_count?: number;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface ImportDetailViewProps {
  importId: string;
  onNavigate?: (view: string) => void;
}

export const ImportDetailView: React.FC<ImportDetailViewProps> = ({ importId, onNavigate }) => {
  const [importDetail, setImportDetail] = useState<ImportDetail | null>(null);
  const [members, setMembers] = useState<ImportMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<string>('member_id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  });

  const statusColors: Record<string, string> = {
    pending_activation: 'bg-yellow-100 text-yellow-800',
    activated: 'bg-green-100 text-green-800',
    sms_failed: 'bg-red-100 text-red-800',
    email_failed: 'bg-orange-100 text-orange-800',
    token_expired: 'bg-gray-100 text-gray-800',
  };

  const statusLabels: Record<string, string> = {
    pending_activation: 'Pending Activation',
    activated: 'Activated',
    sms_failed: 'SMS Failed',
    email_failed: 'Email Failed',
    token_expired: 'Token Expired',
  };

  const statusIcons: Record<string, React.ReactNode> = {
    pending_activation: <Clock className="w-4 h-4" />,
    activated: <CheckCircle className="w-4 h-4" />,
    sms_failed: <AlertCircle className="w-4 h-4" />,
    email_failed: <AlertCircle className="w-4 h-4" />,
    token_expired: <AlertCircle className="w-4 h-4" />,
  };

  const fetchImportDetail = async () => {
    try {
      setLoading(true);
      const [detailResponse, membersResponse] = await Promise.all([
        importAPI.getImportDetails(importId),
        importAPI.getImportMembers(importId, {
          page: pagination.page,
          limit: pagination.limit,
        }),
      ]);

      setImportDetail(detailResponse.data);
      setMembers(membersResponse.data.members);
      setPagination(membersResponse.data.pagination);
    } catch (error) {
      console.error('Error fetching import details:', error);
      Swal.fire('Error', 'Failed to fetch import details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImportDetail();
  }, [importId, pagination.page]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handlePreviousPage = () => {
    if (pagination.page > 1) {
      setPagination({ ...pagination, page: pagination.page - 1 });
    }
  };

  const handleNextPage = () => {
    if (pagination.page < pagination.pages) {
      setPagination({ ...pagination, page: pagination.page + 1 });
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

  const filteredMembers = filterStatus === 'all' 
    ? members 
    : members.filter(m => m.activation_status === filterStatus);

  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) return <ChevronDown className="w-4 h-4 text-gray-400" />;
    return sortOrder === 'asc' ? (
      <ChevronUp className="w-4 h-4 text-green-600" />
    ) : (
      <ChevronDown className="w-4 h-4 text-green-600" />
    );
  };

  if (loading && !importDetail) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (!importDetail) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-500">Import details not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => onNavigate?.('import-history')}
        className="flex items-center gap-2 px-4 py-2 text-green-600 hover:text-green-700 font-semibold transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Import History
      </button>

      {/* Import Details Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Import Details</h2>
            <p className="text-gray-600 text-sm">CSV File: {importDetail.csv_file_name}</p>
          </div>
          <span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${
            importDetail.status === 'completed' ? 'bg-green-100 text-green-800' :
            importDetail.status === 'failed' ? 'bg-red-100 text-red-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {importDetail.status.charAt(0).toUpperCase() + importDetail.status.slice(1)}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="border border-gray-200 rounded p-4">
            <p className="text-gray-600 text-sm font-semibold mb-1">Upload Date</p>
            <div className="flex items-center gap-2 text-gray-800">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="font-mono text-sm">{formatDate(importDetail.created_at)}</span>
            </div>
          </div>

          <div className="border border-gray-200 rounded p-4">
            <p className="text-gray-600 text-sm font-semibold mb-1">Admin</p>
            <div className="flex items-center gap-2 text-gray-800">
              <User className="w-4 h-4 text-gray-400" />
              <span className="font-semibold">{importDetail.admin_name}</span>
            </div>
          </div>

          <div className="border border-gray-200 rounded p-4">
            <p className="text-gray-600 text-sm font-semibold mb-1">Total Rows</p>
            <p className="text-2xl font-bold text-gray-800">{importDetail.total_rows}</p>
          </div>

          <div className="border border-gray-200 rounded p-4">
            <p className="text-gray-600 text-sm font-semibold mb-1">Status Breakdown</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-green-600 font-semibold">Success:</span>
                <span className="font-bold">{importDetail.successful_imports}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-red-600 font-semibold">Failed:</span>
                <span className="font-bold">{importDetail.failed_imports}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 font-semibold">Skipped:</span>
                <span className="font-bold">{importDetail.skipped_rows}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notification Stats */}
        {(importDetail.sms_sent_count !== undefined || importDetail.email_sent_count !== undefined) && (
          <div className="border-t pt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Notification Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {importDetail.sms_sent_count !== undefined && (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded p-4">
                    <p className="text-blue-600 text-sm font-semibold mb-1">SMS Sent</p>
                    <p className="text-2xl font-bold text-blue-800">{importDetail.sms_sent_count}</p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded p-4">
                    <p className="text-red-600 text-sm font-semibold mb-1">SMS Failed</p>
                    <p className="text-2xl font-bold text-red-800">{importDetail.sms_failed_count || 0}</p>
                  </div>
                </>
              )}
              {importDetail.email_sent_count !== undefined && (
                <>
                  <div className="bg-purple-50 border border-purple-200 rounded p-4">
                    <p className="text-purple-600 text-sm font-semibold mb-1">Email Sent</p>
                    <p className="text-2xl font-bold text-purple-800">{importDetail.email_sent_count}</p>
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded p-4">
                    <p className="text-orange-600 text-sm font-semibold mb-1">Email Failed</p>
                    <p className="text-2xl font-bold text-orange-800">{importDetail.email_failed_count || 0}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Members List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-800">Imported Members ({pagination.total})</h3>
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded text-sm font-semibold text-gray-700 hover:border-green-600 focus:outline-none focus:border-green-600"
            >
              <option value="all">All Statuses</option>
              <option value="pending_activation">Pending Activation</option>
              <option value="activated">Activated</option>
              <option value="sms_failed">SMS Failed</option>
              <option value="email_failed">Email Failed</option>
              <option value="token_expired">Token Expired</option>
            </select>
          </div>
        </div>

        {filteredMembers.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No members found with selected filter</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort('member_id')}
                        className="flex items-center gap-2 font-semibold text-gray-700 hover:text-green-600"
                      >
                        Member ID <SortIcon field="member_id" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort('name')}
                        className="flex items-center gap-2 font-semibold text-gray-700 hover:text-green-600"
                      >
                        Name <SortIcon field="name" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Phone Number</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Email</th>
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort('activation_status')}
                        className="flex items-center gap-2 font-semibold text-gray-700 hover:text-green-600"
                      >
                        Status <SortIcon field="activation_status" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Activation Method</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Dates</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((member) => (
                    <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono font-semibold text-gray-700">
                        {member.member_id}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {member.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {member.phone_number}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {member.email ? (
                          <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                            {member.email.substring(0, 20)}...
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          {statusIcons[member.activation_status]}
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${statusColors[member.activation_status]}`}>
                            {statusLabels[member.activation_status]}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {member.activation_method ? (
                          <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-semibold">
                            {member.activation_method.toUpperCase()}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        <div className="space-y-1">
                          {member.sms_sent_at && (
                            <div>
                              <span className="font-semibold">SMS:</span> {new Date(member.sms_sent_at).toLocaleDateString()}
                            </div>
                          )}
                          {member.email_sent_at && (
                            <div>
                              <span className="font-semibold">Email:</span> {new Date(member.email_sent_at).toLocaleDateString()}
                            </div>
                          )}
                          {member.activated_at && (
                            <div>
                              <span className="font-semibold">Activated:</span> {new Date(member.activated_at).toLocaleDateString()}
                            </div>
                          )}
                          {member.temporary_password_expires && (
                            <div>
                              <span className="font-semibold">Expires:</span> {new Date(member.temporary_password_expires).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                Showing page {pagination.page} of {pagination.pages} ({pagination.total} total members)
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
