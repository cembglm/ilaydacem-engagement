# Deploy Komutları

## 1. Git Repository Oluştur

```bash
git init
git add .
git commit -m "Initial commit - Ilayda & Cem engagement photo app"
```

## 2. GitHub'a Push Et

GitHub'da yeni bir repository oluşturun (ilaydacem-engagement-app) ve sonra:

```bash
git branch -M main
git remote add origin https://github.com/KULLANICI_ADI/ilaydacem-engagement-app.git
git push -u origin main
```

## 3. Backend Deploy (Railway)

1. https://railway.app → Sign up with GitHub
2. New Project → Deploy from GitHub repo
3. Select your repository
4. Root directory: `backend`
5. Add environment variables:
   - NODE_ENV=production
   - BACKBLAZE_APPLICATION_KEY_ID=your_key
   - BACKBLAZE_APPLICATION_KEY=your_secret
   - BACKBLAZE_BUCKET_ID=your_bucket_id
   - BACKBLAZE_ENDPOINT=your_endpoint
   - FRONTEND_URL=https://ilaydacem.com

## 4. Frontend Deploy (Vercel)

1. https://vercel.com → Sign up with GitHub
2. New Project → Import your GitHub repo
3. Framework Preset: Vite
4. Add environment variable:
   - VITE_API_URL=https://your-backend.railway.app
5. Deploy!

## 5. Domain Setup (GoDaddy)

Vercel'den aldığınız DNS bilgilerini GoDaddy'de ayarlayın:

### A Records:
- Type: A, Name: @, Value: 76.76.19.61
- Type: A, Name: www, Value: 76.76.19.61

### CNAME:
- Type: CNAME, Name: www, Value: cname.vercel-dns.com

24 saat içinde aktif olur!
