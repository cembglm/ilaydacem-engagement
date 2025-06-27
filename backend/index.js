import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import AWS from 'aws-sdk';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Backblaze B2 konfigürasyonu (S3 uyumlu API kullanarak)
const s3 = new AWS.S3({
  endpoint: process.env.BACKBLAZE_ENDPOINT,
  region: process.env.BACKBLAZE_REGION,
  accessKeyId: process.env.BACKBLAZE_ACCESS_KEY_ID,
  secretAccessKey: process.env.BACKBLAZE_SECRET_ACCESS_KEY,
  s3ForcePathStyle: true,
  signatureVersion: 'v4'
});

// Middleware
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173', 
    'http://localhost:5174',
    'https://ilaydacem.com',
    'https://www.ilaydacem.com',
    'http://ilaydacem.com',
    'http://www.ilaydacem.com'
  ],
  credentials: true
}));
app.use(express.json());

// Serve static files from dist directory (production)
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(process.cwd(), '..', 'dist');
  console.log(`📁 Static files path: ${distPath}`);
  console.log(`📁 Current working directory: ${process.cwd()}`);
  
  // Check if dist directory exists
  if (fs.existsSync(distPath)) {
    console.log(`✅ Dist directory found at: ${distPath}`);
    app.use(express.static(distPath));
  } else {
    console.log(`❌ Dist directory not found at: ${distPath}`);
  }
}

