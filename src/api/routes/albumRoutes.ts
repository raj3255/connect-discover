// Album Routes - Upload, Share, Delete photos
// Backend: PostgreSQL + Storage (S3/Cloudinary/etc.)

export interface Album {
  id: string;
  userId: string;
  name: string;
  description?: string;
  coverPhoto?: string;
  isPrivate: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Photo {
  id: string;
  albumId: string;
  url: string;
  thumbnailUrl: string;
  caption?: string;
  order: number;
  createdAt: Date;
}

export interface AlbumShare {
  id: string;
  albumId: string;
  sharedWithUserId: string;
  permission: 'view' | 'edit';
  createdAt: Date;
}

export interface AlbumRoutes {
  // GET /api/albums - Get user's albums
  getAlbums: () => Promise<Album[]>;
  
  // GET /api/albums/:id - Get single album with photos
  getAlbum: (albumId: string) => Promise<Album & { photos: Photo[] }>;
  
  // POST /api/albums - Create album
  createAlbum: (data: { name: string; description?: string; isPrivate?: boolean }) => Promise<Album>;
  
  // PUT /api/albums/:id - Update album
  updateAlbum: (albumId: string, data: Partial<Album>) => Promise<Album>;
  
  // DELETE /api/albums/:id - Delete album
  deleteAlbum: (albumId: string) => Promise<void>;
  
  // POST /api/albums/:id/photos - Upload photos to album
  uploadPhotos: (albumId: string, files: File[]) => Promise<Photo[]>;
  
  // DELETE /api/albums/:albumId/photos/:photoId - Delete photo
  deletePhoto: (albumId: string, photoId: string) => Promise<void>;
  
  // PUT /api/albums/:albumId/photos/reorder - Reorder photos
  reorderPhotos: (albumId: string, photoIds: string[]) => Promise<void>;
  
  // POST /api/albums/:id/share - Share album with user
  shareAlbum: (albumId: string, userId: string, permission: 'view' | 'edit') => Promise<AlbumShare>;
  
  // DELETE /api/albums/:albumId/share/:userId - Revoke share
  revokeShare: (albumId: string, userId: string) => Promise<void>;
  
