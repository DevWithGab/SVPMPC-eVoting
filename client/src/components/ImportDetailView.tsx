import React, { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, ArrowLeft, Loader, Calendar, User, FileText, CheckCircle, AlertCircle, Clock, FileSpreadsheet } from 'lucide-react';
import Swal from 'sweetalert2';
import { importAPI } from '../services/api';
import { useDarkMode } from '../context/DarkModeContext';

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
  const { isDarkMode } = useDarkMode();
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
    pending_activation: isDarkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-800',
    activated: isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-800',
    sms_failed: isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-800',
    email_failed: isDarkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-100 text-orange-800',
    token_expired: isDarkMode ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-800',
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
    if (sortBy !== field) return <ChevronDown className={`w-4 h-4 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`} />;
    return sortOrder === 'asc' ? (
      <ChevronUp className={`w-4 h-4 ${isDarkMode ? 'text-coop-yellow' : 'text-coop-green'}`} />
    ) : (
      <ChevronDown className={`w-4 h-4 ${isDarkMode ? 'text-coop-yellow' : 'text-coop-green'}`} />
    );
  };

  if (loading && !importDetail) {
    return (
      <div className={`flex items-center justify-center h-96 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
        <Loader className={`w-8 h-8 animate-spin ${isDarkMode ? 'text-coop-yellow' : 'text-coop-green'}`} />
      </div>
    );
  }

  if (!importDetail) {
    return (
      <div className={`rounded-lg shadow-lg p-8 border transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
        <p className={`${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Import details not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Back Button */}
      <button
        onClick={() => onNavigate?.('import-history')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wide transition-all hover:shadow-md active:scale-95 ${isDarkMode ? 'text-coop-yellow hover:bg-slate-800' : 'text-coop-green hover:bg-gray-50'}`}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Import History
      </button>

      {/* Import Details Header */}
      <div className={`rounded-lg shadow-lg p-6 border transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
        <div className="flex flex-col md:flex-row items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 flex items-center justify-center rounded-lg transition-colors duration-300 ${isDarkMode ? 'bg-coop-yellow text-slate-900' : 'bg-coop-green text-white'}`}>
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h2 className={`text-xl md:text-2xl font-black uppercase tracking-tight transition-colors duration-300 ${isDarkMode ? 'text-coop-yellow' : 'text-gray-900'}`}>
                Import Details
              </h2>
              <p className={`text-xs font-medium mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                {importDetail.csv_file_name}
              </p>
            </div>
          </div>
          <span className={`inline-flex items-center px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide shadow-sm ${
            importDetail.status === 'completed' 
              ? isDarkMode ? 'bg-green-900/30 text-green-400 border border-green-800' : 'bg-green-100 text-green-800 border border-green-200'
              : importDetail.status === 'failed' 
              ? isDarkMode ? 'bg-red-900/30 text-red-400 border border-red-800' : 'bg-red-100 text-red-800 border border-red-200'
              : isDarkMode ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-800' : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
          }`}>
            {importDetail.status.charAt(0).toUpperCase() + importDetail.status.slice(1)}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className={`rounded-lg p-4 border transition-colors duration-300 ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
            <p className={`text-xs font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Upload Date</p>
            <div className={`flex items-center gap-2 ${isDarkMode ? 'text-slate-200' : 'text-gray-800'}`}>
              <Calendar className={`w-4 h-4 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`} />
              <span className="font-mono text-sm font-semibold">{formatDate(importDetail.created_at)}</span>
            </div>
          </div>

          <div className={`rounded-lg p-4 border transition-colors duration-300 ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
            <p className={`text-xs font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Admin</p>
            <div className={`flex items-center gap-2 ${isDarkMode ? 'text-slate-200' : 'text-gray-800'}`}>
              <User className={`w-4 h-4 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`} />
              <span className="font-semibold">{importDetail.admin_name}</span>
            </div>
          </div>

          <div className={`rounded-lg p-4 border transition-colors duration-300 ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
            <p className={`text-xs font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Total Rows</p>
            <p className={`text-2xl font-black tracking-tight ${isDarkMode ? 'text-coop-yellow' : 'text-gray-900'}`}>{importDetail.total_rows}</p>
          </div>

          <div className={`rounded-lg p-4 border transition-colors duration-300 ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
            <p className={`text-xs font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Status Breakdown</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className={`font-semibold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>Success:</span>
                <span className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-gray-800'}`}>{importDetail.successful_imports}</span>
              </div>
              <div className="flex justify-between">
                <span className={`font-semibold ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>Failed:</span>
                <span className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-gray-800'}`}>{importDetail.failed_imports}</span>
              </div>
              <div className="flex justify-between">
                <span className={`font-semibold ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>Skipped:</span>
                <span className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-gray-800'}`}>{importDetail.skipped_rows}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notification Stats */}
        {(importDetail.sms_sent_count !== undefined || importDetail.email_sent_count !== undefined) && (
          <div className={`border-t pt-6 ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
            <h3 className={`text-xs font-black uppercase tracking-widest mb-4 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>Notification Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {importDetail.sms_sent_count !== undefined && (
                <>
                  <div className={`rounded-lg p-4 border transition-colors duration-300 ${isDarkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'}`}>
                    <p className={`text-xs font-bold uppercase mb-1 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>SMS Sent</p>
                    <p className={`text-2xl font-black ${isDarkMode ? 'text-blue-300' : 'text-blue-800'}`}>{importDetail.sms_sent_count}</p>
                  </div>
                  <div className={`rounded-lg p-4 border transition-colors duration-300 ${isDarkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'}`}>
                    <p className={`text-xs font-bold uppercase mb-1 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>SMS Failed</p>
                    <p className={`text-2xl font-black ${isDarkMode ? 'text-red-300' : 'text-red-800'}`}>{importDetail.sms_failed_count || 0}</p>
                  </div>
                </>
              )}
              {importDetail.email_sent_count !== undefined && (
                <>
                  <div className={`rounded-lg p-4 border transition-colors duration-300 ${isDarkMode ? 'bg-purple-900/20 border-purple-800' : 'bg-purple-50 border-purple-200'}`}>
                    <p className={`text-xs font-bold uppercase mb-1 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>Email Sent</p>
                    <p className={`text-2xl font-black ${isDarkMode ? 'text-purple-300' : 'text-purple-800'}`}>{importDetail.email_sent_count}</p>
                  </div>
                  <div className={`rounded-lg p-4 border transition-colors duration-300 ${isDarkMode ? 'bg-orange-900/20 border-orange-800' : 'bg-orange-50 border-orange-200'}`}>
                    <p className={`text-xs font-bold uppercase mb-1 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>Email Failed</p>
                    <p className={`text-2xl font-black ${isDarkMode ? 'text-orange-300' : 'text-orange-800'}`}>{importDetail.email_failed_count || 0}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Members List */}
      <div className={`rounded-lg shadow-lg overflow-hidden border transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
        <div className={`p-6 border-b ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <h3 className={`text-lg font-black uppercase tracking-tight ${isDarkMode ? 'text-coop-yellow' : 'text-gray-900'}`}>
              Imported Members ({pagination.total})
            </h3>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              aria-label="Filter by activation status"
              className={`px-4 py-2 rounded-lg text-sm font-bold border focus:outline-none focus:ring-2 transition-all ${isDarkMode ? 'bg-slate-700 border-slate-600 text-slate-200 focus:border-coop-yellow focus:ring-coop-yellow/20' : 'bg-white border-gray-300 text-gray-700 hover:border-coop-green focus:border-coop-green focus:ring-coop-green/20'}`}
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
          <div className={`text-center py-16 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No members found with selected filter</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`border-b-2 ${isDarkMode ? 'bg-slate-900 border-coop-yellow/30' : 'bg-gray-100 border-gray-300'}`}>
                  <tr>
                    <th className="px-6 py-4 text-left" scope="col">
                      <button
                        onClick={() => handleSort('member_id')}
                        className={`flex items-center gap-2 font-black text-xs uppercase tracking-widest focus:outline-none focus:ring-2 rounded px-2 py-1 transition-colors ${isDarkMode ? 'text-slate-300 hover:text-coop-yellow focus:ring-coop-yellow' : 'text-gray-700 hover:text-coop-green focus:ring-coop-green'}`}
                      >
                        Member ID <SortIcon field="member_id" />
                      </button>
                    </th>
                    <th className="px-6 py-4 text-left" scope="col">
                      <button
                        onClick={() => handleSort('name')}
                        className={`flex items-center gap-2 font-black text-xs uppercase tracking-widest focus:outline-none focus:ring-2 rounded px-2 py-1 transition-colors ${isDarkMode ? 'text-slate-300 hover:text-coop-yellow focus:ring-coop-yellow' : 'text-gray-700 hover:text-coop-green focus:ring-coop-green'}`}
                      >
                        Name <SortIcon field="name" />
                      </button>
                    </th>
                    <th className={`px-6 py-4 text-left font-black text-xs uppercase tracking-widest ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`} scope="col">Phone Number</th>
                    <th className={`px-6 py-4 text-left font-black text-xs uppercase tracking-widest ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`} scope="col">Email</th>
                    <th className="px-6 py-4 text-left" scope="col">
                      <button
                        onClick={() => handleSort('activation_status')}
                        className={`flex items-center gap-2 font-black text-xs uppercase tracking-widest focus:outline-none focus:ring-2 rounded px-2 py-1 transition-colors ${isDarkMode ? 'text-slate-300 hover:text-coop-yellow focus:ring-coop-yellow' : 'text-gray-700 hover:text-coop-green focus:ring-coop-green'}`}
                      >
                        Status <SortIcon field="activation_status" />
                      </button>
                    </th>
                    <th className={`px-6 py-4 text-left font-black text-xs uppercase tracking-widest ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`} scope="col">Method</th>
                    <th className={`px-6 py-4 text-left font-black text-xs uppercase tracking-widest ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`} scope="col">Dates</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-slate-700' : 'divide-gray-200'}`}>
                  {filteredMembers.map((member) => (
                    <tr key={member.id} className={`transition-all duration-150 ${isDarkMode ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'}`}>
                      <td className={`px-6 py-4 text-sm font-mono font-bold ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>
                        {member.member_id}
                      </td>
                      <td className={`px-6 py-4 text-sm font-medium ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>
                        {member.name}
                      </td>
                      <td className={`px-6 py-4 text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                        {member.phone_number}
                      </td>
                      <td className={`px-6 py-4 text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                        {member.email ? (
                          <span className={`font-mono text-xs px-2 py-1 rounded ${isDarkMode ? 'bg-slate-700' : 'bg-gray-100'}`}>
                            {member.email.length > 20 ? member.email.substring(0, 20) + '...' : member.email}
                          </span>
                        ) : (
                          <span className={isDarkMode ? 'text-slate-500' : 'text-gray-400'}>—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <span className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>{statusIcons[member.activation_status]}</span>
                          <span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold uppercase ${statusColors[member.activation_status]}`}>
                            {statusLabels[member.activation_status]}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {member.activation_method ? (
                          <span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold uppercase ${isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-800'}`}>
                            {member.activation_method.toUpperCase()}
                          </span>
                        ) : (
                          <span className={isDarkMode ? 'text-slate-500' : 'text-gray-400'}>—</span>
                        )}
                      </td>
                      <td className={`px-6 py-4 text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                        <div className="space-y-1">
                          {member.sms_sent_at && (
                            <div><span className="font-semibold">SMS:</span> {new Date(member.sms_sent_at).toLocaleDateString()}</div>
                          )}
                          {member.email_sent_at && (
                            <div><span className="font-semibold">Email:</span> {new Date(member.email_sent_at).toLocaleDateString()}</div>
                          )}
                          {member.activated_at && (
                            <div><span className={isDarkMode ? 'text-green-400' : 'text-green-600'}>Activated:</span> {new Date(member.activated_at).toLocaleDateString()}</div>
                          )}
                          {member.temporary_password_expires && (
                            <div><span className="font-semibold">Expires:</span> {new Date(member.temporary_password_expires).toLocaleDateString()}</div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className={`px-6 py-5 border-t-2 flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors duration-300 ${isDarkMode ? 'bg-slate-900 border-coop-yellow/30' : 'bg-gray-100 border-gray-300'}`}>
              <div className={`text-xs font-bold uppercase tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                Page {pagination.page} of {pagination.pages} ({pagination.total} total)
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handlePreviousPage}
                  disabled={pagination.page === 1}
                  className={`px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md active:scale-95 text-xs font-bold uppercase tracking-wide ${isDarkMode ? 'bg-slate-700 border border-slate-600 text-slate-300 hover:bg-slate-600 disabled:hover:bg-slate-700' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:hover:bg-white'}`}
                >
                  Previous
                </button>
                <button
                  onClick={handleNextPage}
                  disabled={pagination.page === pagination.pages}
                  className={`px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md active:scale-95 text-xs font-bold uppercase tracking-wide ${isDarkMode ? 'bg-coop-yellow text-slate-900 hover:bg-coop-yellow/80 disabled:hover:bg-coop-yellow' : 'bg-coop-green text-white hover:bg-coop-darkGreen disabled:hover:bg-coop-green'}`}
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
