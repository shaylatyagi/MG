import { useState, useEffect, useRef } from 'react';
import api from '../../api';

const DOC_TYPES = [
  { key: 'aadhaar_front', label: 'Aadhaar Card (Front)', icon: '🪪', required: true },
  { key: 'aadhaar_back',  label: 'Aadhaar Card (Back)',  icon: '🪪', required: true },
  { key: 'driving_licence', label: 'Driving Licence',   icon: '🚗', required: true },
  { key: 'pan',           label: 'PAN Card',             icon: '💳', required: true },
  { key: 'bank_account',  label: 'Bank Passbook / Cheque', icon: '🏦', required: false },
];

const STATUS_STYLE = {
  approved:     { bg: '#DCFCE7', color: '#16A34A', label: 'Approved ✓' },
  under_review: { bg: '#DBEAFE', color: '#2563EB', label: 'Under Review' },
  pending:      { bg: '#FEF3C7', color: '#D97706', label: 'Pending Review' },
  rejected:     { bg: '#FEE2E2', color: '#DC2626', label: 'Rejected' },
};

export default function DriverKYCTab() {
  const [docs, setDocs]       = useState({});  // key → doc row
  const [loading, setLoading] = useState(true);
  const [uploads, setUploads] = useState({}); // key → { stage: 'idle|uploading|done|error', msg }
  const fileRefs              = useRef({});

  const loadDocs = async () => {
    setLoading(true);
    try {
      const res  = await api.get('/api/driver/kyc');
      const rows = res.data?.data ?? res.data ?? [];
      const map  = {};
      rows.forEach((r) => { map[r.doc_type] = r; });
      setDocs(map);
    } catch (e) {
      console.error('KYC load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDocs(); }, []);

  const handleFile = async (docType, file) => {
    if (!file) return;

    setUploads((u) => ({ ...u, [docType]: { stage: 'uploading', msg: '' } }));

    const formData = new FormData();
    formData.append('file', file);
    formData.append('doc_type', docType);

    try {
      await api.post('/api/driver/kyc/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploads((u) => ({ ...u, [docType]: { stage: 'done', msg: 'Uploaded! Under review.' } }));
      // Refresh doc status
      await loadDocs();
    } catch (e) {
      setUploads((u) => ({
        ...u,
        [docType]: { stage: 'error', msg: e.response?.data?.message || 'Upload failed' },
      }));
    }
  };

  const triggerUpload = (docType, capture) => {
    const input = fileRefs.current[docType];
    if (!input) return;
    input.setAttribute('capture', capture ? 'environment' : '');
    input.click();
  };

  // Overall KYC progress
  const required      = DOC_TYPES.filter((d) => d.required);
  const doneCount     = required.filter((d) => docs[d.key]?.status === 'approved').length;
  const uploadedCount = required.filter((d) => docs[d.key]).length;
  const allApproved   = doneCount === required.length;

  if (loading) return (
    <div className="flex flex-col gap-3 p-4">
      {DOC_TYPES.map((_, i) => (
        <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse" />
      ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">

      {/* Status banner */}
      <div className="rounded-2xl p-4"
           style={{
             background: allApproved
               ? 'linear-gradient(135deg, #16A34A, #15803D)'
               : 'linear-gradient(135deg, #7D5235, #5C3A1E)',
             color: 'white',
           }}>
        <p className="text-xs font-semibold tracking-wide mb-1" style={{ opacity: 0.8 }}>KYC STATUS</p>
        <p className="text-xl font-black mb-1">
          {allApproved ? '✅ Fully Verified' : `${uploadedCount}/${required.length} Uploaded`}
        </p>
        <p className="text-xs" style={{ opacity: 0.75 }}>
          {allApproved
            ? 'All required documents approved'
            : 'Upload all required documents to complete verification'}
        </p>

        {/* Progress bar */}
        {!allApproved && (
          <div className="mt-3 h-1.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}>
            <div className="h-1.5 rounded-full bg-white transition-all"
                 style={{ width: `${(uploadedCount / required.length) * 100}%` }} />
          </div>
        )}
      </div>

      {/* Doc cards */}
      {DOC_TYPES.map((doc) => {
        const existing   = docs[doc.key];
        const upState    = uploads[doc.key];
        const statusMeta = existing ? (STATUS_STYLE[existing.status] || STATUS_STYLE.pending) : null;
        const isUploading = upState?.stage === 'uploading';
        const isLocked    = existing?.status === 'approved';

        return (
          <div key={doc.key} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            {/* Hidden file input */}
            <input
              ref={(el) => { fileRefs.current[doc.key] = el; }}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={(e) => handleFile(doc.key, e.target.files[0])}
            />

            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{doc.icon}</span>
                <div>
                  <p className="text-sm font-bold text-gray-900">{doc.label}</p>
                  {!doc.required && (
                    <p className="text-[10px] text-gray-400">Optional</p>
                  )}
                </div>
              </div>

              {statusMeta && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: statusMeta.bg, color: statusMeta.color }}>
                  {statusMeta.label}
                </span>
              )}
              {!existing && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: '#F3F4F6', color: '#9CA3AF' }}>
                  Not uploaded
                </span>
              )}
            </div>

            {/* Rejection reason */}
            {existing?.status === 'rejected' && existing.rejection_reason && (
              <div className="mb-2 bg-red-50 text-red-600 text-xs p-2 rounded-lg">
                ❌ Rejected: {existing.rejection_reason}
              </div>
            )}

            {/* Upload feedback */}
            {upState?.stage === 'done' && (
              <div className="mb-2 bg-green-50 text-green-600 text-xs p-2 rounded-lg">
                ✓ {upState.msg}
              </div>
            )}
            {upState?.stage === 'error' && (
              <div className="mb-2 bg-red-50 text-red-600 text-xs p-2 rounded-lg">
                ⚠ {upState.msg}
              </div>
            )}

            {/* Upload buttons */}
            {!isLocked && (
              <div className="flex gap-2">
                <button
                  onClick={() => triggerUpload(doc.key, true)}
                  disabled={isUploading}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors"
                  style={{
                    borderColor: '#8B5E3C',
                    color: '#8B5E3C',
                    backgroundColor: isUploading ? '#F5F5F5' : 'white',
                    opacity: isUploading ? 0.7 : 1,
                    cursor: isUploading ? 'not-allowed' : 'pointer',
                  }}>
                  {isUploading ? '⏳ Uploading…' : '📷 Take Photo'}
                </button>
                <button
                  onClick={() => triggerUpload(doc.key, false)}
                  disabled={isUploading}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors"
                  style={{
                    borderColor: '#8B5E3C',
                    color: '#8B5E3C',
                    backgroundColor: isUploading ? '#F5F5F5' : 'white',
                    opacity: isUploading ? 0.7 : 1,
                    cursor: isUploading ? 'not-allowed' : 'pointer',
                  }}>
                  {isUploading ? '⏳' : '📁 Upload File'}
                </button>
              </div>
            )}

            {isLocked && (
              <p className="text-xs text-green-600 font-semibold text-center py-1">
                ✅ Document approved — no changes needed
              </p>
            )}
          </div>
        );
      })}

      {/* Info note */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3">
        <p className="text-xs text-blue-700 font-semibold mb-1">📋 What happens next?</p>
        <p className="text-xs text-blue-600 leading-relaxed">
          Your documents will be reviewed by your fleet owner within 24 hours.
          You'll see the status update here automatically.
          Make sure photos are clear and all text is readable.
        </p>
      </div>

    </div>
  );
}
