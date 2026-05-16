<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureCurrentWorkspace
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();

        if (!$user) {
            return $next($request);
        }

        if (in_array($user->type, ['superadmin', 'super admin', 'admin'], true)) {
            return $next($request);
        }

        $workspace = null;

        if ($user->current_workspace_id) {
            $workspace = $user->workspaces()
                ->where('workspaces.id', $user->current_workspace_id)
                ->first()
                ?? $user->ownedWorkspaces()
                    ->where('id', $user->current_workspace_id)
                    ->first();
        }

        if (!$workspace && session('current_workspace_id')) {
            $workspace = $user->workspaces()
                ->where('workspaces.id', session('current_workspace_id'))
                ->first()
                ?? $user->ownedWorkspaces()
                    ->where('id', session('current_workspace_id'))
                    ->first();
        }

        if (!$workspace) {
            $workspace = $user->workspaces()->first() ?? $user->ownedWorkspaces()->first();
        }

        if (!$workspace && $user->type === 'company' && function_exists('createDefaultWorkspace')) {
            $workspace = createDefaultWorkspace($user);
        }

        if ($workspace) {
            if ((int) $user->current_workspace_id !== (int) $workspace->id) {
                $user->forceFill(['current_workspace_id' => $workspace->id])->save();
            }

            session(['current_workspace_id' => $workspace->id]);
        }

        return $next($request);
    }
}

