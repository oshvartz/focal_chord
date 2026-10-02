import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from 'path'

const saveOffsetPlugin = () => ({
  name: 'save-offset',
  configureServer(server) {
    server.middlewares.use('/api/save-offset', (req, res) => {
      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
          try {
            const { songId, offset } = JSON.parse(body);
            // Protect against directory traversal
            const safeSongId = path.basename(songId);
            const filePath = path.resolve(__dirname, `public/library/${safeSongId}/chords.json`);
            
            if (fs.existsSync(filePath)) {
              const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
              data.metadata = data.metadata || {};
              data.metadata.lyricOffset = offset;
              fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
              
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true }));
            } else {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'Song not found' }));
            }
          } catch (e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message }));
          }
        });
      }
    });
  }
});

export default defineConfig({
  plugins: [react(), tailwindcss(), saveOffsetPlugin()],
})