// Configure multer for file uploads (geçici olarak)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = './uploads';
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const originalName = file.originalname;
    const extension = path.extname(originalName);
    const nameWithoutExt = path.basename(originalName, extension);
    const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9ğĞıİöÖüÜşŞçÇ]/g, '_');
    cb(null, `${timestamp}_${sanitizedName}${extension}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 * 1024 // 10GB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      // Resim formatları - Desktop & Mobile
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'image/bmp', 'image/tiff', 'image/tif', 'image/svg+xml', 'image/heic', 'image/heif',
      
      // Video formatları - Desktop & Mobile
      'video/mp4', 'video/mov', 'video/avi', 'video/quicktime', 'video/wmv',
      'video/flv', 'video/webm', 'video/mkv', 'video/m4v', 'video/3gp', 'video/3gpp',
      'video/3gpp2', 'video/x-msvideo', 'video/x-ms-wmv', 'video/x-flv'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Desteklenmeyen dosya türü. Sadece resim ve video dosyaları kabul edilir.'), false);
    }
  }
});

// Helper function to upload file to Backblaze B2
const uploadFileToBackblaze = async (filePath, fileName, uploaderName) => {
  try {
    const fileStream = fs.createReadStream(filePath);
    const fileExtension = path.extname(fileName).toLowerCase();
    
    // Content type belirleme
    let contentType = 'application/octet-stream';
    if (['.jpg', '.jpeg'].includes(fileExtension)) contentType = 'image/jpeg';
    else if (fileExtension === '.png') contentType = 'image/png';
    else if (fileExtension === '.gif') contentType = 'image/gif';
    else if (fileExtension === '.webp') contentType = 'image/webp';
    else if (fileExtension === '.mp4') contentType = 'video/mp4';
    else if (['.mov', '.quicktime'].includes(fileExtension)) contentType = 'video/quicktime';
    else if (fileExtension === '.avi') contentType = 'video/x-msvideo';

    const key = `ilayda-cem/${uploaderName}/${fileName}`;
    
    const uploadParams = {
      Bucket: process.env.BACKBLAZE_BUCKET_NAME,
      Key: key,
      Body: fileStream,
      ContentType: contentType,
      ACL: 'public-read'
    };

    const result = await s3.upload(uploadParams).promise();
    
    return {
      id: key,
      url: result.Location,
      originalName: fileName,
      key: result.Key,
      bucket: result.Bucket,
      size: fs.statSync(filePath).size,
      contentType: contentType,
      createdAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Backblaze upload error:', error);
    throw new Error(`Backblaze yükleme hatası: ${error.message}`);
  }
};

// Helper function to create and upload note file to Backblaze (HTML format)
const createAndUploadNote = async (userName, note) => {
  if (!note || !note.trim()) return null;
  
  try {
    const currentDate = new Date().toLocaleString('tr-TR', {
      timeZone: 'Europe/Istanbul',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // HTML içeriği oluştur
    const htmlContent = `<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${userName} - İyi Dilekler</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
            margin: 0;
            padding: 20px;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            max-width: 600px;
            text-align: center;
        }
        .header {
            margin-bottom: 30px;
        }
        .header h1 {
            color: #e91e63;
            margin: 0;
            font-size: 2.5em;
            font-weight: 300;
        }
        .header h2 {
            color: #666;
            margin: 10px 0;
            font-weight: 400;
        }
        .wish-content {
            background: linear-gradient(135deg, #fce4ec 0%, #f8bbd9 100%);
            border-radius: 15px;
            padding: 30px;
            margin: 30px 0;
            border-left: 5px solid #e91e63;
        }
        .wish-text {
            font-size: 1.2em;
            line-height: 1.6;
            color: #333;
            font-style: italic;
            margin: 0;
        }
        .author {
            margin-top: 20px;
            font-weight: bold;
            color: #e91e63;
            font-size: 1.1em;
        }
        .date {
            color: #999;
            font-size: 0.9em;
            margin-top: 20px;
        }
        .hearts {
            font-size: 2em;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>💕 İlayda & Cem 💕</h1>
            <h2>Nişan Kutlamaları</h2>
        </div>
        
        <div class="hearts">💖 💕 💖</div>
        
        <div class="wish-content">
            <p class="wish-text">"${note.replace(/\n/g, '<br>')}"</p>
            <div class="author">- ${userName}</div>
        </div>
        
        <div class="date">📅 ${currentDate}</div>
    </div>
</body>
</html>`;

    const key = `ilayda-cem/${userName}/${userName}_notu.html`;
    
    const uploadParams = {
      Bucket: process.env.BACKBLAZE_BUCKET_NAME,
      Key: key,
      Body: htmlContent,
      ContentType: 'text/html',
      ACL: 'public-read'
    };

    const result = await s3.upload(uploadParams).promise();
    
    return {
      id: key,
      url: result.Location,
      fileName: `${userName}_notu.html`,
      key: result.Key,
      bucket: result.Bucket,
      size: Buffer.byteLength(htmlContent, 'utf8'),
      createdAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Note upload error:', error);
    throw new Error(`Not dosyası yükleme hatası: ${error.message}`);
  }
};

// Test Backblaze bağlantısı
const testBackblazeConnection = async () => {
  try {
    await s3.headBucket({ Bucket: process.env.BACKBLAZE_BUCKET_NAME }).promise();
    console.log('✅ Backblaze B2 bağlantısı başarılı');
    return true;
  } catch (error) {
    console.error('❌ Backblaze bağlantı hatası:', error.message);
    return false;
  }
};

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'İlayda & Cem Nişan Fotoğrafları Backend API',
    status: 'Çalışıyor',
    storage: 'Backblaze B2',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', async (req, res) => {
  const backblazeStatus = await testBackblazeConnection();
  
  const healthStatus = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    backblaze: backblazeStatus ? 'Bağlı' : 'Bağlantı Yok',
    bucket: process.env.BACKBLAZE_BUCKET_NAME || 'Yapılandırılmamış',
    environment: process.env.NODE_ENV || 'development'
  };
  
  res.json(healthStatus);
});

// Upload endpoint
app.post('/upload', upload.array('files'), async (req, res) => {
  try {
    const { uploaderName, uploaderWish } = req.body;
    const files = req.files;    if (!uploaderName || !uploaderName.trim()) {
      return res.status(400).json({ 
        error: 'Yükleyici adı gereklidir' 
      });
    }

    // Dosya veya not gerekli
    if ((!files || files.length === 0) && (!uploaderWish || !uploaderWish.trim())) {
      return res.status(400).json({ 
        error: 'En az bir dosya yüklemesi veya iyi dilek yazılması gereklidir' 
      });
    }    const fileCount = files ? files.length : 0;
    console.log(`${uploaderName.trim()} için ${fileCount} dosya yükleme işlemi başlatıldı...`);

    const uploadResults = [];
    const errors = [];
      // Her dosyayı Backblaze'e yükle (eğer dosya varsa)
    if (files && files.length > 0) {
      for (const file of files) {
        try {          const uploadResult = await uploadFileToBackblaze(
            file.path, 
            file.originalname, 
            uploaderName.trim()
          );
          
          uploadResults.push(uploadResult);

          // Geçici dosyayı sil
          fs.unlinkSync(file.path);
          console.log(`✅ Dosya başarıyla yüklendi: ${file.originalname}`);
        } catch (error) {
          console.error(`❌ Dosya yükleme hatası (${file.originalname}):`, error);
          errors.push({
            fileName: file.originalname,
            error: error.message
          });
          
          // Geçici dosyayı sil
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        }
      }
    }

    // Not dosyasını yükle (eğer varsa)
    let noteResult = null;
    if (uploaderWish && uploaderWish.trim()) {
      try {
        noteResult = await createAndUploadNote(uploaderName.trim(), uploaderWish.trim());
        console.log(`✅ Not dosyası yüklendi: ${noteResult?.fileName}`);
      } catch (error) {
        console.error('❌ Not dosyası yükleme hatası:', error);
        errors.push({
          fileName: 'Not dosyası',
          error: error.message
        });      }
    }    const response = {
      success: true,
      message: `${uploadResults.length} dosya başarıyla Backblaze B2'ye yüklendi`,
      uploaderName: uploaderName.trim(),
      backblazeFolder: `ilayda-cem/${uploaderName.trim()}`,
      uploadedFiles: uploadResults,
      note: noteResult,
      errors: errors.length > 0 ? errors : null,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    console.error('❌ Upload hatası:', error);
    
    // Geçici dosyaları temizle
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }

    res.status(500).json({ 
      error: 'Dosya yükleme işlemi başarısız',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Backblaze'deki dosyaları listeleme endpoint'i
app.get('/files/:uploaderName?', async (req, res) => {
  try {
    const { uploaderName } = req.params;
    const prefix = uploaderName ? `ilayda-cem/${uploaderName}/` : 'ilayda-cem/';
    
    const listParams = {
      Bucket: process.env.BACKBLAZE_BUCKET_NAME,
      Prefix: prefix,
      MaxKeys: 500
    };

    const result = await s3.listObjectsV2(listParams).promise();

    res.json({
      success: true,
      folder: prefix,
      totalFiles: result.Contents.length,
      files: result.Contents.map(object => ({
        id: object.Key,
        key: object.Key,
        url: `${process.env.BACKBLAZE_ENDPOINT}/${process.env.BACKBLAZE_BUCKET_NAME}/${object.Key}`,
        size: object.Size,
        lastModified: object.LastModified,
        storageClass: object.StorageClass
      }))
    });
  } catch (error) {
    console.error('❌ Dosya listeleme hatası:', error);
    res.status(500).json({ 
      error: 'Dosyalar listelenemedi',
      details: error.message 
    });
  }
});

// Notları listeleme endpoint'i
app.get('/notes', async (req, res) => {
  try {
    const listParams = {
      Bucket: process.env.BACKBLAZE_BUCKET_NAME,
      Prefix: 'ilayda-cem/',
      Delimiter: '/'
    };

    const result = await s3.listObjectsV2(listParams).promise();
    
    // HTML not dosyalarını filtrele
    const noteFiles = result.Contents
      .filter(object => object.Key.endsWith('_notu.html'))
      .map(object => {
        const parts = object.Key.split('/');
        const userName = parts[1];
        const fileName = parts[2];
        
        return {
          id: object.Key,
          userName: userName,
          fileName: fileName,
          url: `${process.env.BACKBLAZE_ENDPOINT}/${process.env.BACKBLAZE_BUCKET_NAME}/${object.Key}`,
          size: object.Size,
          lastModified: object.LastModified,
          storageClass: object.StorageClass
        };
      })
      .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

    res.json({
      success: true,
      totalNotes: noteFiles.length,
      notes: noteFiles
    });
  } catch (error) {
    console.error('❌ Notları listeleme hatası:', error);
    res.status(500).json({ 
      error: 'Notlar listelenemedi',
      details: error.message 
    });
  }
});

// Specific user'ın notunu getirme endpoint'i
app.get('/notes/:userName', async (req, res) => {
  try {
    const { userName } = req.params;
    const noteKey = `ilayda-cem/${userName}/${userName}_notu.html`;
    
    // Check if note exists
    try {
      await s3.headObject({
        Bucket: process.env.BACKBLAZE_BUCKET_NAME,
        Key: noteKey
      }).promise();
      
      const noteUrl = `${process.env.BACKBLAZE_ENDPOINT}/${process.env.BACKBLAZE_BUCKET_NAME}/${noteKey}`;
      
      res.json({
        success: true,
        userName: userName,
        noteUrl: noteUrl,
        fileName: `${userName}_notu.html`
      });
    } catch (notFoundError) {
      res.status(404).json({
        success: false,
        error: 'Bu kullanıcıya ait not bulunamadı',
        userName: userName
      });
    }
  } catch (error) {
    console.error('❌ Not getirme hatası:', error);
    res.status(500).json({ 
      error: 'Not getirilemedi',
      details: error.message 
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Uygulama hatası:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: 'Dosya boyutu çok büyük. Maksimum 100MB olmalıdır.' 
      });
    }
  }
  
  res.status(500).json({ 
    error: 'Sunucu hatası',
    details: error.message 
  });
});

// 404 handler for API routes only
app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint bulunamadı',
    path: req.path,
    method: req.method
  });
});

// Production'da React Router için catch-all handler (en sonda olmalı)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    const indexPath = path.join(process.cwd(), '..', 'dist', 'index.html');
    console.log(`📄 Serving index.html from: ${indexPath}`);
    
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      console.log(`❌ index.html not found at: ${indexPath}`);
      res.status(404).send('Frontend files not found');
    }
  });
}

app.listen(port, '0.0.0.0', async () => {
  console.log(`🚀 Server ${port} portunda çalışıyor`);
  console.log(`📁 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5174'}`);
  console.log(`🗄️  Backblaze Bucket: ${process.env.BACKBLAZE_BUCKET_NAME || 'Yapılandırılmamış'}`);
  console.log(`🌍 Backblaze Region: ${process.env.BACKBLAZE_REGION || 'Yapılandırılmamış'}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Backblaze bağlantısını test et
  try {
    await testBackblazeConnection();
    console.log('✅ Backblaze B2 bağlantısı başarılı');
  } catch (error) {
    console.error('❌ Backblaze B2 bağlantı hatası:', error.message);
  }
});
