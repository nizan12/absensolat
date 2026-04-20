import React, { useState, useEffect } from 'react';
import { Search, Share2, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CustomSelect from '../components/CustomSelect';

const Doa = () => {
  const [doas, setDoas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '' });
  const navigate = useNavigate();

  const showToast = (msg) => {
    setToast({ show: true, message: msg });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  useEffect(() => {
    const fetchDoas = async () => {
      try {
        const response = await fetch('https://equran.id/api/doa');
        if (!response.ok) throw new Error('Gagal mengambil data doa');
        const json = await response.json();
        const doaData = json.data || json; 
        setDoas(Array.isArray(doaData) ? doaData : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDoas();
  }, []);

  const groups = [...new Set(doas.map(d => d.grup).filter(Boolean))];
  const tags = [...new Set(doas.flatMap(d => d.tag || []))];

  const filteredDoas = doas.filter(doa => {
    const matchSearch = doa.nama?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        doa.idn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        doa.grup?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchGroup = selectedGroup ? doa.grup === selectedGroup : true;
    const matchTag = selectedTag ? doa.tag?.includes(selectedTag) : true;
    return matchSearch && matchGroup && matchTag;
  });

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '4rem' }}>
      {/* Header section matching screenshot exactly */}
      <div className="text-center" style={{ textAlign: 'center', marginTop: '2rem', marginBottom: '2.5rem', padding: '0 1rem' }}>
        <h2 className="responsive-h1" style={{ marginBottom: '1rem', fontWeight: '600' }}>
          Kumpulan Doa Harian
        </h2>
        <p className="text-secondary" style={{ maxWidth: '700px', margin: '0 auto 1.5rem', lineHeight: '1.6', fontSize: '1rem' }}>
          Doa-doa harian dalam Islam lengkap dengan teks Arab, transliterasi, dan terjemahan bahasa Indonesia
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ background: 'rgba(255,255,255,0.08)', padding: '0.4rem 1.25rem', borderRadius: '99px', fontSize: '0.85rem', fontWeight: '500', color: '#e2e8f0' }}>
            {doas.length} Doa
          </span>
          <span style={{ background: 'rgba(255,255,255,0.08)', padding: '0.4rem 1.25rem', borderRadius: '99px', fontSize: '0.85rem', fontWeight: '500', color: '#e2e8f0' }}>
            {groups.length} Kategori
          </span>
        </div>
      </div>

      {/* Search and Filter Row */}
      <div style={{ maxWidth: '1000px', margin: '0 auto 2.5rem auto', position: 'relative', zIndex: 100, padding: '0 1rem' }}>
        <div style={{ position: 'relative', marginBottom: '1rem' }}>
          <input 
            type="text" 
            className="form-input"
            style={{ paddingLeft: '3rem' }}
            placeholder="Cari doa berdasarkan nama, isi, atau kategori..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search size={20} className="text-muted" style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)' }} />
        </div>

        <div className="grid-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <CustomSelect 
            value={selectedGroup}
            onChange={setSelectedGroup}
            options={groups}
            placeholder="Semua Kategori"
          />
          <CustomSelect 
            value={selectedTag}
            onChange={setSelectedTag}
            options={tags}
            placeholder="Semua Tag"
          />
        </div>
      </div>

      <div className="text-center text-muted" style={{ fontSize: '0.9rem', marginBottom: '2.5rem' }}>
        Menampilkan {filteredDoas.length} dari {doas.length} doa
      </div>

      {loading ? (
        <div className="text-center py-4 text-secondary">
          Memuat daftar doa...
        </div>
      ) : error ? (
        <div className="glass-panel text-center text-danger">
          {error}
        </div>
      ) : (
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
        gap: '1rem',
        padding: '0 1rem',
        alignItems: 'stretch' 
      }}>
          {filteredDoas.map((doa) => (
            <div key={doa.id} style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              background: '#0d1117', 
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              overflow: 'hidden',
              height: '100%' 
            }}>
              {/* Card Header (Greenish Tint) */}
              <div style={{ 
                background: 'linear-gradient(to bottom, #10191c, #0f151b)', 
                padding: '1.5rem 1.5rem 1rem 1.5rem',
                borderBottom: '1px solid rgba(255,255,255,0.03)'
              }}>
                <h3 style={{ fontSize: '1.25rem', color: '#10b981', marginBottom: '1rem', fontWeight: '500', lineHeight: '1.4' }}>
                  {doa.nama}
                </h3>
                {doa.grup && (
                  <span style={{
                    display: 'inline-block',
                    padding: '0.3rem 0.8rem',
                    borderRadius: '99px',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    background: 'rgba(16, 185, 129, 0.05)',
                    color: '#10b981',
                    fontSize: '0.75rem',
                    fontWeight: '500'
                  }}>
                    {doa.grup}
                  </span>
                )}
              </div>

              {/* Card Body (Dark Tint) */}
              <div style={{ background: '#11161d', padding: '1.5rem', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                
                <div className="text-secondary" style={{ 
                  fontSize: '0.9rem', 
                  lineHeight: '1.6',
                  display: '-webkit-box',
                  WebkitLineClamp: '3',
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  marginBottom: '1rem',
                  color: '#94a3ba'
                }}>
                  {doa.tentang || doa.idn}
                </div>

                {doa.tag && doa.tag.length > 0 && (
                  <div className="flex gap-2 mb-4" style={{ flexWrap: 'wrap' }}>
                    {doa.tag.map((t, idx) => (
                      <span key={idx} style={{
                        padding: '0.3rem 0.8rem',
                        borderRadius: '99px',
                        background: '#1d232c',
                        border: '1px solid rgba(255,255,255,0.05)',
                        color: '#cbd5e1',
                        fontSize: '0.75rem',
                        fontWeight: '500'
                      }}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 mt-auto">
                  <button 
                    onClick={() => navigate(`/doa/${doa.id}`)}
                    style={{ 
                      flex: 1,
                      background: '#0ca46d', 
                      color: '#000', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '0.5rem',
                      borderRadius: '12px', 
                      padding: '0.75rem',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: '600',
                      transition: 'opacity 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
                    onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                  >
                    <BookOpen size={18} /> Baca
                  </button>
                  <button 
                    style={{ 
                      background: '#1d232c', 
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '12px',
                      padding: '0 1rem',
                      color: '#cbd5e1',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background 0.2s'
                    }}
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: doa.nama,
                          text: `${doa.nama}\n\n${doa.ar}\n\nArtinya: ${doa.idn}`,
                        }).catch(console.error);
                      } else {
                        navigator.clipboard.writeText(`${doa.nama}\n\n${doa.ar}\n\nArtinya: ${doa.idn}`);
                        showToast('Berhasil disalin ke clipboard!');
                      }
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#272e38'}
                    onMouseOut={(e) => e.currentTarget.style.background = '#1d232c'}
                  >
                    <Share2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Doa;
