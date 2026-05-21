import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../api';
const translations = {
  en: {
    title: 'Charging Stations',
    subtitle: 'Find nearby charging stations for your vehicle.',
    assigned: 'Your Assigned Station',
    nearby: 'Nearby Stations',
    available: 'Available',
    busy: 'Busy',
    km: 'km away',
    noStation: 'No charging station assigned',
    navigate: 'Navigate',
    call: 'Call Station',
  },
  hi: {
    title: 'चार्जिंग स्टेशन',
    subtitle: 'अपने वाहन के लिए नजदीकी चार्जिंग स्टेशन खोजें।',
    assigned: 'आपका असाइन्ड स्टेशन',
    nearby: 'नजदीकी स्टेशन',
    available: 'उपलब्ध',
    busy: 'व्यस्त',
    km: 'किमी दूर',
    noStation: 'कोई चार्जिंग स्टेशन असाइन नहीं',
    navigate: 'नेविगेट करें',
    call: 'स्टेशन को कॉल करें',
  },
  pa: {
    title: 'ਚਾਰਜਿੰਗ ਸਟੇਸ਼ਨ',
    subtitle: 'ਆਪਣੇ ਵਾਹਨ ਲਈ ਨੇੜੇ ਦੇ ਚਾਰਜਿੰਗ ਸਟੇਸ਼ਨ ਲੱਭੋ।',
    assigned: 'ਤੁਹਾਡਾ ਨਿਰਧਾਰਿਤ ਸਟੇਸ਼ਨ',
    nearby: 'ਨੇੜੇ ਦੇ ਸਟੇਸ਼ਨ',
    available: 'ਉਪਲਬਧ',
    busy: 'ਵਿਅਸਤ',
    km: 'ਕਿਮੀ ਦੂਰ',
    noStation: 'ਕੋਈ ਚਾਰਜਿੰਗ ਸਟੇਸ਼ਨ ਨਿਰਧਾਰਿਤ ਨਹੀਂ',
    navigate: 'ਨੈਵੀਗੇਟ ਕਰੋ',
    call: 'ਸਟੇਸ਼ਨ ਨੂੰ ਕਾਲ ਕਰੋ',
  },
};
const nearbyStations = [
  { name: 'Sector 10 Charging Hub', distance: 1.2, status: 'Available', address: 'Sector 10, Dwarka, Delhi' },
  { name: 'Dwarka Mod Station', distance: 2.8, status: 'Busy', address: 'Dwarka Mor Metro, Delhi' },
  { name: 'Sector 23 Point', distance: 3.5, status: 'Available', address: 'Sector 23, Dwarka, Delhi' },
  { name: 'Palam Charging Hub', distance: 5.1, status: 'Available', address: 'Palam, Delhi' },
];
export default function ChargingStations() {
  const [driverDetails, setDriverDetails] = useState({ vehicle_number: '', charging_station: '' });
  const [vehicle, setVehicle] = useState(null);
  const [lang, setLang] = useState(localStorage.getItem('lang') || 'en');
  const t = translations[lang] || translations.en;
  useEffect(() => {
    // Listen for language changes from Sidebar
    const handleLangChange = () => setLang(localStorage.getItem('lang') || 'en');
    window.addEventListener('languageChanged', handleLangChange);
    const fetchData = async () => {
      try {
        const detailsRes = await api.get('/api/payment/driver-details');
        setDriverDetails(detailsRes.data);
        if (detailsRes.data.vehicle_number && detailsRes.data.vehicle_number !== 'Not Assigned') {
          const vehicleRes = await api.get(`/api/owner/vehicle-info/${detailsRes.data.vehicle_number}`);
          setVehicle(vehicleRes.data);
        }
      } catch (err) {
        console.error(err);
      }
    };    
    fetchData();    
    return () => window.removeEventListener('languageChanged', handleLangChange);
  }, []);
  return (
    <div style={{ display: 'flex', backgroundColor: '#FAF7F2', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ marginLeft: '220px', flex: 1, padding: '32px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1A1A1A' }}>{t.title}</h1>
          <p style={{ fontSize: '13px', color: '#6B6B6B', marginTop: '4px' }}>{t.subtitle}</p>
        </div>
        {/* Assigned Station */}
        <div style={{ backgroundColor: '#7D5235', borderRadius: '16px', padding: '28px', color: 'white', marginBottom: '24px' }}>
          <p style={{ fontSize: '11px', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>{t.assigned}</p>
          {vehicle?.charging_station ? (
            <>
              <p style={{ fontSize: '22px', fontWeight: '700', marginBottom: '16px' }}>{vehicle.charging_station}</p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(vehicle.charging_station + ' Delhi')}`, '_blank')}
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', border: 'none', cursor: 'pointer' }}
                >
                  🗺️ {t.navigate}
                </button>
              </div>
            </>
          ) : (
            <p style={{ fontSize: '16px', opacity: 0.8 }}>{t.noStation}</p>
          )}
        </div>
        {/* Nearby Stations */}
        <p style={{ fontSize: '15px', fontWeight: '600', color: '#1A1A1A', marginBottom: '16px' }}>{t.nearby}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {nearbyStations.map((station, i) => (
            <div key={i} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px 24px', border: '1px solid #E8E0D5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '15px', fontWeight: '600', color: '#1A1A1A', marginBottom: '4px' }}>{station.name}</p>
                <p style={{ fontSize: '12px', color: '#9CA3AF' }}>{station.address}</p>
                <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>{station.distance} {t.km}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '500', backgroundColor: station.status === 'Available' ? '#DCFCE7' : '#FEE2E2', color: station.status === 'Available' ? '#16A34A' : '#DC2626' }}>
                  {station.status === 'Available' ? t.available : t.busy}
                </span>
                <button
                  onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(station.name + ' ' + station.address)}`, '_blank')}
                  style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', backgroundColor: '#8B5E3C', color: 'white', border: 'none', cursor: 'pointer' }}
                >
                  🗺️ {t.navigate}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}