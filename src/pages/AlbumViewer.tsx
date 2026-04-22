// src/pages/AlbumViewer.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Lock, ZoomIn, ZoomOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import ApiService from '@/services/apiServices';

interface AlbumPhoto {
  id: string;
  user_id: string;
  photo_url: string;
  thumbnail_url: string;
  caption: string | null;
  is_public: boolean;
  shared_with: any[];
  ownerName?: string;
}

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

export default function AlbumViewer() {
  const navigate = useNavigate();
  const { photoId } = useParams();
  const [searchParams] = useSearchParams();
  const { user: currentUser } = useAuth();

  // Can be 'mine' or a userId to view someone else's shared album
  const viewingUserId = searchParams.get('userId');
  const isViewingOwn = !viewingUserId;

  const [photos, setPhotos] = useState<AlbumPhoto[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isZoomed, setIsZoomed] = useState(false);
  const [hidden, setHidden] = useState(false); // for PrintScreen deterrence
  const imageRef = useRef<HTMLDivElement>(null);

  // ── Screenshot deterrence ─────────────────────────────────────────────────
  useEffect(() => {
    if (isViewingOwn) return; // no need to protect your own photos

    // Hide on PrintScreen
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen' || (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key))) {
        setHidden(true);
        setTimeout(() => setHidden(false), 2000);
        e.preventDefault();
      }
    };

    // Hide on visibility change (alt-tab screenshotters)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setHidden(true);
        setTimeout(() => setHidden(false), 1500);
      }
    };

    // Disable right click
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [isViewingOwn]);

  // ── Load photos ───────────────────────────────────────────────────────────
  useEffect(() => {
    const loadPhotos = async () => {
      try {
        setLoading(true);

        if (isViewingOwn) {
          const res = await ApiService.getMyAlbums();
          if (res.albums) {
            setPhotos(res.albums);
            if (photoId) {
              const idx = res.albums.findIndex((p: AlbumPhoto) => p.id === photoId);
              if (idx >= 0) setCurrentIndex(idx);
            }
          }
        } else {
          // Viewing shared album
          const res = await ApiService.getSharedWithMe();
          const ownerAlbum = res.sharedAlbums?.find((a: any) => a.ownerId === viewingUserId);
          if (ownerAlbum) {
            const photosWithOwner = ownerAlbum.photos.map((p: AlbumPhoto) => ({
              ...p,
              ownerName: ownerAlbum.ownerName,
            }));
            setPhotos(photosWithOwner);
          }
        }
      } catch {
        // handle gracefully
      } finally {
        setLoading(false);
      }
    };

    loadPhotos();
  }, [isViewingOwn, viewingUserId, photoId]);

  const goTo = useCallback((index: number) => {
    setCurrentIndex(index);
    setIsZoomed(false);
  }, []);

  const goToPrev = () => goTo(currentIndex > 0 ? currentIndex - 1 : photos.length - 1);
  const goToNext = () => goTo(currentIndex < photos.length - 1 ? currentIndex + 1 : 0);

  const getFullUrl = (url: string) =>
    url?.startsWith('http') ? url : `${API_BASE}${url}`;

  const currentPhoto = photos[currentIndex];

  if (loading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
      </div>
    );
  }

  if (!photos.length) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center gap-4">
        <Lock className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">No photos to show</p>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black select-none"
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-4 safe-area-top bg-gradient-to-b from-black/60 to-transparent">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <X className="h-6 w-6 text-white" />
        </Button>
        <div className="text-center">
          <span className="text-white font-medium">{currentIndex + 1} / {photos.length}</span>
          {currentPhoto?.ownerName && (
            <p className="text-white/60 text-xs">{currentPhoto.ownerName}'s album</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsZoomed(z => !z)}
        >
          {isZoomed
            ? <ZoomOut className="h-5 w-5 text-white" />
            : <ZoomIn className="h-5 w-5 text-white" />}
        </Button>
      </header>

      {/* Main Photo */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPhoto?.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute inset-0 flex items-center justify-center"
          ref={imageRef}
        >
          {hidden ? (
            // Screenshot deterrence — blank black screen
            <div className="w-full h-full bg-black flex items-center justify-center">
              <p className="text-white/30 text-sm">Screenshot protection active</p>
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
              <motion.img
                src={getFullUrl(currentPhoto.photo_url)}
                alt={currentPhoto.caption || 'Photo'}
                className="max-w-full max-h-full object-contain"
                style={{
                  // CSS pointer events and drag prevention
                  pointerEvents: 'none',
                  WebkitUserDrag: 'none',
                  transform: isZoomed ? 'scale(1.6)' : 'scale(1)',
                  transition: 'transform 0.3s ease',
                }}
                draggable={false}
                onDragStart={e => e.preventDefault()}
              />

              {/* Watermark — viewer's ID in diagonal across the image */}
              {!isViewingOwn && currentUser && (
                <div
                  className="absolute inset-0 pointer-events-none overflow-hidden"
                  style={{ mixBlendMode: 'overlay' }}
                >
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute whitespace-nowrap text-white/20 font-bold text-sm select-none"
                      style={{
                        top: `${10 + i * 18}%`,
                        left: '-10%',
                        transform: 'rotate(-30deg)',
                        letterSpacing: '0.2em',
                        userSelect: 'none',
                      }}
                    >
                      {currentUser.name} • {currentUser.id?.slice(0, 8)} &nbsp;&nbsp;&nbsp;
                      {currentUser.name} • {currentUser.id?.slice(0, 8)} &nbsp;&nbsp;&nbsp;
                      {currentUser.name} • {currentUser.id?.slice(0, 8)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Caption */}
      {currentPhoto?.caption && (
        <div className="absolute bottom-32 left-0 right-0 text-center px-6">
          <p className="text-white/80 text-sm bg-black/40 rounded-full px-4 py-2 inline-block">
            {currentPhoto.caption}
          </p>
        </div>
      )}

      {/* Prev/Next arrows */}
      {photos.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-black/40 hover:bg-black/60"
          >
            <ChevronLeft className="h-6 w-6 text-white" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={goToNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-black/40 hover:bg-black/60"
          >
            <ChevronRight className="h-6 w-6 text-white" />
          </Button>
        </>
      )}

      {/* Thumbnail strip */}
      {photos.length > 1 && (
        <div className="absolute bottom-6 left-0 right-0 safe-area-bottom">
          <div className="flex items-center justify-center gap-2 px-4 overflow-x-auto">
            {photos.map((photo, index) => (
              <motion.button
                key={photo.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => goTo(index)}
                className={`relative flex-shrink-0 h-14 w-14 rounded-lg overflow-hidden transition-all ${
                  index === currentIndex
                    ? 'ring-2 ring-white scale-110'
                    : 'opacity-50 hover:opacity-80'
                }`}
              >
                <img
                  src={getFullUrl(photo.thumbnail_url || photo.photo_url)}
                  alt=""
                  className="w-full h-full object-cover"
                  draggable={false}
                  style={{ pointerEvents: 'none' }}
                />
              </motion.button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}