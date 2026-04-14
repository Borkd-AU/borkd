import { LayoutDashboard, MapPin } from 'lucide-react';
import Link from 'next/link';

export default function PinsPage() {
  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-1 flex items-center gap-2 text-sm text-stone">
        <LayoutDashboard className="h-4 w-4" />
        <Link href="/dashboard" className="hover:text-charcoal">
          Dashboard
        </Link>
        <span>/</span>
        <span className="text-charcoal">Pins</span>
      </div>

      <h1 className="mb-8 text-2xl font-bold text-charcoal">Pin Management</h1>

      {/* Placeholder */}
      <div className="rounded-xl border border-dashed border-stone-light p-16 text-center">
        <MapPin className="mx-auto h-12 w-12 text-stone-light" />
        <h2 className="mt-4 text-lg font-semibold text-charcoal">Coming soon</h2>
        <p className="mt-2 text-sm text-stone">
          Pin moderation, map view, flagged content review, and bulk actions will appear here.
        </p>
      </div>
    </div>
  );
}
