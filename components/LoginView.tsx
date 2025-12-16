import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import Spinner from './Spinner';
import Button from './Button';
import ForgotPasswordModal from './ForgotPasswordModal';

// Mountain silhouette SVG background
const MountainBackground = () => (
  <div className="absolute inset-0 overflow-hidden">
    {/* Gradient base */}
    <div className="absolute inset-0 bg-gradient-to-b from-forest-900 via-slate-950 to-slate-950" />

    {/* Stars/dots pattern */}
    <div
      className="absolute inset-0 opacity-30"
      style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, rgba(201, 162, 39, 0.3) 1px, transparent 0)`,
        backgroundSize: '50px 50px',
      }}
    />

    {/* Mountain layers */}
    <svg
      className="absolute bottom-0 w-full h-2/3 opacity-40"
      viewBox="0 0 1440 600"
      preserveAspectRatio="xMidYMax slice"
      fill="none"
    >
      {/* Back mountain layer */}
      <path
        d="M0 600V400L120 320L240 380L360 280L480 340L600 260L720 320L840 240L960 300L1080 220L1200 280L1320 200L1440 260V600H0Z"
        fill="url(#mountain-gradient-1)"
      />
      {/* Middle mountain layer */}
      <path
        d="M0 600V450L100 400L200 440L350 350L500 400L650 320L800 380L950 300L1100 360L1250 280L1350 340L1440 300V600H0Z"
        fill="url(#mountain-gradient-2)"
      />
      {/* Front mountain layer */}
      <path
        d="M0 600V500L80 470L180 510L300 450L450 490L600 420L750 470L900 400L1050 450L1200 390L1350 440L1440 400V600H0Z"
        fill="url(#mountain-gradient-3)"
      />

      {/* Pine trees silhouette */}
      <g className="opacity-60">
        <path d="M50 600L50 550L60 530L50 540L55 520L45 530L50 510L40 530L45 550L45 600Z" fill="#0D0F12" />
        <path d="M100 600L100 560L110 545L100 553L105 535L95 545L100 525L90 545L95 560L95 600Z" fill="#0D0F12" />
        <path d="M150 600L150 570L158 558L150 564L154 550L146 558L150 542L142 558L146 570L146 600Z" fill="#0D0F12" />
        <path d="M1300 600L1300 555L1310 538L1300 548L1305 528L1295 540L1300 518L1290 540L1295 555L1295 600Z" fill="#0D0F12" />
        <path d="M1350 600L1350 565L1358 550L1350 558L1354 542L1346 552L1350 532L1342 552L1346 565L1346 600Z" fill="#0D0F12" />
        <path d="M1400 600L1400 575L1408 562L1400 568L1404 555L1396 563L1400 548L1392 563L1396 575L1396 600Z" fill="#0D0F12" />
      </g>

      <defs>
        <linearGradient id="mountain-gradient-1" x1="720" y1="200" x2="720" y2="600" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1B3A2F" stopOpacity="0.5" />
          <stop offset="1" stopColor="#0D0F12" />
        </linearGradient>
        <linearGradient id="mountain-gradient-2" x1="720" y1="280" x2="720" y2="600" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#152B22" stopOpacity="0.7" />
          <stop offset="1" stopColor="#0D0F12" />
        </linearGradient>
        <linearGradient id="mountain-gradient-3" x1="720" y1="380" x2="720" y2="600" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#14171C" />
          <stop offset="1" stopColor="#0D0F12" />
        </linearGradient>
      </defs>
    </svg>

    {/* Fog/mist effect */}
    <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />
  </div>
);

// Crosshairs Logo
const Logo = () => (
  <div className="flex flex-col items-center mb-8">
    {/* Crosshairs icon */}
    <div className="relative w-16 h-16 mb-4">
      <svg
        viewBox="0 0 40 40"
        className="w-full h-full text-brass-500"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      >
        <circle cx="20" cy="20" r="16" className="opacity-60" />
        <circle cx="20" cy="20" r="10" className="opacity-40" />
        <circle cx="20" cy="20" r="4" className="opacity-30" />
        <line x1="20" y1="0" x2="20" y2="14" />
        <line x1="20" y1="26" x2="20" y2="40" />
        <line x1="0" y1="20" x2="14" y2="20" />
        <line x1="26" y1="20" x2="40" y2="20" />
        <circle cx="20" cy="20" r="1.5" fill="currentColor" />
      </svg>
    </div>

    <h1 className="font-display text-4xl font-bold tracking-wide text-cream">
      EL COLT
    </h1>
    <p className="text-stone-400 text-sm tracking-widest uppercase mt-1">
      Program Lojalnościowy
    </p>
  </div>
);

const LoginView: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [signupEmail, setSignupEmail] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login, signup } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isSignUp) {
        await signup({ email: signupEmail, password, firstName, lastName, phone });
      } else {
        await login(identifier, password);
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
    setIdentifier('');
    setSignupEmail('');
    setPassword('');
    setFirstName('');
    setLastName('');
    setPhone('');
  };

  const inputClasses = `
    w-full py-3 px-4
    bg-slate-800/80 
    border border-slate-600/50
    rounded-sm
    text-cream placeholder-stone-500
    font-body text-base
    transition-all duration-200
    focus:outline-none focus:border-brass-500/50 focus:ring-2 focus:ring-brass-500/20
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  const labelClasses = "block text-stone-300 text-sm font-semibold mb-2 tracking-wide";

  return (
    <>
      <div className="min-h-screen relative flex flex-col justify-center items-center py-8 sm:py-12 px-3 sm:px-4 safe-area-top">
        <MountainBackground />

        {/* Login card */}
        <div className="relative z-10 w-full max-w-md animate-slide-up">
          {/* Card with subtle border glow */}
          <div className="relative">
            {/* Glow effect */}
            <div className="absolute -inset-px bg-gradient-to-b from-brass-500/20 via-transparent to-transparent rounded-sm blur-sm" />

            {/* Main card */}
            <div className="relative bg-slate-900/95 backdrop-blur-sm border border-slate-700/50 rounded-sm shadow-2xl shadow-black/50 p-5 sm:p-8">
              <Logo />

              <p className="text-center text-stone-400 mb-8">
                {isSignUp ? 'Dołącz do elitarnego grona łowców nagród' : 'Zaloguj się, aby uzyskać dostęp do nagród'}
              </p>

              {error && (
                <div className="bg-rust-600/20 border border-rust-600/50 text-rust-500 px-4 py-3 rounded-sm mb-6 flex items-start gap-3" role="alert">
                  <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {isSignUp && (
                  <>
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                      <div className="flex-1">
                        <label className={labelClasses} htmlFor="firstName">Imię</label>
                        <input
                          className={inputClasses}
                          id="firstName"
                          type="text"
                          placeholder="Jan"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          required
                          disabled={loading}
                          autoComplete="given-name"
                        />
                      </div>
                      <div className="flex-1">
                        <label className={labelClasses} htmlFor="lastName">Nazwisko</label>
                        <input
                          className={inputClasses}
                          id="lastName"
                          type="text"
                          placeholder="Kowalski"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          required
                          disabled={loading}
                          autoComplete="family-name"
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelClasses} htmlFor="phone">Telefon</label>
                      <input
                        className={inputClasses}
                        id="phone"
                        type="tel"
                        placeholder="+48 123 456 789"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        disabled={loading}
                        autoComplete="tel"
                      />
                    </div>
                  </>
                )}

                {isSignUp ? (
                  <div>
                    <label className={labelClasses} htmlFor="signupEmail">Adres Email</label>
                    <input
                      className={inputClasses}
                      id="signupEmail"
                      type="email"
                      placeholder="twoj@email.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                      disabled={loading}
                      autoComplete="email"
                      inputMode="email"
                    />
                  </div>
                ) : (
                  <div>
                    <label className={labelClasses} htmlFor="identifier">Email lub Numer Telefonu</label>
                    <input
                      className={inputClasses}
                      id="identifier"
                      type="text"
                      placeholder="twoj@email.com lub 123456789"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      required
                      disabled={loading}
                      autoComplete="username"
                    />
                    <p className="text-xs text-stone-500 mt-1">Telefon wpisz bez kodu kraju (np. bez +48)</p>
                  </div>
                )}

                <div>
                  <label className={labelClasses} htmlFor="password">Hasło</label>
                  <input
                    className={inputClasses}
                    id="password"
                    type="password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    autoComplete={isSignUp ? "new-password" : "current-password"}
                  />
                </div>

                {!isSignUp && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-sm text-brass-500 hover:text-brass-400 transition-colors focus:outline-none focus:underline"
                      disabled={loading}
                    >
                      Zapomniałeś hasła?
                    </button>
                  </div>
                )}

                <div className="pt-4">
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? <Spinner size="sm" /> : (isSignUp ? 'Dołącz do Programu' : 'Zaloguj się')}
                  </Button>
                </div>
              </form>

              {/* Divider */}
              <div className="flex items-center my-6">
                <div className="flex-1 border-t border-slate-700/50" />
                <span className="px-4 text-xs text-stone-500 uppercase tracking-wider">lub</span>
                <div className="flex-1 border-t border-slate-700/50" />
              </div>

              <button
                onClick={toggleFormMode}
                className="w-full text-center text-sm text-stone-400 hover:text-cream transition-colors focus:outline-none focus:text-cream"
              >
                {isSignUp ? (
                  <>Masz już konto? <span className="text-brass-500 hover:text-brass-400">Zaloguj się</span></>
                ) : (
                  <>Nie masz konta? <span className="text-brass-500 hover:text-brass-400">Zarejestruj się</span></>
                )}
              </button>
            </div>
          </div>

          {/* Tagline */}
          <p className="text-center text-stone-600 text-xs mt-8 tracking-wider uppercase">
            Precyzja • Tradycja • Lojalność
          </p>
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
