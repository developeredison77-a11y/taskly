<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Project;
use App\Models\Task;
use App\Models\ProjectExpense;
use App\Models\TimesheetEntry;
use App\Models\InvoiceAttachment;
use App\Events\InvoiceCreated;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;

class InvoiceController extends Controller
{
    public function index(Request $request)
    {
        $user = auth()->user();
        $workspace = $user->currentWorkspace;
        $userWorkspaceRole = $workspace->getMemberRole($user);
       
        $query = Invoice::with(['project:id,title', 'client:id,name,avatar', 'creator:id,name', 'payments'])
            ->where('workspace_id', $workspace->id);

        if ($this->hasInvoiceAttachmentsTable()) {
            $query->withCount('attachments');
        }

        // Apply role-based filtering
        if (in_array($userWorkspaceRole, ['manager', 'member'])) {
            $query->where(function ($q) use ($user, $userWorkspaceRole) {
                // Show sent invoices to all members
                $q->where('status', '!=', 'draft')
                    ->whereHas('project', function ($projQ) use ($user) {
                        $projQ->where(function ($projectQuery) use ($user) {
                            $projectQuery->whereHas('members', function ($memberQuery) use ($user) {
                                $memberQuery->where('user_id', $user->id);
                            })->orWhere('created_by', $user->id);
                        });
                    });

                // Show draft invoices only to managers
                if ($userWorkspaceRole === 'manager') {
                    $q->orWhere('status', 'draft')
                        ->whereHas('project', function ($projQ) use ($user) {
                            $projQ->where(function ($projectQuery) use ($user) {
                                $projectQuery->whereHas('members', function ($memberQuery) use ($user) {
                                    $memberQuery->where('user_id', $user->id);
                                })->orWhere('created_by', $user->id);
                            });
                        });
                }
            });
        } elseif ($userWorkspaceRole === 'client') {
            // Clients see all invoices assigned to them (including drafts)
            $query->where('client_id', $user->id);
        }
        // Owners see all invoices (no additional filtering needed)

        // Apply filters
        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('invoice_number', 'like', '%' . $request->search . '%')
                    ->orWhere('title', 'like', '%' . $request->search . '%')
                    ->orWhereHas('project', function ($projQ) use ($request) {
                        $projQ->where('title', 'like', '%' . $request->search . '%');
                    });
            });
        }

        if ($request->status) {
            if ($request->status === 'partial_paid') {
                $query->where('status', 'partially_paid');
            } else {
                $query->where('status', $request->status);
            }
        }

        if ($request->project_id) {
            $query->where('project_id', $request->project_id);
        }

        if ($request->client_id) {
            $query->where('client_id', $request->client_id);
        }

        // Add sorting
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        
        // Validate sort fields
        $allowedSortFields = ['invoice_number', 'title', 'total_amount', 'status', 'invoice_date', 'due_date', 'created_at'];
        if (!in_array($sortBy, $allowedSortFields)) {
            $sortBy = 'created_at';
        }
        
        if (!in_array($sortOrder, ['asc', 'desc'])) {
            $sortOrder = 'desc';
        }

        $perPage = $request->get('per_page', 12);
        $invoices = $query->orderBy($sortBy, $sortOrder)->paginate($perPage)->withQueryString();

        // Debug: Log invoices without projects
        $invoicesWithoutProject = $invoices->getCollection()->filter(function ($invoice) {
            return is_null($invoice->project);
        });

        if ($invoicesWithoutProject->count() > 0) {
            \Log::warning('Found invoices without projects:', [
                'count' => $invoicesWithoutProject->count(),
                'invoice_ids' => $invoicesWithoutProject->pluck('id')->toArray()
            ]);
        }

        // Get projects for filter dropdown
        $projectsQuery = Project::forWorkspace($workspace->id);
        if (in_array($userWorkspaceRole, ['manager', 'member'])) {
            $projectsQuery->where(function ($q) use ($user) {
                $q->whereHas('members', function ($memberQuery) use ($user) {
                    $memberQuery->where('user_id', $user->id);
                })->orWhere('created_by', $user->id);
            });
        } elseif ($userWorkspaceRole === 'client') {
            $projectsQuery->whereHas('clients', function ($clientQuery) use ($user) {
                $clientQuery->where('user_id', $user->id);
            });
        }
        $projects = $projectsQuery->get(['id', 'title']);

        // Get clients for filter dropdown
        $clients = $workspace->users()
            ->whereHas('roles', function ($q) {
                $q->where('name', 'client');
            })
            ->get(['users.id', 'users.name']);

        return Inertia::render('invoices/Index', [
            'invoices' => $invoices,
            'projects' => $projects,
            'clients' => $clients,
            'filters' => $request->only(['search', 'status', 'project_id', 'client_id', 'per_page', 'sort_by', 'sort_order']),
            'userWorkspaceRole' => $userWorkspaceRole,
            'emailNotificationsEnabled' => emailNotificationEnabled()
        ]);
    }

    public function show(Request $request, Invoice $invoice)
    {
        $loadRelations = ['project', 'client', 'creator', 'items.task', 'items.expense', 'items.timesheetEntry', 'payments'];
        if ($this->hasInvoiceAttachmentsTable()) {
            $loadRelations[] = 'attachments.mediaItem';
        }
        $invoice->load($loadRelations);
        $user = auth()->user();
        $workspace = $user->currentWorkspace;
        $userWorkspaceRole = $workspace->getMemberRole($user);

        // Check access permissions
        if ($userWorkspaceRole === 'client') {
            // Clients can only view invoices assigned to them
            if ($invoice->client_id !== $user->id) {
                abort(403, 'Access denied.');
            }
        } elseif ($invoice->status === 'draft' && !in_array($userWorkspaceRole, ['owner', 'manager'])) {
            // Only managers, owners, and assigned clients can view draft invoices
            abort(403, 'Access denied.');
        }

        // Ensure tax_rate is properly formatted
        $invoiceData = $invoice->toArray();
        $taxRate = $invoice->tax_rate;
        if (is_string($taxRate)) {
            $taxRate = json_decode($taxRate, true) ?: [];
        }
        $invoiceData['tax_rate'] = $taxRate;
        // Check if email notifications are enabled
        $emailNotificationsEnabled = emailNotificationEnabled();
        
        // Get invoice settings
        $invoiceSettings = \App\Models\Setting::where('user_id', $invoice->created_by)
            ->whereIn('key', ['invoice_template', 'invoice_qr_display', 'invoice_color', 'invoice_footer_title', 'invoice_footer_notes', 'invoice_logo'])
            ->pluck('value', 'key')
            ->toArray();
        
        if ($request->expectsJson()) {
            return response()->json([
                'invoice' => $invoice
            ]);
        }

        return Inertia::render('invoices/Show', [
            'invoice' => $invoiceData,
            'userWorkspaceRole' => $userWorkspaceRole,
            'emailNotificationsEnabled' => $emailNotificationsEnabled,
            'invoiceSettings' => $invoiceSettings
        ]);
    }

    public function store(Request $request)
    {
        $user = auth()->user();
        $workspace = $user->currentWorkspace;

        $validated = $request->validate([
            'project_id' => 'required|exists:projects,id',
            'client_id' => 'nullable|exists:users,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'invoice_date' => 'required|date',
            'due_date' => 'required|date|after_or_equal:invoice_date',
            'selected_taxes' => 'nullable|array',
            'selected_taxes.*' => 'exists:taxes,id',
            'notes' => 'nullable|string',
            'terms' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.type' => 'required|in:task',
            'items.*.amount' => 'required|numeric|min:0',
            'items.*.task_id' => 'required|exists:tasks,id',
            'media_item_ids' => 'nullable|array',
            'media_item_ids.*' => 'exists:media_items,id',
        ]);

        $project = Project::findOrFail($validated['project_id']);

        // Calculate totals
        $subtotal = collect($validated['items'])->sum('amount');
        $taxAmount = 0;
        $taxData = [];
        
        if (!empty($validated['selected_taxes'])) {
            $taxes = \App\Models\Tax::whereIn('id', $validated['selected_taxes'])->get();
            foreach ($taxes as $tax) {
                $amount = ($subtotal * $tax->rate) / 100;
                $taxAmount += $amount;
                $taxData[] = ['id' => $tax->id, 'name' => $tax->name, 'rate' => $tax->rate];
            }
        }
        
        $totalAmount = $subtotal + $taxAmount;
        


        $invoice = Invoice::create([
            'project_id' => $validated['project_id'],
            'workspace_id' => $project->workspace_id,
            'client_id' => $validated['client_id'],
            'created_by' => $user->id,
            'title' => $validated['title'],
            'description' => $validated['description'],
            'invoice_date' => $validated['invoice_date'],
            'due_date' => $validated['due_date'],
            'tax_rate' => json_encode($taxData),
            'notes' => $validated['notes'],
            'terms' => $validated['terms'],
            'subtotal' => $subtotal,
            'tax_amount' => $taxAmount,
            'total_amount' => $totalAmount,
        ]);


        // Create invoice items
        foreach ($validated['items'] as $index => $item) {
            $task = Task::find($item['task_id']);
            InvoiceItem::create([
                'invoice_id' => $invoice->id,
                'type' => 'task',
                'description' => $task ? $task->title : 'Task',
                'rate' => $item['amount'],
                'amount' => $item['amount'],
                'task_id' => $item['task_id'],
                'sort_order' => $index + 1,
            ]);
        }

        $mediaItemIds = collect($validated['media_item_ids'] ?? [])->filter()->unique()->values();
        if ($this->hasInvoiceAttachmentsTable() && $mediaItemIds->isNotEmpty()) {
            foreach ($mediaItemIds as $mediaItemId) {
                DB::table('invoice_attachments')->updateOrInsert(
                    [
                        'invoice_id' => $invoice->id,
                        'media_item_id' => $mediaItemId,
                    ],
                    [
                        'uploaded_by' => auth()->id(),
                        'updated_at' => now(),
                        'created_at' => now(),
                    ]
                );
            }

            \Log::info('Invoice attachments saved on create', [
                'invoice_id' => $invoice->id,
                'media_item_ids' => $mediaItemIds->values()->all(),
                'saved_count' => DB::table('invoice_attachments')->where('invoice_id', $invoice->id)->count(),
            ]);
        }

        // Fire event for Slack notification
        if (!config('app.is_demo', true)) {
            event(new InvoiceCreated($invoice));
        }

        return redirect()->route('invoices.show', $invoice)->with('success', __('Invoice created successfully!'));
    }

    public function update(Request $request, Invoice $invoice)
    {
        $validated = $request->validate([
            'project_id' => 'required|exists:projects,id',
            'client_id' => 'nullable|exists:users,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'invoice_date' => 'required|date',
            'due_date' => 'required|date|after_or_equal:invoice_date',
            'selected_taxes' => 'nullable|array',
            'selected_taxes.*' => 'exists:taxes,id',
            'notes' => 'nullable|string',
            'terms' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.type' => 'required|in:custom,task,expense,time',
            'items.*.description' => 'required|string',
            'items.*.rate' => 'required|numeric|min:0',
            'items.*.task_id' => 'nullable|exists:tasks,id',
            'items.*.expense_id' => 'nullable|exists:project_expenses,id',
            'items.*.timesheet_entry_id' => 'nullable|exists:timesheet_entries,id',
            'media_item_ids' => 'nullable|array',
            'media_item_ids.*' => 'exists:media_items,id'
        ]);

        // Prepare tax data
        $taxData = [];
        if (!empty($validated['selected_taxes'])) {
            $taxes = \App\Models\Tax::whereIn('id', $validated['selected_taxes'])->get();
            foreach ($taxes as $tax) {
                $taxData[] = ['id' => $tax->id, 'name' => $tax->name, 'rate' => $tax->rate];
            }
        }
        
        $invoice->update([
            'project_id' => $validated['project_id'],
            'client_id' => $validated['client_id'],
            'title' => $validated['title'],
            'description' => $validated['description'],
            'invoice_date' => $validated['invoice_date'],
            'due_date' => $validated['due_date'],
            'tax_rate' => $taxData,
            'notes' => $validated['notes'],
            'terms' => $validated['terms'],
        ]);

        // Update items
        $invoice->items()->delete();
        foreach ($validated['items'] as $index => $item) {
            InvoiceItem::create([
                'invoice_id' => $invoice->id,
                'type' => $item['type'],
                'description' => $item['description'],
                'rate' => $item['rate'],
                'amount' => $item['rate'],
                'task_id' => $item['task_id'] ?? null,
                'expense_id' => $item['expense_id'] ?? null,
                'timesheet_entry_id' => $item['timesheet_entry_id'] ?? null,
                'sort_order' => $index + 1,
            ]);
        }

        if ($this->hasInvoiceAttachmentsTable() && isset($validated['media_item_ids'])) {
            $incomingMediaIds = collect($validated['media_item_ids'])->filter()->unique()->values();

            if ($incomingMediaIds->isNotEmpty()) {
                DB::table('invoice_attachments')
                    ->where('invoice_id', $invoice->id)
                    ->whereNotIn('media_item_id', $incomingMediaIds)
                    ->delete();

                foreach ($incomingMediaIds as $mediaItemId) {
                    DB::table('invoice_attachments')->updateOrInsert(
                        [
                            'invoice_id' => $invoice->id,
                            'media_item_id' => $mediaItemId,
                        ],
                        [
                            'uploaded_by' => auth()->id(),
                            'updated_at' => now(),
                            'created_at' => now(),
                        ]
                    );
                }
            } else {
                DB::table('invoice_attachments')->where('invoice_id', $invoice->id)->delete();
            }

            \Log::info('Invoice attachments synced on update', [
                'invoice_id' => $invoice->id,
                'media_item_ids' => $incomingMediaIds->values()->all(),
                'saved_count' => DB::table('invoice_attachments')->where('invoice_id', $invoice->id)->count(),
            ]);
        }

        // Recalculate totals using the model method
        $invoice->calculateTotals();

        return redirect()->route('invoices.show', $invoice)->with('success', __('Invoice updated successfully!'));
    }

    public function create()
    {
        $user = auth()->user();
        $workspace = $user->currentWorkspace;

        $projects = Project::forWorkspace($workspace->id)->get(['id', 'title']);
        $clients = $workspace->users()->whereHas('roles', function ($q) {
            $q->where('name', 'client');
        })->get(['users.id', 'users.name']);
        
        $taxes = \App\Models\Tax::where('workspace_id', $workspace->id)
            ->orderBy('name')
            ->get(['id', 'name', 'rate']);

        return Inertia::render('invoices/Form', [
            'projects' => $projects,
            'clients' => $clients,
            'taxes' => $taxes
        ]);
    }

    public function getProjectInvoiceData($projectId)
    {
        try {
            $project = Project::findOrFail($projectId);

            // Get project tasks
            $tasks = $project->tasks()->get(['id', 'title']);

            // Get project clients using the clients relationship
            $clients = $project->clients()->get(['users.id', 'users.name']);

            return response()->json([
                'tasks' => $tasks,
                'clients' => $clients
            ]);
        } catch (\Exception $e) {
            \Log::error('Error loading project invoice data: ' . $e->getMessage());
            return response()->json([
                'tasks' => [],
                'clients' => [],
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function edit(Invoice $invoice)
    {
        $loadRelations = ['items'];
        if ($this->hasInvoiceAttachmentsTable()) {
            $loadRelations[] = 'attachments.mediaItem';
        }
        $invoice->load($loadRelations);

        $user = auth()->user();
        $workspace = $user->currentWorkspace;
        $userWorkspaceRole = $workspace->getMemberRole($user);

        // Only managers and owners can edit invoices
        if (!in_array($userWorkspaceRole, ['owner', 'manager'])) {
            abort(403, 'Access denied. Only managers and owners can edit invoices.');
        }

        $projects = Project::forWorkspace($workspace->id)->get(['id', 'title']);
        $clients = $workspace->users()->whereHas('roles', function ($q) {
            $q->where('name', 'client');
        })->get(['users.id', 'users.name']);
        
        $taxes = \App\Models\Tax::where('workspace_id', $workspace->id)
            ->orderBy('name')
            ->get(['id', 'name', 'rate']);

        $invoiceData = $invoice->toArray();
        
        // Parse tax_rate properly - handle double encoding
        $taxRate = $invoice->getRawOriginal('tax_rate');
        $selectedTaxIds = [];
        if ($taxRate) {
            $firstDecode = json_decode($taxRate, true);
            // If first decode returns a string, decode again
            if (is_string($firstDecode)) {
                $parsedTaxRate = json_decode($firstDecode, true);
            } else {
                $parsedTaxRate = $firstDecode;
            }
            
            if (is_array($parsedTaxRate)) {
                $selectedTaxIds = collect($parsedTaxRate)->pluck('id')->filter()->toArray();
            }
        }
        $invoiceData['selected_taxes'] = $selectedTaxIds;

        return Inertia::render('invoices/Form', [
            'invoice' => $invoiceData,
            'projects' => $projects,
            'clients' => $clients,
            'taxes' => $taxes
        ]);
    }

    public function destroy(Invoice $invoice)
    {
        $invoice->delete();
        return back()->with('success', __('Invoice deleted successfully!'));
    }



    public function markAsPaid(Request $request, Invoice $invoice)
    {
        $validated = $request->validate([
            'paid_amount' => 'nullable|numeric|min:0|max:' . $invoice->total_amount,
            'payment_method' => 'nullable|string',
            'payment_reference' => 'nullable|string',
            'payment_details' => 'nullable|array',
        ]);

        $oldStatus = $invoice->status;
        $invoice->markAsPaid(
            $validated['paid_amount'] ?? null,
            $validated['payment_method'] ?? null,
            $validated['payment_reference'] ?? null,
            $validated['payment_details'] ?? null
        );

        // Fire event for Slack notification
        if (!config('app.is_demo', true)) {
            event(new \App\Events\InvoiceStatusUpdated($invoice, $oldStatus, 'paid'));
        }

        return back()->with('success', __('Invoice marked as paid successfully!'));
    }

    public function send(Invoice $invoice)
    {
        $oldStatus = $invoice->status;
        $invoice->update([
            'status' => 'sent',
            'sent_at' => now()
        ]);

        // Fire events
        if (!config('app.is_demo', true)) {
            event(new \App\Events\InvoiceStatusUpdated($invoice, $oldStatus, 'sent'));
            event(new InvoiceCreated($invoice));
        }

        return back()->with('success', __('Invoice sent successfully!'));
    }

    public function getProjectData(Project $project)
    {
        $tasks = $project->tasks()
            ->with('taskStage')
            ->where('status', 'completed')
            ->get(['id', 'title', 'task_stage_id']);

        $expenses = $project->expenses()
            ->with('budgetCategory')
            ->where('status', 'approved')
            ->get(['id', 'title', 'amount', 'currency', 'budget_category_id']);

        $timesheetEntries = TimesheetEntry::whereHas('timesheet', function ($q) use ($project) {
            $q->where('project_id', $project->id);
        })
            ->with(['task', 'user'])
            ->get(['id', 'task_id', 'user_id', 'hours', 'description']);

        return response()->json([
            'tasks' => $tasks,
            'expenses' => $expenses,
            'timesheet_entries' => $timesheetEntries
        ]);
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
