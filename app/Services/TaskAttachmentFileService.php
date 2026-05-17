<?php

namespace App\Services;

use App\Models\TaskAttachment;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class TaskAttachmentFileService
{
    public function authorizeWorkspaceAccess(TaskAttachment $taskAttachment, int $userId): void
    {
        $workspace = $taskAttachment->task->project->workspace;
        if (!$workspace->members()->where('user_id', $userId)->exists()) {
            abort(403, 'Unauthorized');
        }
    }

    public function streamDownload(TaskAttachment $taskAttachment): StreamedResponse|BinaryFileResponse
    {
        $mediaItem = $taskAttachment->mediaItem;
        if (!$mediaItem) {
            abort(404, 'Media item not found');
        }

        if ($mediaItem->url) {
            $headers = [
                'Content-Type' => $mediaItem->mime_type,
                'Content-Disposition' => 'attachment; filename="' . $mediaItem->name . '"',
            ];

            return response()->streamDownload(function () use ($mediaItem) {
                echo file_get_contents($mediaItem->url);
            }, $mediaItem->name, $headers);
        }

        if (!$mediaItem->path || !Storage::disk($mediaItem->disk ?? 'public')->exists($mediaItem->path)) {
            abort(404, 'File not found');
        }

        return Storage::disk($mediaItem->disk ?? 'public')->download(
            $mediaItem->path,
            $mediaItem->name
        );
    }

    public function streamPreview(TaskAttachment $taskAttachment)
    {
        $mediaItem = $taskAttachment->mediaItem;
        if (!$mediaItem) {
            abort(404, 'Media item not found');
        }

        if ($mediaItem->url) {
            $content = @file_get_contents($mediaItem->url);
            if ($content === false) {
                abort(404, 'File not found');
            }

            return response($content, 200, [
                'Content-Type' => $mediaItem->mime_type ?: 'application/octet-stream',
                'Content-Disposition' => 'inline; filename="' . $mediaItem->name . '"',
            ]);
        }

        if (!$mediaItem->path || !Storage::disk($mediaItem->disk ?? 'public')->exists($mediaItem->path)) {
            abort(404, 'File not found');
        }

        return response()->file(
            Storage::disk($mediaItem->disk ?? 'public')->path($mediaItem->path),
            [
                'Content-Disposition' => 'inline; filename="' . $mediaItem->name . '"'
            ]
        );
    }
}
