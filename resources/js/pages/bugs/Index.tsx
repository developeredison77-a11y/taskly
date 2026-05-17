import React, { useState, useEffect } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { toast } from '@/components/custom-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Bug, Filter, Search, LayoutGrid, List, AlertTriangle, Zap, Eye, Edit, Trash2, Columns3, User, GripVertical, MessageSquare, Paperclip, Copy, FileText } from 'lucide-react';
import { PageTemplate } from '@/components/page-template';
import { BugModal } from './BugModal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { hasPermission } from '@/utils/authorization';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { CrudTable } from '@/components/CrudTable';
import TaskAttachments from '@/components/tasks/TaskAttachments';
import { useTranslation } from 'react-i18next';

interface Bug {
    id: number;
    title: string;
    description?: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    severity: 'minor' | 'major' | 'critical' | 'blocker';
    project: { id: number; name: string };
    bug_status: { id: number; name: string; color: string };
    assigned_to?: { id: number; name: string };
    reported_by: { id: number; name: string };
    created_at: string;
}

interface Props {
    bugs: { data: Bug[]; total: number; from: number; to: number; links: any[] } | Bug[];
    projects: Array<{ id: number; name: string }>;
    statuses: Array<{ id: number; name: string; color: string }>;
    members: Array<{ id: number; name: string }>;
    filters: {
        project_id?: string;
        status_id?: string;
        priority?: string;
        severity?: string;
        assigned_to?: string;
        search?: string;
        per_page?: number;
        view?: string;
        sort_field?: string;
        sort_direction?: 'asc' | 'desc';
    };
    userWorkspaceRole: string;
    project_name?: string;
    permissions?: any;
}

