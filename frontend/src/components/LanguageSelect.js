import { useState } from 'react';

const languages = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'हिंदी', flag: '🇮🇳' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
];

export default function LanguageSelector() {
  const [current, setCurrent] = useState(localStorage.getItem('lang') || 'en');
  const [open, setOpen] = useState(false);

  const handleChange = (code) => {
    localStorage.setItem('lang', code);
    setCurrent(code);
    setOpen(false);
    window.location.reload();
  };

  const currentLang = languages.find(l => l.code === current);

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #E8E0D5', backgroundColor: 'white', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
      >
        {currentLang?.flag} {currentLang?.label} ▾
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '36px', right: 0, backgroundColor: 'white', borderRadius: '8px', border: '1px solid #E8E0D5', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, minWidth: '140px' }}>
          {languages.map(lang => (
            <div
              key={lang.code}
              onClick={() => handleChange(lang.code)}
              style={{ padding: '10px 16px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: current === lang.code ? '#F3EDE5' : 'white', color: current === lang.code ? '#8B5E3C' : '#1A1A1A' }}
            >
              {lang.flag} {lang.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}