import { LayoutDashboard, MapPin, TrendingUp, Users } from 'lucide-react';

const stats = [
  { label: 'Total Users', value: '—', icon: Users, color: 'bg-sage/20 text-sage-dark' },
  { label: 'Total Pins', value: '—', icon: MapPin, color: 'bg-terracotta/20 text-terracotta-dark' },
  { label: 'Active Today', value: '—', icon: TrendingUp, color: 'bg-stone/20 text-stone-dark' },
];

export default function DashboardPage() {
  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-1 flex items-center gap-2 text-sm text-stone">
        <LayoutDashboard className="h-4 w-4" />
        <span>Dashboard</span>
      </div>

      <h1 className="mb-8 text-2xl font-bold text-charcoal">Dashboard Overview</h1>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-stone-light/30 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className={`rounded-lg p-3 ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-stone">{stat.label}</p>
                <p className="text-2xl font-bold text-charcoal">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Placeholder content */}
      <div className="mt-10 rounded-xl border border-dashed border-stone-light p-12 text-center">
        <LayoutDashboard className="mx-auto h-12 w-12 text-stone-light" />
        <h2 className="mt-4 text-lg font-semibold text-charcoal">Dashboard widgets coming soon</h2>
        <p className="mt-2 text-sm text-stone">
          Charts, recent activity, and real-time metrics will appear here.
        </p>
      </div>
    </div>
  );
}
