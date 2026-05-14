import React, { useState, useEffect } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { toast } from '@/components/custom-toast';
import TimesheetFormModal from '@/components/timesheets/TimesheetFormModal';
import { CrudTable } from '@/components/CrudTable';
import TimerWidget from '@/components/timesheets/TimerWidget';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Plus, Edit, Trash2, Clock, Calendar, Grid, List, User, ChevronLeft, ChevronRight, Search, Filter, LayoutGrid, Eye } from 'lucide-react';
import { PageTemplate } from '@/components/page-template';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { useTranslation } from 'react-i18next';
import { hasPermission } from '@/utils/authorization';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Timesheet {
    id: number;
    start_date: string;
    end_date: string;
    status: string;
    total_hours: number;
    billable_hours: number;
    user?: { name: string };
    entries?: any[];
}

interface User {
    id: number;
    name: string;
}

interface Props {
    timesheets: {
        data: Timesheet[];
        links?: any[];
        from?: number;
        to?: number;
        total?: number;
        current_page?: number;
        last_page?: number;
        per_page?: number;
    };
    members: User[];
    projects: any[];
    overviewStats: {
        total_timesheets: number;
        draft_count: number;
        submitted_count: number;
        approved_count: number;
        total_hours_this_week: number;
    };
    filters: {
        status?: string;
        user_id?: string;
        search?: string;
        project_id?: string;
        start_date?: string;
        end_date?: string;
        is_billable?: string;
        min_hours?: string;
        max_hours?: string;
        per_page?: string;
        view?: string;
        sort_field?: string;
        sort_direction?: 'asc' | 'desc';
    };
    permissions?: any;
}

