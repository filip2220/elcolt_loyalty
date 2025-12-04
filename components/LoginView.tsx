import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import Spinner from './Spinner';
import Button from './Button';
import ForgotPasswordModal from './ForgotPasswordModal';

const LoginView: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login, signup } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isSignUp) {
        await signup({ email, password, firstName, lastName, phone });
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Wystąpił nieoczekiwany błąd.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleFormMode = () => {
    setIsSignUp(!isSignUp);
    setError(null);
    // Clear fields when switching forms
    setEmail('');
    setPassword('');
    setFirstName('');
    setLastName('');
    setPhone('');
  };

  return (
    <>
      <div className="min-h-screen bg-gray-800 flex flex-col justify-center items-center py-12 px-4">
        <div className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-center text-gray-100 mb-2">
            {isSignUp ? 'Utwórz Konto' : 'Program Lojalnościowy'}
          </h1>
          <p className="text-center text-gray-400 mb-8">
            {isSignUp ? 'Dołącz teraz i zacznij zbierać punkty!' : 'Zaloguj się, aby uzyskać dostęp do nagród'}
          </p>

          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-md mb-4" role="alert">
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {isSignUp && (
              <>
                <div className="flex gap-4 mb-4">
                  <div className="w-1/2">
                    <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="firstName">
                      Imię
                    </label>
                    <input
                      className="shadow-sm appearance-none border border-gray-600 bg-gray-800 rounded w-full py-3 px-4 text-gray-200 leading-tight focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      id="firstName" type="text" placeholder="Jan" value={firstName}
                      onChange={(e) => setFirstName(e.target.value)} required disabled={loading}
                    />
                  </div>
                  <div className="w-1/2">
                    <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="lastName">
                      Nazwisko
                    </label>
                    <input
                      className="shadow-sm appearance-none border border-gray-600 bg-gray-800 rounded w-full py-3 px-4 text-gray-200 leading-tight focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      id="lastName" type="text" placeholder="Kowalski" value={lastName}
                      onChange={(e) => setLastName(e.target.value)} required disabled={loading}
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="phone">
                    Telefon
                  </label>
                  <input
                    className="shadow-sm appearance-none border border-gray-600 bg-gray-800 rounded w-full py-3 px-4 text-gray-200 leading-tight focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    id="phone" type="tel" placeholder="+48 123 456 789" value={phone}
                    onChange={(e) => setPhone(e.target.value)} required disabled={loading}
                  />
                </div>
              </>
            )}
            <div className="mb-4">
              <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="email">
                Adres Email
              </label>
              <input
                className="shadow-sm appearance-none border border-gray-600 bg-gray-800 rounded w-full py-3 px-4 text-gray-200 leading-tight focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                id="email" type="email" placeholder="twoj@email.com" value={email}
                onChange={(e) => setEmail(e.target.value)} required disabled={loading}
              />
            </div>
            <div className="mb-2">
              <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="password">
                Hasło
              </label>
              <input
                className="shadow-sm appearance-none border border-gray-600 bg-gray-800 rounded w-full py-3 px-4 text-gray-200 leading-tight focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                id="password" type="password" placeholder="******************" value={password}
                onChange={(e) => setPassword(e.target.value)} required disabled={loading}
              />
            </div>

            {!isSignUp && (
              <div className="mb-6 text-right">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-green-500 hover:underline focus:outline-none"
                  disabled={loading}
                >
                  Zapomniałeś hasła?
                </button>
              </div>
            )}

            <div className={`flex items-center justify-between ${isSignUp ? 'mt-6' : ''}`}>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? <Spinner size="sm" /> : (isSignUp ? 'Zarejestruj się' : 'Zaloguj się')}
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <button onClick={toggleFormMode} className="text-sm text-green-500 hover:underline focus:outline-none">
              {isSignUp ? 'Masz już konto? Zaloguj się' : 'Nie masz konta? Zarejestruj się'}
            </button>
          </div>
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
    </>
  );
};

export default LoginView;