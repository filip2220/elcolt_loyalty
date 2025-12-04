import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import LoginView from './components/LoginView';
import DashboardView from './components/DashboardView';
import Header from './components/Header';
import ActivityView from './components/ActivityView';
import RewardsView from './components/RewardsView';
import ProductsView from './components/ProductsView';
import ResetPasswordView from './components/ResetPasswordView';

export type View = 'dashboard' | 'activity' | 'rewards' | 'products';

const AppContent: React.FC = () => {
    const { isAuthenticated, user } = useAuth();
    const [activeView, setActiveView] = useState<View>('dashboard');

    if (!isAuthenticated || !user) {
        return <LoginView />;
    }

    const renderView = () => {
        switch (activeView) {
            case 'activity':
                return <ActivityView />;
            case 'rewards':
                return <RewardsView />;
            case 'products':
                return <ProductsView />;
            case 'dashboard':
            default:
                return <DashboardView />;
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-cream">
            {/* Subtle gradient overlay */}
            <div className="fixed inset-0 bg-gradient-to-b from-forest-900/20 via-transparent to-slate-950 pointer-events-none" />
            
            {/* Content */}
            <div className="relative z-10">
                <Header activeView={activeView} setActiveView={setActiveView} />
                <main className="p-3 sm:p-6 lg:p-8 pb-24 md:pb-8">
                    <div className="max-w-7xl mx-auto">
                        {renderView()}
                    </div>
                </main>
            </div>
        </div>
    );
};

const App: React.FC = () => {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    <Route path="/reset-password" element={<ResetPasswordView />} />
                    <Route path="/" element={<AppContent />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
};

export default App;
