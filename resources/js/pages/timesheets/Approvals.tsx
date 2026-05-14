import React, { useState, useEffect } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { toast } from '@/components/custom-toast';
import { CrudTable } from '@/components/CrudTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, Clock, MessageSquare, Filter, Search, LayoutGrid, List, Calendar, User, Timer, DollarSign, Eye, MoreHorizontal, Check, X, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageTemplate } from '@/components/page-template';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useTranslation } from 'react-i18next';
import { hasPermission } from '@/utils/authorization';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface TimesheetApproval {
    id: number;
    status: string;
    comments?: string;
    timesheet: {
        id: number;
        start_date: string;
        end_date: string;
        total_hours: number;
        billable_hours: number;
        user: {
            name: string;
        };
    };
}

interface Props {
    approvals: {
        data: TimesheetApproval[];
        links?: any[];
        from?: number;
        to?: number;
        total?: number;
        current_page?: number;
        last_page?: number;
        per_page?: number;
    };
    filters: {
        status?: string;
        search?: string;
        view?: string;
        per_page?: string;
        from_date?: string;
        to_date?: string;
        sort_field?: string;
        sort_direction?: 'asc' | 'desc';
    };
    userWorkspaceRole?: string;
    permissions?: any;
}

export default function TimesheetApprovals({ approvals, filters, userWorkspaceRole, permissions }: Props) {
    const { t } = useTranslation();
    const { flash, auth } = usePage().props as any;
    const userPermissions = auth?.permissions || [];
    const [activeView, setActiveView] = useState(filters.view || 'grid');
    const [selectedStatus, setSelectedStatus] = useState(filters.status || 'all');
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [perPage, setPerPage] = useState(filters.per_page || '12');
    const [showFilters, setShowFilters] = useState(false);
    const [selectedApprovals, setSelectedApprovals] = useState<number[]>([]);
    const [comments, setComments] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');

    // Show flash messages
    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
    }, [flash]);
    
    // Check if user can approve/reject
    const canApprove = hasPermission(userPermissions, 'timesheet_approve');
    const applyFilters = () => {
        const params: any = { page: 1, per_page: perPage, view: activeView };
        if (selectedStatus !== 'all') params.status = selectedStatus;
        if (searchTerm.trim()) params.search = searchTerm.trim();
        if (filters.from_date) params.from_date = filters.from_date;
        if (filters.to_date) params.to_date = filters.to_date;
        if (filters.sort_field) params.sort_field = filters.sort_field;
        if (filters.sort_direction) params.sort_direction = filters.sort_direction;
        router.get(route('timesheet-approvals.index'), params, { preserveState: false, preserveScroll: false });
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const handleStatusFilter = (value: string) => {
        setSelectedStatus(value);
        const params: any = { page: 1, per_page: perPage, view: activeView };
        if (searchTerm.trim()) params.search = searchTerm.trim();
        if (value !== 'all') params.status = value;
        if (filters.from_date) params.from_date = filters.from_date;
        if (filters.to_date) params.to_date = filters.to_date;
        if (filters.sort_field) params.sort_field = filters.sort_field;
        if (filters.sort_direction) params.sort_direction = filters.sort_direction;
        router.get(route('timesheet-approvals.index'), params, { preserveState: false, preserveScroll: false });
    };

    // Add sorting functionality
    const handleSort = (field: string) => {
        const direction = filters.sort_field === field && filters.sort_direction === 'asc' ? 'desc' : 'asc';
        
        const params: any = { 
            sort_field: field, 
            sort_direction: direction, 
            page: 1,
            per_page: perPage,
            view: activeView
        };
        
        // Preserve existing filters
        if (searchTerm.trim()) params.search = searchTerm.trim();
        if (selectedStatus !== 'all') params.status = selectedStatus;
        if (filters.from_date) params.from_date = filters.from_date;
        if (filters.to_date) params.to_date = filters.to_date;
        
        router.get(route('timesheet-approvals.index'), params, { preserveState: true, preserveScroll: true });
    };

    // Handle actions for CrudTable
    const handleAction = (action: string, approvalId: number) => {
        const approval = approvals.data.find(a => a.id === approvalId);
        if (!approval) return;

        switch (action) {
            case 'approve':
                handleSingleAction('approve', approvalId);
                break;
            case 'reject':
                handleSingleAction('reject', approvalId);
                break;
            case 'view':
                // Handle view action if needed
                break;
        }
    };

    const clearFilters = () => {
        setSelectedStatus('all');
        setSearchTerm('');
        setPerPage('12');
        setShowFilters(false);
        router.get(route('timesheet-approvals.index'), { per_page: '12', view: activeView }, { preserveState: false, preserveScroll: false });
    };

    const hasActiveFilters = () => {
        return selectedStatus !== 'all' || searchTerm !== '' || filters.from_date || filters.to_date;
    };

    const activeFilterCount = () => {
        return (selectedStatus !== 'all' ? 1 : 0) + (searchTerm ? 1 : 0) + (filters.from_date ? 1 : 0) + (filters.to_date ? 1 : 0);
    };

    const handleSingleAction = (action: 'approve' | 'reject', approvalId: number, comments?: string) => {
        const url = action === 'approve' 
            ? route('timesheet-approvals.approve', approvalId)
            : route('timesheet-approvals.reject', approvalId);

        toast.loading(t(`${action === 'approve' ? 'Approving' : 'Rejecting'} timesheet...`));
        router.post(url, { comments: comments || '' }, {
            onSuccess: () => {
                toast.dismiss();
            },
            onError: () => {
                toast.dismiss();
                toast.error(t(`Failed to ${action} timesheet`));
            }
        });
    };

    const handleBulkAction = () => {
        if (selectedApprovals.length === 0) return;

        const url = actionType === 'approve' 
            ? route('timesheet-approvals.bulk-approve')
            : route('timesheet-approvals.bulk-reject');

        toast.loading(t(`${actionType === 'approve' ? 'Approving' : 'Rejecting'} timesheets...`));
        router.post(url, {
            approval_ids: selectedApprovals,
            comments
        }, {
            onSuccess: () => {
                toast.dismiss();
                setSelectedApprovals([]);
                setComments('');
                setIsDialogOpen(false);
            },
            onError: () => {
                toast.dismiss();
                toast.error(t(`Failed to ${actionType} timesheets`));
            }
        });
    };

    const toggleSelection = (approvalId: number) => {
        setSelectedApprovals(prev => 
            prev.includes(approvalId) 
                ? prev.filter(id => id !== approvalId)
                : [...prev, approvalId]
        );
    };

    const toggleSelectAll = () => {
        const pendingApprovals = approvals.data.filter(a => a.status === 'pending');
        if (selectedApprovals.length === pendingApprovals.length) {
            setSelectedApprovals([]);
        } else {
            setSelectedApprovals(pendingApprovals.map(a => a.id));
        }
    };

    const getStatusColor = (status: string) => {
        const colors = {
            pending: 'bg-yellow-100 text-yellow-800',
            approved: 'bg-green-100 text-green-800',
            rejected: 'bg-red-100 text-red-800'
        };
        return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
    };

    // Reusable approval dialog component
    const ApprovalDialog = ({ 
        approval, 
        action, 
        trigger 
    }: { 
        approval: TimesheetApproval; 
        action: 'approve' | 'reject'; 
        trigger: React.ReactNode; 
    }) => {
        const [dialogComments, setDialogComments] = useState('');
        const [isOpen, setIsOpen] = useState(false);

        return (
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                    {trigger}
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {action === 'approve' ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                                <XCircle className="h-5 w-5 text-red-600" />
                            )}
                            {action === 'approve' ? 'Approve' : 'Reject'} Timesheet
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <User className="h-4 w-4 text-gray-500" />
                                <span className="font-medium">{approval.timesheet.user.name}</span>
                            </div>
                            <div className="text-sm text-gray-600">
                                {new Date(approval.timesheet.start_date).toLocaleDateString()} - {new Date(approval.timesheet.end_date).toLocaleDateString()}
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">
                                {action === 'reject' ? 'Reason for rejection *' : 'Comments (optional)'}
                            </Label>
                            <Textarea
                                placeholder={action === 'reject' ? 'Please provide reason for rejection...' : 'Add approval comments...'}
                                value={dialogComments}
                                onChange={(e) => setDialogComments(e.target.value)}
                                rows={3}
                                className="resize-none"
                            />
                        </div>
                        
                        <div className="flex justify-end gap-3 pt-2">
                            <Button variant="outline" onClick={() => setIsOpen(false)}>
                                Cancel
                            </Button>
                            <Button 
                                variant={action === 'approve' ? 'default' : 'destructive'}
                                disabled={action === 'reject' && !dialogComments.trim()}
                                onClick={() => {
                                    handleSingleAction(action, approval.id, dialogComments);
                                    setDialogComments('');
                                    setIsOpen(false);
                                }}
                            >
                                {action === 'approve' ? 'Approve' : 'Reject'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        );
    };

    // Details modal component
    const DetailsModal = ({ approval }: { approval: TimesheetApproval }) => {
        const [isOpen, setIsOpen] = useState(false);

        return (
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                    <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                        <Eye className="h-4 w-4" />
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex items-center justify-between mr-5">
                            <DialogTitle>Approval Details</DialogTitle>
                            <Badge className={getStatusColor(approval.status)} variant="secondary">
                                {approval.status.charAt(0).toUpperCase() + approval.status.slice(1)}
                            </Badge>
                        </div>
                    </DialogHeader>
                    <div className="space-y-4">
                        {/* Employee & Period Info */}
                        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                            <div className="flex items-center gap-3">
                                <User className="h-5 w-5 text-gray-400" />
                                <div>
                                    <div className="text-sm text-gray-500">Employee</div>
                                    <div className="font-medium">{approval.timesheet.user.name}</div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <Calendar className="h-5 w-5 text-gray-400" />
                                <div>
                                    <div className="text-sm text-gray-500">Period</div>
                                    <div className="font-medium">
                                        {new Date(approval.timesheet.start_date).toLocaleDateString()} - {new Date(approval.timesheet.end_date).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center gap-3">
                                    <Timer className="h-5 w-5 text-blue-500" />
                                    <div>
                                        <div className="text-sm text-gray-500">Total Hours</div>
                                        <div className="font-medium text-lg">{approval.timesheet.total_hours}h</div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                    <DollarSign className="h-5 w-5 text-green-500" />
                                    <div>
                                        <div className="text-sm text-gray-500">Billable Hours</div>
                                        <div className="font-medium text-lg text-green-600">{approval.timesheet.billable_hours}h</div>
                                    </div>
                                </div>
                            </div>

                            {approval.timesheet.notes && (
                                <div className="pt-3 border-t">
                                    <div className="text-sm text-gray-500 mb-1">Timesheet Notes</div>
                                    <p className="text-gray-700 text-sm">{approval.timesheet.notes}</p>
                                </div>
                            )}
                        </div>

                        {/* Comments Only */}
                        {approval.comments && (
                            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                                <div className="text-sm text-gray-500 flex items-center gap-1">
                                    <MessageSquare className="h-4 w-4" />
                                    Comments
                                </div>
                                <div className="bg-white p-3 rounded-md">
                                    <p className="text-gray-700 text-sm">{approval.comments}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        );
    };

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Timesheets'), href: route('timesheets.index') },
        { title: t('Approvals') }
    ];

    return (
        <PageTemplate 
            title={t('Approvals')} 
            breadcrumbs={breadcrumbs}
            noPadding
        >
            <Head title={t('Timesheet Approvals')} />
            
            <div className="space-y-6">


            {/* Search and filters section */}
            <div className="bg-white rounded-lg shadow mb-4">
                <div className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <form onSubmit={handleSearch} className="flex gap-2">
                                <div className="relative w-64">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder={t('Search by employee name...')}
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
                            
                            <Label className="text-xs text-muted-foreground">Per Page:</Label>
                            <Select 
                                value={perPage} 
                                onValueChange={(value) => {
                                    setPerPage(value);
                                    const params: any = { page: 1, per_page: value, view: activeView };
                                    if (selectedStatus !== 'all') params.status = selectedStatus;
                                    if (searchTerm.trim()) params.search = searchTerm.trim();
                                    if (filters.from_date) params.from_date = filters.from_date;
                                    if (filters.to_date) params.to_date = filters.to_date;
                                    if (filters.sort_field) params.sort_field = filters.sort_field;
                                    if (filters.sort_direction) params.sort_direction = filters.sort_direction;
                                    router.get(route('timesheet-approvals.index'), params, { preserveState: false, preserveScroll: false });
                                }}
                            >
                                <SelectTrigger className="w-16 h-8">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="12">12</SelectItem>
                                    <SelectItem value="24">24</SelectItem>
                                    <SelectItem value="48">48</SelectItem>
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
                                            <SelectItem value="pending">{t('Pending')}</SelectItem>
                                            <SelectItem value="approved">{t('Approved')}</SelectItem>
                                            <SelectItem value="rejected">{t('Rejected')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label>From Date</Label>
                                    <Input
                                        type="date"
                                        value={filters.from_date || ''}
                                        onChange={(e) => {
                                            const params: any = { page: 1, per_page: perPage, view: activeView };
                                            if (searchTerm) params.search = searchTerm;
                                            if (selectedStatus !== 'all') params.status = selectedStatus;
                                            if (e.target.value) params.from_date = e.target.value;
                                            if (filters.to_date) params.to_date = filters.to_date;
                                            if (filters.sort_field) params.sort_field = filters.sort_field;
                                            if (filters.sort_direction) params.sort_direction = filters.sort_direction;
                                            router.get(route('timesheet-approvals.index'), params, { preserveState: false, preserveScroll: false });
                                        }}
                                        className="w-40"
                                    />
                                </div>
                                
                                <div className="space-y-2">
                                    <Label>To Date</Label>
                                    <Input
                                        type="date"
                                        value={filters.to_date || ''}
                                        onChange={(e) => {
                                            const params: any = { page: 1, per_page: perPage, view: activeView };
                                            if (searchTerm) params.search = searchTerm;
                                            if (selectedStatus !== 'all') params.status = selectedStatus;
                                            if (filters.from_date) params.from_date = filters.from_date;
                                            if (e.target.value) params.to_date = e.target.value;
                                            if (filters.sort_field) params.sort_field = filters.sort_field;
                                            if (filters.sort_direction) params.sort_direction = filters.sort_direction;
                                            router.get(route('timesheet-approvals.index'), params, { preserveState: false, preserveScroll: false });
                                        }}
                                        className="w-40"
                                    />
                                </div>
                                
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="h-9"
                                    onClick={clearFilters}
                                    disabled={!hasActiveFilters()}
                                >
                                    Reset Filters
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

                {/* Bulk Actions */}
                {selectedApprovals.length > 0 && canApprove && (
                    <Card className="border-l-4 border-l-blue-500 bg-blue-50/50">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                                        {selectedApprovals.length} selected
                                    </div>
                                    
                                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Badge 
                                                onClick={() => setActionType('approve')}
                                                className="bg-green-100 text-green-800 border border-green-300 cursor-pointer hover:bg-green-200 px-3 py-1.5"
                                            >
                                                <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                                                Bulk Approve
                                            </Badge>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle className="flex items-center gap-2">
                                                    {actionType === 'approve' ? (
                                                        <CheckCircle className="h-5 w-5 text-green-600" />
                                                    ) : (
                                                        <XCircle className="h-5 w-5 text-red-600" />
                                                    )}
                                                    {actionType === 'approve' ? 'Approve' : 'Reject'} Timesheets
                                                </DialogTitle>
                                            </DialogHeader>
                                            <div className="space-y-4">
                                                <p className="text-gray-600">
                                                    Are you sure you want to {actionType} {selectedApprovals.length} timesheet(s)?
                                                </p>
                                                <div className="space-y-2">
                                                    <Label className="text-sm font-medium">Comments</Label>
                                                    <Textarea
                                                        placeholder={`Add comments for ${actionType}...`}
                                                        value={comments}
                                                        onChange={(e) => setComments(e.target.value)}
                                                        rows={3}
                                                        className="resize-none"
                                                    />
                                                </div>
                                                <div className="flex justify-end gap-3 pt-2">
                                                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                                                        Cancel
                                                    </Button>
                                                    <Button 
                                                        variant={actionType === 'approve' ? 'default' : 'destructive'}
                                                        onClick={handleBulkAction}
                                                    >
                                                        {actionType === 'approve' ? 'Approve' : 'Reject'}
                                                    </Button>
                                                </div>
                                            </div>
                                        </DialogContent>
                                    </Dialog>

                                    <Badge 
                                        onClick={() => {
                                            setActionType('reject');
                                            setIsDialogOpen(true);
                                        }}
                                        className="bg-red-100 text-red-800 border border-red-300 cursor-pointer hover:bg-red-200 px-3 py-1.5"
                                    >
                                        <XCircle className="h-3.5 w-3.5 mr-1.5" />
                                        Bulk Reject
                                    </Badge>
                                </div>

                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={toggleSelectAll}
                                >
                                    {selectedApprovals.length === approvals.data.filter(a => a.status === 'pending').length && approvals.data.filter(a => a.status === 'pending').length > 0
                                        ? 'Deselect All' 
                                        : 'Select All Pending'
                                    }
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
                {/* Approvals Content */}
                {(activeView === 'grid' || !activeView) ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-3">
                        {approvals?.data?.map((approval: TimesheetApproval) => (
                            <Card key={approval.id} className="hover:shadow-md transition-shadow flex flex-col h-full">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {approval.status === 'pending' && canApprove && (
                                                <Checkbox
                                                    checked={selectedApprovals.includes(approval.id)}
                                                    onCheckedChange={() => toggleSelection(approval.id)}
                                                />
                                            )}
                                            <CardTitle className="text-sm font-medium">
                                                {approval.timesheet.user.name}
                                            </CardTitle>
                                        </div>
                                        <Badge className={getStatusColor(approval.status)} variant="secondary">
                                            {approval.status.charAt(0).toUpperCase() + approval.status.slice(1)}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                
                                <CardContent className="pt-0 pb-3 flex flex-col flex-1">
                                    <div className="text-xs text-gray-500 mb-2">
                                        {new Date(approval.timesheet.start_date).toLocaleDateString()} - {new Date(approval.timesheet.end_date).toLocaleDateString()}
                                    </div>
                                    
                                    <div className="flex justify-between text-sm mb-2">
                                        <span>Total: <strong>{approval.timesheet.total_hours}h</strong></span>
                                        <span>Billable: <strong className="text-green-600">{approval.timesheet.billable_hours}h</strong></span>
                                    </div>
                                    
                                    <div className="flex gap-1 mt-auto">
                                        {approval.status === 'pending' && canApprove ? (
                                            <>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div>
                                                            <ApprovalDialog
                                                                approval={approval}
                                                                action="approve"
                                                                trigger={
                                                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50">
                                                                        <Check className="h-4 w-4" />
                                                                    </Button>
                                                                }
                                                            />
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Approve</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div>
                                                            <ApprovalDialog
                                                                approval={approval}
                                                                action="reject"
                                                                trigger={
                                                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50">
                                                                        <X className="h-4 w-4" />
                                                                    </Button>
                                                                }
                                                            />
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Reject</TooltipContent>
                                                </Tooltip>
                                            </>
                                        ) : null}
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div>
                                                    <DetailsModal approval={approval} />
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent>View Details</TooltipContent>
                                        </Tooltip>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-50 border-b hover:bg-gray-50">
                                        {canApprove && (
                                            <TableHead className="w-12 py-2.5">
                                                <Checkbox
                                                    checked={selectedApprovals.length === approvals.data.filter(a => a.status === 'pending').length && approvals.data.filter(a => a.status === 'pending').length > 0}
                                                    onCheckedChange={toggleSelectAll}
                                                />
                                            </TableHead>
                                        )}
                                        <TableHead className="w-12 py-2.5 font-semibold">#</TableHead>
                                        <TableHead 
                                            className="py-2.5 font-semibold cursor-pointer select-none"
                                            onClick={() => handleSort('user_name')}
                                        >
                                            <div className="flex items-center">
                                                {t('Employee')}
                                                {filters.sort_field === 'user_name' ? (
                                                    filters.sort_direction === 'asc' ? (
                                                        <ChevronUp className="ml-1 h-4 w-4" />
                                                    ) : (
                                                        <ChevronDown className="ml-1 h-4 w-4" />
                                                    )
                                                ) : (
                                                    <ChevronsUpDown className="ml-1 h-4 w-4 opacity-50" />
                                                )}
                                            </div>
                                        </TableHead>
                                        <TableHead 
                                            className="py-2.5 font-semibold cursor-pointer select-none"
                                            onClick={() => handleSort('start_date')}
                                        >
                                            <div className="flex items-center">
                                                {t('Period')}
                                                {filters.sort_field === 'start_date' ? (
                                                    filters.sort_direction === 'asc' ? (
                                                        <ChevronUp className="ml-1 h-4 w-4" />
                                                    ) : (
                                                        <ChevronDown className="ml-1 h-4 w-4" />
                                                    )
                                                ) : (
                                                    <ChevronsUpDown className="ml-1 h-4 w-4 opacity-50" />
                                                )}
                                            </div>
                                        </TableHead>
                                        <TableHead 
                                            className="py-2.5 font-semibold cursor-pointer select-none"
                                            onClick={() => handleSort('total_hours')}
                                        >
                                            <div className="flex items-center">
                                                {t('Total Hours')}
                                                {filters.sort_field === 'total_hours' ? (
                                                    filters.sort_direction === 'asc' ? (
                                                        <ChevronUp className="ml-1 h-4 w-4" />
                                                    ) : (
                                                        <ChevronDown className="ml-1 h-4 w-4" />
                                                    )
                                                ) : (
                                                    <ChevronsUpDown className="ml-1 h-4 w-4 opacity-50" />
                                                )}
                                            </div>
                                        </TableHead>
                                        <TableHead 
                                            className="py-2.5 font-semibold cursor-pointer select-none"
                                            onClick={() => handleSort('billable_hours')}
                                        >
                                            <div className="flex items-center">
                                                {t('Billable Hours')}
                                                {filters.sort_field === 'billable_hours' ? (
                                                    filters.sort_direction === 'asc' ? (
                                                        <ChevronUp className="ml-1 h-4 w-4" />
                                                    ) : (
                                                        <ChevronDown className="ml-1 h-4 w-4" />
                                                    )
                                                ) : (
                                                    <ChevronsUpDown className="ml-1 h-4 w-4 opacity-50" />
                                                )}
                                            </div>
                                        </TableHead>
                                        <TableHead className="py-2.5 font-semibold">{t('Status')}</TableHead>
                                        <TableHead className="py-2.5 font-semibold text-right">{t('Actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {approvals?.data?.map((approval: TimesheetApproval, index: number) => (
                                        <TableRow key={approval.id} className="hover:bg-gray-50 transition-colors">
                                            {canApprove && (
                                                <TableCell className="py-2.5">
                                                    {approval.status === 'pending' && (
                                                        <Checkbox
                                                            checked={selectedApprovals.includes(approval.id)}
                                                            onCheckedChange={() => toggleSelection(approval.id)}
                                                        />
                                                    )}
                                                </TableCell>
                                            )}
                                            <TableCell className="font-medium py-2.5">{(approvals?.from || 1) + index}</TableCell>
                                            <TableCell className="py-2.5">
                                                <div className="flex items-center gap-2">
                                                    <User className="h-4 w-4 text-gray-400" />
                                                    <div>
                                                        <div className="font-medium text-gray-900">{approval.timesheet.user.name}</div>
                                                        <div className="text-sm text-gray-500">ID: {approval.timesheet.id}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-2.5">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-4 w-4 text-gray-400" />
                                                    <div className="text-sm">
                                                        {new Date(approval.timesheet.start_date).toLocaleDateString()} - {new Date(approval.timesheet.end_date).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-2.5">
                                                <div className="flex items-center gap-2">
                                                    <Timer className="h-4 w-4 text-blue-500" />
                                                    <span className="font-medium">{approval.timesheet.total_hours}h</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-2.5">
                                                <div className="flex items-center gap-2">
                                                    <DollarSign className="h-4 w-4 text-green-500" />
                                                    <span className="font-medium text-green-600">{approval.timesheet.billable_hours}h</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-2.5">
                                                <Badge className={`${getStatusColor(approval.status)} border-0`} variant="secondary">
                                                    {approval.status.charAt(0).toUpperCase() + approval.status.slice(1)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="py-2.5 text-right">
                                                <div className="flex gap-1 justify-end">
                                                    {approval.status === 'pending' && canApprove ? (
                                                        <>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <div>
                                                                        <ApprovalDialog
                                                                            approval={approval}
                                                                            action="approve"
                                                                            trigger={
                                                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50">
                                                                                    <Check className="h-4 w-4" />
                                                                                </Button>
                                                                            }
                                                                        />
                                                                    </div>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Approve</TooltipContent>
                                                            </Tooltip>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <div>
                                                                        <ApprovalDialog
                                                                            approval={approval}
                                                                            action="reject"
                                                                            trigger={
                                                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50">
                                                                                    <X className="h-4 w-4" />
                                                                                </Button>
                                                                            }
                                                                        />
                                                                    </div>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Reject</TooltipContent>
                                                            </Tooltip>
                                                        </>
                                                    ) : null}
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div>
                                                                <DetailsModal approval={approval} />
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent>View Details</TooltipContent>
                                                    </Tooltip>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}

                {/* Empty State */}
                {approvals?.data?.length === 0 && (
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-12 text-center">
                            <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                                <Clock className="h-8 w-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No timesheet approvals found</h3>
                            <p className="text-gray-500 mb-4">
                                {selectedStatus !== 'all' 
                                    ? 'Try changing the status filter to see more results'
                                    : 'There are no timesheet approvals to review at the moment'
                                }
                            </p>
                            {hasActiveFilters() && (
                                <Button variant="outline" onClick={clearFilters}>
                                    Clear Filters
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Pagination */}
                {approvals?.links && approvals.data.length > 0 && (
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-4">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="text-sm text-gray-600">
                                    Showing <span className="font-medium text-gray-900">{approvals?.from || 0}</span> to <span className="font-medium text-gray-900">{approvals?.to || 0}</span> of <span className="font-medium text-gray-900">{approvals?.total || 0}</span> approvals
                                </div>
                                
                                <div className="flex gap-1">
                                    {approvals?.links?.map((link: any, i: number) => {
                                        const isTextLink = link.label === "&laquo; Previous" || link.label === "Next &raquo;";
                                        const label = link.label.replace("&laquo; ", "").replace(" &raquo;", "");
                                        
                                        return (
                                            <Button
                                                key={i}
                                                variant={link.active ? 'default' : 'outline'}
                                                size={isTextLink ? "sm" : "icon"}
                                                className={`${isTextLink ? "px-3" : "h-9 w-9"} ${link.active ? 'bg-primary hover:bg-primary/90' : ''}`}
                                                disabled={!link.url}
                                                onClick={() => {
                                                    if (link.url) {
                                                        const url = new URL(link.url, window.location.origin);
                                                        const params = new URLSearchParams(url.search);
                                                        
                                                        // Preserve current filters
                                                        if (selectedStatus !== 'all') params.set('status', selectedStatus);
                                                        if (searchTerm.trim()) params.set('search', searchTerm.trim());
                                                        if (filters.from_date) params.set('from_date', filters.from_date);
                                                        if (filters.to_date) params.set('to_date', filters.to_date);
                                                        if (filters.sort_field) params.set('sort_field', filters.sort_field);
                                                        if (filters.sort_direction) params.set('sort_direction', filters.sort_direction);
                                                        params.set('view', activeView);
                                                        params.set('per_page', perPage);
                                                        
                                                        router.get(`${url.pathname}?${params.toString()}`);
                                                    }
                                                }}
                                            >
                                                {isTextLink ? label : <span dangerouslySetInnerHTML={{ __html: link.label }} />}
                                            </Button>
                                        );
                                    })}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

        </PageTemplate>
    );
}