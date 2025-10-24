import { ReactNode } from 'react';
import Script from 'next/script';

export default function ExaminerBrandLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Script
        id="dark-bg-flash-fix"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            document.documentElement.style.background = '#1a1a1a';
            document.body.style.background = '#1a1a1a';
          `
        }}
      />
      {children}
    </>
  );
}
