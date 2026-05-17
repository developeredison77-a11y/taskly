<?php

namespace App\Http\Controllers;

use App\Models\Task;
use App\Models\TaskAttachment;
use App\Services\TaskAttachmentFileService;
use Illuminate\Http\Request;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class TaskAttachmentController extends Controller
{
    use AuthorizesRequests;
    
    public function __construct(private TaskAttachmentFileService $taskAttachmentFileService)
    {
    }

    public function store(Request $request, Task $task)
    {
        $validated = $request->validate([
            'media_item_ids' => 'required|array',
            'media_item_ids.*' => 'exists:media_items,id'
        ]);

        foreach ($validated['media_item_ids'] as $mediaItemId) {
            TaskAttachment::firstOrCreate([
                'task_id' => $task->id,
                'media_item_id' => $mediaItemId
            ], [
                'uploaded_by' => auth()->id()
            ]);
        }

        return back();
    }

    public function destroy(TaskAttachment $taskAttachment)
    {
        $this->taskAttachmentFileService->authorizeWorkspaceAccess($taskAttachment, auth()->id());

        $taskAttachment->delete();

        return back();
    }

    public function download(TaskAttachment $taskAttachment)
    {
        $this->taskAttachmentFileService->authorizeWorkspaceAccess($taskAttachment, auth()->id());
        return $this->taskAttachmentFileService->streamDownload($taskAttachment);
    }

    public function preview(TaskAttachment $taskAttachment)
    {
        $this->taskAttachmentFileService->authorizeWorkspaceAccess($taskAttachment, auth()->id());
        return $this->taskAttachmentFileService->streamPreview($taskAttachment);
    }
}
