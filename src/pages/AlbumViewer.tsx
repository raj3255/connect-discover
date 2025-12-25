import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Lock, ZoomIn, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Photo {
  id: string;
  url: string;
  isPrivate: boolean;
}

const mockAlbumPhotos: Photo[] = [
  { id: '1', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200', isPrivate: false },
  { id: '2', url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=1200', isPrivate: false },
  { id: '3', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=1200', isPrivate: true },
  { id: '4', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1200', isPrivate: false },
  { id: '5', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1200', isPrivate: true },
];

export default function AlbumViewer() {
  const navigate = useNavigate();
  const { photoId } = useParams();
  
  const initialIndex = photoId 
    ? mockAlbumPhotos.findIndex(p => p.id === photoId) 
    : 0;
  
  const [currentIndex, setCurrentIndex] = useState(initialIndex >= 0 ? initialIndex : 0);
  const [isZoomed, setIsZoomed] = useState(false);

  const currentPhoto = mockAlbumPhotos[currentIndex];

  const goToPrevious = () => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : mockAlbumPhotos.length - 1));
    setIsZoomed(false);
  };

  const goToNext = () => {
    setCurrentIndex(prev => (prev < mockAlbumPhotos.length - 1 ? prev + 1 : 0));
    setIsZoomed(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-4 safe-area-top">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <X className="h-6 w-6" />
        </Button>
        
        <span className="text-foreground font-medium">
          {currentIndex + 1} / {mockAlbumPhotos.length}
        </span>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setIsZoomed(!isZoomed)}>
            <ZoomIn className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Main Photo */}
      <motion.div
        key={currentPhoto.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 flex items-center justify-center"
      >
        {currentPhoto.isPrivate ? (
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={currentPhoto.url}
              alt="Album photo"
              className="w-full h-full object-contain blur-xl opacity-50"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="h-16 w-16 rounded-full bg-card/80 flex items-center justify-center mb-4">
                <Lock className="h-8 w-8 text-foreground" />
              </div>
              <p className="text-foreground font-medium">Private Photo</p>
              <p className="text-sm text-muted-foreground mt-1">
                Request access to view
              </p>
            </div>
          </div>
        ) : (
          <motion.img
            src={currentPhoto.url}
            alt="Album photo"
            className={`w-full h-full object-contain transition-transform duration-300 ${
              isZoomed ? 'scale-150' : 'scale-100'
            }`}
            drag={isZoomed}
            dragConstraints={{ left: -200, right: 200, top: -200, bottom: 200 }}
          />
        )}
      </motion.div>

      {/* Navigation Arrows */}
      <Button
        variant="ghost"
        size="icon"
        onClick={goToPrevious}
        className="absolute left-2 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-card/50 hover:bg-card/80"
      >
        <ChevronLeft className="h-6 w-6" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={goToNext}
        className="absolute right-2 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-card/50 hover:bg-card/80"
      >
        <ChevronRight className="h-6 w-6" />
      </Button>

      {/* Thumbnail Strip */}
      <div className="absolute bottom-8 left-0 right-0 safe-area-bottom">
        <div className="flex items-center justify-center gap-2 px-4 overflow-x-auto">
          {mockAlbumPhotos.map((photo, index) => (
            <motion.button
              key={photo.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => {
                setCurrentIndex(index);
                setIsZoomed(false);
              }}
              className={`relative flex-shrink-0 h-14 w-14 rounded-lg overflow-hidden transition-all ${
                index === currentIndex 
                  ? 'ring-2 ring-primary scale-110' 
                  : 'opacity-60 hover:opacity-100'
              }`}
            >
              <img
                src={photo.url}
                alt=""
                className={`w-full h-full object-cover ${photo.isPrivate ? 'blur-sm' : ''}`}
              />
              {photo.isPrivate && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/40">
                  <Lock className="h-4 w-4 text-foreground" />
                </div>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Swipe hint for touch */}
      <div className="absolute bottom-28 left-0 right-0 text-center">
        <p className="text-xs text-muted-foreground">Swipe to navigate</p>
      </div>
    </div>
  );
}
