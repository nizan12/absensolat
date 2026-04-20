import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { getCurrentPosition, calculateDistance } from '../utils/geo';
import { MapPin, Navigation, CheckCircle, AlertCircle } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const AbsenUser = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' }); // type: 'success' | 'error' | 'info'
  const [hasAbsenToday, setHasAbsenToday] = useState(false);

  const [previewLocation, setPreviewLocation] = useState(null);

  useEffect(() => {
    // Check if user already absent today
    const checkAbsenToday = async () => {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const q = query(
        collection(db, 'attendance'),
        where('userId', '==', currentUser.uid),
        where('timestamp', '>=', startOfToday)
      );

      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setHasAbsenToday(true);
        setStatus({ type: 'success', message: 'Anda sudah menunaikan kewajiban absen solat hari ini. Alhamdulillah.' });
      }
    };

    if (currentUser) {
      checkAbsenToday();
    }
  }, [currentUser]);

  const handlePreviewLocation = async () => {
    setStatus({ type: 'info', message: 'Mengambil lokasi Anda untuk pratinjau...' });
    try {
      const position = await getCurrentPosition();
      const { latitude, longitude } = position;
      
      const settingsRef = doc(db, 'settings', 'admin_settings');
      const settingsSnap = await getDoc(settingsRef);
      
      let adminLat = latitude, adminLng = longitude, radius = 50, distance = 0;
      let hasAdmin = false;
      
      if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        adminLat = data.latitude;
        adminLng = data.longitude;
        radius = data.radius_meters || 50;
        distance = calculateDistance(latitude, longitude, adminLat, adminLng);
        hasAdmin = true;
      }

      setPreviewLocation({ 
        userLat: latitude, userLng: longitude, 
        adminLat, adminLng, radius, distance, hasAdmin 
      });
      
      setStatus({ type: 'success', message: 'Titik koordinat berhasil dipetakan!' });
    } catch (error) {
      console.error(error);
      setStatus({ type: 'error', message: 'Gagal mengambil titik. Pastikan izin lokasi aktif.' });
      setPreviewLocation(null);
    }
  };

  const handleAbsen = async () => {
    setLoading(true);
    setStatus({ type: 'info', message: 'Mengambil lokasi Anda...' });

    try {
      // 1. Get current position
      const position = await getCurrentPosition();
      const { latitude: userLat, longitude: userLng } = position;

      // 2. Get Admin Settings
      setStatus({ type: 'info', message: 'Memverifikasi area solat...' });
      const settingsRef = doc(db, 'settings', 'admin_settings');
      const settingsSnap = await getDoc(settingsRef);

      if (!settingsSnap.exists()) {
        throw new Error('Admin belum mengatur titik absensi solat. Silakan hubungi admin.');
      }

      const { latitude: adminLat, longitude: adminLng, radius_meters: radius, shalat_provinsi, shalat_kabkota, shalat_tolerance } = settingsSnap.data();

      // 3. Time Fencing (Validasi Jadwal Shalat)
      let activePrayerName = null;
      if (shalat_provinsi && shalat_kabkota) {
        setStatus({ type: 'info', message: 'Memverifikasi jam shalat...' });
        const shalatRes = await fetch('https://equran.id/api/v2/shalat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provinsi: shalat_provinsi, kabkota: shalat_kabkota })
        });
        const shalatData = await shalatRes.json();
        
        if (shalatData.code === 200 && shalatData.data.jadwal) {
          const currentTime = new Date();
          const pad = n => n.toString().padStart(2, '0');
          const todayString = `${currentTime.getFullYear()}-${pad(currentTime.getMonth() + 1)}-${pad(currentTime.getDate())}`;
          const currentSecs = currentTime.getHours() * 3600 + currentTime.getMinutes() * 60 + currentTime.getSeconds();
          
          const todayJadwal = shalatData.data.jadwal.find(j => j.tanggal_lengkap === todayString);
          
          if (todayJadwal) {
            const prayers = [
              { name: 'Subuh', time: todayJadwal.subuh },
              { name: 'Dzuhur', time: todayJadwal.dzuhur },
              { name: 'Ashar', time: todayJadwal.ashar },
              { name: 'Maghrib', time: todayJadwal.maghrib },
              { name: 'Isya', time: todayJadwal.isya }
            ];
            
            const toleranceSecs = (shalat_tolerance || 60) * 60;
            
            for (const p of prayers) {
              const [h, m] = p.time.split(':').map(Number);
              const pSecs = h * 3600 + m * 60;
              
              if (currentSecs >= pSecs && currentSecs <= (pSecs + toleranceSecs)) {
                 activePrayerName = p.name;
                 break;
              }
            }
            
            if (!activePrayerName) {
              throw new Error(`Belum memasuki waktu shalat. Anda hanya bisa absen dalam batas toleransi ${shalat_tolerance || 60} menit setelah adzan.`);
            }
          }
        }
      }

      // 4. Calculate Distance
      setStatus({ type: 'info', message: 'Memverifikasi geolokasi absen...' });
      const distance = calculateDistance(userLat, userLng, adminLat, adminLng);

      // 5. Validate Distance
      if (!currentUser.allowFakeGPS) {
        if (distance > radius) {
          throw new Error(`Anda berada +/- ${Math.round(distance)} meter dari area solat. Batas maksimal adalah ${radius} meter. Mendekatlah ke area solat yang ditentukan.`);
        }

        // 5.5 Teleportation Check (Anti Fake-GPS)
        setStatus({ type: 'info', message: 'Menganalisis anomali pergerakan...' });
        const attQueryForCheck = query(
          collection(db, 'attendance'),
          where('userId', '==', currentUser.uid)
        );
        const attCheckSnap = await getDocs(attQueryForCheck);
        
        let lastRecord = null;
        let maxTime = 0;
        
        attCheckSnap.forEach(doc => {
          const data = doc.data();
          if (data.timestamp) {
             const t = data.timestamp.toDate().getTime();
             if (t > maxTime) {
               maxTime = t;
               lastRecord = data;
             }
          }
        });

        if (lastRecord && lastRecord.latitude && lastRecord.longitude) {
             const timeDiffSeconds = Math.abs(new Date().getTime() - maxTime) / 1000;
             const distanceMoved = calculateDistance(userLat, userLng, lastRecord.latitude, lastRecord.longitude);
             
             // Validasi batas logis kecepatan gerak manusia/kendaraan (Speed = distance / time)
             // Hanya dihitung jika jarak waktu kurang dari 24 jam (86400 detik)
             if (timeDiffSeconds > 0 && timeDiffSeconds < 86400) { 
               const speedMetersPerSecond = distanceMoved / timeDiffSeconds;
               // Batas 340 m/s (~1200 km/h) = Kecepatan Pesawat Jet. Jika melebihi ini dalam jeda waktu singkat, itu pasti script teleport (Fake GPS).
               if (speedMetersPerSecond > 340) {
                 throw new Error(`Peringatan Anti-Fraud! Perubahan lokasi trlampau mustahil secara fisik (Indikasi Teleport/Fake GPS). Harap matikan aplikasi pembajak lokasi Anda.`);
               }
             }
        }
      } else {
        setStatus({ type: 'info', message: 'Izin Bypass Fake-GPS Aktif!' });
      }

      // 6. Submit Absen
      setStatus({ type: 'info', message: 'Menyimpan data kehadiran...' });
      await addDoc(collection(db, 'attendance'), {
        userId: currentUser.uid,
        userName: currentUser.name || currentUser.email,
        latitude: userLat,
        longitude: userLng,
        distanceMeters: distance,
        prayerName: activePrayerName || 'Regular',
        timestamp: serverTimestamp()
      });

      setStatus({ type: 'success', message: `Absen berhasil! Posisi Anda terdeteksi berjarak ${Math.round(distance)}m dari titik pusat.` });
      setHasAbsenToday(true);

    } catch (error) {
      console.error(error);
      setStatus({ type: 'error', message: error.message || 'Gagal merekam posisi.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-lg mx-auto" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div className="text-center mb-4">
        <h2>Absen Solat</h2>
        <p>Pastikan Anda berada di area solat yang telah ditentukan.</p>
      </div>

      <div className="glass-panel text-center">
        {!hasAbsenToday ? (
          <>
            <div className="flex justify-center mb-4">
              <div style={{ 
                background: 'rgba(16, 185, 129, 0.1)', 
                padding: '1.5rem', 
                borderRadius: '50%',
                display: 'inline-flex'
              }}>
                <Navigation size={48} className="text-primary" />
              </div>
            </div>

            <h3 className="mb-2">Ketuk untuk Absen</h3>
            <p className="mb-4 text-muted">Sistem akan mencatat lokasi perangkat Anda dan mengkalkulasi jarak.</p>

            {status.message && (
              <div className={`glass-panel mb-4 text-center ${status.type === 'error' ? 'text-danger' : 'text-primary'}`} 
                   style={{ padding: '1rem', borderColor: status.type === 'error' ? '#ef4444' : (status.type === 'info' ? 'rgba(255,255,255,0.1)' : '#10b981') }}>
                <div className="flex items-center justify-center gap-2">
                  {status.type === 'error' && <AlertCircle size={18} />}
                  {status.type === 'success' && <CheckCircle size={18} />}
                  {status.message}
                </div>
              </div>
            )}

            {/* Preview Blok Koordinat & Maps */}
            {previewLocation && (
              <div style={{
                background: '#0a0f16', border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem',
                textAlign: 'left', overflow: 'hidden'
              }}>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.5rem' }}>Peta Posisi Perangkat Anda:</div>
                
                {/* MAP Container */}
                <div style={{ height: '220px', width: '100%', borderRadius: '8px', overflow: 'hidden', marginBottom: '1rem', position: 'relative', zIndex: 1 }}>
                  <MapContainer 
                    center={[previewLocation.userLat, previewLocation.userLng]} 
                    zoom={17} 
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={false}
                  >
                    <TileLayer 
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    
                    {/* Area Admin */}
                    {previewLocation.hasAdmin && (
                      <>
                        <Circle 
                          center={[previewLocation.adminLat, previewLocation.adminLng]} 
                          radius={previewLocation.radius} 
                          pathOptions={{ fillColor: '#10b981', fillOpacity: 0.2, color: '#10b981', weight: 2 }} 
                        />
                        {/* Jika user JAUH dari radius, tampilkan titik pusat Admin sebagai pembanding ganda */}
                        {previewLocation.distance > previewLocation.radius && (
                          <Marker position={[previewLocation.adminLat, previewLocation.adminLng]}>
                            <Popup>Titik Target Absensi</Popup>
                          </Marker>
                        )}
                      </>
                    )}

                    {/* Titik User */}
                    <Marker position={[previewLocation.userLat, previewLocation.userLng]}>
                      <Popup>Lokasi Anda ({Math.round(previewLocation.distance)}m ke pusat)</Popup>
                    </Marker>
                  </MapContainer>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'monospace', color: previewLocation.distance <= previewLocation.radius ? '#10b981' : '#ef4444', fontSize: '1rem' }}>
                  <MapPin size={16} /> 
                  <div>Lat: {previewLocation.userLat.toFixed(6)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'monospace', color: previewLocation.distance <= previewLocation.radius ? '#10b981' : '#ef4444', fontSize: '1rem', marginTop: '0.3rem' }}>
                  <span style={{ width: '16px' }}></span> 
                  <div>Lng: {previewLocation.userLng.toFixed(6)}</div>
                </div>

                {previewLocation.hasAdmin && (
                  previewLocation.distance > previewLocation.radius ? (
                    <div style={{ marginTop: '0.8rem', color: '#ef4444', fontSize: '0.85rem', background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: '8px' }}>
                      Peringatan: Posisi Anda {Math.round(previewLocation.distance)} meter dari area absensi. Lebih {Math.round(previewLocation.distance - previewLocation.radius)}m dari toleransi.
                    </div>
                  ) : (
                    <div style={{ marginTop: '0.8rem', color: '#10b981', fontSize: '0.85rem', background: 'rgba(16, 185, 129, 0.1)', padding: '0.5rem', borderRadius: '8px' }}>
                      Jarak Aman ({Math.round(previewLocation.distance)}m). Anda berada tepat di dalam zona solat!
                    </div>
                  )
                )}
              </div>
            )}

            <div className="flex flex-col-mobile" style={{ gap: '1rem' }}>
              <button 
                onClick={handlePreviewLocation} 
                className="btn"
                style={{ flex: 1, fontSize: '1rem', padding: '1rem', background: '#1e293b', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                Pratinjau Titik
              </button>

              <button 
                onClick={handleAbsen} 
                disabled={loading} 
                className="btn btn-primary"
                style={{ flex: 2, fontSize: '1.1rem', padding: '1rem' }}
              >
                {loading ? 'Memproses...' : 'Rekam Kehadiran'}
              </button>
            </div>
          </>
        ) : (
          <div className="py-4">
            <div className="flex justify-center mb-4 text-success animate-fade-in">
              <CheckCircle size={64} />
            </div>
            <h3>Alhamdulillah</h3>
            <p className="mt-2 text-secondary">
              Anda telah tercatat hadir pada solat kali ini. <br/>
              Semoga ibadah Anda diterima oleh Allah SWT.
            </p>
          </div>
        )}
      </div>

      <div className="glass-panel mt-4 p-4 text-center">
        <h4 className="flex justify-center items-center gap-2 mb-2">
          <MapPin size={18} className="text-secondary" />
          Pro-Tip Geolocation
        </h4>
        <p style={{ fontSize: '0.9rem' }}>
          Pastikan fitur GPS/Lokasi menyala dan Anda memberikan izin <b>(Allow)</b> pada browser ketika kotak dialog muncul. Tingkat akurasi bergantung pada perangkat Anda.
        </p>
      </div>
    </div>
  );
};

export default AbsenUser;
