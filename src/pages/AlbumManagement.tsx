import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, Reorder } from 'framer-motion';
import { ArrowLeft, Plus, Trash2, Lock, Unlock, GripVertical, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface Photo {
  id: string;
  url: string;
  isPrivate: boolean;
}

const mockPhotos: Photo[] = [
  { id: '1', url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400', isPrivate: false },
  { id: '2', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', isPrivate: false },
  { id: '3', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400', isPrivate: true },
  { id: '4', url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400', isPrivate: true },
];

export default function AlbumManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [photos, setPhotos] = useState<Photo[]>(mockPhotos);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const togglePrivacy = (id: string) => {
    setPhotos(prev => prev.map(p => 
      p.id === id ? { ...p, isPrivate: !p.isPrivate } : p
    ));
    toast({
      title: "Privacy updated",
      description: "Photo privacy setting changed.",
    });
  };

  const deleteSelected = () => {
    setPhotos(prev => prev.filter(p => !selectedIds.includes(p.id)));
    setSelectedIds([]);
    toast({
      title: "Photos deleted",
      description: `${selectedIds.length} photo(s) removed from album.`,
    });
  };

  const publicPhotos = photos.filter(p => !p.isPrivate);
  const privatePhotos = photos.filter(p => p.isPrivate);

  return (
    <div className="min-h-screen bg-background">
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
        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between px-4 pb-3">
            <span className="text-sm text-muted-foreground">
              {selectedIds.length} selected
            </span>
            <Button variant="destructive" size="sm" onClick={deleteSelected}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        )}
      </header>

      <div className="px-4 py-6 space-y-8">
        {/* Add Photo Button */}
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full py-12 rounded-2xl border-2 border-dashed border-border flex flex-col items-center gap-3 hover:border-primary/50 transition-colors"
        >
          <div className="h-14 w-14 rounded-full gradient-primary flex items-center justify-center">
            <Plus className="h-7 w-7 text-primary-foreground" />
          </div>
          <span className="text-muted-foreground font-medium">Add Photos</span>
        </motion.button>

        {/* Public Photos */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Unlock className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Public Photos</h2>
            <span className="text-sm text-muted-foreground">({publicPhotos.length})</span>
          </div>
          <Reorder.Group axis="x" values={publicPhotos} onReorder={() => {}} className="grid grid-cols-3 gap-2">
            {publicPhotos.map((photo, index) => (
              <Reorder.Item key={photo.id} value={photo}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className={`relative aspect-square rounded-xl overflow-hidden group cursor-pointer ${
                    selectedIds.includes(photo.id) ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => toggleSelect(photo.id)}
                >
                  <img
                    src={photo.url}
                    alt="Album photo"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="h-5 w-5 text-foreground drop-shadow-lg" />
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); togglePrivacy(photo.id); }}
                    className="absolute bottom-2 right-2 h-8 w-8 rounded-full bg-card/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Lock className="h-4 w-4 text-foreground" />
                  </button>
                </motion.div>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </section>

        {/* Private Photos */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Lock className="h-5 w-5 text-accent" />
            <h2 className="text-lg font-semibold text-foreground">Private Photos</h2>
            <span className="text-sm text-muted-foreground">({privatePhotos.length})</span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Only visible to users you share your album with.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {privatePhotos.map((photo, index) => (
              <motion.div
                key={photo.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className={`relative aspect-square rounded-xl overflow-hidden group cursor-pointer ${
                  selectedIds.includes(photo.id) ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => toggleSelect(photo.id)}
              >
                <img
                  src={photo.url}
                  alt="Album photo"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute top-2 right-2">
                  <div className="h-6 w-6 rounded-full bg-accent/20 flex items-center justify-center">
                    <Lock className="h-3 w-3 text-accent" />
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); togglePrivacy(photo.id); }}
                  className="absolute bottom-2 right-2 h-8 w-8 rounded-full bg-card/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Unlock className="h-4 w-4 text-foreground" />
                </button>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
