'use client';
import { PieChart, Pie, Cell, Tooltip as ReTooltip, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line } from 'recharts';
import { percentShares } from '@/lib/percent';
import { sumRevenue, isPending, trendWindows, deliveredRateChange, monthlyRevenue, topCustomersByRevenue, monthlySeries } from '@/lib/orderStats';
import { Box, Typography, Paper, Button, Avatar } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AddIcon from '@mui/icons-material/Add';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ReceiptIcon from '@mui/icons-material/Receipt';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import BarChartIcon from '@mui/icons-material/BarChart';
import { pctChange } from '@/lib/trend';
import { type Order, ORDER_STATUSES, statusText, isCompany, statusChip, formatDate } from '../model';
import type { Dispatch, SetStateAction } from 'react';

import type { TFn, TabKey, Customer } from '../model';
import type { Lang } from '../translations';
import { customerFullName } from '../../lib/customerName';

interface DashboardTabProps {
  t: TFn;
  lang: Lang;
  dateLocale: string;
  orders: Order[];
  customers: Customer[];
  isAdmin: boolean;
  now: number;
  gridC: string;
  totalRevenue: number;
  getCustomerName: (id: number) => string;
  openAdd: () => void;
  openAddOrder: () => void;
  setTab: Dispatch<SetStateAction<TabKey>>;
}

