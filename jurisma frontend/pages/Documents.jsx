import React, { useState, useEffect, useRef } from "react";
import { Folder, FileText, Search, MoreVertical, Upload, File, Download, Trash2, Eye, Star, X, Loader2, RefreshCw } from "lucide-react";
import { Card, Badge } from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import { useToast } from "../context/ToastContext.jsx";
import api from "../services/api.js";

export default function Documents() {
  const { addToast } = useToast();
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [activeFolder, setActiveFolder] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadFolder, setUploadFolder] = useState('');
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // Fetch initial data
  useEffect(() => {
    fetchFolders();
  }, []);

  // Fetch documents when folder or search changes
  useEffect(() => {
    fetchDocuments();
  }, [activeFolder]);

  const fetchFolders = async () => {
    try {
      const data = await api.getFolders();
      setFolders(data || []);
      if (data && data.length > 0 && !uploadFolder) {
        setUploadFolder(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching folders:', err);
    }
  };

  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getDocuments(1, 100, activeFolder);
      setFiles(result.documents || []);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError("Failed to load documents. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadFile(file);
      setShowUploadModal(true);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('folder', uploadFolder);
      formData.append('name', uploadFile.name);

      await api.uploadDocument(formData);

      // Refresh data
      await Promise.all([fetchDocuments(), fetchFolders()]);

      setShowUploadModal(false);
      setUploadFile(null);
      addToast({ type: 'success', message: 'Document uploaded successfully.' });
    } catch (err) {
      console.error('Upload failed:', err);
      addToast({ type: 'error', message: 'Upload failed. Please try again.' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (fileId, fileName) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) return;

    try {
      await api.deleteDocument(fileId);
      setFiles(files.filter(f => f.id !== fileId));
      fetchFolders(); // Update counts
      addToast({ type: 'success', message: 'Document deleted.' });
    } catch (err) {
      console.error('Delete failed:', err);
      addToast({ type: 'error', message: 'Delete failed. Please try again.' });
    }
  };

  const handleToggleStar = async (fileId) => {
    try {
      const result = await api.toggleDocumentStar(fileId);
      setFiles(files.map(f =>
        f.id === fileId ? { ...f, starred: !f.starred } : f
      ));
    } catch (err) {
      console.error('Star failed:', err);
    }
  };

  const handleDownload = (file) => {
    // In production, use the file URL from API
    if (file.url) {
      window.open(file.url, '_blank');
    } else {
      addToast({ type: 'info', message: `Download started for: ${file.name}` });
    }
  };

  const handleView = (file) => {
    if (file.url && file.type === 'PDF') {
      window.open(file.url, '_blank');
    } else {
      setSelectedFile(file);
    }
  };

  if (loading && folders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-10 w-10 animate-spin text-jurisma-600" />
        <p className="mt-4 text-slate-500 font-medium">Accessing secure documents...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
        accept=".pdf,.doc,.docx,.txt,.jpg,.png"
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="w-full sm:w-auto">
          <h1 className="text-xl md:text-2xl font-serif font-bold text-slate-900 flex items-center">
            <FileText className="mr-2 text-jurisma-600" size={24} />
            Document Manager
          </h1>
          <p className="text-slate-500 text-xs md:text-sm mt-1">Securely manage, store, and review case documents.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search documents..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-jurisma-500 focus:outline-none text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            icon={Upload}
            className="w-full sm:w-auto h-10 text-sm font-bold"
            onClick={() => fileInputRef.current?.click()}
          >
            Upload
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <button
          onClick={() => setActiveFolder('all')}
          className={`p-3 md:p-4 rounded-xl border text-left transition-all ${activeFolder === 'all'
            ? 'border-jurisma-600 bg-jurisma-600 text-white shadow-lg'
            : 'border-slate-200 bg-white hover:border-slate-300 text-slate-900 shadow-sm'
            }`}
        >
          <div className="flex justify-between items-start mb-2">
            <Folder size={18} className={activeFolder === 'all' ? "text-jurisma-200" : "text-jurisma-600"} />
            <span className="text-[10px] font-bold opacity-70">{files.length} items</span>
          </div>
          <h3 className="font-bold text-sm md:text-base">All Documents</h3>
        </button>
        {folders.map(folder => (
          <button
            key={folder.id}
            onClick={() => setActiveFolder(folder.id)}
            className={`p-3 md:p-4 rounded-xl border text-left transition-all shadow-sm ${activeFolder === folder.id
              ? 'border-jurisma-500 bg-jurisma-50 ring-1 ring-jurisma-500'
              : 'border-slate-200 bg-white hover:border-jurisma-300'
              }`}
          >
            <div className="flex justify-between items-start mb-2">
              <Folder size={18} className="text-jurisma-600" />
              <span className="text-[10px] text-slate-500 font-bold">{folder.count} items</span>
            </div>
            <h3 className="font-bold text-sm md:text-base text-slate-900">{folder.name}</h3>
          </button>
        ))}
      </div>

      <Card className="overflow-hidden shadow-md">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="font-bold text-sm md:text-base text-slate-900">
            {activeFolder === 'all' ? 'All Files' : folders.find(f => f.id === activeFolder)?.name}
          </h2>
          <div className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider">
            {filteredFiles.length} files
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-jurisma-500" />
            <p className="mt-2 text-slate-500 text-sm">Syncing files...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <RefreshCw className="h-8 w-8 mx-auto text-red-400 mb-2" />
            <p className="text-sm text-slate-500">{error}</p>
            <Button variant="ghost" size="sm" onClick={fetchDocuments} className="mt-2">Retry</Button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredFiles.length > 0 ? (
              filteredFiles.map((file) => (
                <div key={file.id} className="p-3 md:p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                  <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                    <div className={`w-9 h-9 md:w-10 md:h-10 rounded-lg flex-shrink-0 flex items-center justify-center font-bold text-[10px] ${(file.type || file.name.split('.').pop().toUpperCase()) === 'PDF' ? 'bg-red-50 text-red-600' : 'bg-jurisma-50 text-jurisma-600'
                      } border border-transparent shadow-sm`}>
                      {file.type || file.name.split('.').pop().toUpperCase().substring(0, 3)}
                    </div>
                    <div className="min-w-0 overflow-hidden">
                      <h4 className="font-bold text-sm text-slate-900 truncate pr-2 hover:text-jurisma-600 cursor-pointer" onClick={() => handleView(file)}>{file.name}</h4>
                      <div className="flex items-center text-[10px] md:text-xs text-slate-500 space-x-2">
                        {file.size && <span className="shrink-0">{file.size}</span>}
                        {file.size && <span>•</span>}
                        <span className="truncate">Modified {file.created_at ? new Date(file.created_at).toLocaleDateString() : (file.modified || 'Unknown')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 md:gap-4">
                    <div className="hidden sm:block">
                      {file.status && (
                        <Badge variant={file.status === 'Final' ? 'green' : file.status === 'Draft' ? 'amber' : 'blue'}>
                          {file.status}
                        </Badge>
                      )}
                    </div>
                    <div className="hidden lg:flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleView(file)}
                        className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-200 rounded-full"
                        title="View"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleDownload(file)}
                        className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-200 rounded-full"
                        title="Download"
                      >
                        <Download size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(file.id, file.name)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <button
                      onClick={() => handleToggleStar(file.id)}
                      className="p-1 text-slate-400 hover:text-amber-500 transition-colors"
                    >
                      <Star size={16} fill={file.starred ? "currentColor" : "none"} className={file.starred ? "text-amber-500" : ""} />
                    </button>
                    <button className="p-1 text-slate-400 hover:text-slate-900 lg:hidden">
                      <MoreVertical size={18} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-16 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <File className="text-slate-400" />
                </div>
                <p className="text-slate-500 text-sm">No files found. Securely upload your first document.</p>
                <Button
                  variant="ghost"
                  className="mt-2 text-xs font-bold text-jurisma-600"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload a document
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900">Upload Document</h3>
              <button
                onClick={() => { setShowUploadModal(false); setUploadFile(null); }}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              {uploadFile && (
                <div className="p-4 bg-jurisma-50 rounded-xl border border-jurisma-100">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                      <FileText className="text-jurisma-600" size={24} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 truncate">{uploadFile.name}</p>
                      <p className="text-xs text-slate-500">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-black uppercase text-slate-500 tracking-widest mb-2 px-1">Destination Folder</label>
                <select
                  value={uploadFolder}
                  onChange={(e) => setUploadFolder(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-jurisma-500 focus:outline-none appearance-none bg-slate-50 font-medium"
                >
                  {folders.map(folder => (
                    <option key={folder.id} value={folder.id}>{folder.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="ghost"
                  className="flex-1 font-bold h-12"
                  onClick={() => { setShowUploadModal(false); setUploadFile(null); }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 font-bold h-12 shadow-lg shadow-jurisma-500/20"
                  onClick={handleUpload}
                  disabled={uploading || !uploadFile}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Finalize Upload'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedFile && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 border border-slate-100">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-jurisma-50 rounded-xl flex items-center justify-center">
                  <FileText className="text-jurisma-600" size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 leading-tight">{selectedFile.name}</h3>
                  <p className="text-xs text-slate-500">Document Information</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFile(null)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-8">
              <div className="flex justify-between items-center text-sm py-2 border-b border-slate-200/50">
                <span className="text-slate-500 font-medium tracking-wide">FILE TYPE</span>
                <span className="font-bold text-slate-900">{selectedFile.type || selectedFile.name.split('.').pop().toUpperCase()}</span>
              </div>
              <div className="flex justify-between items-center text-sm py-2 border-b border-slate-200/50">
                <span className="text-slate-500 font-medium tracking-wide">FILE SIZE</span>
                <span className="font-bold text-slate-900">{selectedFile.size}</span>
              </div>
              <div className="flex justify-between items-center text-sm py-2 border-b border-slate-200/50">
                <span className="text-slate-500 font-medium tracking-wide">LAST MODIFIED</span>
                <span className="font-bold text-slate-900">{selectedFile.created_at ? new Date(selectedFile.created_at).toLocaleDateString() : (selectedFile.modified || 'Unknown')}</span>
              </div>
              <div className="flex justify-between items-center text-sm py-2">
                <span className="text-slate-500 font-medium tracking-wide">STATUS</span>
                <Badge variant={selectedFile.status === 'Final' ? 'green' : selectedFile.status === 'Draft' ? 'amber' : 'blue'}>
                  {selectedFile.status || 'Active'}
                </Badge>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                variant="primary"
                className="flex-1 font-bold h-12 shadow-lg shadow-jurisma-600/20"
                onClick={() => handleDownload(selectedFile)}
                icon={Download}
              >
                Download File
              </Button>
              <Button
                variant="outline"
                className="flex-1 font-bold h-12 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                onClick={() => {
                  handleDelete(selectedFile.id, selectedFile.name);
                  setSelectedFile(null);
                }}
                icon={Trash2}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
