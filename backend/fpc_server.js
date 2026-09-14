import dotenv from 'dotenv';
import path from 'path';
import express from 'express';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import uploadRoutes from './routes/upload.js';
import processRoute from './routes/process.js';
import retrieveRoute from './routes/retrieve.js';
import proposalRoutes, { handleProposalAudit } from './routes/proposal.js';
import ideaFeedbackRoutes from './routes/ideaFeedback.js';
import sentinelLiteCompareCountRoutes from './routes/sentinelLiteCompareCount.js';
import { handleProposalPdfPreview } from './proposal/pdf/preview.js';
import { requireMongoUri } from './requireMongoUri.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();

// Middleware to parse JSON
app.use(express.json());

// Routes
app.use('/api/upload', uploadRoutes);
app.use(processRoute);
app.use(retrieveRoute);
app.use('/api/proposal', proposalRoutes);
// Count-only: +1 when a dealer hits Compare. No files, names, paths, or bodies.
app.use('/api/sentinel_lite/compare-count', sentinelLiteCompareCountRoutes);



// Serve static files explicitly
app.use('/styles', express.static(path.join(__dirname, '../frontend/styles')));
app.use('/scripts/proposal/shared',
    express.static(path.join(__dirname, 'proposal/shared')));
app.use('/scripts', express.static(path.join(__dirname, '../frontend/scripts')));
app.use('/images', express.static(path.join(__dirname, '../frontend/images')));

// ✅ If using locally installed xlsx, serve it too
app.use('/scripts/xlsx', express.static(path.join(__dirname, 'node_modules/xlsx/dist')));

// ✅ Sentinel Lite — static only, and that is the whole point.
// The dealer's .apex files are compared by Pyodide inside their own browser, so
// this server never receives one and offers no endpoint that could accept one.
// Published from the Sentinel (Lite) repo with `tools/publish_web.py`.
const sentinelLiteRoot = path.join(__dirname, '../frontend/sentinel_lite');

app.use('/sentinel_lite', (req, res, next) => {
    // Scoped to this path so the marketing pages keep their current headers.
    // 'wasm-unsafe-eval' is what lets the browser compile the Pyodide module;
    // connect-src 'self' allows the count-only Compare beacon on this origin.
    res.setHeader(
        'Content-Security-Policy',
        [
            "default-src 'self'",
            "script-src 'self' 'wasm-unsafe-eval'",
            "worker-src 'self'",
            "style-src 'self' 'unsafe-inline'",
            "font-src 'self'",
            "img-src 'self' data:",
            "connect-src 'self'",
            "form-action 'none'",
            "frame-ancestors 'none'",
        ].join('; '),
    );
    next();
});

app.use(
    '/sentinel_lite',
    express.static(sentinelLiteRoot, {
        setHeaders: (res, filePath) => {
            if (filePath.endsWith('.wasm')) {
                // Express does not know this type, and the browser refuses to
                // compile a module served as application/octet-stream.
                res.setHeader('Content-Type', 'application/wasm');
            }
            // The runtime is version-pinned and republished as whole files, so it
            // can be cached hard. The app shell must not be.
            const pinned = filePath.includes(`${path.sep}vendor${path.sep}`);
            res.setHeader(
                'Cache-Control',
                pinned ? 'public, max-age=31536000, immutable' : 'no-cache',
            );
        },
    }),
);

app.get('/sentinel_lite', (req, res, next) => {
    const pathOnly = req.originalUrl.split('?')[0];
    if (pathOnly === '/sentinel_lite') {
        res.redirect('/sentinel_lite/');
        return;
    }
    next();
});

// ✅ Redirect root URL to /consultation/
app.get('/', (req, res) => {
    res.redirect('/consultation');
});

// ✅ Serve Consultation Page
app.get('/consultation', (req, res) => {
    // res.sendFile(path.join(__dirname, 'consultation.html'));
    res.sendFile(path.join(__dirname, '../frontend/consultation.html'));

});

app.get('/faq', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/faq.html'));
});

app.get('/rti_proposal', (req, res, next) => {
    // Express is not strict about trailing slashes: `/rti_proposal` and
    // `/rti_proposal/` match the same route. Redirect only the unsuffixed URL
    // so `/rti_proposal/` can still serve the page.
    const pathOnly = req.originalUrl.split('?')[0];
    if (pathOnly === '/rti_proposal') {
        res.redirect('/rti_proposal/');
        return;
    }
    next();
});

app.get('/rti_proposal/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/rti_proposal.html'));
});

app.get('/rti_proposal/preview.pdf', handleProposalPdfPreview);
app.get('/rti_proposal/audit/:reference', handleProposalAudit);

app.get('/idea-feedback', (req, res, next) => {
    const pathOnly = req.originalUrl.split('?')[0];
    if (pathOnly === '/idea-feedback') {
        const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
        res.redirect('/idea-feedback/' + qs);
        return;
    }
    next();
});
app.use('/idea-feedback', ideaFeedbackRoutes);

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
let dbURI;
try {
    dbURI = requireMongoUri(process.env.MONGO_URI);
} catch (err) {
    console.error(err.message);
    process.exit(1);
}
mongoose.connect(dbURI)
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// ✅ Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});


