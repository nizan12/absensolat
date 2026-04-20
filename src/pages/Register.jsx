import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getDeviceFingerprint } from '../utils/fingerprint';
import { MapPin, UserPlus } from 'lucide-react';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Get device fingerprint
      const deviceId = await getDeviceFingerprint();

      // Create user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Always set role to 'user' by default for new registrations.
      // Roles can be elevated to 'admin' or 'super-admin' by an existing administrator.
      const userRole = 'user';

      // Save user to Firestore
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name,
        email,
        role: userRole,
        deviceFingerprint: deviceId, // Store the fingerprint!
        createdAt: serverTimestamp()
      });

      navigate('/');
    } catch (error) {
      console.error(error);
      setError(error.message || 'Gagal melakukan pendaftaran');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen-center">
      <div className="glass-panel w-full" style={{ maxWidth: '400px' }}>
        <div className="text-center mb-4">
          <div className="flex justify-center mb-2">
            <MapPin size={40} className="text-primary" />
          </div>
          <h2 className="mb-1">Daftar Akun Baru</h2>
          <p>Mulai catat absen solat Anda dengan aman</p>
        </div>

        {error && (
          <div className="glass-panel mb-4 text-center text-danger" style={{ padding: '1rem', borderColor: '#ef4444' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label className="form-label">Nama Lengkap</label>
            <input 
              type="text" 
              className="form-input" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Fulan bin Fulan"
            />
          </div>

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
              placeholder="Minimal 6 karakter"
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
            <UserPlus size={20} />
            {loading ? 'Memproses...' : 'Daftar Sekarang'}
          </button>
        </form>

        <p className="text-center" style={{ fontSize: '0.9rem' }}>
          Sudah punya akun? <Link to="/login" className="text-primary" style={{ textDecoration: 'none', fontWeight: '500' }}>Masuk di sini</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
