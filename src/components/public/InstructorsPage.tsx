import React from 'react';
import { useLms } from '../../context/LmsContext';
import { BookOpen, Youtube, Facebook } from 'lucide-react';
import instructorTanvirImg from '../../assets/images/instructor_tanvir_1794552825904.jpg';

export const InstructorsPage: React.FC = () => {
  const { language, websiteSettings } = useLms();
  const isBn = language === 'bn';

  const theme = websiteSettings.themeSettings;
  const lightCanvasBg = `linear-gradient(135deg, ${theme?.lightCanvasStart || '#EAE9FF'} 0%, ${theme?.lightCanvasMid || '#F2F3FF'} 45%, ${theme?.lightCanvasEnd || '#E5F4FE'} 100%)`;
  const cardBg = theme?.cardBg || '#FFFFFF';
  const headingBlue = theme?.learningPathTitleColor || '#0084D4';

  const instructorsSection = websiteSettings.instructorsSection || {
    titleEn: 'Our Expert Instructors',
    titleBn: 'আমাদের অভিজ্ঞ শিক্ষকমণ্ডলী',
    subtitleEn: 'Meet our dedicated team of educators and certified IELTS & English mentors',
    subtitleBn: 'দেশের সেরা ও অভিজ্ঞ ইংরেজি এবং IELTS মেন্টরদের সাথে পরিচিত হোন',
    panelLabelEn: 'Instructor Panel',
    panelLabelBn: 'শিক্ষক প্যানেল'
  };

  const instructors = websiteSettings.instructors || [];

  const isBrokenExternalUrl = (url?: string): boolean => {
    if (!url) return true;
    return url.includes('images.unsplash.com') || url.includes('placeholder');
  };

  return (
    <main
      className="flex-1 py-12 sm:py-16 px-4 sm:px-6 w-full"
      style={{ background: lightCanvasBg }}
    >
      <div className="max-w-[1060px] mx-auto space-y-10">
        {/* Centered Header Matching Screenshot */}
        <div className="text-center space-y-2.5 max-w-2xl mx-auto">
          <h1
            className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight"
            style={{ color: headingBlue }}
          >
            {isBn ? instructorsSection.titleBn : instructorsSection.titleEn}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {isBn ? instructorsSection.subtitleBn : instructorsSection.subtitleEn}
          </p>

          <div className="pt-4">
            <h2
              className="font-heading text-lg sm:text-xl font-extrabold tracking-tight"
              style={{ color: headingBlue }}
            >
              {isBn ? instructorsSection.panelLabelBn : instructorsSection.panelLabelEn}
            </h2>
            <div
              className="w-14 h-[3px] rounded-full mx-auto mt-2"
              style={{ backgroundColor: headingBlue }}
            />
          </div>
        </div>

        {/* 3-Column Instructor Cards Grid */}
        {instructors.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs max-w-md mx-auto">
            <p className="text-sm font-semibold text-slate-600">
              {isBn ? 'কোনো শিক্ষকের তথ্য এখনো যোগ করা হয়নি।' : 'No instructors listed yet.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {instructors.map(inst => {
              const name = isBn ? (inst.nameBn || inst.name) : inst.name;
              const subject = isBn ? (inst.subjectBn || inst.subject) : inst.subject;
              const role = isBn ? (inst.roleBn || inst.role) : inst.role;
              const credentials = isBn ? (inst.credentialsBn || inst.credentials) : inst.credentials;
              const ytLink = inst.youtubeUrl || websiteSettings.youtubeChannel || '#';
              const fbLink = inst.facebookUrl || websiteSettings.facebookPage || '#';

              return (
                <article
                  key={inst.id}
                  className="rounded-2xl shadow-[0_14px_35px_-12px_rgba(15,23,42,0.12)] border border-slate-100/90 overflow-hidden flex flex-col items-center text-center pb-7 hover:-translate-y-1 hover:shadow-xl transition-all duration-200"
                  style={{ backgroundColor: cardBg }}
                >
                  {/* Top Solid Vibrant Blue Banner */}
                  <div className="w-full h-24 bg-[#007CC7]" />

                  {/* Centered Overlapping Circular Portrait */}
                  <div className="-mt-12 w-24 h-24 rounded-full border-4 border-white shadow-md overflow-hidden bg-[#0B2239] shrink-0">
                    <img
                      src={!isBrokenExternalUrl(inst.avatar) ? inst.avatar : instructorTanvirImg}
                      alt={name}
                      referrerPolicy="no-referrer"
                      onError={e => {
                        e.currentTarget.src = instructorTanvirImg;
                      }}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Name & Subject Pill */}
                  <div className="px-5 pt-3.5 flex-1 flex flex-col items-center">
                    <h3 className="font-heading text-base font-extrabold text-slate-900 tracking-tight">
                      {name}
                    </h3>

                    <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E6F4FE] text-[#007CC7] text-[11px] font-bold">
                      <BookOpen className="w-3 h-3 shrink-0" />
                      <span>{subject}</span>
                    </div>

                    {role && (
                      <p className="mt-3 text-[11px] text-slate-600 font-medium leading-relaxed">
                        {role}
                      </p>
                    )}

                    {credentials && (
                      <p className="mt-0.5 text-[11px] text-slate-400 leading-relaxed">
                        {credentials}
                      </p>
                    )}
                  </div>

                  {/* Bottom Circular YouTube & Facebook Buttons */}
                  <div className="mt-5 flex items-center justify-center gap-2.5">
                    <a
                      href={ytLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${name} YouTube`}
                      className="w-8 h-8 rounded-full bg-[#E11D48] hover:bg-[#BE123C] text-white flex items-center justify-center shadow-xs transition-colors"
                    >
                      <Youtube className="w-4 h-4" />
                    </a>
                    <a
                      href={fbLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${name} Facebook`}
                      className="w-8 h-8 rounded-full bg-[#1877F2] hover:bg-[#145DBB] text-white flex items-center justify-center shadow-xs transition-colors"
                    >
                      <Facebook className="w-4 h-4" />
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
};
