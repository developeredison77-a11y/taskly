<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContractAttachment extends BaseModel
{
    use HasFactory;

    protected $table = 'contracts_attachments';

    protected $fillable = [
        'workspace_id',
        'contract_id',
        'media_item_id',
        'uploaded_by',
        'files',
    ];

    public function contract(): BelongsTo
    {
        return $this->belongsTo(Contract::class);
    }

    public function media(): BelongsTo
    {
        return $this->belongsTo(\Spatie\MediaLibrary\MediaCollections\Models\Media::class, 'media_id');
    }

    public function mediaItem(): BelongsTo
    {
        return $this->belongsTo(MediaItem::class, 'media_item_id');
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }



    public function getDownloadUrlAttribute(): string
    {
        return route('contract-attachments.download', $this->id);
    }
}
