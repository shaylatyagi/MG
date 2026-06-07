import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
function Chart({ data, title }) {
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '24px',
      border: '1px solid #E8E0D5',
    }}>
      <p style={{ fontSize: '15px', fontWeight: '600', color: '#1A1A1A', marginBottom: '20px' }}>{title}</p>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F0E8DF" />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #E8E0D5', borderRadius: '8px', fontSize: '13px' }} />
          <Line type="monotone" dataKey="value" stroke="#8B5E3C" strokeWidth={2.5} dot={{ fill: '#8B5E3C', r: 4 }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
export default Chart;