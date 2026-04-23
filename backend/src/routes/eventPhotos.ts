import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { upload, deleteImage, isCloudinaryConfigured } from '../services/cloudinaryService';
import { query } from '../database/db';

const router = Router();

/**
 * Upload event photos (supports multiple files)
 * POST /api/event-photos/upload
 */
router.post('/upload', authenticate, upload.array('images', 10), async (req: AuthRequest, res: Response) => {
  try {
    if (!isCloudinaryConfigured()) {
      return res.status(503).json({
        error: 'Image upload service is not configured. Please contact support.'
      });
    }

    if (!req.files || (req.files as any[]).length === 0) {
      return res.status(400).json({ error: 'No image files provided' });
    }

    const files = req.files as any[]; // Cloudinary adds custom properties
    const uploadedPhotos = files.map(file => ({
      imageUrl: file.path,
      publicId: file.filename
    }));

    res.json({
      success: true,
      photos: uploadedPhotos,
      message: `${uploadedPhotos.length} image(s) uploaded successfully`
    });
  } catch (error: unknown) {
    console.error('Image upload error:', error);
    res.status(500).json({
      error: error.message || 'Failed to upload images'
    });
  }
});

/**
 * Add photos to an event
 * POST /api/event-photos/event/:eventId
 */
router.post('/event/:eventId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const { photos } = req.body; // Array of { imageUrl, publicId, category, caption }
    const userId = req.user!.id;

    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      return res.status(400).json({ error: 'Photos array is required' });
    }

    // Verify event ownership
    const eventCheck = await query(
      'SELECT id FROM events WHERE id = $1 AND user_id = $2',
      [eventId, userId]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found or unauthorized' });
    }

    // Get current max display_order
    const maxOrderResult = await query(
      'SELECT COALESCE(MAX(display_order), -1) as max_order FROM event_photos WHERE event_id = $1',
      [eventId]
    );
    let currentOrder = maxOrderResult.rows[0].max_order;

    // Insert photos
    const insertedPhotos = [];
    for (const photo of photos) {
      currentOrder++;
      const result = await query(
        `INSERT INTO event_photos (event_id, photo_url, photo_public_id, category, caption, display_order)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [eventId, photo.imageUrl, photo.publicId, photo.category || 'dress_code', photo.caption || null, currentOrder]
      );
      insertedPhotos.push(result.rows[0]);
    }

    res.json({
      success: true,
      photos: insertedPhotos,
      message: 'Photos added to event successfully'
    });
  } catch (error: unknown) {
    console.error('Add event photos error:', error);
    res.status(500).json({
      error: error.message || 'Failed to add photos to event'
    });
  }
});

/**
 * Get all photos for an event
 * GET /api/event-photos/event/:eventId
 */
router.get('/event/:eventId', async (req, res: Response) => {
  try {
    const { eventId } = req.params;
    const { category } = req.query;

    let queryText = `
      SELECT id, event_id, photo_url, photo_public_id, category, caption, uploaded_at FROM event_photos
      WHERE event_id = $1
    `;
    const queryParams: any[] = [eventId];

    if (category) {
      queryText += ` AND category = $2`;
      queryParams.push(category);
    }

    queryText += ` ORDER BY display_order ASC, created_at ASC`;

    const result = await query(queryText, queryParams);

    res.json({
      success: true,
      photos: result.rows
    });
  } catch (error: unknown) {
    console.error('Get event photos error:', error);
    res.status(500).json({
      error: error.message || 'Failed to get event photos'
    });
  }
});

/**
 * Delete a photo
 * DELETE /api/event-photos/:photoId
 */
router.delete('/:photoId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { photoId } = req.params;
    const userId = req.user!.id;

    // Verify ownership through event
    const photoCheck = await query(
      `SELECT ep.*, e.user_id
       FROM event_photos ep
       JOIN events e ON ep.event_id = e.id
       WHERE ep.id = $1`,
      [photoId]
    );

    if (photoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    const photo = photoCheck.rows[0];
    if (photo.user_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Delete from database
    await query('DELETE FROM event_photos WHERE id = $1', [photoId]);

    // Delete from Cloudinary
    if (photo.photo_public_id) {
      await deleteImage(photo.photo_public_id);
    }

    res.json({
      success: true,
      message: 'Photo deleted successfully'
    });
  } catch (error: unknown) {
    console.error('Delete photo error:', error);
    res.status(500).json({
      error: error.message || 'Failed to delete photo'
    });
  }
});

/**
 * Update photo order
 * PUT /api/event-photos/reorder
 */
router.put('/reorder', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { photoIds } = req.body; // Array of photo IDs in desired order
    const userId = req.user!.id;

    if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
      return res.status(400).json({ error: 'Photo IDs array is required' });
    }

    // Verify ownership of all photos
    const ownershipCheck = await query(
      `SELECT ep.id
       FROM event_photos ep
       JOIN events e ON ep.event_id = e.id
       WHERE ep.id = ANY($1) AND e.user_id = $2`,
      [photoIds, userId]
    );

    if (ownershipCheck.rows.length !== photoIds.length) {
      return res.status(403).json({ error: 'Unauthorized or invalid photo IDs' });
    }

    // Update display order
    for (let i = 0; i < photoIds.length; i++) {
      await query(
        'UPDATE event_photos SET display_order = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [i, photoIds[i]]
      );
    }

    res.json({
      success: true,
      message: 'Photo order updated successfully'
    });
  } catch (error: unknown) {
    console.error('Reorder photos error:', error);
    res.status(500).json({
      error: error.message || 'Failed to reorder photos'
    });
  }
});

/**
 * Update photo caption
 * PUT /api/event-photos/:photoId/caption
 */
router.put('/:photoId/caption', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { photoId } = req.params;
    const { caption } = req.body;
    const userId = req.user!.id;

    // Verify ownership
    const photoCheck = await query(
      `SELECT ep.id
       FROM event_photos ep
       JOIN events e ON ep.event_id = e.id
       WHERE ep.id = $1 AND e.user_id = $2`,
      [photoId, userId]
    );

    if (photoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Photo not found or unauthorized' });
    }

    // Update caption
    await query(
      'UPDATE event_photos SET caption = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [caption || null, photoId]
    );

    res.json({
      success: true,
      message: 'Caption updated successfully'
    });
  } catch (error: unknown) {
    console.error('Update caption error:', error);
    res.status(500).json({
      error: error.message || 'Failed to update caption'
    });
  }
});

export default router;
