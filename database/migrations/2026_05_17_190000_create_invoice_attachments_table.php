<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('invoice_attachments')) {
            Schema::create('invoice_attachments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('invoice_id')->constrained('invoices')->onDelete('cascade');
                $table->unsignedBigInteger('media_item_id');
                $table->foreignId('uploaded_by')->constrained('users')->onDelete('cascade');
                $table->timestamps();

                $table->index(['invoice_id', 'created_at']);
                $table->index('media_item_id');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_attachments');
    }
};

