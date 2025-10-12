import React, { useEffect, useRef, useState } from 'react';
import { Play, Search, Menu } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}
const PLAYLIST_ID = 'PLVYgTYFS0Aca3jm8IKRnewA-BzAdNLP0_';
const YT_API_KEY = 'AIzaSyD8wSGi4aFT7-go-CzL0GpPUg2USnAAlMc';
export default function Lectures() {
  const [videoIdToTitle, setVideoIdToTitle] = useState<Record<string, string>>({});
  const [currentTitle, setCurrentTitle] = useState('Loading playlist...');
  const [currentIndex, setCurrentIndex] = useState('');
  const [playlistIds, setPlaylistIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{
    vid: string;
    title: string;
    channel: string;
    thumb: string;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
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
          iv_load_policy: 3
        },
        events: {
          onReady: onPlayerReady,
          onStateChange: onPlayerStateChange
        }
      });
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.code === 'Space' && playerRef.current?.getPlayerState) {
        e.preventDefault();
        const state = playerRef.current.getPlayerState();
        if (state === window.YT.PlayerState.PLAYING) playerRef.current.pauseVideo();else playerRef.current.playVideo();
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
    setIsLoading(false);
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

    // Only rebuild if playlist is empty (optimization)
    if (pl.children.length === 0) {
      const fragment = document.createDocumentFragment();
      ids.forEach((id: string, idx: number) => {
        const item = document.createElement('div');
        item.className = 'plist-item';
        if (idx === activeIndex) item.classList.add('active');
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

          // Update active state
          pl.querySelectorAll('.plist-item').forEach(el => el.classList.remove('active'));
          item.classList.add('active');
        };
        item.addEventListener('click', playAtIndex);
        item.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            playAtIndex();
          }
        });
        fragment.appendChild(item);
      });
      pl.appendChild(fragment);
    }
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
    setActiveIndex(index);

    // highlight active
    const pl = playlistRef.current;
    if (pl) {
      Array.from(pl.querySelectorAll('.plist-item')).forEach((n, i) => {
        const vid = ids[i];
        const h3 = n.querySelector('h3');
        if (h3 && videoIdToTitle[vid]) h3.textContent = videoIdToTitle[vid];
      });
      const activeEl = pl.querySelector(`.plist-item[data-index="${index}"]`);
      if (activeEl) (activeEl as HTMLElement).scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  };
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
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
        playerRef.current.cuePlaylist({
          playlist: playlistIds,
          index,
          startSeconds: 0
        });
      } else if (playerRef.current?.cuePlaylist) {
        playerRef.current.cuePlaylist({
          list: PLAYLIST_ID,
          index,
          startSeconds: 0
        });
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
      const newTitles: Record<string, string> = {};
      (vdata.items || []).forEach((v: any) => {
        newTitles[v.id] = v.snippet?.title || '';
      });
      setVideoIdToTitle(newTitles);
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
        const res = await fetch(url.toString(), {
          signal: controller.signal
        });
        const data = await res.json();
        const items = (data.items || []) as any[];
        const KEYWORDS = ['science', 'scientific', 'physics', 'chemistry', 'biology', 'biological', 'astronomy', 'space', 'geology', 'earth', 'neuroscience', 'math', 'mathematics', 'algebra', 'geometry', 'calculus', 'trigonometry', 'probability', 'statistics'];
        const filtered = items.filter(it => {
          const t = ((it.snippet?.title || '') + ' ' + (it.snippet?.description || '')).toLowerCase();
          return KEYWORDS.some(k => t.includes(k));
        }).slice(0, 10);
        setSearchResults(filtered.map((it: any) => ({
          vid: it.id?.videoId || it.id,
          title: it.snippet?.title || 'Untitled',
          channel: it.snippet?.channelTitle || '',
          thumb: it.snippet?.thumbnails?.medium?.url || ''
        })));
      } catch {
        setSearchResults([]);
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);
  return <div className="min-h-screen bg-background">
      {/* YouTube-like Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="flex h-16 items-center gap-4 px-4 md:px-6">
          
          
          <div className="flex items-center gap-2 font-semibold text-lg">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground font-bold shadow-lg">
              <Play className="h-5 w-5 fill-current" />
            </div>
            <span className="hidden sm:inline">JEE Lectures</span>
          </div>

          <div className="flex-1 max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search lectures..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 bg-secondary border-border" />
            </div>
          </div>
        </div>
      </header>

      {/* Search Results Dropdown */}
      {searchResults.length > 0 && <div className="fixed top-16 left-0 right-0 z-40 px-4 md:px-6 animate-fade-in">
          <div className="max-w-2xl mx-auto mt-2">
            <div className="bg-card border rounded-lg shadow-lg overflow-hidden">
              <ScrollArea className="max-h-[60vh]">
                {searchResults.map(result => <div key={result.vid} onClick={() => {
              try {
                playerRef.current?.loadVideoById?.(result.vid);
                setSearchQuery('');
                setSearchResults([]);
              } catch {}
            }} className="flex gap-3 p-3 hover:bg-accent/50 cursor-pointer transition-colors group">
                    <div className="relative w-40 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                      <img src={result.thumb || `https://i.ytimg.com/vi/${result.vid}/mqdefault.jpg`} alt={result.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="h-8 w-8 text-white fill-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm line-clamp-2 mb-1">{result.title}</h4>
                      <p className="text-xs text-muted-foreground">{result.channel}</p>
                    </div>
                  </div>)}
              </ScrollArea>
            </div>
          </div>
        </div>}

      {/* Main Content */}
      <main className="container mx-auto px-4 md:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_420px] gap-6">
          {/* Video Player Section */}
          <div className="space-y-4 animate-fade-in">
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-lg">
              {isLoading && <div className="absolute inset-0 flex items-center justify-center">
                  <Skeleton className="w-full h-full" />
                </div>}
              <div id="yt-player" className="w-full h-full"></div>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-xl md:text-2xl font-bold line-clamp-2">{currentTitle}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="font-medium">Video {currentIndex}</span>
              </div>
            </div>
          </div>

          {/* Playlist Sidebar */}
          <div className="lg:sticky lg:top-20 h-fit">
            <div className="bg-card rounded-xl border shadow-card overflow-hidden">
              <div className="p-4 border-b bg-muted/30">
                <h2 className="font-semibold text-lg">Playlist</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {playlistIds.length} videos
                </p>
              </div>
              
              <ScrollArea className="h-[calc(100vh-280px)] lg:h-[calc(100vh-200px)]">
                <div ref={playlistRef} className="p-2 space-y-1">
                  {isLoading ? Array.from({
                  length: 5
                }).map((_, i) => <div key={i} className="flex gap-3 p-2">
                        <Skeleton className="w-32 h-20 rounded-lg" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-3 w-2/3" />
                        </div>
                      </div>) : null}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        .plist-item {
          display: flex;
          gap: 12px;
          padding: 10px;
          border-radius: 8px;
          cursor: pointer;
          align-items: center;
          transition: all 0.2s ease;
          position: relative;
        }
        
        .plist-item:hover {
          background: hsl(var(--accent) / 0.1);
        }
        
        .plist-item.active {
          background: hsl(var(--primary) / 0.1);
          border-left: 3px solid hsl(var(--primary));
        }
        
        .plist-item.active .thumb::after {
          content: '';
          position: absolute;
          inset: 0;
          border: 2px solid hsl(var(--primary));
          border-radius: 8px;
        }
        
        .plist-item:focus-visible {
          outline: 2px solid hsl(var(--ring));
          outline-offset: 2px;
        }
        
        .thumb {
          width: 128px;
          height: 72px;
          border-radius: 8px;
          background: hsl(var(--muted));
          background-size: cover;
          background-position: center;
          flex-shrink: 0;
          position: relative;
          overflow: hidden;
          transition: transform 0.3s ease;
        }
        
        .plist-item:hover .thumb {
          transform: scale(1.05);
        }
        
        .thumb::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.3), transparent);
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        
        .plist-item:hover .thumb::before {
          opacity: 1;
        }
        
        .pmeta {
          flex: 1;
          min-width: 0;
        }
        
        .pmeta h3 {
          font-size: 14px;
          margin: 0 0 4px 0;
          font-weight: 500;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .plist-item.active .pmeta h3 {
          color: hsl(var(--primary));
          font-weight: 600;
        }

        @media (max-width: 768px) {
          .thumb {
            width: 112px;
            height: 63px;
          }
          
          .pmeta h3 {
            font-size: 13px;
          }
        }

        @media (max-width: 640px) {
          .thumb {
            width: 100px;
            height: 56px;
          }
          
          .plist-item {
            gap: 10px;
            padding: 8px;
          }
          
          .pmeta h3 {
            font-size: 12px;
          }
        }

        iframe {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border: 0;
        }
      `}</style>
    </div>;
}