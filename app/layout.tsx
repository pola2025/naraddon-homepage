import '../sentry.client.config';

import type { Metadata } from 'next';
import './globals.css';
import '@/App.css';
import '@/styles/components.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  title: '?˜ë¼??NARADDON) - ?•ë??•ì±…?ê¸ˆ ?„ë¬¸ ì»¨ì„¤??| ì¤‘ì†Œê¸°ì—… ì§€?ê¸ˆ ?Œë«??,
  description:
    '?˜ë¼?”ì? ?¸ì¦ ê¸°ì—…?¬ì‚¬ê´€ê³??¨ê»˜ ?•ì±…?ê¸ˆ, R&Dì§€?ê¸ˆ, ?˜ì¶œë°”ìš°ì²????•ë?ì§€?ì‚¬?…ì„ ?°ê²°?˜ëŠ” ?€?œë?êµ?1???Œë«?¼ì…?ˆë‹¤. ?°ê°„ 450ë§Œì› ?ˆì•½, 100% ì±…ì„ë³´ì¦?œë„',
  keywords:
    '?•ì±…?ê¸ˆ, ?•ë?ì§€?ê¸ˆ, ì¤‘ì†Œê¸°ì—…ì§€?? R&D?ê¸ˆ, ?˜ì¶œë°”ìš°ì²? ì°½ì—…ì§€?ê¸ˆ, ?˜ë¼?? NARADDON, ê¸°ì—…?¬ì‚¬ê´€, ?•ë?ë³´ì¡°ê¸? ?¬ì—…?ë?ì¶?,
  authors: [{ name: '?˜ë¼?? }],
  creator: '?˜ë¼??,
  publisher: '?˜ë¼??,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://naraddon.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: '?˜ë¼??NARADDON) - ?•ë??•ì±…?ê¸ˆ ?„ë¬¸ ì»¨ì„¤??,
    description: '?¸ì¦ ê¸°ì—…?¬ì‚¬ê´€ê³??¨ê»˜?˜ëŠ” ?•ì±…?ê¸ˆ ?±ê³µ ?ŒíŠ¸?? ?°ê°„ 450ë§Œì› ?ˆì•½!',
    url: 'https://naraddon.com',
    siteName: '?˜ë¼??,
    locale: 'ko_KR',
    type: 'website',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: '?˜ë¼??- ?•ì±…?ê¸ˆ ?„ë¬¸ ?Œë«??,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '?˜ë¼??NARADDON) - ?•ë??•ì±…?ê¸ˆ ?„ë¬¸ ì»¨ì„¤??,
    description: '?¸ì¦ ê¸°ì—…?¬ì‚¬ê´€ê³??¨ê»˜?˜ëŠ” ?•ì±…?ê¸ˆ ?±ê³µ ?ŒíŠ¸??,
    images: ['/twitter-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  // Next.js App Routerê°€ ?ë™?¼ë¡œ icon.png?€ apple-icon.pngë¥?ì°¾ìŠµ?ˆë‹¤
  // icons ?¤ì •???œê±°?˜ì—¬ ?ë™ ê°ì? ?¬ìš©
  verification: {
    google: 'google-site-verification-code',
    naver: 'naver-site-verification-code',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        {/* ?Œë¹„ì½?*/}
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* SEO ìµœì ??ë©”í? ?œê·¸ */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta charSet="utf-8" />

        {/* CSRF ? í° ë©”í? ?œê·¸ (ë³´ì•ˆ ê°•í™”) */}
        <meta name="csrf-token" content="" />

        {/* ì¶”ê? SEO ë©”í? ?œê·¸ */}
        <meta name="theme-color" content="#4CAF50" />
        <meta name="msapplication-TileColor" content="#4CAF50" />
        <meta name="format-detection" content="telephone=no" />

        {/* êµ¬ì¡°?”ëœ ?°ì´??(JSON-LD) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: '?˜ë¼??,
              alternateName: 'NARADDON',
              url: 'https://naraddon.com',
              logo: 'https://naraddon.com/logo.png',
              description: '?•ë??•ì±…?ê¸ˆ ?„ë¬¸ ì»¨ì„¤???Œë«??,
              address: {
                '@type': 'PostalAddress',
                addressCountry: 'KR',
                addressLocality: '?œìš¸?¹ë³„??,
              },
              contactPoint: {
                '@type': 'ContactPoint',
                telephone: '+82-1588-0000',
                contactType: 'customer service',
                availableLanguage: ['Korean'],
              },
              sameAs: [
                'https://www.youtube.com/@naraddon',
                'https://www.instagram.com/naraddon',
                'https://blog.naver.com/naraddon',
              ],
            }),
          }}
        />

        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>
          <div className="App">
            <Header />
            <main>{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
