<?php

namespace App\Http\Controllers;

use App\Models\NotificationTemplate;
use Illuminate\Http\Request;
use Inertia\Inertia;

class NotificationTemplateController extends Controller
{
    public function index(Request $request)
    {
        $query = NotificationTemplate::with(['notificationTemplateLangs' => function ($query) {
            $query->where('created_by', createdBy());
        }])->whereHas('notificationTemplateLangs', function ($query) {
            $query->where('created_by', createdBy());
        });
        
        // Filter by type (slack/telegram)
        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }
        
        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }
        
        $sortField = $request->get('sort_field', 'created_at');
        $sortDirection = $request->get('sort_direction', 'desc');
        $query->orderBy($sortField, $sortDirection);
        
        $perPage = $request->get('per_page', 10);
        $templates = $query->paginate($perPage);
        
        return Inertia::render('notification-templates/index', [
            'templates' => $templates,
            'filters' => $request->only(['search', 'type', 'sort_field', 'sort_direction', 'per_page'])
        ]);
    }

    public function show(NotificationTemplate $notificationTemplate)
    {
        // Load company-specific content
        $template = $notificationTemplate->load(['notificationTemplateLangs' => function ($query) {
            $query->where('created_by', createdBy());
        }]);
        $languages = json_decode(file_get_contents(resource_path('lang/language.json')), true);
        
        $variables = $this->getVariablesByNameAndType($template->name, $template->type);

        return Inertia::render('notification-templates/show', [
            'template' => $template,
            'languages' => $languages,
            'variables' => $variables
        ]);
    }

    public function updateSettings(NotificationTemplate $notificationTemplate, Request $request)
    {
        try {
            $request->validate([
                'type' => 'required|string|max:255'
            ]);

            $notificationTemplate->update([
                'type' => $request->type
            ]);
            
            return redirect()->back()->with('success', __('Template settings updated successfully.'));
        } catch (\Exception $e) {
            return redirect()->back()->with('error', __('Failed to update template settings: :error', ['error' => $e->getMessage()]));
        }
    }

    public function updateContent(NotificationTemplate $notificationTemplate, Request $request)
    {
        try {
            $request->validate([
                'lang' => 'required|string|max:10',
                'title' => 'required|string|max:255',
                'content' => 'required|string'
            ]);

            $notificationTemplate->notificationTemplateLangs()
                ->where('lang', $request->lang)
                ->where('created_by', createdBy())
                ->update([
                    'title' => $request->title,
                    'content' => $request->content
                ]);
            
            return redirect()->back()->with('success', __('Notification content updated successfully.'));
        } catch (\Exception $e) {
            return redirect()->back()->with('error', __('Failed to update notification content: :error', ['error' => $e->getMessage()]));
        }
    }

    private function getVariablesByNameAndType($name, $type)
    {
        $key = $name . '_' . $type;

        switch ($key) {
            case 'New Project_slack':
                return [
                    '{project_name}' => 'Project Name',
                    '{created_by}' => 'Created By User',
                    '{start_date}' => 'Start Date',
                    '{end_date}' => 'End Date'
                ];
            case 'New Project_telegram':
                return [
                    '{project_name}' => 'Project Name',
                    '{created_by}' => 'Created By User',
                    '{start_date}' => 'Start Date',
                    '{end_date}' => 'End Date'
                ];
            case 'New Task_slack':
                return [
                    '{task_title}' => 'Task Title',
                    '{project_name}' => 'Project Name',
                    '{due_date}' => 'Due Date'
                ];
            case 'New Task_telegram':
                return [
                    '{task_title}' => 'Task Title',
                    '{project_name}' => 'Project Name',
                    '{due_date}' => 'Due Date'
                ];
            case 'Task Stage Updated_slack':
                return [
                    '{task_title}' => 'Task Title',
                    '{old_stage}' => 'Old Stage',
                    '{new_stage}' => 'New Stage',
                    '{updated_by}' => 'Updated By User'
                ];
            case 'Task Stage Updated_telegram':
                return [
                    '{task_title}' => 'Task Title',
                    '{old_stage}' => 'Old Stage',
                    '{new_stage}' => 'New Stage',
                    '{updated_by}' => 'Updated By User'
                ];
            case 'New Invoice_slack':
                return [
                    '{invoice_number}' => 'Invoice Number',
                    '{client_name}' => 'Client Name',
                    '{amount}' => 'Invoice Amount',
                    '{due_date}' => 'Due Date'
                ];
            case 'New Invoice_telegram':
                return [
                    '{invoice_number}' => 'Invoice Number',
                    '{client_name}' => 'Client Name',
                    '{amount}' => 'Invoice Amount',
                    '{due_date}' => 'Due Date'
                ];

            case 'New Milestone_slack':
                return [
                    '{milestone_title}' => 'Milestone Title',
                    '{project_name}' => 'Project Name',
                    '{due_date}' => 'Due Date'
                ];
            case 'New Milestone_telegram':
                return [
                    '{milestone_title}' => 'Milestone Title',
                    '{project_name}' => 'Project Name',
                    '{due_date}' => 'Due Date'
                ];
            case 'Milestone Status Updated_slack':
                return [
                    '{milestone_title}' => 'Milestone Title',
                    '{status}' => 'Status',
                    '{updated_by}' => 'Updated By User'
                ];
            case 'Milestone Status Updated_telegram':
                return [
                    '{milestone_title}' => 'Milestone Title',
                    '{status}' => 'Status',
                    '{updated_by}' => 'Updated By User'
                ];
            case 'New Task Comment_slack':
                return [
                    '{task_title}' => 'Task Title',
                    '{commenter_name}' => 'Commenter Name',
                    '{comment_text}' => 'Comment Text'
                ];
            case 'New Task Comment_telegram':
                return [
                    '{task_title}' => 'Task Title',
                    '{commenter_name}' => 'Commenter Name',
                    '{comment_text}' => 'Comment Text'
                ];
            case 'Invoice Status Updated_slack':
                return [
                    '{invoice_number}' => 'Invoice Number',
                    '{status}' => 'Status',
                    '{updated_by}' => 'Updated By User'
                ];
            case 'Invoice Status Updated_telegram':
                return [
                    '{invoice_number}' => 'Invoice Number',
                    '{status}' => 'Status',
                    '{updated_by}' => 'Updated By User'
                ];
            case 'Expense Approval_slack':
                return [
                    '{expense_title}' => 'Expense Title',
                    '{expense_amount}' => 'Expense Amount',
                    '{submitted_by}' => 'Submitted By User',
                    '{project_name}' => 'Project Name'
                ];
            case 'Expense Approval_telegram':
                return [
                    '{expense_title}' => 'Expense Title',
                    '{expense_amount}' => 'Expense Amount',
                    '{submitted_by}' => 'Submitted By User',
                    '{project_name}' => 'Project Name'
                ];
            case 'New Budget_slack':
                return [
                    '{project_name}' => 'Project Name',
                    '{total_budget}' => 'Total Budget',
                    '{period_type}' => 'Period Type'
                ];
            case 'New Budget_telegram':
                return [
                    '{project_name}' => 'Project Name',
                    '{total_budget}' => 'Total Budget',
                    '{period_type}' => 'Period Type'
                ];
            default:
                return $this->getDefaultVariablesByName($name);
        }
    }

    private function getDefaultVariablesByName($name)
    {
        switch ($name) {
            case 'New Project':
                return [
                    '{project_name}' => 'Project Name',
                    '{created_by}' => 'Created By User',
                    '{start_date}' => 'Start Date',
                    '{end_date}' => 'End Date'
                ];
            case 'New Task':
                return [
                    '{task_title}' => 'Task Title',
                    '{project_name}' => 'Project Name',
                    '{due_date}' => 'Due Date'
                ];

            case 'Task Stage Updated':
                return [
                    '{task_title}' => 'Task Title',
                    '{old_stage}' => 'Old Stage',
                    '{new_stage}' => 'New Stage',
                    '{updated_by}' => 'Updated By User'
                ];
            case 'New Milestone':
                return [
                    '{milestone_title}' => 'Milestone Title',
                    '{project_name}' => 'Project Name',
                    '{due_date}' => 'Due Date'
                ];
            case 'Milestone Status Updated':
                return [
                    '{milestone_title}' => 'Milestone Title',
                    '{status}' => 'Status',
                    '{updated_by}' => 'Updated By User'
                ];
            case 'New Task Comment':
                return [
                    '{task_title}' => 'Task Title',
                    '{commenter_name}' => 'Commenter Name',
                    '{comment_text}' => 'Comment Text'
                ];
            case 'New Invoice':
                return [
                    '{invoice_number}' => 'Invoice Number',
                    '{client_name}' => 'Client Name',
                    '{amount}' => 'Invoice Amount',
                    '{due_date}' => 'Due Date'
                ];
            case 'Invoice Status Updated':
                return [
                    '{invoice_number}' => 'Invoice Number',
                    '{status}' => 'Status',
                    '{updated_by}' => 'Updated By User'
                ];
            case 'Expense Approval':
                return [
                    '{expense_title}' => 'Expense Title',
                    '{expense_amount}' => 'Expense Amount',
                    '{submitted_by}' => 'Submitted By User',
                    '{project_name}' => 'Project Name'
                ];
            case 'New Budget':
                return [
                    '{project_name}' => 'Project Name',
                    '{total_budget}' => 'Total Budget',
                    '{period_type}' => 'Period Type'
                ];
            default:
                return [];
        }
    }
}