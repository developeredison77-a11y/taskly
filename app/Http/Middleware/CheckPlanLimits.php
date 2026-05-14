<?php

namespace App\Http\Middleware;

use App\Services\PlanLimitService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckPlanLimits
{
    public function __construct(private PlanLimitService $planLimitService)
    {
    }

    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Skip plan limits in non-SaaS mode
        if (!isSaasMode()) {
            return $next($request);
        }
        
        $user = auth()->user();
        
        if (!$user || $user->isSuperAdmin()) {
            return $next($request);
        }

        // Check if user needs plan subscription
        if ($user->needsPlanSubscription()) {
            if ($request->expectsJson()) {
                return response()->json([
                    'error' => 'Plan subscription required',
                    'redirect' => route('plans.index')
                ], 402);
            }
            
            return redirect()->route('plans.index')
                ->with('error', 'Please subscribe to a plan to continue using the service.');
        }

        // Add plan usage warnings to session
        $warnings = $this->planLimitService->getApproachingLimits($user);
        if (!empty($warnings)) {
            session()->flash('plan_warnings', $warnings);
        }

        return $next($request);
    }
}