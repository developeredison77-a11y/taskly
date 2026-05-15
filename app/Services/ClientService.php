<?php

namespace App\Services;

use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceMember;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class ClientService
{
    public function getPaginatedForWorkspace(int $workspaceId, Request $request): LengthAwarePaginator
    {
        $query = User::query()
            ->where('type', 'client')
            ->with(['workspaces:id,name'])
            ->whereHas('workspaces', function ($q) use ($workspaceId) {
                $q->where('workspace_id', $workspaceId)
                    ->where('role', 'client');
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
                    ->where('role', 'client')
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

        $perPage = in_array((int) $request->get('per_page', 10), [10, 25, 50, 100]) ? (int) $request->get('per_page', 10) : 10;

        return $query->paginate($perPage)->withQueryString();
    }

    public function create(array $data, int $userId): User
    {
        $workspaceIds = $data['workspace_ids'] ?? [];
        unset($data['workspace_ids']);

        $client = User::create([
            ...$data,
            'password' => Hash::make(Str::random(16)),
            'type' => 'client',
            'created_by' => $userId,
        ]);

        foreach ($workspaceIds as $workspaceId) {
            WorkspaceMember::updateOrCreate(
                ['workspace_id' => $workspaceId, 'user_id' => $client->id],
                [
                'role' => 'client',
                'status' => $data['status'] ?? 'active',
                'joined_at' => now(),
                ]
            );
        }

        return $client;
    }

    public function update(User $client, array $data): void
    {
        $workspaceIds = $data['workspace_ids'] ?? [];
        unset($data['workspace_ids']);

        $data['type'] = 'client';
        $client->update($data);

        WorkspaceMember::where('user_id', $client->id)
            ->where('role', 'client')
            ->whereNotIn('workspace_id', $workspaceIds)
            ->delete();

        foreach ($workspaceIds as $workspaceId) {
            WorkspaceMember::updateOrCreate(
                ['workspace_id' => $workspaceId, 'user_id' => $client->id],
                [
                    'role' => 'client',
                    'status' => $data['status'] ?? 'active',
                    'joined_at' => now(),
                ]
            );
        }
    }

    public function delete(User $client): void
    {
        $client->delete();
    }

    public function toggleStatus(User $client): void
    {
        $workspaceStatus = WorkspaceMember::where('user_id', $client->id)
            ->where('role', 'client')
            ->where('status', 'active')
            ->exists() ? 'inactive' : 'active';

        WorkspaceMember::where('user_id', $client->id)
            ->where('role', 'client')
            ->update(['status' => $workspaceStatus]);

        $client->status = $workspaceStatus;
        $client->save();
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
