<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\InvoiceAttachment;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

class InvoiceAttachmentController extends Controller
{
    use AuthorizesRequests;

    public function store(Request $request, Invoice $invoice)
    {
        if (!$this->hasInvoiceAttachmentsTable()) {
            return back();
        }
        $this->ensureCurrentWorkspaceAccess($invoice->workspace_id);

        $validated = $request->validate([
            'media_item_ids' => 'required|array',
            'media_item_ids.*' => 'exists:media_items,id'
        ]);

        foreach ($validated['media_item_ids'] as $mediaItemId) {
            InvoiceAttachment::firstOrCreate([
                'invoice_id' => $invoice->id,
                'media_item_id' => $mediaItemId
            ], [
                'uploaded_by' => auth()->id()
            ]);
        }

        return back();
    }

    public function destroy(InvoiceAttachment $invoiceAttachment)
    {
        if (!$this->hasInvoiceAttachmentsTable()) {
            return back();
        }
        $this->ensureCurrentWorkspaceAccess($invoiceAttachment->invoice->workspace_id);
        $invoiceAttachment->delete();
        return back();
    }

    public function download(InvoiceAttachment $invoiceAttachment)
    {
        if (!$this->hasInvoiceAttachmentsTable()) {
            abort(404, 'File not found');
        }
        $this->ensureCurrentWorkspaceAccess($invoiceAttachment->invoice->workspace_id);
        $mediaItem = $invoiceAttachment->mediaItem;

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

    public function preview(InvoiceAttachment $invoiceAttachment)
    {
        if (!$this->hasInvoiceAttachmentsTable()) {
            abort(404, 'File not found');
        }
        $this->ensureCurrentWorkspaceAccess($invoiceAttachment->invoice->workspace_id);
        $mediaItem = $invoiceAttachment->mediaItem;

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

    private function ensureCurrentWorkspaceAccess(int $workspaceId): void
    {
        $workspace = auth()->user()?->currentWorkspace;
        if (!$workspace || (int) $workspace->id !== (int) $workspaceId) {
            abort(403, 'Unauthorized');
        }
    }

    private function hasInvoiceAttachmentsTable(): bool
    {
        try {
            return Schema::hasTable('invoice_attachments');
        } catch (\Throwable $e) {
            return false;
        }
    }
}
