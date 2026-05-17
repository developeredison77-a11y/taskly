import React, { useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/components/custom-toast';
import {
    Download,
    Eye,
    File,
    FileSpreadsheet,
    FileText,
    Image as ImageIcon,
    Trash2,
    Upload,
    Video
} from 'lucide-react';

export interface TaskFileItem {
    id: number;
    media_id?: number;
    name: string;
    url: string;
    thumb_url?: string;
    preview_url?: string;
    download_url?: string;
    mime_type: string;
    size?: number;
    attachment_id?: number;
}

const normalizeTaskFile = (file: TaskFileItem): TaskFileItem => {
    const mediaBasedUrl = file.media_id ? route('api.media.download', file.media_id) : undefined;
    const previewUrl = file.preview_url || mediaBasedUrl || (file.attachment_id ? route('task-attachments.preview', file.attachment_id) : undefined);
    const downloadUrl = file.download_url || mediaBasedUrl || (file.attachment_id ? route('task-attachments.download', file.attachment_id) : undefined);

    return {
        ...file,
        preview_url: previewUrl,
        download_url: downloadUrl,
        url: file.url || previewUrl || '',
        thumb_url: file.thumb_url || previewUrl || file.url || ''
    };
};

interface TaskFileUploadProps {
    files: TaskFileItem[];
    mode: 'edit' | 'view';
    onFilesChange?: (files: TaskFileItem[]) => void;
    onRemoveFile?: (file: TaskFileItem) => void;
    allowedExtensions?: string[];
    maxFileSizeMB?: number;
    maxFiles?: number;
}

const DEFAULT_ALLOWED_EXTENSIONS = [
    'jpg',
    'jpeg',
    'png',
    'webp',
    'gif',
    'pdf',
    'xls',
    'xlsx',
    'csv',
    'mp4'
];

export default function TaskFileUpload({
    files,
    mode,
    onFilesChange,
    onRemoveFile,
    allowedExtensions = DEFAULT_ALLOWED_EXTENSIONS,
    maxFileSizeMB = 10,
    maxFiles = 25
}: TaskFileUploadProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [previewFile, setPreviewFile] = useState<TaskFileItem | null>(null);
    const [fileToDelete, setFileToDelete] = useState<TaskFileItem | null>(null);
    const [csvPreview, setCsvPreview] = useState<string[][]>([]);

    const isReadOnly = mode === 'view';

    const allowedSet = useMemo(() => {
        return new Set(allowedExtensions.map((e) => e.toLowerCase().replace('.', '')));
    }, [allowedExtensions]);

    const normalizedFiles = useMemo(() => files.map(normalizeTaskFile), [files]);
    const totalCount = normalizedFiles.length;

    const formatFileSize = (bytes = 0) => {
        if (!bytes) return '0 Bytes';
        const units = ['Bytes', 'KB', 'MB', 'GB'];
        const index = Math.floor(Math.log(bytes) / Math.log(1024));
        const value = bytes / Math.pow(1024, index);
        return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[index]}`;
    };

    const fileExtension = (fileName: string) => {
        const parts = fileName.split('.');
        return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
    };

    const fileKind = (file: TaskFileItem) => {
        const mime = (file.mime_type || '').toLowerCase();
        const ext = fileExtension(file.name);
        if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return 'image';
        if (mime === 'application/pdf' || ext === 'pdf') return 'pdf';
        if (['xls', 'xlsx', 'csv'].includes(ext)) return 'excel';
        if (mime.startsWith('video/') || ext === 'mp4') return 'video';
        return 'other';
    };

    const isDuplicate = (candidate: File) => {
        return normalizedFiles.some((f) => f.name === candidate.name && (f.size || 0) === candidate.size);
    };

    const validateFiles = (incoming: File[]) => {
        const accepted: File[] = [];
        const rejected: string[] = [];

        for (const file of incoming) {
            const ext = fileExtension(file.name);
            const maxBytes = maxFileSizeMB * 1024 * 1024;

            if (!allowedSet.has(ext)) {
                rejected.push(`${file.name}: invalid file type`);
                continue;
            }
            if (file.size > maxBytes) {
                rejected.push(`${file.name}: exceeds ${maxFileSizeMB}MB`);
                continue;
            }
            if (isDuplicate(file)) {
                rejected.push(`${file.name}: duplicate file`);
                continue;
            }
            accepted.push(file);
        }

        return { accepted, rejected };
    };

    const uploadFiles = async (selectedFiles: File[]) => {
        if (!onFilesChange || selectedFiles.length === 0) return;
        if (normalizedFiles.length >= maxFiles) {
            toast.error(`Maximum ${maxFiles} files allowed`);
            return;
        }

        const remainingSlots = maxFiles - normalizedFiles.length;
        const limitedFiles = selectedFiles.slice(0, remainingSlots);
        const { accepted, rejected } = validateFiles(limitedFiles);

        rejected.forEach((msg) => toast.error(msg));
        if (accepted.length === 0) return;

        setUploading(true);
        setUploadProgress(0);

        const formData = new FormData();
        accepted.forEach((file) => formData.append('files[]', file));

        try {
            const response = await uploadWithProgress(formData, setUploadProgress);
            if (!response.ok) {
                const err = await safeJson(response);
                const errors = err?.errors || [err?.message || 'Upload failed'];
                errors.forEach((e: string) => toast.error(e));
                return;
            }

            const result = await response.json();
            const uploaded: TaskFileItem[] = (result?.data || []).map((item: any) => ({
                id: item.id,
                media_id: item.media_id,
                name: item.name || item.file_name || 'file',
                url: item.url,
                thumb_url: item.thumb_url || item.url,
                mime_type: item.mime_type || '',
                size: item.size
            }));

            onFilesChange([...(normalizedFiles as TaskFileItem[]), ...uploaded]);
            toast.success(result?.message || `${uploaded.length} file(s) uploaded`);
        } catch {
            toast.error('Upload failed');
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        if (isReadOnly || uploading) return;
        uploadFiles(Array.from(e.dataTransfer.files || []));
    };

    const getPreviewSrc = (file: TaskFileItem) => {
        if (file.media_id) return route('api.media.download', file.media_id);
        if (file.preview_url) return file.preview_url;
        return file.url;
    };
    const getDownloadSrc = (file: TaskFileItem) => {
        if (file.media_id) return route('api.media.download', file.media_id);
        if (file.download_url) return file.download_url;
        return file.url;
    };

    const openPreview = async (file: TaskFileItem) => {
        setPreviewFile(file);
        if (fileKind(file) === 'excel' && fileExtension(file.name) === 'csv') {
            try {
                const res = await fetch(getPreviewSrc(file));
                const text = await res.text();
                const rows = text
                    .split(/\r?\n/)
                    .filter(Boolean)
                    .slice(0, 20)
                    .map((line) => line.split(',').slice(0, 8));
                setCsvPreview(rows);
            } catch {
                setCsvPreview([]);
            }
        } else {
            setCsvPreview([]);
        }
    };

    return (
        <div className="space-y-4">
            {!isReadOnly && (
                <Card
                    className={`border-2 border-dashed transition-colors ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
                    onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(true);
                    }}
                    onDragLeave={(e) => {
                        e.preventDefault();
                        setDragOver(false);
                    }}
                    onDrop={handleDrop}
                >
                    <CardContent className="p-5 text-center">
                        <Upload className="h-10 w-10 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm font-medium">Drag and drop files here</p>
                        <p className="text-xs text-gray-500 mb-3">or select multiple files</p>
                        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                            {uploading ? `Uploading ${uploadProgress}%` : 'Select Files'}
                        </Button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            className="hidden"
                            onChange={(e) => uploadFiles(Array.from(e.target.files || []))}
                            accept={allowedExtensions.map((e) => `.${e.replace('.', '')}`).join(',')}
                        />
                        <p className="text-xs text-gray-500 mt-3">
                            Allowed: {allowedExtensions.join(', ')} | Max {maxFileSizeMB}MB/file
                        </p>
                    </CardContent>
                </Card>
            )}

            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Files</h3>
                <Badge variant="outline">{totalCount}</Badge>
            </div>

            {normalizedFiles.length === 0 ? (
                <div className="text-center text-sm text-gray-500 py-8 border rounded-lg">No files uploaded</div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {normalizedFiles.map((file) => {
                        const kind = fileKind(file);
                        return (
                            <div key={`${file.id}-${file.name}`} className="border rounded-lg overflow-hidden bg-white">
                                <div className="h-32 bg-gray-50 flex items-center justify-center">
                                    {kind === 'image' && (
                                        <img
                                            src={file.thumb_url || getPreviewSrc(file)}
                                            alt={file.name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                e.currentTarget.src = getPreviewSrc(file);
                                            }}
                                        />
                                    )}
                                    {kind === 'video' && (
                                        <video src={getPreviewSrc(file)} className="w-full h-full object-cover" />
                                    )}
                                    {kind === 'pdf' && <FileText className="h-10 w-10 text-red-500" />}
                                    {kind === 'excel' && <FileSpreadsheet className="h-10 w-10 text-green-600" />}
                                    {kind === 'other' && <File className="h-10 w-10 text-gray-500" />}
                                </div>
                                <div className="p-3 space-y-2">
                                    <div className="text-sm font-medium truncate" title={file.name}>{file.name}</div>
                                    <div className="text-xs text-gray-500">{formatFileSize(file.size)}</div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button type="button" size="icon" variant="outline" onClick={() => openPreview(file)} aria-label="View file">
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>View</TooltipContent>
                                            </Tooltip>

                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button type="button" size="icon" variant="outline" onClick={() => window.open(getDownloadSrc(file), '_blank')} aria-label="Download file">
                                                        <Download className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Download</TooltipContent>
                                            </Tooltip>

                                            {!isReadOnly && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                    <Button type="button" size="icon" variant="destructive" onClick={() => setFileToDelete(file)} aria-label="Delete file">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Delete</TooltipContent>
                                                </Tooltip>
                                            )}
                                        </TooltipProvider>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
                <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto z-[99999]" style={{ zIndex: 99999 }}>
                    <DialogHeader>
                        <DialogTitle className="truncate">{previewFile?.name}</DialogTitle>
                    </DialogHeader>
                    {previewFile && (
                        <div className="space-y-3">
                            {fileKind(previewFile) === 'image' && (
                                <img src={getPreviewSrc(previewFile)} alt={previewFile.name} className="w-full max-h-[70vh] object-contain" />
                            )}
                            {fileKind(previewFile) === 'video' && (
                                <video controls className="w-full max-h-[70vh]">
                                    <source src={getPreviewSrc(previewFile)} type={previewFile.mime_type || 'video/mp4'} />
                                </video>
                            )}
                            {fileKind(previewFile) === 'pdf' && (
                                <iframe src={getPreviewSrc(previewFile)} title={previewFile.name} className="w-full h-[70vh] border-0" />
                            )}
                            {fileKind(previewFile) === 'excel' && fileExtension(previewFile.name) === 'csv' && csvPreview.length > 0 && (
                                <div className="overflow-auto border rounded">
                                    <table className="min-w-full text-xs">
                                        <tbody>
                                            {csvPreview.map((row, index) => (
                                                <tr key={index} className="border-b">
                                                    {row.map((cell, cellIndex) => (
                                                        <td key={cellIndex} className="p-2">{cell}</td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            {fileKind(previewFile) === 'excel' && (fileExtension(previewFile.name) !== 'csv' || csvPreview.length === 0) && (
                                <div className="text-sm text-gray-600">
                                    Preview is limited for this spreadsheet type. Use download to open full file.
                                </div>
                            )}
                            {fileKind(previewFile) === 'other' && (
                                <div className="text-sm text-gray-600">
                                    Preview not available for this file type.
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={!!fileToDelete} onOpenChange={() => setFileToDelete(null)}>
                <DialogContent className="max-w-md z-[100000]" style={{ zIndex: 100000 }}>
                    <DialogHeader>
                        <DialogTitle>Delete file?</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-600">
                        Are you sure you want to delete <span className="font-medium">{fileToDelete?.name}</span>?
                    </p>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => setFileToDelete(null)}>
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => {
                                if (fileToDelete) onRemoveFile?.(fileToDelete);
                                setFileToDelete(null);
                            }}
                        >
                            Delete
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function uploadWithProgress(formData: FormData, onProgress: (percent: number) => void): Promise<Response> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', route('api.media.batch'));
        xhr.setRequestHeader('X-CSRF-TOKEN', document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '');
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        xhr.withCredentials = true;

        xhr.upload.onprogress = (evt) => {
            if (!evt.lengthComputable) return;
            const percent = Math.round((evt.loaded / evt.total) * 100);
            onProgress(percent);
        };

        xhr.onload = async () => {
            const body = xhr.responseText;
            resolve(
                new Response(body, {
                    status: xhr.status,
                    statusText: xhr.statusText,
                    headers: { 'Content-Type': xhr.getResponseHeader('Content-Type') || 'application/json' }
                })
            );
        };
        xhr.onerror = () => reject(new Error('Upload request failed'));
        xhr.send(formData);
    });
}

async function safeJson(response: Response): Promise<any> {
    try {
        return await response.json();
    } catch {
        return null;
    }
}
