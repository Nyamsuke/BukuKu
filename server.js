require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const multer  = require('multer');

const app    = express();
const upload = multer();

app.use(cors());
app.use(express.json());

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

app.post('/ocr', upload.single('image'), async (req, response) => {
  try {
    if (!req.file)       return response.status(400).json({ error: 'No file uploaded' });
    if (!GOOGLE_API_KEY) return response.status(500).json({ error: 'GOOGLE_API_KEY belum di-set' });

    const base64    = req.file.buffer.toString('base64');
    const visionRes = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_API_KEY}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image:        { content: base64 },
            features:     [{ type: 'DOCUMENT_TEXT_DETECTION' }],
            imageContext: { languageHints: ['en', 'id'] },
          }],
        }),
      }
    );

    const data = await visionRes.json();

   if (!visionRes.ok) {
      console.error('Vision error detail:', JSON.stringify(data, null, 2));
      return response.status(visionRes.status).json({
        error: 'Google Vision error',
        details: data,
      });
    }


    const raw  = data.responses?.[0] || {};
    const text = raw.fullTextAnnotation?.text || raw.textAnnotations?.[0]?.description || '';

    return response.json({
      text,
      confidence: raw.fullTextAnnotation?.pages?.[0]?.confidence || 0,
    });
  } catch (err) {
    return response.status(500).json({ error: 'OCR gagal', details: err.message || String(err) });
  }
});

app.use(express.static('public'));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server jalan di http://localhost:${PORT}`);
});