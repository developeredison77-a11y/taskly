<?php

namespace App\Http\Controllers;

use App\Models\ProjectExpense;
use App\Models\ExpenseAttachment;
use App\Models\MediaItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ExpenseReceiptController extends Controller
{
    public function store(Request $request, ProjectExpense $expense)
    {
        $attachments = [];

        if ($request->has('media_item_ids')) {
            $request->validate([
                'media_item_ids' => 'required|array',
                'media_item_ids.*' => 'exists:media_items,id'
            ]);
            $mediaItemIds = $request->media_item_ids;
        } else {
            $request->validate([
                'files' => 'required|array',
                'files.*' => 'file|mimes:jpg,jpeg,png,pdf,doc,docx,xls,xlsx,csv|max:10240',
            ]);

            $mediaItemIds = [];
            foreach ($request->file('files') as $file) {
                $mediaItem = MediaItem::create([
                    'name' => $file->getClientOriginalName(),
                    'file_name' => $file->store('expense-receipts', 'public'),
                    'mime_type' => $file->getMimeType(),
                    'size' => $file->getSize(),
                    'uploaded_by' => auth()->id()
                ]);
                $mediaItemIds[] = $mediaItem->id;
            }
        }

        foreach ($mediaItemIds as $mediaItemId) {
            $attachment = ExpenseAttachment::firstOrCreate([
                'project_expense_id' => $expense->id,
                'media_item_id' => $mediaItemId,
            ], [
                'uploaded_by' => auth()->id(),
                'attachment_type' => 'receipt'
            ]);
            $attachments[] = $attachment->load('mediaItem');
        }

        if ($request->expectsJson() || $request->wantsJson()) {
            return response()->json([
                'message' => 'Files uploaded successfully',
                'attachments' => $attachments
            ]);
        }

        return back();
    }

    public function destroy(ExpenseAttachment $attachment)
    {
        // Check if user can delete this attachment
        if ($attachment->uploaded_by !== auth()->id() && !auth()->user()->can('edit-any-expenses')) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $attachment->delete();
        return back();
    }

    public function download(ExpenseAttachment $attachment)
    {
        $mediaItem = $attachment->mediaItem;
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

    public function preview(ExpenseAttachment $attachment)
    {
        $mediaItem = $attachment->mediaItem;
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
