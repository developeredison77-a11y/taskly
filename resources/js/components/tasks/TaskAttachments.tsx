import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Paperclip, Download, MoreHorizontal, Trash2, File, Image, FileText, Eye } from 'lucide-react';
import { Task, TaskAttachment, MediaItem } from '@/types';
import MediaPicker from '@/components/MediaPicker';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';

interface TaskAttachment {
    id: number;
    task_id: number;
    media_item_id: number;
    uploaded_by: number;
    created_at: string;
    updated_at: string;
    media_item?: {
        id: number;
        name: string;
        url: string;
        thumb_url: string;
        mime_type: string;
    };
}

interface Props {
    task: Task;
    attachments: TaskAttachment[];
    availableMedia?: MediaItem[];
    onUpdate?: () => void;
    canAddAttachments?: boolean;
}

export default function TaskAttachments({ task, attachments, availableMedia = [], onUpdate, canAddAttachments = true, canManageAttachments = true }: Props) {
    const [selectedMedia, setSelectedMedia] = useState('');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [attachmentToDelete, setAttachmentToDelete] = useState<TaskAttachment | null>(null);

    const handleMediaSelect = (url: string, mediaIds?: number[]) => {
        setSelectedMedia(url);
        
        if (mediaIds && mediaIds.length > 0) {
            router.post(route('task-attachments.store', task.id), {
                media_item_ids: mediaIds
            }, {
                onSuccess: () => {
                    onUpdate?.();
                    setSelectedMedia('');
                }
            });
        }
    };

    const handleDownload = (attachmentId: number) => {
        window.open(route('task-attachments.download', attachmentId), '_blank');
    };

    const handleDelete = (attachment: TaskAttachment) => {
        setAttachmentToDelete(attachment);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteConfirm = () => {
        if (attachmentToDelete) {
            router.delete(route('task-attachments.destroy', attachmentToDelete.id), {
                onSuccess: () => {
                    setIsDeleteModalOpen(false);
                    setAttachmentToDelete(null);
                    onUpdate?.();
                },
                onError: () => {
                    setIsDeleteModalOpen(false);
                    setAttachmentToDelete(null);
                }
            });
        }
    };

    const handlePreview = (mediaItem: MediaItem) => {
        if (mediaItem.mime_type?.startsWith('image/')) {
            window.open(mediaItem.url, '_blank');
        }
    };

    const getFileIcon = (mimeType: string) => {
        if (mimeType.startsWith('image/')) return Image;
        if (mimeType.includes('pdf') || mimeType.includes('document')) return FileText;
        return File;
    };

    return (
        <div className="space-y-4">
            {/* Media Display Grid */}
            {attachments.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {attachments.map((attachment) => {
                        const FileIcon = getFileIcon(attachment.media_item?.mime_type || '');
                        const isImage = attachment.media_item?.mime_type?.startsWith('image/');
                        
                        return (
                            <div key={attachment.id} className="relative group border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                                {/* Media Preview */}
                                <div className="aspect-square bg-gray-50 flex items-center justify-center">
                                    {isImage && attachment.media_item?.thumb_url ? (
                                        <img
                                            src={attachment.media_item.thumb_url}
                                            alt={attachment.media_item?.name || 'Attachment'}
                                            className="w-full h-full object-cover cursor-pointer"
                                            onClick={() => window.open(attachment.media_item?.url || attachment.media_item.thumb_url, '_blank')}
                                            onError={(e) => {
                                                if (attachment.media_item?.url) {
                                                    e.currentTarget.src = attachment.media_item.url;
                                                }
                                            }}
                                        />
                                    ) : (
                                        <FileIcon className="h-12 w-12 text-gray-400" />
                                    )}
                                </div>
                                
                                {/* Actions */}
                                {canManageAttachments && (
                                <div className="absolute top-2 right-2">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="secondary" size="sm" className="h-8 w-8 p-0">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="z-[9999]">
                                            <DropdownMenuItem onClick={() => handleDownload(attachment.id)}>
                                                <Download className="h-4 w-4 mr-2" />
                                                Download
                                            </DropdownMenuItem>

                                            <DropdownMenuItem 
                                                onClick={() => handleDelete(attachment)}
                                                className="text-red-600"
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Remove
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}



            {/* Media Picker with Portal for Modal */}
            {canAddAttachments && (
                <div>
                    <MediaPicker
                        label="Add Media"
                        value={selectedMedia}
                        onChange={handleMediaSelect}
                        placeholder="Select media..."
                        showPreview={true}
                        multiple={true}
                    />
                </div>
            )}

            {/* Delete Modal */}
            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setAttachmentToDelete(null);
                }}
                onConfirm={handleDeleteConfirm}
                itemName={attachmentToDelete?.media_item?.name || 'attachment'}
                entityName="attachment"
            />
        </div>
    );
}