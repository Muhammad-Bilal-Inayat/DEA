import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig, Plugin} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// LINT.IfChange(aistudio_media_plugin)
function aistudioMediaPlugin(): Plugin {
  return {
    name: 'vite-plugin-aistudio-media',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.startsWith('/assets/aistudio/')) {
          const rawPath = req.url.split('?')[0].split('#')[0];
          try {
            const decodedPath = decodeURIComponent(rawPath);
            const relativePath = decodedPath.replace(/^\//, '');
            const aistudioDir = path.resolve(
              __dirname,
              'public',
              'assets',
              'aistudio',
            );
            const filePath = path.resolve(__dirname, 'public', relativePath);
            if (
              filePath.startsWith(aistudioDir + path.sep) &&
              fs.existsSync(filePath) &&
              fs.statSync(filePath).isFile()
            ) {
              const ext = path.extname(filePath).toLowerCase();
              const mimeMap: Record<string, string> = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.webp': 'image/webp',
                '.svg': 'image/svg+xml',
                '.bmp': 'image/bmp',
                '.ico': 'image/x-icon',
                '.mp4': 'video/mp4',
                '.webm': 'video/webm',
                '.ogv': 'video/ogg',
                '.mp3': 'audio/mpeg',
                '.wav': 'audio/wav',
                '.ogg': 'audio/ogg',
                '.pdf': 'application/pdf',
              };
              res.setHeader(
                'Content-Type',
                mimeMap[ext] || 'application/octet-stream',
              );
              res.setHeader('Cache-Control', 'no-cache');
              fs.createReadStream(filePath).pipe(res);
              return;
            }
          } catch {
            // Fall through if URI decoding or file access fails
          }
        }
        next();
      });
    },
  };
}
// LINT.ThenChange(//depot/google3/java/com/google/alkali/boq/makersuite/applet_dev_service/templates/initializers/react_theme/vite.config.ts:aistudio_media_plugin)

