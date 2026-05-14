<?php

namespace App\Listeners;

use App\Events\InvoiceStatusUpdated;
use App\Services\TelegramService;

class SendInvoiceStatusUpdateTelegramNotification
{
    public function handle(InvoiceStatusUpdated $event): void
    {
        $invoice = $event->invoice;
        $userId = $invoice->created_by ?? auth()->id();
        $workspaceId = $invoice->workspace_id ?? null;

        if (!$userId)
            return;
        if (isNotificationTemplateEnabled('Invoice Status Updated', $userId, 'telegram')) {

            $data = [
                'title' => 'Invoice Status Updated',
                'message' => "Invoice #{$invoice->invoice_number} status has been updated to '{$invoice->status}'.",
                'invoice_number' => $invoice->invoice_number,
                'client_name' => $invoice->client->name ?? 'Unknown Client',
                'new_status' => $invoice->status,
                'url' => route('invoices.show', $invoice->id)
            ];

            TelegramService::send('Invoice Status Updated', $data, $userId, $workspaceId);
        }
    }
}