import React, { useState, useRef, useCallback } from 'react';
import { Upload, Heart, Camera, X, Play, Image, Video, User } from 'lucide-react';

interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  type: 'image' | 'video';
  uploaderName: string;
  uploaderWish: string;
}

function App() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploaderName, setUploaderName] = useState('');
  const [uploaderWish, setUploaderWish] = useState('');
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
      uploaderWish: uploaderWish.trim()
    };
  }, [uploaderName, uploaderWish]);

  const uploadToBackend = async (fileObjects: UploadedFile[], uploaderNameParam?: string, uploaderWishParam?: string) => {
    const formData = new FormData();
    
    // Add files to FormData
    fileObjects.forEach(fileObj => {
      formData.append('files', fileObj.file);
    });
    
    // Add uploader info - use parameters if provided, otherwise use state
    const finalUploaderName = uploaderNameParam || uploaderName.trim();
    const finalUploaderWish = uploaderWishParam || uploaderWish.trim();
    
    formData.append('uploaderName', finalUploaderName);
    formData.append('uploaderWish', finalUploaderWish);

    console.log('Yükleme başlatılıyor:', {
      fileCount: fileObjects.length,
      uploaderName: finalUploaderName,
      uploaderWish: finalUploaderWish
    });

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/upload`, {
        method: 'POST',
        body: formData,
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error text:', errorText);
        throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Upload result:', result);

      return result;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  const handleFiles = useCallback(async (newFiles: File[]) => {
    const validFiles = newFiles.filter(file => 
      file.type.startsWith('image/') || file.type.startsWith('video/')
    );

    const fileObjects = validFiles.map(createFileObject);
    setFiles(prev => [...prev, ...fileObjects]);
  }, [createFileObject]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  }, [handleFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      handleFiles(selectedFiles);
    }
  }, [handleFiles]);

  const removeFile = (id: string) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove) {
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
                  className={`relative border-2 border-dashed rounded-2xl transition-all duration-300 ${
                    isDragOver
                      ? 'border-rose-400 bg-rose-50'
                      : uploaderName.trim()
                      ? 'border-rose-200 hover:border-rose-300 bg-white'
                      : 'border-gray-300 bg-gray-50'
                  }`}
                  onDrop={uploaderName.trim() ? handleDrop : undefined}
                  onDragOver={uploaderName.trim() ? handleDragOver : undefined}
                  onDragLeave={uploaderName.trim() ? handleDragLeave : undefined}
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
                        ? 'Dosyalarınızı buraya sürükleyip bırakın veya seçmek için tıklayın'
                        : 'Dosya seçmek için önce yukarıya adınızı girin'
                      }
                    </p>
                    <button
                      onClick={() => uploaderName.trim() && fileInputRef.current?.click()}
                      disabled={!uploaderName.trim()}
                      className={`inline-flex items-center gap-2 px-6 py-3 font-medium rounded-xl transition-all duration-200 ${
                        uploaderName.trim()
                          ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:from-rose-600 hover:to-pink-600 hover:scale-105'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      <Camera className="h-5 w-5" />
                      Dosya Seç
                    </button>
                    <p className="text-xs text-gray-500 mt-3">
                      JPG, PNG, MP4, MOV formatları desteklenir (Maks. 100MB)
                    </p>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileInput}
                  className="hidden"
                />
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

                          {/* Remove Button */}
                          <button
                            onClick={() => removeFile(file.id)}
                            className="absolute top-3 right-3 rounded-full bg-red-500 p-1.5 text-white opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-600 hover:scale-110"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        {/* File Info */}
                        <div className="p-4">
                          <h3 className="font-medium text-gray-800 truncate mb-1">
                            {file.file.name}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {(file.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-6">
                <button
                  onClick={handleSubmit}
                  disabled={!uploaderName.trim() || (files.length === 0 && !uploaderWish.trim())}
                  className="w-full px-8 py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-semibold text-lg rounded-xl hover:from-rose-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-rose-200 shadow-lg"
                >
                  <div className="flex items-center justify-center gap-3">
                    <Heart className="h-6 w-6 fill-current" />
                    <span>Gönder</span>
                    <Heart className="h-6 w-6 fill-current" />
                  </div>
                </button>
                {(!uploaderName.trim() || (files.length === 0 && !uploaderWish.trim())) && (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    {!uploaderName.trim() 
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