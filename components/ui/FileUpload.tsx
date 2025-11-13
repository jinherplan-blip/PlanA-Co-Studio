import React, { useState, useRef, useEffect } from 'react';
import { UploadedFile } from '../../types';
import { useNotification } from '../../contexts/NotificationProvider';

// Utility to get the correct MIME type for Gemini API
// Returns null if the type is not explicitly supported.
export const getCorrectMimeType = (file: File): string | null => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    switch (extension) {
        case 'txt': return 'text/plain';
        case 'md': return 'text/markdown';
        case 'pdf': return 'application/pdf';
        case 'doc': return 'application/msword';
        case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        case 'ppt': return 'application/vnd.ms-powerpoint';
        case 'pptx': return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
        case 'jpg':
        case 'jpeg':
            return 'image/jpeg';
        case 'png':
            return 'image/png';
        case 'webp':
            return 'image/webp';
        default:
            if (file.type.startsWith('image/')) return file.type;
            return null;
    }
};

interface FileUploadProps {
  onFilesChanged: (files: UploadedFile[]) => void;
  allowMultiple?: boolean;
  accept?: string;
  description?: string;
  label?: string;
  disabled?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ 
    onFilesChanged, 
    allowMultiple = true, 
    accept = ".txt,.md,image/*,.pdf,.doc,.docx,.ppt,.pptx",
    description,
    label,
    disabled = false
}) => {
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { showNotification } = useNotification();

    useEffect(() => {
        onFilesChanged(uploadedFiles);
    }, [uploadedFiles, onFilesChanged]);

    const handleFileRead = (file: File) => {
        if (file.size > 50 * 1024 * 1024) {
            showNotification(`檔案 "${file.name}" 過大，超過 50MB 的限制。`, 'error');
            return;
        }

        const mimeType = getCorrectMimeType(file);

        if (!mimeType) {
            showNotification(`不支援的檔案格式：${file.name}。請上傳指定格式的檔案。`, 'error');
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result as string;
            const base64Content = result.split(',')[1];
            if (base64Content) {
                const newFile: UploadedFile = {
                    name: file.name,
                    mimeType: mimeType,
                    content: base64Content,
                };
                setUploadedFiles(prev => allowMultiple ? [...prev, newFile] : [newFile]);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleLocalFiles = (files: FileList | null) => {
        if (!files) return;
        if (allowMultiple && uploadedFiles.length + files.length > 10) {
            showNotification(`上傳失敗，最多只能上傳 10 個檔案。`, 'error');
            return;
        }
        if (!allowMultiple) {
            setUploadedFiles([]);
            if (files.length > 0) handleFileRead(files[0]);
        } else {
            const currentTotal = uploadedFiles.length;
            const filesToAdd = Array.from(files).slice(0, 10 - currentTotal);
            filesToAdd.forEach(handleFileRead);
        }
    };

    const handleRemoveFile = (fileName: string) => {
        setUploadedFiles(prev => prev.filter(f => f.name !== fileName));
    };
    
    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (disabled) return;
        if (e.type === 'dragenter' || e.type === 'dragover') setIsDragging(true);
        else if (e.type === 'dragleave') setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (disabled) return;
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleLocalFiles(e.dataTransfer.files);
        }
    };

    const handleGoogleDriveImport = async () => {
        try {
            // @ts-ignore
            if (window.aistudio && typeof window.aistudio.openCloudFilePicker === 'function') {
                // @ts-ignore
                const files: File[] = await window.aistudio.openCloudFilePicker({ allowMultiple, accept });
                if (files && files.length > 0) {
                    handleLocalFiles(files as unknown as FileList);
                }
            } else {
                showNotification('Google Drive 整合功能目前無法使用。', 'warning');
            }
        } catch (error) {
            console.error('Error importing from Google Drive:', error);
            showNotification('從 Google Drive 匯入時發生錯誤。', 'error');
        }
    };

    const getFileIcon = (mimeType: string) => {
        if (mimeType.startsWith('image/')) return <ImageIcon />;
        if (mimeType.includes('pdf')) return <PdfIcon />;
        if (mimeType.includes('word')) return <WordIcon />;
        if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return <PptIcon />;
        return <TxtIcon />;
    };

    return (
        <div>
            {label && <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}
            <div
                onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-md p-6 text-center transition-colors ${
                    isDragging ? 'border-orange-500 bg-orange-50' : (disabled ? 'border-slate-200 bg-slate-100' : 'border-slate-300 bg-slate-50')
                } ${disabled ? 'cursor-not-allowed' : ''}`}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple={allowMultiple}
                    className="hidden"
                    onChange={(e) => handleLocalFiles(e.target.files)}
                    accept={accept}
                    disabled={disabled}
                />
                <div className="space-y-1">
                    <p className="text-sm text-slate-500">
                        拖曳檔案至此，或{' '}
                        <button type="button" onClick={() => !disabled && fileInputRef.current?.click()} className="font-semibold text-orange-600 hover:text-orange-500 focus:outline-none disabled:text-slate-400 disabled:cursor-not-allowed" disabled={disabled}>
                            點擊上傳
                        </button>
                    </p>
                    {description && <p className="text-xs text-slate-400">{description}</p>}
                </div>
                 <button
                    type="button"
                    onClick={handleGoogleDriveImport}
                    disabled={disabled}
                    className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-white bg-[#4285F4] rounded-md shadow-sm hover:bg-[#3367D6] disabled:bg-slate-300 disabled:cursor-not-allowed"
                 >
                    <GoogleDriveIcon />
                    從 Google 雲端硬碟匯入
                </button>
            </div>
            {uploadedFiles.length > 0 && (
                <div className="mt-2 space-y-1">
                    {uploadedFiles.map(file => (
                        <div key={file.name} className="flex items-center justify-between bg-slate-100 p-1.5 rounded text-sm">
                            <div className="flex items-center gap-2 truncate">
                                {getFileIcon(file.mimeType)}
                                <span className="text-slate-700 truncate">{file.name}</span>
                            </div>
                            <button type="button" onClick={() => handleRemoveFile(file.name)} className="text-slate-500 hover:text-red-600 p-0.5 rounded-full flex-shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const GoogleDriveIcon = () => ( <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M19.115 13.499L13.5 3.499H10.5L16.115 13.499H19.115Z" fill="#34A853"/><path d="M7.385 13.5L2 20.5H12.385L17 13.5H7.385Z" fill="#188038"/><path d="M11.615 13.5L17.23 3.5L8 3.5L2.385 13.5H11.615Z" fill="#34A853"/><path d="M4.885 13.499L2 18.269L7.615 18.269L10.5 13.499H4.885Z" fill="#188038"/><path d="M19.615,18.269 L22,13.5 L16.385,13.5 L13.5,18.269 L19.615,18.269 Z" fill="#188038"/><path d="M12.385 20.5H22L17 13.5H7.385L12.385 20.5Z" fill="#34A853"/></svg> );
const iconClass = "w-4 h-4 text-slate-600 flex-shrink-0";
const ImageIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={iconClass}><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>);
const PdfIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={iconClass}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>);
const WordIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={iconClass}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5" /></svg>);
const PptIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={iconClass}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V5.25A2.25 2.25 0 0 0 18 3H6A2.25 2.25 0 0 0 3.75 5.25v12.75A2.25 2.25 0 0 0 6 20.25Z" /></svg>);
const TxtIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={iconClass}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" /></svg>);

export default FileUpload;