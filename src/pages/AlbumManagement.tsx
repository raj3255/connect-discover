// src/pages/AlbumManagement.tsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Trash2, Lock, Unlock, Share2, Loader2, ImagePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import ApiService from '@/services/apiServices';

interface AlbumPhoto {
  id: string;
  user_id: string;
  photo_url: string;
  thumbnail_url: string;
  caption: string | null;
  is_public: boolean;
  shared_with: any[];
  created_at: string;
}

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

export default function AlbumManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<AlbumPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load photos on mount
  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    try {
      setLoading(true);
      const res = await ApiService.getMyAlbums();
      if (res.albums) setPhotos(res.albums);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load photos', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploading(true);
    let successCount = 0;

    for (const file of files) {
      try {
        const res = await ApiService.uploadAlbumPhoto(file);
        if (res.success && res.album) {
          setPhotos(prev => [res.album, ...prev]);
          successCount++;
        }
      } catch {
        // continue uploading others
      }
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';

    toast({
      title: successCount === files.length ? 'Uploaded!' : 'Partial upload',
      description: `${successCount}/${files.length} photo(s) uploaded`,
      variant: successCount === 0 ? 'destructive' : 'default',
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const deleteSelected = async () => {
    const toDelete = [...selectedIds];
    setSelectedIds([]);

    for (const id of toDelete) {
      setDeletingId(id);
      try {
        await ApiService.deleteAlbumPhoto(id);
        setPhotos(prev => prev.filter(p => p.id !== id));
      } catch {
        toast({ title: 'Error', description: `Failed to delete photo`, variant: 'destructive' });
      }
    }

    setDeletingId(null);
    toast({ title: 'Deleted', description: `${toDelete.length} photo(s) removed` });
  };

  const deleteSingle = async (id: string) => {
    setDeletingId(id);
    try {
      await ApiService.deleteAlbumPhoto(id);
      setPhotos(prev => prev.filter(p => p.id !== id));
      toast({ title: 'Deleted', description: 'Photo removed' });
    } catch {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  const getFullUrl = (url: string) =>
    url.startsWith('http') ? url : `${API_BASE}${url}`;

  const privatePhotos = photos.filter(p => !p.is_public);
  const publicPhotos = photos.filter(p => p.is_public);

  return (
    <div className="min-h-screen bg-background">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 glass safe-area-top">
        <div className="flex items-center justify-between px-4 h-14">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground">My Album</h1>
          <Button variant="ghost" size="icon" onClick={() => navigate('/album-sharing')}>
            <Share2 className="h-5 w-5" />
          </Button>
        </div>

        <AnimatePresence>
          {selectedIds.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="flex items-center justify-between px-4 pb-3"
            >
              <span className="text-sm text-muted-foreground">{selectedIds.length} selected</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
                  <X className="h-4 w-4 mr-1" /> Clear
                </Button>
                <Button variant="destructive" size="sm" onClick={deleteSelected}>
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <div className="px-4 py-6 space-y-8">
        {/* Upload Button */}
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full py-10 rounded-2xl border-2 border-dashed border-border flex flex-col items-center gap-3 hover:border-primary/50 transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <span className="text-muted-foreground font-medium">Uploading...</span>
            </>
          ) : (
            <>
              <div className="h-14 w-14 rounded-full gradient-primary flex items-center justify-center">
                <Plus className="h-7 w-7 text-primary-foreground" />
              </div>
              <span className="text-muted-foreground font-medium">Add Photos</span>
              <span className="text-xs text-muted-foreground">JPG, PNG, WebP up to 10MB</span>
            </>
          )}
        </motion.button>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!loading && photos.length === 0 && (
          <div className="text-center py-12">
            <ImagePlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No photos yet</p>
            <p className="text-sm text-muted-foreground mt-1">Tap above to add your first photo</p>
          </div>
        )}

        {/* Private Photos */}
        {!loading && privatePhotos.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Lock className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Private Photos</h2>
              <span className="text-sm text-muted-foreground">({privatePhotos.length})</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Only visible to users you share your album with.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {privatePhotos.map((photo, index) => (
                <PhotoCard
                  key={photo.id}
                  photo={photo}
                  index={index}
                  selected={selectedIds.includes(photo.id)}
                  deleting={deletingId === photo.id}
                  onSelect={toggleSelect}
                  onDelete={deleteSingle}
                  getUrl={getFullUrl}
                />
              ))}
            </div>
          </section>
        )}

        {/* Public Photos */}
        {!loading && publicPhotos.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Unlock className="h-5 w-5 text-green-500" />
              <h2 className="text-lg font-semibold text-foreground">Public Photos</h2>
              <span className="text-sm text-muted-foreground">({publicPhotos.length})</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {publicPhotos.map((photo, index) => (
                <PhotoCard
                  key={photo.id}
                  photo={photo}
                  index={index}
                  selected={selectedIds.includes(photo.id)}
                  deleting={deletingId === photo.id}
                  onSelect={toggleSelect}
                  onDelete={deleteSingle}
                  getUrl={getFullUrl}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

// ─── Photo Card Sub-component ─────────────────────────────────────────────────
function PhotoCard({
  photo,
  index,
  selected,
  deleting,
  onSelect,
  onDelete,
  getUrl,
}: {
  photo: AlbumPhoto;
  index: number;
  selected: boolean;
  deleting: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  getUrl: (url: string) => string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.04 }}
      className={`relative aspect-square rounded-xl overflow-hidden group cursor-pointer ${
        selected ? 'ring-2 ring-primary' : ''
      } ${deleting ? 'opacity-40' : ''}`}
      onClick={() => onSelect(photo.id)}
    >
      <img
        src={getUrl(photo.thumbnail_url || photo.photo_url)}
        alt={photo.caption || 'Album photo'}
        className="w-full h-full object-cover"
        loading="lazy"
      />

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Delete button */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(photo.id); }}
        className="absolute top-2 right-2 h-7 w-7 rounded-full bg-destructive/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {deleting ? (
          <Loader2 className="h-3 w-3 text-white animate-spin" />
        ) : (
          <X className="h-3 w-3 text-white" />
        )}
      </button>

      {/* Private badge */}
      {!photo.is_public && (
        <div className="absolute top-2 left-2">
          <div className="h-5 w-5 rounded-full bg-black/50 flex items-center justify-center">
            <Lock className="h-3 w-3 text-white" />
          </div>
        </div>
      )}

      {/* Selected checkmark */}
      {selected && (
        <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
            <span className="text-white text-sm font-bold">✓</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}