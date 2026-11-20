process.env.PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH || '0';
process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD || '1';

const express = require('express');
const cors = require('cors');
const { chromium } = require('playwright');
const path = require('path');
const { buildDocx } = require('./buildResumeDocx.cjs');

const BROWSER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
];

async function launchBrowser() {
  try {
    const executablePath = chromium.executablePath();
    console.log('Using Playwright browser at:', executablePath);
    return chromium.launch({ headless: true, args: BROWSER_ARGS, executablePath });
  } catch (err) {
    console.warn('Playwright default path failed, retrying without executablePath:', err.message);
    return chromium.launch({ headless: true, args: BROWSER_ARGS });
  }
}

const app = express();
const PORT = process.env.PORT || 3001;

const publicCors = cors();
app.use((req, res, next) => req.path.startsWith('/api/tas-resume/') ? next() : publicCors(req, res, next));
app.use(express.json({ limit: '50mb' }));

// The TAS service credential stays on the server. The deployment selects its course block.
const tasUrl = process.env.TAS_RESUME_BASE_URL;
const tasSecret = process.env.TAS_RESUME_BUILDER_SECRET;
const tasBlock = process.env.TAS_RESUME_BLOCK_ID;
const tasConfigured = Boolean(tasUrl && tasSecret && /^[1-9][0-9]*$/.test(tasBlock || ''));

const tasRoutes = {
  lookup: () => `${tasBlock}/lookup/`,
  recover: () => `${tasBlock}/recover/`,
  submit: () => `${tasBlock}/submit/`,
  status: () => 'status/',
};

app.post('/api/tas-resume/:operation', async (req, res) => {
  const operation = req.params.operation;
  if (!tasConfigured || !Object.hasOwn(tasRoutes, operation)) {
    return res.status(404).json({ detail: 'Resume assessment is unavailable.' });
  }
  res.set('Cache-Control', 'no-store');
  try {
    const upstream = await fetch(`${tasUrl.replace(/\/$/, '')}/tas/api/v1/resume-builder/${tasRoutes[operation]()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-TAS-Resume-Secret': tasSecret },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(30000),
      redirect: 'error',
    });
    if (upstream.status >= 500) {
      return res.status(502).json({ detail: 'TAS is temporarily unavailable. Please try again.' });
    }
    return res.status(upstream.status).json(await upstream.json());
  } catch {
    return res.status(502).json({ detail: 'TAS is temporarily unavailable. Please try again.' });
  }
});

// Serve static files from dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.post('/api/generate-pdf', async (req, res) => {
  try {
    console.log('Received PDF generation request');
    const { html } = req.body;

    if (!html) {
      console.log('No HTML content provided');
      return res.status(400).json({ error: 'HTML content is required' });
    }

    console.log('HTML content length:', html.length);
    console.log('Starting Playwright...');

    const browser = await launchBrowser();

    console.log('Browser launched');

    // Create new page
    const page = await browser.newPage();

    console.log('Page created, setting content...');

    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(1000);

    console.log('Content set, generating PDF...');

    // Generate PDF with improved page break handling
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '3mm',
        right: '10px',
        bottom: '12mm',
        left: '10px'
      }
    });

    console.log('PDF generated, size:', pdf.length);

    // Close browser
    await browser.close();

    console.log('Browser closed, sending PDF...');

    // Return PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=resume.pdf');
    res.send(pdf);

    console.log('PDF sent successfully');

  } catch (error) {
    console.error('PDF generation error:', error);
    
    // Check if it's a Playwright installation issue
    if (error.message.includes('chromium') || error.message.includes('browser')) {
      console.error('Playwright browser issue detected. This might be an installation problem.');
      res.status(500).json({ 
        error: 'PDF generation failed: Browser not available. Please check Playwright installation.' 
      });
    } else {
      res.status(500).json({ error: 'PDF generation failed: ' + error.message });
    }
  }
});

// Word document generation (Option 2: docx from data, preserves format)
app.post('/api/generate-docx', async (req, res) => {
  try {
    const { resumeData, template } = req.body;
    if (!resumeData) {
      return res.status(400).json({ error: 'resumeData is required' });
    }
    const templateId = template || 'resumake-classic';
    const docxBuffer = await buildDocx(resumeData, templateId);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename=resume.docx');
    res.send(Buffer.from(docxBuffer));
  } catch (error) {
    console.error('DOCX generation error:', error);
    res.status(500).json({ error: 'Word document generation failed: ' + error.message });
  }
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
