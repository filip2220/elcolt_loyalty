import React, { useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import Button from './Button';
import { View } from '../App';

interface HeaderProps {
  activeView: View;
  setActiveView: (view: View) => void;
}

// Crosshairs Logo Component
const Logo: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
  <div className="relative flex items-center gap-2 sm:gap-3">
    {/* Crosshairs icon */}
    <div className={`relative ${compact ? 'w-8 h-8' : 'w-10 h-10'}`}>
      <svg
        viewBox="0 0 40 40"
        className="w-full h-full text-brass-500"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        {/* Outer circle */}
        <circle cx="20" cy="20" r="16" className="opacity-60" />
        {/* Inner circle */}
        <circle cx="20" cy="20" r="8" className="opacity-40" />
        {/* Crosshairs */}
        <line x1="20" y1="0" x2="20" y2="12" />
        <line x1="20" y1="28" x2="20" y2="40" />
        <line x1="0" y1="20" x2="12" y2="20" />
        <line x1="28" y1="20" x2="40" y2="20" />
        {/* Center dot */}
        <circle cx="20" cy="20" r="2" fill="currentColor" />
      </svg>
    </div>

    <div className="flex flex-col">
      <span className={`font-display font-bold tracking-wide text-cream leading-none ${compact ? 'text-lg' : 'text-xl sm:text-2xl'}`}>
        EL COLT
      </span>
      <span className={`text-stone-400 tracking-widest uppercase ${compact ? 'text-[10px]' : 'text-xs'} hidden sm:block`}>
        Program Lojalnościowy
      </span>
    </div>
  </div>
);

// Desktop Navigation link component
const NavLink: React.FC<{
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon: React.ReactNode;
}> = React.memo(({ isActive, onClick, children, icon }) => {
  return (
    <button
      onClick={onClick}
      className={`
        group flex items-center gap-2 px-4 py-3
        font-display text-sm font-medium uppercase tracking-wider
        transition-all duration-200 ease-out
        border-b-2 -mb-px
        focus:outline-none focus:ring-2 focus:ring-brass-500/50 focus:ring-offset-2 focus:ring-offset-slate-900
        ${isActive
          ? 'border-brass-500 text-brass-400'
          : 'border-transparent text-stone-400 hover:text-cream hover:border-stone-600'
        }
      `}
      aria-current={isActive ? 'page' : undefined}
    >
      <span className={`transition-colors duration-200 ${isActive ? 'text-brass-500' : 'text-stone-500 group-hover:text-stone-300'}`}>
        {icon}
      </span>
      {children}
    </button>
  );
});

NavLink.displayName = 'NavLink';

// Mobile Bottom Navigation link component
const MobileNavLink: React.FC<{
  isActive: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}> = React.memo(({ isActive, onClick, label, icon }) => {
  return (
    <button
      onClick={onClick}
      className={`
        flex flex-col items-center justify-center gap-1 flex-1 py-2 min-h-[56px]
        transition-all duration-200 ease-out
        focus:outline-none
        ${isActive
          ? 'text-brass-400'
          : 'text-stone-500 active:text-stone-300'
        }
      `}
      aria-current={isActive ? 'page' : undefined}
    >
      <span className={`transition-colors duration-200 ${isActive ? 'text-brass-500' : ''}`}>
        {icon}
      </span>
      <span className={`text-[10px] font-display font-medium uppercase tracking-wider ${isActive ? 'text-brass-400' : ''}`}>
        {label}
      </span>
      {isActive && (
        <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-brass-500 rounded-full" />
      )}
    </button>
  );
});

MobileNavLink.displayName = 'MobileNavLink';

// Icons - Desktop size
const DashboardIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
);

const ActivityIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
  </svg>
);

const RewardsIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
  </svg>
);

const SalesIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
  </svg>
);

// Icons - Mobile size (larger for touch)
const MobileDashboardIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
);

const MobileActivityIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
  </svg>
);

const MobileRewardsIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
  </svg>
);

const MobileSalesIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
  </svg>
);

const Header: React.FC<HeaderProps> = React.memo(({ activeView, setActiveView }) => {
  const { user, logout } = useAuth();
  const { cart } = useCart();

  const handleDashboardClick = useCallback(() => setActiveView('dashboard'), [setActiveView]);
  const handleActivityClick = useCallback(() => setActiveView('activity'), [setActiveView]);
  const handleRewardsClick = useCallback(() => setActiveView('rewards'), [setActiveView]);
  const handleSalesClick = useCallback(() => setActiveView('sales'), [setActiveView]);
  const handleCartClick = useCallback(() => setActiveView('cart'), [setActiveView]);

  return (
    <>
      {/* Desktop & Tablet Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-900/90 border-b border-slate-700/50">
        {/* Top bar with logo and user info */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <Logo compact />

            <div className="flex items-center gap-2 sm:gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-cream">{user?.name}</p>
                <p className="text-xs text-stone-500">{user?.email}</p>
              </div>

              {/* Cart Button */}
              <button
                onClick={handleCartClick}
                className="relative p-2 hover:bg-slate-800 rounded-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brass-500/50"
                aria-label="Koszyk"
              >
                <svg className="w-6 h-6 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {cart.itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rust-600 text-cream text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {cart.itemCount > 9 ? '9+' : cart.itemCount}
                  </span>
                )}
              </button>

              <Button onClick={logout} variant="ghost" size="sm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">Wyloguj</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Desktop Navigation - hidden on mobile */}
        <nav className="hidden md:block border-t border-slate-800/50 bg-slate-900/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-1">
              <NavLink isActive={activeView === 'dashboard'} onClick={handleDashboardClick} icon={<DashboardIcon />}>
                Panel
              </NavLink>
              <NavLink isActive={activeView === 'activity'} onClick={handleActivityClick} icon={<ActivityIcon />}>
                Aktywność
              </NavLink>
              <NavLink isActive={activeView === 'rewards'} onClick={handleRewardsClick} icon={<RewardsIcon />}>
                Nagrody
              </NavLink>
              <NavLink isActive={activeView === 'sales'} onClick={handleSalesClick} icon={<SalesIcon />}>
                Promocje
              </NavLink>
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-md border-t border-slate-700/50 safe-area-bottom">
        <div className="flex items-stretch">
          <MobileNavLink
            isActive={activeView === 'dashboard'}
            onClick={handleDashboardClick}
            icon={<MobileDashboardIcon />}
            label="Panel"
          />
          <MobileNavLink
            isActive={activeView === 'activity'}
            onClick={handleActivityClick}
            icon={<MobileActivityIcon />}
            label="Historia"
          />
          <MobileNavLink
            isActive={activeView === 'rewards'}
            onClick={handleRewardsClick}
            icon={<MobileRewardsIcon />}
            label="Nagrody"
          />
          <MobileNavLink
            isActive={activeView === 'sales'}
            onClick={handleSalesClick}
            icon={<MobileSalesIcon />}
            label="Promocje"
          />
        </div>
      </nav>
    </>
  );
});

Header.displayName = 'Header';

export default Header;
