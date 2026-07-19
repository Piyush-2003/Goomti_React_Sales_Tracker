import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, AreaChart, Area
} from 'recharts';

const BLUE = '#2563eb';
const GREEN = '#059669';
const AMBER = '#d97706';
const RED = '#dc2626';
const NAVY = '#1F3864';

// ── KPI Card ──
function KPICard({ label, value, sub, color, trend }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e6f0', borderRadius: 12, padding: '18px 20px', flex: 1, minWidth: 150 }}>
      <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: color || NAVY }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{sub}</div>}
      {trend && (
        <div style={{ fontSize: 11, color: trend > 0 ? GREEN : RED, marginTop: 4 }}>
          {trend > 0 ? '▲' : '▼'} {Math.abs(trend)}% vs prev week
        </div>
      )}
    </div>
  );
}

// ── Main App ──
export default function App() {
  const [salesData, setSalesData] = useState([]);
  const [hourlyData, setHourlyData] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCSV = (file) =>
      new Promise((resolve) => {
        Papa.parse(`/${file}`, {
          download: true,
          header: true,
          dynamicTyping: true,
          complete: (result) => resolve(result.data)        });
      });

    Promise.all([
      loadCSV('fact_sales_overview.csv'),
      loadCSV('fact_hourly_sales.csv'),
    ]).then(([sales, hourly]) => {
      // Add week number to each row
      const withWeek = sales
        .filter(r => r.Date && r.Net_Sales > 0)
        .map(r => ({
          ...r,
          Date: new Date(r.Date),
          Week: `Week ${Math.ceil(new Date(r.Date).getDate() / 7)}`
        }))
        .sort((a, b) => a.Date - b.Date)
        .map(r => ({
          ...r,
          DateStr: r.Date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
        }));

      setSalesData(withWeek);
      console.log('hourly raw:', hourly[0]);
      setHourlyData(hourly.filter(r => r.Hour > 0));      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Arial' }}>
      <p style={{ color: '#6b7280' }}>Loading sales data...</p>
    </div>
  );

  // ── Filter by week ──
  const filtered = selectedWeek === 'All'
    ? salesData
    : salesData.filter(r => r.Week === selectedWeek);

  const weeks = ['All', ...new Set(salesData.map(r => r.Week))];

  // ── KPI calculations ──
  const totalSales = filtered.reduce((s, r) => s + (r.Net_Sales || 0), 0);
  const totalOrders = filtered.reduce((s, r) => s + (r.Orders || 0), 0);
  const aov = totalOrders > 0 ? totalSales / totalOrders : 0;
  const avgDaily = filtered.length > 0 ? totalSales / filtered.length : 0;
  const peakDay = filtered.reduce((max, r) => r.Net_Sales > (max.Net_Sales || 0) ? r : max, {});
  const weekendSales = filtered.filter(r => ['Friday', 'Saturday', 'Sunday'].includes(r.Day_of_Week)).reduce((s, r) => s + r.Net_Sales, 0);
  const weekdaySales = totalSales - weekendSales;

  // ── DoW aggregation ──
  const dowOrder = ['Monday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dowData = dowOrder.map(day => ({
    day: day.slice(0, 3),
    sales: filtered.filter(r => r.Day_of_Week === day).reduce((s, r) => s + r.Net_Sales, 0),
    orders: filtered.filter(r => r.Day_of_Week === day).reduce((s, r) => s + r.Orders, 0),
  }));

  // ── Rolling 7-day average ──
  const withRolling = salesData.map((row, i) => {
    const window = salesData.slice(Math.max(0, i - 6), i + 1);
    const avg = window.reduce((s, r) => s + r.Net_Sales, 0) / window.length;
    return { ...row, rolling7: Math.round(avg) };
  });

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', background: '#f4f6fb', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e6f0', padding: '0 28px', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #c9a96e, #a07840)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>G</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Goomti Sales Tracker</div>
            <div style={{ fontSize: 10, color: '#6b7280' }}>Daily Performance Monitor</div>
          </div>
        </div>
        {/* Week filter */}
        <div style={{ display: 'flex', gap: 8 }}>
          {weeks.map(w => (
            <button key={w} onClick={() => setSelectedWeek(w)} style={{
              padding: '6px 14px', borderRadius: 20, border: '1px solid',
              borderColor: selectedWeek === w ? BLUE : '#e2e6f0',
              background: selectedWeek === w ? BLUE : '#fff',
              color: selectedWeek === w ? '#fff' : '#6b7280',
              fontSize: 12, cursor: 'pointer', fontWeight: selectedWeek === w ? 600 : 400
            }}>
              {w}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: 24 }}>

        {/* KPI Row */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
          <KPICard label="Total Net Sales" value={`£${totalSales.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`} sub="selected period" color={BLUE} />
          <KPICard label="Total Orders" value={totalOrders.toFixed(0)} sub="selected period" />
          <KPICard label="Avg Order Value" value={`£${aov.toFixed(2)}`} color={GREEN} />
          <KPICard label="Avg Daily Revenue" value={`£${avgDaily.toFixed(0)}`} sub="per trading day" color={AMBER} />
          <KPICard label="Peak Day" value={peakDay.DateStr || '-'} sub={peakDay.Net_Sales ? `£${peakDay.Net_Sales.toFixed(0)}` : ''} color={RED} />
        </div>

        {/* Area Chart — Daily trend with rolling average */}
        <div style={{ background: '#fff', border: '1px solid #e2e6f0', borderRadius: 12, padding: 20, marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Daily Revenue Trend</div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 16 }}>
            Blue area = daily sales · Gold line = 7-day rolling average
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={withRolling}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={BLUE} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={BLUE} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="DateStr" tick={{ fontSize: 10 }} interval={2} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `£${v}`} />
              <Tooltip formatter={(v, name) => [`£${Number(v).toFixed(2)}`, name === 'Net_Sales' ? 'Daily Sales' : '7-day Avg']} />
              <Area type="monotone" dataKey="Net_Sales" stroke={BLUE} fill="url(#salesGrad)" strokeWidth={2} dot={{ r: 3, fill: BLUE }} />
              <Line type="monotone" dataKey="rolling7" stroke={AMBER} strokeWidth={2} dot={false} strokeDasharray="5 3" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Two charts side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

          {/* DoW Revenue */}
          <div style={{ background: '#fff', border: '1px solid #e2e6f0', borderRadius: 12, padding: 20 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Revenue by Day of Week</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 16 }}>Green = weekend days</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dowData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `£${v}`} />
                <Tooltip formatter={v => [`£${Number(v).toFixed(2)}`, 'Net Sales']} />
                <Bar dataKey="sales" radius={[4, 4, 0, 0]}>
                  {dowData.map((entry, i) => (
                    <Cell key={i} fill={['Fri', 'Sat', 'Sun'].includes(entry.day) ? GREEN : BLUE} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Hourly sales */}
          <div style={{ background: '#fff', border: '1px solid #e2e6f0', borderRadius: 12, padding: 20 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Sales by Hour of Day</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 16 }}>Red = 10pm delivery spike</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="Hour" tick={{ fontSize: 10 }} tickFormatter={v => `${v}h`} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `£${v}`} />
                <Tooltip formatter={v => [`£${Number(v).toFixed(2)}`, 'Net Sales']} />
                <Bar dataKey="Net_Sales" radius={[3, 3, 0, 0]}>
                {hourlyData.map((entry, i) => (
                  <Cell key={i} fill={entry.Hour === 22 ? RED : BLUE} />
                ))}
              </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekend vs Weekday */}
        <div style={{ background: '#fff', border: '1px solid #e2e6f0', borderRadius: 12, padding: 20, marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 16 }}>Weekend vs Weekday Revenue Split</div>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: '#6b7280' }}>Weekend (Fri–Sun)</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: GREEN }}>£{weekendSales.toLocaleString('en-GB', { maximumFractionDigits: 0 })}</span>
              </div>
              <div style={{ background: '#f0f2f8', borderRadius: 6, height: 12 }}>
                <div style={{ width: `${totalSales > 0 ? (weekendSales / totalSales * 100) : 0}%`, background: GREEN, borderRadius: 6, height: 12 }} />
              </div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{totalSales > 0 ? (weekendSales / totalSales * 100).toFixed(1) : 0}% of total</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: '#6b7280' }}>Weekday (Mon–Thu)</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: BLUE }}>£{weekdaySales.toLocaleString('en-GB', { maximumFractionDigits: 0 })}</span>
              </div>
              <div style={{ background: '#f0f2f8', borderRadius: 6, height: 12 }}>
                <div style={{ width: `${totalSales > 0 ? (weekdaySales / totalSales * 100) : 0}%`, background: BLUE, borderRadius: 6, height: 12 }} />
              </div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{totalSales > 0 ? (weekdaySales / totalSales * 100).toFixed(1) : 0}% of total</div>
            </div>
          </div>
        </div>

        {/* Daily Sales Table */}
        <div style={{ background: '#fff', border: '1px solid #e2e6f0', borderRadius: 12, padding: 20 }}>
          <div style={{ fontWeight: 600, marginBottom: 16 }}>Daily Sales Log</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e6f0' }}>
                {['Date', 'Day', 'Net Sales', 'Orders', 'AOV', 'vs Avg'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => {
                const rowAov = row.Orders > 0 ? row.Net_Sales / row.Orders : 0;
                const vsAvg = avgDaily > 0 ? ((row.Net_Sales - avgDaily) / avgDaily * 100) : 0;
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f0f2f8' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{row.DateStr}</td>
                    <td style={{ padding: '10px 12px', color: '#6b7280' }}>{row.Day_of_Week}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: row.Net_Sales > avgDaily ? GREEN : NAVY }}>£{row.Net_Sales.toFixed(2)}</td>
                    <td style={{ padding: '10px 12px' }}>{row.Orders}</td>
                    <td style={{ padding: '10px 12px', color: AMBER }}>£{rowAov.toFixed(2)}</td>
                    <td style={{ padding: '10px 12px', color: vsAvg >= 0 ? GREEN : RED, fontWeight: 600 }}>
                      {vsAvg >= 0 ? '▲' : '▼'} {Math.abs(vsAvg).toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}