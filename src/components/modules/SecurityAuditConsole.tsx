import React from 'react';
import { AlertTriangle, ExternalLink, ShieldCheck, Terminal } from 'lucide-react';

export const SecurityAuditConsole: React.FC = () => (
  <div className="space-y-6">
    <section className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-amber-950">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-1 h-6 w-6 shrink-0 text-amber-700" />
        <div className="space-y-2">
          <h2 className="text-xl font-bold">Release verification must come from real CI</h2>
          <p className="text-sm leading-6">
            The previous screen displayed locally generated “30/30 passed” results and green security
            badges. Those were demo state, not executed backend or browser tests. They are no longer
            presented as verified test results.
          </p>
        </div>
      </div>
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-5 w-5 text-blue-700" />
        <h3 className="text-lg font-bold text-slate-900">Actual automated validation</h3>
      </div>
      <ul className="mt-4 space-y-3 text-sm text-slate-700">
        <li>PHP 8.3 syntax validation and migration-safety checks.</li>
        <li>MySQL migration/schema integration and PHP API HTTP integration tests.</li>
        <li>Frontend dependency install, TypeScript type-check and production build.</li>
        <li>CodeQL analysis for JavaScript/TypeScript and GitHub Actions workflows.</li>
      </ul>
      <a className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900"
        href="https://github.com/mdlalchandakand-cell/AEC-LMS/actions"
        target="_blank" rel="noreferrer">
        View actual GitHub Actions results <ExternalLink className="h-4 w-4" />
      </a>
    </section>

    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
      <div className="flex items-center gap-3">
        <Terminal className="h-5 w-5 text-slate-700" />
        <h3 className="text-lg font-bold text-slate-900">Production checks still required</h3>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        CI does not replace browser end-to-end testing, production email/payment verification,
        backup/restore checks, branch-isolation review, or a clean cPanel installation rehearsal.
        The LMS must remain marked pre-release until those checks pass.
      </p>
      <a className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900"
        href="https://github.com/mdlalchandakand-cell/AEC-LMS/blob/main/docs/RELEASE-READINESS-AUDIT.md"
        target="_blank" rel="noreferrer">
        Read the release-readiness audit <ExternalLink className="h-4 w-4" />
      </a>
    </section>
  </div>
);
