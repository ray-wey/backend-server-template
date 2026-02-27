require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');

const mediaRoutes = require('./routes/media');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', false);

app.use(helmet());

const ALLOWED_IPS = (process.env.ALLOWED_IPS || '')
  .split(',')
  .map((ip) => ip.trim())
  .filter(Boolean);

function isTailscaleIP(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) return false;
  // Tailscale CGNAT range: 100.64.0.0/10 (100.64.0.0 – 100.127.255.255)
  return parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127;
}

function tailscaleOnly(req, res, next) {
  const ip = (req.ip || req.connection.remoteAddress || '').replace(/^::ffff:/, '');

  if (ip === '127.0.0.1' || ip === '::1') {
    return next();
  }

  if (ALLOWED_IPS.length > 0) {
    if (ALLOWED_IPS.includes(ip)) return next();
    return res.status(403).json({ error: 'Access denied' });
  }

  if (isTailscaleIP(ip)) return next();

  return res.status(403).json({ error: 'Access denied' });
}

app.use(tailscaleOnly);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    cb(null, false);
  },
  methods: ['GET'],
  maxAge: 86400,
}));

app.use(express.json({ limit: '1mb' }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests, please try again later' },
});

app.use(limiter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/media', mediaRoutes);

const DATA_DIR = path.join(__dirname, '..', 'data');
const PHOTO_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic']);

app.get('/api/preview/photo', (req, res) => {
  const photosDir = path.join(DATA_DIR, 'photos');

  if (!fs.existsSync(photosDir)) {
    return res.status(404).json({ error: 'No photos available' });
  }

  const files = fs.readdirSync(photosDir).filter((f) => {
    if (f.startsWith('.')) return false;
    return PHOTO_EXTS.has(path.extname(f).toLowerCase());
  });

  if (files.length === 0) {
    return res.status(404).json({ error: 'No photos available' });
  }

  const filePath = path.join(photosDir, path.basename(files[0]));
  res.sendFile(filePath);
});

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
