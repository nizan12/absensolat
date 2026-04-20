import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Book } from 'lucide-react';

const Quran = () => {
  const [surahs, setSurahs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSurahs = async () => {
      try {
        const response = await fetch('https://equran.id/api/v2/surat');
        if (!response.ok) throw new Error('Gagal mengambil data Al-Quran');
        const { data } = await response.json();
        setSurahs(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSurahs();
  }, []);

  const filteredSurahs = surahs.filter(surah => 
    surah.namaLatin.toLowerCase().includes(searchTerm.toLowerCase()) || 
    surah.arti.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-6" style={{ padding: '0 1rem' }}>
        <h2 className="responsive-h1 flex items-center justify-center gap-2" style={{ marginBottom: '0.5rem' }}>
          <Book className="text-primary" />
          Al-Quran Digital
        </h2>
        <p>Baca dan dengarkan lantunan ayat suci Al-Quran</p>
      </div>

      <div className="mb-8 relative max-w-lg mx-auto" style={{ maxWidth: '600px', margin: '0 auto 2.5rem', padding: '0 1rem' }}>
        <input 
          type="text" 
          className="form-input" 
          style={{ paddingLeft: '2.5rem' }}
          placeholder="Cari nama surat atau arti..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Search size={18} className="text-muted" style={{ position: 'absolute', left: '2rem', top: '50%', transform: 'translateY(-50%)' }} />
      </div>

      {loading ? (
        <div className="text-center py-4 text-secondary">
          Memuat daftar surat...
        </div>
      ) : error ? (
        <div className="glass-panel text-center text-danger border-red-500">
          {error}
        </div>
      ) : (
      <div className="grid-mobile" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem', padding: '0 1rem' }}>
          {filteredSurahs.map((surah) => (
            <div 
              key={surah.nomor} 
              className="card flex justify-between items-center"
              onClick={() => navigate(`/quran/${surah.nomor}`)}
            >
              <div className="flex items-center gap-4">
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '50%', 
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: 'var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '600',
                  border: '1px solid rgba(16, 185, 129, 0.2)'
                }}>
                  {surah.nomor}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{surah.namaLatin}</h4>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {surah.tempatTurun} • {surah.jumlahAyat} Ayat
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div style={{ fontSize: '1.5rem', fontFamily: 'serif', color: 'var(--accent-secondary)' }}>
                  {surah.nama}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {surah.arti}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Quran;
