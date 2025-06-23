# Frontend Vercel Deploy Rehberi

## 1. GitHub'a Kod Yükle

Önce projenizi GitHub'a yükleyin:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/KULLANICI_ADI/REPO_ADI.git
git push -u origin main
```

## 2. Vercel'e Deploy

1. https://vercel.com adresine git
2. GitHub ile giriş yap
3. "New Project" butonuna tıkla
4. GitHub repository'nizi seç
5. Build settings:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`

## 3. Environment Variables

Vercel dashboard'da Environment Variables ekle:

```
VITE_API_URL=https://your-backend.railway.app
```

## 4. Custom Domain (ilaydacem.com)

1. Vercel dashboard > Settings > Domains
2. "ilaydacem.com" ve "www.ilaydacem.com" ekle
3. GoDaddy'de DNS ayarları:

### A Records:
```
Type: A
Name: @
Value: 76.76.19.61
TTL: 600

Type: A  
Name: www
Value: 76.76.19.61
TTL: 600
```

### CNAME Record:
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 600
```

## 5. SSL Certificate

Vercel otomatik olarak SSL certificate sağlayacak. 24 saat içinde aktif olur.

## Alternatif DNS Ayarları (Nameservers):

GoDaddy'de nameservers'ı Vercel'e yönlendirebilirsiniz:
```
ns1.vercel-dns.com
ns2.vercel-dns.com
```
