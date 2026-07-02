import React from 'react';
import { useParams } from 'react-router-dom';
import { useUserProfile } from '@/hooks/api/useUserProfiles';
import { useHrmsEmployeeProfile } from '@/hooks/api/useHrmsEmployeeProfiles';
import { useUsers } from '@/hooks/api/useUsers';

const EmployeeProfileView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const userId = id ? parseInt(id, 10) : undefined;
  
  const { data: userAccounts } = useUsers(); // Could fetch single user, but useUsers is likely cached
  const baseUser = userAccounts?.find(u => u.id === userId);

  const { data: profile, isLoading: profileLoading } = useUserProfile(userId);
  const { data: employeeProfile, isLoading: hrmsLoading } = useHrmsEmployeeProfile(userId);

  if (!userId || isNaN(userId)) {
    return <div className="p-6 text-center text-red-500">Invalid User ID provided.</div>;
  }

  if (profileLoading || hrmsLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto flex justify-center items-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const initials = profile?.firstName && profile?.lastName 
    ? `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase()
    : 'EMP';

  const fullName = profile?.firstName && profile?.lastName 
    ? `${profile.firstName} ${profile.lastName}`
    : baseUser?.name || 'Unknown Employee';

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header Profile Banner */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="w-24 h-24 flex-shrink-0 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex justify-center items-center text-white text-3xl font-bold shadow-lg ring-4 ring-white dark:ring-gray-900">
          {initials}
        </div>
        <div className="text-center md:text-left pt-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{fullName}</h1>
          <p className="text-gray-500 font-medium">
            {employeeProfile?.employeeType || 'Employee'} • {employeeProfile?.workLocation || 'Standard'}
          </p>
          <div className="flex flex-wrap justify-center md:justify-start mt-3 gap-2">
            <span className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-semibold rounded-full border border-green-200 dark:border-green-800/50">
              {employeeProfile?.employeeStatus || 'Active'}
            </span>
            {profile?.employeeCode && (
              <span className="px-3 py-1 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 text-xs font-medium rounded-full border border-gray-200 dark:border-gray-700">
                {profile.employeeCode}
              </span>
            )}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-sm font-bold tracking-widest text-gray-500 uppercase">Contact Information</h2>
            </div>
            <div className="p-6 grid grid-cols-2 gap-y-6 gap-x-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Official Email</p>
                <p className="font-medium text-gray-900 dark:text-white">{employeeProfile?.officialEmail || baseUser?.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Personal Email</p>
                <p className="font-medium text-gray-900 dark:text-white">{profile?.altEmail || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Phone</p>
                <p className="font-medium text-gray-900 dark:text-white">{profile?.phone || baseUser?.mobile || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Date of Joining</p>
                <p className="font-medium text-gray-900 dark:text-white">{profile?.dateOfJoining ? new Date(profile.dateOfJoining).toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h2 className="text-sm font-bold tracking-widest text-gray-500 uppercase pb-4 mb-4 border-b border-gray-100 dark:border-gray-700">Reporting Manager</h2>
            {employeeProfile?.reportingManagerId ? (
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-bold border border-gray-200 dark:border-gray-600">RM</div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-md">ID: {employeeProfile.reportingManagerId}</p>
                  <p className="text-xs text-gray-500">Manager</p>
                </div>
              </div>
            ) : (
                <p className="text-sm text-gray-500 italic">No reporting manager assigned.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeProfileView;
