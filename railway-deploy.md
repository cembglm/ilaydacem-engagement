# Railway Full-Stack Deploy Rehberi

## 1. Railway.app'e git ve hesap aç
- https://railway.app
- GitHub ile giriş yap

## 2. Yeni proje oluştur
- "New Project" > "Deploy from GitHub repo"
- Repository: `cembglm/ilaydacem-engagement`
- Branch: `main`

## 3. Deployment ayarları
Railway otomatik olarak:
- Frontend'i build edecek (npm run build)
- Backend'i çalıştıracak
- Static files serve edecek

## 4. Environment Variables ekle
```
NODE_ENV=production
BACKBLAZE_APPLICATION_KEY_ID=your_key_id
BACKBLAZE_APPLICATION_KEY=your_app_key
BACKBLAZE_BUCKET_ID=your_bucket_id
BACKBLAZE_ENDPOINT=your_endpoint
FRONTEND_URL=https://ilaydacem.com
```

## 5. Custom domain setup
1. Railway dashboard'da "Settings" > "Domains"
2. "Custom Domain" butonuna tıkla
3. `ilaydacem.com` ekle
4. Railway size CNAME record verecek

## 6. GoDaddy DNS ayarları
```
Type: CNAME
Name: @
Value: [railway-verilen-domain]
TTL: 600

Type: CNAME
Name: www
Value: [railway-verilen-domain]
TTL: 600
```

## 7. SSL Certificate
Railway otomatik SSL sertifikası sağlar!
