import React, { useState, useRef, useCallback } from 'react';
import { Upload, Heart, X, Play, Image, Video, User, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  type: 'image' | 'video';
  uploaderName: string;
  uploaderWish: string;
  uploadProgress?: number;
  uploadStatus?: 'pending' | 'uploading' | 'completed' | 'error';
}

function App() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploaderName, setUploaderName] = useState('');
  const [uploaderWish, setUploaderWish] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ana gönderim fonksiyonu
  const handleSubmit = async () => {
    if (!uploaderName.trim()) {
      alert('Lütfen adınızı girin');
      return;
    }

    if (files.length === 0 && !uploaderWish.trim()) {
      alert('Lütfen en az bir fotoğraf/video yükleyin veya iyi dileklerinizi yazın');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Upload işlemi
      if (files.length > 0) {
        await uploadToBackend(files, uploaderName.trim() || 'Anonim', uploaderWish.trim());
      } else {
        // Sadece not gönder (dosya yok)
        await uploadToBackend([], uploaderName.trim() || 'Anonim', uploaderWish.trim());
      }
      
      alert('✅ Mesajınız başarıyla gönderildi!');
      
      // Formu temizle
      setUploaderName('');
      setUploaderWish('');
      
      // Dosya önizlemelerini temizle
      files.forEach(file => {
        URL.revokeObjectURL(file.preview);
      });
      setFiles([]);
      
    } catch (error) {
      console.error('Upload failed:', error);
      alert('❌ Gönderim başarısız oldu. Lütfen tekrar deneyin.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const createFileObject = useCallback((file: File): UploadedFile => {
    const id = Math.random().toString(36).substring(2, 15);
    const preview = URL.createObjectURL(file);
    const type = file.type.startsWith('video/') ? 'video' : 'image';
    
    return {
      id,
      file,
      preview,
      type,
      uploaderName: uploaderName.trim() || 'Anonim',
      uploaderWish: uploaderWish.trim(),
      uploadProgress: 0,
      uploadStatus: 'pending'
    };
  }, [uploaderName, uploaderWish]);

  // Dosya sıkıştırma fonksiyonu (sadece resimler için)
  const compressImage = useCallback((file: File, maxWidth = 1920, quality = 0.85): Promise<File> => {
    return new Promise((resolve) => {
      // Video dosyaları için sıkıştırma yapmayız
      if (file.type.startsWith('video/')) {
        resolve(file);
        return;
      }

      // Resim dosyaları için sıkıştırma
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = document.createElement('img') as HTMLImageElement;
      
      img.onload = () => {
        // Orijinal boyutları koru, sadece çok büyükse küçült
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        const newWidth = ratio < 1 ? img.width * ratio : img.width;
        const newHeight = ratio < 1 ? img.height * ratio : img.height;
        
        canvas.width = newWidth;
        canvas.height = newHeight;
        
        // Resmi canvas'a çiz
        ctx?.drawImage(img, 0, 0, newWidth, newHeight);
        
        // Canvas'ı blob'a çevir
        canvas.toBlob((blob) => {
          if (blob) {
            // Sıkıştırılmış dosya daha büyükse orijinali kullan
            const compressedFile = blob.size < file.size 
              ? new File([blob], file.name, { type: file.type })
              : file;
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        }, file.type, quality);
      };
      
      img.onerror = () => resolve(file);
      img.src = URL.createObjectURL(file);
    });
  }, []);

  const uploadToBackend = async (fileObjects: UploadedFile[], uploaderNameParam?: string, uploaderWishParam?: string) => {
    const formData = new FormData();
    
    // Dosyaları sıkıştır ve FormData'ya ekle
    const compressedFiles = await Promise.all(
      fileObjects.map(async (fileObj) => {
        // Update file status to uploading
        setFiles(prev => prev.map(f => 
          f.id === fileObj.id 
            ? { ...f, uploadStatus: 'uploading' as const, uploadProgress: 0 }
            : f
        ));
        
        // Resim dosyalarını sıkıştır
        const compressedFile = await compressImage(fileObj.file);
        formData.append('files', compressedFile);
        
        return { ...fileObj, file: compressedFile };
      })
    );
    
    // Add uploader info - use parameters if provided, otherwise use state
    const finalUploaderName = uploaderNameParam || uploaderName.trim();
    const finalUploaderWish = uploaderWishParam || uploaderWish.trim();
    
    formData.append('uploaderName', finalUploaderName);
    formData.append('uploaderWish', finalUploaderWish);

    console.log('Yükleme başlatılıyor:', {
      fileCount: compressedFiles.length,
      uploaderName: finalUploaderName,
      uploaderWish: finalUploaderWish,
      totalSize: Array.from(formData.getAll('files')).reduce((total, file) => total + (file as File).size, 0)
    });

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // Upload progress event
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          setUploadProgress(percentComplete);
          
          // Update individual file progress proportionally
          const progressPerFile = percentComplete / compressedFiles.length;
          setFiles(prev => prev.map(f => {
            const fileObj = compressedFiles.find(fo => fo.id === f.id);
            if (fileObj && f.uploadStatus === 'uploading') {
              return { ...f, uploadProgress: Math.min(100, progressPerFile) };
            }
            return f;
          }));
          
          console.log('Upload progress:', Math.round(percentComplete) + '%');
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText);
            console.log('Upload result:', result);

            // Mark all files as completed
            compressedFiles.forEach(fileObj => {
              setFiles(prev => prev.map(f => 
                f.id === fileObj.id 
                  ? { ...f, uploadStatus: 'completed' as const, uploadProgress: 100 }
                  : f
              ));
            });

            // Complete overall progress
            setUploadProgress(100);
            resolve(result);
          } catch (error) {
            console.error('Error parsing response:', error);
            reject(new Error('Invalid response format'));
          }
        } else {
          // Mark all files as error
          compressedFiles.forEach(fileObj => {
            setFiles(prev => prev.map(f => 
              f.id === fileObj.id 
                ? { ...f, uploadStatus: 'error' as const, uploadProgress: 0 }
                : f
            ));
          });
          
          console.error('Upload failed with status:', xhr.status);
          reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        // Mark all files as error
        compressedFiles.forEach(fileObj => {
          setFiles(prev => prev.map(f => 
            f.id === fileObj.id 
              ? { ...f, uploadStatus: 'error' as const, uploadProgress: 0 }
              : f
          ));
        });
        
        console.error('Upload error');
        reject(new Error('Upload failed'));
      });

      // Handle abort
      xhr.addEventListener('abort', () => {
        // Mark all files as error
        compressedFiles.forEach(fileObj => {
          setFiles(prev => prev.map(f => 
            f.id === fileObj.id 
              ? { ...f, uploadStatus: 'error' as const, uploadProgress: 0 }
              : f
          ));
        });
        
        console.error('Upload aborted');
        reject(new Error('Upload aborted'));
      });

      // Open and send request with optimizations
      const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:3001');
      xhr.open('POST', `${apiUrl}/upload`);
      
      // Set timeout to 5 minutes for large files
      xhr.timeout = 300000; // 5 minutes
      
      xhr.send(formData);
    });
  };

  const handleFiles = useCallback(async (newFiles: File[]) => {
    if (import.meta.env.DEV) {
      console.log('📂 handleFiles called with:', newFiles.length, 'files');
    }
    
    const allowedTypes = [
      // Resim formatları
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'image/bmp', 'image/tiff', 'image/tif', 'image/svg+xml', 'image/heic', 'image/heif',
      // Video formatları
      'video/mp4', 'video/mov', 'video/avi', 'video/quicktime', 'video/wmv',
      'video/flv', 'video/webm', 'video/mkv', 'video/m4v', 'video/3gp', 'video/3gpp',
      'video/3gpp2', 'video/x-msvideo', 'video/x-ms-wmv', 'video/x-flv'
    ];

    const validFiles = newFiles.filter(file => {
      if (import.meta.env.DEV) {
        console.log('🔍 Checking file:', file.name, 'Type:', file.type, 'Size:', Math.round(file.size / 1024 / 1024) + 'MB');
      }
      
      // MIME type kontrolü
      if (allowedTypes.includes(file.type)) {
        if (import.meta.env.DEV) {
          console.log('✅ File accepted by MIME type:', file.type);
        }
        return true;
      }
      
      // Dosya uzantısı kontrolü (MIME type algılanmazsa)
      const fileExtension = file.name.toLowerCase().split('.').pop();
      const allowedExtensions = [
        'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'tif', 'svg', 'heic', 'heif',
        'mp4', 'mov', 'avi', 'wmv', 'flv', 'webm', 'mkv', 'm4v', '3gp', '3gpp'
      ];
      
      const extensionValid = allowedExtensions.includes(fileExtension || '');
      if (import.meta.env.DEV) {
        console.log('🔍 Extension check:', fileExtension, 'Valid:', extensionValid);
        if (file.type.startsWith('video/') || fileExtension && ['mp4', 'mov', 'avi', '3gp'].includes(fileExtension)) {
          console.log('🎥 Video file detected:', file.name, 'MIME:', file.type);
        }
      }
      
      return extensionValid;
    });

    if (import.meta.env.DEV) {
      console.log('✅ Valid files:', validFiles.length, 'out of', newFiles.length);
    }

    // Geçersiz dosyalar hakkında kullanıcıyı bilgilendir
    const invalidFiles = newFiles.length - validFiles.length;
    if (invalidFiles > 0) {
      alert(`${invalidFiles} dosya desteklenmeyen formatta olduğu için eklenmedi. Lütfen resim veya video dosyaları seçin.`);
    }

    // Başarılı dosya seçimi geri bildirimi
    if (validFiles.length > 0) {
      // iOS ve mobil cihazlar için haptic feedback (varsa)
      if ('vibrate' in navigator) {
        navigator.vibrate(50); // Kısa titreşim
      }
      
      // Görsel geri bildirim için kısa bir başarı mesajı
      const fileText = validFiles.length === 1 ? '1 dosya' : `${validFiles.length} dosya`;
      const fileTypes = validFiles.map(f => f.type.startsWith('video/') ? 'video' : 'fotoğraf');
      const uniqueTypes = [...new Set(fileTypes)];
      const typeText = uniqueTypes.join(' ve ');
      
      // Toast-style bildirim göster (2 saniye sonra kaybolacak)
      const notification = document.createElement('div');
      notification.innerHTML = `
        <div style="
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          padding: 12px 24px;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);
          z-index: 10000;
          font-size: 14px;
          font-weight: 600;
          animation: slideDown 0.3s ease-out;
        ">
          ✅ ${fileText} başarıyla seçildi (${typeText})
        </div>
        <style>
          @keyframes slideDown {
            from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
            to { opacity: 1; transform: translateX(-50%) translateY(0); }
          }
        </style>
      `;
      document.body.appendChild(notification);
      
      // 2.5 saniye sonra bildirimi kaldır
      setTimeout(() => {
        if (notification.parentNode) {
          notification.style.opacity = '0';
          notification.style.transform = 'translateX(-50%) translateY(-20px)';
          setTimeout(() => {
            if (notification.parentNode) {
              document.body.removeChild(notification);
            }
          }, 300);
        }
      }, 2500);
    }

    const fileObjects = validFiles.map(createFileObject);
    if (import.meta.env.DEV) {
      console.log('📦 Created file objects:', fileObjects.length);
    }
    
    setFiles(prev => {
      const newFileList = [...prev, ...fileObjects];
      if (import.meta.env.DEV) {
        console.log('📝 Updated file list length:', newFileList.length);
      }
      return newFileList;
    });
  }, [createFileObject]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  }, [handleFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (import.meta.env.DEV) {
      console.log('📱 File input triggered:', e.target.files);
      console.log('📱 Number of files:', e.target.files?.length);
    }
    
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      if (import.meta.env.DEV) {
        console.log('📱 Selected files:', selectedFiles.map(f => ({ name: f.name, type: f.type, size: f.size })));
      }
      handleFiles(selectedFiles);
      
      // Input'u sıfırla ki aynı dosya tekrar seçilebilsin
      e.target.value = '';
    } else {
      if (import.meta.env.DEV) {
        console.log('📱 No files selected or files is null');
      }
    }
  }, [handleFiles]);

  const removeFile = (id: string) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove) {
        // Don't remove if currently uploading
        if (fileToRemove.uploadStatus === 'uploading') {
          return prev;
        }
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-rose-400 via-pink-400 to-orange-400 px-6 py-12 text-white">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-white/20 p-4 backdrop-blur-sm">
              <Heart className="h-8 w-8 fill-current" />
            </div>
          </div>
          <h1 className="mb-2 text-4xl font-bold tracking-tight sm:text-5xl">
            İlayda & Cem
          </h1>
          <p className="text-xl font-medium text-rose-100">
            Nişan Fotoğrafları
          </p>
          <p className="text-lg font-medium text-rose-200 mb-2">
            29 Haziran 2025
          </p>
          <p className="mt-4 text-lg text-rose-50">
            Sevginin büyüsünü yakaladığımız anlara ait fotoğraf ve videolarınızı yükleyin
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-12">
        {/* Main Upload Form */}
        <div className="mb-8">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-rose-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="rounded-full bg-gradient-to-r from-rose-400 to-pink-400 p-2">
                <User className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">
                Fotoğraf Paylaşımı ve İyi Dilekler
              </h2>
            </div>
            
            <div className="space-y-6">
              {/* Name Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adınız Soyadınız <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={uploaderName}
                  onChange={(e) => setUploaderName(e.target.value)}
                  placeholder="Adınız Soyadınız"
                  className="w-full px-4 py-3 rounded-xl border border-rose-200 focus:border-rose-400 focus:ring-4 focus:ring-rose-100 outline-none transition-all duration-200 bg-white/80 text-gray-800 placeholder-gray-500"
                />
              </div>

              {/* Wish Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  İyi Dilekleriniz
                </label>
                <textarea
                  value={uploaderWish}
                  onChange={(e) => setUploaderWish(e.target.value)}
                  placeholder="İlayda ve Cem'e iyi dileklerinizi yazın..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-rose-200 focus:border-rose-400 focus:ring-4 focus:ring-rose-100 outline-none transition-all duration-200 bg-white/80 text-gray-800 placeholder-gray-500 resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  İsteğe bağlı - İlayda ve Cem için güzel dileklerinizi paylaşın
                </p>
              </div>

              {/* File Upload Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fotoğraf ve Videolar <span className="text-rose-500">*</span>
                </label>
                
                {/* Upload Area */}
                <div
                  className={`relative border-2 border-dashed rounded-2xl transition-all duration-300 cursor-pointer ${
                    isDragOver
                      ? 'border-rose-400 bg-rose-50'
                      : uploaderName.trim()
                      ? 'border-rose-200 hover:border-rose-300 bg-white'
                      : 'border-gray-300 bg-gray-50'
                  }`}
                  onDrop={uploaderName.trim() ? handleDrop : undefined}
                  onDragOver={uploaderName.trim() ? handleDragOver : undefined}
                  onDragLeave={uploaderName.trim() ? handleDragLeave : undefined}
                  onClick={() => {
                    if (import.meta.env.DEV) {
                      console.log('🖱️ Upload area clicked');
                      console.log('🖱️ Uploader name:', uploaderName.trim());
                      console.log('🖱️ File input ref:', fileInputRef.current);
                    }
                    
                    if (uploaderName.trim() && fileInputRef.current) {
                      if (import.meta.env.DEV) {
                        console.log('🖱️ Triggering file input click from upload area');
                      }
                      fileInputRef.current.click();
                    } else {
                      if (import.meta.env.DEV) {
                        console.log('❌ Cannot trigger file input - missing name or ref');
                      }
                      if (!uploaderName.trim()) {
                        alert('Lütfen önce adınızı girin');
                      }
                    }
                  }}
                  onTouchStart={() => {
                    if (import.meta.env.DEV) {
                      console.log('📱 Touch start on upload area');
                    }
                  }}
                >
                  <div className="p-8 text-center">
                    <div className="flex justify-center mb-4">
                      <div className={`rounded-full p-4 ${
                        uploaderName.trim() ? 'bg-rose-100' : 'bg-gray-200'
                      }`}>
                        <Upload className={`h-8 w-8 ${
                          uploaderName.trim() ? 'text-rose-500' : 'text-gray-400'
                        }`} />
                      </div>
                    </div>
                    <h3 className={`text-lg font-semibold mb-2 ${
                      uploaderName.trim() ? 'text-gray-800' : 'text-gray-500'
                    }`}>
                      Fotoğraf ve videolarınızı yükleyin
                    </h3>
                    <p className={`mb-4 ${
                      uploaderName.trim() ? 'text-gray-600' : 'text-gray-400'
                    }`}>
                      {uploaderName.trim() 
                        ? 'Fotoğraf ve videolarınızı yüklemek için buraya dokunun'
                        : 'Dosya seçmek için önce yukarıya adınızı girin'
                      }
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (import.meta.env.DEV) {
                          console.log('📸 File select button clicked');
                        }
                        if (uploaderName.trim() && fileInputRef.current) {
                          fileInputRef.current.click();
                        } else if (!uploaderName.trim()) {
                          alert('Lütfen önce adınızı girin');
                        }
                      }}
                      disabled={!uploaderName.trim()}
                      className={`inline-flex items-center gap-2 px-6 py-3 font-medium rounded-xl transition-all duration-200 ${
                        uploaderName.trim()
                          ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:from-rose-600 hover:to-pink-600 hover:scale-105'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      <Upload className="h-5 w-5" />
                      Dosya Seç / Kamera
                    </button>
                    <p className="text-xs text-gray-500 mt-3">
                      Tüm resim ve video formatları desteklenir (Kamera çekimi, galeri seçimi, JPG, PNG, MP4, MOV, HEIC vb.) - Maks. 10GB
                    </p>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.tif,.svg,.heic,.heif,.mp4,.mov,.avi,.wmv,.flv,.webm,.mkv,.m4v,.3gp,.3gpp"
                  onChange={handleFileInput}
                  className="hidden"
                  key={`file-${Date.now()}`} 
                />
                
                {/* Debug: Visible file input for testing */}
                {import.meta.env.DEV && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                    <h4 className="text-sm font-medium text-yellow-800 mb-2">
                      🔧 Debug: Dosya Seçimi Testi (Sadece Development)
                    </h4>
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-yellow-700">Resim/Video (capture):</label>
                        <input
                          type="file"
                          multiple
                          accept="image/*,video/*"
                          capture="environment"
                          onChange={handleFileInput}
                          className="block w-full text-sm text-gray-700"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-yellow-700">Tüm dosyalar:</label>
                        <input
                          type="file"
                          multiple
                          accept="*/*"
                          onChange={handleFileInput}
                          className="block w-full text-sm text-gray-700"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-yellow-600 mt-1">
                      Eğer üstteki alan çalışmıyorsa, bu alanları kullanın
                    </p>
                  </div>
                )}
              </div>

              {/* File Previews */}
              {files.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Seçilen Dosyalar</h3>
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {files.map((file) => (
                      <div
                        key={file.id}
                        className="group relative overflow-hidden rounded-2xl bg-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                      >
                        {/* Media Preview */}
                        <div className="aspect-square relative overflow-hidden bg-gray-100">
                          {file.type === 'image' ? (
                            <img
                              src={file.preview}
                              alt="Preview"
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                            />
                          ) : (
                            <div className="relative h-full w-full">
                              <video
                                src={file.preview}
                                className="h-full w-full object-cover"
                                muted
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                <div className="rounded-full bg-white/90 p-3">
                                  <Play className="h-6 w-6 text-gray-800 fill-current" />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Media Type Icon */}
                          <div className="absolute top-3 left-3">
                            <div className="rounded-full bg-black/50 p-1.5 backdrop-blur-sm">
                              {file.type === 'image' ? (
                                <Image className="h-4 w-4 text-white" />
                              ) : (
                                <Video className="h-4 w-4 text-white" />
                              )}
                            </div>
                          </div>

                          {/* Upload Status Overlay */}
                          {file.uploadStatus && file.uploadStatus !== 'pending' && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <div className="text-center text-white">
                                {file.uploadStatus === 'uploading' && (
                                  <>
                                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                                    <div className="text-sm font-medium mb-2">Yükleniyor...</div>
                                    <div className="w-16 bg-white/20 rounded-full h-1 mx-auto">
                                      <div 
                                        className="bg-white h-1 rounded-full transition-all duration-300"
                                        style={{ width: `${file.uploadProgress || 0}%` }}
                                      ></div>
                                    </div>
                                    <div className="text-xs mt-1">{Math.round(file.uploadProgress || 0)}%</div>
                                  </>
                                )}
                                {file.uploadStatus === 'completed' && (
                                  <>
                                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-400" />
                                    <div className="text-sm font-medium">Tamamlandı</div>
                                  </>
                                )}
                                {file.uploadStatus === 'error' && (
                                  <>
                                    <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-400" />
                                    <div className="text-sm font-medium">Hata</div>
                                  </>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Remove Button */}
                          <button
                            onClick={() => removeFile(file.id)}
                            disabled={file.uploadStatus === 'uploading'}
                            className="absolute top-3 right-3 rounded-full bg-red-500 p-1.5 text-white opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-600 hover:scale-110 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        {/* File Info */}
                        <div className="p-4">
                          <h3 className="font-medium text-gray-800 truncate mb-1">
                            {file.file.name}
                          </h3>
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-500">
                              {(file.file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                            {file.uploadStatus && (
                              <div className="flex items-center gap-1">
                                {file.uploadStatus === 'uploading' && (
                                  <div className="flex items-center gap-1 text-blue-600">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    <span className="text-xs">Yükleniyor</span>
                                  </div>
                                )}
                                {file.uploadStatus === 'completed' && (
                                  <div className="flex items-center gap-1 text-green-600">
                                    <CheckCircle className="h-3 w-3" />
                                    <span className="text-xs">Tamamlandı</span>
                                  </div>
                                )}
                                {file.uploadStatus === 'error' && (
                                  <div className="flex items-center gap-1 text-red-600">
                                    <AlertCircle className="h-3 w-3" />
                                    <span className="text-xs">Hata</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Overall Upload Progress */}
              {isUploading && (
                <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="flex items-center gap-3 mb-3">
                    <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                    <span className="text-sm font-medium text-blue-700">
                      Dosyalar yükleniyor... {Math.round(uploadProgress)}%
                    </span>
                  </div>
                  <div className="w-full bg-blue-100 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-6">
                <button
                  onClick={handleSubmit}
                  disabled={!uploaderName.trim() || (files.length === 0 && !uploaderWish.trim()) || isUploading}
                  className="w-full px-8 py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-semibold text-lg rounded-xl hover:from-rose-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-rose-200 shadow-lg"
                >
                  <div className="flex items-center justify-center gap-3">
                    {isUploading ? (
                      <>
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span>Gönderiliyor...</span>
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </>
                    ) : (
                      <>
                        <Heart className="h-6 w-6 fill-current" />
                        <span>Gönder</span>
                        <Heart className="h-6 w-6 fill-current" />
                      </>
                    )}
                  </div>
                </button>
                {(!uploaderName.trim() || (files.length === 0 && !uploaderWish.trim()) || isUploading) && (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    {isUploading
                      ? 'Dosyalarınız yükleniyor, lütfen bekleyin...'
                      : !uploaderName.trim() 
                        ? 'Lütfen adınızı girin' 
                        : 'Lütfen en az bir dosya yükleyin veya iyi dileklerinizi yazın'
                    }
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gradient-to-r from-rose-400 via-pink-400 to-orange-400 px-6 py-8 text-center text-white">
        <div className="flex justify-center mb-4">
          <Heart className="h-6 w-6 fill-current" />
        </div>
        <p className="text-rose-100">
          Sevgiyle dolu anlarınızı ve güzel dileklerinizi bizimle paylaştığınız için teşekkürler
        </p>
      </div>
    </div>
  );
}

export default App;