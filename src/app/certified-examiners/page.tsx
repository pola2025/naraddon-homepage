'use client';

import Link from 'next/link';

import '@/styles/cta-shared.css';
import './page.css';

export default function CertifiedExaminersPage() {
  return (
    <div className="certified-examiners">
      <section className="expert-hero layout-hero relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-sky-100">
        <div className="layout-container">
          <div className="max-w-3xl">
            <span className="inline-flex items-center rounded-full bg-blue-100 px-4 py-1 text-sm font-semibold text-blue-600">Certified Examiners</span>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
              With Certified Examiners
              <span className="block text-blue-600">Customized Policy Fund Strategy</span>
            </h1>
            <p className="mt-6 text-lg leading-7 text-slate-600">
              Certified policy experts guaranteed 100% by Naraddon
              <span className="block sm:inline">Complete your customized solution.</span>
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-6">
              <Link
                href="/consultation-request#form-section"
                className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-base font-semibold text-white shadow-lg transition hover:bg-emerald-600"
              >
                <i className="fas fa-headset" aria-hidden="true" /> Request Consultation
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="certified-examiners__cta-section">
        <div className="certified-examiners__section-container">
          <div className="certified-examiners__cta">
            <div className="certified-examiners__cta-banner">
              <div className="certified-examiners__cta-content">
                <p className="certified-examiners__cta-eyebrow">Ready for Consultation</p>
                <h3 className="certified-examiners__cta-title">NARADDON 100% Certified Examiners<br />Propose Customized Strategies for Business Growth.</h3>
                <p className="certified-examiners__cta-subtitle">When you apply for consultation, certified examiners will contact you within 24 hours.<br />You can consult with confidence with 100% guarantee from NARADDON.</p>
              </div>
              <Link href="/consultation-request#form-section" className="certified-examiners__cta-button">
                Apply for Consulting
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}