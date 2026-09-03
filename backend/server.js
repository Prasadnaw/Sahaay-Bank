const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', apiRoutes);

// Static frontend serving
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Sahaay Bank REST API Server running on port ${PORT}`);
  console.log(`📡 API Endpoints available at: http://localhost:${PORT}/api`);
  console.log(`💻 Web Application served at: http://localhost:${PORT}`);
  console.log(`====================================================`);
});
