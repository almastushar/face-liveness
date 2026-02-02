# Face Liveness Verification

A browser-based face liveness verification system using TensorFlow.js and MediaPipe FaceMesh. All processing happens client-side for privacy.

## Features

- 🎯 **6-Step Verification Flow**: Align → Blink → Turn Left → Turn Right → Look Up → Look Down
- 🔀 **Randomized Steps**: Steps are shuffled each session to prevent replay attacks
- 🔍 **Anti-Spoofing Detection**: Depth variance and micro-movement analysis
- 📱 **Mobile Responsive**: Works on desktop and mobile devices
- 🔒 **Privacy First**: All processing happens locally in the browser
- 🎵 **Audio Feedback**: Simple tones for step completion

## Tech Stack

- **React 18** - UI Framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **TensorFlow.js** - ML runtime
- **MediaPipe FaceMesh** - Face landmark detection (468 points)
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components

## Project Structure

```
src/
├── components/
│   ├── FaceLiveness/          # Main liveness verification feature
│   │   ├── index.tsx          # Main component (entry point)
│   │   ├── CameraView.tsx     # Camera display with overlays
│   │   ├── StepIndicator.tsx  # Progress indicator
│   │   ├── ActionPrompt.tsx   # User instruction display
│   │   ├── DirectionGuide.tsx # Visual direction arrows
│   │   ├── DebugOverlay.tsx   # Development debug panel
│   │   └── SuccessScreen.tsx  # Completion screen
│   └── ui/                    # Reusable UI components (shadcn)
├── hooks/
│   ├── useCamera.ts           # Camera stream management
│   ├── useFaceDetector.ts     # TensorFlow.js face detection
│   ├── useLivenessStateMachine.ts  # Verification state machine
│   └── useRafThrottleLoop.ts  # Throttled animation frame loop
├── utils/
│   ├── landmarks.ts           # Face landmark utilities
│   ├── ear.ts                 # Eye Aspect Ratio (blink detection)
│   ├── pose.ts                # Head pose estimation
│   ├── antiSpoof.ts           # Anti-spoofing detection
│   ├── smoothing.ts           # Signal smoothing (EMA)
│   └── audio.ts               # Audio feedback
├── types/
│   └── liveness.ts            # TypeScript interfaces & config
└── pages/
    └── Index.tsx              # Main page
```

## Prerequisites

- **Node.js** >= 18.x
- **npm** or **bun** (recommended)
- **HTTPS** required for camera access on mobile

## Local Development

### 1. Clone the repository

```bash
git clone <repository-url>
cd face-liveness-verification
```

### 2. Install dependencies

Using npm:
```bash
npm install
```

Using bun (faster):
```bash
bun install
```

### 3. Start development server

```bash
npm run dev
# or
bun dev
```

The app will be available at `http://localhost:5173`

### 4. Run tests

```bash
npm run test
# or
bun test
```

## Building for Production

### 1. Create production build

```bash
npm run build
# or
bun run build
```

This creates an optimized build in the `dist/` folder.

### 2. Preview production build locally

```bash
npm run preview
# or
bun run preview
```

## Deployment Options

### Option 1: Static Hosting (Recommended)

The app is a static SPA that can be deployed to any static hosting service:

**Vercel:**
```bash
npm i -g vercel
vercel
```

**Netlify:**
```bash
npm i -g netlify-cli
netlify deploy --prod --dir=dist
```

**GitHub Pages:**
1. Build the project: `npm run build`
2. Push the `dist/` folder to a `gh-pages` branch
3. Enable GitHub Pages in repository settings

**Cloudflare Pages:**
1. Connect your GitHub repository
2. Set build command: `npm run build`
3. Set output directory: `dist`

### Option 2: Docker

Create a `Dockerfile`:

```dockerfile
# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Create `nginx.conf`:

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Build and run:
```bash
docker build -t face-liveness .
docker run -p 8080:80 face-liveness
```

### Option 3: Node.js Server (Express)

Install express:
```bash
npm install express
```

Create `server.js`:

```javascript
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from dist
app.use(express.static(path.join(__dirname, 'dist')));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

Run:
```bash
node server.js
```

## HTTPS Requirement

Camera access requires HTTPS on mobile devices. For local development with HTTPS:

```bash
# Using mkcert (recommended)
brew install mkcert  # macOS
mkcert -install
mkcert localhost

# Then configure vite.config.ts to use the certificates
```

## Configuration

Key configuration constants are in `src/types/liveness.ts`:

```typescript
export const CONFIG = {
  TARGET_FPS: 12,              // Detection frame rate
  ALIGN_REQUIRED_FRAMES: 12,   // Frames needed for alignment
  BLINK_CALIBRATION_FRAMES: 15,// Frames for blink calibration
  YAW_THRESHOLD: 0.09,         // Head turn sensitivity
  PITCH_THRESHOLD: 0.07,       // Head tilt sensitivity
  POSE_HELD_FRAMES: 4,         // Frames to hold pose
  // ... more options
};
```

## Browser Support

- Chrome 80+ (recommended)
- Firefox 75+
- Safari 14+
- Edge 80+

WebGL support required for TensorFlow.js.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Camera not working | Ensure HTTPS and camera permissions |
| Slow detection | Reduce `TARGET_FPS` in config |
| Face not detected | Improve lighting, face camera directly |
| Model loading fails | Check network, CDN availability |

## License

MIT License - See LICENSE file for details.

---

**Note**: This is a research/demonstration implementation. It is NOT a certified PAD (Presentation Attack Detection) solution.
