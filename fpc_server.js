import path from 'path';
import express from 'express';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Define __dirname since it's not available in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Middleware to parse JSON
app.use(express.json());

// Serve static files explicitly
app.use('/styles', express.static(path.join(__dirname, 'styles')));
app.use('/scripts', express.static(path.join(__dirname, 'scripts')));
app.use('/images', express.static(path.join(__dirname, 'images')));

// If using locally installed xlsx, serve it too

app.use('/scripts/xlsx', express.static(path.join(__dirname, 'node_modules/xlsx/dist')));


// Redirect root URL to /consultation/
app.get('/', (req, res) => {
    res.redirect('/consultation');
});

// Serve Consultation Page
app.get('/consultation', (req, res) => {
    res.sendFile(path.join(__dirname, 'landing.html'));
});

// Serve RTI Diagnostics Upload Page
app.get('/rti_diagnostics', (req, res) => {
    res.sendFile(path.join(__dirname, 'upload_files.html'));
});

// MongoDB Connection
const dbURI = process.env.MONGO_URI || 'mongodb://localhost:27017/testdb';
mongoose.connect(dbURI)
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});


// const path = require('path');
// const express = require('express');
// const mongoose = require('mongoose');
// const app = express();


// // Middleware to parse JSON
// // Serve static files from the feenyPowerLanding directory
// app.use(express.static('/root/feenyPowerLanding'));

// // Redirect root URL to /consultation/
// app.get('/', (req, res) => {
//     res.redirect('/consultation');
// });


// // Change the landing page URL to /consultation/
// app.get('/consultation', (req, res) => {
//     res.sendFile(path.join('/root/feenyPowerLanding', 'landing.html'));
// });

// // Serve the RTI Diagnostics Page
// app.get('/rti_diagnostics', (req, res) => {
//     res.sendFile(path.join('/root/feenyPowerLanding', 'upload_files.html'));
// });

// // MongoDB Connection Example
// const dbURI = process.env.MONGO_URI || 'mongodb://localhost:27017/testdb';
// mongoose.connect(dbURI)
//     .then(() => console.log('MongoDB connected'))
//     .catch(err => console.error('MongoDB connection error:', err));

// // Start the server
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//     console.log(`Server running at http://localhost:${PORT}`);
// });


