<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreClientRequest;
use App\Http\Requests\UpdateClientRequest;
use App\Models\User;
use App\Services\ClientService;
use App\Traits\HasPermissionChecks;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ClientController extends Controller
{
    use HasPermissionChecks;

    public function __construct(private ClientService $clientService)
    {
    }

    public function index(Request $request): Response
    {
        $this->authorizePermission('client_management_view_any');

        $workspaceId = auth()->user()->current_workspace_id;

        $clients = $this->clientService->getPaginatedForWorkspace($workspaceId, $request);
        $user = auth()->user();
        $workspaces = $this->clientService->getAssignableWorkspacesForUser($user);

        return Inertia::render('clients/Index', [
            'clients' => $clients,
            'workspaces' => $workspaces,
            'filters' => $request->only(['search', 'status', 'sort_field', 'sort_direction', 'per_page']),
            'permissions' => [
                'create' => $this->checkPermission('client_management_create'),
                'update' => $this->checkPermission('client_management_update'),
                'delete' => $this->checkPermission('client_management_delete'),
            ],
        ]);
    }

    public function store(StoreClientRequest $request)
    {
        $this->authorizePermission('client_management_create');

        $this->clientService->create($request->validated(), auth()->id());

        return redirect()->back()->with('success', __('Client created successfully.'));
    }

    public function update(UpdateClientRequest $request, User $client)
    {
        $this->authorizePermission('client_management_update');
        $this->ensureWorkspaceAccess($client);

        $this->clientService->update($client, $request->validated());

        return redirect()->back()->with('success', __('Client updated successfully.'));
    }

    public function destroy(User $client)
    {
        $this->authorizePermission('client_management_delete');
        $this->ensureWorkspaceAccess($client);

        $this->clientService->delete($client);

        return redirect()->back()->with('success', __('Client deleted successfully.'));
    }

    public function toggleStatus(User $client)
    {
        $this->authorizePermission('client_management_update');
        $this->ensureWorkspaceAccess($client);

        $this->clientService->toggleStatus($client);

        return redirect()->back()->with('success', __('Client status updated successfully.'));
    }

    private function ensureWorkspaceAccess(User $client): void
    {
        $workspaceId = auth()->user()->current_workspace_id;
        if (!$workspaceId) {
            abort(403, 'Unauthorized');
        }

        $hasAccess = $client->workspaces()
            ->where('workspace_id', $workspaceId)
            ->wherePivot('role', 'client')
            ->exists();

        if (!$hasAccess) {
            abort(403, 'Unauthorized');
        }
    }
}