export function DashboardTab({ t, lang, dateLocale, orders, customers, isAdmin, now, gridC, totalRevenue, getCustomerName, openAdd, openAddOrder, setTab }: DashboardTabProps) {
              const delivered = orders.filter(o => o.status === 'DELIVERED').length;
              const pending = orders.filter(isPending).length;
              const cancelled = orders.filter(o => o.status === 'CANCELLED').length;
              const fulfillmentRate = orders.length > 0 ? ((delivered / orders.length) * 100).toFixed(1) : '0';
              // Real trend: compare last 30 days vs prior 30 days
              const { current: recentOrders30, previous: prevOrders30 } = trendWindows(orders, now);
              const recentRev = sumRevenue(recentOrders30);
              const prevRev = sumRevenue(prevOrders30);
              const revTrend = pctChange(recentRev, prevRev, recentOrders30.length, prevOrders30.length);
              const fulfillTrend = deliveredRateChange(recentOrders30, prevOrders30);
              const prevPending = prevOrders30.filter(isPending).length;
              const currPending = recentOrders30.filter(isPending).length;
              const pendTrend = pctChange(currPending, prevPending, recentOrders30.length, prevOrders30.length);
              // Top customers by revenue
              const topCustomers = topCustomersByRevenue(orders, 5).map(({ customerId, revenue }) => ({ customer: customers.find(c => c.id === customerId), rev: revenue })).filter(x => x.customer);
              // Recent orders
              const recentOrders = [...orders].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()).slice(0, 6);
              // Revenue chart (last 6 months/days)
              const revenueChartData = monthlyRevenue(orders, dateLocale).slice(-6);

              // Real monthly series (last 6 calendar months) for the KPI sparklines — no placeholder data
              const monthSeries = (pick: (os: typeof orders) => number) => monthlySeries(orders, now, pick);

              return (
                <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* KPI Cards */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,minmax(0,1fr))', md: 'repeat(4,1fr)' }, gap: 2, flexShrink: 0 }}>
                    {(() => {
                      const fmtTrend = (val: string | null, higherIsBetter = true) => {
                        if (val === null) return { label: t('trendNoData'), up: true, dir: true, none: true };
                        const n = parseFloat(val);
                        return { label: `${n >= 0 ? '+' : ''}${val}% ${t('vsLast30d')}`, up: higherIsBetter ? n >= 0 : n <= 0, dir: n >= 0, none: false };
                      };
                      const revT = fmtTrend(revTrend);
                      const fufT = fmtTrend(fulfillTrend);
                      const pndT = fmtTrend(pendTrend, false);
                      const adminCards = [
                        { label: t('totalRevenue'), value: totalRevenue.toLocaleString('en-US', { style: 'currency', currency: 'USD' }), sub: `${orders.length} ${t('ordersTotal')}`, icon: <AttachMoneyIcon />, color: '#2563eb', bg: 'var(--blue-bg)', border: 'var(--blue-bg)', trend: revT.label, up: revT.up, dir: revT.dir, none: revT.none, spark: monthSeries(os => os.reduce((a, o) => a + o.price * o.quantity, 0)) },
                        { label: t('totalCustomers2'), value: customers.length.toString(), sub: `${customers.filter(isCompany).length} ${t('companies')}`, icon: <PeopleIcon />, color: '#0ea5e9', bg: 'var(--sky-bg)', border: 'var(--sky-bd)', trend: t('allTime'), up: true, none: true },
                        { label: t('fulfillmentRate2'), value: `${fulfillmentRate}%`, sub: `${delivered} ${t('of')} ${orders.length} ${t('delivered')}`, icon: <TrendingUpIcon />, color: '#10b981', bg: 'var(--green-bg)', border: 'var(--green-bd)', trend: fufT.label, up: fufT.up, dir: fufT.dir, none: fufT.none, spark: monthSeries(os => os.length > 0 ? (os.filter(o => o.status === 'DELIVERED').length / os.length) * 100 : 0) },
                        { label: t('pendingOrders2'), value: pending.toString(), sub: `${cancelled} ${t('cancelledSub')}`, icon: <ShoppingCartIcon />, color: '#f59e0b', bg: 'var(--amber-bg)', border: 'var(--amber-bd)', trend: pndT.label, up: pndT.up, dir: pndT.dir, none: pndT.none, spark: monthSeries(os => os.filter(o => (o.status ?? 'PENDING') === 'PENDING').length) },
                      ];
                      const userCards = [
                        { label: t('totalOrdersLabel'), value: orders.length.toString(), sub: `${delivered} ${t('delivered')}`, icon: <ReceiptIcon />, color: '#2563eb', bg: 'var(--blue-bg)', border: 'var(--blue-bg)', trend: t('allTime'), up: true, spark: monthSeries(os => os.length) },
                        { label: t('totalCustomers2'), value: customers.length.toString(), sub: `${customers.filter(isCompany).length} ${t('companies')}`, icon: <PeopleIcon />, color: '#0ea5e9', bg: 'var(--sky-bg)', border: 'var(--sky-bd)', trend: t('allTime'), up: true, none: true },
                        { label: t('fulfillmentRate2'), value: `${fulfillmentRate}%`, sub: `${delivered} ${t('of')} ${orders.length} ${t('delivered')}`, icon: <TrendingUpIcon />, color: '#10b981', bg: 'var(--green-bg)', border: 'var(--green-bd)', trend: fufT.label, up: fufT.up, dir: fufT.dir, none: fufT.none, spark: monthSeries(os => os.length > 0 ? (os.filter(o => o.status === 'DELIVERED').length / os.length) * 100 : 0) },
                        { label: t('pendingOrders2'), value: pending.toString(), sub: `${cancelled} ${t('cancelledSub')}`, icon: <ShoppingCartIcon />, color: '#f59e0b', bg: 'var(--amber-bg)', border: 'var(--amber-bd)', trend: pndT.label, up: pndT.up, dir: pndT.dir, none: pndT.none, spark: monthSeries(os => os.filter(o => (o.status ?? 'PENDING') === 'PENDING').length) },
                      ];
                      return (isAdmin ? adminCards : userCards).map(card => (
                        <Paper key={card.label} elevation={0} sx={{
                          border: `1px solid ${card.border}`,
                          borderRadius: 3,
                          p: 2.5,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 1,
                          background: 'var(--surface)',
                          transition: 'all 0.2s ease',
                          '&:hover': { boxShadow: `0 8px 32px rgba(0,0,0,0.08)`, transform: 'translateY(-2px)', borderColor: card.color + '50' },
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                            <Box>
                              <Typography sx={{ fontSize: '0.67rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase', mb: 0.3 }}>{card.label}</Typography>
                              <Typography sx={{ fontWeight: 800, fontSize: '1.55rem', color: 'var(--text)', lineHeight: 1.1, letterSpacing: '-0.03em' }}>{card.value}</Typography>
                            </Box>
                            <Box sx={{ width: 40, height: 40, borderRadius: 2.5, bgcolor: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: card.color, flexShrink: 0 }}>{card.icon}</Box>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                            <Typography sx={{ fontSize: '0.7rem', color: '#94a3b8' }}>{card.sub}</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, whiteSpace: 'nowrap', maxWidth: '100%', px: 0.8, py: 0.2, borderRadius: 5, bgcolor: ('none' in card && card.none) ? 'rgba(148,163,184,0.10)' : card.up ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)' }}>
                              <Typography sx={{ fontSize: '0.67rem', fontWeight: 700, color: ('none' in card && card.none) ? '#94a3b8' : card.up ? '#10b981' : '#ef4444' }}>{('none' in card && card.none) ? '' : (('dir' in card ? card.dir : card.up) ? '↑ ' : '↓ ')}{card.trend}</Typography>
                            </Box>
                          </Box>
                          {card.spark && card.spark.some(v => v > 0) && (
                          <Box sx={{ mx: -0.5, mt: 0.5 }}>
                            <ResponsiveContainer width="100%" height={36}>
                              <LineChart data={card.spark.map((v, i) => ({ i, v }))}>
                                <Line type="monotone" dataKey="v" stroke={card.color} strokeWidth={1.8} dot={false} isAnimationActive={false} />
                              </LineChart>
                            </ResponsiveContainer>
                          </Box>
                          )}
                        </Paper>
                      ));
                    })()}
                  </Box>

                  {/* Quick Actions */}
                  <Box sx={{ display: 'flex', gap: 1.5, flexShrink: 0, flexWrap: 'wrap' }}>
                    {isAdmin && (
                      <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd} disableElevation size="small"
                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, fontSize: '0.82rem', background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', '&:hover': { background: 'linear-gradient(135deg,#1d4ed8,#1e40af)' } }}>
                        {t('newCustomer')}
                      </Button>
                    )}
                    {isAdmin && (
                      <Button variant="contained" startIcon={<AddIcon />} onClick={openAddOrder} disableElevation size="small"
                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, fontSize: '0.82rem', bgcolor: '#0ea5e9', '&:hover': { bgcolor: '#0284c7' } }}>
                        {t('newOrder')}
                      </Button>
                    )}
                    <Button variant="outlined" startIcon={<BarChartIcon />} onClick={() => setTab('analytics')} size="small"
                      sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, fontSize: '0.82rem', borderColor: 'var(--border)', color: '#64748b', '&:hover': { borderColor: '#2563eb', color: '#2563eb', bgcolor: 'var(--blue-bg)' } }}>
                      {t('analytics')}
                    </Button>
                    <Button variant="outlined" startIcon={<SmartToyIcon />} onClick={() => setTab('ai')} size="small"
                      sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, fontSize: '0.82rem', borderColor: 'var(--border)', color: '#64748b', '&:hover': { borderColor: '#2563eb', color: '#2563eb', bgcolor: 'var(--blue-bg)' } }}>
                      {t('aiAgent')}
                    </Button>
                  </Box>

                  {/* Revenue Chart + Top Customers */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0,1fr)', md: isAdmin ? '3fr 2fr' : '1fr' }, gap: 2 }}>
                    {isAdmin && (
                      <Paper elevation={0} sx={{ border: '1px solid var(--border)', borderRadius: 3, p: 2.5 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)', mb: 0.5 }}>{t('revenueTrend')}</Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', mb: 2 }}>{t('monthlyRevenueOverview')}</Typography>
                        {revenueChartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={revenueChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                              <defs>
                                <linearGradient id="dashGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke={gridC} />
                              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(1)}k`} />
                              <ReTooltip formatter={(v) => [Number(v).toLocaleString('en-US', { style: 'currency', currency: 'USD' }), t('revenue')]} contentStyle={{ borderRadius: 8, border: '1px solid var(--surface-2)', fontSize: 12 }} />
                              <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2.5} dot={{ fill: '#2563eb', r: 4 }} activeDot={{ r: 6 }} animationDuration={600} />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>{t('noOrderDataYet')}</Typography>
                          </Box>
                        )}
                      </Paper>
                    )}

                    {/* Top Customers */}
                    <Paper elevation={0} sx={{ border: '1px solid var(--border)', borderRadius: 3, p: 2.5 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)', mb: 2 }}>{t('topCustomers')}</Typography>
                      {topCustomers.length === 0 ? (
                        <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', py: 4 }}>{t('noDataYet')}</Typography>
                      ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                          {topCustomers.map(({ customer: c, rev }, i) => (
                            <Box key={c!.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Box sx={{ width: 22, height: 22, borderRadius: '50%', bgcolor: ['#2563eb','#10b981','#f59e0b','#0ea5e9','#ef4444'][i], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, color: 'white' }}>{i+1}</Typography>
                              </Box>
                              <Avatar sx={{ width: 28, height: 28, bgcolor: 'var(--blue-bg)', color: 'var(--blue-tx)', fontSize: '0.7rem', fontWeight: 700 }}>{(c!.firstName ?? '?')[0]}</Avatar>
                              <Box sx={{ flex: 1, overflow: 'hidden' }}>
                                <Typography sx={{ fontWeight: 600, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{customerFullName(c!)}</Typography>
                                <Typography sx={{ fontSize: '0.68rem', color: '#94a3b8' }}>{(() => { const n = orders.filter(o => o.customerId === c!.id).length; return `${n} ${n === 1 ? t('orderSingular') : t('orders')}`; })()}</Typography>
                              </Box>
                              {isAdmin && (
                                <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#10b981', flexShrink: 0 }}>
                                  {rev.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                                </Typography>
                              )}
                            </Box>
                          ))}
                        </Box>
                      )}
                    </Paper>
                  </Box>

                  {/* Recent Orders + Order Status */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0,1fr)', md: '2fr 1fr' }, gap: 2 }}>
                    <Paper elevation={0} sx={{ border: '1px solid var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                      <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>{t('recentOrders')}</Typography>
                        <Button size="small" onClick={() => setTab('orders')} sx={{ textTransform: 'none', fontSize: '0.78rem', color: '#2563eb', fontWeight: 600, p: 0 }}>{t('viewAll')} →</Button>
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        {recentOrders.length === 0 ? (
                          <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', py: 4 }}>{t('noOrders')}</Typography>
                        ) : recentOrders.map((o, i) => (
                          <Box key={o.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2.5, py: 1.5, borderBottom: i < recentOrders.length - 1 ? '1px solid var(--surface-2)' : 'none', '&:hover': { bgcolor: 'var(--surface-2)' }, transition: 'background 0.15s' }}>
                            <Avatar sx={{ width: 32, height: 32, bgcolor: 'var(--blue-bg)', color: 'var(--blue-tx)', fontSize: '0.72rem', fontWeight: 700, flexShrink: 0 }}>
                              {getCustomerName(o.customerId)[0]}
                            </Avatar>
                            <Box sx={{ flex: 1, overflow: 'hidden' }}>
                              <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.productName}</Typography>
                              <Typography sx={{ fontSize: '0.72rem', color: '#94a3b8' }}>{getCustomerName(o.customerId)} · {formatDate(o.date, lang)}</Typography>
                            </Box>
                            <Box sx={{ width: 124, display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                              {isAdmin && (
                                <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--green-tx)', fontVariantNumeric: 'tabular-nums' }}>{(o.price * o.quantity).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</Typography>
                              )}
                              <Box sx={{ mt: 0.3 }}>{statusChip(o.status, t)}</Box>
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    </Paper>

                    {/* Order Status Summary */}
                    <Paper elevation={0} sx={{ border: '1px solid var(--border)', borderRadius: 3, p: 2.5 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)', mb: 2 }}>{t('orderStatus')}</Typography>
                      {(() => {
                        const PIE_COLORS = ['#f59e0b','#64748b','#2563eb','#10b981','#ef4444'];
                        const allPie = ORDER_STATUSES.map((s, i) => ({ name: statusText(s, t), value: orders.filter(o => (o.status ?? 'PENDING') === s).length || 0.001, realCount: orders.filter(o => (o.status ?? 'PENDING') === s).length, color: PIE_COLORS[i] }));
                        return (
                          <>
                            <ResponsiveContainer width="100%" height={200}>
                              <PieChart>
                                <Pie data={allPie} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2} dataKey="value" animationDuration={600}>
                                  {allPie.map((entry, i) => <Cell key={i} fill={entry.color} stroke="none" opacity={entry.realCount === 0 ? 0.2 : 1} />)}
                                </Pie>
                                <ReTooltip formatter={(_v, name, item) => [(item?.payload as { realCount?: number } | undefined)?.realCount, name]} contentStyle={{ borderRadius: 8, border: '1px solid var(--surface-2)', fontSize: 12 }} />
                              </PieChart>
                            </ResponsiveContainer>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8, mt: 1 }}>
                              {(() => {
                                const counts = ORDER_STATUSES.map(s => orders.filter(o => (o.status ?? 'PENDING') === s).length);
                                const shares = percentShares(counts);
                                return ORDER_STATUSES.map((s, i) => {
                                const count = counts[i];
                                return (
                                  <Box key={s} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: PIE_COLORS[i] }} />
                                      <Typography sx={{ fontSize: '0.78rem', color: '#64748b' }}>{statusText(s, t)}</Typography>
                                    </Box>
                                    <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text)' }}>
                                      {count} ({shares[i]}%)
                                    </Typography>
                                  </Box>
                                );
                                });
                              })()}
                            </Box>
                          </>
                        );
                      })()}
                    </Paper>
                  </Box>
                </Box>
              );
}
