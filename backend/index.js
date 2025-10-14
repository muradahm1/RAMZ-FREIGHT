
// Basic Express server setup
import express from 'express';
import { createClient } from '@supabase/supabase-js';

const app = express();
const PORT = process.env.PORT || 4000;

// Replace with your actual Supabase URL and Key
const SUPABASE_URL = 'https://sgmcuwmqmgchvnncbarb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnbWN1d21xbWdjaHZubmNiYXJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzODk5ODYsImV4cCI6MjA3NDk2NTk4Nn0.zytOCIukl2NJCq2ZSXeCo_XCOpSxH6bqV3wk9iLXqM0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

app.use(express.json());

// User registration endpoint (signup)
app.post('/auth/signup', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  try {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return res.status(400).json({ error: error.message });
    res.json({ user: data.user });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

app.get('/', (req, res) => {
  res.send('RAMZ-FREIGHT Backend is running!');
});

// User authentication endpoint (login)
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ error: error.message });
    res.json({ user: data.user, session: data.session });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Example: Get all users from Supabase auth (requires service role key for real use)
// app.get('/users', async (req, res) => {
//   const { data, error } = await supabase.auth.admin.listUsers();
//   if (error) return res.status(500).json({ error: error.message });
//   res.json(data);
// });

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
