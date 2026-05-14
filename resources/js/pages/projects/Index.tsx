import { useState, useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Search, Filter, Eye, Edit, Trash2, LayoutGrid, List, Download, Upload, FileText } from 'lucide-react';
import { PageTemplate } from '@/components/page-template';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { ImportModal } from '@/components/ImportModal';
import { toast } from '@/components/custom-toast';
import { CrudTable } from '@/components/CrudTable';
import { hasPermission } from '@/utils/authorization';
import { useTranslation } from 'react-i18next';

export default function ProjectIndex() {
    const { t } = useTranslation();
    const { auth, projects, members, clients, filters: pageFilters = {}, errors, flash } = usePage().props as any;
    const permissions = auth?.permissions || [];
    
    const formatText = (text: string) => {
        if (!text) return '';
        return text.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
    };
    

    
    // Check user role for each project
    const canEditProject = (project: any) => {
        const isWorkspaceOwner = auth?.user?.id === project?.workspace?.owner_id;
        const isProjectClient = project?.clients?.some((client: any) => client.id === auth?.user?.id);
        return isWorkspaceOwner || isProjectClient;
    };
    
    const canDeleteProject = (project: any) => {
        return auth?.user?.id === project?.workspace?.owner_id;
    };
    
    const [activeView, setActiveView] = useState(pageFilters.view || 'grid');
    const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
    const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || 'all');
    const [selectedPriority, setSelectedPriority] = useState(pageFilters.priority || 'all');
    const [showFilters, setShowFilters] = useState(false);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<any>(null);
    const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    // Handle flash messages
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
        if (selectedStatus !== 'all') params.status = selectedStatus;
        if (selectedPriority !== 'all') params.priority = selectedPriority;
        if (pageFilters.per_page) params.per_page = pageFilters.per_page;
        if (pageFilters.sort_field) params.sort_field = pageFilters.sort_field;
        if (pageFilters.sort_direction) params.sort_direction = pageFilters.sort_direction;
        params.view = activeView;
        
        router.get(route('projects.index'), params, { preserveState: false, preserveScroll: false });
    };
    
    const handleSort = (field: string) => {
        const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';
        
        const params: any = { 
            sort_field: field, 
            sort_direction: direction, 
            page: 1 
        };
        
        if (searchTerm) params.search = searchTerm;
        if (selectedStatus !== 'all') params.status = selectedStatus;
        if (selectedPriority !== 'all') params.priority = selectedPriority;
        if (pageFilters.per_page) params.per_page = pageFilters.per_page;
        params.view = activeView;
        
        router.get(route('projects.index'), params, { preserveState: false, preserveScroll: false });
    };
    

    
    const handleStatusFilter = (value: string) => {
        setSelectedStatus(value);
        const params: any = { page: 1 };
        if (searchTerm) params.search = searchTerm;
        if (value !== 'all') params.status = value;
        if (selectedPriority !== 'all') params.priority = selectedPriority;
        if (pageFilters.per_page) params.per_page = pageFilters.per_page;
        if (pageFilters.sort_field) params.sort_field = pageFilters.sort_field;
        if (pageFilters.sort_direction) params.sort_direction = pageFilters.sort_direction;
        params.view = activeView;
        router.get(route('projects.index'), params, { preserveState: false, preserveScroll: false });
    };
    
    const handlePriorityFilter = (value: string) => {
        setSelectedPriority(value);
        const params: any = { page: 1 };
        if (searchTerm) params.search = searchTerm;
        if (selectedStatus !== 'all') params.status = selectedStatus;
        if (value !== 'all') params.priority = value;
        if (pageFilters.per_page) params.per_page = pageFilters.per_page;
        if (pageFilters.sort_field) params.sort_field = pageFilters.sort_field;
        if (pageFilters.sort_direction) params.sort_direction = pageFilters.sort_direction;
        params.view = activeView;
        router.get(route('projects.index'), params, { preserveState: false, preserveScroll: false });
    };
    
    const handleAction = (action: string, item: any) => {
        setCurrentItem(item);
        switch (action) {
            case 'view':
                router.get(route('projects.show', item.id));
                break;
            case 'edit':
                setFormMode('edit');
                setIsFormModalOpen(true);
                break;
            case 'delete':
                setIsDeleteModalOpen(true);
                break;
        }
    };
    
    const handleAddNew = () => {
        setCurrentItem(null);
        setFormMode('create');
        setIsFormModalOpen(true);
    };
    
    const handleFormSubmit = (formData: any) => {
        
        if (formMode === 'create') {
            toast.loading('Creating project...');
            router.post(route('projects.store'), formData, {
                onSuccess: () => {
                    console.log('SUCCESS');
                    setIsFormModalOpen(false);
                    toast.dismiss();
                    if (flash?.success) {
                        toast.success(flash.success);
                    }
                },
                onError: (errors) => {
                    console.log('ERROR:', errors);
                    toast.dismiss();
                    if (errors?.error) {
                        toast.error(errors.error);
                    } else {
                        const errorMessages = Object.values(errors).flat();
                        if (errorMessages.length > 0) {
                            toast.error(errorMessages[0] as string);
                        }
                    }
                },
                onBefore: () => {
                    console.log('BEFORE REQUEST');
                },
                onStart: () => {
                    console.log('START REQUEST');
                },
                onFinish: () => {
                    console.log('FINISH REQUEST');
                }
            });
        } else if (formMode === 'edit') {
            toast.loading('Updating project...');
            router.put(route('projects.update', currentItem.id), formData, {
                onSuccess: () => {
                    setIsFormModalOpen(false);
                    toast.dismiss();
                    if (flash?.success) {
                        toast.success(flash.success);
                    }
                    router.get(route('projects.index'));
                },
                onError: (errors) => {
                    toast.dismiss();
                    if (flash?.error) {
                        toast.error(flash.error);
                    } else {
                        toast.error(`Failed to update project: ${Object.values(errors).join(', ')}`);
                    }
                }
            });
        }
    };
    
    const handleDeleteConfirm = () => {
        toast.loading('Deleting project...');
        router.delete(route('projects.destroy', currentItem.id), {
            onSuccess: () => {
                setIsDeleteModalOpen(false);
                toast.dismiss();
                if (flash?.success) {
                    toast.success(flash.success);
                }
            },
            onError: (errors) => {
                toast.dismiss();
                if (flash?.error) {
                    toast.error(flash.error);
                } else {
                    toast.error(`Failed to delete project: ${Object.values(errors).join(', ')}`);
                }
            }
        });
    };
    
    const hasActiveFilters = () => {
        return selectedStatus !== 'all' || selectedPriority !== 'all' || searchTerm !== '';
    };
    
    const activeFilterCount = () => {
        return (selectedStatus !== 'all' ? 1 : 0) + (selectedPriority !== 'all' ? 1 : 0) + (searchTerm ? 1 : 0);
    };
    
    const handleResetFilters = () => {
        setSelectedStatus('all');
        setSelectedPriority('all');
        setSearchTerm('');
        setShowFilters(false);
        router.get(route('projects.index'), { page: 1, per_page: pageFilters.per_page, view: activeView }, { preserveState: false, preserveScroll: false });
    };

    const getStatusColor = (status: string) => {
        const colors = {
            planning: 'bg-blue-100 text-blue-800 border-blue-300',
            active: 'bg-green-100 text-green-800 border-green-300',
            on_hold: 'bg-yellow-100 text-yellow-800 border-yellow-300',
            completed: 'bg-purple-100 text-purple-800 border-purple-300',
            cancelled: 'bg-red-100 text-red-800 border-red-300'
        };
        return colors[status as keyof typeof colors] || 'bg-gray-200 text-gray-800 border-gray-300';
    };

    const getPriorityColor = (priority: string) => {
        const colors = {
            low: 'bg-green-100 text-green-800',
            medium: 'bg-yellow-100 text-yellow-800',
            high: 'bg-orange-100 text-orange-800',
            urgent: 'bg-red-100 text-red-800'
        };
        return colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800';
    };

    const pageActions = [];
    
    // Get user workspace role from props
    const userWorkspaceRole = (usePage().props as any).userWorkspaceRole;
    
    // Export - only for users with view permission and not clients
    if (hasPermission(permissions, 'project_view_any') && userWorkspaceRole !== 'client') {
        pageActions.push({
            label: t('Export'),
            icon: <Download className="h-4 w-4 mr-2" />,
            variant: 'outline',
            onClick: async () => {
                try {
                    const params = new URLSearchParams();
                    if (searchTerm) params.append('search', searchTerm);
                    if (selectedStatus !== 'all') params.append('status', selectedStatus);
                    if (selectedPriority !== 'all') params.append('priority', selectedPriority);
                    
                    const response = await fetch(route('projects.export', params));
                    if (!response.ok) throw new Error('Export failed');
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `projects_export_${new Date().toISOString().split('T')[0]}.xlsx`;
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
    
    // Import - only for users with create permission and not clients
    if (hasPermission(permissions, 'project_create') && userWorkspaceRole !== 'client') {
        pageActions.push({
            label: t('Import'),
            icon: <Upload className="h-4 w-4 mr-2" />,
            variant: 'outline',
            onClick: () => setIsImportModalOpen(true)
        });
    }
    
    if (hasPermission(permissions, 'project_create')) {
        pageActions.push({
            label: t('Add Project'),
            icon: <Plus className="h-4 w-4 mr-2" />,
            variant: 'default',
            onClick: handleAddNew
        });
    }
    
    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Projects') }
    ];

    // CrudTable configuration
    const columns = [
        {
            key: 'title',
            label: t('Project'),
            sortable: true,
            render: (value: string, row: any) => (
                <div>
                    <div 
                        className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
                        onClick={() => router.get(route('projects.show', row.id))}
                    >
                        {value}
                    </div>
                    <div className="text-sm text-gray-500 truncate max-w-xs">{row.description}</div>
                </div>
            )
        },
        {
            key: 'status',
            label: t('Status'),
            render: (value: string, row: any) => (
                <div className="flex gap-1">
                    <Badge className={getStatusColor(value)} variant="secondary">
                        {formatText(value)}
                    </Badge>
                    {row.is_public ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                            {t('Public')}
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="text-gray-600 border-gray-600">
                            {t('Private')}
                        </Badge>
                    )}
                </div>
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
            key: 'members',
            label: t('Team'),
            render: (value: any[]) => (
                <div className="flex -space-x-1">
                    {value?.slice(0, 3).map((member: any, index: number) => (
                        <Tooltip key={index}>
                            <TooltipTrigger asChild>
                                <Avatar className="h-6 w-6 border-2 border-white cursor-pointer">
                                    <AvatarImage src={member.user?.avatar} />
                                    <AvatarFallback className="text-xs">
                                        {member.user?.name?.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                            </TooltipTrigger>
                            <TooltipContent>
                                {member.user?.name}
                            </TooltipContent>
                        </Tooltip>
                    ))}
                    {value?.length > 3 && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="h-6 w-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs cursor-pointer">
                                    +{value.length - 3}
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                {value.slice(3).map((m: any) => m.user?.name).join(', ')}
                            </TooltipContent>
                        </Tooltip>
                    )}
                </div>
            )
        },
        {
            key: 'deadline',
            label: t('Deadline'),
            sortable: true,
            render: (value: string) => new Date(value).toLocaleDateString()
        }
    ];

    const actions = [
        {
            label: t('View'),
            icon: 'Eye',
            action: 'view',
            className: 'text-blue-500 hover:text-blue-700',
            condition: () => hasPermission(permissions, 'project_view')
        },
        {
            label: t('Edit'),
            icon: 'Edit',
            action: 'edit',
            className: 'text-amber-500 hover:text-amber-700',
            condition: () => hasPermission(permissions, 'project_update')
        },
        {
            label: t('Delete'),
            icon: 'Trash2',
            action: 'delete',
            className: 'text-red-500 hover:text-red-700',
            condition: () => hasPermission(permissions, 'project_delete')
        }
    ];
    
    return (
        <PageTemplate 
            title={t('Projects')} 
            url="/projects"
            actions={pageActions}
            breadcrumbs={breadcrumbs}
            noPadding
        >
            {/* Overview Row */}
            <Card className="mb-4 hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                    <div className="grid grid-cols-5 gap-4">
                        <div className="text-center">
                            <div className="text-xl font-bold text-blue-600">
                                {projects?.total || 0}
                            </div>
                            <div className="text-xs text-gray-600">{t('Total Projects')}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xl font-bold text-green-600">
                                {projects?.data?.filter((project: any) => project.status === 'active').length || 0}
                            </div>
                            <div className="text-xs text-gray-600">{t('Active')}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xl font-bold text-blue-600">
                                {projects?.data?.filter((project: any) => project.status === 'completed').length || 0}
                            </div>
                            <div className="text-xs text-gray-600">{t('Completed')}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xl font-bold text-yellow-600">
                                {projects?.data?.filter((project: any) => project.status === 'on_hold').length || 0}
                            </div>
                            <div className="text-xs text-gray-600">{t('On Hold')}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xl font-bold text-orange-600">
                                {projects?.data?.filter((project: any) => project.priority === 'high' || project.priority === 'urgent').length || 0}
                            </div>
                            <div className="text-xs text-gray-600">{t('High Priority')}</div>
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
                                        placeholder={t('Search projects...')}
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
                            
                            <Label className="text-xs text-muted-foreground">{t('Per Page')}:</Label>
                            <Select 
                                value={pageFilters.per_page?.toString() || "12"} 
                                onValueChange={(value) => {
                                    const params: any = { page: 1, per_page: parseInt(value) };
                                    if (searchTerm) params.search = searchTerm;
                                    if (selectedStatus !== 'all') params.status = selectedStatus;
                                    if (selectedPriority !== 'all') params.priority = selectedPriority;
                                    if (pageFilters.sort_field) params.sort_field = pageFilters.sort_field;
                                    if (pageFilters.sort_direction) params.sort_direction = pageFilters.sort_direction;
                                    params.view = activeView;
                                    router.get(route('projects.index'), params, { preserveState: false, preserveScroll: false });
                                }}
                            >
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
                                            <SelectValue placeholder={t('All Status')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('All Status')}</SelectItem>
                                            <SelectItem value="planning">{t('Planning')}</SelectItem>
                                            <SelectItem value="active">{t('Active')}</SelectItem>
                                            <SelectItem value="on_hold">{t('On Hold')}</SelectItem>
                                            <SelectItem value="completed">{t('Completed')}</SelectItem>
                                            <SelectItem value="cancelled">{t('Cancelled')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label>{t('Priority')}</Label>
                                    <Select value={selectedPriority} onValueChange={handlePriorityFilter}>
                                        <SelectTrigger className="w-40">
                                            <SelectValue placeholder={t('All Priority')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('All Priority')}</SelectItem>
                                            <SelectItem value="low">{t('Low')}</SelectItem>
                                            <SelectItem value="medium">{t('Medium')}</SelectItem>
                                            <SelectItem value="high">{t('High')}</SelectItem>
                                            <SelectItem value="urgent">{t('Urgent')}</SelectItem>
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

            {/* Projects Content */}
            {(activeView === 'grid' || !activeView) ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {projects?.data?.map((project: any) => (
                    <Card key={project.id} className="overflow-hidden hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <CardTitle 
                                    className="text-base line-clamp-1 cursor-pointer hover:text-blue-600 transition-colors"
                                    onClick={() => router.get(route('projects.show', project.id))}
                                >
                                    {project.title}
                                </CardTitle>
                                <div className="flex gap-1">
                                    <Badge className={getStatusColor(project.status)} variant="secondary">
                                        {formatText(project.status)}
                                    </Badge>
                                    {project.is_public ? (
                                        <Badge variant="outline" className="text-green-600 border-green-600">
                                            {t('Public')}
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-gray-600 border-gray-600">
                                            {t('Private')}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                        </CardHeader>
                        
                        <CardContent className="py-2">
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs">
                                        <span>{t('Progress')}</span>
                                        <span>{project.progress}%</span>
                                    </div>
                                    <Progress value={project.progress} className="h-1" />
                                </div>
                                
                                <div className="flex justify-between items-center text-xs">
                                    <Badge className={getPriorityColor(project.priority)} variant="outline">
                                        {project.priority}
                                    </Badge>
                                    <span className="text-muted-foreground">
                                        {new Date(project.deadline).toLocaleDateString()}
                                    </span>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                    <div className="flex -space-x-1">
                                        {project.members?.slice(0, 3).map((member: any, index: number) => (
                                            <Tooltip key={index}>
                                                <TooltipTrigger asChild>
                                                    <Avatar className="h-6 w-6 border-2 border-white cursor-pointer">
                                                        <AvatarImage src={member.user?.avatar} />
                                                        <AvatarFallback className="text-xs">
                                                            {member.user?.name?.charAt(0)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    {member.user?.name}
                                                </TooltipContent>
                                            </Tooltip>
                                        ))}
                                        {project.members?.length > 3 && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div className="h-6 w-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs cursor-pointer">
                                                        +{project.members.length - 3}
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    {project.members.slice(3).map((m: any) => m.user?.name).join(', ')}
                                                </TooltipContent>
                                            </Tooltip>
                                        )}
                                    </div>
                                    
                                    {project.clients?.length > 0 && (
                                        <div className="text-xs text-muted-foreground">
                                            {project.clients.length} client{project.clients.length > 1 ? 's' : ''}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                        
                        <CardFooter className="flex justify-end gap-1 pt-0 pb-2">
                            {hasPermission(permissions, 'project_view') && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            onClick={() => handleAction('view', project)}
                                            className="text-blue-500 hover:text-blue-700 h-8 w-8"
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>{t('View')}</TooltipContent>
                                </Tooltip>
                            )}
                            {hasPermission(permissions, 'project_update') && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            onClick={() => handleAction('edit', project)}
                                            className="text-amber-500 hover:text-amber-700 h-8 w-8"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>{t('Edit')}</TooltipContent>
                                </Tooltip>
                            )}
                            {hasPermission(permissions, 'project_delete') && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button 
                                            variant="ghost" 
                                            size="icon"
                                            className="text-red-500 hover:text-red-700 h-8 w-8"
                                            onClick={() => handleAction('delete', project)}
                                        >
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
                        data={projects?.data || []}
                        from={projects?.from || 1}
                        onAction={handleAction}
                        sortField={pageFilters.sort_field}
                        sortDirection={pageFilters.sort_direction}
                        onSort={handleSort}
                        permissions={permissions}
                    />
                </div>
            )}
            
            {/* Pagination */}
            {projects?.links && (
                <div className="mt-6 bg-white p-4 rounded-lg shadow flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        {t('Showing')} <span className="font-medium">{projects?.from || 0}</span> {t('to')} <span className="font-medium">{projects?.to || 0}</span> {t('of')} <span className="font-medium">{projects?.total || 0}</span> {t('projects')}
                    </div>
                    
                    <div className="flex gap-1">
                        {projects?.links?.map((link: any, i: number) => {
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
            
            {/* Form Modal */}
            <CrudFormModal
                isOpen={isFormModalOpen}
                onClose={() => setIsFormModalOpen(false)}
                onSubmit={handleFormSubmit}
                submitButtonText={formMode === 'create' ? t('Create Project') : t('Update Project')}
                formConfig={{
                    fields: [
                        { name: 'title', label: t('Project Title'), type: 'text', required: true },
                        { name: 'description', label: t('Description'), type: 'textarea' },
                        { 
                            name: 'status', 
                            label: t('Status'), 
                            type: 'select',
                            options: [
                                { value: 'planning', label: 'Planning' },
                                { value: 'active', label: 'Active' },
                                { value: 'on_hold', label: 'On Hold' },
                                { value: 'completed', label: 'Completed' },
                                { value: 'cancelled', label: 'Cancelled' }
                            ],
                            required: true
                        },
                        { 
                            name: 'priority', 
                            label: t('Priority'), 
                            type: 'select',
                            options: [
                                { value: 'low', label: 'Low' },
                                { value: 'medium', label: 'Medium' },
                                { value: 'high', label: 'High' },
                                { value: 'urgent', label: 'Urgent' }
                            ],
                            required: true
                        },
                        { name: 'start_date', label: t('Start Date'), type: 'date' },
                        { name: 'deadline', label: t('Deadline'), type: 'date' },
                        { name: 'estimated_hours', label: t('Estimated Hours'), type: 'number', min: 0 },
                        { name: 'is_public', label: '', type: 'checkbox', placeholder: t('Make project public') }
                    ],
                    modalSize: 'xl'
                }}
                initialData={currentItem || {
                    status: 'planning',
                    priority: 'medium',
                    is_public: false
                }}
                title={
                    formMode === 'create' 
                        ? t('Add Project') 
                        : formMode === 'edit' 
                            ? t('Edit Project') 
                            : t('View Project')
                }
                mode={formMode}
            />

            {/* Delete Modal */}
            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                itemName={currentItem?.title || ''}
                entityName={t('project')}
                warningMessage={t('All project data including tasks, files, and progress will be permanently lost.')}
                additionalInfo={[
                    t('All tasks and subtasks'),
                    t('Project files and attachments'),
                    t('Time tracking records'),
                    t('Project comments and notes'),
                    t('Budget and expense data')
                ]}
            />
            
            {/* Import Modal */}
            <ImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                type="projects"
                title={t('Projects')}
            />
        </PageTemplate>
    );
}