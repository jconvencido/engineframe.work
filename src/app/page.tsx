'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import AuthModal from '@/components/AuthModal';
import ChatInterface from '@/components/ChatInterface';
import { supabaseBrowser } from '@/lib/supabaseClient';
import type { User } from '@supabase/supabase-js';

export default function HomePage() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [selectedAdvisorMode, setSelectedAdvisorMode] = useState<string | null>(null);
  const [modeDropdownOpen, setModeDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasStartedChat, setHasStartedChat] = useState(false);

  const advisorModes = [
    { id: 'sales', name: 'Sales', description: 'Strategies for boosting sales performance' },
    { id: 'marketing', name: 'Marketing', description: 'Insights to increase marketing impact' },
    { id: 'startup', name: 'Startup', description: 'Guidance on launching new ventures' },
    { id: 'enterprise', name: 'Enterprise', description: 'Solutions for scaling and optimization' },
    { id: 'finance', name: 'Finance', description: 'Financial planning and management advice' },
    { id: 'operations', name: 'Operations', description: 'Optimize workflows and processes' },
    { id: 'hr', name: 'Human Resources', description: 'Talent management and team building' },
    { id: 'product', name: 'Product Strategy', description: 'Product development and roadmap planning' },
    { id: 'customer-success', name: 'Customer Success', description: 'Improve customer retention and satisfaction' },
    { id: 'growth', name: 'Growth Strategy', description: 'Scaling and expansion strategies' },
    { id: 'branding', name: 'Branding', description: 'Build and strengthen your brand identity' },
    { id: 'ecommerce', name: 'E-Commerce', description: 'Online retail optimization strategies' },
    { id: 'saas', name: 'SaaS', description: 'Software as a Service business models' },
    { id: 'fundraising', name: 'Fundraising', description: 'Investment and funding strategies' },
    { id: 'legal', name: 'Legal & Compliance', description: 'Business law and regulatory guidance' },
    { id: 'technology', name: 'Technology', description: 'Tech stack and digital transformation' },
    { id: 'analytics', name: 'Analytics', description: 'Data-driven decision making' },
    { id: 'partnerships', name: 'Partnerships', description: 'Strategic alliances and collaborations' },
    { id: 'international', name: 'International Expansion', description: 'Global market entry strategies' },
    { id: 'sustainability', name: 'Sustainability', description: 'ESG and sustainable business practices' },
  ];

  const cardsPerPage = 4;
  const totalPages = Math.ceil(advisorModes.length / cardsPerPage);
  const currentModes = advisorModes.slice(
    currentPage * cardsPerPage,
    (currentPage + 1) * cardsPerPage
  );

  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  useEffect(() => {
    // Check current auth status
    supabaseBrowser.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Check email verification
  const isEmailVerified = user?.email_confirmed_at != null;

  const handleSignOut = async () => {
    await supabaseBrowser.auth.signOut();
    setUserMenuOpen(false);
  };

  const openLoginModal = () => {
    setAuthMode('login');
    setAuthModalOpen(true);
  };

  const openSignupModal = () => {
    setAuthMode('signup');
    setAuthModalOpen(true);
  };

  const switchAuthMode = () => {
    setAuthMode(authMode === 'login' ? 'signup' : 'login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-800 border-t-[#4169E1] rounded-full animate-spin"></div>
      </div>
    );
  }

  // Logged-in view with hero, cards, and chat input
  if (user) {
    // Email verification check
    if (!isEmailVerified) {
      return (
        <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center px-4">
          <div className="max-w-md text-center">
            <div className="bg-[#111111] border border-gray-800 rounded-2xl p-8 space-y-6">
              <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold mb-2">Verify Your Email</h1>
                <p className="text-gray-400">
                  Please check your email inbox and click the verification link to access your account.
                </p>
                <p className="text-sm text-gray-500 mt-4">
                  Email sent to: <span className="text-white">{user.email}</span>
                </p>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full py-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-medium transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
        {/* Navigation */}
        <nav className="max-w-6xl mx-auto w-full px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-sm font-medium hover:text-gray-300 transition-colors">
              Features
            </Link>
            <Link href="/" className="text-sm font-medium hover:text-gray-300 transition-colors">
              Pricing
            </Link>
            <Link href="/" className="text-sm font-medium hover:text-gray-300 transition-colors">
              Docs
            </Link>
          </div>
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 hover:text-gray-300 transition-colors text-sm font-medium"
            >
              <div className="w-7 h-7 rounded-full bg-[#4169E1] flex items-center justify-center text-xs font-medium">
                {user.email?.[0].toUpperCase()}
              </div>
              <span>{user.email?.split('@')[0]}</span>
            </button>
            
            {userMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setUserMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-[#111111] border border-gray-800 rounded-lg shadow-lg py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-800">
                    <p className="text-sm text-gray-400">Signed in as</p>
                    <p className="text-sm font-medium truncate">{user.email}</p>
                  </div>
                  <Link
                    href="/settings"
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-[#0a0a0a] transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    Profile Settings
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-[#0a0a0a] transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </nav>

        {/* Hero Section */}
        <main className="flex-1 max-w-4xl mx-auto px-8 pt-12 pb-8 text-center">
          
          {!hasStartedChat && 
            <>
              <h1 className="text-6xl font-bold tracking-tight mb-6">
                Business Engine
                <br />
                Advisor
              </h1>
              <p className="text-xl text-gray-400 mb-16 max-w-2xl mx-auto">
                Your AI-powered business advisor for
                <br />
                strategic insights and growth.
              </p>
            </>
          }

          {/* Advisor Mode Cards or Dropdown */}
          {!selectedAdvisorMode && !hasStartedChat ? (
            <div className="relative max-w-3xl mx-auto">
              {/* Navigation Arrows */}
              <button
                onClick={goToPrevPage}
                disabled={currentPage === 0}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 w-10 h-10 rounded-full bg-[#111111] border border-gray-800 flex items-center justify-center hover:border-[#4169E1] transition-all disabled:opacity-30 disabled:cursor-not-allowed z-10"
                aria-label="Previous page"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {currentModes.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setSelectedAdvisorMode(mode.id)}
                    className="bg-[#111111] border border-gray-800 rounded-2xl p-8 text-left hover:border-[#4169E1] hover:bg-[#111111]/80 transition-all"
                  >
                    <h3 className="text-2xl font-bold mb-3">{mode.name}</h3>
                    <p className="text-gray-400">{mode.description}</p>
                  </button>
                ))}
              </div>

              <button
                onClick={goToNextPage}
                disabled={currentPage === totalPages - 1}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 w-10 h-10 rounded-full bg-[#111111] border border-gray-800 flex items-center justify-center hover:border-[#4169E1] transition-all disabled:opacity-30 disabled:cursor-not-allowed z-10"
                aria-label="Next page"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Page Indicator */}
              <div className="flex justify-center gap-2 mt-6">
                {Array.from({ length: totalPages }).map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentPage(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentPage ? 'bg-[#4169E1] w-6' : 'bg-gray-800'
                    }`}
                    aria-label={`Go to page ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-md mx-auto relative">
              <button
                onClick={() => setModeDropdownOpen(!modeDropdownOpen)}
                className="w-full bg-[#111111] border border-[#4169E1] rounded-2xl p-6 text-left flex items-center justify-between hover:bg-[#111111]/80 transition-all"
              >
                <div>
                  <div className="text-sm text-gray-400 mb-1">Selected Advisor Mode</div>
                  <div className="text-xl font-bold">
                    {advisorModes.find(m => m.id === selectedAdvisorMode)?.name}
                  </div>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${modeDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {modeDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setModeDropdownOpen(false)}
                  />
                  <div className="absolute top-full mt-2 w-full bg-[#111111] border border-gray-800 rounded-2xl shadow-lg py-2 z-50">
                    {advisorModes.map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => {
                          setSelectedAdvisorMode(mode.id);
                          setModeDropdownOpen(false);
                        }}
                        className={`w-full text-left px-6 py-4 hover:bg-[#0a0a0a] transition-colors ${
                          selectedAdvisorMode === mode.id ? 'bg-[#4169E1]/10' : ''
                        }`}
                      >
                        <div className="font-bold mb-1">{mode.name}</div>
                        <div className="text-sm text-gray-400">{mode.description}</div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </main>

        {/* Chat Input at Bottom */}
        <div className="border-t border-gray-800 bg-[#0a0a0a] px-4 py-6">
          <ChatInterface 
            selectedMode={selectedAdvisorMode} 
            disabled={!selectedAdvisorMode} 
            onFirstMessage={() => setHasStartedChat(true)}
          />
        </div>
      </div>
    );
  }

  // Landing page for non-authenticated users
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Navigation */}
      <nav className="max-w-6xl mx-auto px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-sm font-medium hover:text-gray-300 transition-colors">
            Features
          </Link>
          <Link href="/" className="text-sm font-medium hover:text-gray-300 transition-colors">
            Pricing
          </Link>
          <Link href="/" className="text-sm font-medium hover:text-gray-300 transition-colors">
            Docs
          </Link>
        </div>
        <button
          onClick={openLoginModal}
          className="text-sm font-medium hover:text-gray-300 transition-colors"
        >
          Sign In
        </button>
      </nav>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-8 pt-20 pb-16 text-center">
        <h1 className="text-6xl font-bold tracking-tight mb-6">
          Business Engine
          <br />
          Advisor
        </h1>
        <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
          Your AI-powered business advisor for
          <br />
          strategic insights and growth.
        </p>
        <button
          onClick={openSignupModal}
          className="inline-block px-8 py-3 bg-[#4169E1] hover:bg-[#3557c7] text-white font-medium rounded-lg transition-colors"
        >
          Get Started
        </button>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-16 max-w-3xl mx-auto">
          {/* Sales Card */}
          <div className="bg-[#111111] border border-gray-800 rounded-2xl p-8 text-left hover:border-gray-700 transition-colors">
            <h3 className="text-2xl font-bold mb-3">Sales</h3>
            <p className="text-gray-400">
              Strategies for boosting sales
              <br />
              performance
            </p>
          </div>

          {/* Marketing Card */}
          <div className="bg-[#111111] border border-gray-800 rounded-2xl p-8 text-left hover:border-gray-700 transition-colors">
            <h3 className="text-2xl font-bold mb-3">Marketing</h3>
            <p className="text-gray-400">
              Insights to increase
              <br />
              marketing impact
            </p>
          </div>

          {/* Startup Card */}
          <div className="bg-[#111111] border border-gray-800 rounded-2xl p-8 text-left hover:border-gray-700 transition-colors">
            <h3 className="text-2xl font-bold mb-3">Startup</h3>
            <p className="text-gray-400">
              Guidance on launching
              <br />
              new ventures
            </p>
          </div>

          {/* Enterprise Card */}
          <div className="bg-[#111111] border border-gray-800 rounded-2xl p-8 text-left hover:border-gray-700 transition-colors">
            <h3 className="text-2xl font-bold mb-3">Enterprise</h3>
            <p className="text-gray-400">
              Solutions for scaling and
              <br />
              optimization
            </p>
          </div>
        </div>
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        mode={authMode}
        onSwitchMode={switchAuthMode}
      />
    </div>
  );
}
