import { useState, useEffect, useRef } from 'react';
import api from '../../api';
import AppShell from '../../components/AppShell';

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
    <AppShell title="KYC Documents" subtitle="Upload once, keep status visible and actionable">
      <div className="page-section p-4 pb-24">

        <div className={`kyc-status-card ${allApproved ? 'kyc-status-card--approved' : 'kyc-status-card--pending'}`}>
          <p className="kyc-status-card__label">KYC STATUS</p>
          <p className="kyc-status-card__headline">
            {allApproved ? '✅ Fully Verified' : `${uploadedCount}/${required.length} Uploaded`}
          </p>
          <p className="text-xs" style={{ opacity: 0.75 }}>
            {allApproved
              ? 'All required documents approved'
              : 'Upload all required documents to complete verification'}
          </p>

          {!allApproved && (
            <div className="kyc-progress-bar">
              <div className="kyc-progress-fill" style={{ width: `${(uploadedCount / required.length) * 100}%` }} />
            </div>
          )}
        </div>

        {DOC_TYPES.map((doc) => {
          const existing   = docs[doc.key];
          const upState    = uploads[doc.key];
          const statusMeta = existing ? (STATUS_STYLE[existing.status] || STATUS_STYLE.pending) : null;
          const isUploading = upState?.stage === 'uploading';
          const isLocked    = existing?.status === 'approved';

          return (
            <div key={doc.key} className="doc-card">
              <input
                ref={(el) => { fileRefs.current[doc.key] = el; }}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={(e) => handleFile(doc.key, e.target.files[0])}
              />

              <div className="doc-card__head">
                <div className="doc-card__title">
                  <span>{doc.icon}</span>
                  <div>
                    <p className="doc-card__label">{doc.label}</p>
                    {!doc.required && (
                      <p className="doc-card__subtitle">Optional</p>
                    )}
                  </div>
                </div>

                {statusMeta && (
                  <span className={`doc-card__pill doc-card__pill--${existing.status}`}>
                    {statusMeta.label}
                  </span>
                )}
                {!existing && (
                  <span className="doc-card__pill doc-card__pill--empty">
                    Not uploaded
                  </span>
                )}
              </div>

              {existing?.status === 'rejected' && existing.rejection_reason && (
                <div className="doc-card__rejection bg-red-50 text-red-600 text-xs p-2 rounded-lg">
                  ❌ Rejected: {existing.rejection_reason}
                </div>
              )}

              {upState?.stage === 'done' && (
                <div className="doc-card__rejection bg-green-50 text-green-600 text-xs p-2 rounded-lg">
                  ✓ {upState.msg}
                </div>
              )}
              {upState?.stage === 'error' && (
                <div className="doc-card__rejection bg-red-50 text-red-600 text-xs p-2 rounded-lg">
                  ⚠ {upState.msg}
                </div>
              )}

              {!isLocked && (
                <>
                  {existing?.status === 'rejected' && (
                    <div className="doc-card__rejection mb-2 bg-orange-50 border border-orange-200 rounded-xl p-2 text-center">
                      <p className="text-xs font-bold text-orange-600 mb-1">⚠️ Re-upload required</p>
                      <p className="text-[10px] text-orange-500">Fix the issue above and upload a new photo</p>
                    </div>
                  )}
                  <div className="doc-card__actions">
                    <button
                      type="button"
                      onClick={() => triggerUpload(doc.key, true)}
                      disabled={isUploading}
                      className="doc-card__action-btn"
                    >
                      {isUploading ? '⏳ Uploading…' : existing?.status === 'rejected' ? '📷 Re-take Photo' : '📷 Take Photo'}
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerUpload(doc.key, false)}
                      disabled={isUploading}
                      className="doc-card__action-btn"
                    >
                      {isUploading ? '⏳' : existing?.status === 'rejected' ? '📁 Re-upload File' : '📁 Upload File'}
                    </button>
                  </div>
                </>
              )}

              {isLocked && (
                <p className="text-xs text-green-600 font-semibold text-center py-1">
                  ✅ Document approved — no changes needed
                </p>
              )}
            </div>
          );
        })}

        <div className="doc-note">
          <p className="text-xs text-blue-700 font-semibold mb-1">📋 What happens next?</p>
          <p>
            Your documents will be reviewed by your fleet owner within 24 hours.
            You'll see the status update here automatically.
            Make sure photos are clear and all text is readable.
          </p>
        </div>

      </div>
    </AppShell>
  );
}
