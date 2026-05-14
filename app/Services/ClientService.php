<?php

namespace App\Services;

use App\Models\Client;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;

class ClientService
{
    public function getPaginatedForWorkspace(int $workspaceId, Request $request): LengthAwarePaginator
    {
        $query = Client::query()
            ->where('workspace_id', $workspaceId)
            ->with('creator');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', '%' . $search . '%')
                    ->orWhere('email', 'like', '%' . $search . '%')
                    ->orWhere('phone', 'like', '%' . $search . '%');
            });
        }

        if ($request->filled('status') && in_array($request->status, ['active', 'inactive'])) {
            $query->where('status', $request->status);
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

    public function create(array $data, int $workspaceId, int $userId): Client
    {
        return Client::create([
            ...$data,
            'workspace_id' => $workspaceId,
            'created_by' => $userId,
        ]);
    }

    public function update(Client $client, array $data): void
    {
        $client->update($data);
    }

    public function delete(Client $client): void
    {
        $client->delete();
    }

    public function toggleStatus(Client $client): void
    {
        $client->update([
            'status' => $client->status === 'active' ? 'inactive' : 'active',
        ]);
    }
}

