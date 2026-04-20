import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Clock, Bell, Sun } from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import CustomSelect from '../components/CustomSelect';

const JadwalShalat = () => {
  const [provinsiList, setProvinsiList] = useState([]);
  const [kabkotaList, setKabkotaList] = useState([]);
  const [selectedProvinsi, setSelectedProvinsi] = useState('');
  const [selectedKabkota, setSelectedKabkota] = useState('');
  
  const [jadwal, setJadwal] = useState(null);
  const [loadingJadwal, setLoadingJadwal] = useState(false);
  const [error, setError] = useState('');

  const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());

  const [currentTime, setCurrentTime] = useState(new Date());

  // Real-time clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [adminDefault, setAdminDefault] = useState({ prov: null, kab: null });

  // 1a. Fetch Admin Settings to automatically set user's default based on admin preference
  useEffect(() => {
    const fetchAdminSettings = async () => {
      try {
        const settingsSnap = await getDoc(doc(db, 'settings', 'admin_settings'));
        if (settingsSnap.exists()) {
          const { shalat_provinsi, shalat_kabkota } = settingsSnap.data();
          if (shalat_provinsi && shalat_kabkota) {
            setAdminDefault({ prov: shalat_provinsi, kab: shalat_kabkota });
            setSelectedProvinsi(shalat_provinsi);
          }
        }
      } catch (err) {
        console.error("Gagal mengambil pengaturan admin", err);
      }
    };
    fetchAdminSettings();
  }, []);

  // 1b. Fetch Provinsi List on mount
  useEffect(() => {
    const fetchProvinsi = async () => {
      try {
        const response = await fetch('https://equran.id/api/v2/shalat/provinsi');
        const data = await response.json();
        if (data.code === 200) {
          setProvinsiList(data.data);
        }
      } catch (err) {
        console.error("Failed to fetch provinsi", err);
      }
    };
    fetchProvinsi();
  }, []);

  // 2. Fetch KabKota when Provinsi changes
  useEffect(() => {
    if (!selectedProvinsi) return;
    
    const isInitialAdminLoad = adminDefault.prov === selectedProvinsi && adminDefault.kab !== null;

    const fetchKabKota = async () => {
      setKabkotaList([]);
      if (!isInitialAdminLoad) setSelectedKabkota('');

      try {
        const response = await fetch('https://equran.id/api/v2/shalat/kabkota', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provinsi: selectedProvinsi })
        });
        const data = await response.json();
        if (data.code === 200) {
          setKabkotaList(data.data);
          
          if (isInitialAdminLoad && data.data.includes(adminDefault.kab)) {
            setSelectedKabkota(adminDefault.kab);
          } else if (data.data.length > 0 && !isInitialAdminLoad) {
            setSelectedKabkota(data.data[0]);
          }
        }
      } catch (err) {
        console.error("Failed to fetch kabkota", err);
      }
    };
    
    fetchKabKota();
  }, [selectedProvinsi, adminDefault]);

  // 3. Fetch Jadwal Shalat when both are selected
  useEffect(() => {
    if (!selectedProvinsi || !selectedKabkota) return;
    
    const fetchJadwal = async () => {
      setLoadingJadwal(true);
      setError('');
      try {
        const response = await fetch('https://equran.id/api/v2/shalat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            provinsi: selectedProvinsi, 
            kabkota: selectedKabkota,
            bulan: viewMonth,
            tahun: viewYear
          })
        });
        const data = await response.json();
        if (data.code === 200) {
          setJadwal(data.data);
        } else {
          setError(data.message || 'Gagal memuat jadwal shalat');
        }
      } catch (err) {
        setError('Terjadi kesalahan jaringan.');
      } finally {
        setLoadingJadwal(false);
      }
    };
    
    fetchJadwal();
  }, [selectedProvinsi, selectedKabkota, viewMonth, viewYear]);

  // Computations for today's dashboard
  const pad = n => n.toString().padStart(2, '0');
  const todayString = `${currentTime.getFullYear()}-${pad(currentTime.getMonth() + 1)}-${pad(currentTime.getDate())}`;

  let todayJadwal = null;
  let nextPrayer = null;
  let nextPrayerTimeKey = null;
  let countdownStr = '00:00:00';

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  if (jadwal && jadwal.jadwal) {
    todayJadwal = jadwal.jadwal.find(j => j.tanggal_lengkap === todayString);
    
    if (todayJadwal) {
      const prayers = [
        { name: 'Subuh', key: 'subuh', time: todayJadwal.subuh },
        { name: 'Dzuhur', key: 'dzuhur', time: todayJadwal.dzuhur },
        { name: 'Ashar', key: 'ashar', time: todayJadwal.ashar },
        { name: 'Maghrib', key: 'maghrib', time: todayJadwal.maghrib },
        { name: 'Isya', key: 'isya', time: todayJadwal.isya }
      ];

      const currentSecs = currentTime.getHours() * 3600 + currentTime.getMinutes() * 60 + currentTime.getSeconds();
      
      for (const p of prayers) {
        const [h, m] = p.time.split(':').map(Number);
        const pSecs = h * 3600 + m * 60;
        if (pSecs > currentSecs) {
          nextPrayer = p;
          nextPrayerTimeKey = p.key;
          
          let diff = pSecs - currentSecs;
          const dH = Math.floor(diff / 3600);
          diff %= 3600;
          const dM = Math.floor(diff / 60);
          const dS = diff % 60;
          countdownStr = `${pad(dH)}:${pad(dM)}:${pad(dS)}`;
          break;
        }
      }
      
      // Jika tidak ada jadwal selanjutnya hari ini, berarti waktu Subuh esok hari
      if (!nextPrayer) {
        const tomorrow = new Date(currentTime);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowString = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;
        const tomorrowJadwal = jadwal.jadwal.find(j => j.tanggal_lengkap === tomorrowString);

        if (tomorrowJadwal) {
          nextPrayer = { name: 'Subuh', key: 'subuh', time: tomorrowJadwal.subuh };
          const [h, m] = tomorrowJadwal.subuh.split(':').map(Number);
          const pSecsTomorrow = h * 3600 + m * 60;
          const secondsUntilMidnight = 86400 - currentSecs;
          
          let diff = secondsUntilMidnight + pSecsTomorrow;
          const dH = Math.floor(diff / 3600);
          diff %= 3600;
          const dM = Math.floor(diff / 60);
          const dS = diff % 60;
          countdownStr = `${pad(dH)}:${pad(dM)}:${pad(dS)}`;
        } else {
          // Fallback if tomorrow is next month and not available in current API response
          nextPrayer = { name: 'Subuh (Besok)', key: 'subuh', time: '-' };
          countdownStr = '--:--:--';
        }
      }
    }
  }

  const formatCurrentTime = currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\./g, ':');
  const formatTodayDate = currentTime.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="animate-fade-in max-w-4xl mx-auto" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="text-center mb-4">
        <h2 className="flex items-center justify-center gap-2">
          <Calendar className="text-primary" />
          Jadwal Shalat
        </h2>
        <p>Lihat jadwal shalat terkini untuk daerah Anda</p>
      </div>

      {/* Selectors */}
      <div className="glass-panel mb-4" style={{ position: 'relative', zIndex: 100 }}>
        <div className="flex" style={{ gap: '1rem', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: '1', minWidth: '250px', marginBottom: 0 }}>
            <label className="form-label flex items-center gap-2 mb-2">
              <MapPin size={16} /> Pilih Provinsi
            </label>
            <CustomSelect 
              value={selectedProvinsi}
              onChange={setSelectedProvinsi}
              options={provinsiList}
              placeholder="-- Silakan Pilih Provinsi --"
            />
          </div>

          <div className="form-group" style={{ flex: '1', minWidth: '250px', marginBottom: 0 }}>
            <label className="form-label flex items-center gap-2 mb-2">
              <MapPin size={16} /> Pilih Kabupaten/Kota
            </label>
            <CustomSelect 
              value={selectedKabkota}
              onChange={setSelectedKabkota}
              options={kabkotaList}
              placeholder="-- Silakan Pilih Kab/Kota --"
              disabled={!selectedProvinsi || kabkotaList.length === 0}
            />
          </div>
        </div>
      </div>

      {loadingJadwal && <div className="text-center py-4 text-secondary">Mencari jadwal...</div>}
      {error && <div className="glass-panel text-center text-danger mb-4">{error}</div>}

      {/* Modern Dashboard View */}
      {jadwal && !loadingJadwal && todayJadwal && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
          
          {/* Top Hero Banner */}
          <div className="glass-panel" style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '1.5rem 2rem',
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(2, 6, 23, 0.9) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ 
                width: '50px', 
                height: '50px', 
                borderRadius: '50%', 
                background: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)'
              }}>
                <Bell size={24} color="#0f172a" fill="#0f172a" />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Shalat Berikutnya</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-primary)' }}>{nextPrayer?.name}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '2rem', fontWeight: '700', fontFamily: 'monospace', color: 'var(--accent-primary)', textShadow: '0 0 10px rgba(16, 185, 129, 0.3)' }}>
                  {countdownStr}
                </span>
                <span style={{ 
                  background: 'rgba(16, 185, 129, 0.1)', 
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '0.2rem 0.6rem', 
                  borderRadius: '99px',
                  color: 'var(--accent-primary)',
                  fontSize: '0.9rem',
                  fontWeight: '600'
                }}>
                  {nextPrayer?.time}
                </span>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Sekarang</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '600' }}>{formatCurrentTime}</div>
            </div>
          </div>

          {/* Cards Panel */}
          <div className="glass-panel" style={{ padding: '1.5rem 2rem', background: 'rgba(15, 23, 42, 0.6)' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                <Sun size={20} className="text-secondary" />
                <h3 style={{ margin: 0, fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  Jadwal Shalat Hari Ini
                  <span style={{ 
                    background: 'var(--accent-primary)', 
                    color: '#0f172a',
                    padding: '0.2rem 0.75rem',
                    borderRadius: '99px',
                    fontSize: '0.8rem',
                    fontWeight: '600'
                  }}>
                    {formatTodayDate}
                  </span>
                </h3>
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{jadwal.kabkota}, {jadwal.provinsi}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
              {[
                { name: 'Subuh', time: todayJadwal.subuh, key: 'subuh', color: '#3b82f6' }, // Blue
                { name: 'Dzuhur', time: todayJadwal.dzuhur, key: 'dzuhur', color: '#10b981' }, // Emerald
                { name: 'Ashar', time: todayJadwal.ashar, key: 'ashar', color: '#0ea5e9' }, // Light Blue
                { name: 'Maghrib', time: todayJadwal.maghrib, key: 'maghrib', color: '#f59e0b' }, // Amber
                { name: 'Isya', time: todayJadwal.isya, key: 'isya', color: '#8b5cf6' } // Purple
              ].map(prayer => {
                const isNext = prayer.key === nextPrayerTimeKey;
                return (
                  <div key={prayer.key} style={{
                    borderRadius: 'var(--radius-md)',
                    padding: '1.25rem 1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: isNext ? `2px solid ${prayer.color}` : '1px solid rgba(255,255,255,0.05)',
                    background: isNext ? `rgba(${isNext ? '0,0,0' : ''}, 0.2)` : 'rgba(30, 41, 59, 0.4)',
                    boxShadow: isNext ? `0 0 15px rgba(0,0,0,0.2), inset 0 0 20px rgba(255,255,255,0.02)` : 'none',
                    transform: isNext ? 'scale(1.05)' : 'scale(1)',
                    transition: 'all var(--transition-normal)'
                  }}>
                    <div style={{ 
                      fontSize: '0.9rem', 
                      color: 'var(--text-secondary)', 
                      marginBottom: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}>
                      {isNext && <Bell size={14} color={prayer.color} />}
                      {prayer.name}
                    </div>
                    <div style={{ 
                      fontSize: '1.5rem', 
                      fontWeight: '700', 
                      color: isNext ? '#fff' : prayer.color 
                    }}>
                      {prayer.time}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          
        </div>
      )}

      {/* Month Selection */}
      <div className="glass-panel mb-4" style={{ padding: '1.25rem' }}>
        <div className="flex items-center gap-2" style={{ marginBottom: '1.5rem' }}>
          <Calendar size={18} className="text-primary" />
          <span style={{ fontWeight: '600', fontSize: '1.1rem' }}>Pilih Bulan</span>
        </div>

        <div className="flex gap-2" style={{ overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {months.map((m, idx) => {
            const mIdx = idx + 1;
            const isActive = viewMonth === mIdx;
            return (
              <button
                key={m}
                onClick={() => setViewMonth(mIdx)}
                style={{
                  whiteSpace: 'nowrap',
                  padding: '0.5rem 1.25rem',
                  borderRadius: '99px',
                  border: isActive ? 'none' : '1px solid rgba(255,255,255,0.1)',
                  background: isActive ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                  color: isActive ? '#0f172a' : 'var(--text-secondary)',
                  fontSize: '0.85rem',
                  fontWeight: isActive ? '700' : '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {m}
              </button>
            );
          })}
        </div>
      </div>

      {/* Rest of the Month Table */}
      {jadwal && !loadingJadwal && (
        <div className="glass-panel" style={{ padding: '0' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 className="mb-1">Jadwal Seluruh Bulan</h3>
            <p className="text-secondary">{jadwal.bulan_nama} {jadwal.tahun}</p>
          </div>

          <div style={{ overflowX: 'auto', padding: '1rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
              <thead>
                <tr style={{ color: 'var(--accent-secondary)' }}>
                  <th style={{ padding: '1rem 0.5rem', borderBottom: '2px solid rgba(255,255,255,0.1)' }}>Tgl</th>
                  <th style={{ padding: '1rem 0.5rem', borderBottom: '2px solid rgba(255,255,255,0.1)' }}>Imsak</th>
                  <th style={{ padding: '1rem 0.5rem', borderBottom: '2px solid rgba(255,255,255,0.1)' }}>Subuh</th>
                  <th style={{ padding: '1rem 0.5rem', borderBottom: '2px solid rgba(255,255,255,0.1)' }}>Terbit</th>
                  <th style={{ padding: '1rem 0.5rem', borderBottom: '2px solid rgba(255,255,255,0.1)' }}>Dhuha</th>
                  <th style={{ padding: '1rem 0.5rem', borderBottom: '2px solid rgba(255,255,255,0.1)' }}>Dzuhur</th>
                  <th style={{ padding: '1rem 0.5rem', borderBottom: '2px solid rgba(255,255,255,0.1)' }}>Ashar</th>
                  <th style={{ padding: '1rem 0.5rem', borderBottom: '2px solid rgba(255,255,255,0.1)' }}>Maghrib</th>
                  <th style={{ padding: '1rem 0.5rem', borderBottom: '2px solid rgba(255,255,255,0.1)' }}>Isya</th>
                </tr>
              </thead>
              <tbody>
                {jadwal.jadwal.map((hari, idx) => {
                  const isToday = todayString === hari.tanggal_lengkap;
                  
                  return (
                    <tr key={idx} style={{ 
                      backgroundColor: isToday ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                      borderBottom: '1px solid rgba(255,255,255,0.05)'
                    }}>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: isToday ? '700' : '500', color: isToday ? 'var(--accent-primary)' : 'inherit' }}>
                        {hari.tanggal}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>{hari.imsak}</td>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: '600' }}>{hari.subuh}</td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>{hari.terbit}</td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>{hari.dhuha}</td>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: '600' }}>{hari.dzuhur}</td>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: '600' }}>{hari.ashar}</td>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: '600' }}>{hari.maghrib}</td>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: '600' }}>{hari.isya}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default JadwalShalat;
