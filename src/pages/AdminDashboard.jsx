import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, getDocs, collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { MapPin, Users, Target, Save, Clock, Search, Navigation, Shield, UserCog, Smartphone, Map } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet';
import CustomSelect from '../components/CustomSelect';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { getCurrentPosition } from '../utils/geo';

// Fix for default marker icons in react-leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// Component to handle map clicks for setting coordinates
const MapEvents = ({ setLat, setLng }) => {
  useMapEvents({
    click(e) {
      setLat(e.latlng.lat);
      setLng(e.latlng.lng);
    },
  });
  return null;
};

// Component to dynamically update map center
const MapUpdater = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center[0] && center[1]) {
      map.flyTo(center, map.getZoom());
    }
  }, [center, map]);
  return null;
};

const UserManagementTab = () => {
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

  const showToast = (msg, type = 'info') => {
    setToast({ show: true, message: msg, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: '' });
    }, 3000);
  };

  const fetchUsers = async () => {
    try {
      const q = query(collection(db, 'users'));
      const snap = await getDocs(q);
      const data = [];
      snap.forEach(doc => data.push({id: doc.id, ...doc.data()}));
      setUsersList(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const toggleRole = async (userId, currentRole) => {
    if (currentRole === 'super-admin') {
      showToast("Gagal: Super Admin tidak dapat diturunkan.", 'danger');
      return;
    }
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    await updateDoc(doc(db, 'users', userId), { role: newRole });
    showToast(`Sukses: Hak akses diubah menjadi ${newRole.toUpperCase()}`, 'success');
    fetchUsers();
  };

  const resetDevice = async (userId) => {
    await updateDoc(doc(db, 'users', userId), { deviceFingerprint: null });
    showToast('Sukses: Kunci perangkat HP pengguna berhasil direset.', 'success');
    fetchUsers();
  };

  const toggleFakeGPS = async (userId, currentVal) => {
    const newVal = !currentVal;
    await updateDoc(doc(db, 'users', userId), { allowFakeGPS: newVal });
    showToast(newVal ? 'Bypass Fake GPS Diaktifkan' : 'Izin Bypass Fake GPS Dicabut', 'success');
    fetchUsers();
  };

  if (loading) return <div>Memuat data pengguna...</div>;

  return (
    <div className="glass-panel" style={{ padding: '2rem' }}>
      <div className="flex items-center gap-2 mb-6">
        <UserCog className="text-primary" />
        <h2>Manajemen Pengguna Terdaftar</h2>
      </div>
      
      <div className="table-responsive">
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <th style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)' }}>Email</th>
              <th style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)' }}>Role</th>
              <th style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)' }}>Bypass Fake GPS</th>
              <th style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)' }}>Perangkat (Device)</th>
              <th style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)' }}>Aksi / Operasi</th>
            </tr>
          </thead>
          <tbody>
            {usersList.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '1rem 0.5rem' }}>
                  <div style={{ fontWeight: '500' }}>{u.name || 'NN'}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{u.email}</div>
                </td>
                <td style={{ padding: '1rem 0.5rem' }}>
                  <span style={{ 
                    background: u.role === 'super-admin' ? 'rgba(239, 68, 68, 0.2)' : (u.role === 'admin' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)'), 
                    color: u.role === 'super-admin' ? '#ef4444' : (u.role === 'admin' ? 'var(--accent-primary)' : '#fff'),
                    padding: '0.25rem 0.75rem', borderRadius: '99px', fontSize: '0.8rem', fontWeight: 'bold'
                  }}>
                    {u.role ? u.role.toUpperCase() : 'USER'}
                  </span>
                </td>
                <td style={{ padding: '1rem 0.5rem' }}>
                  <div 
                    onClick={() => toggleFakeGPS(u.id, u.allowFakeGPS)}
                    style={{
                      width: '40px', height: '22px', background: u.allowFakeGPS ? '#10b981' : '#1d232c', 
                      borderRadius: '99px', position: 'relative', cursor: 'pointer', transition: 'background 0.2s'
                    }}
                  >
                    <div style={{
                      width: '18px', height: '18px', background: '#fff', borderRadius: '50%', position: 'absolute', top: '2px', 
                      left: u.allowFakeGPS ? '20px' : '2px', transition: 'left 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}></div>
                  </div>
                </td>
                <td style={{ padding: '1rem 0.5rem' }}>
                  {u.deviceFingerprint ? (
                    <span className="flex items-center gap-1 text-success" style={{ fontSize: '0.85rem' }}><Smartphone size={14} /> Terkunci</span>
                  ) : (
                    <span className="text-secondary" style={{ fontSize: '0.85rem' }}>Bebas (Belum Aktif)</span>
                  )}
                </td>
                <td style={{ padding: '1rem 0.5rem' }}>
                  <div className="flex gap-2">
                    <button onClick={() => toggleRole(u.id, u.role)} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                      {u.role === 'admin' ? 'Turunkan' : 'Jadikan Admin'}
                    </button>
                    <button onClick={() => resetDevice(u.id)} className="btn" disabled={!u.deviceFingerprint} style={{ 
                      padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' 
                    }}>
                      Reset Alat
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <div 
          className="animate-fade-in"
          style={{ 
            position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
            background: toast.type === 'danger' ? '#ef4444' : '#10b981',
            color: '#fff', padding: '1rem 1.5rem', borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
};

const AdminDashboard = () => {
  const { userRole } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [radius, setRadius] = useState('50');
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  // Shalat Fencing State
  const [provinsiList, setProvinsiList] = useState([]);
  const [kabkotaList, setKabkotaList] = useState([]);
  const [selectedProvinsi, setSelectedProvinsi] = useState('');
  const [selectedKabkota, setSelectedKabkota] = useState('');
  const [shalatTolerance, setShalatTolerance] = useState('60');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [attendances, setAttendances] = useState([]);
  
  // 1. Fetch Provinsi List on mount
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
    const fetchKabKota = async () => {
      try {
        const response = await fetch('https://equran.id/api/v2/shalat/kabkota', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provinsi: selectedProvinsi })
        });
        const data = await response.json();
        if (data.code === 200) {
          setKabkotaList(data.data);
        }
      } catch (err) {
        console.error("Failed to fetch kabkota", err);
      }
    };
    fetchKabKota();
  }, [selectedProvinsi]);

  useEffect(() => {
    // Fetch settings
    const fetchSettings = async () => {
      const docRef = doc(db, 'settings', 'admin_settings');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.latitude) setLat(data.latitude);
        if (data.longitude) setLng(data.longitude);
        if (data.radius_meters) setRadius(data.radius_meters);
        if (data.shalat_provinsi) setSelectedProvinsi(data.shalat_provinsi);
        if (data.shalat_kabkota) setSelectedKabkota(data.shalat_kabkota);
        if (data.shalat_tolerance !== undefined) setShalatTolerance(data.shalat_tolerance);
      } else {
        // Default to Jakarta if not set
        setLat(-6.200000);
        setLng(106.816666);
      }
    };
    fetchSettings();

    // Subscribe to attendance records
    const q = query(collection(db, 'attendance'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const records = [];
      querySnapshot.forEach((doc) => {
        records.push({ id: doc.id, ...doc.data() });
      });
      setAttendances(records);
    });

    return () => unsubscribe();
  }, []);

  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setMessage('');
    
    try {
      await setDoc(doc(db, 'settings', 'admin_settings'), {
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        radius_meters: parseInt(radius, 10),
        shalat_provinsi: selectedProvinsi,
        shalat_kabkota: selectedKabkota,
        shalat_tolerance: parseInt(shalatTolerance, 10),
        updatedAt: new Date()
      });
      setMessage('Pengaturan berhasil disimpan!');
    } catch (error) {
      console.error(error);
      setMessage('Gagal menyimpan pengaturan.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchLocation = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchError('');
    
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      
      if (data && data.length > 0) {
        setLat(parseFloat(data[0].lat));
        setLng(parseFloat(data[0].lon));
        setSearchQuery(data[0].display_name); // Update query with full found location name
      } else {
        setSearchError('Lokasi tidak ditemukan. Coba kata kunci lain (misal: "Monas, Jakarta").');
      }
    } catch (err) {
      console.error(err);
      setSearchError('Gagal mencari lokasi periksa koneksi internet Anda.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleUseMyLocation = async () => {
    setSearchError('');
    try {
      const pos = await getCurrentPosition();
      setLat(pos.latitude);
      setLng(pos.longitude);
      setSearchQuery('Lokasi Saya Saat Ini');
    } catch (error) {
      console.error(error);
      setSearchError('Gagal mendapatkan lokasi. Pastikan GPS menyala dan izin browser diberikan.');
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    // Firestore timestamp
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('id-ID', {
      weekday: 'long', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit', 
      minute:'2-digit'
    });
  };

  // Safe coordinates for map
  const mapCenter = lat && lng ? [parseFloat(lat), parseFloat(lng)] : [-6.200000, 106.816666];
  const safeRadius = radius ? parseInt(radius, 10) : 50;

  return (
    <div className="animate-fade-in">
      <div className="mb-4">
        <h2>Dashboard Admin</h2>
        <p>Atur titik lokasi absensi solat dan pantau kehadiran jamaah.</p>
      </div>

      {/* Tab Navigation */}
      {userRole === 'super-admin' && (
        <div className="flex gap-2 mb-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <button 
            onClick={() => setActiveTab('dashboard')}
            style={{ 
              padding: '1rem 1.5rem', background: 'transparent', border: 'none', cursor: 'pointer',
              color: activeTab === 'dashboard' ? '#10b981' : '#94a3b8',
              borderBottom: activeTab === 'dashboard' ? '2px solid #10b981' : '2px solid transparent',
              fontWeight: activeTab === 'dashboard' ? '600' : '400',
              display: 'flex', alignItems: 'center', gap: '0.5rem'
            }}
          >
            <Map size={18} /> Radar & Absensi
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            style={{ 
              padding: '1rem 1.5rem', background: 'transparent', border: 'none', cursor: 'pointer',
              color: activeTab === 'users' ? '#10b981' : '#94a3b8',
              borderBottom: activeTab === 'users' ? '2px solid #10b981' : '2px solid transparent',
              fontWeight: activeTab === 'users' ? '600' : '400',
              display: 'flex', alignItems: 'center', gap: '0.5rem'
            }}
          >
            <Shield size={18} /> Manajemen Karyawan
          </button>
        </div>
      )}

      {activeTab === 'users' && userRole === 'super-admin' ? (
        <UserManagementTab />
      ) : (
        <div className="flex flex-col-mobile" style={{ gap: '2rem', flexWrap: 'wrap' }}>
        {/* Settings Panel */}
        <div className="glass-panel" style={{ flex: '1', minWidth: '300px', padding: '1.5rem' }}>
          <div className="flex items-center gap-2 mb-4">
            <Target className="text-primary" />
            <h3 style={{ fontSize: '1.25rem' }}>Pengaturan Lokasi</h3>
          </div>
          
          {message && (
            <div className={`glass-panel mb-4 text-center ${message.includes('berhasil') ? 'text-success' : 'text-danger'}`} style={{ padding: '0.75rem', borderColor: message.includes('berhasil') ? '#10b981' : '#ef4444' }}>
              {message}
            </div>
          )}

          {/* Search Bar */}
          <div className="mb-4">
            <label className="form-label">Cari Tempat / Alamat</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                className="form-input" 
                placeholder="Cari lokasi (misal: Masjid Istiqlal)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchLocation()}
              />
              <button 
                type="button"
                className="btn btn-secondary"
                onClick={handleSearchLocation}
                disabled={isSearching}
                style={{ padding: '0.75rem' }}
              >
                <Search size={18} />
              </button>
              <button 
                type="button"
                className="btn btn-primary"
                title="Gunakan Lokasi Saya"
                onClick={handleUseMyLocation}
                style={{ padding: '0.75rem' }}
              >
                <Navigation size={18} />
              </button>
            </div>
            {searchError && <p className="text-danger mt-1" style={{ fontSize: '0.85rem' }}>{searchError}</p>}
          </div>

          {/* Map Container */}
          <div style={{ height: '300px', width: '100%', marginBottom: '1.5rem', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
            <MapContainer 
              center={mapCenter} 
              zoom={15} 
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <MapUpdater center={mapCenter} />
              <MapEvents setLat={setLat} setLng={setLng} />
              {lat && lng && (
                <>
                  <Marker position={mapCenter} />
                  <Circle 
                    center={mapCenter} 
                    radius={safeRadius} 
                    pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.2 }}
                  />
                </>
              )}
            </MapContainer>
          </div>

          <form onSubmit={handleSaveSettings}>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label className="form-label">Latitude</label>
                <input 
                  type="number" 
                  step="any"
                  className="form-input" 
                  required
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label className="form-label">Longitude</label>
                <input 
                  type="number" 
                  step="any"
                  className="form-input" 
                  required
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                />
              </div>
            </div>
            
            <div className="form-group mb-4">
              <label className="form-label">Batas Radius Absen (Meter)</label>
              <input 
                type="number" 
                className="form-input" 
                required
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
              />
              <p className="text-muted mt-2" style={{ fontSize: '0.85rem' }}>
                *Klik lokasi di peta, cari alamat, atau gunakan GPS Anda. Form ini akan terisi otomatis.
              </p>
            </div>

            <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
              <h3 className="flex items-center gap-2 mb-3" style={{ fontSize: '1.1rem', color: '#10b981' }}>
                <Clock size={18} /> Verifikasi Jam Shalat (Time-Fencing)
              </h3>
              
              <div className="form-group mb-3">
                <label className="form-label text-secondary">Provinsi Masjid/Kantor</label>
                <CustomSelect 
                  value={selectedProvinsi}
                  onChange={setSelectedProvinsi}
                  options={provinsiList}
                  placeholder="-- Pilih Provinsi --"
                />
              </div>
              
              <div className="form-group mb-3">
                <label className="form-label text-secondary">Kota/Kabupaten Masjid</label>
                <CustomSelect 
                  value={selectedKabkota}
                  onChange={setSelectedKabkota}
                  options={kabkotaList}
                  placeholder="-- Pilih Kota/Kab. --"
                  disabled={!selectedProvinsi || kabkotaList.length === 0}
                />
              </div>
              
              <div className="form-group mb-0">
                <label className="form-label text-secondary">Toleransi Waktu Sah Absen (Menit)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={shalatTolerance}
                  onChange={(e) => setShalatTolerance(e.target.value)}
                />
                <p className="mt-1" style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  Jangka waktu (menit) karyawan sah melakukan absensi terhitung sejak waktu adzan pas tiba.
                </p>
              </div>
            </div>
            
            <button type="submit" disabled={loading} className="btn btn-primary w-full">
              <Save size={18} />
              {loading ? 'Menyimpan...' : 'Simpan Pengaturan Utama'}
            </button>
          </form>
        </div>

        {/* Data Panel */}
        <div className="glass-panel" style={{ flex: '2', minWidth: '300px', alignSelf: 'flex-start' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="text-secondary" />
              <h3 style={{ fontSize: '1.25rem' }}>Riwayat Absensi Terbaru</h3>
            </div>
            <span className="text-primary" style={{ fontWeight: '600' }}>{attendances.length} Total</span>
          </div>

          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)' }}>Nama</th>
                  <th style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)' }}>Waktu</th>
                  <th style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)' }}>Lokasi (Lat, Lng)</th>
                  <th style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)' }}>Jarak (m)</th>
                  <th style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {attendances.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center" style={{ padding: '2rem' }}>Belum ada data kehadiran</td>
                  </tr>
                ) : (
                  attendances.map(record => (
                    <tr key={record.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '1rem 0.5rem', fontWeight: '500' }}>{record.userName}</td>
                      <td style={{ padding: '1rem 0.5rem' }}>
                        <div className="flex items-center gap-2 text-secondary" style={{ fontSize: '0.9rem' }}>
                          <Clock size={14} />
                          {formatDate(record.timestamp)}
                        </div>
                      </td>
                      <td style={{ padding: '1rem 0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        {record.latitude?.toFixed(5)}, {record.longitude?.toFixed(5)}
                      </td>
                      <td style={{ padding: '1rem 0.5rem' }}>
                        {record.distanceMeters ? Math.round(record.distanceMeters) : '-'} m
                      </td>
                      <td style={{ padding: '1rem 0.5rem' }}>
                        <span style={{ 
                          background: 'rgba(16, 185, 129, 0.2)', 
                          color: 'var(--accent-primary)',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '99px',
                          fontSize: '0.85rem',
                          fontWeight: '500'
                        }}>
                          Hadir
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
