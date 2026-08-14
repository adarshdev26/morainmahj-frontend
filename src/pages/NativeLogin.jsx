import React, { useState } from 'react';
import { setToken, loginViaEmailPassword, register, verifyOtp, resetPasswordRequest } from '@/services/authApi';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Preferences } from '@capacitor/preferences';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import Logo from '@/components/Logo';

const GOLD = 'hsl(43 50% 65%)';
const NAVY = 'hsl(220 40% 20%)';
const CARD_BG = 'hsl(220 38% 14%)';
const INPUT_BG = 'hsl(220 40% 10%)';

function BrandHeader() {
  return (
    <div className="flex flex-col items-center text-center">
      <span className="mb-4 inline-block" style={{ color: '#fff' }}>
        <Logo variant="icon" size="md" />
      </span>
      <p
        className="font-heading font-light tracking-[0.35em] uppercase text-lg leading-none"
        style={{ color: GOLD }}
      >
        Morain Mahj
      </p>
      <p className="font-body text-[10px] tracking-[0.2em] uppercase mt-2 text-white/40">
        Legacy game for modern players
      </p>
    </div>
  );
}

function OrDivider() {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex-1 h-px bg-white/10" />
      <span className="text-[11px] tracking-widest uppercase text-white/35">or</span>
      <div className="flex-1 h-px bg-white/10" />
    </div>
  );
}

