import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getDeviceFingerprint } from '../utils/fingerprint';
import { LogIn, MapPin } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Authenticate user
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Prevent "titip absen" => Check device fingerprint
      const deviceId = await getDeviceFingerprint();
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        
        // Admin user can log in from anywhere for dashboard access
        if (userData.role !== 'admin') {
          // If the user's recorded fingerprint doesn't match the current device's fingerprint
          if (userData.deviceFingerprint && userData.deviceFingerprint !== deviceId) {
            // Unauthenticate locally to prevent bypass
            await auth.signOut();
            setError('Akses ditolak: Peringatan (Titip Absen). Anda hanya bisa login menggunakan perangkat saat registrasi.');
            setLoading(false);
            return;
          } else if (!userData.deviceFingerprint) {
            // First time migrating old user or edge case
            await updateDoc(userDocRef, { deviceFingerprint: deviceId });
          }
        }
        navigate('/');
      } else {
        // Edge case: user in auth but not firestore
        setError('Data pengguna tidak ditemukan di database.');
        await auth.signOut();
      }
    } catch (error) {
      console.error(error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setError('Email atau password salah');
      } else {
        setError(error.message || 'Gagal login, coba lagi');
      }
    } finally {
      if(!error && loading){
        setLoading(false);
      }
    }
  };

  return (
    <div className="screen-center">
      <div className="glass-panel w-full" style={{ maxWidth: '400px' }}>
        <div className="text-center mb-4">
          <div className="flex justify-center mb-2">
            <MapPin size={40} className="text-primary" />
          </div>
          <h2 className="mb-1">Selamat Datang</h2>
          <p>Login untuk mencatat absen solat hari ini</p>
        </div>

        {error && (
          <div className="glass-panel mb-4 text-center text-danger" style={{ padding: '1rem', borderColor: '#ef4444' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input 
              type="email" 
              className="form-input" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@contoh.com"
            />
          </div>

          <div className="form-group mb-4">
            <label className="form-label">Password</label>
            <input 
              type="password" 
              className="form-input" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="btn w-full mb-4"
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#fff',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '0.5rem',
              border: 'none',
              fontSize: '1.05rem',
              fontWeight: '600',
              padding: '0.85rem',
              borderRadius: '12px',
              boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              if(!loading) e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              if(!loading) e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <LogIn size={20} />
            {loading ? 'Memeriksa Kredensial...' : 'Masuk ke Dashboard'}
          </button>
        </form>

        <p className="text-center" style={{ fontSize: '0.9rem' }}>
          Belum mendaftar? <Link to="/register" className="text-primary" style={{ textDecoration: 'none', fontWeight: '500' }}>Buat akun baru</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
