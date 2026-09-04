const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5050;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes
app.use('/api', apiRoutes);

// Static frontend serving (robust resolution)
const frontendDir = path.resolve(__dirname, '../frontend');
app.use(express.static(frontendDir));

// Route all other requests to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`🚀 Sahaay Bank REST API Server running on port ${PORT}`);
  console.log(`📡 Health check available at: http://localhost:${PORT}/api/health`);
  console.log(`💻 Web Application served at: http://localhost:${PORT}`);
  console.log(`====================================================`);
});
