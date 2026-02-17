import React, { useState, useEffect } from 'react';
import { Search, ChevronUp, ChevronDown, Eye, RotateCcw, Loader, UserCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Swal from 'sweetalert2';
import api from '../services/api';
import { useDarkMode } from '../context/DarkModeContext';

interface ImportedMember {
  id: string;
  member_id: string;
  name: string;
  phone_number: string;
  email?: string;
  activation_status: 'pending_activation' | 'activated' | 'sms_failed' | 'email_failed' | 'token_expired';
  activation_method?: 'sms' | 'email';
  imported_at: string;
  activated_at?: string;
  sms_sent_at?: string;
  temporary_password_expires?: string;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface MemberStatusDashboardProps {
  onNavigate?: (view: string) => void;
}

export const MemberStatusDashboard: React.FC<MemberStatusDashboardProps> = () => {
  const { t } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const [members, setMembers] = useState<ImportedMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  });
  const [memberDetails, setMemberDetails] = useState<ImportedMember | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [isBulkResending, setIsBulkResending] = useState(false);

  const statusColors: Record<string, string> = {
    pending_activation: 'bg-yellow-100 text-yellow-800',
    activated: 'bg-green-100 text-green-800',
    sms_failed: 'bg-red-100 text-red-800',
    email_failed: 'bg-orange-100 text-orange-800',
    token_expired: 'bg-gray-100 text-gray-800',
  };

  const statusLabels: Record<string, string> = {
    pending_activation: t('bulkImport.statusPendingActivation'),
    activated: t('bulkImport.statusActivated'),
    sms_failed: t('bulkImport.statusSmsFailed'),
    email_failed: t('bulkImport.statusEmailFailed'),
    token_expired: t('bulkImport.statusTokenExpired'),
  };

  const fetchMembers = async (page: number = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        sortBy,
        sortOrder,
      });

      if (statusFilter) {
        params.append('status', statusFilter);
      }

      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await api.get(`/imports/members?${params.toString()}`);
      const { members: fetchedMembers, pagination: paginationData } = response.data.data;

      setMembers(fetchedMembers);
      setPagination(paginationData);
    } catch (error) {
      console.error('Error fetching members:', error);
      Swal.fire(t('bulkImport.importFailed'), t('bulkImport.errorProcessingError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers(1);
  }, [statusFilter, sortBy, sortOrder]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleSearchSubmit = () => {
    fetchMembers(1);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status === statusFilter ? '' : status);
    setPagination({ ...pagination, page: 1 });
  };

  const handleViewDetails = async (memberId: string) => {
    try {
      const response = await api.get(`/imports/members/${memberId}`);
      setMemberDetails(response.data.data);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Error fetching member details:', error);
      Swal.fire(t('bulkImport.importFailed'), t('bulkImport.errorProcessingError'), 'error');
    }
  };

  const handleResendInvitation = async (memberId: string) => {
    const { value: method } = await Swal.fire({
      title: t('bulkImport.resendInvitation'),
      text: t('bulkImport.resendMethod'),
      input: 'radio',
      inputOptions: {
        sms: t('bulkImport.resendSms'),
        email: t('bulkImport.resendEmail'),
      },
      inputValue: 'sms',
      showCancelButton: true,
      confirmButtonText: t('bulkImport.resendInvitation'),
      confirmButtonColor: '#2D7A3E',
    });

    if (method) {
      try {
        await api.post(`/imports/resend-invitation/${memberId}`, { deliveryMethod: method });
        Swal.fire(t('bulkImport.resendSuccess'), '', 'success');
        fetchMembers(pagination.page);
      } catch (error) {
        console.error('Error resending invitation:', error);
        Swal.fire(t('bulkImport.importFailed'), t('bulkImport.resendFailed'), 'error');
      }
    }
  };

  const handleSelectMember = (memberId: string) => {
    const newSelected = new Set(selectedMembers);
    if (newSelected.has(memberId)) {
      newSelected.delete(memberId);
    } else {
      newSelected.add(memberId);
    }
    setSelectedMembers(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedMembers.size === members.length) {
      setSelectedMembers(new Set());
    } else {
      setSelectedMembers(new Set(members.map((m) => m.id)));
    }
  };

  const handleBulkResend = async () => {
    if (selectedMembers.size === 0) {
      Swal.fire(t('bulkImport.importFailed'), t('bulkImport.selectMembers'), 'warning');
      return;
    }

    const { value: method } = await Swal.fire({
      title: t('bulkImport.bulkResend'),
      html: `<p>${t('bulkImport.bulkResendConfirm', { count: selectedMembers.size })}</p><p>${t('bulkImport.resendMethod')}</p>`,
      input: 'radio',
      inputOptions: {
        sms: t('bulkImport.resendSms'),
        email: t('bulkImport.resendEmail'),
      },
      inputValue: 'sms',
      showCancelButton: true,
      confirmButtonText: t('bulkImport.bulkResend'),
      confirmButtonColor: '#2D7A3E',
    });

    if (method) {
      try {
        setIsBulkResending(true);

        // Show progress dialog
        Swal.fire({
          title: t('bulkImport.bulkResendInProgress'),
          html: '<div class="flex items-center justify-center"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div></div>',
          allowOutsideClick: false,
          didOpen: async () => {
            try {
              const response = await api.post('/imports/bulk-resend', {
                memberIds: Array.from(selectedMembers),
                deliveryMethod: method,
              });

              const result = response.data.data;

              // Close progress dialog and show summary
              Swal.fire({
                title: t('bulkImport.bulkResendSuccess'),
                html: `
                  <div class="text-left space-y-2">
                    <p><strong>${t('bulkImport.totalMembers')}:</strong> ${result.totalMembers}</p>
                    <p><strong>${t('bulkImport.successCount')}:</strong> <span class="text-green-600">${result.successCount}</span></p>
                    <p><strong>${t('bulkImport.failureCount')}:</strong> <span class="text-red-600">${result.failureCount}</span></p>
                    ${result.failureCount > 0 ? `<p class="text-sm text-gray-600 mt-4"><strong>${t('bulkImport.failureCount')}:<br/>${result.failedMembers?.map((m: any) => `${m.member_id}: ${m.error}`).join('<br/>')}</p>` : ''}
                  </div>
                `,
                icon: result.failureCount === 0 ? 'success' : 'warning',
                confirmButtonColor: '#2D7A3E',
              });

              setSelectedMembers(new Set());
              fetchMembers(pagination.page);
            } catch (error) {
              console.error('Error during bulk resend:', error);
              Swal.fire(t('bulkImport.importFailed'), t('bulkImport.bulkResendFailed'), 'error');
            } finally {
              setIsBulkResending(false);
            }
          },
        });
      } catch (error) {
        console.error('Error initiating bulk resend:', error);
        Swal.fire(t('bulkImport.importFailed'), t('bulkImport.bulkResendFailed'), 'error');
        setIsBulkResending(false);
      }
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) return <ChevronUp className="w-4 h-4 text-gray-400" />;
    return sortOrder === 'asc' ? (
      <ChevronUp className="w-4 h-4 text-green-600" />
    ) : (
      <ChevronDown className="w-4 h-4 text-green-600" />
    );
  };

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-0 animate-fadeIn">
      {/* Header with enhanced styling */}
      <div className={`border-b pb-4 ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
        <div className="flex items-center gap-3 mb-2">
          <div className={`w-10 h-10 flex items-center justify-center font-black transition-colors duration-300 ${isDarkMode ? 'bg-coop-yellow text-slate-900' : 'bg-coop-green text-white'}`}>
            <UserCheck size={20} />
          </div>
          <div>
            <h2 className={`text-xl md:text-2xl font-black uppercase tracking-tight transition-colors duration-300 ${isDarkMode ? 'text-coop-yellow' : 'text-gray-900'}`}>
              {t('bulkImport.memberStatusDashboard')}
            </h2>
            <p className={`text-[9px] font-black uppercase tracking-widest mt-1 transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>
              Member Activation Registry
            </p>
          </div>
        </div>
      </div>

      {/* Filters and Search with enhanced styling */}
      <div className={`rounded-lg shadow-lg p-4 md:p-6 space-y-4 border transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <Search className={`absolute left-3 top-3 w-5 h-5 transition-colors duration-300 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`} aria-hidden="true" />
            <input
              type="text"
              placeholder={t('bulkImport.searchByMemberId')}
              value={searchTerm}
              onChange={handleSearch}
              onKeyPress={(e) => e.key === 'Enter' && handleSearchSubmit()}
              className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all font-medium text-sm ${isDarkMode ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-400 focus:border-coop-yellow focus:ring-coop-yellow/20' : 'border-gray-300 focus:border-coop-green focus:ring-coop-green/20'}`}
              aria-label={t('bulkImport.searchByMemberId')}
            />
          </div>
          <button
            onClick={handleSearchSubmit}
            className={`px-6 py-3 rounded-lg font-black text-xs uppercase tracking-widest transition-all shadow-sm hover:shadow-md active:scale-95 whitespace-nowrap ${isDarkMode ? 'bg-coop-yellow text-slate-900 hover:bg-coop-yellow/80' : 'bg-coop-green text-white hover:bg-coop-darkGreen'}`}
            aria-label={t('bulkImport.searchByMemberId')}
          >
            Search
          </button>
        </div>

        {/* Status Filter with enhanced styling */}
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('bulkImport.filterByStatus')}>
          <span className={`text-xs font-black uppercase tracking-widest self-center transition-colors duration-300 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
            Filter:
          </span>
          {Object.entries(statusLabels).map(([status, label]) => (
            <button
              key={status}
              onClick={() => handleStatusFilterChange(status)}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all duration-200 shadow-sm hover:shadow-md active:scale-95 focus:outline-none focus:ring-2 ${
                statusFilter === status
                  ? isDarkMode 
                    ? 'bg-coop-yellow text-slate-900 ring-2 ring-coop-yellow/50' 
                    : 'bg-coop-green text-white ring-2 ring-coop-green/50'
                  : isDarkMode
                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
              } ${statusFilter === status ? 'focus:ring-offset-2' : ''}`}
              aria-pressed={statusFilter === status}
            >
              {label}
            </button>
          ))}
          {statusFilter && (
            <button
              onClick={() => setStatusFilter('')}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all duration-200 shadow-sm hover:shadow-md active:scale-95 focus:outline-none focus:ring-2 ${isDarkMode ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50 border border-red-800 focus:ring-red-500' : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 focus:ring-red-500'}`}
              aria-label={`Clear ${statusFilter} filter`}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Bulk Resend Button with enhanced styling */}
      {selectedMembers.size > 0 && (
        <div className={`rounded-lg p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg border-2 transition-all duration-300 animate-fadeIn ${isDarkMode ? 'bg-slate-800 border-coop-yellow/30' : 'bg-blue-50 border-blue-300'}`} role="region" aria-live="polite" aria-label="Bulk actions">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black ${isDarkMode ? 'bg-coop-yellow text-slate-900' : 'bg-blue-600 text-white'}`}>
              {selectedMembers.size}
            </div>
            <span className={`text-sm font-bold uppercase tracking-wide ${isDarkMode ? 'text-slate-200' : 'text-blue-900'}`}>
              {t('bulkImport.selectedCount', { count: selectedMembers.size })}
            </span>
          </div>
          <button
            onClick={handleBulkResend}
            disabled={isBulkResending}
            className={`px-6 py-3 rounded-lg font-black text-xs uppercase tracking-widest transition-all shadow-md hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 whitespace-nowrap ${isDarkMode ? 'bg-coop-yellow text-slate-900 hover:bg-coop-yellow/80 focus:ring-coop-yellow' : 'bg-coop-green text-white hover:bg-coop-darkGreen focus:ring-coop-green'}`}
            aria-label={`Bulk resend invitations to ${selectedMembers.size} members`}
          >
            {isBulkResending ? (
              <>
                <Loader className="w-4 h-4 animate-spin" aria-hidden="true" />
                {t('bulkImport.bulkResendInProgress')}
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                {t('bulkImport.bulkResend')}
              </>
            )}
          </button>
        </div>
      )}

      {/* Members Table with enhanced styling */}
      <div className={`rounded-lg shadow-xl overflow-hidden border transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
        {loading ? (
          <div className={`p-12 text-center ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
            <Loader className="w-8 h-8 animate-spin mx-auto mb-3" />
            <p className="font-medium">{t('bulkImport.importInProgress')}...</p>
          </div>
        ) : members.length === 0 ? (
          <div className={`p-12 text-center ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
            <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">{t('bulkImport.noMembers')}</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View with enhanced styling */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full" role="table" aria-label="Imported members">
                <thead className={`border-b-2 ${isDarkMode ? 'bg-slate-900 border-coop-yellow/30' : 'bg-gray-100 border-gray-300'}`}>
                  <tr>
                    <th className="px-6 py-3 text-left" scope="col">
                      <input
                        type="checkbox"
                        checked={selectedMembers.size === members.length && members.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500 cursor-pointer"
                        aria-label="Select all members"
                      />
                    </th>
                    <th className="px-6 py-4 text-left" scope="col">
                      <button
                        onClick={() => handleSort('member_id')}
                        className={`flex items-center gap-2 font-black text-xs uppercase tracking-widest focus:outline-none focus:ring-2 rounded px-2 py-1 transition-colors ${isDarkMode ? 'text-slate-300 hover:text-coop-yellow focus:ring-coop-yellow' : 'text-gray-700 hover:text-coop-green focus:ring-coop-green'}`}
                        aria-label={`Sort by ${t('bulkImport.memberId')}`}
                      >
                        {t('bulkImport.memberId')}
                        <SortIcon field="member_id" />
                      </button>
                    </th>
                    <th className="px-6 py-4 text-left" scope="col">
                      <button
                        onClick={() => handleSort('name')}
                        className={`flex items-center gap-2 font-black text-xs uppercase tracking-widest focus:outline-none focus:ring-2 rounded px-2 py-1 transition-colors ${isDarkMode ? 'text-slate-300 hover:text-coop-yellow focus:ring-coop-yellow' : 'text-gray-700 hover:text-coop-green focus:ring-coop-green'}`}
                        aria-label={`Sort by ${t('bulkImport.memberName')}`}
                      >
                        {t('bulkImport.memberName')}
                        <SortIcon field="name" />
                      </button>
                    </th>
                    <th className="px-6 py-4 text-left" scope="col">
                      <button
                        onClick={() => handleSort('phone_number')}
                        className={`flex items-center gap-2 font-black text-xs uppercase tracking-widest focus:outline-none focus:ring-2 rounded px-2 py-1 transition-colors ${isDarkMode ? 'text-slate-300 hover:text-coop-yellow focus:ring-coop-yellow' : 'text-gray-700 hover:text-coop-green focus:ring-coop-green'}`}
                        aria-label={`Sort by ${t('bulkImport.phoneNumber')}`}
                      >
                        {t('bulkImport.phoneNumber')}
                        <SortIcon field="phone_number" />
                      </button>
                    </th>
                    <th className="px-6 py-4 text-left" scope="col">
                      <button
                        onClick={() => handleSort('activation_status')}
                        className={`flex items-center gap-2 font-black text-xs uppercase tracking-widest focus:outline-none focus:ring-2 rounded px-2 py-1 transition-colors ${isDarkMode ? 'text-slate-300 hover:text-coop-yellow focus:ring-coop-yellow' : 'text-gray-700 hover:text-coop-green focus:ring-coop-green'}`}
                        aria-label={`Sort by ${t('bulkImport.status')}`}
                      >
                        {t('bulkImport.status')}
                        <SortIcon field="activation_status" />
                      </button>
                    </th>
                    <th className="px-6 py-4 text-left" scope="col">
                      <button
                        onClick={() => handleSort('created_at')}
                        className={`flex items-center gap-2 font-black text-xs uppercase tracking-widest focus:outline-none focus:ring-2 rounded px-2 py-1 transition-colors ${isDarkMode ? 'text-slate-300 hover:text-coop-yellow focus:ring-coop-yellow' : 'text-gray-700 hover:text-coop-green focus:ring-coop-green'}`}
                        aria-label={`Sort by ${t('bulkImport.importedDate')}`}
                      >
                        {t('bulkImport.importedDate')}
                        <SortIcon field="created_at" />
                      </button>
                    </th>
                    <th className={`px-6 py-4 text-left font-black text-xs uppercase tracking-widest ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`} scope="col">{t('bulkImport.activationMethod')}</th>
                    <th className={`px-6 py-4 text-left font-black text-xs uppercase tracking-widest ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`} scope="col">{t('bulkImport.resendInvitation')}</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-slate-700' : 'divide-gray-200'}`}>
                  {members.map((member) => (
                    <tr key={member.id} className={`transition-all duration-150 ${isDarkMode ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'}`}>
                      <td className="px-6 py-4 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedMembers.has(member.id)}
                          onChange={() => handleSelectMember(member.id)}
                          className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500 cursor-pointer"
                          aria-label={`Select ${member.name}`}
                        />
                      </td>
                      <td className={`px-6 py-4 text-sm font-semibold ${isDarkMode ? 'text-slate-200' : 'text-gray-900'}`}>{member.member_id}</td>
                      <td className={`px-6 py-4 text-sm font-medium ${isDarkMode ? 'text-slate-200' : 'text-gray-900'}`}>{member.name}</td>
                      <td className={`px-6 py-4 text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>{member.phone_number}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[member.activation_status]}`}>
                          {statusLabels[member.activation_status]}
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                        {new Date(member.imported_at).toLocaleDateString()}
                      </td>
                      <td className={`px-6 py-4 text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                        {member.activation_method ? member.activation_method.toUpperCase() : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm space-x-2 flex">
                        <button
                          onClick={() => handleViewDetails(member.id)}
                          className={`p-2 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md active:scale-95 focus:outline-none focus:ring-2 ${isDarkMode ? 'text-blue-400 hover:bg-slate-600 focus:ring-blue-500' : 'text-blue-600 hover:bg-blue-50 focus:ring-blue-500'}`}
                          title={t('bulkImport.viewDetails')}
                          aria-label={`View details for ${member.name}`}
                        >
                          <Eye className="w-4 h-4" aria-hidden="true" />
                        </button>
                        {member.activation_status === 'pending_activation' && (
                          <button
                            onClick={() => handleResendInvitation(member.id)}
                            className={`p-2 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md active:scale-95 focus:outline-none focus:ring-2 ${isDarkMode ? 'text-coop-yellow hover:bg-slate-600 focus:ring-coop-yellow' : 'text-coop-green hover:bg-green-50 focus:ring-coop-green'}`}
                            title={t('bulkImport.resendInvitation')}
                            aria-label={`Resend invitation to ${member.name}`}
                          >
                            <RotateCcw className="w-4 h-4" aria-hidden="true" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View with enhanced styling */}
            <div className={`md:hidden divide-y ${isDarkMode ? 'divide-slate-700' : 'divide-gray-200'}`}>
              {members.map((member) => (
                <div key={member.id} className={`p-4 transition-all duration-200 ${isDarkMode ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedMembers.has(member.id)}
                        onChange={() => handleSelectMember(member.id)}
                        className={`w-5 h-5 rounded border-2 cursor-pointer transition-all ${isDarkMode ? 'text-coop-yellow border-slate-600 focus:ring-coop-yellow' : 'text-coop-green border-gray-300 focus:ring-coop-green'}`}
                        aria-label={`Select ${member.name}`}
                      />
                      <div>
                        <h3 className={`font-bold text-base ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>{member.name}</h3>
                        <p className={`text-xs font-semibold ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{member.member_id}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase shadow-sm ${statusColors[member.activation_status]}`}>
                      {statusLabels[member.activation_status]}
                    </span>
                  </div>
                  
                  <div className={`space-y-2 text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                    <div className="flex justify-between">
                      <span className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>{t('bulkImport.phoneNumber')}:</span>
                      <span>{member.phone_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>{t('bulkImport.importedDate')}:</span>
                      <span>{new Date(member.imported_at).toLocaleDateString()}</span>
                    </div>
                    {member.activation_method && (
                      <div className="flex justify-between">
                        <span className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>{t('bulkImport.activationMethod')}:</span>
                        <span>{member.activation_method.toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleViewDetails(member.id)}
                      className={`flex-1 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all shadow-sm hover:shadow-md active:scale-95 focus:outline-none focus:ring-2 ${isDarkMode ? 'bg-slate-700 text-blue-400 hover:bg-slate-600 border border-slate-600 focus:ring-blue-500' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 focus:ring-blue-500'}`}
                    >
                      <Eye className="w-4 h-4 inline mr-1" aria-hidden="true" />
                      View
                    </button>
                    {member.activation_status === 'pending_activation' && (
                      <button
                        onClick={() => handleResendInvitation(member.id)}
                        className={`flex-1 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all shadow-sm hover:shadow-md active:scale-95 focus:outline-none focus:ring-2 ${isDarkMode ? 'bg-coop-yellow text-slate-900 hover:bg-coop-yellow/80 focus:ring-coop-yellow' : 'bg-coop-green text-white hover:bg-coop-darkGreen focus:ring-coop-green'}`}
                      >
                        <RotateCcw className="w-4 h-4 inline mr-1" aria-hidden="true" />
                        Resend
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination with enhanced styling */}
            <div className={`px-4 md:px-6 py-5 border-t-2 flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors duration-300 ${isDarkMode ? 'bg-slate-900 border-coop-yellow/30' : 'bg-gray-100 border-gray-300'}`}>
              <div className={`text-xs font-bold uppercase tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                Page {pagination.page} of {pagination.pages}
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  onClick={() => fetchMembers(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className={`px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md active:scale-95 text-xs font-bold uppercase tracking-wide ${isDarkMode ? 'bg-slate-700 border border-slate-600 text-slate-300 hover:bg-slate-600 disabled:hover:bg-slate-700' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:hover:bg-white'}`}
                >
                  Previous
                </button>
                <div className="flex items-center gap-1 md:gap-2">
                  {Array.from({ length: Math.min(pagination.pages, 5) }, (_, i) => {
                    let page;
                    if (pagination.pages <= 5) {
                      page = i + 1;
                    } else if (pagination.page <= 3) {
                      page = i + 1;
                    } else if (pagination.page >= pagination.pages - 2) {
                      page = pagination.pages - 4 + i;
                    } else {
                      page = pagination.page - 2 + i;
                    }
                    return (
                      <button
                        key={page}
                        onClick={() => fetchMembers(page)}
                        className={`px-3 md:px-4 py-2 rounded-lg transition-all shadow-sm hover:shadow-md active:scale-95 text-xs font-bold ${
                          pagination.page === page
                            ? isDarkMode 
                              ? 'bg-coop-yellow text-slate-900 ring-2 ring-coop-yellow/50' 
                              : 'bg-coop-green text-white ring-2 ring-coop-green/50'
                            : isDarkMode 
                              ? 'bg-slate-700 border border-slate-600 text-slate-300 hover:bg-slate-600' 
                              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => fetchMembers(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className={`px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md active:scale-95 text-xs font-bold uppercase tracking-wide ${isDarkMode ? 'bg-slate-700 border border-slate-600 text-slate-300 hover:bg-slate-600 disabled:hover:bg-slate-700' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:hover:bg-white'}`}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Member Details Modal with enhanced styling */}
      {showDetailsModal && memberDetails && (
        <div className={`fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-sm transition-all duration-300 ${isDarkMode ? 'bg-slate-900/50' : 'bg-gray-900/50'}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className={`rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 transition-all duration-300 animate-fadeIn ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
            <div className={`p-4 md:p-6 border-b-2 flex justify-between items-center sticky top-0 z-10 transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-coop-yellow/30' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black ${isDarkMode ? 'bg-coop-yellow text-slate-900' : 'bg-coop-green text-white'}`}>
                  <Eye size={20} />
                </div>
                <h3 className={`text-lg md:text-xl font-black uppercase tracking-tight ${isDarkMode ? 'text-coop-yellow' : 'text-gray-900'}`} id="modal-title">{t('bulkImport.viewDetails')}</h3>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className={`text-2xl font-bold transition-all hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 rounded-lg p-2 ${isDarkMode ? 'text-slate-400 hover:text-coop-yellow focus:ring-coop-yellow' : 'text-gray-500 hover:text-gray-700 focus:ring-coop-green'}`}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            <div className="p-4 md:p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className={`p-4 rounded-lg border transition-colors duration-300 ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                  <label className={`text-xs font-black uppercase tracking-widest block mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{t('bulkImport.memberId')}</label>
                  <p className={`font-bold ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>{memberDetails.member_id}</p>
                </div>
                <div className={`p-4 rounded-lg border transition-colors duration-300 ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                  <label className={`text-xs font-black uppercase tracking-widest block mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{t('bulkImport.memberName')}</label>
                  <p className={`font-bold ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>{memberDetails.name}</p>
                </div>
                <div className={`p-4 rounded-lg border transition-colors duration-300 ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                  <label className={`text-xs font-black uppercase tracking-widest block mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{t('bulkImport.phoneNumber')}</label>
                  <p className={`font-semibold ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>{memberDetails.phone_number}</p>
                </div>
                <div className={`p-4 rounded-lg border transition-colors duration-300 ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                  <label className={`text-xs font-black uppercase tracking-widest block mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{t('bulkImport.email')}</label>
                  <p className={`break-all font-semibold ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>{memberDetails.email || '-'}</p>
                </div>
                <div className={`p-4 rounded-lg border transition-colors duration-300 ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                  <label className={`text-xs font-black uppercase tracking-widest block mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{t('bulkImport.status')}</label>
                  <p>
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase shadow-sm ${statusColors[memberDetails.activation_status]}`}>
                      {statusLabels[memberDetails.activation_status]}
                    </span>
                  </p>
                </div>
                <div className={`p-4 rounded-lg border transition-colors duration-300 ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                  <label className={`text-xs font-black uppercase tracking-widest block mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{t('bulkImport.activationMethod')}</label>
                  <p className={`font-semibold ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>{memberDetails.activation_method ? memberDetails.activation_method.toUpperCase() : '-'}</p>
                </div>
                <div className={`p-4 rounded-lg border transition-colors duration-300 ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                  <label className={`text-xs font-black uppercase tracking-widest block mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{t('bulkImport.importedDate')}</label>
                  <p className={`text-sm font-semibold ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>{new Date(memberDetails.imported_at).toLocaleString()}</p>
                </div>
                <div className={`p-4 rounded-lg border transition-colors duration-300 ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                  <label className={`text-xs font-black uppercase tracking-widest block mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{t('bulkImport.smsSentDate')}</label>
                  <p className={`text-sm font-semibold ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>
                    {memberDetails.sms_sent_at ? new Date(memberDetails.sms_sent_at).toLocaleString() : '-'}
                  </p>
                </div>
                <div className={`p-4 rounded-lg border transition-colors duration-300 ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                  <label className={`text-xs font-black uppercase tracking-widest block mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{t('bulkImport.emailSentDate')}</label>
                  <p className={`text-sm font-semibold ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>
                    {memberDetails.temporary_password_expires
                      ? new Date(memberDetails.temporary_password_expires).toLocaleString()
                      : '-'}
                  </p>
                </div>
                <div className={`p-4 rounded-lg border transition-colors duration-300 ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                  <label className={`text-xs font-black uppercase tracking-widest block mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{t('bulkImport.activatedDate')}</label>
                  <p className={`text-sm font-semibold ${isDarkMode ? 'text-slate-100' : 'text-gray-900'}`}>
                    {memberDetails.activated_at ? new Date(memberDetails.activated_at).toLocaleString() : '-'}
                  </p>
                </div>
              </div>
            </div>
            <div className={`p-4 md:p-6 border-t-2 flex flex-col sm:flex-row justify-end gap-3 transition-colors duration-300 ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
              <button
                onClick={() => setShowDetailsModal(false)}
                className={`px-6 py-3 rounded-lg transition-all shadow-sm hover:shadow-md active:scale-95 focus:outline-none focus:ring-2 text-xs font-bold uppercase tracking-wide ${isDarkMode ? 'bg-slate-700 border border-slate-600 text-slate-300 hover:bg-slate-600 focus:ring-slate-500' : 'bg-gray-100 border border-gray-300 text-gray-700 hover:bg-gray-200 focus:ring-gray-500'}`}
              >
                {t('bulkImport.cancelButton')}
              </button>
              {memberDetails.activation_status === 'pending_activation' && (
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleResendInvitation(memberDetails.id);
                  }}
                  className={`px-6 py-3 rounded-lg transition-all shadow-md hover:shadow-lg active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 text-xs font-bold uppercase tracking-wide ${isDarkMode ? 'bg-coop-yellow text-slate-900 hover:bg-coop-yellow/80 focus:ring-coop-yellow' : 'bg-coop-green text-white hover:bg-coop-darkGreen focus:ring-coop-green'}`}
                >
                  {t('bulkImport.resendInvitation')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
