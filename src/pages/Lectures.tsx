import React, { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

const PLAYLIST_ID = 'PLVYgTYFS0Aca3jm8IKRnewA-BzAdNLP0_';
const YT_API_KEY = 'AIzaSyD8wSGi4aFT7-go-CzL0GpPUg2USnAAlMc';

export default function Lectures() {
  const [videoIdToTitle] = useState<Record<string, string>>({});
  const [currentTitle, setCurrentTitle] = useState('Loading playlist...');
  const [currentIndex, setCurrentIndex] = useState('');
  const [playlistIds, setPlaylistIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ vid: string; title: string; channel: string; thumb: string }>>([]);
  const playlistRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  // Inject YouTube IFrame API and build once ready
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(script);

    window.onYouTubeIframeAPIReady = () => {
      playerRef.current = new window.YT.Player('yt-player', {
        height: '360',
        width: '640',
        playerVars: {
          listType: 'playlist',
          list: PLAYLIST_ID,
          autoplay: 0,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          fs: 1,
          iv_load_policy: 3,
        },
        events: {
          onReady: onPlayerReady,
          onStateChange: onPlayerStateChange,
        },
      });
    };

    const keyHandler = (e: KeyboardEvent) => {
      if (e.code === 'Space' && playerRef.current?.getPlayerState) {
        e.preventDefault();
        const state = playerRef.current.getPlayerState();
        if (state === window.YT.PlayerState.PLAYING) playerRef.current.pauseVideo();
        else playerRef.current.playVideo();
      }
    };
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('keydown', keyHandler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPlayerReady = () => {
    try {
      playerRef.current?.pauseVideo?.();
    } catch {}
    setTimeout(buildPlaylistUI, 600);
    fetchPlaylistMetadata();
  };

  const onPlayerStateChange = () => {
    updateCurrentInfo();
  };

  const buildPlaylistUI = () => {
    const ids = playerRef.current?.getPlaylist?.() || [];
    if (!ids || ids.length === 0) {
      setCurrentTitle('Unable to load playlist (try reloading).');
      return;
    }
    setPlaylistIds(ids);
    const pl = playlistRef.current;
    if (!pl) return;
    pl.innerHTML = '';

    ids.forEach((id: string, idx: number) => {
      const item = document.createElement('div');
      item.className = 'plist-item';
      item.dataset.index = String(idx);
      item.tabIndex = 0;
      item.setAttribute('role', 'button');
      item.setAttribute('aria-label', `Play Lecture ${idx + 1}`);

      const thumb = document.createElement('div');
      thumb.className = 'thumb';
      thumb.style.backgroundImage = `url(https://i.ytimg.com/vi/${id}/hqdefault.jpg)`;

      const meta = document.createElement('div');
      meta.className = 'pmeta';
      const title = document.createElement('h3');
      title.textContent = 'Lecture ' + (idx + 1);
      meta.appendChild(title);
      item.appendChild(thumb);
      item.appendChild(meta);

      const playAtIndex = () => {
        const targetIndex = parseInt(item.dataset.index || '0', 10);
        cuePlaylistAt(targetIndex);
        updateUrlHash(targetIndex);
        scrollToTop();
      };
      item.addEventListener('click', playAtIndex);
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          playAtIndex();
        }
      });

      pl.appendChild(item);
    });

    updateCurrentInfo();

    const startIndex = getIndexFromHash();
    if (startIndex != null && !Number.isNaN(startIndex)) {
      try {
        cuePlaylistAt(startIndex);
      } catch {}
    }
  };

  const updateCurrentInfo = () => {
    const index = playerRef.current?.getPlaylistIndex?.() ?? 0;
    const ids = (playerRef.current?.getPlaylist?.() || []) as string[];
    const id = ids[index] || ids[0] || '';
    setCurrentIndex(`${index + 1} / ${ids.length}`);
    const fallback = id ? `Lecture ${index + 1}` : 'Lecture';
    const titleText = videoIdToTitle[id] || fallback;
    setCurrentTitle(titleText);

    // highlight active
    const pl = playlistRef.current;
    if (pl) {
      Array.from(pl.querySelectorAll('.plist-item')).forEach((n, i) => {
        const isActive = i === index;
        (n as HTMLElement).style.opacity = isActive ? '1' : '0.75';
        (n as HTMLElement).style.background = isActive ? 'rgba(255,255,255,0.04)' : 'transparent';
        n.setAttribute('aria-current', isActive ? 'true' : 'false');
        const h3 = n.querySelector('h3');
        const vid = ids[i];
        if (h3 && videoIdToTitle[vid]) h3.textContent = videoIdToTitle[vid];
      });
      const activeEl = pl.querySelector(`.plist-item[data-index="${index}"]`);
      if (activeEl) (activeEl as HTMLElement).scrollIntoView({ block: 'nearest' });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updateUrlHash = (index: number) => {
    try {
      const newHash = `#v=${index}`;
      if (location.hash !== newHash) history.replaceState(null, '', newHash);
    } catch {}
  };

  const getIndexFromHash = () => {
    const m = location.hash.match(/v=(\d+)/);
    return m ? parseInt(m[1], 10) : null;
  };

  const cuePlaylistAt = (index: number) => {
    try {
      if (Array.isArray(playlistIds) && playlistIds.length > 0 && playerRef.current?.cuePlaylist) {
        playerRef.current.cuePlaylist({ playlist: playlistIds, index, startSeconds: 0 });
      } else if (playerRef.current?.cuePlaylist) {
        playerRef.current.cuePlaylist({ list: PLAYLIST_ID, index, startSeconds: 0 });
      }
    } catch {}
  };

  const fetchPlaylistMetadata = async () => {
    try {
      const itemsUrl = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
      itemsUrl.searchParams.set('key', YT_API_KEY);
      itemsUrl.searchParams.set('part', 'snippet,contentDetails');
      itemsUrl.searchParams.set('maxResults', '50');
      itemsUrl.searchParams.set('playlistId', PLAYLIST_ID);
      const res = await fetch(itemsUrl.toString());
      const data = await res.json();
      const ids = (data.items || []).map((i: any) => i.contentDetails?.videoId).filter(Boolean);
      if (ids.length === 0) return;
      const videosUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
      videosUrl.searchParams.set('key', YT_API_KEY);
      videosUrl.searchParams.set('part', 'snippet');
      videosUrl.searchParams.set('id', ids.join(','));
      const vres = await fetch(videosUrl.toString());
      const vdata = await vres.json();
      (vdata.items || []).forEach((v: any) => {
        videoIdToTitle[v.id] = v.snippet?.title || '';
      });
      updateCurrentInfo();
    } catch {}
  };

  // Debounced YouTube search handled in React (avoid inline <script> template strings)
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const q = searchQuery.trim();
      if (!q) {
        setSearchResults([]);
        return;
      }
      try {
        const url = new URL('https://www.googleapis.com/youtube/v3/search');
        url.searchParams.set('key', YT_API_KEY);
        url.searchParams.set('part', 'snippet');
        url.searchParams.set('type', 'video');
        url.searchParams.set('safeSearch', 'moderate');
        url.searchParams.set('relevanceLanguage', 'en');
        url.searchParams.set('maxResults', '25');
        url.searchParams.set('q', q);
        const res = await fetch(url.toString(), { signal: controller.signal });
        const data = await res.json();
        const items = (data.items || []) as any[];
        const KEYWORDS = ['science','scientific','physics','chemistry','biology','biological','astronomy','space','geology','earth','neuroscience','math','mathematics','algebra','geometry','calculus','trigonometry','probability','statistics'];
        const filtered = items.filter((it) => {
          const t = ((it.snippet?.title || '') + ' ' + (it.snippet?.description || '')).toLowerCase();
          return KEYWORDS.some((k) => t.includes(k));
        }).slice(0, 10);
        setSearchResults(
          filtered.map((it: any) => ({
            vid: it.id?.videoId || it.id,
            title: it.snippet?.title || 'Untitled',
            channel: it.snippet?.channelTitle || '',
            thumb: it.snippet?.thumbnails?.medium?.url || '',
          }))
        );
      } catch {
        setSearchResults([]);
      }
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-gradient-hero p-4 md:p-6">
      {/* Local styles adapted to global theme (uses .dark class) */}
      <style>{`
        :root{--bg:#f8fafc;--card:#ffffff;--muted:#475569;--accent:#ef4444;--text:#0b1220;--border:rgba(2,6,23,0.08)}
        .dark{--bg:#0f0f10;--card:#0b0b0c;--muted:#bfc3c8;--accent:#ff0000;--text:#e6e6e6;--border:rgba(255,255,255,0.08)}
        .lectures-body{color:var(--text);background:linear-gradient(180deg,var(--card) 0%, var(--bg) 100%)}
        .topbar{height:64px;background:var(--card);display:flex;align-items:center;gap:16px;padding:0 16px;border-bottom:1px solid var(--border);position:sticky;top:0;z-index:20;backdrop-filter:saturate(120%) blur(6px)}
        .logo{display:flex;align-items:center;gap:10px;font-weight:700;font-size:18px}
        .logo .mark{width:36px;height:36px;border-radius:6px;background:linear-gradient(90deg,#ff4d4d,#ff0000);display:inline-flex;align-items:center;justify-content:center;font-weight:800;box-shadow:0 6px 16px rgba(239,68,68,0.25)}
        .container{display:grid;grid-template-columns:1fr 360px;gap:24px;padding:20px;max-width:1200px;margin:18px auto}
        @media (min-width:1400px){.container{max-width:1400px;grid-template-columns:1.2fr 420px}}
        .player-card{background:var(--card);border-radius:12px;box-shadow:0 6px 18px rgba(2,6,23,0.6);padding:16px;display:flex;flex-direction:column;position:relative;z-index:1}
        .player-wrap{position:relative;border-radius:10px;overflow:hidden;background:#000;aspect-ratio:16/9}
        iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
        .meta{display:flex;align-items:center;justify-content:space-between;padding-top:12px;gap:8px;flex-wrap:wrap}
        .meta h1{font-size:18px;margin:0;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .meta .row{display:flex;gap:10px;align-items:center;flex-shrink:0}
        .playlist{}
        .plist-item{display:flex;gap:10px;padding:10px;border-radius:8px;cursor:pointer;align-items:center}
        .plist-item:hover{background:rgba(255,255,255,0.02)}
        .plist-item:focus-visible{outline:2px solid rgba(255,255,255,0.12);outline-offset:2px}
        .thumb{width:120px;height:67.5px;border-radius:6px;background:#111;background-size:cover;background-position:center;flex-shrink:0}
        .pmeta{flex:1}
        .pmeta h3{font-size:14px;margin:0 0 6px 0}
        .search{position:relative;display:flex;align-items:center}
        .search input{width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);background:rgba(255,255,255,0.03);color:inherit}
        .search-results{position:absolute;left:0;right:0;top:64px;margin:0 auto;max-width:900px;padding:0 16px;z-index:30}
        .results-panel{background:var(--card);border:1px solid var(--border);border-radius:10px;box-shadow:0 10px 30px rgba(2,6,23,0.35);overflow:hidden}
        .result-item{display:flex;gap:10px;padding:10px;align-items:center;cursor:pointer}
        .result-item:hover{background:rgba(255,255,255,0.04)}
        .result-thumb{width:120px;height:67.5px;border-radius:6px;background:#111;background-size:cover;background-position:center;flex-shrink:0}
        .result-meta h4{margin:0 0 4px 0;font-size:14px}
        .result-meta small{color:var(--muted)}
        @media (min-width:901px){.playlist{position:sticky;top:80px;max-height:calc(100vh - 120px);overflow:auto;padding-right:4px;z-index:0}}
        @media (max-width:900px){.container{grid-template-columns:1fr}.playlist{order:2}}
        @media (max-width:768px){.container{padding:16px;margin:12px auto}.meta h1{font-size:16px}.thumb{width:110px;height:61.9px}}
        @media (max-width:600px){.container{padding:12px}.plist-item{gap:8px;padding:8px}.thumb{width:100px;height:56.25px}.pmeta h3{font-size:13px}.pmeta p{font-size:11px}.meta h1{white-space:normal}}
        @media (max-width:420px){.thumb{width:96px;height:54px}.meta{flex-direction:column;align-items:flex-start;gap:6px}.meta h1{font-size:15px}}
      `}</style>

      <div className="lectures-body">
        <div className="topbar">
          <div className="logo"><div className="mark">L</div> Lectures</div>
          <br />
          <div className="search" style={{ flex: 1 }}>
            <input id="yt-search" placeholder="Search" autoComplete="off" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>
        <div className="search-results" id="searchResults" style={{ display: searchResults.length ? 'block' : 'none' }}>
          {searchResults.length > 0 && (
            <div className="results-panel">
              {searchResults.map((it) => (
                <div key={it.vid} className="result-item" onClick={() => {
                  try {
                    playerRef.current?.loadVideoById?.(it.vid);
                    setSearchQuery('');
                    setSearchResults([]);
                  } catch {}
                }}>
                  <div className="result-thumb" style={{ backgroundImage: `url('${it.thumb || `https://i.ytimg.com/vi/${it.vid}/mqdefault.jpg`}')` }} />
                  <div className="result-meta">
                    <h4>{it.title}</h4>
                    <small>{it.channel}</small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <main className="container">
          <section className="player-card">
            <div id="yt-player" className="player-wrap"></div>
            <div className="meta">
              <h1>{currentTitle}</h1>
              <div className="row"><small>{currentIndex}</small></div>
            </div>
          </section>

          <aside className="playlist" ref={playlistRef}></aside>
        </main>
      </div>

      {/* Search handled via React; no inline script to avoid template parsing issues */}
    </div>
  );
}


