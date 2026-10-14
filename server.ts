import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { getOrCreateUser, getUserLicense, activateUserLicense } from './src/db/users.ts';
import { getScriptsByUserId, upsertScript, deleteScriptById } from './src/db/scripts.ts';
import { addToWaitlist } from './src/db/waitlist.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Auth & User Profile API
app.post('/api/auth/sync', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const email = req.user!.email || `${uid}@teleprompter.local`;
    const user = await getOrCreateUser(uid, email);
    const license = await getUserLicense(uid);
    res.json({ user, license });
  } catch (error: any) {
    console.error('Failed to sync auth user:', error);
    res.status(500).json({ error: error.message || 'Failed to sync user' });
  }
});

// Scripts API
app.get('/api/scripts', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const userScripts = await getScriptsByUserId(uid);
    res.json(userScripts);
  } catch (error: any) {
    console.error('Failed to get scripts:', error);
    res.status(500).json({ error: error.message || 'Failed to load scripts' });
  }
});

app.post('/api/scripts', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const script = await upsertScript(uid, req.body);
    res.json(script);
  } catch (error: any) {
    console.error('Failed to upsert script:', error);
    res.status(500).json({ error: error.message || 'Failed to save script' });
  }
});

app.delete('/api/scripts/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    await deleteScriptById(uid, req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete script:', error);
    res.status(500).json({ error: error.message || 'Failed to delete script' });
  }
});

// License API
app.get('/api/license', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const license = await getUserLicense(uid);
    res.json(license);
  } catch (error: any) {
    console.error('Failed to fetch license:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch license' });
  }
});

app.post('/api/license/activate', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const { key } = req.body;
    if (!key || typeof key !== 'string') {
      return res.status(400).json({ error: 'Valid license key required' });
    }
    const license = await activateUserLicense(uid, key);
    res.json(license);
  } catch (error: any) {
    console.error('Failed to activate license:', error);
    res.status(500).json({ error: error.message || 'Failed to activate license' });
  }
});

// Waitlist API
app.post('/api/waitlist', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email required' });
    }
    const entry = await addToWaitlist(email);
    res.json({ success: true, entry });
  } catch (error: any) {
    console.error('Failed to add to waitlist:', error);
    res.status(500).json({ error: error.message || 'Failed to join waitlist' });
  }
});

// Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
