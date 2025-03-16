const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const app = express();

// Middleware to parse JSON
// Serve static files from the feenyPowerLanding directory
app.use(express.static('/root/feenyPowerLanding'));

// Redirect root URL to /consultation/
app.get('/', (req, res) => {
    res.redirect('/consultation');
});


// Change the landing page URL to /consultation/
app.get('/consultation', (req, res) => {
    res.sendFile(path.join('/root/feenyPowerLanding', 'landing.html'));
});

// Serve the RTI Diagnostics Page
app.get('/rti_diagnostics', (req, res) => {
    res.sendFile(path.join('/root/feenyPowerLanding', 'rti_diagnostics.html'));
});

// MongoDB Connection Example
const dbURI = process.env.MONGO_URI || 'mongodb://localhost:27017/testdb';
mongoose.connect(dbURI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});





// const path = require('path');
// const express = require('express');
// const mongoose = require('mongoose');
// const app = express();

// // Middleware to parse JSON
// // Serve static files from the feenyPowerLanding directory
// app.use(express.static('/root/feenyPowerLanding'));

// app.get('/', (req, res) => {
//     res.sendFile(path.join('/root/feenyPowerLanding', 'landing.html'));
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
