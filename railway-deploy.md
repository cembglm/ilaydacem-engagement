# Backend Railway Deploy Rehberi

## 1. Railway.app'e git ve hesap aç
- https://railway.app
- GitHub ile giriş yap

## 2. Yeni proje oluştur
- "New Project" > "Deploy from GitHub repo"
- Bu repository'yi seç
- Root directory: `/backend` olarak ayarla

## 3. Environment Variables ekle
```
NODE_ENV=production
BACKBLAZE_APPLICATION_KEY_ID=your_key_id
BACKBLAZE_APPLICATION_KEY=your_app_key
BACKBLAZE_BUCKET_ID=your_bucket_id
BACKBLAZE_ENDPOINT=your_endpoint
FRONTEND_URL=https://ilaydacem.com
```

## 4. Port ayarını yap
Railway otomatik PORT environment variable sağlar.
index.js'te şu şekilde kullan:
```javascript
const PORT = process.env.PORT || 3001;
```

## 5. Custom domain
Railway size bir URL verecek (örn: your-app.railway.app)
Bu URL'yi frontend'te kullanacaksın.
