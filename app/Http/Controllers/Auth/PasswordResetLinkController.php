<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\MailConfigService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Inertia\Inertia;
use Inertia\Response;

class PasswordResetLinkController extends Controller
{
    /**
     * Show the password reset link request page.
     */
    public function create(Request $request): Response
    {
        return Inertia::render('auth/forgot-password', [
            'status' => $request->session()->get('status'),
            'settings' => settings(),
        ]);
    }

    /**
     * Handle an incoming password reset link request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        // Check if user exists
        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return back()->with('status', __('A reset link will be sent if the account exists.'));
        }

        try {
            // Configure mail using MailConfigService
            $workspace = $user->currentWorkspace ?? $user->ownedWorkspaces()->first() ?? $user->workspaces()->first();
            MailConfigService::setDynamicConfig($user->id, $workspace?->id);
            
            Password::sendResetLink(
                $request->only('email')
            );
            return back()->with('status', __('A reset link will be sent if the account exists.'));
        } catch (\Exception $e) {
            \Log::error('Password reset email failed: ' . $e->getMessage());
            return back()->with('error', $e->getMessage());
        }
    }


}
