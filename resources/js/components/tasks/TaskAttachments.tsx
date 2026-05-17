import React from 'react';
import { router } from '@inertiajs/react';
import { Task } from '@/types';
import TaskFileUpload, { TaskFileItem } from '@/components/tasks/TaskFileUpload';

interface Props {
    task: Task;
    attachments: any[];
    onUpdate?: () => void;
    canAddAttachments?: boolean;
    canManageAttachments?: boolean;
}

export default function TaskAttachments({ task, attachments, onUpdate, canAddAttachments = true, canManageAttachments = true }: Props) {
    const getAttachmentSize = (attachment: any): number => {
        const size =
            attachment.media_item?.size ??
            attachment.mediaItem?.size ??
            attachment.media_item?.file_size ??
            attachment.mediaItem?.file_size ??
            attachment.media_item?.filesize ??
            attachment.mediaItem?.filesize ??
            attachment.size ??
            0;

        return typeof size === 'number' ? size : Number(size) || 0;
    };

    const files: TaskFileItem[] = (attachments || []).map((attachment: any) => ({
        id: attachment.media_item?.id || attachment.mediaItem?.id || attachment.media_item_id,
        media_id: attachment.media_item?.id || attachment.mediaItem?.id || attachment.media_item_id,
        attachment_id: attachment.id,
        name: attachment.media_item?.name || attachment.mediaItem?.name || 'file',
        url: attachment.media_item?.url || attachment.mediaItem?.url || route('task-attachments.preview', attachment.id),
        thumb_url: attachment.media_item?.thumb_url || attachment.mediaItem?.thumb_url || route('task-attachments.preview', attachment.id),
        preview_url: route('task-attachments.preview', attachment.id),
        download_url: route('task-attachments.download', attachment.id),
        mime_type: attachment.media_item?.mime_type || attachment.mediaItem?.mime_type || '',
        size: getAttachmentSize(attachment)
    }));

    return (
        <TaskFileUpload
            mode={canAddAttachments || canManageAttachments ? 'edit' : 'view'}
            files={files}
            onFilesChange={(nextFiles) => {
                const currentIds = new Set(files.map((f) => f.id));
                const addedIds = nextFiles.map((f) => f.id).filter((id) => !currentIds.has(id));

                if (addedIds.length === 0) return;
                router.post(
                    route('task-attachments.store', task.id),
                    { media_item_ids: addedIds },
                    { onSuccess: () => onUpdate?.() }
                );
            }}
            onRemoveFile={(file) => {
                if (!file.attachment_id) return;
                router.delete(route('task-attachments.destroy', file.attachment_id), {
                    onSuccess: () => onUpdate?.()
                });
            }}
        />
    );
}
