<?php

namespace App\Services;

use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceMember;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class MemberService
{
    public function getPaginatedForWorkspace(?int $workspaceId, Request $request, User $authUser): LengthAwarePaginator
    {
        $perPage = in_array((int) $request->get('per_page', 10), [10, 25, 50, 100]) ? (int) $request->get('per_page', 10) : 10;
        if (!$workspaceId && !in_array($authUser->type, ['superadmin', 'super admin'], true)) {
            return User::query()->whereRaw('1 = 0')->paginate($perPage)->withQueryString();
        }

        $query = User::query()
            ->where('type', 'member')
            ->with(['workspaces:id,name']);

        if (!in_array($authUser->type, ['superadmin', 'super admin'], true)) {
            $query->whereHas('workspaces', function ($q) use ($workspaceId) {
                $q->where('workspace_id', $workspaceId)
                    ->where('role', 'member');
            });
        } elseif (in_array($authUser->type, ['company', 'company_admin'], true)) {
            $query->whereHas('workspaces', function ($q) use ($workspaceId, $authUser) {
                $q->where('workspace_id', $workspaceId)
                    ->where('role', 'member')
                    ->where('owner_id', $authUser->id);
            });
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', '%' . $search . '%')
                    ->orWhere('email', 'like', '%' . $search . '%')
                    ->orWhere('phone', 'like', '%' . $search . '%');
            });
        }

        if ($request->filled('status') && in_array($request->status, ['active', 'inactive'], true)) {
            if ($workspaceId) {
                $query->whereHas('workspaces', function ($q) use ($workspaceId, $request) {
                    $q->where('workspace_id', $workspaceId)
                        ->where('role', 'member')
                        ->where('status', $request->status);
                });
            } else {
                $query->where('status', $request->status);
            }
        }

        $allowedSortFields = ['name', 'email', 'phone', 'status', 'created_at'];
        $sortField = $request->input('sort_field', 'created_at');
        $sortDirection = $request->input('sort_direction', 'desc');

        if (!in_array($sortField, $allowedSortFields)) {
            $sortField = 'created_at';
        }
        if (!in_array($sortDirection, ['asc', 'desc'])) {
            $sortDirection = 'desc';
        }

        $query->orderBy($sortField, $sortDirection);

        return $query->paginate($perPage)->withQueryString()->through(function (User $member) use ($authUser) {
            $member->workspace_names = $member->workspaces->pluck('name')->join(', ');
            $member->can_manage = in_array($authUser->type, ['superadmin', 'super admin'], true)
                || (in_array($authUser->type, ['company', 'company_admin'], true) && (int) $member->created_by === (int) $authUser->id);
            return $member;
        });
    }

    public function create(array $data, int $userId): User
    {
        $workspaceIds = $data['workspace_ids'] ?? [];
        $authUser = auth()->user();
        if ($authUser && in_array($authUser->type, ['company', 'company_admin'], true)) {
            $workspaceIds = Workspace::whereIn('id', $workspaceIds)
                ->where('owner_id', $authUser->id)
                ->pluck('id')
                ->all();
        }
        unset($data['workspace_ids']);

        $member = User::create([
            ...$data,
            'password' => Hash::make('password'),
            'type' => 'member',
            'created_by' => $userId,
        ]);

        foreach ($workspaceIds as $workspaceId) {
            WorkspaceMember::updateOrCreate(
                ['workspace_id' => $workspaceId, 'user_id' => $member->id],
                [
                'role' => 'member',
                'status' => $data['status'] ?? 'active',
                'joined_at' => now(),
                ]
            );
        }

        return $member;
    }

    public function update(User $member, array $data): void
    {
        $workspaceIds = $data['workspace_ids'] ?? [];
        $authUser = auth()->user();
        if ($authUser && in_array($authUser->type, ['company', 'company_admin'], true)) {
            $workspaceIds = Workspace::whereIn('id', $workspaceIds)
                ->where('owner_id', $authUser->id)
                ->pluck('id')
                ->all();
        }
        unset($data['workspace_ids']);

        $data['type'] = 'member';
        $member->update($data);

        WorkspaceMember::where('user_id', $member->id)
            ->where('role', 'member')
            ->whereNotIn('workspace_id', $workspaceIds)
            ->delete();

        foreach ($workspaceIds as $workspaceId) {
            WorkspaceMember::updateOrCreate(
                ['workspace_id' => $workspaceId, 'user_id' => $member->id],
                [
                    'role' => 'member',
                    'status' => $data['status'] ?? 'active',
                    'joined_at' => now(),
                ]
            );
        }
    }

    public function delete(User $member): void
    {
        $member->delete();
    }

    public function toggleStatus(User $member): void
    {
        $workspaceStatus = WorkspaceMember::where('user_id', $member->id)
            ->where('role', 'member')
            ->where('status', 'active')
            ->exists() ? 'inactive' : 'active';

        WorkspaceMember::where('user_id', $member->id)
            ->where('role', 'member')
            ->update(['status' => $workspaceStatus]);

        $member->status = $workspaceStatus;
        $member->save();
    }

    public function getAssignableWorkspacesForUser(User $authUser): array
    {
        $query = Workspace::query();

        if (!in_array($authUser->type, ['superadmin', 'super admin'], true)) {
            $query->where('owner_id', $authUser->id);
        }

        return $query
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn ($workspace) => [
                'id' => $workspace->id,
                'name' => $workspace->name,
            ])
            ->toArray();
    }
}

