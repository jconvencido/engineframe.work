'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function OrganizationSettingsPage() {
  const router = useRouter();
  const { currentOrg, isOwner, isAdmin, updateOrganization, deleteOrganization } = useOrganizations();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  useEffect(() => {
    if (!currentOrg) {
      router.push('/');
      return;
    }

    // Check if user has permission to access settings
    if (!isOwner() && !isAdmin()) {
      router.push('/');
      return;
    }

    // Update orgName whenever currentOrg.name changes
    setOrgName(currentOrg.name);
    setLoading(false);
  }, [currentOrg?.name, currentOrg, isOwner, isAdmin, router]);

  const handleUpdateName = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentOrg) return;

    setError(null);
    setSuccess(null);
    setSaving(true);

    const result = await updateOrganization(currentOrg.id, { name: orgName.trim() });

    setSaving(false);

    if (!result.success) {
      setError(result.error || 'Failed to update organization');
      return;
    }

    setSuccess('Organization name updated successfully!');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleDeleteOrganization = async () => {
    if (!currentOrg) return;
    if (deleteConfirmText !== currentOrg.name) {
      setError('Organization name does not match');
      return;
    }

    setError(null);
    setDeleting(true);

    const result = await deleteOrganization(currentOrg.id);

    setDeleting(false);

    if (!result.success) {
      setError(result.error || 'Failed to delete organization');
      return;
    }

    // Redirect to home after successful deletion
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-800 border-t-[#4169E1] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!currentOrg) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <Link 
          href="/" 
          className="inline-flex items-center text-sm text-gray-400 hover:text-white mb-8 transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to app
        </Link>

        <h1 className="text-3xl font-bold mb-8">Organization Settings</h1>

        {/* Update Organization Name */}
        <form onSubmit={handleUpdateName} className="space-y-6 mb-8">
          <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-semibold mb-4">Organization Details</h2>
            
            <div>
              <label htmlFor="orgName" className="block text-sm font-medium text-gray-300 mb-2">
                Organization Name
              </label>
              <input
                id="orgName"
                type="text"
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                className="w-full rounded-lg bg-[#0a0a0a] border border-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#4169E1] focus:ring-1 focus:ring-[#4169E1] transition-colors"
                placeholder="Enter organization name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Your Role
              </label>
              <div className="w-full rounded-lg bg-[#0a0a0a] border border-gray-800 px-4 py-3 text-gray-400 capitalize">
                {currentOrg.role}
              </div>
            </div>
          </div>

          {error && !showDeleteModal && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-3">
              <p className="text-sm text-green-400">{success}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={saving || !orgName.trim() || orgName === currentOrg.name}
            className="w-full py-3 rounded-lg bg-[#4169E1] hover:bg-[#3557c7] text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>

        {/* Delete Organization - Only for Owners */}
        {isOwner() && (
          <div className="bg-[#111111] border border-red-900/50 rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-semibold text-red-400 mb-2">Danger Zone</h2>
            <p className="text-sm text-gray-400 mb-4">
              Deleting this organization will permanently remove all data including team members, invitations, analyses, and custom advisor modes. This action cannot be undone.
            </p>
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="px-6 py-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium border border-red-500/50 transition-colors cursor-pointer"
            >
              Delete Organization
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4">
          <div className="bg-[#111111] border border-red-900/50 rounded-2xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold text-red-400 mb-4">Delete Organization</h2>
            <p className="text-gray-300 mb-4">
              This will permanently delete <span className="font-semibold text-white">{currentOrg.name}</span> and all associated data.
            </p>
            <p className="text-sm text-gray-400 mb-6">
              Type the organization name <span className="font-semibold text-white">{currentOrg.name}</span> to confirm:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              className="w-full rounded-lg bg-[#0a0a0a] border border-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors mb-6"
              placeholder="Enter organization name"
            />

            {error && showDeleteModal && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                  setError(null);
                }}
                disabled={deleting}
                className="flex-1 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-medium transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteOrganization}
                disabled={deleting || deleteConfirmText !== currentOrg.name}
                className="flex-1 py-3 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {deleting ? 'Deleting...' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
