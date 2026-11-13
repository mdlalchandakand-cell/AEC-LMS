const API = '/api/accounts.php';

export interface AccountResult<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

async function request<T>(action: string, payload?: Record<string, unknown>): Promise<AccountResult<T>> {
  try {
    const response = await fetch(`${API}?action=${encodeURIComponent(action)}`, {
      method: payload ? 'POST' : 'GET',
      credentials: 'same-origin',
      headers: { Accept: 'application/json', ...(payload ? { 'Content-Type': 'application/json' } : {}) },
      body: payload ? JSON.stringify(payload) : undefined,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.success === false) {
      return { success: false, message: result.message, error: result.message || result.error || `Request failed (${response.status})` };
    }
    return result as AccountResult<T>;
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Network error.' };
  }
}

export const accountApi = {
  register: (data: { name: string; email: string; phone: string; password: string }) =>
    request<{ email: string }>('register', data),
  verifyEmail: (token: string) => request('verify_email', { token }),
  resendVerification: (email: string) => request('resend_verification', { email }),
  adminActivate: (id: number, csrfToken: string) => fetch(`${API}?action=admin_activate&id=${encodeURIComponent(String(id))}`, { method: 'POST', credentials: 'same-origin', headers: { Accept: 'application/json', 'X-CSRF-Token': csrfToken } }).then(async response => { const result = await response.json().catch(() => ({})); return response.ok && result.success !== false ? result as AccountResult : { success: false, error: result.message || 'Account activation failed.' }; }),
  requestPasswordReset: (email: string) => request('request_password_reset', { email }),
  resetPassword: (token: string, password: string) => request('reset_password', { token, password }),
  getProfile: () => request<{ id: number; name: string; email: string; phone: string | null; role: string; email_verified_at: string | null }>('profile'),
  updateProfile: (name: string, phone: string, csrfToken: string) => fetch(`${API}?action=profile`, {
    method: 'POST', credentials: 'same-origin',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
    body: JSON.stringify({ name, phone }),
  }).then(async response => {
    const result = await response.json().catch(() => ({}));
    return response.ok && result.success !== false ? result as AccountResult<{ name: string; phone: string }> : { success: false, error: result.message || 'Profile update failed.' };
  }).catch(error => ({ success: false, error: error instanceof Error ? error.message : 'Network error.' })),
};