  // GET /api/albums/shared - Get albums shared with current user
  getSharedAlbums: () => Promise<Album[]>;
}

// Example Express.js route handlers:
/*
router.get('/albums', authenticate, async (req, res) => {
  const albums = await db.query(`
    SELECT a.*, 
      (SELECT url FROM photos p WHERE p.album_id = a.id ORDER BY p.order LIMIT 1) as cover_photo,
      (SELECT COUNT(*) FROM photos p WHERE p.album_id = a.id) as photo_count
    FROM albums a 
    WHERE a.user_id = $1 
    ORDER BY a.created_at DESC
  `, [req.userId]);
  
  res.json(albums.rows);
});

router.get('/albums/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  
  // Check if user owns album or has access
  const album = await db.query('SELECT * FROM albums WHERE id = $1', [id]);
  
  if (!album.rows[0]) {
    return res.status(404).json({ error: 'Album not found' });
  }
  
  const isOwner = album.rows[0].user_id === req.userId;
  const hasAccess = await db.query(
    'SELECT 1 FROM album_shares WHERE album_id = $1 AND shared_with_user_id = $2',
    [id, req.userId]
  );
  
  if (!isOwner && hasAccess.rows.length === 0 && album.rows[0].is_private) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const photos = await db.query(
    'SELECT * FROM photos WHERE album_id = $1 ORDER BY "order"',
    [id]
  );
  
  res.json({ ...album.rows[0], photos: photos.rows });
});

router.post('/albums', authenticate, async (req, res) => {
  const { name, description, isPrivate = false } = req.body;
  
  const album = await db.query(`
    INSERT INTO albums (user_id, name, description, is_private)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `, [req.userId, name, description, isPrivate]);
  
  res.status(201).json(album.rows[0]);
});

router.put('/albums/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { name, description, isPrivate } = req.body;
  
  // Verify ownership
  const album = await db.query('SELECT * FROM albums WHERE id = $1 AND user_id = $2', [id, req.userId]);
  
  if (album.rows.length === 0) {
    return res.status(403).json({ error: 'Not the owner' });
  }
  
  const updated = await db.query(`
    UPDATE albums SET name = COALESCE($1, name), description = COALESCE($2, description), is_private = COALESCE($3, is_private), updated_at = NOW()
    WHERE id = $4
    RETURNING *
  `, [name, description, isPrivate, id]);
  
  res.json(updated.rows[0]);
});

router.delete('/albums/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  
  // Verify ownership
  const album = await db.query('SELECT * FROM albums WHERE id = $1 AND user_id = $2', [id, req.userId]);
  
  if (album.rows.length === 0) {
    return res.status(403).json({ error: 'Not the owner' });
  }
  
  // Delete photos from storage
  const photos = await db.query('SELECT url FROM photos WHERE album_id = $1', [id]);
  await Promise.all(photos.rows.map(p => deleteFromStorage(p.url)));
  
  await db.query('DELETE FROM albums WHERE id = $1', [id]);
  
  res.status(204).send();
});

router.post('/albums/:id/photos', authenticate, upload.array('photos', 20), async (req, res) => {
  const { id } = req.params;
  
  // Verify ownership
  const album = await db.query('SELECT * FROM albums WHERE id = $1 AND user_id = $2', [id, req.userId]);
  
  if (album.rows.length === 0) {
    return res.status(403).json({ error: 'Not the owner' });
  }
  
  // Get current max order
  const maxOrder = await db.query('SELECT COALESCE(MAX("order"), 0) as max FROM photos WHERE album_id = $1', [id]);
  let order = maxOrder.rows[0].max;
  
  const photos = await Promise.all(req.files.map(async (file) => {
    order++;
    const { url, thumbnailUrl } = await uploadToStorageWithThumbnail(file);
    
    const photo = await db.query(`
      INSERT INTO photos (album_id, url, thumbnail_url, "order")
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [id, url, thumbnailUrl, order]);
    
    return photo.rows[0];
  }));
  
  res.status(201).json(photos);
});

router.delete('/albums/:albumId/photos/:photoId', authenticate, async (req, res) => {
  const { albumId, photoId } = req.params;
  
  // Verify ownership
  const album = await db.query('SELECT * FROM albums WHERE id = $1 AND user_id = $2', [albumId, req.userId]);
  
  if (album.rows.length === 0) {
    return res.status(403).json({ error: 'Not the owner' });
  }
  
  const photo = await db.query('SELECT url FROM photos WHERE id = $1 AND album_id = $2', [photoId, albumId]);
  
  if (photo.rows[0]) {
    await deleteFromStorage(photo.rows[0].url);
    await db.query('DELETE FROM photos WHERE id = $1', [photoId]);
  }
  
  res.status(204).send();
});

router.post('/albums/:id/share', authenticate, async (req, res) => {
  const { id } = req.params;
  const { userId, permission = 'view' } = req.body;
  
  // Verify ownership
  const album = await db.query('SELECT * FROM albums WHERE id = $1 AND user_id = $2', [id, req.userId]);
  
  if (album.rows.length === 0) {
    return res.status(403).json({ error: 'Not the owner' });
  }
  
  const share = await db.query(`
    INSERT INTO album_shares (album_id, shared_with_user_id, permission)
    VALUES ($1, $2, $3)
    ON CONFLICT (album_id, shared_with_user_id) DO UPDATE SET permission = $3
    RETURNING *
  `, [id, userId, permission]);
  
  res.status(201).json(share.rows[0]);
});

router.get('/albums/shared', authenticate, async (req, res) => {
  const albums = await db.query(`
    SELECT a.*, u.name as owner_name, u.avatar as owner_avatar
    FROM albums a
    JOIN album_shares s ON a.id = s.album_id
    JOIN users u ON a.user_id = u.id
    WHERE s.shared_with_user_id = $1
    ORDER BY s.created_at DESC
  `, [req.userId]);
  
  res.json(albums.rows);
});
*/

// SQL Schema:
/*
CREATE TABLE albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id UUID REFERENCES albums(id) ON DELETE CASCADE,
  url VARCHAR(500) NOT NULL,
  thumbnail_url VARCHAR(500),
  caption TEXT,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE album_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id UUID REFERENCES albums(id) ON DELETE CASCADE,
  shared_with_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  permission VARCHAR(10) DEFAULT 'view' CHECK (permission IN ('view', 'edit')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(album_id, shared_with_user_id)
);

CREATE INDEX idx_albums_user ON albums(user_id);
CREATE INDEX idx_photos_album ON photos(album_id);
CREATE INDEX idx_album_shares_user ON album_shares(shared_with_user_id);
*/
