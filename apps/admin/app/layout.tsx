import { Sidebar } from '@/components/sidebar';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Borkd Admin',
  description: 'Admin dashboard for Borkd',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-cream text-charcoal antialiased">
        <Sidebar />
        <main className="min-h-screen md:ml-64">
          <div className="mx-auto max-w-7xl px-4 py-8 pt-16 md:pt-8">{children}</div>
        </main>
      </body>
    </html>
  );
}
