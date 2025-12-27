'use client';

import Home from '@/components/home/Home';

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function HomePage() {
  return <Home />;
}
