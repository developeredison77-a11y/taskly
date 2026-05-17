import React, { useState, useEffect } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import TaskModal from './TaskModal';
import TaskFormModal from '@/components/tasks/TaskFormModal';
import TaskPriority from '@/components/tasks/TaskPriority';
import TaskStageChanger from '@/components/tasks/TaskStageChanger';
import TaskAttachments from '@/components/tasks/TaskAttachments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Search, Filter, MoreHorizontal, Eye, Edit, Copy, Trash2, LayoutGrid, List, User as UserIcon, CheckSquare, Columns, AlertTriangle, FileText, Download } from 'lucide-react';
import { PageTemplate } from '@/components/page-template';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { Task, Project, TaskStage, User, PaginatedData } from '@/types';
import { toast } from '@/components/custom-toast';
import { CrudTable } from '@/components/CrudTable';
import { useTranslation } from 'react-i18next';

declare global {
    interface Window {
        searchTimeout: any;
    }
}

interface Props {
    tasks: PaginatedData<Task>;
    projects: Project[];
    stages: TaskStage[];
    members: User[];
    filters: {
        project_id?: string;
        stage_id?: string;
        priority?: string;
        assigned_to?: string;
        search?: string;
        view?: string;
        sort_field?: string;
        sort_direction?: 'asc' | 'desc';
    };
    project_name?: string;
    userWorkspaceRole?: string;
    permissions?: any;
    googleCalendarEnabled?: boolean;
}

