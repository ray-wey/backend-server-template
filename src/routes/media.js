const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const DATA_DIR = path.join(__dirname, '..', '..', 'data');

const PHOTO_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic']);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.avi', '.mkv', '.webm']);

function listFiles(dir, allowedExtensions) {
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((file) => {
      if (file.startsWith('.')) return false;
      const ext = path.extname(file).toLowerCase();
      return allowedExtensions.has(ext);
    })
    .map((file) => {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);
      return {
        filename: file,
        size: stats.size,
        modified: stats.mtime.toISOString(),
      };
    });
}

router.get('/photos', (req, res) => {
  const photosDir = path.join(DATA_DIR, 'photos');
  const photos = listFiles(photosDir, PHOTO_EXTENSIONS);

  res.json({
    count: photos.length,
    files: photos.map((p) => ({
      ...p,
      url: `/api/media/photos/${p.filename}`,
    })),
  });
});

router.get('/videos', (req, res) => {
  const videosDir = path.join(DATA_DIR, 'videos');
  const videos = listFiles(videosDir, VIDEO_EXTENSIONS);

  res.json({
    count: videos.length,
    files: videos.map((v) => ({
      ...v,
      url: `/api/media/videos/${v.filename}`,
    })),
  });
});

router.get('/:type/:filename', (req, res) => {
  const { type, filename } = req.params;

  if (!['photos', 'videos'].includes(type)) {
    return res.status(400).json({ error: 'Invalid media type' });
  }

  const sanitized = path.basename(filename);
  const filePath = path.join(DATA_DIR, type, sanitized);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  const stat = fs.statSync(filePath);

  if (type === 'videos') {
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunkSize = end - start + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'video/mp4',
      });

      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': stat.size,
        'Content-Type': 'video/mp4',
        'Accept-Ranges': 'bytes',
      });

      fs.createReadStream(filePath).pipe(res);
    }
  } else {
    res.sendFile(filePath);
  }
});

module.exports = router;
