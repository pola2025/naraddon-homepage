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

            // main 요소 찾아서 배경색 설정
            setTimeout(() => {
              const main = document.querySelector('main');
              if (main) {
                main.style.background = '#1a1a1a';
                main.style.margin = '0';
                main.style.padding = '0';
              }
            }, 0);
          `
        }}
      />
      <div style={{ background: '#1a1a1a', minHeight: '100vh', width: '100%', margin: 0, padding: 0, position: 'relative' }}>
        {children}
      </div>
    </>
  );
}
