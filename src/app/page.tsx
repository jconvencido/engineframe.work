'use client';

import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AuthModal from '@/components/AuthModal';
import ChatInterface from '@/components/ChatInterface';
import ConversationSidebar from '@/components/ConversationSidebar';
import { useAuth, useOrganizations, useAdvisorModes, useConversations } from '@/hooks';
import { useUIStore } from '@/stores';

function HomePageContent() {
  const searchParams = useSearchParams();
  const [selectedAdvisorMode, setSelectedAdvisorMode] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasStartedChat, setHasStartedChat] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  
  // Use custom hooks and stores
  const { user, isLoading: authLoading, isEmailVerified, signOut } = useAuth();
  const { 
    currentOrg, 
    userOrgs, 
    switchOrganization, 
    canManageTeam, 
    canCreateAnalysis,
    isOwner
  } = useOrganizations();
  // Only pass organizationId if user is authenticated and has a current org
  const { modes: advisorModes } = useAdvisorModes(user && currentOrg?.id ? currentOrg.id : null);
  
  // Conversation management
  const {
    conversations,
    currentConversation,
    messages: conversationMessages,
    fetchConversations,
    createConversation,
    loadConversation,
    updateConversation,
    deleteConversation,
    clearCurrentConversation,
  } = useConversations(currentOrg?.id);

  const {
    authModalOpen,
    authMode,
    userMenuOpen,
    orgMenuOpen,
    modeDropdownOpen,
    openAuthModal,
    closeAuthModal,
    switchAuthMode,
    toggleUserMenu,
    toggleOrgMenu,
    toggleModeDropdown,
    closeAllDropdowns,
  } = useUIStore();
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

  // Check for modal parameter in URL
  useEffect(() => {
    const modal = searchParams.get('modal');
    if (modal === 'login') {
      openAuthModal('login');
    } else if (modal === 'signup') {
      openAuthModal('signup');
    }
  }, [searchParams, openAuthModal]);

  // Fetch conversations when organization changes
  useEffect(() => {
    if (user && currentOrg) {
      fetchConversations();
    }
  }, [user, currentOrg, fetchConversations]);

  const handleSignOut = async () => {
    await signOut();
    closeAllDropdowns();
  };

  const handleNewChat = () => {
    setCurrentConversationId(null);
    clearCurrentConversation();
    setSidebarOpen(false);
  };

  const handleSelectConversation = async (conversationId: string) => {
    const result = await loadConversation(conversationId);
    if (result.success && result.data) {
      setCurrentConversationId(conversationId);
      setSidebarOpen(false);
      
      // Set the advisor mode from the conversation
      const conversation = result.data.conversation;
      const mode = advisorModes.find(m => m.id === conversation.advisor_mode_id);
      if (mode) {
        setSelectedAdvisorMode(mode.slug);
        setHasStartedChat(true);
      }
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    await deleteConversation(conversationId);
    if (conversationId === currentConversationId) {
      handleNewChat();
    }
  };

  const handleToggleShare = async (conversationId: string, isShared: boolean) => {
    await updateConversation(conversationId, { is_shared: isShared });
  };

  const handleConversationCreated = async (title: string, modeSlug: string) => {
    if (!currentOrg) return;
    
    const mode = advisorModes.find(m => m.slug === modeSlug);
    if (!mode) return;

    const result = await createConversation({
      organization_id: currentOrg.id,
      advisor_mode_id: mode.id,
      title: title.slice(0, 50) + (title.length > 50 ? '...' : ''),
      is_shared: false,
    });

    if (result.success && result.conversation) {
      setCurrentConversationId(result.conversation.id);
      return result.conversation.id;
    }
  };

  const handleMessageSaved = async () => {
    // Refresh the conversation list for the sidebar
    await fetchConversations();
    // Don't reload the current conversation - keep local state
    // Messages are already displayed in the UI from local state
  };

  const handleConversationForked = async (newConversationId: string, shouldReload: boolean = false) => {
    // Set the conversation ID to select it
    setCurrentConversationId(newConversationId);
    
    // Refresh conversation list to show the forked conversation in sidebar
    await fetchConversations();
    
    // Only reload if explicitly requested (after messages are saved)
    if (shouldReload) {
      await loadConversation(newConversationId);
    }
  };

  if (authLoading) {
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
                className="w-full py-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-medium transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex">
        {/* Conversation Sidebar */}
        <ConversationSidebar
          conversations={conversations}
          currentConversationId={currentConversationId}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
          onDeleteConversation={handleDeleteConversation}
          onToggleShare={handleToggleShare}
          currentUserId={user?.id}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
        {/* Navigation */}
        <nav className="max-w-6xl mx-auto w-full px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Sidebar Toggle Button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="cursor-pointer lg:hidden p-2 rounded-lg bg-[#111111] border border-gray-800 hover:border-gray-700 transition-colors"
              aria-label="Toggle sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Organization Switcher */}
            <div className="relative">
              <button
                onClick={() => toggleOrgMenu()}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#111111] border border-gray-800 hover:border-gray-700 transition-colors text-sm font-medium cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span className="max-w-32 truncate">{currentOrg?.name || 'Select Org'}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {orgMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => closeAllDropdowns()}
                  />
                  <div className="absolute left-0 mt-2 w-64 bg-[#111111] border border-gray-800 rounded-lg shadow-lg py-2 z-50">
                    <div className="px-3 py-2 text-xs font-medium text-gray-400 uppercase">
                      Your Organizations
                    </div>
                    {userOrgs.map(org => (
                      <button
                        key={org.id}
                        onClick={() => {
                          switchOrganization(org.id);
                          closeAllDropdowns();
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-[#0a0a0a] transition-colors flex items-center justify-between cursor-pointer ${currentOrg?.id === org.id ? 'bg-[#0a0a0a] text-[#4169E1]' : ''}`}
                      >
                        <span className="truncate">{org.name}</span>
                        {currentOrg?.id === org.id && (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    ))}
                    <div className="border-t border-gray-800 my-2"></div>
                    {currentOrg && (canManageTeam() || isOwner()) && (
                      <Link
                        href="/organization/settings"
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-[#0a0a0a] transition-colors flex items-center gap-2"
                        onClick={() => closeAllDropdowns()}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Organization Settings
                      </Link>
                    )}
                    <Link
                      href="/organization/create"
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-[#0a0a0a] transition-colors text-[#4169E1]"
                      onClick={() => closeAllDropdowns()}
                    >
                      + Create Organization
                    </Link>
                  </div>
                </>
              )}
            </div>

            <Link href="/" className="text-sm font-medium hover:text-gray-300 transition-colors">
              Features
            </Link>
            <Link href="/" className="text-sm font-medium hover:text-gray-300 transition-colors">
              Pricing
            </Link>
            {currentOrg && canManageTeam() && (
              <Link href="/organization/team" className="text-sm font-medium hover:text-gray-300 transition-colors">
                Team
              </Link>
            )}
          </div>
          <div className="relative">
            <button
              onClick={() => toggleUserMenu()}
              className="flex items-center gap-2 hover:text-gray-300 transition-colors text-sm font-medium cursor-pointer"
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
                  onClick={() => closeAllDropdowns()}
                />
                <div className="absolute right-0 mt-2 w-56 bg-[#111111] border border-gray-800 rounded-lg shadow-lg py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-800">
                    <p className="text-sm text-gray-400">Signed in as</p>
                    <p className="text-sm font-medium truncate">{user.email}</p>
                  </div>
                  <Link
                    href="/settings"
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-[#0a0a0a] transition-colors"
                    onClick={() => closeAllDropdowns()}
                  >
                    Profile Settings
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-[#0a0a0a] transition-colors cursor-pointer"
                  >
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </nav>

        {/* Hero Section */}
        <main className="py-8 max-w-4xl mx-auto px-8 text-center">
          
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
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 w-10 h-10 rounded-full bg-[#111111] border border-gray-800 flex items-center justify-center hover:border-[#4169E1] transition-all disabled:opacity-30 disabled:cursor-not-allowed z-10 cursor-pointer"
                aria-label="Previous page"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {currentModes.map((mode) => (
                  <button
                    key={mode.slug}
                    onClick={() => setSelectedAdvisorMode(mode.slug)}
                    className="bg-[#111111] border border-gray-800 rounded-2xl p-8 text-left hover:border-[#4169E1] hover:bg-[#111111]/80 transition-all cursor-pointer"
                  >
                    <h3 className="text-2xl font-bold mb-3">{mode.name}</h3>
                    <p className="text-gray-400">{mode.description}</p>
                  </button>
                ))}
              </div>

              <button
                onClick={goToNextPage}
                disabled={currentPage === totalPages - 1}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 w-10 h-10 rounded-full bg-[#111111] border border-gray-800 flex items-center justify-center hover:border-[#4169E1] transition-all disabled:opacity-30 disabled:cursor-not-allowed z-10 cursor-pointer"
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
                    className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
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
                onClick={() => toggleModeDropdown()}
                className="w-full bg-[#111111] border border-[#4169E1] rounded-2xl p-6 text-left flex items-center justify-between hover:bg-[#111111]/80 transition-all cursor-pointer"
              >
                <div>
                  <div className="text-sm text-gray-400 mb-1">Selected Advisor Mode</div>
                  <div className="text-xl font-bold">
                    {advisorModes.find(m => m.slug === selectedAdvisorMode)?.name}
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
                    onClick={() => closeAllDropdowns()}
                  />
                  <div className="absolute max-h-60 overflow-auto top-full mt-2 w-full bg-[#111111] border border-gray-800 rounded-2xl shadow-lg py-2 z-50">
                    {advisorModes.map((mode) => (
                      <button
                        key={mode.slug}
                        onClick={() => {
                          setSelectedAdvisorMode(mode.slug);
                          closeAllDropdowns();
                        }}
                        className={`w-full text-left px-6 py-4 hover:bg-[#0a0a0a] transition-colors cursor-pointer ${
                          selectedAdvisorMode === mode.slug ? 'bg-[#4169E1]/10' : ''
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
            conversationId={currentConversationId}
            onConversationCreated={handleConversationCreated}
            onMessageSaved={handleMessageSaved}
            conversationMessages={conversationMessages}
            conversationOwnerId={currentConversation?.user_id}
            conversationTitle={currentConversation?.title}
            conversationIsShared={currentConversation?.is_shared}
            onConversationForked={handleConversationForked}
          />
        </div>
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
          onClick={() => openAuthModal('login')}
          className="text-sm font-medium hover:text-gray-300 transition-colors cursor-pointer"
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
          onClick={() => openAuthModal('signup')}
          className="inline-block px-8 py-3 bg-[#4169E1] hover:bg-[#3557c7] text-white font-medium rounded-lg transition-colors cursor-pointer"
        >
          Get Started
        </button>

        {/* Feature Cards */}
        <div className="relative mt-16 max-w-3xl mx-auto">
          {/* Navigation Arrows */}
          {totalPages > 1 && (
            <>
              <button
                onClick={goToPrevPage}
                disabled={currentPage === 0}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 w-10 h-10 rounded-full bg-[#111111] border border-gray-800 flex items-center justify-center hover:border-[#4169E1] transition-all disabled:opacity-30 disabled:cursor-not-allowed z-10 cursor-pointer"
                aria-label="Previous page"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <button
                onClick={goToNextPage}
                disabled={currentPage === totalPages - 1}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 w-10 h-10 rounded-full bg-[#111111] border border-gray-800 flex items-center justify-center hover:border-[#4169E1] transition-all disabled:opacity-30 disabled:cursor-not-allowed z-10 cursor-pointer"
                aria-label="Next page"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {currentModes.map((mode) => (
              <button
                key={mode.slug}
                onClick={() => openAuthModal('signup')}
                className="bg-[#111111] border border-gray-800 rounded-2xl p-8 text-left hover:border-[#4169E1] transition-colors cursor-pointer"
              >
                <h3 className="text-2xl font-bold mb-3">{mode.name}</h3>
                <p className="text-gray-400">{mode.description}</p>
              </button>
            ))}
          </div>

          {/* Page Indicator */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              {Array.from({ length: totalPages }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentPage(index)}
                  className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                    index === currentPage ? 'bg-[#4169E1] w-6' : 'bg-gray-800'
                  }`}
                  aria-label={`Go to page ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => closeAuthModal()}
        mode={authMode}
        onSwitchMode={switchAuthMode}
      />
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-800 border-t-[#4169E1] rounded-full animate-spin"></div>
      </div>
    }>
      <HomePageContent />
    </Suspense>
  );
}
