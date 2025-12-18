'use client';

import { useState, useEffect, FormEvent } from 'react';
import { supabaseBrowser } from '@/lib/supabaseClient';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface TeamMember {
  id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joined_at: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

interface Invitation {
  id: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  created_at: string;
  invited_by: string;
}

export default function TeamManagementPage() {
  const router = useRouter();
  const { currentOrg, canManageTeam } = useOrganization();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!canManageTeam()) {
      router.push('/');
      return;
    }
    loadTeamData();
  }, [currentOrg]);

  const loadTeamData = async () => {
    if (!currentOrg) return;

    setLoading(true);
    try {
      // Load members with their profile information including email
      const { data: membersData, error: membersError } = await supabaseBrowser
        .from('organization_members')
        .select(`
          id,
          user_id,
          role,
          joined_at
        `)
        .eq('organization_id', currentOrg.id);

      if (membersError) {
        console.error('Error loading members:', membersError);
      }

      if (membersData) {
        // Fetch profiles separately
        const userIds = membersData.map(m => m.user_id);
        const { data: profilesData } = await supabaseBrowser
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', userIds);

        // Combine members with profiles
        const formattedMembers = membersData.map((member: any) => {
          const profile = profilesData?.find(p => p.user_id === member.user_id);
          return {
            ...member,
            profiles: {
              full_name: profile?.full_name || 'Unknown',
              email: profile?.email || 'unknown@email.com',
            },
          };
        });
        setMembers(formattedMembers);
      }

      // Load pending invitations
      const { data: invitesData } = await supabaseBrowser
        .from('organization_invitations')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString());

      if (invitesData) {
        setInvitations(invitesData);
      }
    } catch (error) {
      console.error('Error loading team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!inviteEmail.trim()) {
      setError('Email is required');
      return;
    }

    setInviting(true);

    try {
      // Get the current session token
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/organization/invite', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          organizationId: currentOrg?.id,
          email: inviteEmail,
          role: inviteRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation');
      }

      setSuccess(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      setInviteRole('member');
      loadTeamData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      const { error } = await supabaseBrowser
        .from('organization_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      setSuccess('Role updated successfully');
      loadTeamData();
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      const { error } = await supabaseBrowser
        .from('organization_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      setSuccess('Member removed successfully');
      loadTeamData();
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabaseBrowser
        .from('organization_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;

      setSuccess('Invitation cancelled');
      loadTeamData();
    } catch (error: any) {
      setError(error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-800 border-t-[#4169E1] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <Link 
          href="/" 
          className="inline-flex items-center text-sm text-gray-400 hover:text-white mb-8 transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to app
        </Link>

        <h1 className="text-3xl font-bold mb-8">Team Management</h1>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-4 mb-6">
            <p className="text-green-400 text-sm">{success}</p>
          </div>
        )}

        {/* Invite Member */}
        <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Invite Team Member</h2>
          <form onSubmit={handleInvite} className="flex gap-4">
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="email@example.com"
              className="flex-1 rounded-lg bg-[#0a0a0a] border border-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#4169E1] focus:ring-1 focus:ring-[#4169E1]"
              required
            />
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value as any)}
              className="rounded-lg bg-[#0a0a0a] border border-gray-800 px-4 py-3 text-white focus:outline-none focus:border-[#4169E1] focus:ring-1 focus:ring-[#4169E1]"
            >
              <option value="viewer">Viewer</option>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button
              type="submit"
              disabled={inviting}
              className="bg-[#4169E1] hover:bg-[#3559c7] text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
            >
              {inviting ? 'Inviting...' : 'Send Invite'}
            </button>
          </form>
        </div>

        {/* Team Members */}
        <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Team Members ({members.length})</h2>
          <div className="space-y-3">
            {members.map(member => (
              <div key={member.id} className="flex items-center justify-between p-4 bg-[#0a0a0a] rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">{member.profiles.full_name}</p>
                  <p className="text-sm text-gray-400">{member.profiles.email}</p>
                </div>
                <div className="flex items-center gap-4">
                  <select
                    value={member.role}
                    onChange={e => handleRoleChange(member.id, e.target.value)}
                    disabled={member.role === 'owner'}
                    className="rounded-lg bg-[#111111] border border-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4169E1] disabled:opacity-50"
                  >
                    <option value="owner">Owner</option>
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  {member.role !== 'owner' && (
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Invitations */}
        {invitations.length > 0 && (
          <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-4">Pending Invitations ({invitations.length})</h2>
            <div className="space-y-3">
              {invitations.map(invitation => (
                <div key={invitation.id} className="flex items-center justify-between p-4 bg-[#0a0a0a] rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{invitation.email}</p>
                    <p className="text-sm text-gray-400">Role: {invitation.role}</p>
                  </div>
                  <button
                    onClick={() => handleCancelInvitation(invitation.id)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
