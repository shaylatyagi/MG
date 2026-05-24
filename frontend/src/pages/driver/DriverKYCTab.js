export default function DriverKYCTab() {
  return (
    <div className="p-5 space-y-3">
      {['Aadhaar', 'PAN', 'Driving License', 'Bank Account'].map(doc => (
        <div key={doc} className="p-4 border rounded-2xl bg-white flex justify-between items-center">
          <span className="font-bold">{doc}</span>
          <button className="text-xs bg-slate-900 text-white px-3 py-1 rounded-lg">Upload</button>
        </div>
      ))}
    </div>
  );
}