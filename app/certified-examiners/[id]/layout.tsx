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
            document.body.style.margin = '0';
            document.body.style.padding = '0';
          `
        }}
      />
      <div style={{ background: '#1a1a1a', minHeight: '100vh', width: '100%', margin: 0, padding: 0 }}>
        {children}
      </div>
    </>
  );
}
