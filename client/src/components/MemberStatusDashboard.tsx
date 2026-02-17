import React, { useState, useEffect } from 'react';
import { Search, ChevronUp, ChevronDown, Eye, RotateCcw, Loader } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Swal from 'sweetalert2';
import api from '../services/api';

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">{t('bulkImport.memberStatusDashboard')}</h2>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        {/* Search Bar */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" aria-hidden="true" />
            <input
              type="text"
              placeholder={t('bulkImport.searchByMemberId')}
              value={searchTerm}
              onChange={handleSearch}
              onKeyPress={(e) => e.key === 'Enter' && handleSearchSubmit()}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              aria-label={t('bulkImport.searchByMemberId')}
            />
          </div>
          <button
            onClick={handleSearchSubmit}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition focus:outline-none focus:ring-2 focus:ring-green-500"
            aria-label={t('bulkImport.searchByMemberId')}
          >
            {t('bulkImport.searchByMemberId')}
          </button>
        </div>

        {/* Status Filter */}
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('bulkImport.filterByStatus')}>
          <span className="text-sm font-semibold text-gray-700 self-center">{t('bulkImport.filterByStatus')}:</span>
          {Object.entries(statusLabels).map(([status, label]) => (
            <button
              key={status}
              onClick={() => handleStatusFilterChange(status)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-green-500 ${
                statusFilter === status
                  ? statusColors[status]
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              aria-pressed={statusFilter === status}
            >
              {label}
            </button>
          ))}
          {statusFilter && (
            <button
              onClick={() => setStatusFilter('')}
              className="px-3 py-1 rounded-full text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition focus:outline-none focus:ring-2 focus:ring-green-500"
              aria-label={`Clear ${statusFilter} filter`}
            >
              {t('bulkImport.cancelButton')}
            </button>
          )}
        </div>
      </div>

      {/* Bulk Resend Button */}
      {selectedMembers.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between" role="region" aria-live="polite" aria-label="Bulk actions">
          <span className="text-sm font-medium text-blue-900">
            {t('bulkImport.selectedCount', { count: selectedMembers.size })}
          </span>
          <button
            onClick={handleBulkResend}
            disabled={isBulkResending}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-green-500"
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

      {/* Members Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">{t('bulkImport.importInProgress')}...</div>
        ) : members.length === 0 ? (
          <div className="p-8 text-center text-gray-500">{t('bulkImport.noMembers')}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full" role="table" aria-label="Imported members">
                <thead className="bg-gray-50 border-b border-gray-200">
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
                    <th className="px-6 py-3 text-left" scope="col">
                      <button
                        onClick={() => handleSort('member_id')}
                        className="flex items-center gap-2 font-semibold text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 rounded px-2 py-1"
                        aria-label={`Sort by ${t('bulkImport.memberId')}`}
                      >
                        {t('bulkImport.memberId')}
                        <SortIcon field="member_id" />
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left" scope="col">
                      <button
                        onClick={() => handleSort('name')}
                        className="flex items-center gap-2 font-semibold text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 rounded px-2 py-1"
                        aria-label={`Sort by ${t('bulkImport.memberName')}`}
                      >
                        {t('bulkImport.memberName')}
                        <SortIcon field="name" />
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left" scope="col">
                      <button
                        onClick={() => handleSort('phone_number')}
                        className="flex items-center gap-2 font-semibold text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 rounded px-2 py-1"
                        aria-label={`Sort by ${t('bulkImport.phoneNumber')}`}
                      >
                        {t('bulkImport.phoneNumber')}
                        <SortIcon field="phone_number" />
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left" scope="col">
                      <button
                        onClick={() => handleSort('activation_status')}
                        className="flex items-center gap-2 font-semibold text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 rounded px-2 py-1"
                        aria-label={`Sort by ${t('bulkImport.status')}`}
                      >
                        {t('bulkImport.status')}
                        <SortIcon field="activation_status" />
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left" scope="col">
                      <button
                        onClick={() => handleSort('created_at')}
                        className="flex items-center gap-2 font-semibold text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 rounded px-2 py-1"
                        aria-label={`Sort by ${t('bulkImport.importedDate')}`}
                      >
                        {t('bulkImport.importedDate')}
                        <SortIcon field="created_at" />
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700" scope="col">{t('bulkImport.activationMethod')}</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700" scope="col">{t('bulkImport.resendInvitation')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {members.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedMembers.has(member.id)}
                          onChange={() => handleSelectMember(member.id)}
                          className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500 cursor-pointer"
                          aria-label={`Select ${member.name}`}
                        />
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{member.member_id}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{member.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{member.phone_number}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[member.activation_status]}`}>
                          {statusLabels[member.activation_status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(member.imported_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {member.activation_method ? member.activation_method.toUpperCase() : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm space-x-2 flex">
                        <button
                          onClick={() => handleViewDetails(member.id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded transition focus:outline-none focus:ring-2 focus:ring-blue-500"
                          title={t('bulkImport.viewDetails')}
                          aria-label={`View details for ${member.name}`}
                        >
                          <Eye className="w-4 h-4" aria-hidden="true" />
                        </button>
                        {member.activation_status === 'pending_activation' && (
                          <button
                            onClick={() => handleResendInvitation(member.id)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded transition focus:outline-none focus:ring-2 focus:ring-green-500"
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

            {/* Pagination */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {t('bulkImport.pagination', { 
                  current: pagination.page, 
                  total: pagination.pages 
                })}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchMembers(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Previous
                </button>
                <div className="flex items-center gap-2">
                  {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => fetchMembers(page)}
                      className={`px-3 py-2 rounded-lg transition ${
                        pagination.page === page
                          ? 'bg-green-600 text-white'
                          : 'border border-gray-300 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => fetchMembers(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Member Details Modal */}
      {showDetailsModal && memberDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-xl font-bold text-gray-800" id="modal-title">{t('bulkImport.viewDetails')}</h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl focus:outline-none focus:ring-2 focus:ring-green-500 rounded p-1"
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-600">{t('bulkImport.memberId')}</label>
                  <p className="text-gray-900">{memberDetails.member_id}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">{t('bulkImport.memberName')}</label>
                  <p className="text-gray-900">{memberDetails.name}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">{t('bulkImport.phoneNumber')}</label>
                  <p className="text-gray-900">{memberDetails.phone_number}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">{t('bulkImport.email')}</label>
                  <p className="text-gray-900">{memberDetails.email || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">{t('bulkImport.status')}</label>
                  <p>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[memberDetails.activation_status]}`}>
                      {statusLabels[memberDetails.activation_status]}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">{t('bulkImport.activationMethod')}</label>
                  <p className="text-gray-900">{memberDetails.activation_method ? memberDetails.activation_method.toUpperCase() : '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">{t('bulkImport.importedDate')}</label>
                  <p className="text-gray-900">{new Date(memberDetails.imported_at).toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">{t('bulkImport.smsSentDate')}</label>
                  <p className="text-gray-900">
                    {memberDetails.sms_sent_at ? new Date(memberDetails.sms_sent_at).toLocaleString() : '-'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">{t('bulkImport.emailSentDate')}</label>
                  <p className="text-gray-900">
                    {memberDetails.temporary_password_expires
                      ? new Date(memberDetails.temporary_password_expires).toLocaleString()
                      : '-'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">{t('bulkImport.activatedDate')}</label>
                  <p className="text-gray-900">
                    {memberDetails.activated_at ? new Date(memberDetails.activated_at).toLocaleString() : '-'}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {t('bulkImport.cancelButton')}
              </button>
              {memberDetails.activation_status === 'pending_activation' && (
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleResendInvitation(memberDetails.id);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition focus:outline-none focus:ring-2 focus:ring-green-500"
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