export default function TimesheetsIndex({ timesheets, members, projects = [], overviewStats, filters, permissions }: Props) {
    const { t } = useTranslation();
    const { flash, auth } = usePage().props as any;
    const userPermissions = auth?.permissions || [];
    
    const formatText = (text: string) => {
        return text.replace(/_/g, ' ').split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
    };
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingTimesheet, setEditingTimesheet] = useState<Timesheet | null>(null);
    const [viewMode, setViewMode] = useState(filters.view || 'cards');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingTimesheet, setDeletingTimesheet] = useState<Timesheet | null>(null);
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [selectedStatus, setSelectedStatus] = useState(filters.status || 'all');
    const [selectedProject, setSelectedProject] = useState(filters.project_id || 'all');
    const [showFilters, setShowFilters] = useState(false);

    // Show flash messages
    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
    }, [flash]);

    const handleAction = (action: string, timesheetOrId: Timesheet | number) => {
        let timesheetId: number;
        
        if (typeof timesheetOrId === 'number') {
            // Called with timesheet ID
            timesheetId = timesheetOrId;
        } else {
            // Called with timesheet object from CrudTable
            timesheetId = timesheetOrId.id;
        }
        
        switch (action) {
            case 'edit':
                const timesheet = timesheets.data.find(t => t.id === timesheetId);
                if (timesheet) {
                    setEditingTimesheet(timesheet);
                    setIsFormModalOpen(true);
                }
                break;
            case 'submit':
                toast.loading(t('Submitting timesheet...'));
                router.post(route('timesheets.submit', timesheetId), {}, {
                    onSuccess: () => {
                        toast.dismiss();
                    },
                    onError: () => {
                        toast.dismiss();
                        toast.error(t('Failed to submit timesheet'));
                    }
                });
                break;
            case 'delete':
                const timesheetToDelete = timesheets.data.find(t => t.id === timesheetId);
                if (timesheetToDelete) {
                    setDeletingTimesheet(timesheetToDelete);
                    setIsDeleteModalOpen(true);
                }
                break;
        }
    };

    const getStatusColor = (status: string) => {
        const colors = {
            draft: 'bg-gray-200 text-gray-800 border-gray-300',
            submitted: 'bg-blue-100 text-blue-800 border-blue-300',
            approved: 'bg-green-100 text-green-800 border-green-300',
            rejected: 'bg-red-100 text-red-800 border-red-300'
        };
        return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
    };



    const handleViewChange = (view: string) => {
        setViewMode(view);
        router.get(route('timesheets.index'), { ...filters, view }, { preserveState: true });
    };

    const handlePerPageChange = (perPage: string) => {
        router.get(route('timesheets.index'), { ...filters, per_page: perPage }, { preserveState: true });
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };
    
    const applyFilters = () => {
        const params: any = { page: 1 };
        
        if (searchTerm) params.search = searchTerm;
        if (selectedStatus !== 'all') params.status = selectedStatus;
        if (selectedProject !== 'all') params.project_id = selectedProject;
        if (filters.per_page) params.per_page = filters.per_page;
        if (filters.sort_field) params.sort_field = filters.sort_field;
        if (filters.sort_direction) params.sort_direction = filters.sort_direction;
        params.view = viewMode;
        
        router.get(route('timesheets.index'), params, { preserveState: false, preserveScroll: false });
    };
    
    const handleStatusFilter = (value: string) => {
        setSelectedStatus(value);
        const params: any = { page: 1 };
        if (searchTerm) params.search = searchTerm;
        if (value !== 'all') params.status = value;
        if (selectedProject !== 'all') params.project_id = selectedProject;
        if (filters.per_page) params.per_page = filters.per_page;
        if (filters.sort_field) params.sort_field = filters.sort_field;
        if (filters.sort_direction) params.sort_direction = filters.sort_direction;
        params.view = viewMode;
        router.get(route('timesheets.index'), params, { preserveState: false, preserveScroll: false });
    };
    
    const handleProjectFilter = (value: string) => {
        setSelectedProject(value);
        const params: any = { page: 1 };
        if (searchTerm) params.search = searchTerm;
        if (selectedStatus !== 'all') params.status = selectedStatus;
        if (value !== 'all') params.project_id = value;
        if (filters.per_page) params.per_page = filters.per_page;
        if (filters.sort_field) params.sort_field = filters.sort_field;
        if (filters.sort_direction) params.sort_direction = filters.sort_direction;
        params.view = viewMode;
        router.get(route('timesheets.index'), params, { preserveState: false, preserveScroll: false });
    };
    
    const hasActiveFilters = () => {
        return selectedStatus !== 'all' || selectedProject !== 'all' || searchTerm !== '';
    };
    
    const activeFilterCount = () => {
        return (selectedStatus !== 'all' ? 1 : 0) + (selectedProject !== 'all' ? 1 : 0) + (searchTerm ? 1 : 0);
    };
    
    const handleResetFilters = () => {
        setSelectedStatus('all');
        setSelectedProject('all');
        setSearchTerm('');
        setShowFilters(false);
        const params: any = { page: 1, per_page: filters.per_page, view: viewMode };
        if (filters.sort_field) params.sort_field = filters.sort_field;
        if (filters.sort_direction) params.sort_direction = filters.sort_direction;
        router.get(route('timesheets.index'), params, { preserveState: false, preserveScroll: false });
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
        if (selectedStatus !== 'all') params.status = selectedStatus;
        if (selectedProject !== 'all') params.project_id = selectedProject;
        if (filters.per_page) params.per_page = filters.per_page;
        params.view = viewMode;
        
        router.get(route('timesheets.index'), params, { preserveState: true, preserveScroll: true });
    };

    // CrudTable configuration
    const columns = [
        {
            key: 'start_date',
            label: t('Period'),
            sortable: true,
            render: (value: string, row: any) => (
                <div>
                    <div className="font-medium">
                        {new Date(row.start_date).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                        to {new Date(row.end_date).toLocaleDateString()}
                    </div>
                </div>
            )
        },
        {
            key: 'user_id',
            label: t('User'),
            render: (value: string, row: any) => (
                <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {row.user?.name}
                </div>
            )
        },
        {
            key: 'status',
            label: t('Status'),
            render: (value: string) => (
                <Badge className={getStatusColor(value)}>
                    {formatText(value)}
                </Badge>
            )
        },
        {
            key: 'total_hours',
            label: t('Total Hours'),
            sortable: true,
            render: (value: number) => (
                <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {value}h
                </div>
            )
        },
        {
            key: 'billable_hours',
            label: t('Billable Hours'),
            sortable: true,
            render: (value: number) => (
                <div className="flex items-center gap-1 text-green-600">
                    <Calendar className="h-4 w-4" />
                    {value}h
                </div>
            )
        },
        {
            key: 'entries',
            label: t('Entries'),
            render: (value: any, row: any) => row.entries?.length || 0
        }
    ];

    const actions = [
        {
            label: t('Edit'),
            icon: 'Edit',
            action: 'edit',
            className: 'text-amber-500 hover:text-amber-700',
            condition: () => hasPermission(userPermissions, 'timesheet_update')
        },
        {
            label: t('Submit'),
            icon: 'Send',
            action: 'submit',
            className: 'text-blue-500 hover:text-blue-700',
            condition: (row: any) => hasPermission(userPermissions, 'timesheet_submit') && row.status === 'draft'
        },
        {
            label: t('Delete'),
            icon: 'Trash2',
            action: 'delete',
            className: 'text-red-500 hover:text-red-700',
            condition: () => hasPermission(userPermissions, 'timesheet_delete')
        }
    ];

    const handleDeleteConfirm = () => {
        if (deletingTimesheet) {
            toast.loading('Deleting timesheet...');
            router.delete(route('timesheets.destroy', deletingTimesheet.id), {
                onSuccess: () => {
                    toast.dismiss();
                    setIsDeleteModalOpen(false);
                    setDeletingTimesheet(null);
                },
                onError: () => {
                    toast.dismiss();
                    toast.error('Failed to delete timesheet');
                    setIsDeleteModalOpen(false);
                    setDeletingTimesheet(null);
                }
            });
        }
    };

    const pageActions = [];
    
    if (hasPermission(userPermissions, 'timesheet_create')) {
        pageActions.push({
            label: t('New Timesheet'),
            icon: <Plus className="h-4 w-4 mr-2" />,
            variant: 'default' as const,
            onClick: () => setIsFormModalOpen(true)
        });
    }

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Timesheets') }
    ];

    return (
        <PageTemplate 
            title={t('Timesheets')} 
            actions={pageActions}
            breadcrumbs={breadcrumbs}
        >
            <Head title={t('Timesheets')} />
            
            {/* Overview Card */}
            <Card className="mb-4 hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                    <div className="grid grid-cols-5 gap-4">
                        <div className="text-center">
                            <div className="text-xl font-bold text-blue-600">
                                {overviewStats.total_timesheets}
                            </div>
                            <div className="text-xs text-gray-600">{t('Total Timesheets')}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xl font-bold text-gray-600">
                                {overviewStats.draft_count}
                            </div>
                            <div className="text-xs text-gray-600">{t('Draft')}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xl font-bold text-yellow-600">
                                {overviewStats.submitted_count}
                            </div>
                            <div className="text-xs text-gray-600">{t('Submitted')}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xl font-bold text-green-600">
                                {overviewStats.approved_count}
                            </div>
                            <div className="text-xs text-gray-600">{t('Approved')}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xl font-bold text-purple-600">
                                {overviewStats.total_hours_this_week}h
                            </div>
                            <div className="text-xs text-gray-600">{t('This Week')}</div>
                        </div>
                    </div>
                </CardContent>
            </Card>
            
            {/* Timer Widget - Full Width */}
            <div className="mb-6">
                <TimerWidget projects={projects} permissions={userPermissions} />
            </div>
            
            {/* Search and filters section */}
            <div className="bg-white rounded-lg shadow mb-6">
                <div className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <form onSubmit={handleSearch} className="flex gap-2">
                                <div className="relative w-64">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder={t('Search timesheets...')}
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
                                    variant={viewMode === 'table' ? "default" : "ghost"}
                                    className="h-7 px-2"
                                    onClick={() => handleViewChange('table')}
                                >
                                    <List className="h-4 w-4" />
                                </Button>
                                <Button 
                                    size="sm" 
                                    variant={viewMode === 'cards' ? "default" : "ghost"}
                                    className="h-7 px-2"
                                    onClick={() => handleViewChange('cards')}
                                >
                                    <LayoutGrid className="h-4 w-4" />
                                </Button>
                            </div>
                            
                            <Label className="text-xs text-muted-foreground">Per Page:</Label>
                            <Select value={filters.per_page || '12'} onValueChange={handlePerPageChange}>
                                <SelectTrigger className="w-16 h-8">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="12">12</SelectItem>
                                    <SelectItem value="24">24</SelectItem>
                                    <SelectItem value="48">48</SelectItem>
                                    <SelectItem value="100">100</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    
                    {showFilters && (
                        <div className="w-full mt-3 p-4 bg-gray-50 border rounded-md">
                            <div className="flex flex-wrap gap-4 items-end">
                                <div className="space-y-2">
                                    <Label>{t('Status')}</Label>
                                    <Select value={selectedStatus} onValueChange={handleStatusFilter}>
                                        <SelectTrigger className="w-40">
                                            <SelectValue placeholder="All Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('All Status')}</SelectItem>
                                            <SelectItem value="draft">{t('Draft')}</SelectItem>
                                            <SelectItem value="submitted">{t('Submitted')}</SelectItem>
                                            <SelectItem value="approved">{t('Approved')}</SelectItem>
                                            <SelectItem value="rejected">{t('Rejected')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label>{t('Project')}</Label>
                                    <Select value={selectedProject} onValueChange={handleProjectFilter}>
                                        <SelectTrigger className="w-40">
                                            <SelectValue placeholder="All Projects" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('All Projects')}</SelectItem>
                                            {projects.map(project => (
                                                <SelectItem key={project.id} value={project.id.toString()}>
                                                    {project.title}
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
            


            {/* Card View */}
            {viewMode === 'cards' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {timesheets?.data?.map((timesheet: Timesheet) => (
                        <Card key={timesheet.id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-base">
                                        {t('Week of')} {new Date(timesheet.start_date).toLocaleDateString()}
                                    </CardTitle>
                                    <Badge className={getStatusColor(timesheet.status)}>
                                        {formatText(timesheet.status)}
                                    </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                    <User className="h-4 w-4" />
                                    {timesheet.user?.name}
                                </p>
                            </CardHeader>
                            
                            <CardContent>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-4 w-4" />
                                            {t('Total Hours')}
                                        </span>
                                        <span className="font-medium">{timesheet.total_hours}h</span>
                                    </div>
                                    
                                    <div className="flex justify-between text-sm">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="h-4 w-4" />
                                            {t('Billable Hours')}
                                        </span>
                                        <span className="font-medium text-green-600">{timesheet.billable_hours}h</span>
                                    </div>
                                    
                                    <div className="flex justify-between text-sm">
                                        <span>{t('Period')}</span>
                                        <span>{new Date(timesheet.start_date).toLocaleDateString()} - {new Date(timesheet.end_date).toLocaleDateString()}</span>
                                    </div>
                                    
                                    <div className="flex justify-between text-sm">
                                        <span>{t('Entries')}</span>
                                        <span>{timesheet.entries?.length || 0}</span>
                                    </div>
                                </div>
                                
                                <div className="flex gap-1 mt-4">
                                    {hasPermission(userPermissions, 'timesheet_update') && (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon"
                                                    onClick={() => handleAction('edit', timesheet.id)}
                                                    className="text-amber-500 hover:text-amber-700 h-8 w-8"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>{t('Edit')}</TooltipContent>
                                        </Tooltip>
                                    )}
                                    
                                    {hasPermission(userPermissions, 'timesheet_delete') && (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon"
                                                    onClick={() => handleAction('delete', timesheet.id)}
                                                    className="text-red-500 hover:text-red-700 h-8 w-8"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>{t('Delete')}</TooltipContent>
                                        </Tooltip>
                                    )}
                                    
                                    {hasPermission(userPermissions, 'timesheet_submit') && timesheet.status === 'draft' && (
                                        <Button 
                                            size="sm"
                                            onClick={() => handleAction('submit', timesheet.id)}
                                            className="ml-2"
                                        >
                                            {t('Submit')}
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Table View */}
            {viewMode === 'table' && (
                <Card>
                    <CardContent className="p-0">
                        <CrudTable
                            columns={columns}
                            actions={actions}
                            data={timesheets?.data || []}
                            from={timesheets?.from || 1}
                            onAction={handleAction}
                            sortField={filters.sort_field}
                            sortDirection={filters.sort_direction}
                            onSort={handleSort}
                            permissions={[]}
                        />
                    </CardContent>
                </Card>
            )}

            {timesheets?.data?.length === 0 && (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                    <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">{t('No timesheets found')}</p>
                    {hasPermission(userPermissions, 'timesheet_create') && (
                        <Button onClick={() => setIsFormModalOpen(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            {t('Create your first timesheet')}
                        </Button>
                    )}
                </div>
            )}

            {/* Pagination */}
            {timesheets?.links && (
                <div className="mt-6 bg-white p-4 rounded-lg shadow flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        Showing <span className="font-medium">{timesheets?.from || 0}</span> to <span className="font-medium">{timesheets?.to || 0}</span> of <span className="font-medium">{timesheets?.total || 0}</span> timesheets
                    </div>
                    
                    <div className="flex gap-1">
                        {timesheets?.links?.map((link: any, i: number) => {
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

            <TimesheetFormModal
                isOpen={isFormModalOpen}
                onClose={() => {
                    setIsFormModalOpen(false);
                    setEditingTimesheet(null);
                }}
                timesheet={editingTimesheet || undefined}
                projects={projects}
            />

            {/* Delete Modal */}
            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setDeletingTimesheet(null);
                }}
                onConfirm={handleDeleteConfirm}
                itemName={deletingTimesheet ? `Week of ${new Date(deletingTimesheet.start_date).toLocaleDateString()}` : ''}
                entityName="timesheet"
                warningMessage="All timesheet entries and time tracking data will be permanently lost."
                additionalInfo={[
                    "All time entries for this period",
                    "Project time allocations",
                    "Billable hours records",
                    "Associated notes and descriptions"
                ]}
            />
        </PageTemplate>
    );
}