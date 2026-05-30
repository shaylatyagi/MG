import React, { useState, useEffect } from 'react';

const API = 'https://mg-qw5s.onrender.com';

const DOC_CONFIG = {
  OWNER: [
    { key: 'PROFILE',      label: 'Profile Photo',          icon: '📸', accept: 'image/*' },
    { key: 'AADHAAR',      label: 'Aadhaar Card',           icon: '🪪', accept: '.pdf,.jpg,.jpeg,.png' },
    { key: 'PAN',          label: 'PAN Card',               icon: '📋', accept: '.pdf,.jpg,.jpeg,.png' },
    { key: 'BUSINESS_REG', label: 'Business Registration',  icon: '🏢', accept: '.pdf,.jpg,.jpeg,.png' },
    { key: 'GST',          label: 'GST Certificate',        icon: '📄', accept: '.pdf,.jpg,.jpeg,.png' },
  ],
  DRIVER: [
    { key: 'PROFILE',      label: 'Profile Photo',          icon: '📸', accept: 'image/*' },
    { key: 'AADHAAR',      label: 'Aadhaar Card',           icon: '🪪', accept: '.pdf,.jpg,.jpeg,.png' },
    { key: 'PAN',          label: 'PAN Card',               icon: '📋', accept: '.pdf,.jpg,.jpeg,.png' },
    { key: 'LICENSE',      label: 'Driving License',        icon: '🚗', accept: '.pdf,.jpg,.jpeg,.png' },
    { key: 'BANK_CHEQUE',  label: 'Cancelled Cheque',       icon: '🏦', accept: '.pdf,.jpg,.jpeg,.png' },
  ]
};