export default function TasksIndex({ tasks, projects, stages, members, filters, project_name, userWorkspaceRole, permissions, googleCalendarEnabled }: Props) {
    const { t } = useTranslation();
    const { flash, permissions: pagePermissions } = usePage().props as any;
    const taskPermissions = permissions || pagePermissions;
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [selectedProject, setSelectedProject] = useState(filters.project_id || 'all');
    const [selectedStage, setSelectedStage] = useState(filters.stage_id || 'all');
    const [selectedPriority, setSelectedPriority] = useState(filters.priority || 'all');
    const [selectedAssignee, setSelectedAssignee] = useState(filters.assigned_to || 'all');
    const [showFilters, setShowFilters] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [selectedTaskWorkspaceRole, setSelectedTaskWorkspaceRole] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [viewMode, setViewMode] = useState<'card' | 'table' | 'kanban'>(filters.view || 'kanban');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
    const [isFilesModalOpen, setIsFilesModalOpen] = useState(false);
    const [filesTask, setFilesTask] = useState<any | null>(null);

    // Show flash messages
    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
    }, [flash]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const applyFilters = () => {
        const params: any = { page: 1 };

        if (searchTerm) params.search = searchTerm;
        if (selectedProject !== 'all') params.project_id = selectedProject;
        if (selectedStage !== 'all') params.stage_id = selectedStage;
        if (selectedPriority !== 'all') params.priority = selectedPriority;
        if (selectedAssignee !== 'all') params.assigned_to = selectedAssignee;
        params.view = viewMode;
        if (project_name) params.project_name = project_name;

        router.get(route('tasks.index'), params, { preserveState: true, preserveScroll: true });
    };

    const handleFilter = (key: string, value: string) => {
        const params: any = { page: 1 };
        if (searchTerm) params.search = searchTerm;
        if (key === 'project_id') setSelectedProject(value);
        if (key === 'stage_id') setSelectedStage(value);
        if (key === 'priority') setSelectedPriority(value);
        if (key === 'assigned_to') setSelectedAssignee(value);

        if (selectedProject !== 'all' && key !== 'project_id') params.project_id = selectedProject;
        if (selectedStage !== 'all' && key !== 'stage_id') params.stage_id = selectedStage;
        if (selectedPriority !== 'all' && key !== 'priority') params.priority = selectedPriority;
        if (selectedAssignee !== 'all' && key !== 'assigned_to') params.assigned_to = selectedAssignee;
        if (value !== 'all') params[key] = value;
        params.view = viewMode;
        if (project_name) params.project_name = project_name;

        router.get(route('tasks.index'), params, { preserveState: true, preserveScroll: true });
    };

    const handleAction = (action: string, taskOrId: Task | number) => {
        let taskId: number;

        if (typeof taskOrId === 'number') {
            // Called with task ID
            taskId = taskOrId;
        } else {
            // Called with task object from CrudTable
            taskId = taskOrId.id;
        }

        switch (action) {
            case 'view':
                handleViewTask(taskId);
                break;
            case 'edit':
                handleEditTask(taskId);
                break;
            case 'duplicate':
                toast.loading('Duplicating task...');
                router.post(route('tasks.duplicate', taskId), {}, {
                    onSuccess: () => {
                        toast.dismiss();
                    },
                    onError: () => {
                        toast.dismiss();
                        toast.error('Failed to duplicate task');
                    }
                });
                break;
            case 'files':
                handleViewTaskFiles(taskId);
                break;
            case 'delete':
                const task = (Array.isArray(tasks) ? tasks : tasks?.data || []).find(t => t.id === taskId);
                if (task) {
                    setTaskToDelete(task);
                    setIsDeleteModalOpen(true);
                }
                break;
        }
    };

    const handleViewTaskFiles = async (taskId: number) => {
        try {
            const response = await fetch(route('tasks.show', taskId));
            const data = await response.json();
            setFilesTask(data.task);
            setIsFilesModalOpen(true);
        } catch (error) {
            console.error('Failed to load task files:', error);
            toast.error('Failed to load task files');
        }
    };

    const handleViewTask = async (taskId: number) => {
        try {
            const response = await fetch(route('tasks.show', taskId));
            const data = await response.json();
            setSelectedTask(data.task);
            setSelectedTaskWorkspaceRole(data.workspace_role);
            setIsModalOpen(true);
        } catch (error) {
            console.error('Failed to load task:', error);
        }
    };

    const handleEditTask = async (taskId: number) => {
        try {
            const response = await fetch(route('tasks.show', taskId));
            const data = await response.json();

            const taskWithProject = {
                ...data.task,
                project: projects.find(p => p.id === data.task.project_id) || data.task.project
            };

            setEditingTask(taskWithProject);
            setIsFormModalOpen(true);
        } catch (error) {
            console.error('Failed to load task:', error);
        }
    };

    const hasActiveFilters = () => {
        return selectedProject !== 'all' || selectedStage !== 'all' || selectedPriority !== 'all' || selectedAssignee !== 'all' || searchTerm !== '';
    };

    const activeFilterCount = () => {
        return (selectedProject !== 'all' ? 1 : 0) + (selectedStage !== 'all' ? 1 : 0) + (selectedPriority !== 'all' ? 1 : 0) + (selectedAssignee !== 'all' ? 1 : 0) + (searchTerm ? 1 : 0);
    };

    const handleResetFilters = () => {
        setSelectedProject('all');
        setSelectedStage('all');
        setSelectedPriority('all');
        setSelectedAssignee('all');
        setSearchTerm('');
        setShowFilters(false);
        router.get(route('tasks.index'), { page: 1, view: viewMode }, { preserveState: true, preserveScroll: true });
    };

    const handleDeleteConfirm = () => {
        if (taskToDelete) {
            toast.loading('Deleting task...');
            router.delete(route('tasks.destroy', taskToDelete.id), {
                onSuccess: () => {
                    toast.dismiss();
                    setIsDeleteModalOpen(false);
                    setTaskToDelete(null);
                },
                onError: () => {
                    toast.dismiss();
                    toast.error('Failed to delete task');
                    setIsDeleteModalOpen(false);
                    setTaskToDelete(null);
                }
            });
        }
    };

    const isTaskOverdue = (endDate: string | null) => {
        if (!endDate) return false;
        const today = new Date();
        const dueDate = new Date(endDate);
        return dueDate < today;
    };

    const getPriorityColor = (priority: string) => {
        const colors = {
            low: 'bg-green-100 text-green-800',
            medium: 'bg-yellow-100 text-yellow-800',
            high: 'bg-orange-100 text-orange-800',
            critical: 'bg-red-100 text-red-800'
        };
        return colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800';
    };

    const pageActions = [];

    if (userWorkspaceRole !== 'client') {
        pageActions.push({
            label: t('Export'),
            icon: <Download className="h-4 w-4 mr-2" />,
            variant: 'outline',
            onClick: async () => {
                try {
                    const params = new URLSearchParams();
                    if (searchTerm) params.append('search', searchTerm);
                    if (selectedProject !== 'all') params.append('project_id', selectedProject);
                    if (selectedStage !== 'all') params.append('stage_id', selectedStage);
                    if (selectedPriority !== 'all') params.append('priority', selectedPriority);
                    if (selectedAssignee !== 'all') params.append('assigned_to', selectedAssignee);
                    if (project_name) params.append('project_name', project_name);

                    const response = await fetch(route('tasks.export', params));
                    if (!response.ok) throw new Error('Export failed');

                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `tasks_export_${new Date().toISOString().split('T')[0]}.xlsx`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                    toast.success(t('Export completed successfully'));
                } catch (error) {
                    toast.error(t('Export failed'));
                }
            }
        });
    }

    // Only show Create Task button for non-clients
    if (userWorkspaceRole !== 'client') {
        pageActions.push({
            label: t('Create Task'),
            icon: <Plus className="h-4 w-4 mr-2" />,
            variant: 'default',
            onClick: () => {
                setEditingTask(null);
                setIsFormModalOpen(true);
            }
        });
    }

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        ...(project_name ? [{ title: t('Projects'), href: route('projects.index') }] : []),
        { title: project_name ? `${project_name} - ${t('Tasks')}` : t('Tasks') }
    ];

    // Add sorting functionality
    const handleSort = (field: string) => {
        const direction = filters.sort_field === field && filters.sort_direction === 'asc' ? 'desc' : 'asc';

        const params: any = {
            sort_field: field,
            sort_direction: direction,
            page: 1
        };

        // Preserve existing filters
        if (searchTerm) params.search = searchTerm;
        if (selectedProject !== 'all') params.project_id = selectedProject;
        if (selectedStage !== 'all') params.stage_id = selectedStage;
        if (selectedPriority !== 'all') params.priority = selectedPriority;
        if (selectedAssignee !== 'all') params.assigned_to = selectedAssignee;
        params.view = viewMode;
        if (project_name) params.project_name = project_name;

        router.get(route('tasks.index'), params, { preserveState: true, preserveScroll: true });
    };

    // CrudTable configuration
    const columns = [
        {
            key: 'title',
            label: t('Task'),
            sortable: true,
            render: (value: string, row: any) => (
                <div>
                    <div
                        className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
                        onClick={() => handleAction('view', row.id)}
                    >
                        {value}
                    </div>
                    <div className="text-sm text-gray-500 truncate max-w-xs">{row.description}</div>
                </div>
            )
        },
        ...(project_name ? [] : [{
            key: 'project.title',
            label: t('Project'),
            render: (value: string) => value || '-'
        }]),
        {
            key: 'task_stage.name',
            label: t('Stage'),
            render: (value: string, row: any) => (
                <Badge
                    variant="outline"
                    style={{ backgroundColor: row.task_stage?.color + '20', borderColor: row.task_stage?.color }}
                >
                    {value}
                </Badge>
            )
        },
        {
            key: 'priority',
            label: t('Priority'),
            sortable: true,
            render: (value: string) => (
                <Badge className={getPriorityColor(value)} variant="outline">
                    {value}
                </Badge>
            )
        },
        {
            key: 'assigned_to',
            label: t('Assignee'),
            render: (value: any) => (
                value ? (
                    <div className="flex items-center">
                        <Avatar className="h-6 w-6 mr-2">
                            <AvatarImage src={value.avatar} />
                            <AvatarFallback className="text-xs">
                                {value.name?.charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{value.name}</span>
                    </div>
                ) : (
                    <span className="text-sm text-gray-400">{t('Unassigned')}</span>
                )
            )
        },
        {
            key: 'progress',
            label: t('Progress'),
            render: (value: number) => (
                <div className="flex items-center">
                    <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{width: `${value}%`}}></div>
                    </div>
                    <span className="text-sm text-gray-900">{value}%</span>
                </div>
            )
        },
        {
            key: 'end_date',
            label: t('Due Date'),
            sortable: true,
            render: (value: string, row: any) => (
                <div className="flex items-center gap-2">
                    {value && isTaskOverdue(value) && (
                        <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {t('Overdue')}
                        </Badge>
                    )}
                    <span>{value ? new Date(value).toLocaleDateString() : 'No due date'}</span>
                </div>
            )
        }
    ];

    const actions = [
        {
            label: t('Files'),
            icon: 'FileText',
            action: 'files',
            className: 'text-slate-500 hover:text-slate-700',
            condition: () => true
        },
        {
            label: t('View'),
            icon: 'Eye',
            action: 'view',
            className: 'text-blue-500 hover:text-blue-700',
            condition: () => true
        },
        {
            label: t('Edit'),
            icon: 'Edit',
            action: 'edit',
            className: 'text-amber-500 hover:text-amber-700',
            condition: () => userWorkspaceRole !== 'client'
        },
        {
            label: t('Duplicate'),
            icon: 'Copy',
            action: 'duplicate',
            className: 'text-green-500 hover:text-green-700',
            condition: () => userWorkspaceRole !== 'client'
        },
        {
            label: t('Delete'),
            icon: 'Trash2',
            action: 'delete',
            className: 'text-red-500 hover:text-red-700',
            condition: () => userWorkspaceRole !== 'client'
        }
    ];

    return (
        <PageTemplate
            title={project_name ? `${project_name} - ${t('Tasks')}` : t('Tasks')}
            url="/tasks"
            actions={pageActions}
            breadcrumbs={breadcrumbs}
            noPadding
        >
            <Head title={t('Tasks')} />

            {/* Overview Row */}
            <Card className="mb-4 hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                    <div className="grid grid-cols-5 gap-4">
                        <div className="text-center">
                            <div className="text-xl font-bold text-blue-600">
                                {Array.isArray(tasks) ? tasks.length : (tasks?.total || 0)}
                            </div>
                            <div className="text-xs text-gray-600">{t('Total Tasks')}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xl font-bold text-yellow-600">
                                {(Array.isArray(tasks) ? tasks : tasks?.data || []).filter(task => !task.assigned_to).length}
                            </div>
                            <div className="text-xs text-gray-600">{t('Unassigned')}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xl font-bold text-green-600">
                                {(Array.isArray(tasks) ? tasks : tasks?.data || []).filter(task => task.assigned_to).length}
                            </div>
                            <div className="text-xs text-gray-600">{t('Assigned')}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xl font-bold text-red-600">
                                {(Array.isArray(tasks) ? tasks : tasks?.data || []).filter(task => task.end_date && isTaskOverdue(task.end_date)).length}
                            </div>
                            <div className="text-xs text-gray-600">{t('Overdue')}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xl font-bold text-orange-600">
                                {(Array.isArray(tasks) ? tasks : tasks?.data || []).filter(task => task.priority === 'high' || task.priority === 'critical').length}
                            </div>
                            <div className="text-xs text-gray-600">{t('High Priority')}</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Filters Row */}
            <div className="bg-white rounded-lg shadow mb-4">
                <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <form onSubmit={handleSearch} className="flex gap-2">
                                <div className="relative w-64">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder={t('Search tasks...')}
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            clearTimeout(window.searchTimeout);
                                            window.searchTimeout = setTimeout(() => {
                                                const params: any = { page: 1 };
                                                if (e.target.value) params.search = e.target.value;
                                                if (selectedProject !== 'all') params.project_id = selectedProject;
                                                if (selectedStage !== 'all') params.stage_id = selectedStage;
                                                if (selectedPriority !== 'all') params.priority = selectedPriority;
                                                if (selectedAssignee !== 'all') params.assigned_to = selectedAssignee;
                                                params.view = viewMode;
                                                if (project_name) params.project_name = project_name;
                                                router.get(route('tasks.index'), params, { preserveState: true, preserveScroll: true });
                                            }, 500);
                                        }}
                                        className="w-full pl-9"
                                    />
                                </div>
                                <Button type="submit" size="sm">
                                    <Search className="h-4 w-4 mr-1.5" />
                                    {t('Search')}
                                </Button>
                            </form>

                            <Button
                                variant={hasActiveFilters() ? "default" : "outline"}
                                size="sm"
                                onClick={() => setShowFilters(!showFilters)}
                            >
                                <Filter className="h-4 w-4 mr-1.5" />
                                {showFilters ? t('Hide Filters') : t('Filters')}
                                {hasActiveFilters() && (
                                    <span className="ml-1 bg-primary-foreground text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs">
                                        {activeFilterCount()}
                                    </span>
                                )}
                            </Button>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 border rounded-md p-1">
                                <Button
                                    variant={viewMode === 'card' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => {
                                        setViewMode('card');
                                        const params: any = { page: 1, view: 'grid' };
                                        if (searchTerm) params.search = searchTerm;
                                        if (selectedProject !== 'all') params.project_id = selectedProject;
                                        if (selectedStage !== 'all') params.stage_id = selectedStage;
                                        if (selectedPriority !== 'all') params.priority = selectedPriority;
                                        if (selectedAssignee !== 'all') params.assigned_to = selectedAssignee;
                                        if (project_name) params.project_name = project_name;
                                        router.get(route('tasks.index'), params, { preserveState: true, preserveScroll: true });
                                    }}
                                    className="h-7 px-2"
                                >
                                    <LayoutGrid className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant={viewMode === 'table' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => {
                                        setViewMode('table');
                                        const params: any = { page: 1, view: 'list' };
                                        if (searchTerm) params.search = searchTerm;
                                        if (selectedProject !== 'all') params.project_id = selectedProject;
                                        if (selectedStage !== 'all') params.stage_id = selectedStage;
                                        if (selectedPriority !== 'all') params.priority = selectedPriority;
                                        if (selectedAssignee !== 'all') params.assigned_to = selectedAssignee;
                                        if (project_name) params.project_name = project_name;
                                        router.get(route('tasks.index'), params, { preserveState: true, preserveScroll: true });
                                    }}
                                    className="h-7 px-2"
                                >
                                    <List className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => {
                                        setViewMode('kanban');
                                        const params: any = { view: 'kanban' };
                                        if (searchTerm) params.search = searchTerm;
                                        if (selectedProject !== 'all') params.project_id = selectedProject;
                                        if (selectedStage !== 'all') params.stage_id = selectedStage;
                                        if (selectedPriority !== 'all') params.priority = selectedPriority;
                                        if (selectedAssignee !== 'all') params.assigned_to = selectedAssignee;
                                        if (project_name) params.project_name = project_name;
                                        router.get(route('tasks.index'), params, { preserveState: true, preserveScroll: true });
                                    }}
                                    className="h-7 px-2"
                                >
                                    <Columns className="h-4 w-4" />
                                </Button>
                            </div>
                            {viewMode !== 'kanban' && (
                                <>
                                    <Label className="text-xs text-muted-foreground">{t('Per Page')}:</Label>
                                    <Select
                                        value={tasks?.per_page?.toString() || "10"}
                                        onValueChange={(value) => {
                                            const params: any = { page: 1, per_page: parseInt(value) };
                                            if (searchTerm) params.search = searchTerm;
                                            if (selectedProject !== 'all') params.project_id = selectedProject;
                                            if (selectedStage !== 'all') params.stage_id = selectedStage;
                                            if (selectedPriority !== 'all') params.priority = selectedPriority;
                                            if (selectedAssignee !== 'all') params.assigned_to = selectedAssignee;
                                            params.view = viewMode;
                                            if (project_name) params.project_name = project_name;
                                            router.get(route('tasks.index'), params, { preserveState: true, preserveScroll: true });
                                        }}
                                    >
                                        <SelectTrigger className="w-16 h-8">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="10">10</SelectItem>
                                            <SelectItem value="25">25</SelectItem>
                                            <SelectItem value="50">50</SelectItem>
                                            <SelectItem value="100">100</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </>
                            )}
                        </div>
                    </div>

                    {showFilters && (
                        <div className="p-4 bg-gray-50 border rounded-md">
                            <div className="flex flex-wrap gap-4 items-end">
                                <div className="space-y-2">
                                    <Label>{t('Project')}</Label>
                                    <Select value={selectedProject} onValueChange={(value) => handleFilter('project_id', value)}>
                                        <SelectTrigger className="w-40">
                                            <SelectValue placeholder={t('All Projects')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('All Projects')}</SelectItem>
                                            {projects.map((project) => (
                                                <SelectItem key={project.id} value={project.id.toString()}>
                                                    {project.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>{t('Status')}</Label>
                                    <Select value={selectedStage} onValueChange={(value) => handleFilter('stage_id', value)}>
                                        <SelectTrigger className="w-40">
                                            <SelectValue placeholder="All Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('All')}</SelectItem>
                                            {stages.map((stage) => (
                                                <SelectItem key={stage.id} value={stage.id.toString()}>
                                                    {stage.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>{t('Priority')}</Label>
                                    <Select value={selectedPriority} onValueChange={(value) => handleFilter('priority', value)}>
                                        <SelectTrigger className="w-40">
                                            <SelectValue placeholder="All Priority" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('All Priority')}</SelectItem>
                                            <SelectItem value="low">{t('Low')}</SelectItem>
                                            <SelectItem value="medium">{t('Medium')}</SelectItem>
                                            <SelectItem value="high">{t('High')}</SelectItem>
                                            <SelectItem value="critical">{t('Critical')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>{t('Assignee')}</Label>
                                    <Select value={selectedAssignee} onValueChange={(value) => handleFilter('assigned_to', value)}>
                                        <SelectTrigger className="w-40">
                                            <SelectValue placeholder="All Assignees" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('All Assignees')}</SelectItem>
                                            {members.map((member) => (
                                                <SelectItem key={member.id} value={member.id.toString()}>
                                                    {member.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-9"
                                    onClick={handleResetFilters}
                                    disabled={!hasActiveFilters()}
                                >
                                    {t('Reset Filters')}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Tasks Content */}
            <div className="bg-white rounded-lg shadow">
                {viewMode === 'kanban' ? (
                    <div className="bg-gray-50 p-4 rounded-lg" style={{ height: 'calc(100vh - 220px)', overflow: 'hidden' }}>
                        <style>{`
                            .kanban-scroll::-webkit-scrollbar {
                                height: 8px;
                            }
                            .kanban-scroll::-webkit-scrollbar-track {
                                background: #f1f5f9;
                                border-radius: 4px;
                            }
                            .kanban-scroll::-webkit-scrollbar-thumb {
                                background: #cbd5e1;
                                border-radius: 4px;
                            }
                            .kanban-scroll::-webkit-scrollbar-thumb:hover {
                                background: #94a3b8;
                            }
                            .column-scroll::-webkit-scrollbar {
                                width: 6px;
                            }
                            .column-scroll::-webkit-scrollbar-track {
                                background: #f8fafc;
                                border-radius: 3px;
                            }
                            .column-scroll::-webkit-scrollbar-thumb {
                                background: #e2e8f0;
                                border-radius: 3px;
                            }
                            .column-scroll::-webkit-scrollbar-thumb:hover {
                                background: #cbd5e1;
                            }
                            main {
                                overflow: hidden;
                            }
                        `}</style>
                        <div className="flex gap-4 overflow-x-auto pb-4 kanban-scroll" style={{ height: '100%' }}>
                            {stages.map((stage) => {
                                const stageTasks = (Array.isArray(tasks) ? tasks : tasks?.data || []).filter(task => task.task_stage?.id === stage.id);
                                return (
                                    <div
                                        key={stage.id}
                                        className="flex-shrink-0"
                                        style={{ minWidth: '300px', width: '300px' }}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            e.currentTarget.classList.remove('bg-blue-50');
                                            const taskId = e.dataTransfer.getData('taskId');
                                            if (taskId) {
                                                toast.loading('Updating task stage...');
                                                router.put(route('tasks.change-stage', taskId), {
                                                    task_stage_id: stage.id
                                                }, {
                                                    onSuccess: () => {
                                                        toast.dismiss();
                                                    },
                                                    onError: () => {
                                                        toast.dismiss();
                                                        toast.error('Failed to update task stage');
                                                    }
                                                });
                                            }
                                        }}
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            e.currentTarget.classList.add('bg-blue-50');
                                        }}
                                        onDragLeave={(e) => {
                                            e.currentTarget.classList.remove('bg-blue-50');
                                        }}
                                    >
                                        <div className="bg-gray-100 rounded-lg h-full flex flex-col">
                                            <div className="p-3 border-b border-gray-200">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="font-semibold text-sm text-gray-700">{stage.name}</h3>
                                                    <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                                                        {stageTasks.length}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="p-2 space-y-2 overflow-y-auto flex-1 column-scroll">
                                                {stageTasks.map((task) => (
                                                    <div
                                                        key={task.id}
                                                        draggable
                                                        onDragStart={(e) => {
                                                            e.dataTransfer.setData('taskId', task.id.toString());
                                                            e.currentTarget.classList.add('opacity-50', 'scale-95');
                                                        }}
                                                        onDragEnd={(e) => {
                                                            e.currentTarget.classList.remove('opacity-50', 'scale-95');
                                                        }}
                                                        className="cursor-move transition-all duration-200"
                                                    >
                                                        <Card className="hover:shadow-md transition-all duration-200 border-l-4 hover:scale-105" style={{ borderLeftColor: stage.color }}>
                                                            <CardContent className="p-3">
                                                                <div className="space-y-2">
                                                                    <div className="flex items-start justify-between">
                                                                        <h4
                                                                            className="font-medium text-sm line-clamp-2 hover:text-blue-600 transition-colors cursor-pointer flex-1"
                                                                            onClick={() => handleAction('view', task.id)}
                                                                        >
                                                                            {task.title}
                                                                        </h4>
                                                                        <div className="flex gap-1">
                                                                            <Tooltip>
                                                                                <TooltipTrigger asChild>
                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="icon"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            handleAction('files', task.id);
                                                                                        }}
                                                                                        className="h-6 w-6 text-slate-500 hover:text-slate-700"
                                                                                    >
                                                                                        <FileText className="h-3 w-3" />
                                                                                    </Button>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent>{t('Files')}</TooltipContent>
                                                                            </Tooltip>
                                                                            <Tooltip>
                                                                                <TooltipTrigger asChild>
                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="icon"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            handleAction('view', task.id);
                                                                                        }}
                                                                                        className="h-6 w-6 text-blue-500 hover:text-blue-700"
                                                                                    >
                                                                                        <Eye className="h-3 w-3" />
                                                                                    </Button>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent>{t('View')}</TooltipContent>
                                                                            </Tooltip>
                                                                            {userWorkspaceRole !== 'client' && (
                                                                                <>
                                                                                    <Tooltip>
                                                                                        <TooltipTrigger asChild>
                                                                                            <Button
                                                                                                variant="ghost"
                                                                                                size="icon"
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    handleAction('edit', task.id);
                                                                                                }}
                                                                                                className="h-6 w-6 text-amber-500 hover:text-amber-700"
                                                                                            >
                                                                                                <Edit className="h-3 w-3" />
                                                                                            </Button>
                                                                                        </TooltipTrigger>
                                                                                        <TooltipContent>{t('Edit')}</TooltipContent>
                                                                                    </Tooltip>
                                                                                    <Tooltip>
                                                                                        <TooltipTrigger asChild>
                                                                                            <Button
                                                                                                variant="ghost"
                                                                                                size="icon"
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    handleAction('delete', task.id);
                                                                                                }}
                                                                                                className="h-6 w-6 text-red-500 hover:text-red-700"
                                                                                            >
                                                                                                <Trash2 className="h-3 w-3" />
                                                                                            </Button>
                                                                                        </TooltipTrigger>
                                                                                        <TooltipContent>{t('Delete')}</TooltipContent>
                                                                                    </Tooltip>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {task.description && (
                                                                        <p className="text-xs text-gray-600 line-clamp-2">{task.description}</p>
                                                                    )}

                                                                    <div className="flex items-center justify-between">
                                                                        <TaskPriority priority={task.priority} showIcon />
                                                                        {task.assigned_to && (
                                                                            <Avatar className="h-5 w-5">
                                                                                <AvatarImage src={task.assigned_to.avatar} />
                                                                                <AvatarFallback className="text-xs">
                                                                                    {task.assigned_to.name?.charAt(0)}
                                                                                </AvatarFallback>
                                                                            </Avatar>
                                                                        )}
                                                                    </div>

                                                                    <div className="space-y-1">
                                                                        <div className="flex justify-between text-xs">
                                                                            <span>{t('Progress')}</span>
                                                                            <span>{task.progress}%</span>
                                                                        </div>
                                                                        <Progress value={task.progress} className="h-1" />
                                                                    </div>

                                                                    <div className="flex justify-between items-center text-xs text-gray-500">
                                                                        {!project_name && (
                                                                            <span className="bg-gray-100 px-2 py-1 rounded text-xs">{task.project?.title}</span>
                                                                        )}
                                                                        <div className="flex items-center gap-2">
                                                                            {task.end_date && isTaskOverdue(task.end_date) && (
                                                                                <Badge variant="destructive" className="text-xs">
                                                                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                                                                    Overdue
                                                                                </Badge>
                                                                            )}
                                                                            <span>{task.end_date ? new Date(task.end_date).toLocaleDateString() : t('No due date')}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    </div>
                                                ))}
                                                {stageTasks.length === 0 && (
                                                    <div className="text-center py-8 text-gray-400">
                                                        <CheckSquare className="h-8 w-8 mx-auto mb-2" />
                                                        <p className="text-sm">{t('No tasks')}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : viewMode === 'card' ? (
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {tasks?.data?.map((task: Task) => (
                                <Card key={`card-${task.id}`} className="overflow-hidden hover:shadow-md transition-shadow">
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start">
                                            <CardTitle
                                                className="text-base line-clamp-1 cursor-pointer hover:text-blue-600 transition-colors"
                                                onClick={() => handleAction('view', task.id)}
                                            >
                                                {task.title}
                                            </CardTitle>
                                            <div className="flex gap-1">
                                                <TaskStageChanger
                                                    task={task}
                                                    stages={stages}
                                                    variant="badge"
                                                />
                                            </div>
                                        </div>
                                        <p className="text-sm text-muted-foreground line-clamp-2">{task.description || t('No description')}</p>
                                    </CardHeader>

                                    <CardContent className="py-2">
                                        <div className="space-y-3">
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-xs">
                                                    <span>{t('Progress')}</span>
                                                    <span>{task.progress}%</span>
                                                </div>
                                                <Progress value={task.progress} className="h-1" />
                                            </div>

                                            <div className="flex justify-between items-center text-xs">
                                                <TaskPriority priority={task.priority} showIcon />
                                                <div className="flex items-center gap-2">
                                                    {task.end_date && isTaskOverdue(task.end_date) && (
                                                        <Badge variant="destructive" className="text-xs">
                                                            <AlertTriangle className="h-3 w-3 mr-1" />
                                                            {t('Overdue')}
                                                        </Badge>
                                                    )}
                                                    <span className="text-muted-foreground">
                                                        {task.end_date ? new Date(task.end_date).toLocaleDateString() : 'No due date'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-2">
                                                    {task.assigned_to ? (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Avatar className="h-6 w-6 cursor-pointer">
                                                                    <AvatarImage src={task.assigned_to.avatar} />
                                                                    <AvatarFallback className="text-xs">
                                                                        {task.assigned_to.name?.charAt(0)}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                {task.assigned_to.name}
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    ) : (
                                                        <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center">
                                                            <UserIcon className="h-3 w-3 text-gray-400" />
                                                        </div>
                                                    )}
                                                </div>

                                                {!project_name && (
                                                    <div className="text-xs text-muted-foreground">
                                                        {task.project?.title}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>

                                    <CardFooter className="flex justify-end gap-1 pt-0 pb-2">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleAction('files', task.id)}
                                                    className="text-slate-500 hover:text-slate-700 h-8 w-8"
                                                >
                                                    <FileText className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>{t('Files')}</TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleAction('view', task.id)}
                                                    className="text-blue-500 hover:text-blue-700 h-8 w-8"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>View</TooltipContent>
                                        </Tooltip>
                                        {userWorkspaceRole !== 'client' && (
                                            <>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleAction('edit', task.id)}
                                                            className="text-amber-500 hover:text-amber-700 h-8 w-8"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>{t('Edit')}</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleAction('duplicate', task.id)}
                                                            className="text-green-500 hover:text-green-700 h-8 w-8"
                                                        >
                                                            <Copy className="h-4 w-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>{t('Duplicate')}</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleAction('delete', task.id)}
                                                            className="text-red-500 hover:text-red-700 h-8 w-8"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>{t('Delete')}</TooltipContent>
                                                </Tooltip>
                                            </>
                                        )}
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    </div>
                ) : (
                    <CrudTable
                        columns={columns}
                        actions={actions}
                        data={tasks?.data || []}
                        from={tasks?.from || 1}
                        onAction={handleAction}
                        sortField={filters.sort_field}
                        sortDirection={filters.sort_direction}
                        onSort={handleSort}
                        permissions={[]}
                    />
                )}
            </div>

            {/* Empty State */}
            {tasks?.data?.length === 0 && (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                    <CheckSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-semibold mb-2">{t('No Tasks Found')}</h3>
                    <p className="text-gray-500 mb-4">
                        {hasActiveFilters() ? t('No tasks match your current filters.') : t('No tasks have been created yet.')}
                    </p>
                    {hasActiveFilters() ? (
                        <Button variant="outline" onClick={handleResetFilters}>
                            {t('Clear Filters')}
                        </Button>
                    ) : (
                        <Button onClick={() => {
                            setEditingTask(null);
                            setIsFormModalOpen(true);
                        }}>
                            <Plus className="h-4 w-4 mr-2" />
                            {t('Create your first task')}
                        </Button>
                    )}
                </div>
            )}

            {/* Pagination - Hidden in Kanban view */}
            {tasks?.links && viewMode !== 'kanban' && !Array.isArray(tasks) && (
                <div className="mt-6 bg-white p-4 rounded-lg shadow flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        {t('Showing')} <span className="font-medium">{tasks?.from || 0}</span> {t('to')} <span className="font-medium">{tasks?.to || 0}</span> {t('of')} <span className="font-medium">{tasks?.total || 0}</span> {t('tasks')}
                    </div>

                    <div className="flex gap-1">
                        {tasks?.links?.map((link: any, i: number) => {
                            const isTextLink = link.label === "&laquo; Previous" || link.label === "Next &raquo;";
                            const label = link.label.replace("&laquo; ", "").replace(" &raquo;", "");

                            return (
                                <Button
                                    key={i}
                                    variant={link.active ? 'default' : 'outline'}
                                    size={isTextLink ? "sm" : "icon"}
                                    className={isTextLink ? "px-3" : "h-8 w-8"}
                                    disabled={!link.url}
                                    onClick={() => link.url && router.get(link.url)}
                                >
                                    {isTextLink ? label : <span dangerouslySetInnerHTML={{ __html: link.label }} />}
                                </Button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Modals */}
            {selectedTask && (
                <TaskModal
                    task={selectedTask}
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false);
                        setSelectedTask(null);
                    }}
                    members={members}
                    stages={stages}
                    milestones={selectedTask.project?.milestones || []}
                    permissions={taskPermissions}
                    workspaceRole={selectedTaskWorkspaceRole}
                />
            )}

            <TaskFormModal
                isOpen={isFormModalOpen}
                onClose={() => {
                    setIsFormModalOpen(false);
                    setEditingTask(null);
                }}
                task={editingTask || undefined}
                projects={projects}
                members={members}
                milestones={editingTask?.project?.milestones || []}
                googleCalendarEnabled={googleCalendarEnabled}
            />

            {/* Delete Modal */}
            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setTaskToDelete(null);
                }}
                onConfirm={handleDeleteConfirm}
                itemName={taskToDelete?.title || ''}
                entityName={t('task')}
            />

            <Dialog open={isFilesModalOpen} onOpenChange={(open) => {
                setIsFilesModalOpen(open);
                if (!open) setFilesTask(null);
            }}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{t('Files')} {filesTask?.title ? `- ${filesTask.title}` : ''}</DialogTitle>
                    </DialogHeader>

                    {filesTask?.attachments?.length > 0 ? (
                        <TaskAttachments
                            task={filesTask}
                            attachments={filesTask.attachments}
                            canAddAttachments={false}
                            canManageAttachments={false}
                        />
                    ) : (
                        <div className="py-10 text-center text-sm text-gray-500">{t('No files available')}</div>
                    )}
                </DialogContent>
            </Dialog>
        </PageTemplate>
    );
}
