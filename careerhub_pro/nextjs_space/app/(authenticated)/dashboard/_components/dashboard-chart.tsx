'use client';

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

const COLORS = ['#60B5FF', '#FF9149', '#A19AD3', '#80D8C3', '#FF6363'];
const STATUS_LABELS: Record<string, string> = {
  wishlist: 'Wishlist',
  applied: 'Applied',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
};

export function DashboardChart({ statusCounts }: { statusCounts: Record<string, number> }) {
  const data = ['wishlist', 'applied', 'interview', 'offer', 'rejected'].map((s: string, i: number) => ({
    name: STATUS_LABELS[s] ?? s,
    count: statusCounts?.[s] ?? 0,
    fill: COLORS[i % COLORS.length],
  }));

  const hasData = data.some((d: any) => (d?.count ?? 0) > 0);

  if (!hasData) {
    return (
      <div className="flex h-[250px] items-center justify-center text-muted-foreground text-sm">
        No application data yet. Add your first job to see the pipeline.
      </div>
    );
  }

  return (
    <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
          <XAxis
            dataKey="name"
            tickLine={false}
            tick={{ fontSize: 10 }}
            label={{ value: 'Status', position: 'insideBottom', offset: -15, style: { textAnchor: 'middle', fontSize: 11 } }}
          />
          <YAxis
            tickLine={false}
            tick={{ fontSize: 10 }}
            allowDecimals={false}
          />
          <Tooltip contentStyle={{ fontSize: 11 }} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((entry: any, idx: number) => (
              <Cell key={idx} fill={entry?.fill ?? COLORS[0]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
