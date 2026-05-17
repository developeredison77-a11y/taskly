<?php

namespace App\Http\Controllers;

use App\Models\Contract;
use App\Models\ContractType;
use App\Models\ContractNote;
use App\Models\ContractComment;
use App\Models\ContractAttachment;
use App\Models\User;
use App\Models\MediaItem;
use App\Traits\HasPermissionChecks;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;
use Barryvdh\DomPDF\Facade\Pdf as PDF;
use App\Events\ContractCreated;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Schema;

class ContractController extends Controller
{
    use HasPermissionChecks;
    
    public function index(Request $request)
    {
        $this->authorizePermission('contract_view_any');
        $workspaceId = auth()->user()->current_workspace_id;
        
        // Start with base query without forWorkspace scope to avoid ambiguity
        $query = Contract::where('contracts.workspace_id', $workspaceId)
            ->with(['contractType', 'client', 'creator'])
            ->withCount(['notes', 'comments', 'attachments']);

        // Apply filters
        if ($request->filled('status')) {
            $query->where('contracts.status', $request->status);
        }
        if ($request->filled('contract_type_id')) {
            $query->where('contracts.contract_type_id', $request->contract_type_id);
        }
        if ($request->filled('client_id')) {
            $query->where('contracts.client_id', $request->client_id);
        }
        if ($request->filled('project_id')) {
            $query->where('contracts.project_id', $request->project_id);
        }
        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('contracts.subject', 'like', '%' . $request->search . '%')
                    ->orWhere('contracts.contract_id', 'like', '%' . $request->search . '%')
                    ->orWhereHas('client', function ($clientQuery) use ($request) {
                        $clientQuery->where('name', 'like', '%' . $request->search . '%');
                    });
            });
        }

        // Handle sorting
        $sortField = $request->get('sort_field', 'created_at');
        $sortDirection = $request->get('sort_direction', 'desc');
        
        // Validate sort fields
        $allowedSortFields = ['created_at', 'subject', 'contract_value', 'start_date', 'end_date', 'status', 'contract_type.name'];
        if (!in_array($sortField, $allowedSortFields)) {
            $sortField = 'created_at';
        }
        
        if (!in_array($sortDirection, ['asc', 'desc'])) {
            $sortDirection = 'desc';
        }
        
        // Handle nested relationship sorting
        switch ($sortField) {
            case 'contract_type.name':
                $query->leftJoin('contracts_types', function($join) {
                    $join->on('contracts.contract_type_id', '=', 'contracts_types.id');
                })
                ->orderBy('contracts_types.name', $sortDirection)
                ->select('contracts.*');
                break;
            default:
                $query->orderBy('contracts.' . $sortField, $sortDirection);
                break;
        }

        $perPage = in_array($request->get('per_page', 12), [12, 24, 48, 100]) ? $request->get('per_page', 12) : 12;
        $contracts = $query->paginate($perPage);
        
        $contractTypes = ContractType::forWorkspace($workspaceId)->active()->ordered()->get();
        $clients = User::whereHas('workspaces', function ($q) use ($workspaceId) {
            $q->where('workspace_id', $workspaceId)
              ->where('role', 'client');
        })->get(['id', 'name', 'email']);
        $projects = \App\Models\Project::forWorkspace($workspaceId)
            ->with(['clients:users.id'])
            ->get(['id', 'title'])
            ->map(function ($project) {
                return [
                    'id' => $project->id,
                    'title' => $project->title,
                    'clients' => $project->clients->map(fn($c) => ['id' => $c->id])
                ];
            });

        return Inertia::render('contracts/Index', [
            'contracts' => $contracts,
            'contractTypes' => $contractTypes,
            'clients' => $clients,
            'projects' => $projects,
            'filters' => $request->only(['status', 'contract_type_id', 'client_id', 'project_id', 'search', 'per_page', 'sort_field', 'sort_direction', 'view_mode']),
            'permissions' => [
                'create' => $this->checkPermission('contract_create'),
                'update' => $this->checkPermission('contract_update'),
                'delete' => $this->checkPermission('contract_delete'),
                'view' => $this->checkPermission('contract_view'),
            ]
        ]);
    }

    public function create()
    {
        $this->authorizePermission('contract_create');
        $workspaceId = auth()->user()->current_workspace_id;
        $contractTypes = ContractType::forWorkspace($workspaceId)->active()->ordered()->get();
        $clients = User::whereHas('workspaces', function ($q) use ($workspaceId) {
            $q->where('workspace_id', $workspaceId)
              ->where('role', 'client');
        })->get(['id', 'name', 'email']);
        $users = User::whereHas('workspaces', function ($q) use ($workspaceId) {
            $q->where('workspace_id', $workspaceId);
        })->get();
        $projects = \App\Models\Project::forWorkspace($workspaceId)
            ->with(['clients:users.id'])
            ->get(['id', 'title'])
            ->map(function ($project) {
                return [
                    'id' => $project->id,
                    'title' => $project->title,
                    'clients' => $project->clients->map(fn($c) => ['id' => $c->id])
                ];
            });

        return Inertia::render('contracts/Create', [
            'contractTypes' => $contractTypes,
            'clients' => $clients,
            'users' => $users,
            'projects' => $projects,
        ]);
    }

    public function store(Request $request)
    {
        $this->authorizePermission('contract_create');
        $request->validate([
            'subject' => 'required|string|max:255',
            'contract_type_id' => 'required|exists:contracts_types,id',
            'contract_value' => 'required|numeric|min:0',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
            'client_id' => 'required|exists:users,id',
            'media_item_ids' => 'nullable|array',
            'media_item_ids.*' => 'exists:media_items,id',
        ]);

        $contract = Contract::create([
            'subject' => $request->subject,
            'description' => $request->description,
            'contract_type_id' => $request->contract_type_id,
            'contract_value' => $request->contract_value,
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
            'client_id' => $request->client_id,
            'project_id' => $request->project_id,
            'assigned_users' => $request->assigned_users,
            'terms_conditions' => $request->terms_conditions,
            'notes' => $request->notes,
            'currency' => $request->currency ?? 'USD',
            'workspace_id' => auth()->user()->current_workspace_id,
            'created_by' => auth()->id(),
        ]);

        if ($this->hasContractMediaAttachmentsColumn() && $request->filled('media_item_ids')) {
            $mediaItemIds = collect($request->input('media_item_ids', []))->filter()->unique()->values();
            foreach ($mediaItemIds as $mediaItemId) {
                ContractAttachment::firstOrCreate(
                    [
                        'contract_id' => $contract->id,
                        'media_item_id' => $mediaItemId
                    ],
                    [
                        'workspace_id' => $contract->workspace_id,
                        'uploaded_by' => auth()->id()
                    ]
                );
            }
        }
       if (!config('app.is_demo', true)) {
            event(new ContractCreated($contract));
        }
        return redirect()->route('contracts.index')->with('success', 'Contract created successfully.');
    }

    public function show(Contract $contract)
    {
        $this->authorizePermission('contract_view');
        $contract->load([
            'contractType',
            'client',
            'creator',
            'notes' => fn($q) => $q->with('creator'),
            'comments' => fn($q) => $q->with('creator')->orderBy('created_at', 'desc'),
            'attachments.mediaItem'
        ]);

        foreach ($contract->attachments as $attachment) {
            $attachment->url = $attachment->mediaItem?->url ?: asset('storage/media/' . $attachment->files);
        }

        if (request()->expectsJson()) {
            return response()->json(['contract' => $contract]);
        }

        $emailEnabled = isEmailTemplateEnabled('New Contract', auth()->user()->id);
        
        return Inertia::render('contracts/Show', [
            'contract' => $contract,
            'assignedUsers' => $contract->assignedUsers(),
            'emailTemplateEnabled' => $emailEnabled,
            'permissions' => [
                'update' => $this->checkPermission('contract_update'),
                'delete' => $this->checkPermission('contract_delete'),
            ]
        ]);
    }

    public function edit(Contract $contract)
    {
        $this->authorizePermission('contract_update');
        $workspaceId = auth()->user()->current_workspace_id;
        $contractTypes = ContractType::forWorkspace($workspaceId)->active()->ordered()->get();
        $clients = User::whereHas('workspaces', function ($q) use ($workspaceId) {
            $q->where('workspace_id', $workspaceId)
              ->where('role', 'client');
        })->get(['id', 'name', 'email']);
        $users = User::whereHas('workspaces', function ($q) use ($workspaceId) {
            $q->where('workspace_id', $workspaceId);
        })->get();
        $projects = \App\Models\Project::forWorkspace($workspaceId)
            ->with(['clients:users.id'])
            ->get(['id', 'title'])
            ->map(function ($project) {
                return [
                    'id' => $project->id,
                    'title' => $project->title,
                    'clients' => $project->clients->map(fn($c) => ['id' => $c->id])
                ];
            });

        return Inertia::render('contracts/Edit', [
            'contract' => $contract,
            'contractTypes' => $contractTypes,
            'clients' => $clients,
            'users' => $users,
            'projects' => $projects,
        ]);
    }

    public function update(Request $request, Contract $contract)
    {
        $this->authorizePermission('contract_update');
        $request->validate([
            'subject' => 'required|string|max:255',
            'contract_type_id' => 'required|exists:contracts_types,id',
            'contract_value' => 'required|numeric|min:0',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
            'client_id' => 'required|exists:users,id',
            'media_item_ids' => 'nullable|array',
            'media_item_ids.*' => 'exists:media_items,id',
        ]);

        $contract->update($request->only([
            'subject',
            'description',
            'contract_type_id',
            'contract_value',
            'start_date',
            'end_date',
            'client_id',
            'project_id',
            'assigned_users',
            'terms_conditions',
            'notes',
            'currency'
        ]));

        if ($this->hasContractMediaAttachmentsColumn() && $request->has('media_item_ids')) {
            $incomingMediaIds = collect($request->input('media_item_ids', []))->filter()->unique()->values();
            $existingMediaAttachments = $contract->attachments()->whereNotNull('media_item_id')->get();

            $existingByMediaId = $existingMediaAttachments->keyBy('media_item_id');
            $incomingSet = $incomingMediaIds->flip();

            foreach ($existingByMediaId as $mediaId => $attachment) {
                if (!$incomingSet->has((int) $mediaId)) {
                    $attachment->delete();
                }
            }

            foreach ($incomingMediaIds as $mediaItemId) {
                if (!$existingByMediaId->has((int) $mediaItemId)) {
                    ContractAttachment::create([
                        'workspace_id' => $contract->workspace_id,
                        'contract_id' => $contract->id,
                        'media_item_id' => $mediaItemId,
                        'uploaded_by' => auth()->id()
                    ]);
                }
            }
        }

        return redirect()->route('contracts.index')->with('success', 'Contract updated successfully.');
    }

    public function destroy(Contract $contract)
    {
        $this->authorizePermission('contract_delete');
        foreach ($contract->attachments as $attachment) {
            delete_file($attachment->files);
        }
        
        $contract->notes()->delete();
        $contract->comments()->delete();
        $contract->attachments()->delete();
        $contract->delete();
        return redirect()->route('contracts.index')->with('success', 'Contract deleted successfully.');
    }

    public function duplicate(Contract $contract)
    {
        $this->authorizePermission('contract_create');
        $newContract = $contract->replicate();
        $newContract->contract_id = Contract::generateContractId();
        $newContract->signed_at = null;
        $newContract->sent_at = null;
        $newContract->created_by = auth()->id();
        $newContract->save();

        return redirect()->route('contracts.index')->with('success', 'Contract duplicated successfully.');
    }

    public function changeStatus(Request $request, Contract $contract)
    {
        $this->authorizePermission('contract_update');
        $request->validate(['status' => 'required|in:pending,sent,accept,decline,expired']);
        $updates = ['status' => $request->status];
        if ($request->status === 'sent' && !$contract->sent_at)
            $updates['sent_at'] = now();
        if ($request->status === 'accept' && !$contract->accepted_at)
            $updates['accepted_at'] = now();
        if ($request->status === 'decline' && !$contract->declined_at)
            $updates['declined_at'] = now();
        $contract->update($updates);
        return redirect()->back()->with('success', 'Contract status updated successfully.');
    }

    public function download()
    {
        $filePath = resource_path('js/pages/contracts/Preview.tsx');
        
        if (!file_exists($filePath)) {
            return redirect()->back()->with('error', __('Preview file not found.'));
        }
        
        return response()->download($filePath, 'Preview.tsx');
    }

    public function preview(Contract $contract)
    {
        $contract->load(['contractType', 'client', 'creator']);

        return Inertia::render('contracts/Preview', [
            'contract' => $contract,
        ]);
    }

    public function noteStore(Request $request, Contract $contract)
    {
        $request->validate(['note' => 'required|string']);
        ContractNote::create([
            'contract_id' => $contract->id,
            'note' => $request->note,
            'is_pinned' => false,
            'created_by' => auth()->id(),
        ]);
        return back()->with('success', 'Note added successfully.');
    }

    public function noteUpdate(Request $request, Contract $contract, ContractNote $note)
    {
        $request->validate(['note' => 'required|string']);
        $note->update(['note' => $request->note]);
        return back()->with('success', 'Note updated successfully.');
    }

    public function noteDestroy(Contract $contract, ContractNote $note)
    {
        $note->delete();
        return redirect()->back()->with('success', 'Note deleted successfully.');
    }

    public function commentStore(Request $request, Contract $contract)
    {
        $request->validate(['comment' => 'required|string']);
        ContractComment::create([
            'contract_id' => $contract->id,
            'comment' => $request->comment,
            'parent_id' => $request->parent_id,
            'is_internal' => $request->boolean('is_internal'),
            'created_by' => auth()->id(),
        ]);
        return redirect()->back()->with('success', 'Comment added successfully.');
    }

    public function commentUpdate(Request $request, ContractComment $comment)
    {
        $request->validate(['comment' => 'required|string']);
        $comment->update(['comment' => $request->comment]);
        return back()->with('success', 'Comment updated successfully.');
    }

    public function commentDestroy(ContractComment $comment)
    {
        $comment->delete();
        return redirect()->back()->with('success', 'Comment deleted successfully.');
    }

    public function fileUpload(Request $request, Contract $contract)
    {
        if ($contract->workspace_id !== auth()->user()->current_workspace_id) {
            abort(403, __('Contract not found in current workspace'));
        }

        $request->validate([
            'files' => 'nullable|array',
            'files.*' => 'file|max:10240',
            'media_item_ids' => 'nullable|array',
            'media_item_ids.*' => 'exists:media_items,id'
        ]);

        if ($this->hasContractMediaAttachmentsColumn() && $request->filled('media_item_ids')) {
            foreach ($request->input('media_item_ids', []) as $mediaItemId) {
                ContractAttachment::firstOrCreate(
                    [
                        'contract_id' => $contract->id,
                        'media_item_id' => $mediaItemId
                    ],
                    [
                        'workspace_id' => $contract->workspace_id,
                        'uploaded_by' => auth()->id()
                    ]
                );
            }
        }

        if ($request->hasFile('files')) {
            foreach ($request->file('files') as $file) {
                $filenameWithExt = $file->getClientOriginalName();
                $filename = pathinfo($filenameWithExt, PATHINFO_FILENAME);
                $extension = $file->getClientOriginalExtension();
                $fileNameToStore = $filename . '_' . time() . '_' . uniqid() . '.' . $extension;

                $singleFileRequest = new Request();
                $singleFileRequest->files->set('file', $file);
                $singleFileRequest->merge(['file' => $file]);

                $upload = upload_file($singleFileRequest, 'file', $fileNameToStore, 'contracts/attachments');

                if ($upload['status'] == true) {
                    ContractAttachment::create([
                        'contract_id' => $contract->id,
                        'files' => $upload['url'],
                        'workspace_id' => $contract->workspace_id
                    ]);
                } else {
                    return back()->withErrors(['files' => $upload['msg']]);
                }
            }
        }

        return back()->with('success', __('Attachment(s) uploaded successfully'));
    }

    public function fileDelete(ContractAttachment $attachment)
    {
        if (!empty($attachment->files)) {
            delete_file($attachment->files);
        }
        $attachment->delete();
        return redirect()->back()->with('success', 'Attachment removed successfully.');
    }

    public function fileDownload(ContractAttachment $attachment)
    {
        if ($attachment->mediaItem) {
            return redirect()->to(route('api.media.download', $attachment->media_item_id));
        }
        return download_file($attachment->files, basename($attachment->files));
    }

    public function filePreview(ContractAttachment $attachment)
    {
        if ($attachment->mediaItem) {
            return redirect()->to(route('api.media.download', $attachment->media_item_id));
        }

        return download_file($attachment->files, basename($attachment->files));
    }

    public function signatureStore(Request $request, Contract $contract)
    {
        $request->validate([
            'company_signature' => 'nullable|string',
            'client_signature' => 'nullable|string',
            'signature_type' => 'required|in:company,client'
        ]);

        $updates = [];
        if ($request->signature_type === 'company' && $request->company_signature) {
            $updates['company_signature'] = $request->company_signature;
        } elseif ($request->signature_type === 'client' && $request->client_signature) {
            $updates['client_signature'] = $request->client_signature;
            $updates['signed_at'] = now();
        }

        $contract->update($updates);

        return redirect()->back()->with('success', 'Signature added successfully.');
    }

    private function hasContractMediaAttachmentsColumn(): bool
    {
        try {
            return Schema::hasTable('contracts_attachments') && Schema::hasColumn('contracts_attachments', 'media_item_id');
        } catch (\Throwable $e) {
            return false;
        }
    }
}
