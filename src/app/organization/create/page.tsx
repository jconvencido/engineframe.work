'use client';

import { useState, FormEvent } from 'react';
import { supabaseBrowser } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CreateOrganizationPage() {
  const router = useRouter();
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      + '-' + Math.random().toString(36).substring(2, 8);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!orgName.trim()) {
      setError('Organization name is required');
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session) {
        setError('You must be logged in to create an organization');
        return;
      }

      console.log('Creating org with user:', session.user.id);

      const slug = generateSlug(orgName);

      // Use RPC function to create organization (bypasses RLS issues)
      const { data: org, error: orgError } = await supabaseBrowser
        .rpc('create_organization', {
          org_name: orgName,
          org_slug: slug
        });

      if (orgError) {
        console.error('Organization creation error:', orgError);
        throw orgError;
      }

      console.log('Organization created:', org);

      // Set as current org
      localStorage.setItem('currentOrgId', org.id);
      
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Failed to create organization');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-xl mx-auto px-4 py-12">
        <Link 
          href="/" 
          className="inline-flex items-center text-sm text-gray-400 hover:text-white mb-8 transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to app
        </Link>

        <div className="bg-[#111111] border border-gray-800 rounded-2xl p-8">
          <h1 className="text-3xl font-bold mb-2">Create Organization</h1>
          <p className="text-gray-400 mb-8">
            Create a new workspace to collaborate with your team
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
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
                placeholder="Acme Inc."
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                You can change this later in organization settings
              </p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#4169E1] hover:bg-[#3559c7] text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Organization'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