function syncApiPlugin(): Plugin {
  const syncFile = path.resolve(__dirname, '.sync_data.json');
  const errorLogsFile = path.resolve(__dirname, '.server_error_logs.json');

  // In-memory cache & debounced batching queue state
  let memorySyncData: Record<string, any[]> | null = null;
  let flushTimer: NodeJS.Timeout | null = null;
  let maxWaitTimer: NodeJS.Timeout | null = null;
  let pendingWritesCount = 0;
  let lastFlushTime = Date.now();
  let isFlushing = false;

  const getErrorLogs = (): any[] => {
    try {
      if (fs.existsSync(errorLogsFile)) {
        const raw = fs.readFileSync(errorLogsFile, 'utf-8');
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch {
      // Fallback
    }
    return [];
  };

  const saveErrorLog = (logEntry: Record<string, any>) => {
    try {
      const existing = getErrorLogs();
      const entry: Record<string, any> = {
        id: `srv_err_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
        ...logEntry,
      };
      const updated = [entry, ...existing].slice(0, 200);
      const tmpFile = `${errorLogsFile}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(updated, null, 2), 'utf-8');
      fs.renameSync(tmpFile, errorLogsFile);
      console.log(`\x1b[31m[SERVER ERROR LOG - ${entry.source || 'SYSTEM'}]\x1b[0m ${entry.timestamp} : ${entry.message || 'Unknown issue'}`);
    } catch (err) {
      console.error('[SERVER LOGGING ERROR]', err);
    }
  };

  // Load sync data once into memory (or return memory cache)
  const loadSyncData = (): Record<string, any[]> => {
    if (memorySyncData !== null) {
      return memorySyncData;
    }
    try {
      if (fs.existsSync(syncFile)) {
        const raw = fs.readFileSync(syncFile, 'utf-8');
        memorySyncData = JSON.parse(raw);
      } else {
        memorySyncData = {};
      }
    } catch (e: any) {
      saveErrorLog({
        source: 'SyncLoad',
        type: 'sync_failure',
        message: `Failed to load sync data from disk: ${e?.message}`,
      });
      memorySyncData = {};
    }
    return memorySyncData || {};
  };

  // Flush in-memory data atomically to disk
  const flushToDiskSync = () => {
    if (!memorySyncData || pendingWritesCount === 0 || isFlushing) return;
    try {
      isFlushing = true;
      const tmpFile = `${syncFile}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(memorySyncData, null, 2), 'utf-8');
      fs.renameSync(tmpFile, syncFile);
      pendingWritesCount = 0;
      lastFlushTime = Date.now();
    } catch (err: any) {
      saveErrorLog({
        source: 'SyncFlush',
        type: 'sync_failure',
        message: `Disk flush error: ${err?.message}`,
      });
    } finally {
      isFlushing = false;
    }
  };

  // Debounced queue with max-wait safety timer to prevent write starvation
  const scheduleDebouncedFlush = (debounceMs = 500, maxWaitMs = 2000) => {
    pendingWritesCount++;
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(() => {
      if (maxWaitTimer) {
        clearTimeout(maxWaitTimer);
        maxWaitTimer = null;
      }
      flushToDiskSync();
    }, debounceMs);

    if (!maxWaitTimer) {
      maxWaitTimer = setTimeout(() => {
        if (flushTimer) {
          clearTimeout(flushTimer);
          flushTimer = null;
        }
        maxWaitTimer = null;
        flushToDiskSync();
      }, maxWaitMs);
    }
  };

  // Flush to disk cleanly if server process terminates
  const handleProcessExit = () => {
    if (flushTimer) clearTimeout(flushTimer);
    if (maxWaitTimer) clearTimeout(maxWaitTimer);
    flushToDiskSync();
  };
  process.once('beforeExit', handleProcessExit);
  process.once('SIGINT', handleProcessExit);
  process.once('SIGTERM', handleProcessExit);

  // In-memory single record upsert with timestamp comparison
  const upsertRecordInMemory = (entityType: string, record: any): boolean => {
    if (!entityType || !record || !record.id) return false;
    const data = loadSyncData();
    if (!Array.isArray(data[entityType])) {
      data[entityType] = [];
    }
    const list = data[entityType];
    const existingIndex = list.findIndex(it => it && it.id === record.id);
    if (existingIndex >= 0) {
      const existing = list[existingIndex];
      const incomingTime = new Date(record.updatedAt || record.timestamp || record.createdAt || record.date || 0).getTime();
      const existingTime = new Date(existing.updatedAt || existing.timestamp || existing.createdAt || existing.date || 0).getTime();
      if (incomingTime >= existingTime || isNaN(incomingTime) || isNaN(existingTime)) {
        list[existingIndex] = record;
      }
    } else {
      list.push(record);
    }
    return true;
  };

  // In-memory full dataset merge
  const upsertDatasetInMemory = (incomingData: Record<string, any[]>) => {
    const existing = loadSyncData();
    for (const [key, items] of Object.entries(incomingData)) {
      if (Array.isArray(items)) {
        if (!existing[key]) {
          existing[key] = [];
        }
        const idMap = new Map<string, any>();
        for (const it of existing[key]) {
          if (it && it.id) idMap.set(it.id, it);
        }
        for (const it of items) {
          if (it && it.id) {
            const current = idMap.get(it.id);
            if (!current) {
              idMap.set(it.id, it);
            } else {
              const incomingTime = new Date(it.updatedAt || it.createdAt || it.date || 0).getTime();
              const currentTime = new Date(current.updatedAt || current.createdAt || current.date || 0).getTime();
              if (incomingTime >= currentTime || isNaN(incomingTime) || isNaN(currentTime)) {
                idMap.set(it.id, it);
              }
            }
          }
        }
        existing[key] = Array.from(idMap.values());
      }
    }
  };

  return {
    name: 'vite-plugin-sync-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url || (!req.url.startsWith('/api/sync') && !req.url.startsWith('/api/report-error') && !req.url.startsWith('/api/diagnostics'))) {
          return next();
        }

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          return res.end();
        }

        const url = req.url.split('?')[0];

        // 1. Server-side Error Reporting Endpoints
        if (url === '/api/report-error') {
          if (req.method === 'GET') {
            const logs = getErrorLogs();
            res.statusCode = 200;
            return res.end(JSON.stringify({ success: true, count: logs.length, logs }));
          }

          if (req.method === 'DELETE') {
            try {
              if (fs.existsSync(errorLogsFile)) {
                fs.writeFileSync(errorLogsFile, '[]', 'utf-8');
              }
              res.statusCode = 200;
              return res.end(JSON.stringify({ success: true, message: 'Server error logs cleared' }));
            } catch (err: any) {
              res.statusCode = 500;
              return res.end(JSON.stringify({ success: false, error: err?.message || 'Failed to clear logs' }));
            }
          }

          if (req.method === 'POST') {
            let bodyStr = '';
            req.on('data', (chunk) => { bodyStr += chunk; });
            req.on('end', () => {
              try {
                const body = JSON.parse(bodyStr || '{}');
                saveErrorLog(body);
                res.statusCode = 200;
                return res.end(JSON.stringify({ success: true, message: 'Error recorded on server' }));
              } catch (err: any) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ success: false, error: 'Invalid JSON body' }));
              }
            });
            return;
          }
        }

        // 2. Server Sync Logs endpoint
        if (url === '/api/sync/logs') {
          if (req.method === 'DELETE') {
            try {
              if (fs.existsSync(errorLogsFile)) {
                fs.writeFileSync(errorLogsFile, '[]', 'utf-8');
              }
              res.statusCode = 200;
              return res.end(JSON.stringify({ success: true, message: 'Logs cleared' }));
            } catch (err: any) {
              res.statusCode = 500;
              return res.end(JSON.stringify({ success: false, error: err?.message }));
            }
          }
          const logs = getErrorLogs();
          res.statusCode = 200;
          return res.end(JSON.stringify({ success: true, count: logs.length, logs }));
        }

        // 3. Health & Diagnostics endpoint
        if (url === '/api/sync/health' || url === '/api/diagnostics') {
          let storeCounts: Record<string, number> = {};
          let fileSize = 0;
          let lastModified: string | null = null;

          try {
            if (fs.existsSync(syncFile)) {
              const stat = fs.statSync(syncFile);
              fileSize = stat.size;
              lastModified = stat.mtime.toISOString();
            }
            const currentData = loadSyncData();
            for (const [key, val] of Object.entries(currentData)) {
              if (Array.isArray(val)) {
                storeCounts[key] = val.length;
              }
            }
          } catch (e: any) {
            saveErrorLog({
              source: 'SyncHealthCheck',
              type: 'sync_failure',
              message: `Health check parse failed: ${e?.message}`,
            });
          }

          const logs = getErrorLogs();
          res.statusCode = 200;
          return res.end(JSON.stringify({
            success: true,
            status: 'healthy',
            timestamp: new Date().toISOString(),
            storage: {
              fileSize,
              lastModified,
              storeCounts,
              memoryCached: true,
              pendingWrites: pendingWritesCount,
              lastFlushTime: new Date(lastFlushTime).toISOString(),
            },
            serverErrorsCount: logs.length,
          }));
        }

        // 4. Force disk flush endpoint (for testing or clean unload): POST /api/sync/flush
        if (url === '/api/sync/flush' && req.method === 'POST') {
          flushToDiskSync();
          res.statusCode = 200;
          return res.end(JSON.stringify({
            success: true,
            message: 'In-memory sync cache flushed to disk',
            timestamp: new Date().toISOString(),
          }));
        }

        // 5. Batched updates push: POST /api/sync/batch
        if (url === '/api/sync/batch' && req.method === 'POST') {
          let bodyStr = '';
          req.on('data', (chunk) => { bodyStr += chunk; });
          req.on('end', () => {
            try {
              const body = JSON.parse(bodyStr || '{}');
              const updates: Array<{ entityType: string; record: any }> = Array.isArray(body) 
                ? body 
                : (body.updates || body.records || []);

              if (!Array.isArray(updates) || updates.length === 0) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ success: false, error: 'updates array is required' }));
              }

              let updatedCount = 0;
              for (const u of updates) {
                if (u && u.entityType && u.record && u.record.id) {
                  if (upsertRecordInMemory(u.entityType, u.record)) {
                    updatedCount++;
                  }
                }
              }

              scheduleDebouncedFlush(500, 2000);

              res.statusCode = 200;
              return res.end(JSON.stringify({
                success: true,
                count: updatedCount,
                message: `Batched ${updatedCount} updates queued & synced in memory`,
                pendingWrites: pendingWritesCount,
                timestamp: new Date().toISOString(),
              }));
            } catch (err: any) {
              saveErrorLog({
                source: 'SyncBatch',
                type: 'sync_failure',
                message: `Failed to process batch sync: ${err?.message}`,
              });
              res.statusCode = 500;
              return res.end(JSON.stringify({ success: false, error: err?.message || 'Sync batch error' }));
            }
          });
          return;
        }

        // 6. Single record push: POST /api/sync/record
        if (url === '/api/sync/record' && req.method === 'POST') {
          let bodyStr = '';
          req.on('data', (chunk) => { bodyStr += chunk; });
          req.on('end', () => {
            try {
              const body = JSON.parse(bodyStr || '{}');
              const { entityType, record } = body;
              if (!entityType || !record || !record.id) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ success: false, error: 'entityType and record with id are required' }));
              }

              upsertRecordInMemory(entityType, record);
              scheduleDebouncedFlush(500, 2000);

              res.statusCode = 200;
              return res.end(JSON.stringify({ 
                success: true, 
                message: 'Record queued & synced in memory', 
                pendingWrites: pendingWritesCount,
                timestamp: new Date().toISOString() 
              }));
            } catch (err: any) {
              saveErrorLog({
                source: 'SyncSingleRecord',
                type: 'sync_failure',
                message: `Failed to save single record: ${err?.message}`,
              });
              res.statusCode = 500;
              return res.end(JSON.stringify({ success: false, error: err?.message || 'Sync record error' }));
            }
          });
          return;
        }

        // 7. Full sync data: GET /api/sync
        if (url === '/api/sync' && req.method === 'GET') {
          const data = loadSyncData();
          res.statusCode = 200;
          return res.end(JSON.stringify({ success: true, data }));
        }

        // 8. Full sync push: POST /api/sync
        if (url === '/api/sync' && req.method === 'POST') {
          let bodyStr = '';
          req.on('data', (chunk) => {
            bodyStr += chunk;
          });
          req.on('end', () => {
            try {
              const body = JSON.parse(bodyStr || '{}');
              const incomingData = body.data || body;

              if (typeof incomingData !== 'object' || incomingData === null) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ success: false, error: 'Invalid sync payload' }));
              }

              upsertDatasetInMemory(incomingData);
              scheduleDebouncedFlush(600, 2500);

              res.statusCode = 200;
              return res.end(JSON.stringify({ 
                success: true, 
                message: 'Synchronized with cloud server successfully',
                pendingWrites: pendingWritesCount,
                timestamp: new Date().toISOString() 
              }));
            } catch (err: any) {
              saveErrorLog({
                source: 'SyncPost',
                type: 'sync_failure',
                message: `Sync POST failed: ${err?.message}`,
                stack: err?.stack,
              });
              res.statusCode = 500;
              return res.end(JSON.stringify({ success: false, error: err?.message || 'Sync error' }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    base: '/',
    plugins: [
      react(),
      tailwindcss(),
      aistudioMediaPlugin(),
      syncApiPlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 'icon.svg', 'logo.svg', 'pwa-192x192.png', 'pwa-512x512.png', 'pwa-maskable-512x512.png'],
        manifest: {
          id: '/',
          name: '15 Pharma Inventory Manager',
          short_name: '15Pharma',
          description: 'Medicine stock & inventory management with offline mode.',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          orientation: 'any',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,json,webp}'],
          maximumFileSizeToCacheInBytes: 15000000,
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'images-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        output: {
          entryFileNames: 'assets/app.js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            if (assetInfo.name && assetInfo.name.endsWith('.css')) {
              return 'assets/app.css';
            }
            return 'assets/[name]-[hash].[ext]';
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
      dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom'],
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router',
        'react-router-dom',
        '@dnd-kit/core',
        '@dnd-kit/sortable',
        '@dnd-kit/utilities',
      ],
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        ignored: ['**/.sync_data.json', '**/.server_error_logs.json', '**/*.tmp'],
      },
    },
  };
});
