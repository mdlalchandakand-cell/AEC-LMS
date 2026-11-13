/**
 * Alom's English Center - same-origin PHP API client.
 * Session cookies are HttpOnly; CSRF tokens remain in memory only.
 */

const API_BASE = '/api';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface CertificateApiRecord {
  id: number;
  certificateNumber: string;
  studentUserId: number;
  studentId: string;
  studentName: string;
  courseId: number;
  courseTitle: string;
  completionDate: string;
  grade: string;
  issueDate: string;
  authorizedBy: string;
  status: 'issued' | 'revoked';
  revokedAt: string | null;
  revokeReason: string | null;
}

export interface CertificateVerification {
  certificateNumber: string;
  studentName: string;
  courseTitle: string;
  completionDate: string;
  grade: string;
  authorizedBy: string;
  issueDate: string;
  status: 'issued' | 'revoked';
  valid: boolean;
  revokedAt: string | null;
}

class ApiService {
  private csrfToken: string | null = null;

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const method = (options.method || 'GET').toUpperCase();
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(options.body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers as Record<string, string> | undefined),
    };
    if (method !== 'GET' && !endpoint.startsWith('/auth.php?action=login') && this.csrfToken) {
      headers['X-CSRF-Token'] = this.csrfToken;
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options, method, credentials: 'same-origin', headers,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.success === false) {
        return {
          success: false, message: payload.message,
          error: payload.message || payload.error || `Server responded with status ${response.status}`,
        };
      }
      return payload as ApiResponse<T>;
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Network error communicating with LMS API' };
    }
  }

  public auth = {
    login: async (email: string, password: string) => {
      const result = await this.request<{ user: unknown; csrf_token: string }>('/auth.php?action=login', {
        method: 'POST', body: JSON.stringify({ email, password }),
      });
      if (result.success && result.data?.csrf_token) this.csrfToken = result.data.csrf_token;
      return result;
    },
    logout: async () => {
      const result = await this.request('/auth.php?action=logout', { method: 'POST' });
      if (result.success) this.csrfToken = null;
      return result;
    },
    me: async () => {
      const result = await this.request<{ user: unknown; csrf_token: string }>('/auth.php?action=me');
      if (result.success && result.data?.csrf_token) this.csrfToken = result.data.csrf_token;
      return result;
    },
    updatePassword: async (currentPassword: string, newPassword: string) => {
      const result = await this.request<{ csrf_token: string }>('/auth.php?action=change_password', {
        method: 'POST', body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      if (result.success && result.data?.csrf_token) this.csrfToken = result.data.csrf_token;
      return result;
    },
  };

  public users = {
    getAll: (query = '', limit = 50) => this.request<unknown[]>(`/users.php?action=list&limit=${encodeURIComponent(String(limit))}&q=${encodeURIComponent(query)}`),
    create: (user: { name: string; email: string; password: string; role: string; phone?: string; branch_id?: number | null }) =>
      this.request<{ id: number }>('/users.php?action=create', { method: 'POST', body: JSON.stringify(user) }),
    update: (id: string | number, user: Record<string, unknown>) =>
      this.request<{ id: number }>(`/users.php?action=update&id=${encodeURIComponent(id)}`, { method: 'POST', body: JSON.stringify(user) }),
    deactivate: (id: string | number) =>
      this.request<{ id: number }>(`/users.php?action=deactivate&id=${encodeURIComponent(id)}`, { method: 'POST' }),
  };

  public categories = {
    getAll: () => this.request<unknown[]>('/categories.php?action=list'),
    create: (category: { name: string; slug: string; name_bn?: string; parent_id?: number | null; description?: string; sort_order?: number }) =>
      this.request<{ id: number }>('/categories.php?action=create', { method: 'POST', body: JSON.stringify(category) }),
    update: (id: string | number, category: { name: string; slug: string; name_bn?: string; parent_id?: number | null; description?: string; sort_order?: number }) =>
      this.request<{ id: number }>(`/categories.php?action=update&id=${encodeURIComponent(String(id))}`, { method: 'POST', body: JSON.stringify(category) }),
    delete: (id: string | number) =>
      this.request(`/categories.php?action=delete&id=${encodeURIComponent(String(id))}`, { method: 'POST' }),
  };

  public courses = {
    getAll: () => this.request<Record<string, unknown>[]>('/courses.php?action=list'),
    getById: (id: string | number) => this.request<Record<string, unknown>>(`/courses.php?action=detail&id=${encodeURIComponent(id)}`),
    create: (courseData: Record<string, unknown>) => this.request<{ id: number }>('/courses.php?action=create', { method: 'POST', body: JSON.stringify(courseData) }),
    update: (id: string | number, courseData: Record<string, unknown>) => this.request<{ id: number }>(`/courses.php?action=update&id=${encodeURIComponent(id)}`, { method: 'POST', body: JSON.stringify(courseData) }),
    delete: (id: string | number) => this.request<{ id?: number }>(`/courses.php?action=delete&id=${encodeURIComponent(id)}`, { method: 'POST' }),
    restore: (id: string | number) => this.request<{ id: number }>(`/courses.php?action=restore&id=${encodeURIComponent(id)}`, { method: 'POST' }),
  };

  public content = {
    getAll: (type?: string) => this.request<Record<string, unknown>[]>(`/content.php?action=list${type ? `&type=${encodeURIComponent(type)}` : ''}`),
    getPublic: (type?: string) => this.request<Record<string, unknown>[]>(`/content.php?action=list&public=1${type ? `&type=${encodeURIComponent(type)}` : ''}`),
    getById: (id: string | number) => this.request<Record<string, unknown>>(`/content.php?action=detail&id=${encodeURIComponent(id)}`),
    getLinks: (id: string | number) => this.request<Array<{ course_id: number; course_title: string; sort_order: number; is_preview: number }>>(`/content.php?action=links&id=${encodeURIComponent(id)}`),
    getProgress: (courseId: string | number) => this.request<Array<{ content_item_id: number; is_completed: number; notes: string | null; updated_at: string }>>(`/content.php?action=progress&course_id=${encodeURIComponent(courseId)}`),
    saveProgress: (data: { course_id: number; content_item_id: number; is_completed: boolean; notes: string }) =>
      this.request<{ course_id: number; content_item_id: number; is_completed: boolean; notes: string }>('/content.php?action=progress_update', {
        method: 'POST', body: JSON.stringify(data),
      }),
    create: (item: Record<string, unknown>) => this.request<{ id: number }>('/content.php?action=create', { method: 'POST', body: JSON.stringify(item) }),
    update: (id: string | number, item: Record<string, unknown>) => this.request<{ id: number }>(`/content.php?action=update&id=${encodeURIComponent(id)}`, { method: 'POST', body: JSON.stringify(item) }),
    delete: (id: string | number) => this.request<{ id?: number }>(`/content.php?action=delete&id=${encodeURIComponent(id)}`, { method: 'POST' }),
    syncLinks: (contentItemId: string | number, links: Array<{ course_id: number; sort_order: number; is_preview: boolean }>) =>
      this.request<{ content_item_id: number; linked_courses: number }>('/content.php?action=sync_links', {
        method: 'POST', body: JSON.stringify({ content_item_id: contentItemId, links }),
      }),
    attachToCourse: (courseId: string | number, contentItemId: string | number, sortOrder = 0, isPreview = false) =>
      this.request('/content.php?action=attach', { method: 'POST', body: JSON.stringify({ course_id: courseId, content_item_id: contentItemId, sort_order: sortOrder, is_preview: isPreview }) }),
    detachFromCourse: (courseId: string | number, contentItemId: string | number) =>
      this.request('/content.php?action=detach', { method: 'POST', body: JSON.stringify({ course_id: courseId, content_item_id: contentItemId }) }),
  };


  public media = {
    list: (contentId?: string | number) => this.request<Array<{ id: number; content_item_id: number; original_filename: string; mime_type: string; size_bytes: number; sha256: string; uploaded_at: string }>>(
      `/media.php?action=list${contentId ? `&content_id=${encodeURIComponent(String(contentId))}` : ''}`,
    ),
    upload: (contentItemId: string | number, file: File) => {
      const body = new FormData();
      body.append('content_item_id', String(contentItemId));
      body.append('file', file);
      return this.request<{ id: number; content_item_id: number; filename: string; mime_type: string; size_bytes: number; download_url: string }>(
        '/media.php?action=upload', { method: 'POST', body },
      );
    },
    delete: (id: number) => this.request('/media.php?action=delete', {
      method: 'POST', body: JSON.stringify({ id }),
    }),
  };

  public enrollments = {
    getMine: () => this.request<unknown[]>('/enrollments.php?action=my'),
    getAll: (status = '', limit = 100) => this.request<unknown[]>(`/enrollments.php?action=list&limit=${encodeURIComponent(String(limit))}${status ? `&status=${encodeURIComponent(status)}` : ''}`),
    create: (data: { user_id: number; course_id: number; status?: 'pending' | 'active' | 'completed' | 'cancelled'; branch_id?: number | null; notes?: string }) =>
      this.request<{ id: number }>('/enrollments.php?action=create', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: { status?: 'pending' | 'active' | 'completed' | 'cancelled'; starts_at?: string | null; ends_at?: string | null; notes?: string }) =>
      this.request<{ id: number }>(`/enrollments.php?action=update&id=${encodeURIComponent(String(id))}`, { method: 'POST', body: JSON.stringify(data) }),
  };

  public payments = {
    submit: (paymentData: { course_id: number; amount: number; method: 'bKash' | 'Nagad' | 'Bank Transfer'; trx_id: string; sender_phone?: string }) =>
      this.request<{ id: number; remaining_amount: string }>('/payments.php?action=submit', { method: 'POST', body: JSON.stringify(paymentData) }),
    verify: (paymentId: string | number) => this.request<{ ledger_reference: string }>(`/payments.php?action=verify&id=${encodeURIComponent(paymentId)}`, { method: 'POST' }),
    reject: (paymentId: string | number, reason: string) => this.request(`/payments.php?action=reject&id=${encodeURIComponent(paymentId)}`, { method: 'POST', body: JSON.stringify({ reason }) }),
    refund: (paymentId: string | number, data: { amount: string; refund_reference: string; reason: string }) =>
      this.request<{ refund_id: number; ledger_reference: string; payment_status: string; refunded_total: string; remaining_refundable: string; net_course_paid: string; course_access_cancelled: boolean }>(`/payments.php?action=refund&id=${encodeURIComponent(paymentId)}`, { method: 'POST', body: JSON.stringify(data) }),
    getAll: (status = '') => this.request<unknown[]>(`/payments.php?action=list${status ? `&status=${encodeURIComponent(status)}` : ''}`),
    getMine: () => this.request<unknown[]>('/payments.php?action=my'),
    getLedger: () => this.request<unknown[]>('/payments.php?action=ledger'),
    reconcile: () => this.request<{ balanced: boolean; discrepancies: Array<Record<string, unknown>> }>('/payments.php?action=reconcile'),
  };

  public storefront = {
    getEbookFiles: () => this.request<Array<{ ebook_id: string; original_filename: string; size_bytes: number; uploaded_at: string }>>('/storefront.php?action=ebook_files'),
    uploadEbookFile: (ebookId: string, file: File) => {
      const form = new FormData();
      form.append('ebook_id', ebookId);
      form.append('pdf', file);
      return this.request<{ ebook_id: string; original_filename: string; size_bytes: number; sha256: string }>('/storefront.php?action=ebook_upload', { method: 'POST', body: form });
    },
    getEbookDownloadUrl: (ebookId: string) => `${API_BASE}/storefront.php?action=ebook_download&id=${encodeURIComponent(ebookId)}`,

    getMyEbooks: () => this.request<{ ebook_ids: string[]; available_file_ids: string[]; orders: Array<Record<string, unknown>> }>('/storefront.php?action=my_ebooks'),
    submitEbookPayment: (data: { ebook_id: string; payment_method: 'bKash' | 'Nagad'; trx_id: string; sender_phone: string }) =>
      this.request<{ id: number; status: 'pending'; amount: string }>('/storefront.php?action=ebook_submit', { method: 'POST', body: JSON.stringify(data) }),
    getEbookOrders: (status = '') => this.request<Array<Record<string, unknown>>>(`/storefront.php?action=ebook_orders${status ? `&status=${encodeURIComponent(status)}` : ''}`),
    reviewEbookOrder: (id: string | number, action: 'ebook_verify' | 'ebook_reject', reason = '') =>
      this.request<{ id: number; status: string }>(`/storefront.php?action=${action}&id=${encodeURIComponent(String(id))}`, { method: 'POST', body: JSON.stringify({ reason }) }),
    submitProductOrder: (data: { product_id: string; quantity: number; customer_name: string; customer_phone: string; delivery_address: string }) =>
      this.request<{ id: number; status: 'pending'; total_amount: string }>('/storefront.php?action=product_submit', { method: 'POST', body: JSON.stringify(data) }),
    getProductOrders: (status = '') => this.request<Array<Record<string, unknown>>>(`/storefront.php?action=product_orders${status ? `&status=${encodeURIComponent(status)}` : ''}`),
    updateProductOrder: (id: string | number, status: string) =>
      this.request<{ id: number; status: string }>(`/storefront.php?action=product_update&id=${encodeURIComponent(String(id))}`, { method: 'POST', body: JSON.stringify({ status }) }),
  };

  public notifications = {
    getAll: (limit = 50) => this.request<{ items: Array<Record<string, unknown>>; unread_count: number }>(`/notifications.php?action=list&limit=${encodeURIComponent(String(limit))}`),
    markRead: (id: string | number) => this.request<{ id: number; is_read: boolean }>(`/notifications.php?action=mark_read&id=${encodeURIComponent(String(id))}`, { method: 'POST' }),
    markAllRead: () => this.request<{ updated: number }>('/notifications.php?action=mark_all_read', { method: 'POST' }),
    delete: (id: string | number) => this.request<{ id: number }>(`/notifications.php?action=delete&id=${encodeURIComponent(String(id))}`, { method: 'POST' }),
    broadcast: (data: { title: string; title_bn?: string; message: string; message_bn?: string; type: 'info'|'success'|'warning'|'alert'; target_role: string; action_url?: string }) =>
      this.request<{ recipient_count: number; target_role: string }>('/notifications.php?action=broadcast', { method: 'POST', body: JSON.stringify(data) }),
  };

  public marksheets = {
    getAll: () => this.request<Array<Record<string, unknown>>>('/marksheets.php?action=list'),
    getEligibleAttempts: () => this.request<Array<Record<string, unknown>>>('/marksheets.php?action=eligible_attempts'),
    issue: (attemptId: number) => this.request<{ id: number; marksheet_number: string; grade: string }>('/marksheets.php?action=issue', {
      method: 'POST', body: JSON.stringify({ attempt_id: attemptId }),
    }),
  };

  // Persistent question-bank endpoints; management is protected by the server-side permission check.
  public questionBank = {
    getAll: () => this.request<Record<string, unknown>[]>('/question_bank.php?action=list'),
    getById: (id: string | number) => this.request<Record<string, unknown>>(`/question_bank.php?action=detail&id=${encodeURIComponent(id)}`),
    create: (data: Record<string, unknown>) => this.request<{ id: number }>('/question_bank.php?action=create', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string | number, data: Record<string, unknown>) => this.request<{ id: number }>(`/question_bank.php?action=update&id=${encodeURIComponent(id)}`, { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string | number) => this.request<{ id: number }>(`/question_bank.php?action=delete&id=${encodeURIComponent(id)}`, { method: 'POST' }),
    addToExam: (examId: string | number, questionBankIds: number[]) =>
      this.request<{ exam_id: number; imported_count: number; total_marks: number }>(`/question_bank.php?action=add_to_exam&exam_id=${encodeURIComponent(examId)}`, { method: 'POST', body: JSON.stringify({ question_bank_ids: questionBankIds }) }),
  };

  public attendance = {
    getRoster: (courseId: string | number, date: string) =>
      this.request<Array<{ id: number; name: string; email: string; branch_id: number | null; status: 'present' | 'absent' | 'late' | 'excused' | null; remarks: string | null }>>(
        `/attendance.php?action=roster&course_id=${encodeURIComponent(String(courseId))}&date=${encodeURIComponent(date)}`
      ),
    save: (courseId: string | number, date: string, records: Array<{ user_id: number; status: 'present' | 'absent' | 'late' | 'excused'; remarks: string }>) =>
      this.request<{ course_id: number; attendance_date: string; saved_count: number }>('/attendance.php?action=save', {
        method: 'POST', body: JSON.stringify({ course_id: Number(courseId), attendance_date: date, records }),
      }),
    getMy: () => this.request<Array<{ id: number; course_id: number; course_title: string; attendance_date: string; status: 'present' | 'absent' | 'late' | 'excused'; remarks: string | null }>>('/attendance.php?action=my'),
    getAll: (courseId: string | number, date: string) =>
      this.request<Array<Record<string, unknown>>>(`/attendance.php?action=list&course_id=${encodeURIComponent(String(courseId))}&date=${encodeURIComponent(date)}`),
  };


  // Consent-based guardian/student relationships and read-only progress summaries.
  public guardians = {
    getMyStudents: () => this.request<Array<Record<string, unknown>>>('/guardians.php?action=my_students'),
    requestLink: (studentEmail: string, relationship = 'Guardian') =>
      this.request<{ id: number; status: 'pending' }>('/guardians.php?action=request', {
        method: 'POST', body: JSON.stringify({ student_email: studentEmail, relationship }),
      }),
    getIncoming: () => this.request<Array<Record<string, unknown>>>('/guardians.php?action=incoming'),
    respond: (id: number, decision: 'accept' | 'reject') =>
      this.request<{ id: number; status: string }>(`/guardians.php?action=respond&id=${encodeURIComponent(String(id))}`, {
        method: 'POST', body: JSON.stringify({ decision }),
      }),
    revoke: (id: number) =>
      this.request<{ id: number; status: 'revoked' }>(`/guardians.php?action=revoke&id=${encodeURIComponent(String(id))}`, { method: 'POST' }),
    getSummary: (studentId: number) =>
      this.request<{
        student: Record<string, unknown>;
        courses: Array<Record<string, unknown>>;
        attendance: Array<Record<string, unknown>>;
        exams: Array<Record<string, unknown>>;
        payments: Array<Record<string, unknown>>;
        certificates: Array<Record<string, unknown>>;
      }>(`/guardians.php?action=summary&student_id=${encodeURIComponent(String(studentId))}`),
    getAll: (status = '') =>
      this.request<Array<Record<string, unknown>>>(`/guardians.php?action=list${status ? `&status=${encodeURIComponent(status)}` : ''}`),
  };

  public branches = {
    getAll: () => this.request<Array<Record<string, unknown>>>('/branches.php?action=list'),
    create: (data: { code: string; name: string; city?: string; address?: string; phone?: string }) =>
      this.request<{ id: number }>('/branches.php?action=create', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: { code: string; name: string; city?: string; address?: string; phone?: string }) =>
      this.request<{ id: number }>(`/branches.php?action=update&id=${encodeURIComponent(String(id))}`, { method: 'POST', body: JSON.stringify(data) }),
    deactivate: (id: number) =>
      this.request<{ id: number }>(`/branches.php?action=deactivate&id=${encodeURIComponent(String(id))}`, { method: 'POST' }),
  };

  public liveClasses = {
    getAll: () => this.request<Array<Record<string, unknown>>>('/live_classes.php?action=list'),
    create: (data: { course_id: number; instructor_id?: number; title: string; date: string; time: string; meeting_platform: 'google_meet' | 'zoom' | 'teams'; meeting_url: string }) =>
      this.request<{ id: number }>('/live_classes.php?action=create', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: { status?: 'upcoming' | 'live' | 'completed'; recording_url?: string }) =>
      this.request<{ id: number; status: string }>(`/live_classes.php?action=update&id=${encodeURIComponent(String(id))}`, { method: 'POST', body: JSON.stringify(data) }),
    cancel: (id: number) =>
      this.request<{ id: number; status: 'cancelled' }>(`/live_classes.php?action=cancel&id=${encodeURIComponent(String(id))}`, { method: 'POST' }),
  };

  public admissions = {
    submit: (application: {
      name: string; email: string; phone: string; course_id: number;
      branch_label?: string; preferred_contact: 'phone' | 'email'; message?: string; website?: string;
    }) => this.request<{ reference_code: string; status: 'pending' }>('/admissions.php?action=submit', {
      method: 'POST', body: JSON.stringify(application),
    }),
    getAll: (status = '') => this.request<Array<Record<string, unknown>>>(`/admissions.php?action=list${status ? `&status=${encodeURIComponent(status)}` : ''}`),
    update: (id: number, status: 'pending' | 'contacted' | 'rejected', review_notes = '') =>
      this.request<{ id: number; status: string }>(`/admissions.php?action=update&id=${encodeURIComponent(String(id))}`, {
        method: 'POST', body: JSON.stringify({ status, review_notes }),
      }),
  };

  public cms = {
    getSettings: () => this.request<Record<string, unknown>>('/cms.php?action=settings'),
    saveSettings: (settings: Record<string, unknown>) =>
      this.request<Record<string, unknown>>('/cms.php?action=save_settings', { method: 'POST', body: JSON.stringify({ settings }) }),
    getPublicPosts: () => this.request<Array<Record<string, unknown>>>('/cms.php?action=public_posts'),
    getPosts: () => this.request<Array<Record<string, unknown>>>('/cms.php?action=posts'),
    getPost: (slug: string) => this.request<Record<string, unknown>>(`/cms.php?action=post&slug=${encodeURIComponent(slug)}`),
    createPost: (post: Record<string, unknown>) => this.request<{ id: number }>('/cms.php?action=create_post', { method: 'POST', body: JSON.stringify(post) }),
    updatePost: (id: string | number, post: Record<string, unknown>) =>
      this.request<{ id: number }>(`/cms.php?action=update_post&id=${encodeURIComponent(String(id))}`, { method: 'POST', body: JSON.stringify(post) }),
    deletePost: (id: string | number) => this.request<{ id: number }>(`/cms.php?action=delete_post&id=${encodeURIComponent(String(id))}`, { method: 'POST' }),
    getPublicTestimonials: () => this.request<Array<Record<string, unknown>>>('/cms.php?action=public_testimonials'),
    getTestimonials: () => this.request<Array<Record<string, unknown>>>('/cms.php?action=testimonials'),
    createTestimonial: (item: Record<string, unknown>) => this.request<{ id: number }>('/cms.php?action=create_testimonial', { method: 'POST', body: JSON.stringify(item) }),
    updateTestimonial: (id: string | number, item: Record<string, unknown>) =>
      this.request<{ id: number }>(`/cms.php?action=update_testimonial&id=${encodeURIComponent(String(id))}`, { method: 'POST', body: JSON.stringify(item) }),
    deleteTestimonial: (id: string | number) => this.request<{ id: number }>(`/cms.php?action=delete_testimonial&id=${encodeURIComponent(String(id))}`, { method: 'POST' }),
  };

  public exams = {
    getAll: () => this.request<Record<string, unknown>[]>('/exams.php?action=list'),
    getById: (id: string | number) => this.request<Record<string, unknown>>(`/exams.php?action=detail&id=${encodeURIComponent(String(id))}`),
    create: (data: Record<string, unknown>) => this.request<{ id: number }>('/exams.php?action=create', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string | number, data: Record<string, unknown>) => this.request<{ id: number }>(`/exams.php?action=update&id=${encodeURIComponent(String(id))}`, { method: 'POST', body: JSON.stringify(data) }),
    saveQuestions: (id: string | number, questions: Array<Record<string, unknown>>) =>
      this.request<{ id: number; question_count: number; total_marks: number }>(`/exams.php?action=save_questions&id=${encodeURIComponent(String(id))}`, { method: 'POST', body: JSON.stringify({ questions }) }),
    start: (id: string | number) => this.request<{ attempt: { id: number; started_at: string; expires_at: string; remaining_seconds: number; answers: Record<string, number> } }>(`/exams.php?action=start&id=${encodeURIComponent(id)}`, { method: 'POST' }),
    saveAnswers: (attemptId: string | number, answers: Record<string, number>) =>
      this.request<{ attempt_id: number; saved_answers: number }>(`/exams.php?action=save_answers&id=${encodeURIComponent(attemptId)}`, { method: 'POST', body: JSON.stringify({ answers }) }),
    submitAttempt: (attemptId: string | number, answers: Record<string, number>) =>
      this.request<Record<string, unknown>>(`/exams.php?action=submit&id=${encodeURIComponent(attemptId)}`, { method: 'POST', body: JSON.stringify({ answers }) }),
    getAttempts: (examId?: string | number) => this.request<Record<string, unknown>[]>(`/exams.php?action=attempts${examId ? `&exam_id=${encodeURIComponent(examId)}` : ''}`),
    delete: (id: string | number) => this.request<{ id: number }>(`/exams.php?action=delete&id=${encodeURIComponent(id)}`, { method: 'POST' }),
  };


  public recycleBin = {
    getAll: () => this.request<Array<Record<string, unknown>>>('/recycle_bin.php?action=list'),
    restore: (id: number) => this.request<{ id: number; entity_type: string; entity_id: number }>(`/recycle_bin.php?action=restore&id=${encodeURIComponent(String(id))}`, { method: 'POST' }),
    permanentDelete: (id: number) => this.request<{ id: number }>(`/recycle_bin.php?action=permanent_delete&id=${encodeURIComponent(String(id))}`, { method: 'POST' }),
    purgeExpired: () => this.request<{ purged: number; blocked: Array<{ id: number; title?: string; reason: string }> }>('/recycle_bin.php?action=purge_expired', { method: 'POST' }),
  };

  public batches = {
    getAll: () => this.request<Array<Record<string, unknown>>>('/batches.php?action=list'),
    getRoutines: (batchId?: number) => this.request<Array<Record<string, unknown>>>(`/batches.php?action=routines${batchId ? `&batch_id=${encodeURIComponent(String(batchId))}` : ''}`),
    create: (data: Record<string, unknown>) => this.request<{ id: number }>('/batches.php?action=create', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Record<string, unknown>) => this.request<{ id: number }>(`/batches.php?action=update&id=${encodeURIComponent(String(id))}`, { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: number) => this.request<{ id: number }>(`/batches.php?action=delete&id=${encodeURIComponent(String(id))}`, { method: 'POST' }),
    restore: (id: number) => this.request<{ id: number }>(`/batches.php?action=restore&id=${encodeURIComponent(String(id))}`, { method: 'POST' }),
    getInstructors: () => this.request<Array<Record<string, unknown>>>('/batches.php?action=instructors'),
    getStudents: (batchId: number) => this.request<Array<Record<string, unknown>>>(`/batches.php?action=students&batch_id=${encodeURIComponent(String(batchId))}`),
    getEligibleStudents: (batchId: number) => this.request<Array<Record<string, unknown>>>(`/batches.php?action=eligible_students&batch_id=${encodeURIComponent(String(batchId))}`),
    enroll: (batchId: number, studentUserId: number) => this.request<{ batch_id: number; student_user_id: number }>(`/batches.php?action=enroll&id=${encodeURIComponent(String(batchId))}`, { method: 'POST', body: JSON.stringify({ student_user_id: studentUserId }) }),
    unenroll: (batchId: number, studentUserId: number) => this.request<{ batch_id: number; student_user_id: number }>(`/batches.php?action=unenroll&id=${encodeURIComponent(String(batchId))}`, { method: 'POST', body: JSON.stringify({ student_user_id: studentUserId }) }),
    createRoutine: (data: Record<string, unknown>) => this.request<{ id: number }>('/batches.php?action=create_routine', { method: 'POST', body: JSON.stringify(data) }),
    deleteRoutine: (id: number) => this.request<{ id: number }>(`/batches.php?action=delete_routine&id=${encodeURIComponent(String(id))}`, { method: 'POST' }),
  };

  public teacherCommissions = {
    getSummary: (teacherId?: string | number) => this.request<{
      commissions: Array<Record<string, unknown>>;
      totals: { gross_commission: string; paid_commission: string; reserved_payouts: string; available_balance: string; overpaid_commission: string };
    }>(`/teacher_commissions.php?action=summary${teacherId ? `&teacher_id=${encodeURIComponent(String(teacherId))}` : ''}`),
    getAssignments: () => this.request<Array<Record<string, unknown>>>('/teacher_commissions.php?action=assignments'),
    assign: (courseId: number, teacherUserId: number, commissionPercentage: number) =>
      this.request<{ id: number }>('/teacher_commissions.php?action=assign', { method: 'POST', body: JSON.stringify({ course_id: courseId, teacher_user_id: teacherUserId, commission_percentage: commissionPercentage }) }),
    unassign: (id: number) =>
      this.request<{ id: number }>(`/teacher_commissions.php?action=unassign&id=${encodeURIComponent(String(id))}`, { method: 'POST' }),
    getPayouts: () => this.request<Array<Record<string, unknown>>>('/teacher_commissions.php?action=payouts'),
    requestPayout: (data: { amount: string; payout_method: 'bKash' | 'Nagad' | 'Bank Transfer'; account_reference: string; bank_name?: string; bank_branch?: string; remarks?: string }) =>
      this.request<{ id: number; status: string; available_balance: string }>('/teacher_commissions.php?action=request_payout', { method: 'POST', body: JSON.stringify(data) }),
    reviewPayout: (id: number, decision: 'approve' | 'reject', reason?: string) =>
      this.request<{ id: number; status: string }>(`/teacher_commissions.php?action=review_payout&id=${encodeURIComponent(String(id))}`, { method: 'POST', body: JSON.stringify({ decision, reason }) }),
    markPaid: (id: number, externalTransactionReference: string) =>
      this.request<{ id: number; status: 'paid' }>(`/teacher_commissions.php?action=mark_paid&id=${encodeURIComponent(String(id))}`, { method: 'POST', body: JSON.stringify({ external_transaction_reference: externalTransactionReference }) }),
  };


  // Persistent certificate issuance, student wallet and public verification API.
  public certificates = {
    getAll: (query = '') => this.request<CertificateApiRecord[]>(`/certificates.php?action=list&q=${encodeURIComponent(query)}`),
    getStudents: (query = '') => this.request<Array<{ id: number; name: string; email: string }>>(`/certificates.php?action=students&q=${encodeURIComponent(query)}`),
    getMine: () => this.request<CertificateApiRecord[]>('/certificates.php?action=my'),
    issue: (studentUserId: number, courseId: number, grade: string) =>
      this.request<{ id: number; certificate_number: string }>('/certificates.php?action=issue', {
        method: 'POST', body: JSON.stringify({ student_user_id: studentUserId, course_id: courseId, grade }),
      }),
    revoke: (id: number, reason: string) =>
      this.request<{ id: number; status: 'revoked' }>(`/certificates.php?action=revoke&id=${encodeURIComponent(String(id))}`, {
        method: 'POST', body: JSON.stringify({ reason }),
      }),
    verify: (certificateNumber: string) =>
      this.request<CertificateVerification>(`/certificates.php?action=verify&cert_no=${encodeURIComponent(certificateNumber.trim().toUpperCase())}`),
  };

}

export const apiClient = new ApiService();
