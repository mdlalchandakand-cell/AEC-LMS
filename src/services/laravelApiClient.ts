/**
 * Optional Laravel API client.
 * The legacy PHP API remains the default until Laravel is deployed and the matching screens are switched.
 * CSRF tokens are held in memory only; session cookies remain HttpOnly.
 */
export interface LaravelApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}
const API_BASE = String(import.meta.env.VITE_LARAVEL_API_BASE_URL || '').replace(/\/+$/, '');
export const isLaravelApiEnabled = import.meta.env.VITE_LARAVEL_API_ENABLED === 'true';

class LaravelApiService {
  private csrfToken: string | null = null;

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<LaravelApiResponse<T>> {
    const method = (options.method || 'GET').toUpperCase();
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(options.body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers as Record<string, string> | undefined),
    };
    if (method !== 'GET' && this.csrfToken) headers['X-CSRF-TOKEN'] = this.csrfToken;

    try {
      const response = await fetch(API_BASE + endpoint, {
        ...options,
        method,
        credentials: API_BASE ? 'include' : 'same-origin',
        headers,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.success === false) {
        return {
          success: false,
          message: payload.message,
          error: payload.message || payload.error || 'Laravel API responded with status ' + response.status,
        };
      }
      return payload as LaravelApiResponse<T>;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error communicating with Laravel LMS API',
      };
    }
  }

  public auth = {
    csrf: async () => {
      const result = await this.request<{ csrf_token: string }>('/api/v1/auth/csrf');
      if (result.success && result.data?.csrf_token) this.csrfToken = result.data.csrf_token;
      return result;
    },
    login: async (email: string, password: string) => {
      const csrf = await this.request<{ csrf_token: string }>('/api/v1/auth/csrf');
      if (!csrf.success || !csrf.data?.csrf_token) {
        return { success: false, error: csrf.error || csrf.message || 'Could not initialize Laravel CSRF session.' };
      }
      this.csrfToken = csrf.data.csrf_token;
      const result = await this.request<{ user: unknown; csrf_token: string }>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (result.success && result.data?.csrf_token) this.csrfToken = result.data.csrf_token;
      return result;
    },
    me: async () => {
      const result = await this.request<{ user: unknown; csrf_token: string }>('/api/v1/auth/me');
      if (result.success && result.data?.csrf_token) this.csrfToken = result.data.csrf_token;
      return result;
    },
    logout: async () => {
      const result = await this.request('/api/v1/auth/logout', { method: 'POST' });
      if (result.success) this.csrfToken = null;
      return result;
    },
  };

  public subscriptions = {
    plans: () => this.request<{ items: unknown[] }>('/api/v1/subscriptions/plans'),
    mine: () => this.request<{ items: unknown[] }>('/api/v1/subscriptions/my'),
    access: () => this.request<{ active: boolean; subscription: unknown | null }>('/api/v1/subscriptions/my/access'),
    courses: () => this.request<{ items: unknown[] }>('/api/v1/subscriptions/my/courses'),
    subscribe: (payload: Record<string, unknown>) => this.request('/api/v1/subscriptions', { method: 'POST', body: JSON.stringify(payload) }),
    selectCourse: (subscriptionId: number, courseId: number) => this.request('/api/v1/subscriptions/' + subscriptionId + '/courses', { method: 'POST', body: JSON.stringify({ course_id: courseId }) }),
    cancel: (subscriptionId: number) => this.request('/api/v1/subscriptions/' + subscriptionId + '/cancel', { method: 'POST' }),
    review: (subscriptionId: number, decision: 'approve' | 'reject', note?: string) => this.request('/api/v1/subscriptions/' + subscriptionId + '/review', { method: 'POST', body: JSON.stringify({ decision, note }) }),
    createPlan: (payload: Record<string, unknown>) => this.request('/api/v1/subscriptions/plans', { method: 'POST', body: JSON.stringify(payload) }),
    updatePlan: (planId: number, payload: Record<string, unknown>) => this.request('/api/v1/subscriptions/plans/' + planId, { method: 'PUT', body: JSON.stringify(payload) }),
    archivePlan: (planId: number) => this.request('/api/v1/subscriptions/plans/' + planId, { method: 'DELETE' }),
  };

  public liveClasses = {
    list: () => this.request<{ items: unknown[] }>('/api/v1/live-classes'),
    create: (payload: Record<string, unknown>) => this.request<{ id: number }>('/api/v1/live-classes', { method: 'POST', body: JSON.stringify(payload) }),
    update: (id: number, payload: Record<string, unknown>) => this.request('/api/v1/live-classes/' + id, { method: 'PATCH', body: JSON.stringify(payload) }),
    cancel: (id: number, reason?: string) => this.request('/api/v1/live-classes/' + id + '/cancel', { method: 'POST', body: JSON.stringify({ reason }) }),
  };

  public exams = {
    list: () => this.request<{ items: unknown[] }>('/api/v1/exams'),
    getById: (id: number) => this.request<Record<string, unknown>>('/api/v1/exams/' + id),
    attempts: (examId?: number) => this.request<{ items: unknown[] }>('/api/v1/exams/attempts' + (examId ? '?exam_id=' + encodeURIComponent(String(examId)) : '')),
    start: (id: number) => this.request<{ attempt: Record<string, unknown>; exam: Record<string, unknown> }>('/api/v1/exams/' + id + '/start', { method: 'POST' }),
    saveAnswers: (attemptId: number, answers: Record<string, number>) => this.request('/api/v1/exams/attempts/' + attemptId + '/answers', { method: 'POST', body: JSON.stringify({ answers }) }),
    submit: (attemptId: number, answers: Record<string, number>) => this.request('/api/v1/exams/attempts/' + attemptId + '/submit', { method: 'POST', body: JSON.stringify({ answers }) }),
    create: (payload: Record<string, unknown>) => this.request<{ id: number }>('/api/v1/exams', { method: 'POST', body: JSON.stringify(payload) }),
    update: (id: number, payload: Record<string, unknown>) => this.request<{ id: number }>('/api/v1/exams/' + id, { method: 'PATCH', body: JSON.stringify(payload) }),
    saveQuestions: (id: number, questions: unknown[]) => this.request('/api/v1/exams/' + id + '/questions', { method: 'PUT', body: JSON.stringify({ questions }) }),
    archive: (id: number) => this.request('/api/v1/exams/' + id, { method: 'DELETE' }),
  };

  public questionBank = {
    list: () => this.request<{ items: unknown[] }>('/api/v1/question-bank'),
    get: (id: number) => this.request('/api/v1/question-bank/' + id),
    create: (payload: Record<string, unknown>) => this.request('/api/v1/question-bank', { method: 'POST', body: JSON.stringify(payload) }),
    update: (id: number, payload: Record<string, unknown>) => this.request('/api/v1/question-bank/' + id, { method: 'PATCH', body: JSON.stringify(payload) }),
    archive: (id: number) => this.request('/api/v1/question-bank/' + id, { method: 'DELETE' }),
    addToExam: (examId: number, questionBankIds: number[]) => this.request('/api/v1/question-bank/add-to-exam', { method: 'POST', body: JSON.stringify({ exam_id: examId, question_bank_ids: questionBankIds }) }),
  };

  public certificates = {
    mine: () => this.request<{ items: unknown[] }>('/api/v1/certificates/my'),
    list: (search = '') => this.request<{ items: unknown[] }>('/api/v1/certificates' + (search ? '?q=' + encodeURIComponent(search) : '')),
    students: (search = '') => this.request<{ items: unknown[] }>('/api/v1/certificates/students' + (search ? '?q=' + encodeURIComponent(search) : '')),
    issue: (payload: Record<string, unknown>) => this.request('/api/v1/certificates', { method: 'POST', body: JSON.stringify(payload) }),
    revoke: (id: number, reason: string) => this.request('/api/v1/certificates/' + id + '/revoke', { method: 'POST', body: JSON.stringify({ reason }) }),
    verify: (number: string) => this.request('/api/v1/certificates/verify/' + encodeURIComponent(number)),
  };

  public recycleBin = {
    list: () => this.request<{ items: unknown[] }>('/api/v1/recycle-bin'),
    restore: (id: number) => this.request<{ id: number; entity_type: string; entity_id: number }>('/api/v1/recycle-bin/' + id + '/restore', { method: 'POST' }),
    permanentlyDelete: (id: number) => this.request<{ id: number; already_absent?: boolean }>('/api/v1/recycle-bin/' + id + '/permanent-delete', { method: 'POST' }),
  };

  public courses = {
    contents: (id: number) => this.request<{ items: unknown[] }>('/api/v1/courses/' + id + '/contents'),
    progress: (id: number) => this.request('/api/v1/courses/' + id + '/progress'),
    saveProgress: (payload: Record<string, unknown>) => this.request('/api/v1/progress/lessons', { method: 'POST', body: JSON.stringify(payload) }),
  };
}

export const laravelApiClient = new LaravelApiService();
