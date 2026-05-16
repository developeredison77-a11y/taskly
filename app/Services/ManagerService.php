<?php

namespace App\Services;

use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceMember;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class ManagerService
{
    public function getPaginatedForWorkspace(?int $workspaceId, Request $request): LengthAwarePaginator
    {
        $perPage = in_array((int) $request->get('per_page', 10), [10, 25, 50, 100]) ? (int) $request->get('per_page', 10) : 10;
        if (!$workspaceId) {
            return User::query()->whereRaw('1 = 0')->paginate($perPage)->withQueryString();
        }

        $query = User::query()
            ->where('type', 'manager')
            ->with(['workspaces:id,name'])
            ->whereHas('workspaces', function ($q) use ($workspaceId) {
                $q->where('workspace_id', $workspaceId)
                    ->where('role', 'manager');
            });

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', '%' . $search . '%')
                    ->orWhere('email', 'like', '%' . $search . '%')
                    ->orWhere('phone', 'like', '%' . $search . '%');
            });
        }

        if ($request->filled('status') && in_array($request->status, ['active', 'inactive'])) {
            $query->whereHas('workspaces', function ($q) use ($workspaceId, $request) {
                $q->where('workspace_id', $workspaceId)
                    ->where('role', 'manager')
                    ->where('status', $request->status);
            });
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

        return $query->paginate($perPage)->withQueryString();
    }

    public function create(array $data, int $userId): User
    {
        $workspaceIds = $data['workspace_ids'] ?? [];
        unset($data['workspace_ids']);

        $manager = User::create([
            ...$data,
            'password' => Hash::make('password'),
            'type' => 'manager',
            'created_by' => $userId,
        ]);

        foreach ($workspaceIds as $workspaceId) {
            WorkspaceMember::updateOrCreate(
                ['workspace_id' => $workspaceId, 'user_id' => $manager->id],
                [
                'role' => 'manager',
                'status' => $data['status'] ?? 'active',
                'joined_at' => now(),
                ]
            );
        }

        return $manager;
    }

    public function update(User $manager, array $data): void
    {
        $workspaceIds = $data['workspace_ids'] ?? [];
        unset($data['workspace_ids']);

        $data['type'] = 'manager';
        $manager->update($data);

        WorkspaceMember::where('user_id', $manager->id)
            ->where('role', 'manager')
            ->whereNotIn('workspace_id', $workspaceIds)
            ->delete();

        foreach ($workspaceIds as $workspaceId) {
            WorkspaceMember::updateOrCreate(
                ['workspace_id' => $workspaceId, 'user_id' => $manager->id],
                [
                    'role' => 'manager',
                    'status' => $data['status'] ?? 'active',
                    'joined_at' => now(),
                ]
            );
        }
    }

    public function delete(User $manager): void
    {
        $manager->delete();
    }

    public function toggleStatus(User $manager): void
    {
        $workspaceStatus = WorkspaceMember::where('user_id', $manager->id)
            ->where('role', 'manager')
            ->where('status', 'active')
            ->exists() ? 'inactive' : 'active';

        WorkspaceMember::where('user_id', $manager->id)
            ->where('role', 'manager')
            ->update(['status' => $workspaceStatus]);

        $manager->status = $workspaceStatus;
        $manager->save();
    }

    public function getAssignableWorkspacesForUser(User $authUser): array
    {
        return Workspace::query()
            ->where(function ($query) use ($authUser) {
                $query->where('owner_id', $authUser->id)
                    ->orWhereHas('members', function ($q) use ($authUser) {
                        $q->where('user_id', $authUser->id)
                            ->where('status', 'active');
                    });
            })
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn ($workspace) => [
                'id' => $workspace->id,
                'name' => $workspace->name,
            ])
            ->toArray();
    }
}
