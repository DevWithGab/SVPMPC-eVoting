
import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Landing } from './components/Landing';
import { Login } from './components/Login';
import { Voting } from './components/Voting';
import { Results } from './components/Results';
import { Admin } from './components/Admin';
import { Staff } from './components/Staff';
import { Resources } from './components/Resources';
import { Profile } from './components/Profile';
import { Rules } from './components/Rules';
import { Announcements } from './components/Announcements';
import { Elections } from './components/Elections';
import { Candidates } from './components/Candidates';
import { AccessibilityWidget } from './components/AccessibilityWidget';
import { SplashScreen } from './components/SplashScreen';
import type { PageView, User } from './types';

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPage, setCurrentPage] = useState<PageView>('LOGIN');
  const [user, setUser] = useState<User | null>(null);
  const [language, setLanguage] = useState<'EN' | 'PH'>('EN');
  const [darkMode, setDarkMode] = useState(false);
  const [fontSize, setFontSize] = useState<'normal' | 'large'>('normal');
  const [selectedElectionId, setSelectedElectionId] = useState<string>(() => {
    return localStorage.getItem('selectedElectionId') || '';
  });

  // Scroll to top and navigate
  const handleNavigate = useCallback((page: PageView, electionId?: string) => {
    window.scrollTo(0, 0);
    
    if (electionId) {
      localStorage.setItem('selectedElectionId', electionId);
      setSelectedElectionId(electionId);
    }
    
    setCurrentPage(page);
  }, []);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);  
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    
    // Check if there's a redirect destination after login
    const redirectAfterLogin = localStorage.getItem('redirectAfterLogin');
    
    // Navigate based on redirect or user role
    if (redirectAfterLogin) {
      // Clear the redirect flag
      localStorage.removeItem('redirectAfterLogin');
      // Navigate to the intended page (with scroll)
      handleNavigate(redirectAfterLogin as PageView);
    } else if (loggedInUser.role === 'admin') {
      handleNavigate('ADMIN');
    } else if (loggedInUser.role === 'officer') {
      handleNavigate('STAFF');
    } else if (loggedInUser.role === 'member') {
      handleNavigate('LANDING');
    } else {
      handleNavigate('LANDING');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
    handleNavigate('LOGIN');
  };

  const renderContent = () => {
    switch (currentPage) {
      case 'LANDING':
        return <Landing onNavigate={handleNavigate} isLoggedIn={!!user} language={language} />;
      case 'ELECTIONS':
        return <Elections onNavigate={handleNavigate} />;
      case 'CANDIDATES':
        const elecId = selectedElectionId || localStorage.getItem('selectedElectionId') || '';
        return <Candidates electionId={elecId} onNavigate={handleNavigate} />;
      case 'ANNOUNCEMENTS':
        return <Announcements />;
      case 'RULES':
        return <Rules />;
      case 'LOGIN':
        return <Login onLogin={handleLogin} />;
      case 'VOTING':
        if (!user) return <Login onLogin={handleLogin} />;
        return <Voting />;
      case 'RESULTS':
        // Results component handles its own access control
        return <Results user={user} />;
      case 'RESOURCES':
        return <Resources onNavigate={handleNavigate} />;
      case 'PROFILE':
        if (!user) return <Login onLogin={handleLogin} />;
        return <Profile onNavigate={handleNavigate} onLogout={handleLogout} user={user} />;
      case 'ADMIN':
        if (!user || user.role === 'member') {
          return <Landing onNavigate={handleNavigate} isLoggedIn={!!user} language={language} />;
        }
        return <Admin user={user} onLogout={handleLogout} />;
      case 'STAFF':
        if (!user || user.role === 'member') {
          return <Landing onNavigate={handleNavigate} isLoggedIn={!!user} language={language} />;
        }
        return <Staff user={user} users={[]} candidates={[]} positions={[]} announcements={[]} onLogout={handleLogout} />;
      default:
        return <Landing onNavigate={handleNavigate} isLoggedIn={!!user} language={language} />;
    }
  };

  const isAdminView = currentPage === 'ADMIN' || currentPage === 'STAFF';

  // If splash screen is showing, display it
  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  // If not authenticated after splash, show login
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col min-h-screen">
        <main className="grow animate-fadeIn">
          <Login onNavigate={handleNavigate} onLogin={(user) => {
            handleLogin(user);
            setIsAuthenticated(true);
          }} />
        </main>
        <AccessibilityWidget highContrast={darkMode} toggleHighContrast={() => setDarkMode(!darkMode)} fontSize={fontSize} setFontSize={setFontSize} />
      </div>
    );
  }

  return (
    <div className={`flex flex-col min-h-screen transition-all duration-300 ${darkMode ? 'dark bg-slate-950 text-slate-50' : 'bg-gray-50 text-gray-900'} ${fontSize === 'large' ? 'text-lg' : ''}`}>
      {!isAdminView && (
        <Header currentPage={currentPage} setCurrentPage={handleNavigate} onLogout={handleLogout} language={language} setLanguage={setLanguage} user={user} />
      )}
      <main key={currentPage} className={`grow animate-fadeIn ${isAdminView ? 'h-screen overflow-hidden' : ''}`}>
        {renderContent()}
      </main>
      {!isAdminView && <Footer />}
      <AccessibilityWidget highContrast={darkMode} toggleHighContrast={() => setDarkMode(!darkMode)} fontSize={fontSize} setFontSize={setFontSize} />
    </div>
  );
};

export default App;
