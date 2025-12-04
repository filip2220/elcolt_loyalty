import React, { useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import Button from './Button';
import { View } from '../App';

interface HeaderProps {
  activeView: View;
  setActiveView: (view: View) => void;
}

// PERFORMANCE: Memoize NavLink to prevent re-renders when other links change
const NavLink: React.FC<{
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = React.memo(({ isActive, onClick, children }) => {
  const activeClasses = 'border-green-500 text-green-400';
  const inactiveClasses = 'border-transparent text-gray-400 hover:border-gray-500 hover:text-gray-200';
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center px-1 pt-1 pb-2 border-b-2 text-sm font-medium transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-green-500 rounded-sm ${isActive ? activeClasses : inactiveClasses}`}
      aria-current={isActive ? 'page' : undefined}
    >
      {children}
    </button>
  );
});

NavLink.displayName = 'NavLink';

const Header: React.FC<HeaderProps> = React.memo(({ activeView, setActiveView }) => {
  const { user, logout } = useAuth();

  // PERFORMANCE: Stable handlers for navigation
  const handleDashboardClick = useCallback(() => setActiveView('dashboard'), [setActiveView]);
  const handleActivityClick = useCallback(() => setActiveView('activity'), [setActiveView]);
  const handleRewardsClick = useCallback(() => setActiveView('rewards'), [setActiveView]);

  return (
    <header className="bg-gray-900 border-b border-gray-700 shadow-md sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center space-x-3">
              <svg className="h-8 w-8 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.602-3.751A11.959 11.959 0 0112 2.714z" />
              </svg>
              <span className="text-xl font-bold text-gray-100">Program Lojalnościowy</span>
            </div>
          </div>
          <div className="flex items-center">
            <div className="text-right mr-4 hidden sm:block">
              <p className="text-sm font-medium text-gray-100">{user?.name}</p>
              <p className="text-xs text-gray-400">{user?.email}</p>
            </div>
            <Button onClick={logout} variant="secondary" size="sm">
              Wyloguj
            </Button>
          </div>
        </div>
      </div>
      <nav className="bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <NavLink isActive={activeView === 'dashboard'} onClick={handleDashboardClick}>Panel</NavLink>
            <NavLink isActive={activeView === 'activity'} onClick={handleActivityClick}>Aktywność</NavLink>
            <NavLink isActive={activeView === 'rewards'} onClick={handleRewardsClick}>Nagrody</NavLink>
          </div>
        </div>
      </nav>
    </header>
  );
});

Header.displayName = 'Header';

export default Header;
