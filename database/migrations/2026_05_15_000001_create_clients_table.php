<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('clients')) {
            Schema::create('clients', function (Blueprint $table) {
                $table->id();
                $table->foreignId('workspace_id')->constrained()->onDelete('cascade');
                $table->string('name');
                $table->string('email');
                $table->string('phone', 30);
                $table->enum('status', ['active', 'inactive'])->default('active');
                $table->text('address')->nullable();
                $table->text('notes')->nullable();
                $table->foreignId('created_by')->constrained('users');
                $table->timestamps();
                $table->softDeletes();

                $table->index(['workspace_id', 'status']);
                $table->index(['workspace_id', 'email']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('clients');
    }
};

