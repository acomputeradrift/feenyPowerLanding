import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import express from 'express';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import uploadRoutes from './routes/upload.js';
import processRoute from './routes/process.js';
import retrieveRoute from './routes/retrieve.js';






// Define __dirname since it's not available in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Middleware to parse JSON
app.use(express.json());

// Routes
app.use('/api/upload', uploadRoutes);
app.use(processRoute);
app.use(logRoutes);


// Serve static files explicitly
app.use('/styles', express.static(path.join(__dirname, '../frontend/styles')));
app.use('/scripts', express.static(path.join(__dirname, '../frontend/scripts')));
app.use('/images', express.static(path.join(__dirname, '../frontend/images')));

// ✅ If using locally installed xlsx, serve it too
app.use('/scripts/xlsx', express.static(path.join(__dirname, 'node_modules/xlsx/dist')));

// ✅ Redirect root URL to /consultation/
app.get('/', (req, res) => {
    res.redirect('/consultation');
});

// ✅ Serve Consultation Page
app.get('/consultation', (req, res) => {
    // res.sendFile(path.join(__dirname, 'consultation.html'));
    res.sendFile(path.join(__dirname, '../frontend/consultation.html'));

});

// ✅ Redirect `/rti_diagnostics/` to `/rti_diagnostics/upload_files/`
app.get('/rti_diagnostics/', (req, res) => {
    res.redirect('/rti_diagnostics/upload_files/');

});

// ✅ Serve RTI Diagnostics Upload Page
app.get('/rti_diagnostics/upload_files/', (req, res) => {
    // res.sendFile(path.join(__dirname, 'upload_files.html'));
    res.sendFile(path.join(__dirname, '../frontend/upload_files.html'));

});

// ✅ Serve RTI Diagnostics Process Files Page
app.get('/rti_diagnostics/process_files/', (req, res) => {
    //res.sendFile(path.join(__dirname, 'process_files.html'));
    res.sendFile(path.join(__dirname, '../frontend/process_files.html'));

});

// ✅ MongoDB Connection
const dbURI = process.env.MONGO_URI || 'mongodb://localhost:27017/testdb';
mongoose.connect(dbURI)
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// ✅ Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});


