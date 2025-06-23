# Railway Full-Stack Deploy Rehberi

## Neden Railway Full-Stack?
- ✅ Resim/video upload limitlari cömert
- ✅ Tek yerden yönetim
- ✅ Otomatik SSL sertifikası
- ✅ Custom domain desteği
- ✅ Aylık $5'den başlayan fiyatlar

## 1. Proje Yapısını Hazırla

### Frontend build script ekle:
```json
{
  "scripts": {
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}
```

### Backend'e static file serving ekle:
```javascript
// Serve frontend files
app.use(express.static(path.join(__dirname, '../dist')));

// Catch all handler for React Router
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});
```

## 2. GitHub'a Kod Yükle
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/username/ilayda-cem.git
git push -u origin main
```

## 3. Railway Deploy
1. https://railway.app → GitHub ile giriş
2. "New Project" → "Deploy from GitHub repo"
3. Repository seç
4. Build command: `npm install && npm run build`
5. Start command: `cd backend && npm start`

## 4. Environment Variables
```
NODE_ENV=production
BACKBLAZE_APPLICATION_KEY_ID=your_key_id
BACKBLAZE_APPLICATION_KEY=your_app_key
BACKBLAZE_BUCKET_ID=your_bucket_id
BACKBLAZE_ENDPOINT=your_endpoint
```

## 5. Custom Domain
1. Railway dashboard → Settings → Domains
2. Add custom domain: ilaydacem.com
3. GoDaddy'de DNS ayarları:
   - Type: CNAME
   - Name: @
   - Value: your-app.railway.app

## 6. HTTPS
Railway otomatik SSL sertifikası sağlar.
