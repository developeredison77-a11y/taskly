<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('contracts_attachments')) {
            return;
        }

        Schema::table('contracts_attachments', function (Blueprint $table) {
            if (!Schema::hasColumn('contracts_attachments', 'media_item_id')) {
                $table->unsignedBigInteger('media_item_id')->nullable()->after('contract_id');
                $table->index('media_item_id');
            }

            if (!Schema::hasColumn('contracts_attachments', 'uploaded_by')) {
                $table->unsignedBigInteger('uploaded_by')->nullable()->after('media_item_id');
                $table->index('uploaded_by');
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('contracts_attachments')) {
            return;
        }

        Schema::table('contracts_attachments', function (Blueprint $table) {
            if (Schema::hasColumn('contracts_attachments', 'uploaded_by')) {
                $table->dropIndex(['uploaded_by']);
                $table->dropColumn('uploaded_by');
            }

            if (Schema::hasColumn('contracts_attachments', 'media_item_id')) {
                $table->dropIndex(['media_item_id']);
                $table->dropColumn('media_item_id');
            }
        });
    }
};
