<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Task;
use App\Models\TaskStage;
use App\Models\User;
use App\Models\ProjectMilestone;
use App\Models\TimesheetEntry;
use App\Models\Workspace;
use App\Traits\HasPermissionChecks;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ProjectReportController extends Controller
{
    use HasPermissionChecks;

    public function index(Request $request)
    {

        $user = Auth::user();
        $workspace = $user->currentWorkspace;

        if (!$workspace) {
            return redirect()->route('dashboard')->with('error', 'No workspace selected.');
        }

        $userWorkspaceRole = $workspace->getMemberRole($user);

        $query = Project::with(['workspace', 'clients', 'creator', 'members.user'])
            ->forWorkspace($user->current_workspace_id);

        // Access control based on workspace role
        if ($userWorkspaceRole === 'owner') {
            // Owner: Full access to all projects
        } else {
            // Non-owners: Only assigned projects
            $query->where(function ($q) use ($user, $userWorkspaceRole) {
                $q->whereHas('members', function ($memberQuery) use ($user) {
                    $memberQuery->where('user_id', $user->id);
                })
                    ->orWhereHas('clients', function ($clientQuery) use ($user) {
                        $clientQuery->where('user_id', $user->id);
                    });

                // Client/Member: Only self-created projects
                if (in_array($userWorkspaceRole, ['client', 'member'])) {
                    $q->orWhere('created_by', $user->id);
                }
            });
        }

        if ($request->search)
            $query->search($request->search);
        if ($request->status)
            $query->byStatus($request->status);
        if ($request->user_id)
            $query->where(function ($q) use ($request) {
                $q->whereHas('members', function ($memberQuery) use ($request) {
                    $memberQuery->where('user_id', $request->user_id);
                })
                    ->orWhereHas('clients', function ($clientQuery) use ($request) {
                        $clientQuery->where('user_id', $request->user_id);
                    });
            });

        // Add sorting
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        
        // Validate sort fields
        $allowedSortFields = ['title', 'name', 'status', 'created_at', 'start_date', 'deadline'];
        if (!in_array($sortBy, $allowedSortFields)) {
            $sortBy = 'created_at';
        }
        
        if (!in_array($sortOrder, ['asc', 'desc'])) {
            $sortOrder = 'desc';
        }

        $perPage = in_array($request->get('per_page', 10), [10, 25, 50, 100]) ? $request->get('per_page', 10) : 10;
        $projects = $query->orderBy($sortBy, $sortOrder)->paginate($perPage);

        $users = User::whereHas('workspaces', function ($q) use ($workspace) {
            $q->where('workspace_id', $workspace->id)->where('status', 'active');
        })->get();

        return Inertia::render('project-reports/Index', [
            'projects' => $projects,
            'users' => $users,
            'filters' => $request->only(['search', 'status', 'user_id', 'per_page', 'sort_by', 'sort_order']),
            'userWorkspaceRole' => $userWorkspaceRole,
        ]);
    }

    public function show(Project $project)
    {
        $this->authorizePermission('project_report_view_any');

        $user = Auth::user();
        $workspace = $user->currentWorkspace;

        // Get project with relationships
        $project->load(['members', 'clients', 'milestones', 'tasks.taskStage', 'tasks.members']);

        // Calculate project statistics
        $stats = $this->calculateProjectStats($project);

        // Calculate user statistics
        $userStats = $this->calculateUserStats($project);

        // Get chart data
        $chartData = $this->getProjectChartData($project, $workspace);

        // Get workspace users and stages for filtering
        $users = $workspace->members()->with('user')->get();
        $stages = TaskStage::where('workspace_id', $workspace->id)->orderBy('order')->get();

        // Get initial tasks data
        $initialTasksQuery = Task::where('project_id', $project->id)
            ->with(['taskStage', 'members.user', 'milestone', 'assignedUser'])
            ->limit(10);

        $initialTasks = $initialTasksQuery->get()->map(function ($task) {
            $loggedHours = TimesheetEntry::where('task_id', $task->id)->sum('hours');

            // Get assigned users
            $assignedUsers = collect();
            if ($task->assignedUser) {
                $assignedUsers->push($task->assignedUser);
            }
            if ($task->members && $task->members->count() > 0) {
                $assignedUsers = $assignedUsers->merge($task->members->pluck('user')->filter());
            }
            $assignedUsers = $assignedUsers->unique('id');

            return [
                'id' => $task->id,
                'title' => $task->title,
                'name' => $task->title,
                'description' => $task->description,
                'start_date' => $task->start_date,
                'due_date' => $task->end_date,
                'end_date' => $task->end_date,
                'priority' => $task->priority ?: 'medium',
                'status' => $task->taskStage ? $task->taskStage->name : 'To Do',
                'stage' => $task->taskStage ? $task->taskStage->name : 'To Do',
                'task_stage' => $task->taskStage ? [
                    'id' => $task->taskStage->id,
                    'name' => $task->taskStage->name,
                    'color' => $task->taskStage->color
                ] : null,
                'milestone' => $task->milestone ? [
                    'id' => $task->milestone->id,
                    'title' => $task->milestone->title
                ] : null,
                'milestone_title' => $task->milestone ? $task->milestone->title : null,
                'assigned_users' => $assignedUsers->map(function ($user) {
                    return [
                        'id' => $user->id,
                        'name' => $user->name,
                        'user' => ['name' => $user->name]
                    ];
                })->values(),
                'logged_hours' => round($loggedHours, 2),
                'total_logged_hours' => round($loggedHours, 2),
                'progress' => $task->progress ?: 0,
                'estimated_hours' => $task->estimated_hours ?: 0,
            ];
        });

        return Inertia::render('project-reports/Show', [
            'project' => $project,
            'stats' => $stats,
            'userStats' => $userStats,
            'chartData' => $chartData,
            'users' => $users,
            'stages' => $stages,
            'workspace' => $workspace,
            'tasks' => [
                'data' => $initialTasks,
                'total' => Task::where('project_id', $project->id)->count()
            ],
            'filters' => request()->only(['search', 'user_id', 'status', 'priority', 'milestone_id', 'per_page'])
        ]);
    }

    public function getTasksData(Request $request, Project $project)
    {
        $this->authorizePermission('project_report_view_any');

        $tasksQuery = Task::where('project_id', $project->id)
            ->with(['taskStage', 'members.user', 'milestone', 'assignedUser']);

        // Apply search filter
        if ($request->filled('search')) {
            $tasksQuery->where(function ($query) use ($request) {
                $query->where('title', 'like', '%' . $request->search . '%')
                    ->orWhere('description', 'like', '%' . $request->search . '%');
            });
        }

        // Apply filters
        if ($request->filled('user_id') && $request->user_id !== 'all') {
            $tasksQuery->where(function ($query) use ($request) {
                $query->where('assigned_to', $request->user_id)
                    ->orWhereHas('members', function ($memberQuery) use ($request) {
                        $memberQuery->where('user_id', $request->user_id);
                    });
            });
        }

        if ($request->filled('status') && $request->status !== 'all') {
            $tasksQuery->whereHas('taskStage', function ($query) use ($request) {
                $query->where('name', $request->status);
            });
        }

        if ($request->filled('priority') && $request->priority !== 'all') {
            $tasksQuery->where('priority', $request->priority);
        }

        if ($request->filled('milestone_id') && $request->milestone_id !== 'all') {
            $tasksQuery->where('milestone_id', $request->milestone_id);
        }

        // Pagination
        $perPage = $request->get('per_page', 10);
        $tasks = $tasksQuery->paginate($perPage);

        // Transform tasks data
        $transformedTasks = $tasks->getCollection()->map(function ($task) {
            $loggedHours = TimesheetEntry::where('task_id', $task->id)->sum('hours');

            // Get assigned users
            $assignedUsers = collect();
            if ($task->assignedUser) {
                $assignedUsers->push($task->assignedUser);
            }
            if ($task->members && $task->members->count() > 0) {
                $assignedUsers = $assignedUsers->merge($task->members->pluck('user')->filter());
            }
            $assignedUsers = $assignedUsers->unique('id');

            return [
                'id' => $task->id,
                'title' => $task->title,
                'name' => $task->title, // Alias for compatibility
                'description' => $task->description,
                'start_date' => $task->start_date,
                'due_date' => $task->end_date,
                'end_date' => $task->end_date, // Alias for compatibility
                'priority' => $task->priority ?: 'medium',
                'status' => $task->taskStage ? $task->taskStage->name : 'To Do',
                'stage' => $task->taskStage ? $task->taskStage->name : 'To Do',
                'task_stage' => $task->taskStage ? [
                    'id' => $task->taskStage->id,
                    'name' => $task->taskStage->name,
                    'color' => $task->taskStage->color
                ] : null,
                'milestone' => $task->milestone ? [
                    'id' => $task->milestone->id,
                    'title' => $task->milestone->title
                ] : null,
                'milestone_title' => $task->milestone ? $task->milestone->title : null,
                'assigned_users' => $assignedUsers->map(function ($user) {
                    return [
                        'id' => $user->id,
                        'name' => $user->name,
                        'user' => ['name' => $user->name] // For compatibility
                    ];
                })->values(),
                'assignees' => $assignedUsers->pluck('name')->join(', '),
                'logged_hours' => round($loggedHours, 2),
                'total_logged_hours' => round($loggedHours, 2),
                'is_completed' => $task->progress >= 100,
                'progress' => $task->progress ?: 0,
                'estimated_hours' => $task->estimated_hours ?: 0,
                'created_at' => $task->created_at,
                'updated_at' => $task->updated_at,
            ];
        });

        // Replace the collection in the paginator
        $tasks->setCollection($transformedTasks);

        return response()->json([
            'data' => $transformedTasks,
            'pagination' => [
                'current_page' => $tasks->currentPage(),
                'last_page' => $tasks->lastPage(),
                'per_page' => $tasks->perPage(),
                'total' => $tasks->total(),
                'from' => $tasks->firstItem(),
                'to' => $tasks->lastItem(),
            ]
        ]);
    }

    public function export(Project $project)
    {
        $this->authorizePermission('project_report_view_any');

        $project->load(['members', 'clients', 'milestones', 'tasks.taskStage', 'tasks.members']);
        $stats = $this->calculateProjectStats($project);
        $userStats = $this->calculateUserStats($project);
        $tasks = Task::where('project_id', $project->id)->with(['taskStage', 'members', 'milestone', 'assignedUser'])->get();

        $completionPercentage = $stats['completion_percentage'] ?? 0;

        // Generate high-quality circular progress chart
        $size = 400; // Larger size for better quality
        $centerX = $size / 2;
        $centerY = $size / 2;
        $outerRadius = 160;
        $innerRadius = 140;

        $image = imagecreatetruecolor($size, $size);
        imageantialias($image, true);
        imagesavealpha($image, true);
        $transparent = imagecolorallocatealpha($image, 0, 0, 0, 127);
        imagefill($image, 0, 0, $transparent);

        $gray = imagecolorallocate($image, 229, 231, 235);
        $orange = imagecolorallocate($image, 249, 115, 22);
        $black = imagecolorallocate($image, 31, 41, 55);
        $white = imagecolorallocate($image, 255, 255, 255);

        // Draw background donut (gray) - full circle
        imagefilledellipse($image, $centerX, $centerY, $outerRadius * 2, $outerRadius * 2, $gray);
        imagefilledellipse($image, $centerX, $centerY, $innerRadius * 2, $innerRadius * 2, $white);

        // Draw progress arc (orange) on top
        if ($completionPercentage > 0) {
            $endAngle = ($completionPercentage / 100) * 360;
            imagefilledarc($image, $centerX, $centerY, $outerRadius * 2, $outerRadius * 2, -90, -90 + $endAngle, $orange, IMG_ARC_PIE);
            imagefilledellipse($image, $centerX, $centerY, $innerRadius * 2, $innerRadius * 2, $white);

            // Add rounded caps at start and end of arc
            $capRadius = ($outerRadius - $innerRadius) / 2;
            $ringRadius = ($outerRadius + $innerRadius) / 2;

            // Start cap (top)
            $startX = $centerX;
            $startY = $centerY - $ringRadius;
            imagefilledellipse($image, $startX, $startY, $capRadius * 2, $capRadius * 2, $orange);

            // End cap
            $endAngleRad = deg2rad(-90 + $endAngle);
            $endX = $centerX + ($ringRadius * cos($endAngleRad));
            $endY = $centerY + ($ringRadius * sin($endAngleRad));
            imagefilledellipse($image, $endX, $endY, $capRadius * 2, $capRadius * 2, $orange);
        }

        // Add percentage text - draw directly at larger size
        $text = $completionPercentage . '%';

        // Try to use TrueType font if available
        $fontPath = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
        if (file_exists($fontPath)) {
            $fontSize = 48;
            $bbox = imagettfbbox($fontSize, 0, $fontPath, $text);
            $textWidth = $bbox[2] - $bbox[0];
            $textHeight = $bbox[1] - $bbox[7];
            $textX = $centerX - ($textWidth / 2);
            $textY = $centerY + ($textHeight / 2);
            imagettftext($image, $fontSize, 0, $textX, $textY, $black, $fontPath, $text);
        } else {
            // Fallback: draw larger with GD font
            $font = 5;
            $scale = 6;
            $charWidth = imagefontwidth($font);
            $charHeight = imagefontheight($font);

            foreach (str_split($text) as $i => $char) {
                $charImg = imagecreatetruecolor($charWidth, $charHeight);
                $bg = imagecolorallocate($charImg, 255, 255, 255);
                $fg = imagecolorallocate($charImg, 31, 41, 55);
                imagefill($charImg, 0, 0, $bg);
                imagechar($charImg, $font, 0, 0, $char, $fg);

                $scaledWidth = $charWidth * $scale;
                $scaledHeight = $charHeight * $scale;
                $totalWidth = strlen($text) * $scaledWidth;
                $startX = $centerX - ($totalWidth / 2);
                $charX = $startX + ($i * $scaledWidth);
                $charY = $centerY - ($scaledHeight / 2);

                imagecopyresampled($image, $charImg, $charX, $charY, 0, 0, $scaledWidth, $scaledHeight, $charWidth, $charHeight);
                imagedestroy($charImg);
            }
        }

        ob_start();
        imagepng($image);
        $imageData = ob_get_clean();
        imagedestroy($image);

        $base64Image = base64_encode($imageData);

        // Generate milestone arc chart (semicircle like overview)
        $milestonePercentage = $stats['milestone_completion_percentage'] ?? 0;
        $arcSize = 400;
        $arcHeight = 210;
        $arcImage = imagecreatetruecolor($arcSize, $arcHeight);
        imagesavealpha($arcImage, true);
        $arcTransparent = imagecolorallocatealpha($arcImage, 0, 0, 0, 127);
        imagefill($arcImage, 0, 0, $arcTransparent);

        $arcGray = imagecolorallocate($arcImage, 229, 231, 235);
        $arcGreen = imagecolorallocate($arcImage, 34, 197, 94);
        $arcBlack = imagecolorallocate($arcImage, 31, 41, 55);
        $arcWhite = imagecolorallocate($arcImage, 255, 255, 255);

        $arcCenterX = $arcSize / 2;
        $arcCenterY = $arcHeight;
        $arcOuterRadius = 160;
        $arcInnerRadius = 140;

        // Draw gray background donut
        imagefilledellipse($arcImage, $arcCenterX, $arcCenterY, $arcOuterRadius * 2, $arcOuterRadius * 2, $arcGray);
        imagefilledellipse($arcImage, $arcCenterX, $arcCenterY, $arcInnerRadius * 2, $arcInnerRadius * 2, $arcWhite);

        // Draw green progress arc
        if ($milestonePercentage > 0) {
            $arcEndAngle = 180 + ($milestonePercentage / 100) * 180;
            imagefilledarc($arcImage, $arcCenterX, $arcCenterY, $arcOuterRadius * 2, $arcOuterRadius * 2, 180, $arcEndAngle, $arcGreen, IMG_ARC_PIE);
            imagefilledellipse($arcImage, $arcCenterX, $arcCenterY, $arcInnerRadius * 2, $arcInnerRadius * 2, $arcWhite);

            // Add rounded caps
            $capRadius = ($arcOuterRadius - $arcInnerRadius) / 2;
            $ringRadius = ($arcOuterRadius + $arcInnerRadius) / 2;

            imagefilledellipse($arcImage, $arcCenterX - $ringRadius, $arcCenterY, $capRadius * 2, $capRadius * 2, $arcGreen);

            $capRad = deg2rad($arcEndAngle);
            $capX = $arcCenterX + ($ringRadius * cos($capRad));
            $capY = $arcCenterY + ($ringRadius * sin($capRad));
            imagefilledellipse($arcImage, $capX, $capY, $capRadius * 2, $capRadius * 2, $arcGreen);
        }

        // Add text in center
        $fontPath = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
        if (file_exists($fontPath)) {
            // Percentage text
            $percentText = $milestonePercentage . '%';
            $bbox = imagettfbbox(32, 0, $fontPath, $percentText);
            $textWidth = $bbox[2] - $bbox[0];
            imagettftext($arcImage, 32, 0, $arcCenterX - ($textWidth / 2), $arcCenterY - 50, $arcBlack, $fontPath, $percentText);

            // Progress label
            $progressText = 'Progress';
            $bbox2 = imagettfbbox(18, 0, $fontPath, $progressText);
            $textWidth2 = $bbox2[2] - $bbox2[0];
            imagettftext($arcImage, 18, 0, $arcCenterX - ($textWidth2 / 2), $arcCenterY - 15, $arcGreen, $fontPath, $progressText);
        }

        ob_start();
        imagepng($arcImage);
        $arcImageData = ob_get_clean();
        imagedestroy($arcImage);

        $base64ArcImage = base64_encode($arcImageData);

        // Generate Task Priority bar chart
        $priorityStats = $stats['priority_stats'] ?? [];
        $priorityImage = imagecreatetruecolor(450, 180);
        imagesavealpha($priorityImage, true);
        $priorityTransparent = imagecolorallocatealpha($priorityImage, 0, 0, 0, 127);
        imagefill($priorityImage, 0, 0, $priorityTransparent);

        $priorityColors = [
            'critical' => imagecolorallocate($priorityImage, 239, 68, 68),
            'high' => imagecolorallocate($priorityImage, 249, 115, 22),
            'medium' => imagecolorallocate($priorityImage, 245, 158, 11),
            'low' => imagecolorallocate($priorityImage, 34, 197, 94)
        ];
        $textColor = imagecolorallocate($priorityImage, 0, 0, 0);
        $axisColor = imagecolorallocate($priorityImage, 200, 200, 200);

        $maxValue = max(array_merge([1], array_values($priorityStats)));
        $barWidth = 50;
        $barSpacing = 25;
        $startX = 60;
        $chartHeight = 110;
        $baseY = 140;

        // Draw axis
        imageline($priorityImage, 45, $baseY, 300, $baseY, $axisColor);
        imageline($priorityImage, 45, 30, 45, $baseY, $axisColor);

        // Draw Y-axis labels
        if (file_exists($fontPath)) {
            for ($i = 0; $i <= $maxValue; $i++) {
                $y = $baseY - (($i / $maxValue) * $chartHeight);
                imagettftext($priorityImage, 10, 0, 25, $y + 4, $textColor, $fontPath, $i);
                imageline($priorityImage, 43, $y, 47, $y, $axisColor);
            }
        }

        $i = 0;
        foreach (['critical', 'high', 'medium', 'low'] as $priority) {
            $value = $priorityStats[$priority] ?? 0;
            $barHeight = $maxValue > 0 ? ($value / $maxValue) * $chartHeight : 0;
            $x = $startX + ($i * ($barWidth + $barSpacing));
            $y = $baseY - $barHeight;

            imagefilledrectangle($priorityImage, $x, $y, $x + $barWidth, $baseY, $priorityColors[$priority]);

            if (file_exists($fontPath)) {
                imagettftext($priorityImage, 12, 0, $x + 18, $y - 8, $textColor, $fontPath, $value);
            }
            $i++;
        }

        // Add legend on right side with space
        if (file_exists($fontPath)) {
            $legendX = 370;
            $legendY = 50;
            foreach (['critical', 'high', 'medium', 'low'] as $priority) {
                imagefilledrectangle($priorityImage, $legendX, $legendY, $legendX + 12, $legendY + 12, $priorityColors[$priority]);
                imagettftext($priorityImage, 11, 0, $legendX + 20, $legendY + 10, $textColor, $fontPath, ucfirst($priority));
                $legendY += 26;
            }
        }

        ob_start();
        imagepng($priorityImage);
        $priorityImageData = ob_get_clean();
        imagedestroy($priorityImage);
        $base64PriorityImage = base64_encode($priorityImageData);

        // Generate Task Status pie chart
        $statusStats = $stats['status_stats'] ?? [];
        $statusImage = imagecreatetruecolor(450, 220);
        imagesavealpha($statusImage, true);
        $statusTransparent = imagecolorallocatealpha($statusImage, 0, 0, 0, 127);
        imagefill($statusImage, 0, 0, $statusTransparent);

        $statusColorMap = [
            'To Do' => imagecolorallocate($statusImage, 107, 114, 128),
            'In Progress' => imagecolorallocate($statusImage, 59, 130, 246),
            'Review' => imagecolorallocate($statusImage, 168, 85, 247),
            'Done' => imagecolorallocate($statusImage, 34, 197, 94),
            'Blocked' => imagecolorallocate($statusImage, 239, 68, 68)
        ];
        $textColor = imagecolorallocate($statusImage, 0, 0, 0);
        $whiteColor = imagecolorallocate($statusImage, 255, 255, 255);

        $total = array_sum($statusStats);
        if ($total > 0) {
            $startAngle = 0;
            $centerX = 110;
            $centerY = 110;
            $radius = 85;

            foreach ($statusStats as $status => $count) {
                $angle = ($count / $total) * 360;
                $color = $statusColorMap[$status] ?? imagecolorallocate($statusImage, 150, 150, 150);
                imagefilledarc($statusImage, $centerX, $centerY, $radius * 2, $radius * 2, $startAngle, $startAngle + $angle, $color, IMG_ARC_PIE);

                // Add percentage on slice
                if ($angle > 10 && file_exists($fontPath)) {
                    $percentage = round(($count / $total) * 100);
                    $labelAngle = deg2rad($startAngle + ($angle / 2));
                    $labelX = $centerX + (cos($labelAngle) * $radius * 0.65);
                    $labelY = $centerY + (sin($labelAngle) * $radius * 0.65);
                    imagettftext($statusImage, 11, 0, $labelX - 12, $labelY + 5, $whiteColor, $fontPath, $percentage . '%');
                }

                $startAngle += $angle;
            }

            // Add legend on right side with space (status names only)
            if (file_exists($fontPath)) {
                $legendX = 250;
                $legendY = 40;
                foreach ($statusStats as $status => $count) {
                    $color = $statusColorMap[$status] ?? imagecolorallocate($statusImage, 150, 150, 150);

                    imagefilledellipse($statusImage, $legendX, $legendY, 12, 12, $color);
                    imagettftext($statusImage, 11, 0, $legendX + 20, $legendY + 5, $textColor, $fontPath, $status);
                    $legendY += 28;
                }
            }
        }

        ob_start();
        imagepng($statusImage);
        $statusImageData = ob_get_clean();
        imagedestroy($statusImage);
        $base64StatusImage = base64_encode($statusImageData);

        // Generate Hours Estimation bar chart
        $taskHoursData = $stats['task_hours_data'] ?? [];
        $totalLoggedHours = $stats['total_logged_hours'] ?? 0;
        $hoursImage = imagecreatetruecolor(750, 340);
        imagesavealpha($hoursImage, true);
        $hoursTransparent = imagecolorallocatealpha($hoursImage, 0, 0, 0, 127);
        imagefill($hoursImage, 0, 0, $hoursTransparent);

        $orangeColor = imagecolorallocate($hoursImage, 249, 115, 22);
        $textColor = imagecolorallocate($hoursImage, 0, 0, 0);
        $axisColor = imagecolorallocate($hoursImage, 200, 200, 200);

        if (count($taskHoursData) > 0) {
            $maxHours = max(array_merge([8], array_column($taskHoursData, 'logged_hours')));
            $barWidth = 90;
            $barSpacing = 50;
            $startX = 80;
            $chartHeight = 140;
            $baseY = 180;

            // Draw axis
            imageline($hoursImage, 60, $baseY, 720, $baseY, $axisColor);
            imageline($hoursImage, 60, 30, 60, $baseY, $axisColor);

            // Draw Y-axis labels (0, 2, 4, 6, 8...)
            if (file_exists($fontPath)) {
                $step = 2;
                for ($i = 0; $i <= $maxHours; $i += $step) {
                    $y = $baseY - (($i / $maxHours) * $chartHeight);
                    imagettftext($hoursImage, 10, 0, 38, $y + 4, $textColor, $fontPath, $i);
                    imageline($hoursImage, 58, $y, 62, $y, $axisColor);
                }
            }

            // Draw bars (limit to first 5 tasks)
            $displayTasks = array_slice($taskHoursData, 0, 5);
            foreach ($displayTasks as $index => $taskData) {
                $hours = $taskData['logged_hours'];
                $barHeight = $maxHours > 0 ? ($hours / $maxHours) * $chartHeight : 0;
                $x = $startX + ($index * ($barWidth + $barSpacing));
                $y = $baseY - $barHeight;

                imagefilledrectangle($hoursImage, $x, $y, $x + $barWidth, $baseY, $orangeColor);

                if (file_exists($fontPath) && $barHeight > 15) {
                    imagettftext($hoursImage, 11, 0, $x + 22, $y - 5, $textColor, $fontPath, $hours);
                }

                // Draw X-axis labels with line breaks
                if (file_exists($fontPath)) {
                    $taskName = $taskData['task_name'];
                    $words = explode(' ', $taskName);
                    $lines = [];
                    $currentLine = '';

                    foreach ($words as $word) {
                        $testLine = $currentLine === '' ? $word : $currentLine . ' ' . $word;
                        $bbox = imagettfbbox(9, 0, $fontPath, $testLine);
                        $testWidth = $bbox[2] - $bbox[0];

                        if ($testWidth > $barWidth + 30 && $currentLine !== '') {
                            $lines[] = $currentLine;
                            $currentLine = $word;
                        } else {
                            $currentLine = $testLine;
                        }
                    }
                    if ($currentLine !== '') {
                        $lines[] = $currentLine;
                    }

                    $lineHeight = 12;
                    $startY = $baseY + 18;
                    foreach ($lines as $lineIndex => $line) {
                        $bbox = imagettfbbox(9, 0, $fontPath, $line);
                        $textWidth = $bbox[2] - $bbox[0];
                        $yPos = $startY + ($lineIndex * $lineHeight);
                        imagettftext($hoursImage, 9, 0, $x + ($barWidth / 2) - ($textWidth / 2), $yPos, $textColor, $fontPath, $line);
                    }
                }
            }

            // Add legend and total hours at bottom
            if (file_exists($fontPath)) {
                $legendY = 300;
                imagefilledrectangle($hoursImage, 250, $legendY, 262, $legendY + 10, $orangeColor);
                imagettftext($hoursImage, 11, 0, 270, $legendY + 9, $textColor, $fontPath, 'Logged Hours');

                // Display total hours
                imagettftext($hoursImage, 11, 0, 480, $legendY + 9, $textColor, $fontPath, 'Total: ' . $totalLoggedHours . 'h');
            }
        }

        ob_start();
        imagepng($hoursImage);
        $hoursImageData = ob_get_clean();
        imagedestroy($hoursImage);
        $base64HoursImage = base64_encode($hoursImageData);

        $projectStatusColors = [
            'planning' => ['bg' => '#dbeafe', 'color' => '#1e40af'],
            'on_hold' => ['bg' => '#fef3c7', 'color' => '#92400e'],
            'in_progress' => ['bg' => '#fed7aa', 'color' => '#c2410c'],
            'completed' => ['bg' => '#dcfce7', 'color' => '#166534'],
            'cancelled' => ['bg' => '#fecaca', 'color' => '#dc2626']
        ];
        $statusStyle = $projectStatusColors[$project->status] ?? ['bg' => '#f3f4f6', 'color' => '#374151'];
        $projectStatusText = ucfirst(str_replace('_', ' ', $project->status));

        $html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Project Detail - ' . ($project->title ?? $project->name) . '</title><style>body{font-family:Arial,sans-serif;margin:20px;color:#333;background:#fff}.container{max-width:1200px;margin:0 auto}.header{text-align:center;margin-bottom:30px;padding-bottom:20px;border-bottom:1px solid #e5e7eb}.title{font-size:24px;font-weight:bold;color:#1f2937;margin-bottom:10px}.row{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px;margin-bottom:30px}.card{background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,0.1)}.card-title{font-size:16px;font-weight:bold;color:#1f2937;margin-bottom:15px}.overview-grid{display:table;width:100%}.overview-details{display:table-cell;vertical-align:top;width:60%}.overview-chart{display:table-cell;vertical-align:middle;text-align:right;width:40%}.overview-info-row{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:10px}.info-item{margin-bottom:15px}.info-label{font-size:12px;color:#6b7280;margin-bottom:4px}.info-value{font-weight:600;color:#374151}.progress-image{width:200px;height:200px;margin:0 auto;display:block}.milestone-progress{text-align:center}.milestone-number{font-size:32px;font-weight:bold;color:#22c55e;margin-bottom:5px}.milestone-label{font-size:16px;color:#22c55e;font-weight:500}.priority-chart{text-align:center}.table-container{background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:20px}table{width:100%;border-collapse:collapse}th{background:#f9fafb;padding:12px 8px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;border-bottom:1px solid #e5e7eb}td{padding:12px 8px;font-size:12px;color:#374151;border-bottom:1px solid #f3f4f6}.status-badge{padding:4px 8px;border-radius:4px;font-size:10px;font-weight:500}.status-pending{background:#fef3c7;color:#92400e}.status-active{background:#dcfce7;color:#166534}.priority-low{background:#dcfce7;color:#166534}.priority-medium{background:#fef3c7;color:#92400e}.priority-high{background:#fed7aa;color:#c2410c}.priority-critical{background:#fecaca;color:#dc2626}</style></head><body><div class="container"><div class="header"><div class="title">' . ($project->title ?? $project->name) . '</div><div style="color:#6b7280;font-size:14px;">Project Detail Report - ' . date('F j, Y') . '</div></div><div class="row"><div class="card" style="grid-column:span 4;"><div class="card-title">Overview</div><div class="overview-grid"><div class="overview-details"><div class="overview-info-row"><div><div class="info-item"><div class="info-label">Project Name:</div><div class="info-value">' . ($project->title ?? $project->name) . '</div></div><div class="info-item"><div class="info-label">Project Status:</div><div class="info-value"><span style="padding:4px 8px;border-radius:4px;font-size:10px;font-weight:500;background:' . $statusStyle['bg'] . ';color:' . $statusStyle['color'] . '">' . $projectStatusText . '</span></div></div><div class="info-item"><div class="info-label">Total Members:</div><div class="info-value">' . ($project->members->count() + $project->clients->count()) . '</div></div></div><div><div class="info-item"><div class="info-label">Start Date:</div><div class="info-value">' . ($project->start_date ? \Carbon\Carbon::parse($project->start_date)->format('M j, Y') : '-') . '</div></div><div class="info-item"><div class="info-label">Due Date:</div><div class="info-value">' . (($project->deadline ?? $project->end_date) ? \Carbon\Carbon::parse($project->deadline ?? $project->end_date)->format('M j, Y') : '-') . '</div></div></div></div></div><div class="overview-chart"><img src="data:image/png;base64,' . $base64Image . '" class="progress-image" alt="Progress Chart"/></div></div></div><div class="card" style="grid-column:span 3;"><div class="card-title">Milestone Progress</div><div class="milestone-progress"><img src="data:image/png;base64,' . $base64ArcImage . '" style="width:280px;height:auto;display:block;margin:0 auto;"/></div></div><div class="card" style="grid-column:span 3;"><div class="card-title">Task Priority</div><div class="priority-chart"><img src="data:image/png;base64,' . $base64PriorityImage . '" style="width:320px;height:auto;display:block;margin:0 auto;"/></div></div></div><div class="row"><div class="card" style="grid-column:span 3;"><div class="card-title">Task Status</div><div style="text-align:center;"><img src="data:image/png;base64,' . $base64StatusImage . '" style="width:320px;height:auto;display:block;margin:0 auto;"/></div></div><div class="card" style="grid-column:span 3;"><div class="card-title">Hours Estimation</div><div style="text-align:center;"><img src="data:image/png;base64,' . $base64HoursImage . '" style="width:600px;height:auto;display:block;margin:0 auto;"/></div></div></div>';

        $html .= '<div class="row">';
        if ($userStats && count($userStats) > 0) {
            $html .= '<div class="card" style="grid-column:span 6;"><div class="card-title">Users</div><div class="table-container"><table><thead><tr><th>NAME</th><th>ASSIGNED TASKS</th><th>DONE TASKS</th></tr></thead><tbody>';
            foreach ($userStats as $userStat) {
                $html .= '<tr><td>' . $userStat['name'] . '</td><td>' . $userStat['assigned_tasks'] . '</td><td>' . $userStat['done_tasks'] . '</td></tr>';
            }
            $html .= '</tbody></table></div></div>';
        }

        if ($project->milestones && $project->milestones->count() > 0) {
            $html .= '<div class="card" style="grid-column:span 6;"><div class="card-title">Milestones</div><div class="table-container"><table><thead><tr><th>NAME</th><th>PROGRESS</th><th>STATUS</th><th>DUE DATE</th></tr></thead><tbody>';
            foreach ($project->milestones as $milestone) {
                $progress = $milestone->progress ?? 0;
                $statusColors = ['completed' => '#dcfce7;color:#166534', 'in_progress' => '#fed7aa;color:#c2410c', 'pending' => '#fef3c7;color:#92400e'];
                $statusBg = $statusColors[$milestone->status] ?? '#f3f4f6;color:#374151';
                $statusText = ucfirst(str_replace('_', ' ', $milestone->status));
                $html .= '<tr><td>' . $milestone->title . '</td><td><div style="display:flex;align-items:center;gap:8px;"><div style="flex:1;background:#e5e7eb;height:8px;border-radius:4px;"><div style="width:' . $progress . '%;background:#22c55e;height:100%;border-radius:4px;"></div></div><span>' . $progress . '%</span></div></td><td><span style="padding:4px 8px;border-radius:4px;font-size:10px;font-weight:500;background:' . $statusBg . '">' . $statusText . '</span></td><td>' . ($milestone->due_date ? \Carbon\Carbon::parse($milestone->due_date)->format('M j, Y') : '-') . '</td></tr>';
            }
            $html .= '</tbody></table></div></div>';
        }
        $html .= '</div>';

        $html .= '<div class="table-container"><div style="padding:16px;background:#f9fafb;border-bottom:1px solid #e5e7eb;"><div style="font-size:16px;font-weight:bold;color:#1f2937;">Tasks</div></div><table><thead><tr><th>TASK NAME</th><th>MILESTONE</th><th>START DATE</th><th>DUE DATE</th><th>ASSIGNED TO</th><th>TOTAL LOGGED HOURS</th><th>PRIORITY</th><th>STATUS</th></tr></thead><tbody>';

        foreach ($tasks as $task) {
            $loggedHours = TimesheetEntry::where('task_id', $task->id)->sum('hours');
            $assignedUsers = collect();
            if ($task->assignedUser)
                $assignedUsers->push($task->assignedUser);
            if ($task->members)
                $assignedUsers = $assignedUsers->merge($task->members->pluck('user')->filter());
            $assignedUsers = $assignedUsers->unique('id');

            $priorityColors = ['critical' => '#fecaca;color:#dc2626', 'high' => '#fed7aa;color:#c2410c', 'medium' => '#fef3c7;color:#92400e', 'low' => '#dcfce7;color:#166534'];
            $priority = $task->priority ?? 'medium';
            $priorityBg = $priorityColors[$priority] ?? '#f3f4f6;color:#374151';

            $statusColors = ['To Do' => '#f3f4f6;color:#6b7280', 'In Progress' => '#dbeafe;color:#1e40af', 'Review' => '#e9d5ff;color:#7c3aed', 'Done' => '#dcfce7;color:#166534', 'Blocked' => '#fecaca;color:#dc2626'];
            $statusName = $task->taskStage ? $task->taskStage->name : 'To Do';
            $statusBg = $statusColors[$statusName] ?? '#f3f4f6;color:#374151';

            $html .= '<tr><td>' . $task->title . '</td><td>' . ($task->milestone ? $task->milestone->title : '-') . '</td><td>' . ($task->start_date ? \Carbon\Carbon::parse($task->start_date)->format('M j, Y') : '-') . '</td><td>' . (($task->due_date ?? $task->end_date) ? \Carbon\Carbon::parse($task->due_date ?? $task->end_date)->format('M j, Y') : '-') . '</td><td>' . ($assignedUsers->pluck('name')->join(', ') ?: '-') . '</td><td>' . round($loggedHours, 2) . 'h</td><td><span style="padding:4px 8px;border-radius:4px;font-size:10px;font-weight:500;background:' . $priorityBg . '">' . ucfirst($priority) . '</span></td><td><span style="padding:4px 8px;border-radius:4px;font-size:10px;font-weight:500;background:' . $statusBg . '">' . $statusName . '</span></td></tr>';
        }

        $html .= '</tbody></table></div></div></body></html>';

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadHTML($html);
        return $pdf->download('project_report_' . ($project->title ?: $project->name) . '_' . date('Y-m-d') . '.pdf');
    }

    private function calculateProjectStats($project)
    {
        $this->authorizePermission('project_report_view_any');

        $totalTasks = $project->tasks()->count();
        $completedTasks = $project->tasks()->where('progress', 100)->count();

        $totalMilestones = $project->milestones()->count();
        $completedMilestones = $project->milestones()->where('status', 'completed')->count();
        // Calculate logged hours from timesheet entries
        $totalLoggedHours = TimesheetEntry::whereIn('task_id', $project->tasks()->pluck('id'))->sum('hours');



        // Task priority distribution
        $priorityStats = $project->tasks()
            ->select('priority', DB::raw('count(*) as count'))
            ->groupBy('priority')
            ->pluck('count', 'priority')
            ->toArray();

        // Task status distribution
        $statusStats = $project->tasks()
            ->join('task_stages', 'tasks.task_stage_id', '=', 'task_stages.id')
            ->select('task_stages.name', DB::raw('count(*) as count'))
            ->groupBy('task_stages.name')
            ->pluck('count', 'name')
            ->toArray();

        // Get task-wise hours data for chart
        $taskHoursData = [];
        foreach ($project->tasks as $task) {
            $taskLogged = TimesheetEntry::where('task_id', $task->id)->sum('hours');

            $taskHoursData[] = [
                'task_name' => $task->title,
                'logged_hours' => round($taskLogged, 2)
            ];
        }

        $milestoneProgress = $totalMilestones > 0 ? ($completedMilestones / $totalMilestones) * 100 : 0;

        return [
            'total_tasks' => $totalTasks,
            'completed_tasks' => $completedTasks,
            'completion_percentage' => $project->progress ?? 0,
            'total_milestones' => $totalMilestones,
            'completed_milestones' => $completedMilestones,
            'milestone_completion_percentage' => round($milestoneProgress, 2),
            'total_logged_hours' => round($totalLoggedHours, 2),
            'priority_stats' => $priorityStats,
            'status_stats' => $statusStats,
            'task_hours_data' => $taskHoursData,
            'days_left' => $project->end_date ? \Carbon\Carbon::now()->diffInDays(\Carbon\Carbon::parse($project->end_date), false) : null,
        ];
    }

    private function getProjectChartData($project, $workspace)
    {
        $this->authorizePermission('project_report_view_any');

        // Get last 7 days of task updates
        $dates = collect();
        for ($i = 6; $i >= 0; $i--) {
            $dates->push(\Carbon\Carbon::now()->subDays($i)->format('Y-m-d'));
        }

        $stages = TaskStage::where('workspace_id', $workspace->id)->orderBy('order')->get();

        $chartData = [
            'labels' => $dates->map(function ($date) {
                return \Carbon\Carbon::parse($date)->format('M d');
            })->toArray(),
            'datasets' => [],
        ];

        foreach ($stages as $stage) {
            $data = $dates->map(function ($date) use ($project, $stage) {
                return Task::where('project_id', $project->id)
                    ->where('task_stage_id', $stage->id)
                    ->whereDate('updated_at', $date)
                    ->count();
            })->toArray();

            $chartData['datasets'][] = [
                'label' => $stage->name,
                'data' => $data,
                'backgroundColor' => $stage->color ?? '#3B82F6',
                'borderColor' => $stage->color ?? '#3B82F6',
            ];
        }

        return $chartData;
    }

    private function calculateUserStats($project)
    {
        $this->authorizePermission('project_report_view_any');

        $userStats = [];

        // Get all users who have tasks assigned in this project using assigned_to field
        $taskUsers = DB::table('tasks')
            ->join('users', 'tasks.assigned_to', '=', 'users.id')
            ->where('tasks.project_id', $project->id)
            ->whereNotNull('tasks.assigned_to')
            ->select('users.id', 'users.name')
            ->distinct()
            ->get();



        // Calculate stats for each user who has tasks assigned
        foreach ($taskUsers as $user) {
            $userId = $user->id;

            // Count assigned tasks
            $assignedTasks = DB::table('tasks')
                ->where('project_id', $project->id)
                ->where('assigned_to', $userId)
                ->count();

            // Count done tasks - check what stage ID is "Done"
            $doneStageId = DB::table('task_stages')
                ->where('workspace_id', $project->workspace_id)
                ->where('name', 'Done')
                ->value('id');

            $doneTasks = DB::table('tasks')
                ->where('project_id', $project->id)
                ->where('assigned_to', $userId)
                ->where('task_stage_id', $doneStageId)
                ->count();

            $userStats[] = [
                'name' => $user->name,
                'role' => 'member',
                'assigned_tasks' => $assignedTasks,
                'done_tasks' => $doneTasks
            ];
        }

        return $userStats;
    }
}