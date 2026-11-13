import React, { useEffect, useState } from 'react';
import { useLms } from '../../context/LmsContext';
import { apiClient } from '../../services/apiClient';
import { X, CheckCircle2, Building2, User, Phone, Mail, ArrowRight, Loader2 } from 'lucide-react';
import { Course } from '../../types/lms';

interface AdmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedCourse?: Course | null;
}

export const AdmissionModal: React.FC<AdmissionModalProps> = ({
  isOpen,
  onClose,
  preSelectedCourse,
}) => {
  const { courses, branches, language, t } = useLms();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+880 1');
  const [selectedCourseId, setSelectedCourseId] = useState(preSelectedCourse ? preSelectedCourse.id : (courses[0]?.id || ''));
  const [selectedBranchId, setSelectedBranchId] = useState(branches[0]?.id || '');
  const [preferredContact, setPreferredContact] = useState<'phone' | 'email'>('phone');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applicationReference, setApplicationReference] = useState('');

  useEffect(() => {
    if (isOpen && preSelectedCourse) setSelectedCourseId(preSelectedCourse.id);
    else if (isOpen && !selectedCourseId && courses[0]) setSelectedCourseId(courses[0].id);
  }, [isOpen, preSelectedCourse, courses, selectedCourseId]);

  if (!isOpen) return null;

  const activeCourse = courses.find(course => course.id === selectedCourseId);
  const selectedBranch = branches.find(branch => branch.id === selectedBranchId);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    setFormError('');
    if (!fullName.trim() || !email.trim() || !phone.trim() || !activeCourse) {
      setFormError('Please complete your name, email, phone and course selection.');
      return;
    }

    setIsSubmitting(true);
    const result = await apiClient.admissions.submit({
      name: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      course_id: Number(activeCourse.id),
      branch_label: selectedBranch?.name || '',
      preferred_contact: preferredContact,
      message: message.trim(),
      website: honeypot,
    });
    setIsSubmitting(false);
    if (!result.success || !result.data?.reference_code) {
      setFormError(result.error || 'Your application could not be submitted. Please try again.');
      return;
    }
    setApplicationReference(result.data.reference_code);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-[#0b1e36] px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-base font-bold">AEC</div>
            <div>
              <h2 className="text-lg font-bold">{language === 'bn' ? 'অনলাইন ভর্তি আবেদন' : 'Admission Application'}</h2>
              <p className="text-xs text-blue-300">Alom's English Center</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-300 hover:bg-slate-800 hover:text-white" aria-label="Close admission form">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 overflow-y-auto p-6">
          {applicationReference ? (
            <div className="space-y-4 py-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-9 w-9" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900">{language === 'bn' ? 'আবেদন জমা হয়েছে' : 'Application received'}</h3>
              <p className="mx-auto max-w-lg text-sm leading-6 text-slate-600">
                Your application is pending review. Our team will contact you using your preferred contact method. No account has been activated and no payment has been received or verified yet.
              </p>
              <div className="mx-auto max-w-sm rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Application reference</p>
                <p className="mt-1 font-mono text-lg font-bold text-blue-700">{applicationReference}</p>
                <p className="mt-2 text-xs text-amber-700">Status: Pending review</p>
              </div>
              <button type="button" onClick={onClose} className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
                {t.close}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-900">
                Submit your details to request admission. Our team will contact you with the next steps and verified payment instructions. This form does not take payment or create a student account.
              </div>
              {formError && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{formError}</div>}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="space-y-1 text-xs font-semibold text-slate-700">
                  Full name *
                  <span className="relative block">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input required maxLength={160} value={fullName} onChange={event => setFullName(event.target.value)} placeholder="Your full name" className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm font-normal" />
                  </span>
                </label>
                <label className="space-y-1 text-xs font-semibold text-slate-700">
                  Email address *
                  <span className="relative block">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input required type="email" maxLength={190} value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm font-normal" />
                  </span>
                </label>
                <label className="space-y-1 text-xs font-semibold text-slate-700">
                  Mobile number *
                  <span className="relative block">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input required maxLength={32} value={phone} onChange={event => setPhone(event.target.value)} placeholder="+880 1XXXXXXXXX" className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm font-normal" />
                  </span>
                </label>
                <label className="space-y-1 text-xs font-semibold text-slate-700">
                  Preferred contact
                  <select value={preferredContact} onChange={event => setPreferredContact(event.target.value as 'phone' | 'email')} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal">
                    <option value="phone">Phone call</option>
                    <option value="email">Email</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="space-y-1 text-xs font-semibold text-slate-700">
                  Course *
                  <select required value={selectedCourseId} onChange={event => setSelectedCourseId(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal">
                    <option value="">Choose a course</option>
                    {courses.map(course => <option key={course.id} value={course.id}>{course.title} — ৳{course.price.toLocaleString()}</option>)}
                  </select>
                </label>
                <label className="space-y-1 text-xs font-semibold text-slate-700">
                  Preferred campus
                  <span className="relative block">
                    <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <select value={selectedBranchId} onChange={event => setSelectedBranchId(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm font-normal">
                      <option value="">No preference</option>
                      {branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                    </select>
                  </span>
                </label>
              </div>

              <label className="block space-y-1 text-xs font-semibold text-slate-700">
                Message (optional)
                <textarea rows={3} maxLength={2000} value={message} onChange={event => setMessage(event.target.value)} placeholder="Tell us about your learning goals or questions." className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" />
              </label>

              <input type="text" value={honeypot} onChange={event => setHoneypot(event.target.value)} autoComplete="off" tabIndex={-1} aria-hidden="true" className="hidden" />

              <div className="flex justify-end border-t border-slate-100 pt-4">
                <button type="submit" disabled={isSubmitting || !activeCourse} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  {isSubmitting ? 'Submitting…' : 'Submit admission inquiry'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
