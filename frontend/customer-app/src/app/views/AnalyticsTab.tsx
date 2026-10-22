'use client';
import { PieChart, Pie, Cell, Tooltip as ReTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line } from 'recharts';
import { percentShares } from '@/lib/percent';
import { sumRevenue, isPending, trendWindows, monthlySeries } from '@/lib/orderStats';
import { Box, Typography, Paper, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { pctChange } from '@/lib/trend';
import { type Customer, type Order, ORDER_STATUSES, statusText, isCompany } from '../model';
import type { Dispatch, SetStateAction } from 'react';

import type { TFn } from '../model';
import type { countByStatus } from '@/lib/orderStats';

interface AnalyticsTabProps {
  t: TFn;
  orders: Order[];
  customers: Customer[];
  isAdmin: boolean;
  now: number;
  chartData: [string, number][];
  chartMode: 'daily' | 'monthly';
  setChartMode: Dispatch<SetStateAction<'daily' | 'monthly'>>;
  gridC: string;
  tick2C: string;
  statusCounts: ReturnType<typeof countByStatus>;
  totalRevenue: number;
}

export function AnalyticsTab({ t, orders, customers, isAdmin, now, chartData, chartMode, setChartMode, gridC, tick2C, statusCounts, totalRevenue }: AnalyticsTabProps) {
  return (
              <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>

                {/* Stat Cards with sparklines */}
                {(() => {
                  // Real trend: last 30 days vs prior 30 days
                  const { current: aNow, previous: aPrev } = trendWindows(orders, now);
                  const aNowRev = sumRevenue(aNow);
                  const aPrevRev = sumRevenue(aPrev);
                  const calcTrend = (curr: number, prev: number) => pctChange(curr, prev, aNow.length, aPrev.length);
                  const revTrendA = calcTrend(aNowRev, aPrevRev);
                  const orderTrendA = calcTrend(aNow.length, aPrev.length);
                  const aNowAvg = aNow.length > 0 ? aNowRev / aNow.length : 0;
                  const aPrevAvg = aPrev.length > 0 ? aPrevRev / aPrev.length : 0;
                  const avgTrendA = calcTrend(aNowAvg, aPrevAvg);
                  const pendTrendA = calcTrend(aNow.filter(isPending).length, aPrev.filter(isPending).length);
                  const seriesOf = (fn: (os: Order[]) => number) => monthlySeries(orders, now, fn).map((v, i) => ({ i, v }));
                  // delta: direction of the change; goodUp: whether an increase is good news (pending orders: no).
                  const fmtA = (v: string | null, goodUp: boolean) => {
                    if (v === null) return { text: t('trendNoData'), delta: null as number | null, good: true };
                    const n = parseFloat(v);
                    return { text: `${n >= 0 ? '+' : ''}${v}% ${t('vsLast30d')}`, delta: n, good: n === 0 ? true : (n > 0) === goodUp };
                  };
                  const revF = fmtA(revTrendA, true), ordF = fmtA(orderTrendA, true), avgF = fmtA(avgTrendA, true), pndF = fmtA(pendTrendA, false);
                  const allAnalyticsCards = [
                    { label: t('totalRevenue'), value: totalRevenue.toLocaleString('en-US', { style: 'currency', currency: 'USD' }), f: revF, sparkColor: '#2563eb', spark: seriesOf(sumRevenue), adminOnly: true },
                    { label: t('totalOrders'), value: orders.length.toString(), f: ordF, sparkColor: '#10b981', spark: seriesOf(os => os.length), adminOnly: false },
                    { label: t('avgOrderValue'), value: (orders.length > 0 ? totalRevenue / orders.length : 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' }), f: avgF, sparkColor: '#f59e0b', spark: seriesOf(os => os.length ? sumRevenue(os) / os.length : 0), adminOnly: true },
                    { label: t('pendingOrders'), value: orders.filter(isPending).length.toString(), f: pndF, sparkColor: '#ef4444', spark: seriesOf(os => os.filter(isPending).length), adminOnly: false },
                  ];
                  const analyticsCards = allAnalyticsCards.filter(c => isAdmin || !c.adminOnly);
                  return (
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,minmax(0,1fr))', md: 'repeat(4,1fr)' }, gap: 2, flexShrink: 0 }}>
                      {analyticsCards.map((card) => (
                        <Paper key={card.label} elevation={0} sx={{ border: '1px solid var(--border)', borderRadius: 3, p: 2.5, overflow: 'hidden' }}>
                          <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', mb: 0.5 }}>{card.label}</Typography>
                          <Typography sx={{ fontWeight: 800, fontSize: '1.3rem', color: 'var(--text)', mb: 0.5 }}>{card.value}</Typography>
                          <Typography sx={{ fontSize: '0.72rem', color: card.f.delta === null ? '#94a3b8' : card.f.good ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                            {card.f.delta === null ? '' : card.f.delta >= 0 ? '↑ ' : '↓ '}{card.f.text}
                          </Typography>
                          <Box sx={{ mt: 1, mx: -0.5 }}>
                            <ResponsiveContainer width="100%" height={40}>
                              <LineChart data={card.spark}>
                                <Line type="monotone" dataKey="v" stroke={card.sparkColor} strokeWidth={2} dot={false} isAnimationActive={false} />
                              </LineChart>
                            </ResponsiveContainer>
                          </Box>
                        </Paper>
                      ))}
                    </Box>
                  );
                })()}

                {/* Revenue Line Chart + Order Status Pie */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0,1fr)', md: isAdmin ? '3fr 2fr' : '1fr' }, gap: 2 }}>
                  {isAdmin && <Paper elevation={0} sx={{ border: '1px solid var(--border)', borderRadius: 3, p: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>{t('revenueOverview')}</Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>{t('totalRevenue')}</Typography>
                        <Typography sx={{ fontWeight: 800, fontSize: '1.4rem', color: 'var(--text)', mt: 0.5 }}>{totalRevenue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</Typography>
                      </Box>
                      <ToggleButtonGroup value={chartMode} exclusive onChange={(_, v) => v && setChartMode(v)} size="small">
                        <ToggleButton value="daily" sx={{ fontSize: '0.72rem', px: 1.5, py: 0.4, textTransform: 'none' }}>{t('daily')}</ToggleButton>
                        <ToggleButton value="monthly" sx={{ fontSize: '0.72rem', px: 1.5, py: 0.4, textTransform: 'none' }}>{t('monthly')}</ToggleButton>
                      </ToggleButtonGroup>
                    </Box>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={chartData.map(([label, value]) => ({ label, value }))} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <defs>
                          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridC} />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(1)}k`} />
                        <ReTooltip formatter={(v) => [Number(v).toLocaleString('en-US', { style: 'currency', currency: 'USD' }), t('revenue')]} contentStyle={{ borderRadius: 8, border: '1px solid var(--surface-2)', fontSize: 12 }} />
                        <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2.5} dot={{ fill: '#2563eb', r: 4 }} activeDot={{ r: 6 }} animationDuration={600} />
                      </LineChart>
                    </ResponsiveContainer>
                  </Paper>}

                  {/* Order Status Donut */}
                  <Paper elevation={0} sx={{ border: '1px solid var(--border)', borderRadius: 3, p: 2.5 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)', mb: 2 }}>{t('orderStatusDistribution')}</Typography>
                    {(() => {
                      const PIE_COLORS = ['#f59e0b', '#64748b', '#2563eb', '#10b981', '#ef4444'];
                      const statusLabel = (s: string) => statusText(s, t);
                      const allPie = statusCounts.map((s) => ({ name: statusLabel(s.status), value: s.count || 0.001, realCount: s.count, color: PIE_COLORS[ORDER_STATUSES.indexOf(s.status)] }));
                      return (
                        <>
                          <ResponsiveContainer width="100%" height={160}>
                            <PieChart>
                              <Pie data={allPie} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={2} dataKey="value" animationDuration={600}>
                                {allPie.map((entry, i) => <Cell key={i} fill={entry.color} stroke="none" opacity={entry.realCount === 0 ? 0.25 : 1} />)}
                              </Pie>
                              <ReTooltip formatter={(_v, name, item) => [(item?.payload as { realCount?: number } | undefined)?.realCount, name]} contentStyle={{ borderRadius: 8, border: '1px solid var(--surface-2)', fontSize: 12 }} />
                            </PieChart>
                          </ResponsiveContainer>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8, mt: 1 }}>
                            {(() => { const shares = percentShares(statusCounts.map(x => x.count)); return statusCounts.map((s, i) => (
                              <Box key={s.status} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: PIE_COLORS[i] }} />
                                  <Typography sx={{ fontSize: '0.78rem', color: '#64748b' }}>{statusText(s.status, t)}</Typography>
                                </Box>
                                <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text)' }}>
                                  {s.count} ({shares[i]}%)
                                </Typography>
                              </Box>
                            )); })()}
                          </Box>
                        </>
                      );
                    })()}
                  </Paper>
                </Box>

                {/* Customer Types Pie + Top Products */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0,1fr)', md: isAdmin ? '1fr 2fr' : '1fr' }, gap: 2 }}>
                  <Paper elevation={0} sx={{ border: '1px solid var(--border)', borderRadius: 3, p: 2.5 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)', mb: 2 }}>{t('customerTypes')}</Typography>
                    {(() => {
                      const individual = customers.filter(c => !isCompany(c)).length;
                      const company = customers.filter(isCompany).length;
                      const pieData = [
                        { name: t('individual'), value: individual || 0.001, realCount: individual, pct: customers.length > 0 ? Math.round((individual / customers.length) * 100) : 0, color: '#2563eb' },
                        { name: t('company'), value: company || 0.001, realCount: company, pct: customers.length > 0 ? Math.round((company / customers.length) * 100) : 0, color: '#10b981' },
                      ];
                      return (
                        <>
                          <ResponsiveContainer width="100%" height={160}>
                            <PieChart>
                              <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={3} dataKey="value" animationDuration={600}>
                                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} stroke="none" />)}
                              </Pie>
                              <ReTooltip formatter={(_v, name, item) => [(item?.payload as { realCount?: number } | undefined)?.realCount, name]} contentStyle={{ borderRadius: 8, border: '1px solid var(--surface-2)', fontSize: 12 }} />
                            </PieChart>
                          </ResponsiveContainer>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                            {pieData.map(d => (
                              <Box key={d.name} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: d.color }} />
                                  <Typography sx={{ fontSize: '0.78rem', color: '#64748b' }}>{d.name} ({d.realCount})</Typography>
                                </Box>
                                <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)' }}>{d.pct}%</Typography>
                              </Box>
                            ))}
                          </Box>
                        </>
                      );
                    })()}
                  </Paper>

                  {isAdmin && <Paper elevation={0} sx={{ border: '1px solid var(--border)', borderRadius: 3, p: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)', flex: 1 }}>{t('topProductsByRevenue')}</Typography>
                    </Box>
                    {(() => {
                      const productMap: Record<string, number> = {};
                      orders.forEach(o => { productMap[o.productName] = (productMap[o.productName] ?? 0) + o.price * o.quantity; });
                      const top = Object.entries(productMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => ({ name: name.length > 26 ? name.slice(0, 26) + '…' : name, value }));
                      if (top.length === 0) return <Typography variant="body2" color="text.secondary">{t('noOrders')}</Typography>;
                      const PROD_COLORS = ['#2563eb','#0ea5e9','#10b981','#f59e0b','#ef4444'];
                      return (
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={top} layout="vertical" margin={{ top: 0, right: 50, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={gridC} horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(1)}k`} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: tick2C }} axisLine={false} tickLine={false} width={170} />
                            <ReTooltip formatter={(v) => [Number(v).toLocaleString('en-US', { style: 'currency', currency: 'USD' }), t('revenue')]} contentStyle={{ borderRadius: 8, border: '1px solid var(--surface-2)', fontSize: 12 }} />
                            <Bar dataKey="value" animationDuration={600} radius={[0, 4, 4, 0]} label={{ position: 'right', formatter: (v: unknown) => `$${(Number(v)/1000).toFixed(1)}k`, fontSize: 11, fill: '#64748b' }}>
                              {top.map((_, i) => <Cell key={i} fill={PROD_COLORS[i % PROD_COLORS.length]} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      );
                    })()}
                  </Paper>}
                </Box>
              </Box>
  );
}
