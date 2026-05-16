<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreManagerRequest;
use App\Http\Requests\UpdateManagerRequest;
use App\Models\User;
use App\Services\ManagerService;
use App\Traits\HasPermissionChecks;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ManagerController extends Controller
{
    use HasPermissionChecks;

    public function __construct(private ManagerService $managerService)
    {
    }

    public function index(Request $request): Response
    {
        $this->authorizePermission('manager_management_view_any');

        $user = auth()->user();
        $workspaceId = $user->current_workspace_id;

        $managers = $this->managerService->getPaginatedForWorkspace($workspaceId, $request);
        $workspaces = $this->managerService->getAssignableWorkspacesForUser($user);

        return Inertia::render('managers/Index', [
            'managers' => $managers,
            'workspaces' => $workspaces,
            'filters' => $request->only(['search', 'status', 'sort_field', 'sort_direction', 'per_page']),
            'permissions' => [
                'create' => $this->checkPermission('manager_management_create'),
                'update' => $this->checkPermission('manager_management_update'),
                'delete' => $this->checkPermission('manager_management_delete'),
            ],
        ]);
    }

    public function store(StoreManagerRequest $request)
    {
        $this->authorizePermission('manager_management_create');

        $this->managerService->create($request->validated(), auth()->id());

        return redirect()->back()->with('success', __('Manager created successfully.'));
    }

    public function update(UpdateManagerRequest $request, User $manager)
    {
        $this->authorizePermission('manager_management_update');
        $this->ensureWorkspaceAccess($manager);

        $this->managerService->update($manager, $request->validated());

        return redirect()->back()->with('success', __('Manager updated successfully.'));
    }

    public function destroy(User $manager)
    {
        $this->authorizePermission('manager_management_delete');
        $this->ensureWorkspaceAccess($manager);

        $this->managerService->delete($manager);

        return redirect()->back()->with('success', __('Manager deleted successfully.'));
    }

    public function toggleStatus(User $manager)
    {
        $this->authorizePermission('manager_management_update');
        $this->ensureWorkspaceAccess($manager);

        $this->managerService->toggleStatus($manager);

        return redirect()->back()->with('success', __('Manager status updated successfully.'));
    }

    private function ensureWorkspaceAccess(User $manager): void
    {
        $workspaceId = auth()->user()->current_workspace_id;
        if (!$workspaceId) {
            abort(403, 'Unauthorized');
        }

        $hasAccess = $manager->workspaces()
            ->where('workspace_id', $workspaceId)
            ->wherePivot('role', 'manager')
            ->exists();

        if (!$hasAccess) {
            abort(403, 'Unauthorized');
        }
    }
}

