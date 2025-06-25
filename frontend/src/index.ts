import express from 'express';
import cors from 'cors';
import path from 'path';
import fetch from 'node-fetch';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Serve the main HTML page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', service: 'prism-frontend' });
});

app.listen(PORT, () => {
    console.log(`🔮 Prism Frontend running on http://localhost:${PORT}`);
    console.log('✨ Happy developing!');
});