export default function Index({ bugs, projects, statuses, members, filters, userWorkspaceRole, project_name, permissions }: Props) {
    const { t } = useTranslation();
    const { flash, permissions: pagePermissions } = usePage().props as any;
    const bugPermissions = permissions || pagePermissions;
    
    const formatText = (text: string) => {
        if (!text) return '';
        return text.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
    };

    // State declarations first
    const [activeView, setActiveView] = useState(filters.view || 'kanban');
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [selectedProject, setSelectedProject] = useState(filters.project_id || 'all');
    const [selectedStatus, setSelectedStatus] = useState(filters.status_id || 'all');
    const [selectedPriority, setSelectedPriority] = useState(filters.priority || 'all');
    const [selectedSeverity, setSelectedSeverity] = useState(filters.severity || 'all');
    const [showFilters, setShowFilters] = useState(false);
    const [showBugModal, setShowBugModal] = useState(false);
    const [selectedBug, setSelectedBug] = useState<Bug | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [bugToDelete, setBugToDelete] = useState<Bug | null>(null);
    const [isFilesModalOpen, setIsFilesModalOpen] = useState(false);
    const [filesBug, setFilesBug] = useState<any | null>(null);

    // Show flash messages
    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
    }, [flash]);

    const bugsData = Array.isArray(bugs) ? bugs : bugs.data;

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };
    
    const applyFilters = () => {
        const params: any = { page: 1 };
        
        if (searchTerm) params.search = searchTerm;
        if (selectedProject !== 'all') params.project_id = selectedProject;
        if (selectedStatus !== 'all') params.status_id = selectedStatus;
        if (selectedPriority !== 'all') params.priority = selectedPriority;
        if (selectedSeverity !== 'all') params.severity = selectedSeverity;
        // Only include per_page for non-kanban views
        if (activeView !== 'kanban' && filters.per_page) params.per_page = filters.per_page;
        params.view = activeView;
        if (project_name) params.project_name = project_name;
        
        router.get(route('bugs.index'), params, { preserveState: false, preserveScroll: false });
    };
    
    // Apply filters when view changes
    useEffect(() => {
        if (activeView !== (filters.view || 'kanban')) {
            applyFilters();
        }
    }, [activeView]);
    
    const hasActiveFilters = () => {
        return selectedProject !== 'all' || selectedStatus !== 'all' || selectedPriority !== 'all' || selectedSeverity !== 'all' || searchTerm !== '';
    };
    
    const activeFilterCount = () => {
        return (selectedProject !== 'all' ? 1 : 0) + (selectedStatus !== 'all' ? 1 : 0) + (selectedPriority !== 'all' ? 1 : 0) + (selectedSeverity !== 'all' ? 1 : 0) + (searchTerm ? 1 : 0);
    };
    
    const handleResetFilters = () => {
        setSelectedProject('all');
        setSelectedStatus('all');
        setSelectedPriority('all');
        setSelectedSeverity('all');
        setSearchTerm('');
        setShowFilters(false);
        const params: any = { page: 1, view: activeView };
        // Only include per_page for non-kanban views
        if (activeView !== 'kanban' && filters.per_page) params.per_page = filters.per_page;
        if (project_name) params.project_name = project_name;
        router.get(route('bugs.index'), params, { preserveState: false, preserveScroll: false });
    };

    const getPriorityColor = (priority: string) => {
        const colors = {
            low: 'bg-blue-100 text-blue-800',
            medium: 'bg-yellow-100 text-yellow-800',
            high: 'bg-orange-100 text-orange-800',
            critical: 'bg-red-100 text-red-800'
        };
        return colors[priority as keyof typeof colors] || colors.medium;
    };

    const getSeverityColor = (severity: string) => {
        const colors = {
            minor: 'bg-green-100 text-green-800',
            major: 'bg-yellow-100 text-yellow-800',
            critical: 'bg-orange-100 text-orange-800',
            blocker: 'bg-red-100 text-red-800'
        };
        return colors[severity as keyof typeof colors] || colors.major;
    };

    const openBugModal = (bug?: Bug) => {
        setSelectedBug(bug || null);
        setShowBugModal(true);
    };

    const handleDeleteBug = (bug: Bug) => {
        setBugToDelete(bug);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteConfirm = () => {
        if (bugToDelete) {
            toast.loading('Deleting bug...');
            router.delete(route('bugs.destroy', bugToDelete.id), {
                onSuccess: () => {
                    toast.dismiss();
                    setIsDeleteModalOpen(false);
                    setBugToDelete(null);
                },
                onError: () => {
                    toast.dismiss();
                    toast.error('Failed to delete bug');
                    setIsDeleteModalOpen(false);
                    setBugToDelete(null);
                }
            });
        }
    };

    const handleViewBugFiles = async (bugId: number) => {
        try {
            const response = await fetch(route('bugs.show', bugId));
            const data = await response.json();
            setFilesBug(data.bug);
            setIsFilesModalOpen(true);
        } catch (error) {
            console.error('Failed to load bug files:', error);
            toast.error('Failed to load bug files');
        }
    };

    const handleAssignBug = (bugId: number, assigneeId: string) => {
        const assignedUserId = assigneeId === 'unassigned' ? null : parseInt(assigneeId);
        const bug = bugsData?.find((b: any) => b.id === bugId);
        if (bug) {
            router.put(route('bugs.update', bugId), {
                title: bug.title,
                description: bug.description || '',
                priority: bug.priority,
                severity: bug.severity,
                assigned_to: assignedUserId
            });
        }
    };

    const handleStatusChange = (bugId: number, statusId: number) => {
        toast.loading('Updating bug status...');
        router.put(route('bugs.change-status', bugId), {
            bug_status_id: statusId
        }, {
            onSuccess: () => {
                toast.dismiss();
            },
            onError: () => {
                toast.dismiss();
                toast.error('Failed to update bug status');
            }
        });
    };

    const pageActions = [];
    
    if (bugPermissions?.create) {
        pageActions.push({
            label: t('Report Bug'),
            icon: <Plus className="h-4 w-4 mr-2" />,
            variant: 'default' as const,
            onClick: () => openBugModal()
        });
    }

    const breadcrumbs = project_name ? [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Projects'), href: route('projects.index') },
        { title: project_name },
        { title: t('Bugs') }
    ] : [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Bugs') }
    ];

    const handleProjectFilter = (value: string) => {
        setSelectedProject(value);
        const params: any = { page: 1 };
        if (searchTerm) params.search = searchTerm;
        if (value !== 'all') params.project_id = value;
        if (selectedStatus !== 'all') params.status_id = selectedStatus;
        if (selectedPriority !== 'all') params.priority = selectedPriority;
        if (selectedSeverity !== 'all') params.severity = selectedSeverity;
        if (activeView !== 'kanban' && filters.per_page) params.per_page = filters.per_page;
        if (filters.sort_field) params.sort_field = filters.sort_field;
        if (filters.sort_direction) params.sort_direction = filters.sort_direction;
        params.view = activeView;
        if (project_name) params.project_name = project_name;
        router.get(route('bugs.index'), params, { preserveState: false, preserveScroll: false });
    };
    
    const handleStatusFilter = (value: string) => {
        setSelectedStatus(value);
        const params: any = { page: 1 };
        if (searchTerm) params.search = searchTerm;
        if (selectedProject !== 'all') params.project_id = selectedProject;
        if (value !== 'all') params.status_id = value;
        if (selectedPriority !== 'all') params.priority = selectedPriority;
        if (selectedSeverity !== 'all') params.severity = selectedSeverity;
        if (activeView !== 'kanban' && filters.per_page) params.per_page = filters.per_page;
        if (filters.sort_field) params.sort_field = filters.sort_field;
        if (filters.sort_direction) params.sort_direction = filters.sort_direction;
        params.view = activeView;
        if (project_name) params.project_name = project_name;
        router.get(route('bugs.index'), params, { preserveState: false, preserveScroll: false });
    };
    
    const handlePriorityFilter = (value: string) => {
        setSelectedPriority(value);
        const params: any = { page: 1 };
        if (searchTerm) params.search = searchTerm;
        if (selectedProject !== 'all') params.project_id = selectedProject;
        if (selectedStatus !== 'all') params.status_id = selectedStatus;
        if (value !== 'all') params.priority = value;
        if (selectedSeverity !== 'all') params.severity = selectedSeverity;
        if (activeView !== 'kanban' && filters.per_page) params.per_page = filters.per_page;
        if (filters.sort_field) params.sort_field = filters.sort_field;
        if (filters.sort_direction) params.sort_direction = filters.sort_direction;
        params.view = activeView;
        if (project_name) params.project_name = project_name;
        router.get(route('bugs.index'), params, { preserveState: false, preserveScroll: false });
    };
    
    const handleSeverityFilter = (value: string) => {
        setSelectedSeverity(value);
        const params: any = { page: 1 };
        if (searchTerm) params.search = searchTerm;
        if (selectedProject !== 'all') params.project_id = selectedProject;
        if (selectedStatus !== 'all') params.status_id = selectedStatus;
        if (selectedPriority !== 'all') params.priority = selectedPriority;
        if (value !== 'all') params.severity = value;
        if (activeView !== 'kanban' && filters.per_page) params.per_page = filters.per_page;
        if (filters.sort_field) params.sort_field = filters.sort_field;
        if (filters.sort_direction) params.sort_direction = filters.sort_direction;
        params.view = activeView;
        if (project_name) params.project_name = project_name;
        router.get(route('bugs.index'), params, { preserveState: false, preserveScroll: false });
    };

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
        if (selectedStatus !== 'all') params.status_id = selectedStatus;
        if (selectedPriority !== 'all') params.priority = selectedPriority;
        if (selectedSeverity !== 'all') params.severity = selectedSeverity;
        params.view = activeView;
        if (project_name) params.project_name = project_name;
        
        router.get(route('bugs.index'), params, { preserveState: true, preserveScroll: true });
    };

    // Handle actions for CrudTable
    const handleAction = (action: string, bugOrId: Bug | number) => {
        let bug: Bug;
        
        if (typeof bugOrId === 'number') {
            // Called with bug ID
            bug = bugsData?.find((b: any) => b.id === bugOrId);
            if (!bug) return;
        } else {
            // Called with bug object from CrudTable
            bug = bugOrId;
        }

        switch (action) {
            case 'files':
                handleViewBugFiles(bug.id);
                break;
            case 'view':
            case 'edit':
                openBugModal(bug);
                break;
            case 'delete':
                handleDeleteBug(bug);
                break;
        }
    };

    // CrudTable configuration
    const columns = [
        {
            key: 'title',
            label: t('Bug'),
            sortable: true,
            render: (value: string, row: any) => (
                <div className="flex items-center">
                    <Bug className="h-4 w-4 text-red-500 mr-2" />
                    <div>
                        <div 
                            className="text-sm font-medium text-gray-900 cursor-pointer hover:text-red-600 transition-colors"
                            onClick={() => openBugModal(row)}
                        >
                            {value}
                        </div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">{row.description}</div>
                    </div>
                </div>
            )
        },
        {
            key: 'bug_status.name',
            label: t('Status'),
            render: (value: string, row: any) => (
                <Badge style={{ backgroundColor: row.bug_status?.color }} className="text-white">
                    {formatText(value)}
                </Badge>
            )
        },
        {
            key: 'priority',
            label: t('Priority'),
            sortable: true,
            render: (value: string) => (
                <Badge className={getPriorityColor(value)} variant="secondary">
                    {formatText(value)}
                </Badge>
            )
        },
        {
            key: 'severity',
            label: t('Severity'),
            sortable: true,
            render: (value: string) => (
                <Badge className={getSeverityColor(value)} variant="secondary">
                    {formatText(value)}
                </Badge>
            )
        },
        {
            key: 'project.title',
            label: t('Project'),
            render: (value: string) => value || '-'
        },
        {
            key: 'assigned_to',
            label: t('Assigned To'),
            render: (value: any) => (
                value ? (
                    <div className="flex items-center">
                        <Avatar className="h-6 w-6 mr-2">
                            <AvatarFallback className="text-xs">
                                {value.name?.charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-gray-900">{value.name}</span>
                    </div>
                ) : (
                    <span className="text-sm text-gray-500">{t('Unassigned')}</span>
                )
            )
        },
        {
            key: 'attachments_count',
            label: t('Files'),
            render: (value: number, row: any) => (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Paperclip className="h-4 w-4 text-slate-500" />
                    <span>{value || row.attachments_count || 0}</span>
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
            label: t('Edit'),
            icon: 'Edit',
            action: 'edit',
            className: 'text-amber-500 hover:text-amber-700',
            condition: () => bugPermissions?.update
        },
        {
            label: t('Delete'),
            icon: 'Trash2',
            action: 'delete',
            className: 'text-red-500 hover:text-red-700',
            condition: () => bugPermissions?.delete
        }
    ];
    
    return (
        <PageTemplate 
            title={project_name ? `${project_name} - ${t('Bugs')}` : t('Bugs')} 
            url="/bugs"
            actions={pageActions}
            breadcrumbs={breadcrumbs}
            noPadding
        >
            <Head title={t('Bugs')} />
            
            {/* Overview Cards */}
            <Card className="mb-4 hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                    <div className="grid grid-cols-5 gap-4">
                        <div className="text-center">
                            <div className="text-xl font-bold text-red-600">
                                {Array.isArray(bugs) ? bugs.length : bugs?.total || 0}
                            </div>
                            <div className="text-xs text-gray-600">{t('Total Bugs')}</div>
                        </div>
                        {statuses.slice(0, 3).map((status, index) => {
                            const colors = ['text-orange-600', 'text-blue-600', 'text-green-600'];
                            return (
                                <div key={status.id} className="text-center">
                                    <div className={`text-xl font-bold ${colors[index] || 'text-gray-600'}`}>
                                        {bugsData?.filter((bug: any) => bug.bug_status?.id === status.id).length || 0}
                                    </div>
                                    <div className="text-xs text-gray-600">{status.name}</div>
                                </div>
                            );
                        })}
                        <div className="text-center">
                            <div className="text-xl font-bold text-red-600">
                                {bugsData?.filter((bug: any) => bug.priority === 'critical' || bug.severity === 'blocker').length || 0}
                            </div>
                            <div className="text-xs text-gray-600">{t('Critical')}</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Search and filters section */}
            <div className="bg-white rounded-lg shadow mb-4">
                <div className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <form onSubmit={handleSearch} className="flex gap-2">
                                <div className="relative w-64">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder={t('Search bugs...')}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-9"
                                    />
                                </div>
                                <Button type="submit" size="sm">
                                    <Search className="h-4 w-4 mr-1.5" />
                                    {t('Search')}
                                </Button>
                            </form>
                            
                            <div className="ml-2">
                                <Button 
                                    variant={hasActiveFilters() ? "default" : "outline"}
                                    size="sm" 
                                    className="h-8 px-2 py-1"
                                    onClick={() => setShowFilters(!showFilters)}
                                >
                                    <Filter className="h-3.5 w-3.5 mr-1.5" />
                                    {showFilters ? t('Hide Filters') : t('Filters')}
                                    {hasActiveFilters() && (
                                        <span className="ml-1 bg-primary-foreground text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs">
                                            {activeFilterCount()}
                                        </span>
                                    )}
                                </Button>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <div className="border rounded-md p-0.5 mr-2">
                                <Button 
                                    size="sm" 
                                    variant={activeView === 'kanban' ? "default" : "ghost"}
                                    className="h-7 px-2"
                                    onClick={() => setActiveView('kanban')}
                                >
                                    <Columns3 className="h-4 w-4" />
                                </Button>
                                <Button 
                                    size="sm" 
                                    variant={activeView === 'list' ? "default" : "ghost"}
                                    className="h-7 px-2"
                                    onClick={() => setActiveView('list')}
                                >
                                    <List className="h-4 w-4" />
                                </Button>
                                <Button 
                                    size="sm" 
                                    variant={activeView === 'grid' ? "default" : "ghost"}
                                    className="h-7 px-2"
                                    onClick={() => setActiveView('grid')}
                                >
                                    <LayoutGrid className="h-4 w-4" />
                                </Button>
                            </div>
                            
                            {/* Hide per_page filter in Kanban view */}
                            {activeView !== 'kanban' && (
                                <>
                                    <Label className="text-xs text-muted-foreground">Per Page:</Label>
                                    <Select 
                                        value={filters.per_page?.toString() || "10"} 
                                        onValueChange={(value) => {
                                            const params: any = { page: 1, per_page: parseInt(value) };
                                            if (searchTerm) params.search = searchTerm;
                                            if (selectedProject !== 'all') params.project_id = selectedProject;
                                            if (selectedStatus !== 'all') params.status_id = selectedStatus;
                                            if (selectedPriority !== 'all') params.priority = selectedPriority;
                                            if (selectedSeverity !== 'all') params.severity = selectedSeverity;
                                            params.view = activeView;
                                            if (project_name) params.project_name = project_name;
                                            router.get(route('bugs.index'), params, { preserveState: false, preserveScroll: false });
                                        }}
                                    >
                                        <SelectTrigger className="w-16 h-8">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="z-[9999]">
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
                        <div className="w-full mt-3 p-4 bg-gray-50 border rounded-md">
                            <div className="flex flex-wrap gap-4 items-end">
                                <div className="space-y-2">
                                    <Label>Project</Label>
                                    <Select value={selectedProject} onValueChange={handleProjectFilter}>
                                        <SelectTrigger className="w-40">
                                            <SelectValue placeholder="All Projects" />
                                        </SelectTrigger>
                                        <SelectContent className="z-[9999]">
                                            <SelectItem value="all">All Projects</SelectItem>
                                            {projects.map(project => (
                                                <SelectItem key={project.id} value={project.id.toString()}>
                                                    {project.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label>Status</Label>
                                    <Select value={selectedStatus} onValueChange={handleStatusFilter}>
                                        <SelectTrigger className="w-32">
                                            <SelectValue placeholder="All Statuses" />
                                        </SelectTrigger>
                                        <SelectContent className="z-[9999]">
                                            <SelectItem value="all">All Statuses</SelectItem>
                                            {statuses.map(status => (
                                                <SelectItem key={status.id} value={status.id.toString()}>
                                                    {status.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label>Priority</Label>
                                    <Select value={selectedPriority} onValueChange={handlePriorityFilter}>
                                        <SelectTrigger className="w-32">
                                            <SelectValue placeholder="All Priorities" />
                                        </SelectTrigger>
                                        <SelectContent className="z-[9999]">
                                            <SelectItem value="all">All Priorities</SelectItem>
                                            <SelectItem value="low">Low</SelectItem>
                                            <SelectItem value="medium">Medium</SelectItem>
                                            <SelectItem value="high">High</SelectItem>
                                            <SelectItem value="critical">Critical</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label>Severity</Label>
                                    <Select value={selectedSeverity} onValueChange={handleSeverityFilter}>
                                        <SelectTrigger className="w-32">
                                            <SelectValue placeholder="All Severities" />
                                        </SelectTrigger>
                                        <SelectContent className="z-[9999]">
                                            <SelectItem value="all">All Severities</SelectItem>
                                            <SelectItem value="minor">Minor</SelectItem>
                                            <SelectItem value="major">Major</SelectItem>
                                            <SelectItem value="critical">Critical</SelectItem>
                                            <SelectItem value="blocker">Blocker</SelectItem>
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

            {/* Bug Content */}
            {activeView === 'kanban' ? (
                <div className="w-full">
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
                    `}</style>
                <div className="bg-gray-50 p-4 rounded-lg overflow-hidden">
                    <div className="flex gap-4 overflow-x-auto pb-4" style={{ height: 'calc(100vh - 280px)', width: '100%' }}>
                        {statuses.map((status) => {
                            const statusBugs = bugsData?.filter((bug: any) => bug.bug_status?.id === status.id) || [];
                            return (
                                <div 
                                    key={status.id} 
                                    className="flex-shrink-0"
                                    style={{ minWidth: 'calc(20% - 16px)', width: 'calc(20% - 16px)' }}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        e.currentTarget.classList.remove('bg-blue-50', 'border-blue-300');
                                        const bugId = e.dataTransfer.getData('bugId');
                                        const currentStatusId = e.dataTransfer.getData('currentStatusId');
                                        if (bugId && currentStatusId !== status.id.toString()) {
                                            handleStatusChange(parseInt(bugId), status.id);
                                        }
                                    }}
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        e.currentTarget.classList.add('bg-blue-50', 'border-blue-300');
                                    }}
                                    onDragLeave={(e) => {
                                        e.currentTarget.classList.remove('bg-blue-50', 'border-blue-300');
                                    }}
                                >
                                    <div className="bg-gray-100 rounded-lg h-full flex flex-col">
                                        <div className="p-3 border-b border-gray-200">
                                            <div className="flex items-center justify-between">
                                                <h3 className="font-semibold text-sm text-gray-700">{status.name}</h3>
                                                <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                                                    {statusBugs.length}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="p-2 space-y-2 overflow-y-auto flex-1" style={{ maxHeight: 'calc(100vh - 350px)' }}>
                                            {statusBugs.map((bug: any) => (
                                                <div
                                                    key={bug.id}
                                                    draggable
                                                    onDragStart={(e) => {
                                                        e.dataTransfer.setData('bugId', bug.id.toString());
                                                        e.dataTransfer.setData('currentStatusId', status.id.toString());
                                                        e.currentTarget.classList.add('opacity-50', 'scale-95');
                                                    }}
                                                    onDragEnd={(e) => {
                                                        e.currentTarget.classList.remove('opacity-50', 'scale-95');
                                                    }}
                                                    className="cursor-move transition-all duration-200"
                                                >
                                                    <Card className="hover:shadow-md transition-all duration-200 border-l-4" style={{ borderLeftColor: status.color }}>
                                                        <CardContent className="p-3">
                                                            <div className="space-y-2">
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <div className="flex items-start gap-2 flex-1 min-w-0">
                                                                        <GripVertical className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                                                                        <div>
                                                                            <h4 
                                                                                className="font-medium text-sm hover:text-red-600 transition-colors cursor-pointer break-words"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    openBugModal(bug);
                                                                                }}
                                                                                title={bug.title}
                                                                            >
                                                                                {bug.title}
                                                                            </h4>
                                                                            {bug.description && (
                                                                                <p className="text-xs text-gray-500 mt-1 line-clamp-2" title={bug.description}>
                                                                                    {bug.description}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex gap-1 flex-shrink-0">
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <Button 
                                                                                    variant="ghost" 
                                                                                    size="icon" 
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        openBugModal(bug);
                                                                                    }}
                                                                                    className="h-6 w-6 text-amber-500 hover:text-amber-700"
                                                                                >
                                                                                    <Edit className="h-3 w-3" />
                                                                                </Button>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent>{t('Edit')}</TooltipContent>
                                                                        </Tooltip>
                                                                        {bugPermissions?.delete && (
                                                                            <Tooltip>
                                                                                <TooltipTrigger asChild>
                                                                                    <Button 
                                                                                        variant="ghost" 
                                                                                        size="icon" 
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            handleDeleteBug(bug);
                                                                                        }}
                                                                                        className="h-6 w-6 text-red-500 hover:text-red-700"
                                                                                    >
                                                                                        <Trash2 className="h-3 w-3" />
                                                                                    </Button>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent>{t('Delete')}</TooltipContent>
                                                                            </Tooltip>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                
                                                                <div className="flex flex-wrap gap-1">
                                                                    <Badge className={getPriorityColor(bug.priority)} variant="secondary" size="sm">
                                                                        {formatText(bug.priority)}
                                                                    </Badge>
                                                                    <Badge className={getSeverityColor(bug.severity)} variant="secondary" size="sm">
                                                                        {formatText(bug.severity)}
                                                                    </Badge>
                                                                </div>
                                                                
                                                                <div className="flex items-center gap-1 text-xs text-gray-600">
                                                                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                                                    <span className="font-medium">{bug.project?.title}</span>
                                                                </div>
                                                                
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        {bug.assigned_to ? (
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                                                                                    <span className="text-blue-600 font-semibold text-xs">
                                                                                        {bug.assigned_to.name.charAt(0).toUpperCase()}
                                                                                    </span>
                                                                                </div>
                                                                                <span className="text-xs text-gray-700">{bug.assigned_to.name}</span>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center">
                                                                                    <User className="h-3 w-3 text-gray-400" />
                                                                                </div>
                                                                                <span className="text-xs text-gray-500">Unassigned</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                                                        {bug.comments_count > 0 && (
                                                                            <div className="flex items-center gap-1">
                                                                                <MessageSquare className="h-3 w-3" />
                                                                                <span>{bug.comments_count}</span>
                                                                            </div>
                                                                        )}
                                                                        {bug.attachments_count > 0 && (
                                                                            <div className="flex items-center gap-1">
                                                                                <Paperclip className="h-3 w-3" />
                                                                                <span>{bug.attachments_count}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                </div>
                                            ))}
                                            {statusBugs.length === 0 && (
                                                <div className="text-center py-8 text-gray-400">
                                                    <Bug className="h-8 w-8 mx-auto mb-2" />
                                                    <p className="text-sm">{t('No bugs')}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                </div>
            ) : activeView === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {bugsData?.map((bug: any) => (
                        <Card key={bug.id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-base cursor-pointer hover:text-red-600 transition-colors break-words" onClick={() => openBugModal(bug)} title={bug.title}>
                                        {bug.title}
                                    </CardTitle>
                                    <Bug className="h-4 w-4 text-red-500 flex-shrink-0" />
                                </div>
                                {bug.description && (
                                    <p className="text-sm text-muted-foreground line-clamp-2" title={bug.description}>{bug.description}</p>
                                )}
                            </CardHeader>
                            
                            <CardContent className="py-2">
                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        <Badge className={getPriorityColor(bug.priority)} variant="secondary">
                                            {formatText(bug.priority)}
                                        </Badge>
                                        <Badge className={getSeverityColor(bug.severity)} variant="secondary">
                                            {formatText(bug.severity)}
                                        </Badge>
                                    </div>
                                    
                                    <div className="flex justify-between items-center text-xs">
                                        <Badge style={{ backgroundColor: bug.bug_status?.color }} className="text-white">
                                            {formatText(bug.bug_status?.name)}
                                        </Badge>
                                        <span className="text-muted-foreground">
                                            {bug.project?.title}
                                        </span>
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        {bug.assigned_to ? (
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-6 w-6">
                                                    <AvatarFallback className="text-xs">
                                                        {bug.assigned_to.name?.charAt(0)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="text-xs text-gray-600">{bug.assigned_to.name}</span>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-500">Unassigned</span>
                                        )}
                                        <div className="text-xs text-gray-500 text-right">
                                            <div>Created: {new Date(bug.created_at).toLocaleDateString()}</div>
                                            <div>Updated: {new Date(bug.updated_at || bug.created_at).toLocaleDateString()}</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                        <div className="flex items-center gap-1">
                                            <MessageSquare className="h-3 w-3" />
                                            <span>{bug.comments_count || 0}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Paperclip className="h-3 w-3" />
                                            <span>{bug.attachments_count || 0}</span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                            
                            <CardFooter className="flex justify-end gap-1 pt-0 pb-2">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" onClick={() => handleViewBugFiles(bug.id)} className="text-slate-500 hover:text-slate-700 h-8 w-8">
                                            <FileText className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>{t('Files')}</TooltipContent>
                                </Tooltip>

                                {bugPermissions?.update && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" onClick={() => openBugModal(bug)} className="text-amber-500 hover:text-amber-700 h-8 w-8">
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>{t('Edit')}</TooltipContent>
                                    </Tooltip>
                                )}
                                {bugPermissions?.delete && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteBug(bug)} className="text-red-500 hover:text-red-700 h-8 w-8">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>{t('Delete')}</TooltipContent>
                                    </Tooltip>
                                )}
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <CrudTable
                        columns={columns}
                        actions={actions}
                        data={bugsData || []}
                        from={Array.isArray(bugs) ? 1 : bugs?.from || 1}
                        onAction={handleAction}
                        sortField={filters.sort_field}
                        sortDirection={filters.sort_direction}
                        onSort={handleSort}
                        permissions={[]}
                    />
                </div>
            )}

            {(!bugsData || bugsData.length === 0) && (
                <Card className="border-dashed border-2">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Bug className="w-12 h-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">{t('No bugs found')}</h3>
                        <p className="text-gray-500 text-center mb-6">
                            {t('No bugs match your current filters. Try adjusting your search criteria.')}
                        </p>
                        {bugPermissions?.create && (
                            <Button onClick={() => openBugModal()}>
                                <Plus className="w-4 h-4 mr-2" />
                                {t('Report First Bug')}
                            </Button>
                        )}
                    </CardContent>
                </Card>
            )}
            
            {/* Pagination - Hidden in Kanban view */}
            {activeView !== 'kanban' && !Array.isArray(bugs) && bugs?.links && (
                <div className="mt-6 bg-white p-4 rounded-lg shadow flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        Showing <span className="font-medium">{bugs?.from || 0}</span> to <span className="font-medium">{bugs?.to || 0}</span> of <span className="font-medium">{bugs?.total || 0}</span> bugs
                    </div>
                    
                    <div className="flex gap-1">
                        {bugs?.links?.map((link: any, i: number) => {
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

            {/* Bug Modal */}
            {showBugModal && (
                <BugModal
                    bug={selectedBug}
                    projects={projects}
                    statuses={statuses}
                    members={members}
                    onClose={() => setShowBugModal(false)}
                    permissions={bugPermissions}
                />
            )}

            {/* Delete Modal */}
            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setBugToDelete(null);
                }}
                onConfirm={handleDeleteConfirm}
                itemName={bugToDelete?.title || ''}
                entityName="bug"
            />

            <Dialog open={isFilesModalOpen} onOpenChange={(open) => {
                setIsFilesModalOpen(open);
                if (!open) setFilesBug(null);
            }}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{t('Files')} {filesBug?.title ? `- ${filesBug.title}` : ''}</DialogTitle>
                    </DialogHeader>

                    {filesBug?.attachments?.length > 0 ? (
                        <TaskAttachments
                            task={filesBug}
                            attachments={filesBug.attachments}
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