export default function DocumentSection({ userId, userType, token }) {
  const [docs, setDocs] = useState({});
  const [uploading, setUploading] = useState({});
  const [error, setError] = useState('');
  const [viewDoc, setViewDoc] = useState(null);

  const docTypes = DOC_CONFIG[userType] || [];

  const fetchDocs = async () => {
    try {
      const res = await fetch(
        `${API}/api/uploads/my-docs?user_id=${userId}&user_type=${userType}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.success) {
        const map = {};
        data.docs.forEach(d => { map[d.doc_type] = d; });
        setDocs(map);
      }
    } catch {}
  };

  useEffect(() => { if (userId && token) fetchDocs(); }, [userId, token]);

  const uploadDoc = async (docKey, file) => {
    if (!file) return;
    setUploading(prev => ({ ...prev, [docKey]: true }));
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('doc_type', docKey);
    formData.append('user_type', userType);
    formData.append('user_id', String(userId));

    try {
      const res = await fetch(`${API}/api/uploads/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (data.success) fetchDocs();
      else setError(data.message || 'Upload failed');
    } catch {
      setError('Network error — dobara try karein');
    }
    setUploading(prev => ({ ...prev, [docKey]: false }));
  };

  const deleteDoc = async (docId) => {
    if (!window.confirm('Ye document delete karna chahte hain?')) return;
    try {
      const res = await fetch(`${API}/api/uploads/delete/${docId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) fetchDocs();
    } catch {}
  };

  const totalDocs = docTypes.length;
  const uploadedDocs = docTypes.filter(d => docs[d.key]).length;
  const verifiedDocs = docTypes.filter(d => docs[d.key]?.status === 'VERIFIED').length;

  return (
    <div className="space-y-3">
      {/* Progress Header */}
      <div className="bg-slate-50 rounded-2xl p-3 flex items-center justify-between border border-slate-100">
        <div>
          <p className="text-xs font-black text-slate-700">Documents</p>
          <p className="text-[10px] text-slate-400">{uploadedDocs}/{totalDocs} uploaded · {verifiedDocs} verified</p>
        </div>
        <div className="flex gap-1">
          {docTypes.map(d => (
            <div key={d.key} className={`w-2 h-2 rounded-full ${
              docs[d.key]?.status === 'VERIFIED' ? 'bg-emerald-500' :
              docs[d.key] ? 'bg-amber-400' : 'bg-slate-200'
            }`}/>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-2 text-xs text-red-600 font-black">
          {error}
        </div>
      )}

      {/* Doc List */}
      {docTypes.map(({ key, label, icon, accept }) => {
        const doc = docs[key];
        const isUploading = uploading[key];

        return (
          <div key={key} className={`bg-white border rounded-xl overflow-hidden ${
            doc?.status === 'VERIFIED' ? 'border-emerald-200' :
            doc?.status === 'REJECTED' ? 'border-red-200' :
            doc ? 'border-amber-200' : 'border-slate-200'
          }`}>
            <div className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${
                  doc?.status === 'VERIFIED' ? 'bg-emerald-50' :
                  doc?.status === 'REJECTED' ? 'bg-red-50' :
                  doc ? 'bg-amber-50' : 'bg-slate-100'
                }`}>
                  {icon}
                </div>
                <div>
                  <p className="text-sm font-black text-slate-800">{label}</p>
                  {doc ? (
                    <p className="text-[10px] text-slate-400 max-w-[140px] truncate">{doc.original_name}</p>
                  ) : (
                    <p className="text-[10px] text-slate-400">Not uploaded</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {doc ? (
                  <>
                    {/* Status badge */}
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                      doc.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-700' :
                      doc.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {doc.status === 'VERIFIED' ? '✅ Verified' :
                       doc.status === 'REJECTED' ? '❌ Rejected' : '⏳ Pending'}
                    </span>

                    {/* View */}
                    <button
                      onClick={() => setViewDoc(doc)}
                      className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center"
                      title="View">
                      <span className="text-xs">👁</span>
                    </button>

                    {/* Retake/Replace */}
                    <label className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center cursor-pointer" title="Replace">
                      <span className="text-xs">🔄</span>
                      <input type="file" className="hidden" accept={accept}
                        onChange={e => uploadDoc(key, e.target.files[0])}/>
                    </label>

                    {/* Delete */}
                    <button
                      onClick={() => deleteDoc(doc.id)}
                      className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center"
                      title="Delete">
                      <span className="text-xs">🗑</span>
                    </button>
                  </>
                ) : (
                  <label className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer ${
                    isUploading
                      ? 'bg-slate-100 text-slate-400'
                      : 'bg-blue-600 text-white'
                  }`}>
                    {isUploading ? (
                      <span className="flex items-center gap-1">
                        <span className="animate-spin">⏳</span> Uploading...
                      </span>
                    ) : '+ Upload'}
                    <input type="file" className="hidden" accept={accept}
                      onChange={e => uploadDoc(key, e.target.files[0])}
                      disabled={isUploading}/>
                  </label>
                )}
              </div>
            </div>

            {/* Rejected reason if any */}
            {doc?.status === 'REJECTED' && doc?.reject_reason && (
              <div className="px-3 pb-2 text-[10px] text-red-500 font-black">
                ❌ {doc.reject_reason}
              </div>
            )}
          </div>
        );
      })}

      {/* View Modal */}
      {viewDoc && (
        <div className="fixed inset-0 bg-black/90 z-[500] flex flex-col"
          onClick={() => setViewDoc(null)}>
          <div className="flex justify-between items-center p-4">
            <p className="text-white font-black text-sm">{viewDoc.doc_type}</p>
            <button onClick={() => setViewDoc(null)}
              className="text-white text-xl font-black w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              ✕
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-4"
            onClick={e => e.stopPropagation()}>
            {viewDoc.mime_type?.startsWith('image/') ? (
              <img src={viewDoc.view_url} alt={viewDoc.doc_type}
                className="max-w-full max-h-full rounded-xl object-contain"/>
            ) : (
              <div className="text-center">
                <div className="text-6xl mb-4">📄</div>
                <p className="text-white text-sm mb-4">{viewDoc.original_name}</p>
                <a href={viewDoc.view_url} target="_blank" rel="noreferrer"
                  className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-sm">
                  Open PDF ↗
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}