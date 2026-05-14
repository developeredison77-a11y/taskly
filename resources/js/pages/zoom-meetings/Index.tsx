import { useState, useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Filter, Eye, Edit, Trash2, Video, Calendar, Clock, Users, Copy } from 'lucide-react';
import { PageTemplate } from '@/components/page-template';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { CrudTable } from '@/components/CrudTable';
import { toast } from '@/components/custom-toast';
import { hasPermission } from '@/utils/authorization';
import { useTranslation } from 'react-i18next';
import ZoomMeetingModal from './ZoomMeetingModal';
import { formatDateTime } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export default function ZoomMeetingIndex() {
    const { t } = useTranslation();
    const { auth, meetings, projects, members, hasZoomConfig, filters: pageFilters = {}, permissions, flash, googleCalendarEnabled } = usePage().props as any;
    
    const formatText = (text: string) => {
        return text.replace(/_/g, ' ').split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
    };
    
    const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
    const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || 'all');
    const [selectedProject, setSelectedProject] = useState(pageFilters.project_id || 'all');
    const [showFilters, setShowFilters] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [currentMeeting, setCurrentMeeting] = useState<any>(null);

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
        if (selectedProject !== 'all') params.project_id = selectedProject;
        if (pageFilters.per_page) params.per_page = pageFilters.per_page;
        if (pageFilters.sort_field) params.sort_field = pageFilters.sort_field;
        if (pageFilters.sort_direction) params.sort_direction = pageFilters.sort_direction;
        
        router.get(route('zoom-meetings.index'), params, { preserveState: false, preserveScroll: false });
    };

    // Add sorting functionality
    const handleSort = (field: string) => {
        const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';
        
        const params: any = { 
            sort_field: field, 
            sort_direction: direction, 
            page: 1 
        };
        
        // Preserve existing filters
        if (searchTerm) params.search = searchTerm;
        if (selectedStatus !== 'all') params.status = selectedStatus;
        if (selectedProject !== 'all') params.project_id = selectedProject;
        if (pageFilters.per_page) params.per_page = pageFilters.per_page;
        
        router.get(route('zoom-meetings.index'), params, { preserveState: true, preserveScroll: true });
    };

    // Handle actions for CrudTable
    const handleAction = (action: string, meeting: any) => {
        if (!meeting) return;

        switch (action) {
            case 'view':
                router.get(route('zoom-meetings.show', meeting.id));
                break;
            case 'edit':
                handleEditMeeting(meeting);
                break;
            case 'delete':
                handleDeleteMeeting(meeting);
                break;
            case 'join':
                handleJoinMeeting(meeting);
                break;
            case 'start':
                handleStartMeeting(meeting);
                break;
        }
    };

    const handleJoinMeeting = (meeting: any) => {
        if (meeting.join_url) {
            window.open(meeting.join_url, '_blank');
        }
    };

    const handleStartMeeting = (meeting: any) => {
        if (meeting.start_url) {
            window.open(meeting.start_url, '_blank');
        }
    };

    const handleEditMeeting = (meeting: any) => {
        setCurrentMeeting(meeting);
        setIsEditModalOpen(true);
    };

    const handleDeleteMeeting = (meeting: any) => {
        setCurrentMeeting(meeting);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteConfirm = () => {
        toast.loading('Deleting meeting...');
        router.delete(route('zoom-meetings.destroy', currentMeeting.id), {
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
                    toast.error(t('Failed to delete meeting'));
                }
            }
        });
    };

    const getStatusColor = (status: string) => {
        const colors = {
            scheduled: 'bg-blue-100 text-blue-800 border-blue-300',
            started: 'bg-green-100 text-green-800 border-green-300',
            ended: 'bg-yellow-100 text-yellow-800 border-yellow-300',
            cancelled: 'bg-red-100 text-red-800 border-red-300',
        };
        return colors[status as keyof typeof colors] || colors.scheduled;
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
        const params: any = { page: 1 };
        if (pageFilters.per_page) params.per_page = pageFilters.per_page;
        router.get(route('zoom-meetings.index'), params, { preserveState: false, preserveScroll: false });
    };

    // CrudTable configuration
    const columns = [
        {
            key: 'title',
            label: t('Meeting'),
            sortable: true,
            render: (value: string, row: any) => (
                <div>
                    <div className="text-sm font-medium text-gray-900">
                        {value}
                    </div>
                    {row.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                            {row.description}
                        </div>
                    )}
                </div>
            )
        },
        {
            key: 'status',
            label: t('Status'),
            sortable: true,
            render: (value: string) => (
                <Badge className={getStatusColor(value)} variant="secondary">
                    {formatText(value)}
                </Badge>
            )
        },
        {
            key: 'start_time',
            label: t('Date & Time'),
            sortable: true,
            render: (value: string) => (
                <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {value ? value.substring(0, 16).replace('T', ' ') : ''}
                </div>
            )
        },
        {
            key: 'duration',
            label: t('Duration'),
            sortable: true,
            render: (value: number) => `${value} ${t('minutes')}`
        },
        {
            key: 'project.title',
            label: t('Project'),
            render: (value: string, row: any) => row.project?.title || '-'
        },
        {
            key: 'meeting_urls',
            label: t('Meeting URLs'),
            render: (value: any, row: any) => (
                <div className="flex gap-1">
                    {row.join_url && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                navigator.clipboard.writeText(row.join_url);
                                toast.success(t('Join URL copied to clipboard'));
                            }}
                            className="text-blue-600 border-blue-200 hover:bg-blue-50 h-7 px-2 text-xs"
                        >
                            <Copy className="h-3 w-3 mr-1" />
                            {t('Join URL')}
                        </Button>
                    )}
                    {row.start_url && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                navigator.clipboard.writeText(row.start_url);
                                toast.success(t('Start URL copied to clipboard'));
                            }}
                            className="text-green-600 border-green-200 hover:bg-green-50 h-7 px-2 text-xs"
                        >
                            <Copy className="h-3 w-3 mr-1" />
                            {t('Start URL')}
                        </Button>
                    )}
                </div>
            )
        }
    ];

    const actions = [
        {
            label: t('View'),
            icon: 'Eye',
            action: 'view',
            className: 'text-blue-500 hover:text-blue-700',
            condition: () => hasPermission(auth?.permissions, 'zoom_meeting_view')
        },
        {
            label: t('Edit'),
            icon: 'Edit',
            action: 'edit',
            className: 'text-amber-500 hover:text-amber-700',
            condition: () => hasPermission(auth?.permissions, 'zoom_meeting_update')
        },
        {
            label: t('Delete'),
            icon: 'Trash2',
            action: 'delete',
            className: 'text-red-500 hover:text-red-700',
            condition: () => hasPermission(auth?.permissions, 'zoom_meeting_delete')
        }
    ];

    // Show configuration message when Zoom is not configured
    if (!hasZoomConfig) {
        const userRoles = auth?.user?.roles?.map(role => role.name) || [];
        const canConfigureZoom = userRoles.includes('company') || userRoles.includes('owner');
        
        return (
            <PageTemplate title={t('Zoom Meetings')} url="/zoom-meetings">
                <Card>
                    <CardContent className="p-6 text-center">
                        <Video className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            {t('Zoom Integration Not Configured')}
                        </h3>
                        <p className="text-gray-500 mb-4">
                            {canConfigureZoom 
                                ? t('Please configure your Zoom API credentials in settings to use this feature.')
                                : t('Zoom integration has not been configured for this workspace. Please contact your administrator to set up Zoom credentials.')
                            }
                        </p>
                        {canConfigureZoom && (
                            <Button onClick={() => router.get(route('settings'))}>
                                {t('Configure Zoom Settings')}
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </PageTemplate>
        );
    }

    const pageActions = [];
    
    if (hasPermission(auth?.permissions, 'zoom_meeting_create')) {
        pageActions.push({
            label: t('Create Meeting'),
            icon: <Plus className="h-4 w-4 mr-2" />,
            variant: 'default',
            onClick: () => {
                setIsCreateModalOpen(true);
            }
        });
    }
    
    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Zoom Meetings') }
    ];

    return (
        <PageTemplate 
            title={t('Zoom Meetings')} 
            url="/zoom-meetings"
            actions={pageActions}
            breadcrumbs={breadcrumbs}
            noPadding
        >
            {/* Overview Row */}
            <Card className="mb-4 hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                    <div className="grid grid-cols-4 gap-4">
                        <div className="text-center">
                            <div className="text-xl font-bold text-blue-600">
                                {meetings?.total || 0}
                            </div>
                            <div className="text-xs text-gray-600">{t('Total Meetings')}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xl font-bold text-green-600">
                                {meetings?.data?.filter((meeting: any) => meeting.status === 'scheduled').length || 0}
                            </div>
                            <div className="text-xs text-gray-600">{t('Scheduled')}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xl font-bold text-orange-600">
                                {meetings?.data?.filter((meeting: any) => new Date(meeting.start_time) > new Date()).length || 0}
                            </div>
                            <div className="text-xs text-gray-600">{t('Upcoming')}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xl font-bold text-gray-600">
                                {meetings?.data?.filter((meeting: any) => meeting.status === 'ended').length || 0}
                            </div>
                            <div className="text-xs text-gray-600">{t('Completed')}</div>
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
                                        placeholder={t('Search meetings...')}
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
                            <Label className="text-xs text-muted-foreground">Per Page:</Label>
                            <Select 
                                value={pageFilters.per_page?.toString() || '10'} 
                                onValueChange={(value) => {
                                    const params: any = { page: 1, per_page: parseInt(value) };
                                    if (searchTerm) params.search = searchTerm;
                                    if (selectedStatus !== 'all') params.status = selectedStatus;
                                    if (selectedProject !== 'all') params.project_id = selectedProject;
                                    if (pageFilters.sort_field) params.sort_field = pageFilters.sort_field;
                                    if (pageFilters.sort_direction) params.sort_direction = pageFilters.sort_direction;
                                    router.get(route('zoom-meetings.index'), params, { preserveState: false, preserveScroll: false });
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
                        </div>
                    </div>
                    
                    {showFilters && (
                        <div className="w-full mt-3 p-4 bg-gray-50 border rounded-md">
                            <div className="flex flex-wrap gap-4 items-end">
                                <div className="space-y-2">
                                    <Label>{t('Status')}</Label>
                                    <Select value={selectedStatus} onValueChange={(value) => {
                                        setSelectedStatus(value);
                                        const params: any = { page: 1 };
                                        if (searchTerm) params.search = searchTerm;
                                        if (value !== 'all') params.status = value;
                                        if (selectedProject !== 'all') params.project_id = selectedProject;
                                        if (pageFilters.per_page) params.per_page = pageFilters.per_page;
                                        if (pageFilters.sort_field) params.sort_field = pageFilters.sort_field;
                                        if (pageFilters.sort_direction) params.sort_direction = pageFilters.sort_direction;
                                        router.get(route('zoom-meetings.index'), params, { preserveState: false, preserveScroll: false });
                                    }}>
                                        <SelectTrigger className="w-40">
                                            <SelectValue placeholder="All Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('All Status')}</SelectItem>
                                            <SelectItem value="scheduled">Scheduled</SelectItem>
                                            <SelectItem value="started">Started</SelectItem>
                                            <SelectItem value="ended">Ended</SelectItem>
                                            <SelectItem value="cancelled">Cancelled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label>{t('Project')}</Label>
                                    <Select value={selectedProject} onValueChange={(value) => {
                                        setSelectedProject(value);
                                        const params: any = { page: 1 };
                                        if (searchTerm) params.search = searchTerm;
                                        if (selectedStatus !== 'all') params.status = selectedStatus;
                                        if (value !== 'all') params.project_id = value;
                                        if (pageFilters.per_page) params.per_page = pageFilters.per_page;
                                        if (pageFilters.sort_field) params.sort_field = pageFilters.sort_field;
                                        if (pageFilters.sort_direction) params.sort_direction = pageFilters.sort_direction;
                                        router.get(route('zoom-meetings.index'), params, { preserveState: false, preserveScroll: false });
                                    }}>
                                        <SelectTrigger className="w-40">
                                            <SelectValue placeholder="All Projects" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('All Projects')}</SelectItem>
                                            {projects?.map((project: any) => (
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

            {/* Meetings Content */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <CrudTable
                    columns={columns}
                    actions={actions}
                    data={meetings?.data || []}
                    from={meetings?.from || 1}
                    onAction={handleAction}
                    sortField={pageFilters.sort_field}
                    sortDirection={pageFilters.sort_direction}
                    onSort={handleSort}
                    permissions={auth?.permissions || []}
                />
            </div>

            {/* Empty State */}
            {meetings?.data?.length === 0 && (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                    <Video className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {t('No meetings found')}
                    </h3>
                    <p className="text-gray-500 mb-4">
                        {t('Get started by creating your first Zoom meeting.')}
                    </p>
                    {hasPermission(auth?.permissions, 'zoom_meeting_create') && (
                        <Button onClick={() => setIsCreateModalOpen(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            {t('Create Meeting')}
                        </Button>
                    )}
                </div>
            )}
            
            {/* Pagination */}
            {meetings?.links && meetings.data.length > 0 && (
                <div className="mt-6 bg-white p-4 rounded-lg shadow flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="text-sm text-muted-foreground">
                            {t('Showing')} <span className="font-medium">{meetings?.from || 0}</span> {t('to')} <span className="font-medium">{meetings?.to || 0}</span> {t('of')} <span className="font-medium">{meetings?.total || 0}</span> {t('meetings')}
                        </div>

                    </div>
                    
                    <div className="flex gap-1">
                        {meetings?.links?.map((link: any, i: number) => {
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

            {/* Create Modal */}
            <ZoomMeetingModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                projects={projects || []}
                members={members || []}
                googleCalendarEnabled={googleCalendarEnabled}
            />

            {/* Edit Modal */}
            <ZoomMeetingModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                meeting={currentMeeting}
                projects={projects || []}
                members={members || []}
                googleCalendarEnabled={googleCalendarEnabled}
            />

            {/* Delete Modal */}
            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                itemName={currentMeeting?.title || ''}
                entityName={t('meeting')}
                warningMessage={t('This meeting will be permanently deleted from Zoom as well.')}
            />
        </PageTemplate>
    );
}