export default function NativeLogin() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState(() =>
    searchParams.get('mode') === 'signup' ? 'signup' : 'login'
  ); // 'login' | 'signup' | 'forgot' | 'verify'
  const [forgotSent, setForgotSent] = useState(false);
  const [otp, setOtp] = useState('');
  const navigate = useNavigate();
  const { checkUserAuth } = useAuth();

  const persistToken = async (token) => {
    if (!token) return;
    setToken(token, true);
    try { await Preferences.set({ key: 'mm_auth_token', value: token }); } catch {}
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { access_token } = await loginViaEmailPassword(email, password);
      await persistToken(access_token);
      await checkUserAuth();
      navigate('/app', { replace: true });
    } catch (err) {
      setError(err?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await register({ email, password });
      setMode('verify');
    } catch (err) {
      setError(err?.message || 'Could not create account.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifyOtp({ email, otpCode: otp });
      const { access_token } = await loginViaEmailPassword(email, password);
      await persistToken(access_token);
      await checkUserAuth();
      navigate('/app', { replace: true });
    } catch (err) {
      setError(err?.message || 'Invalid verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await resetPasswordRequest(email);
      setForgotSent(true);
    } catch (err) {
      setError(err?.message || 'Could not send reset email.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[hsl(43,50%,65%)]/40 border border-white/10 text-white placeholder:text-white/30';
  const labelClass = 'block text-[11px] font-medium tracking-[0.15em] uppercase text-white/45 mb-1.5';
  const btnClass =
    'w-full rounded-xl py-3.5 text-sm font-semibold disabled:opacity-60 mt-1 transition-opacity';
  const backBtnClass = 'flex items-center gap-1 text-sm text-white/50 hover:text-white/80 transition-colors';

  const IconMail = () => (
    <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/35" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
  );
  const IconLock = () => (
    <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/35" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
  );

  const PasswordToggle = ({ visible, onToggle }) => (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/60 transition-colors"
      aria-label={visible ? 'Hide password' : 'Show password'}
    >
      {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );

  return (
    <div
      className="min-h-screen flex flex-col font-body"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        backgroundColor: NAVY,
      }}
    >
      <button onClick={() => navigate('/')} className={`${backBtnClass} px-4 py-3 self-start`}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6"/>
        </svg>
        <span>Back</span>
      </button>

      <div className="flex-1 flex items-center justify-center px-5 py-8">
        <div
          className="w-full max-w-sm rounded-2xl border border-white/10 p-6 shadow-xl"
          style={{ backgroundColor: CARD_BG }}
        >
          <div className="mb-6">
            <BrandHeader />
          </div>

          {/* ── LOGIN mode ── */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="text-center mb-2">
                <h1 className="font-heading text-3xl font-light text-white">Welcome back</h1>
                <p className="text-sm text-white/45 mt-1">Sign in to continue</p>
              </div>

              <div>
                <label className={labelClass}>Email</label>
                <div className="relative">
                  <IconMail />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className={`${inputClass} pl-10`}
                    style={{ fontSize: '16px', backgroundColor: INPUT_BG }}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Password</label>
                <div className="relative">
                  <IconLock />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className={`${inputClass} pl-10 pr-10`}
                    style={{ fontSize: '16px', backgroundColor: INPUT_BG }}
                  />
                  <PasswordToggle visible={showPassword} onToggle={() => setShowPassword(v => !v)} />
                </div>
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className={btnClass}
                style={{ backgroundColor: GOLD, color: NAVY }}
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
              <button
                type="button"
                onClick={() => setMode('forgot')}
                className="w-full text-sm text-white/45 text-center pt-1 hover:text-white/65 transition-colors"
              >
                Forgot password?
              </button>
              <OrDivider />
              <p className="text-sm text-center text-white/45">
                Need an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="font-semibold transition-opacity hover:opacity-80"
                  style={{ color: GOLD }}
                >
                  Sign up
                </button>
              </p>
            </form>
          )}

          {/* ── SIGNUP mode ── */}
          {mode === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-4">
              <button type="button" onClick={() => setMode('login')} className={`${backBtnClass} mb-2`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
                Back to sign in
              </button>
              <h2 className="font-heading text-3xl font-light text-white text-center mb-1">Create your account</h2>
              <div>
                <label className={labelClass}>Email</label>
                <div className="relative">
                  <IconMail />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className={`${inputClass} pl-10`}
                    style={{ fontSize: '16px', backgroundColor: INPUT_BG }}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Password</label>
                <div className="relative">
                  <IconLock />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    placeholder="Min. 8 characters"
                    minLength={8}
                    className={`${inputClass} pl-10 pr-10`}
                    style={{ fontSize: '16px', backgroundColor: INPUT_BG }}
                  />
                  <PasswordToggle visible={showPassword} onToggle={() => setShowPassword(v => !v)} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Confirm Password</label>
                <div className="relative">
                  <IconLock />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Re-enter password"
                    className={`${inputClass} pl-10 pr-10`}
                    style={{ fontSize: '16px', backgroundColor: INPUT_BG }}
                  />
                  <PasswordToggle
                    visible={showConfirmPassword}
                    onToggle={() => setShowConfirmPassword(v => !v)}
                  />
                </div>
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className={btnClass}
                style={{ backgroundColor: GOLD, color: NAVY }}
              >
                {loading ? 'Creating…' : 'Create account'}
              </button>
              <p className="text-xs text-center text-white/40 pt-2">
                By creating an account, you agree to our{' '}
                <Link to="/terms" className="underline underline-offset-2 hover:text-white/70" style={{ color: GOLD }}>
                  Terms of Service
                </Link>
                {' '}and{' '}
                <Link to="/privacy" className="underline underline-offset-2 hover:text-white/70" style={{ color: GOLD }}>
                  Privacy Policy
                </Link>.
              </p>
            </form>
          )}

          {/* ── VERIFY OTP mode ── */}
          {mode === 'verify' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <h2 className="font-heading text-3xl font-light text-white text-center mb-1">Verify your email</h2>
              <p className="text-sm text-white/45 text-center">
                Enter the code sent to <strong className="text-white/70">{email}</strong>
              </p>
              <div>
                <label className={labelClass}>Verification Code</label>
                <input
                  type="text"
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                  required
                  placeholder="123456"
                  className={inputClass}
                  style={{ fontSize: '16px', backgroundColor: INPUT_BG }}
                />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className={btnClass}
                style={{ backgroundColor: GOLD, color: NAVY }}
              >
                {loading ? 'Verifying…' : 'Verify & Sign In'}
              </button>
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="w-full text-sm text-white/45 text-center hover:text-white/65 transition-colors"
              >
                Back
              </button>
            </form>
          )}

          {/* ── FORGOT mode ── */}
          {mode === 'forgot' && (
            forgotSent ? (
              <div className="text-center space-y-4 py-4">
                <h2 className="font-heading text-3xl font-light text-white">Check your email</h2>
                <p className="text-sm text-white/45">
                  We sent a reset link to <strong className="text-white/70">{email}</strong>
                </p>
                <button
                  onClick={() => { setMode('login'); setForgotSent(false); }}
                  className="text-sm font-semibold transition-opacity hover:opacity-80"
                  style={{ color: GOLD }}
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgot} className="space-y-4">
                <button type="button" onClick={() => setMode('login')} className={`${backBtnClass} mb-2`}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
                  Back to sign in
                </button>
                <h2 className="font-heading text-3xl font-light text-white text-center mb-1">Reset your password</h2>
                <p className="text-sm text-white/45 text-center">
                  Enter your email and we'll send you a link to reset your password
                </p>
                <div>
                  <label className={labelClass}>Email</label>
                  <div className="relative">
                    <IconMail />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      placeholder="you@example.com"
                      className={`${inputClass} pl-10`}
                      style={{ fontSize: '16px', backgroundColor: INPUT_BG }}
                    />
                  </div>
                </div>
                {error && <p className="text-sm text-red-400">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className={btnClass}
                  style={{ backgroundColor: GOLD, color: NAVY }}
                >
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
            )
          )}
        </div>
      </div>
    </div>
  );
}
