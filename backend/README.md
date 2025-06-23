# İlayda & Cem Nişan Fotoğrafları Backend

Bu backend API, nişan fotoğraflarını yüklemek ve Backblaze B2'ye kaydetmek için geliştirilmiştir.

## Kurulum

1. Dependencies'leri yükleyin:

```bash
cd backend
npm install
```

2. Environment dosyasını oluşturun:

```bash
cp .env.example .env
```

3. `.env` dosyasını Backblaze B2 API bilgilerinizle doldurun:
   - `BACKBLAZE_REGION`: B2 bucket region'ınız
   - `BACKBLAZE_ENDPOINT`: B2 S3-compatible endpoint
   - `BACKBLAZE_ACCESS_KEY_ID`: Application Key ID
   - `BACKBLAZE_SECRET_ACCESS_KEY`: Application Key
   - `BACKBLAZE_BUCKET_NAME`: Bucket adınız

## Backblaze B2 Kurulumu

1. [backblaze.com](https://www.backblaze.com/b2/cloud-storage.html) adresine gidin
2. "Get Started for Free" ile ücretsiz hesap oluşturun (10GB ücretsiz)
3. B2 Cloud Storage dashboard'a girin
4. **Bucket oluşturun:**
   - "Create a Bucket" tıklayın
   - Bucket adı: `ilayda-cem-photos` (veya istediğiniz)
   - Files in Bucket are: **Public**
   - Region seçin (örn: us-west-004)
5. **Application Key oluşturun:**
   - "App Keys" sekmesine gidin
   - "Add a New Application Key" tıklayın
   - Key Name: `ilayda-cem-api`
   - Allow access to Bucket(s): **All** veya sadece oluşturduğunuz bucket
   - Type of Access: **Read and Write**
   - "Create New Key" tıklayın
6. **Bilgileri kaydedin:**
   - `keyID` → `BACKBLAZE_ACCESS_KEY_ID`
   - `applicationKey` → `BACKBLAZE_SECRET_ACCESS_KEY`
   - Bucket name → `BACKBLAZE_BUCKET_NAME`
   - Region/Endpoint → `BACKBLAZE_ENDPOINT`

## Çalıştırma

Development:

```bash
npm run dev
```

Production:

```bash
npm start
```

## API Endpoints

### GET /

Ana sayfa - API durumu

### GET /health

Sağlık kontrolü - Backblaze B2 bağlantı durumu

### POST /upload

Dosya yükleme endpoint'i

**Body (multipart/form-data):**

- `files`: Yüklenecek dosyalar (çoklu)
- `uploaderName`: Yükleyici adı (required)
- `uploaderWish`: İyi dilekler (optional)

**Response:**

```json
{
  "success": true,
  "message": "X dosya başarıyla Backblaze B2'ye yüklendi",
  "uploaderName": "Kullanıcı Adı",
  "backblazeFolder": "ilayda-cem/Kullanıcı Adı",
  "uploadedFiles": [...],
  "note": {...},
  "errors": null,
  "timestamp": "2023-..."
}
```

### GET /files/:uploaderName?

Backblaze B2'deki dosyaları listeler (optional: kullanıcı adına göre)

## Özellikler

- ✅ Çoklu dosya yükleme
- ✅ Backblaze B2 entegrasyonu (10GB ücretsiz)
- ✅ S3 uyumlu API
- ✅ Kullanıcı başına ayrı klasör oluşturma
- ✅ Not dosyası oluşturma
- ✅ Public URL'ler
- ✅ Dosya boyutu kontrolü (100MB)
- ✅ Dosya türü kontrolü (resim/video)
- ✅ CORS desteği
- ✅ Error handling
- ✅ Logging

## Desteklenen Dosya Türleri

**Resimler:** JPG, JPEG, PNG, GIF, WebP
**Videolar:** MP4, MOV, AVI, QuickTime

## Backblaze B2 Avantajları

- 🎯 **10GB ücretsiz storage**
- � Çok ucuz ücretlendirme (sonrasında)
- 🔗 S3 uyumlu API
- � Global CDN desteği
- 📱 Direct public links
- 🚀 Yüksek performance

## Port

Backend varsayılan olarak **3001** portunda çalışır.
