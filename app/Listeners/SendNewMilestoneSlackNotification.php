<?php

namespace App\Listeners;

use App\Events\MilestoneCreated;
use App\Services\SlackService;

class SendNewMilestoneSlackNotification
{
    public function handle(MilestoneCreated $event): void
    {
        $milestone = $event->milestone;
        $userId = auth()->id();
        $workspaceId = $milestone->project->workspace_id ?? null;
        
        if (!$userId) return;

        if (isNotificationTemplateEnabled('New Milestone', $userId, 'slack')) {
            $data = [
                'title' => 'New Milestone Created',
                'message' => "A new milestone '{$milestone->title}' has been created.",
                'milestone_name' => $milestone->title,
                'project_name' => $milestone->project->title ?? 'Unknown Project',
                'due_date' => $milestone->due_date ? $milestone->due_date->format('M d, Y') : 'No due date',
                'url' => route('projects.show', $milestone->project_id)
            ];

            SlackService::send('New Milestone', $data, $userId, $workspaceId);
        }
    }
}