<?php

namespace App\Listeners;

use App\Events\MilestoneStatusUpdated;
use App\Services\SlackService;

class SendMilestoneStatusUpdateSlackNotification
{
    public function handle(MilestoneStatusUpdated $event): void
    {
        $milestone = $event->milestone;
        $userId = $milestone->created_by ?? auth()->id();
        $workspaceId = $milestone->project->workspace_id ?? null;

        if (!$userId)
            return;
        if (isNotificationTemplateEnabled('Milestone Status Updated', $userId, 'slack')) {

            $data = [
                'title' => 'Milestone Status Updated',
                'message' => "Milestone '{$milestone->title}' status changed from '{$event->oldStatus}' to '{$event->newStatus}'.",
                'milestone_name' => $milestone->title,
                'project_name' => $milestone->project->title ?? 'Unknown Project',
                'old_status' => $event->oldStatus,
                'new_status' => $event->newStatus,
                'url' => route('projects.show', $milestone->project_id)
            ];

            SlackService::send('Milestone Status Updated', $data, $userId, $workspaceId);
        }
    }
}