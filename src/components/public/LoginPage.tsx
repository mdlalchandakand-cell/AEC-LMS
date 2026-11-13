import React, { useEffect, useState } from 'react';
import { useLms } from '../../context/LmsContext';
import { accountApi } from '../../services/accountApi';
import { LockKeyhole, LoaderCircle, ArrowLeft, UserPlus, Mail, KeyRound } from 'lucide-react';

type AccountMode = 'login' | 'register' | 'forgot' | 'reset';

export const LoginPage: React.FC = () => {
  const { signIn, setActiveView, language } = useLms();
  const params = new URLSearchParams(window.location.search);
  const initialAction = params.get('account_action');
  const token = params.get('token') || '';
  const [mode, setMode] = useState<AccountMode>(initialAction === 'reset_password' ? 'reset' : 'login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (initialAction !== 'verify_email') return;
    if (!token) {
      setError('This verification link is invalid or incomplete.');
      return;
    }
    let active = true;
    setLoading(true);
    accountApi.verifyEmail(token).then(result => {
      if (!active) return;
      if (result.success) {
        setNotice(result.message || 'Email verified. You can now sign in.');
        setMode('login');
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        setError(result.error || 'This verification link is invalid or expired.');
      }
    }).catch(() => {
      if (active) setError('Could not verify this link. Please try again.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const submitLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true); setError(''); setNotice('');
    const result = await signIn(email.trim(), password);
    setLoading(false);
    if (!result.success) { setError(result.error || 'Login failed. Check your credentials and try again.'); return; }
    setActiveView('dashboard');
  };

  const submitRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true); setError(''); setNotice('');
    const result = await accountApi.register({ name: name.trim(), email: email.trim(), phone: phone.trim(), password });
    setLoading(false);
    if (!result.success) { setError(result.error || 'Registration failed.'); return; }
    setNotice(result.message || 'Registration received. Check your email to verify your account.');
    setMode('login'); setPassword('');
  };

  const submitForgot = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true); setError(''); setNotice('');
    const result = await accountApi.requestPasswordReset(email.trim());
    setLoading(false);
    if (!result.success) { setError(result.error || 'Could not process the request.'); return; }
    setNotice(result.message || 'If an eligible account exists, password reset instructions have been sent.');
    setMode('login');
  };

  const resendVerification = async () => {
    if (!email.trim()) { setError('Enter your registration email address first.'); return; }
    setLoading(true); setError(''); setNotice('');
    const result = await accountApi.resendVerification(email.trim());
    setLoading(false);
    if (!result.success) { setError(result.error || 'Could not process the request.'); return; }
    setNotice(result.message || 'If an unverified account exists, a new verification link has been sent.');
  };

  const submitReset = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) { setError('This reset link is invalid or incomplete.'); return; }
    setLoading(true); setError(''); setNotice('');
    const result = await accountApi.resetPassword(token, password);
    setLoading(false);
    if (!result.success) { setError(result.error || 'Password reset failed.'); return; }
    setNotice(result.message || 'Password reset successful. Sign in with your new password.');
    setPassword('');
    setMode('login');
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  const title = mode === 'register' ? 'Create your student account'
    : mode === 'forgot' ? 'Reset your password'
    : mode === 'reset' ? 'Choose a new password'
    : "Alom's English Center";
  const submit = mode === 'register' ? submitRegister : mode === 'forgot' ? submitForgot : mode === 'reset' ? submitReset : submitLogin;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-xl">
        <button onClick={() => setActiveView('home')} className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-blue-700"><ArrowLeft className="h-4 w-4"/> {language === 'bn' ? 'ওয়েবসাইটে ফিরুন' : 'Back to website'}</button>
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white">{mode === 'register' ? <UserPlus className="h-6 w-6"/> : mode === 'forgot' || mode === 'reset' ? <KeyRound className="h-6 w-6"/> : <LockKeyhole className="h-6 w-6"/>}</div>
          <h1 className="text-xl font-extrabold text-slate-900">{title}</h1>
          <p className="mt-1 text-xs text-slate-500">{mode === 'register' ? 'Register as a student. Email verification is required before sign in.' : mode === 'forgot' ? 'Enter your registered email address.' : mode === 'reset' ? 'Use a strong password with at least 12 characters.' : 'Sign in securely to your LMS account'}</p>
        </div>
        {error && <div role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{error}</div>}
        {notice && <div role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">{notice}</div>}
        {loading && initialAction === 'verify_email' && <p className="mb-4 text-center text-xs text-slate-500">Verifying your email address…</p>}
        <form onSubmit={submit} className="space-y-4">
          {mode === 'register' && <>
            <label className="block space-y-1 text-xs font-semibold text-slate-700">Full name
              <input required maxLength={160} autoComplete="name" value={name} onChange={e => setName(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"/>
            </label>
            <label className="block space-y-1 text-xs font-semibold text-slate-700">Phone number
              <input type="tel" maxLength={32} autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"/>
            </label>
          </>}
          {mode !== 'reset' && <label className="block space-y-1 text-xs font-semibold text-slate-700">Email address
            <input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"/>
          </label>}
          {(mode === 'login' || mode === 'register' || mode === 'reset') && <label className="block space-y-1 text-xs font-semibold text-slate-700">{mode === 'login' ? 'Password' : 'New password'}
            <input required minLength={mode === 'login' ? 1 : 12} type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"/>
          </label>}
          <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">{loading && <LoaderCircle className="h-4 w-4 animate-spin"/>}{loading ? 'Please wait…' : mode === 'register' ? 'Create account' : mode === 'forgot' ? 'Send reset instructions' : mode === 'reset' ? 'Save new password' : 'Sign in'}</button>
        </form>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] font-semibold text-blue-700">
          {mode === 'login' && <><button onClick={() => { setMode('register'); setError(''); setNotice(''); }}>Create student account</button><button onClick={() => { setMode('forgot'); setError(''); setNotice(''); }}>Forgot password?</button><button onClick={() => void resendVerification()} disabled={loading}>Resend verification email</button></>}
          {mode !== 'login' && <button onClick={() => { setMode('login'); setError(''); setNotice(''); }}>Back to sign in</button>}
        </div>
        <p className="mt-5 text-center text-[11px] leading-relaxed text-slate-500">Access is controlled by your server-side account role and permissions. Public registration always creates a student account.</p>
      </section>
    </main>
  );
};
