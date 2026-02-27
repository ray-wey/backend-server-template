# backend-server-template

Tailscale-secured Node.js API server for safely sharing media files.

## Setup

```bash
npm install
cp .env.example .env
```

Edit the `.env` file. If you want to restrict access to specific Tailscale IPs, add them comma-separated:

```
ALLOWED_IPS=100.XX.X.X,100.XX.X.X
```

Leave `ALLOWED_IPS` empty to allow any device on your Tailscale network.

## Run

```bash
# Production
npm start

# Development
npm run dev
```

Server starts at `http://0.0.0.0:3000`.

## Tailscale Setup (Private VPN)

1. Create an account at [tailscale.com](https://tailscale.com)
2. Install Tailscale on the server machine:

```bash
# Debian/Ubuntu
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
# Windows
# download directly from tailscale.com
```

3. Install Tailscale on the client device (mobile app available).
4. Find your Tailscale IP address:

```bash
tailscale ip -4
# output: 100.x.x.x
```

5. In your app, use `http://100.x.x.x:3000/api` as the API URL.

## Media Files

Copy your photos to `data/photos/` and your videos to `data/videos/`. Supported formats:

- Photo: .jpg, .jpeg, .png, .gif, .webp, .heic
- Video: .mp4, .mov, .avi, .mkv, .webm

## API Endpoints

### Health Check

```
GET /api/health
```

### Media

| Method | Endpoint                        | Description            |
|--------|---------------------------------|------------------------|
| GET    | /api/media/photos               | List photos            |
| GET    | /api/media/videos               | List videos            |
| GET    | /api/media/:type/:filename      | Download/stream a file |

### Preview

```
GET /api/preview/photo    → returns the first photo
```

### Example Usage (Expo)

```javascript
const API_URL = 'http://100.x.x.x:3000/api';

// List photos
const res = await fetch(`${API_URL}/media/photos`);
const data = await res.json();

// Single photo URL (can be used directly in <Image source={{ uri }}>)
const photoUrl = `${API_URL}/media/photos/foto1.jpg`;
```
