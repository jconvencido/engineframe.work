'use client';

import { useState, useEffect } from 'react';
import { supabaseBrowser } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';

interface InvitationData {
  id: string;
  organization_id: string;
  email: string;
  role: string;
  expires_at: string;
  organizations: {
    name: string;
  } | null;
}

export default function AcceptInvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { refreshOrganizations } = useOrganization();
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInvitation();
  }, [resolvedParams.token]);

  const loadInvitation = async () => {
    try {
      const { data, error } = await supabaseBrowser
        .from('organization_invitations')
        .select(`
          id,
          organization_id,
          email,
          role,
          expires_at,
          organizations (name)
        `)
        .eq('token', resolvedParams.token)
        .is('accepted_at', null)
        .single();

      console.log('Invitation query result:', { data, error });

      if (error) {
        console.error('Invitation query error:', error);
        setError('Invalid or expired invitation');
        return;
      }

      if (!data) {
        setError('Invalid or expired invitation');
        return;
      }

      // Check if expired
      if (new Date(data.expires_at) < new Date()) {
        setError('This invitation has expired');
        return;
      }

      setInvitation(data as unknown as InvitationData);
    } catch (error) {
      console.error('Exception loading invitation:', error);
      setError('Failed to load invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!invitation) return;

    setAccepting(true);
    setError(null);

    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      
      if (!session) {
        // Redirect to login with invitation token so they can come back after login
        router.push(`/login?redirectTo=${encodeURIComponent(`/organization/invite/${resolvedParams.token}`)}`);
        return;
      }

      // Check if user's email matches invitation
      if (session.user.email !== invitation.email) {
        setError('This invitation was sent to a different email address');
        setAccepting(false);
        return;
      }

      // Add user to organization
      const { error: memberError } = await supabaseBrowser
        .from('organization_members')
        .insert({
          organization_id: invitation.organization_id,
          user_id: session.user.id,
          role: invitation.role,
        });

      if (memberError) throw memberError;

      // Mark invitation as accepted
      const { error: updateError } = await supabaseBrowser
        .from('organization_invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invitation.id);

      if (updateError) throw updateError;

      // Set as current org
      localStorage.setItem('currentOrgId', invitation.organization_id);

      // Refresh organizations to update the dropdown
      await refreshOrganizations();

      // Redirect to app
      router.push('/');
    } catch (error: any) {
      setError(error.message || 'Failed to accept invitation');
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-800 border-t-[#4169E1] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="max-w-md w-full mx-auto px-4">
          <div className="bg-[#111111] border border-gray-800 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-2">Invalid Invitation</h1>
            <p className="text-gray-400 mb-6">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="bg-[#4169E1] hover:bg-[#3559c7] text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-4">
        <div className="bg-[#111111] border border-gray-800 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-[#4169E1]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#4169E1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">You're Invited!</h1>
          <p className="text-gray-400 mb-6">
            You've been invited to join <span className="text-white font-semibold">{invitation.organizations?.name || 'an organization'}</span> as a <span className="text-[#4169E1]">{invitation.role}</span>
          </p>
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={handleAccept}
            disabled={accepting}
            className="w-full bg-[#4169E1] hover:bg-[#3559c7] text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {accepting ? 'Accepting...' : 'Accept Invitation'}
          </button>
        </div>
      </div>
    </div>
  );
}
