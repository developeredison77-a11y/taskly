<?php

namespace App\Exports;

use App\Models\Task;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class TaskExport implements FromQuery, WithHeadings, WithMapping
{
    public function __construct(private ?Request $request = null)
    {
    }

    public function query()
    {
        $user = auth()->user();
        $workspace = $user->currentWorkspace;

        if (!$workspace) {
            return Task::whereRaw('1 = 0');
        }

        $userWorkspaceRole = $workspace->getMemberRole($user);

        $query = Task::with(['project', 'taskStage', 'assignedTo', 'creator', 'milestone'])
            ->whereHas('project', function ($q) use ($user, $userWorkspaceRole) {
                $q->forWorkspace($user->current_workspace_id);

                if ($userWorkspaceRole !== 'owner') {
                    $q->where(function ($projectQuery) use ($user) {
                        $projectQuery->whereHas('members', function ($memberQuery) use ($user) {
                            $memberQuery->where('user_id', $user->id);
                        })
                            ->orWhereHas('clients', function ($clientQuery) use ($user) {
                                $clientQuery->where('user_id', $user->id);
                            })
                            ->orWhere('created_by', $user->id);
                    });
                }
            });

        if ($userWorkspaceRole === 'member' && !$this->request?->project_id) {
            $query->where(function ($taskQuery) use ($user) {
                $taskQuery->where('assigned_to', $user->id)
                    ->orWhere('created_by', $user->id);
            });
        }

        if ($this->request?->filled('project_id')) {
            $query->forProject($this->request->project_id);
        }

        if ($this->request?->filled('stage_id')) {
            $query->byStage($this->request->stage_id);
        }

        if ($this->request?->filled('priority')) {
            $query->byPriority($this->request->priority);
        }

        if ($this->request?->filled('assigned_to')) {
            $query->where('assigned_to', $this->request->assigned_to);
        }

        if ($this->request?->filled('search')) {
            $query->where('title', 'like', '%' . $this->request->search . '%');
        }

        return $query->latest();
    }

    public function headings(): array
    {
        return [
            'Title',
            'Description',
            'Project',
            'Stage',
            'Priority',
            'Assignee',
            'Milestone',
            'Progress',
            'Start Date',
            'End Date',
            'Created By',
            'Created At',
            'Updated At',
        ];
    }

    public function map($task): array
    {
        return [
            $task->title,
            $task->description ?? '',
            $task->project?->title ?? '',
            $task->taskStage?->name ?? '',
            $task->priority ?? '',
            $task->assignedTo?->name ?? '',
            $task->milestone?->title ?? '',
            $task->progress ?? 0,
            $task->start_date ? $task->start_date->format('Y-m-d') : '',
            $task->end_date ? $task->end_date->format('Y-m-d') : '',
            $task->creator?->name ?? '',
            $task->created_at?->format('Y-m-d H:i:s') ?? '',
            $task->updated_at?->format('Y-m-d H:i:s') ?? '',
        ];
    }
}
