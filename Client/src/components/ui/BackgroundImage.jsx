import { useState } from 'react';
import useUserStore from '@/store/userStore';

const UNSPLASH_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY || '';
const PEXELS_KEY   = import.meta.env.VITE_PEXELS_API_KEY || '';

const CURATED = [
  { id:'c1', thumb:'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&q=60', full:'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1600&q=80', label:'Library' },
  { id:'c2', thumb:'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&q=60', full:'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1600&q=80', label:'Mountains' },
  { id:'c3', thumb:'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&q=60', full:'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1600&q=80', label:'Night sky' },
  { id:'c4', thumb:'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=400&q=60', full:'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=1600&q=80', label:'Books' },
  { id:'c5', thumb:'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=400&q=60', full:'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1600&q=80', label:'Office' },
  { id:'c6', thumb:'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400&q=60', full:'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1600&q=80', label:'Forest' },
  { id:'c7', thumb:'https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?w=400&q=60', full:'https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?w=1600&q=80', label:'Ocean' },
  { id:'c8', thumb:'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=400&q=60', full:'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=1600&q=80', label:'Cafe' },
  { id:'c9', thumb:'https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=400&q=60', full:'https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=1600&q=80', label:'Desk' },
];

export default function BackgroundImage() {
  const setBgImage = useUserStore((s) => s.setBgImage);
  const bgImageUrl = useUserStore((s) => s.bgImageUrl);
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [tab, setTab]         = useState('curated');

  async function handleSearch(e) {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true); setError('');
    try {
      if (UNSPLASH_KEY) {
        const res  = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=9&orientation=landscape&client_id=${UNSPLASH_KEY}`);
        const data = await res.json();
        setResults((data.results||[]).map(p=>({ id:p.id, thumb:p.urls.small, full:p.urls.regular, label:p.alt_description||'' })));
      } else if (PEXELS_KEY) {
        const res  = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=9&orientation=landscape`, { headers:{ Authorization: PEXELS_KEY } });
        const data = await res.json();
        setResults((data.photos||[]).map(p=>({ id:String(p.id), thumb:p.src.medium, full:p.src.large2x, label:p.photographer })));
      } else {
        const filtered = CURATED.filter(c=>c.label.toLowerCase().includes(query.toLowerCase()));
        setResults(filtered.length ? filtered : CURATED);
      }
    } catch { setError('Images load nahi hui. Try again.'); }
    finally { setLoading(false); }
  }

  const list = tab === 'curated' ? CURATED : results;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {['curated','search'].map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${tab===t?'bg-orange-500 text-white':'bg-slate-800 text-slate-400 hover:text-slate-200'}`}>
            {t==='curated'?'📸 Curated':'🔍 Search'}
          </button>
        ))}
      </div>

      {tab==='search' && (
        <form onSubmit={handleSearch} className="flex gap-2">
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="mountains, library..."
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-orange-500"/>
          <button type="submit" disabled={loading}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium rounded-lg disabled:opacity-50">
            {loading?'...':'Search'}
          </button>
        </form>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}

      {bgImageUrl && (
        <div className="flex items-center gap-3 bg-slate-800 rounded-lg p-2">
          <img src={bgImageUrl} alt="Current" className="w-14 h-9 object-cover rounded"/>
          <span className="text-xs text-slate-400 flex-1">Current background</span>
          <button onClick={()=>setBgImage('')} className="text-xs text-red-400 hover:text-red-300">Remove</button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {list.map(photo=>(
          <button key={photo.id} type="button" onClick={()=>setBgImage(photo.full)}
            className={`relative rounded-lg overflow-hidden aspect-video group ${bgImageUrl===photo.full?'ring-2 ring-orange-500':''}`}>
            <img src={photo.thumb} alt={photo.label} className="w-full h-full object-cover transition-transform group-hover:scale-105" loading="lazy"/>
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end justify-center pb-1">
              <span className="text-white text-[9px] opacity-0 group-hover:opacity-100 transition-opacity truncate px-1">{photo.label}</span>
            </div>
            {bgImageUrl===photo.full && (
              <div className="absolute inset-0 bg-orange-500/20 flex items-center justify-center">
                <span className="text-white text-lg">✓</span>
              </div>
            )}
          </button>
        ))}
        {tab==='search' && !loading && results.length===0 && (
          <div className="col-span-3 text-center py-6 text-slate-600 text-xs">
            {UNSPLASH_KEY||PEXELS_KEY ? 'Upar search karo' : 'Curated images dekho ya .env mein VITE_UNSPLASH_ACCESS_KEY add karo'}
          </div>
        )}
      </div>
    </div>
  );
}
