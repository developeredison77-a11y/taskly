<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreMemberRequest;
use App\Http\Requests\UpdateMemberRequest;
use App\Models\User;
use App\Services\MemberService;
use App\Traits\HasPermissionChecks;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MemberController extends Controller
{
    use HasPermissionChecks;

    public function __construct(private MemberService $memberService)
    {
    }

    public function index(Request $request): Response
    {
        $this->authorizePermission('member_management_view_any');

        $workspaceId = auth()->user()->current_workspace_id;

        $members = $this->memberService->getPaginatedForWorkspace($workspaceId, $request);
        $user = auth()->user();
        $workspaces = $this->memberService->getAssignableWorkspacesForUser($user);

        return Inertia::render('members/Index', [
            'members' => $members,
            'workspaces' => $workspaces,
            'filters' => $request->only(['search', 'status', 'sort_field', 'sort_direction', 'per_page']),
            'permissions' => [
                'create' => $this->checkPermission('member_management_create'),
                'update' => $this->checkPermission('member_management_update'),
                'delete' => $this->checkPermission('member_management_delete'),
            ],
        ]);
    }

    public function store(StoreMemberRequest $request)
    {
        $this->authorizePermission('member_management_create');

        $this->memberService->create($request->validated(), auth()->id());

        return redirect()->back()->with('success', __('Member created successfully.'));
    }

    public function update(UpdateMemberRequest $request, User $member)
    {
        $this->authorizePermission('member_management_update');
        $this->ensureWorkspaceAccess($member);

        $this->memberService->update($member, $request->validated());

        return redirect()->back()->with('success', __('Member updated successfully.'));
    }

    public function destroy(User $member)
    {
        $this->authorizePermission('member_management_delete');
        $this->ensureWorkspaceAccess($member);

        $this->memberService->delete($member);

        return redirect()->back()->with('success', __('Member deleted successfully.'));
    }

    public function toggleStatus(User $member)
    {
        $this->authorizePermission('member_management_update');
        $this->ensureWorkspaceAccess($member);

        $this->memberService->toggleStatus($member);

        return redirect()->back()->with('success', __('Member status updated successfully.'));
    }

    private function ensureWorkspaceAccess(User $member): void
    {
        $workspaceId = auth()->user()->current_workspace_id;
        if (!$workspaceId) {
            abort(403, 'Unauthorized');
        }

        $hasAccess = $member->workspaces()
            ->where('workspace_id', $workspaceId)
            ->wherePivot('role', 'member')
            ->exists();

        if (!$hasAccess) {
            abort(403, 'Unauthorized');
        }
    }
}
