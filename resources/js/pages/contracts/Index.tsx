import { useState, useEffect, useMemo, useRef } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Search, Filter, Eye, Edit, Trash2, LayoutGrid, List, Copy, FileText } from 'lucide-react';
import { PageTemplate } from '@/components/page-template';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { CrudTable } from '@/components/CrudTable';
import { toast } from '@/components/custom-toast';
import { hasPermission } from '@/utils/authorization';
import { useTranslation } from 'react-i18next';
import TaskFileUpload, { TaskFileItem } from '@/components/tasks/TaskFileUpload';

interface Contract {
    id: number;
    contract_id: string;
    subject: string;
    contract_value: number;
    currency: string;
    start_date: string;
    end_date: string;
    status: string;
    contract_type: {
        id: number;
        name: string;
        color: string;
    };
    client: {
        id: number;
        name: string;
        email: string;
    };
    creator: {
        id: number;
        name: string;
    };
    notes_count: number;
    comments_count: number;
    attachments_count: number;
    attachments?: any[];
    created_at: string;
}

const statusOptions = [
    { value: 'pending', label: 'Pending', color: '#ffc107' },
    { value: 'sent', label: 'Sent', color: '#007bff' },
    { value: 'accept', label: 'Accept', color: '#28a745' },
    { value: 'decline', label: 'Decline', color: '#dc3545' },
    { value: 'expired', label: 'Expired', color: '#fd7e14' },
];

export default function ContractsIndex() {
    const { t } = useTranslation();
    const { auth, contracts, contractTypes, clients, projects, filters: pageFilters = {}, errors, flash } = usePage().props as any;
    const permissions = auth?.permissions || [];
    
    const [activeView, setActiveView] = useState(pageFilters.view_mode || 'grid');
    const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
    const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || 'all');
    const [selectedType, setSelectedType] = useState(pageFilters.contract_type_id || 'all');
    const [selectedClient, setSelectedClient] = useState(pageFilters.client_id || 'all');
    const [selectedProject, setSelectedProject] = useState(pageFilters.project_id || 'all');
    const [perPage, setPerPage] = useState(pageFilters.per_page?.toString() || '12');
    const [filteredProjects, setFilteredProjects] = useState([]);
    const [showFilters, setShowFilters] = useState(false);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<any>(null);
    const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');
    const [formClientId, setFormClientId] = useState<string | null>(null);
    const [formProjects, setFormProjects] = useState([]);
    const [modalKey, setModalKey] = useState(0);
    const [contractFiles, setContractFiles] = useState<TaskFileItem[]>([]);
    const [isFilesModalOpen, setIsFilesModalOpen] = useState(false);
    const [filesContract, setFilesContract] = useState<any | null>(null);
    const contractFilesRef = useRef<TaskFileItem[]>([]);
    const formModeRef = useRef<'create' | 'edit' | 'view'>('create');

    contractFilesRef.current = contractFiles;
    formModeRef.current = formMode;

    const getAttachmentSize = (attachment: any): number => {
        const size =
            attachment.media_item?.size ??
            attachment.mediaItem?.size ??
            attachment.size ??
            0;

        return typeof size === 'number' ? size : Number(size) || 0;
    };

    const mapAttachmentToTaskFile = (attachment: any): TaskFileItem => ({
        id: attachment.media_item?.id || attachment.mediaItem?.id || attachment.media_item_id || attachment.id,
        media_id: attachment.media_item?.id || attachment.mediaItem?.id || attachment.media_item_id,
        attachment_id: attachment.id,
        name: attachment.media_item?.name || attachment.mediaItem?.name || attachment.name || 'file',
        url: attachment.media_item?.url || attachment.mediaItem?.url || attachment.url || route('contract-attachments.preview', attachment.id),
        thumb_url: attachment.media_item?.thumb_url || attachment.mediaItem?.thumb_url || attachment.url || route('contract-attachments.preview', attachment.id),
        preview_url: route('contract-attachments.preview', attachment.id),
        download_url: route('contract-attachments.download', attachment.id),
        mime_type: attachment.media_item?.mime_type || attachment.mediaItem?.mime_type || attachment.mime_type || '',
        size: getAttachmentSize(attachment)
    });

    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
    }, [flash]);

    useEffect(() => {
        if (selectedClient !== 'all') {
            const clientProjects = projects?.filter((project: any) => {
                if (!project.clients || !Array.isArray(project.clients) || project.clients.length === 0) {
                    return false;
                }
                return project.clients.some((client: any) => client.id?.toString() === selectedClient);
            }) || [];
            setFilteredProjects(clientProjects);
            if (selectedProject !== 'all' && !clientProjects.find((p: any) => p.id.toString() === selectedProject)) {
                setSelectedProject('all');
            }
        } else {
            setFilteredProjects([]);
        }
    }, [selectedClient, projects]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };
    
    const applyFilters = () => {
        const params: any = { page: 1 };
        
        if (searchTerm) params.search = searchTerm;
        if (selectedStatus !== 'all') params.status = selectedStatus;
        if (selectedType !== 'all') params.contract_type_id = selectedType;
        if (selectedClient !== 'all') params.client_id = selectedClient;
        if (selectedProject !== 'all') params.project_id = selectedProject;
        if (perPage) params.per_page = perPage;
        if (pageFilters.sort_field) params.sort_field = pageFilters.sort_field;
        if (pageFilters.sort_direction) params.sort_direction = pageFilters.sort_direction;
        params.view_mode = activeView;
        
        router.get(route('contracts.index'), params, { preserveState: false, preserveScroll: false });
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
        if (selectedType !== 'all') params.contract_type_id = selectedType;
        if (selectedClient !== 'all') params.client_id = selectedClient;
        if (selectedProject !== 'all') params.project_id = selectedProject;
        if (perPage) params.per_page = perPage;
        params.view_mode = activeView;
        
        router.get(route('contracts.index'), params, { preserveState: true, preserveScroll: true });
    };
    
    const handleStatusFilter = (value: string) => {
        setSelectedStatus(value);
        const params: any = { page: 1 };
        if (searchTerm) params.search = searchTerm;
        if (value !== 'all') params.status = value;
        if (selectedType !== 'all') params.contract_type_id = selectedType;
        if (selectedClient !== 'all') params.client_id = selectedClient;
        if (selectedProject !== 'all') params.project_id = selectedProject;
        if (perPage) params.per_page = perPage;
        if (pageFilters.sort_field) params.sort_field = pageFilters.sort_field;
        if (pageFilters.sort_direction) params.sort_direction = pageFilters.sort_direction;
        params.view_mode = activeView;
        router.get(route('contracts.index'), params, { preserveState: false, preserveScroll: false });
    };
    
    const handleResetFilters = () => {
        setSearchTerm('');
        setSelectedStatus('all');
        setSelectedType('all');
        setSelectedClient('all');
        setSelectedProject('all');
        setShowFilters(false);
        const params: any = { page: 1 };
        if (perPage) params.per_page = perPage;
        params.view_mode = activeView;
        router.get(route('contracts.index'), params, { preserveState: false, preserveScroll: false });
    };

    const handleAction = async (action: string, item: any) => {
        setCurrentItem(item);
        switch (action) {
            case 'files': {
                try {
                    const response = await fetch(route('contracts.show', item.id), {
                        headers: {
                            Accept: 'application/json',
                            'X-Requested-With': 'XMLHttpRequest'
                        },
                        credentials: 'same-origin'
                    });
                    const data = await response.json();
                    setFilesContract(data.contract);
                    setIsFilesModalOpen(true);
                } catch (error) {
                    toast.error(t('Failed to load contract files'));
                }
                break;
            }
            case 'view':
                router.get(route('contracts.show', item.id));
                break;
            case 'edit': {
                setFormMode('edit');
                let editableItem = item;
                try {
                    const response = await fetch(route('contracts.show', item.id), {
                        headers: {
                            Accept: 'application/json',
                            'X-Requested-With': 'XMLHttpRequest'
                        },
                        credentials: 'same-origin'
                    });
                    const data = await response.json();
                    editableItem = data.contract || item;
                } catch (error) {
                    // Fall back to row payload
                }

                const clientId = editableItem.client_id?.toString() || null;
                setFormClientId(clientId);
                if (clientId) {
                    const clientProjects = projects?.filter((project: any) => 
                        project.clients?.some((client: any) => client.id?.toString() === clientId)
                    ) || [];
                    setFormProjects(clientProjects);
                } else {
                    setFormProjects([]);
                }
                setCurrentItem(editableItem);
                setContractFiles((editableItem.attachments || []).map(mapAttachmentToTaskFile));
                setModalKey(prev => prev + 1);
                setIsFormModalOpen(true);
                break;
            }
            case 'delete':
                setIsDeleteModalOpen(true);
                break;
            case 'duplicate':
                toast.loading(t('Duplicating contract...'));
                router.post(route('contracts.duplicate', item.id), {}, {
                    onSuccess: () => {
                        toast.dismiss();
                        router.reload();
                    },
                    onError: () => {
                        toast.dismiss();
                        toast.error(t('Failed to duplicate contract'));
                    }
                });
                break;
            case 'send':
                router.post(route('contracts.send-contract-email', item.id));
                break;
        }
    };
    
    const handleAddNew = () => {
        setCurrentItem(null);
        setFormMode('create');
        setFormClientId(null);
        setFormProjects([]);
        setContractFiles([]);
        setModalKey(prev => prev + 1);
        setIsFormModalOpen(true);
    };
    
    const handleFormSubmit = (formData: any) => {
        const mediaItemIds = Array.from(
            new Set(
                contractFiles
                    .map((file) => Number(file.media_id ?? file.id))
                    .filter((id) => Number.isFinite(id) && id > 0)
            )
        );
        const submitData = {
            ...formData,
            media_item_ids: mediaItemIds
        };

        if (formMode === 'create') {
            toast.loading(t('Creating contract...'));
            router.post(route('contracts.store'), submitData, {
                onSuccess: () => {
                    setIsFormModalOpen(false);
                    toast.dismiss();
                },
                onError: (errors) => {
                    toast.dismiss();
                    toast.error(t('Failed to create contract'));
                }
            });
        } else if (formMode === 'edit') {
            toast.loading(t('Updating contract...'));
            router.put(route('contracts.update', currentItem.id), submitData, {
                onSuccess: () => {
                    setIsFormModalOpen(false);
                    toast.dismiss();
                },
                onError: (errors) => {
                    toast.dismiss();
                    toast.error(t('Failed to update contract'));
                }
            });
        }
    };
    
    const handleDeleteConfirm = () => {
        toast.loading(t('Deleting contract...'));
        router.delete(route('contracts.destroy', currentItem.id), {
            onSuccess: () => {
                setIsDeleteModalOpen(false);
                toast.dismiss();
            },
            onError: (errors) => {
                toast.dismiss();
                toast.error(t('Failed to delete contract'));
            }
        });
    };
    
    const hasActiveFilters = () => {
        return selectedStatus !== 'all' || selectedType !== 'all' || selectedClient !== 'all' || selectedProject !== 'all' || searchTerm !== '';
    };
    
    const activeFilterCount = () => {
        return (selectedStatus !== 'all' ? 1 : 0) + (selectedType !== 'all' ? 1 : 0) + (selectedClient !== 'all' ? 1 : 0) + (selectedProject !== 'all' ? 1 : 0) + (searchTerm ? 1 : 0);
    };

    const getStatusColor = (status: string) => {
        const colors = {
            pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
            sent: 'bg-blue-100 text-blue-800 border-blue-300',
            accept: 'bg-green-100 text-green-800 border-green-300',
            decline: 'bg-red-100 text-red-800 border-red-300',
            expired: 'bg-orange-100 text-orange-800 border-orange-300',
        };
        return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-300';
    };

    const getStatusBadge = (status: string) => {
        const statusOption = statusOptions.find(s => s.value === status);
        const label = statusOption?.label || status.charAt(0).toUpperCase() + status.slice(1);
        return (
            <Badge className={getStatusColor(status)} variant="secondary">
                {label}
            </Badge>
        );
    };

    const pageActions = [];
    
    if (hasPermission(permissions, 'contract_create')) {
        pageActions.push({
            label: t('Add Contract'),
            icon: <Plus className="h-4 w-4 mr-2" />,
            variant: 'default',
            onClick: handleAddNew
        });
    }
    
    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Contracts') }
    ];

    const contractInitialData = useMemo(() => {
        if (currentItem) return currentItem;
        return { status: 'pending' };
    }, [currentItem]);

    const contractFormConfig = useMemo(() => ({
        fields: [
            { name: 'subject', label: t('Subject'), type: 'text', required: true },
            { name: 'description', label: t('Description'), type: 'textarea' },
            {
                name: 'contract_type_id',
                label: t('Contract Type'),
                type: 'select',
                options: contractTypes?.map((type: any) => ({ value: type.id, label: type.name })) || [],
                required: true
            },
            { name: 'contract_value', label: t('Contract Value'), type: 'number', min: 0, required: true },
            { name: 'start_date', label: t('Start Date'), type: 'date', required: true },
            { name: 'end_date', label: t('End Date'), type: 'date', required: true },
            {
                name: 'client_id',
                label: t('Client'),
                type: 'select',
                options: clients?.map((client: any) => ({ value: client.id, label: client.name })) || [],
                required: true
            },
            {
                name: 'project_id',
                label: t('Project'),
                type: 'select',
                options: [],
                placeholder: t('Select project'),
                render: (field: any, formData: any, handleChange: any) => {
                    const resolvedClientId =
                        formData.client_id ??
                        currentItem?.client_id ??
                        currentItem?.client?.id ??
                        null;
                    const clientId = resolvedClientId ? String(resolvedClientId) : '';
                    const filteredProjects = clientId
                        ? projects?.filter((project: any) => {
                            if (Array.isArray(project.clients) && project.clients.length > 0) {
                                return project.clients.some((client: any) => String(client.id) === clientId);
                            }
                            return String(project.client_id ?? '') === clientId;
                        }) || []
                        : [];

                    const projectOptions = filteredProjects.map((project: any) => ({
                        value: project.id,
                        label: project.title
                    }));

                    return (
                        <Select
                            value={formData[field.name] ? String(formData[field.name]) : ''}
                            onValueChange={(value) => handleChange(field.name, value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={t('Select project')} />
                            </SelectTrigger>
                            <SelectContent className="z-[60000]">
                                {projectOptions.length > 0 ? (
                                    projectOptions.map((option: any) => (
                                        <SelectItem key={option.value} value={String(option.value)}>
                                            {option.label}
                                        </SelectItem>
                                    ))
                                ) : (
                                    <SelectItem value="__no_projects" disabled>
                                        {clientId ? t('No projects available') : t('Select client first')}
                                    </SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    );
                }
            },
            {
                name: 'attachments',
                label: t('Files'),
                type: 'custom',
                render: () => (
                    <div className="space-y-2">
                        <Label>{t('Files')}</Label>
                        <TaskFileUpload
                            mode={formModeRef.current === 'view' ? 'view' : 'edit'}
                            files={contractFilesRef.current}
                            onFilesChange={(nextFiles) => {
                                setContractFiles(nextFiles);
                            }}
                            onRemoveFile={(file) => {
                                if (formModeRef.current === 'create') {
                                    setContractFiles((prev) => prev.filter((f) => f.id !== file.id));
                                    return;
                                }

                                if (!file.attachment_id) {
                                    setContractFiles((prev) => prev.filter((f) => f.id !== file.id));
                                    return;
                                }

                                router.delete(route('contract-attachments.destroy', file.attachment_id), {
                                    preserveState: true,
                                    preserveScroll: true,
                                    onSuccess: () => {
                                        setContractFiles((prev) => prev.filter((f) => f.id !== file.id));
                                    }
                                });
                            }}
                        />
                    </div>
                )
            }
        ],
        modalSize: 'xl'
    }), [t, contractTypes, clients, projects, currentItem]);
    
    return (
        <PageTemplate 
            title={t('Contracts')} 
            url="/contracts"
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
                                {contracts?.total || 0}
                            </div>
                            <div className="text-xs text-gray-600">{t('Total Contracts')}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xl font-bold text-green-600">
                                {contracts?.data?.filter((contract: any) => contract.status === 'signed').length || 0}
                            </div>
                            <div className="text-xs text-gray-600">{t('Signed')}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xl font-bold text-blue-600">
                                {contracts?.data?.filter((contract: any) => contract.status === 'sent').length || 0}
                            </div>
                            <div className="text-xs text-gray-600">{t('Sent')}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xl font-bold text-yellow-600">
                                {contracts?.data?.filter((contract: any) => contract.status === 'pending').length || 0}
                            </div>
                            <div className="text-xs text-gray-600">{t('Pending')}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xl font-bold text-red-600">
                                {contracts?.data?.filter((contract: any) => contract.status === 'expired').length || 0}
                            </div>
                            <div className="text-xs text-gray-600">{t('Expired')}</div>
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
                                        placeholder={t('Search contracts...')}
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
                                    onClick={() => {
                                        setActiveView('list');
                                        const params: any = { view_mode: 'list' };
                                        if (searchTerm) params.search = searchTerm;
                                        if (selectedStatus !== 'all') params.status = selectedStatus;
                                        if (selectedType !== 'all') params.contract_type_id = selectedType;
                                        if (selectedClient !== 'all') params.client_id = selectedClient;
                                        if (selectedProject !== 'all') params.project_id = selectedProject;
                                        if (perPage) params.per_page = perPage;
                                        if (pageFilters.sort_field) params.sort_field = pageFilters.sort_field;
                                        if (pageFilters.sort_direction) params.sort_direction = pageFilters.sort_direction;
                                        router.get(route('contracts.index'), params, { preserveState: true, preserveScroll: true });
                                    }}
                                >
                                    <List className="h-4 w-4" />
                                </Button>
                                <Button 
                                    size="sm" 
                                    variant={activeView === 'grid' ? "default" : "ghost"}
                                    className="h-7 px-2"
                                    onClick={() => {
                                        setActiveView('grid');
                                        const params: any = { view_mode: 'grid' };
                                        if (searchTerm) params.search = searchTerm;
                                        if (selectedStatus !== 'all') params.status = selectedStatus;
                                        if (selectedType !== 'all') params.contract_type_id = selectedType;
                                        if (selectedClient !== 'all') params.client_id = selectedClient;
                                        if (selectedProject !== 'all') params.project_id = selectedProject;
                                        if (perPage) params.per_page = perPage;
                                        if (pageFilters.sort_field) params.sort_field = pageFilters.sort_field;
                                        if (pageFilters.sort_direction) params.sort_direction = pageFilters.sort_direction;
                                        router.get(route('contracts.index'), params, { preserveState: true, preserveScroll: true });
                                    }}
                                >
                                    <LayoutGrid className="h-4 w-4" />
                                </Button>
                            </div>
                            
                            <Label className="text-xs text-muted-foreground">{t('Per Page')}:</Label>
                            <Select 
                                value={perPage} 
                                onValueChange={(value) => {
                                    setPerPage(value);
                                    const params: any = { page: 1, per_page: parseInt(value) };
                                    if (searchTerm) params.search = searchTerm;
                                    if (selectedStatus !== 'all') params.status = selectedStatus;
                                    if (selectedType !== 'all') params.contract_type_id = selectedType;
                                    if (selectedClient !== 'all') params.client_id = selectedClient;
                                    if (selectedProject !== 'all') params.project_id = selectedProject;
                                    if (pageFilters.sort_field) params.sort_field = pageFilters.sort_field;
                                    if (pageFilters.sort_direction) params.sort_direction = pageFilters.sort_direction;
                                    params.view_mode = activeView;
                                    router.get(route('contracts.index'), params, { preserveState: false, preserveScroll: false });
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
                                            {statusOptions.map(status => (
                                                <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label>{t('Type')}</Label>
                                    <Select value={selectedType} onValueChange={(value) => {
                                        setSelectedType(value);
                                        const params: any = { page: 1 };
                                        if (searchTerm) params.search = searchTerm;
                                        if (selectedStatus !== 'all') params.status = selectedStatus;
                                        if (value !== 'all') params.contract_type_id = value;
                                        if (selectedClient !== 'all') params.client_id = selectedClient;
                                        if (selectedProject !== 'all') params.project_id = selectedProject;
                                        if (perPage) params.per_page = perPage;
                                        if (pageFilters.sort_field) params.sort_field = pageFilters.sort_field;
                                        if (pageFilters.sort_direction) params.sort_direction = pageFilters.sort_direction;
                                        params.view_mode = activeView;
                                        router.get(route('contracts.index'), params, { preserveState: false, preserveScroll: false });
                                    }}>
                                        <SelectTrigger className="w-40">
                                            <SelectValue placeholder={t('All Types')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('All Types')}</SelectItem>
                                            {contractTypes?.map((type: any) => (
                                                <SelectItem key={type.id} value={type.id.toString()}>{type.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label>{t('Client')}</Label>
                                    <Select value={selectedClient} onValueChange={(value) => {
                                        setSelectedClient(value);
                                        const params: any = { page: 1 };
                                        if (searchTerm) params.search = searchTerm;
                                        if (selectedStatus !== 'all') params.status = selectedStatus;
                                        if (selectedType !== 'all') params.contract_type_id = selectedType;
                                        if (value !== 'all') params.client_id = value;
                                        if (selectedProject !== 'all') params.project_id = selectedProject;
                                        if (perPage) params.per_page = perPage;
                                        if (pageFilters.sort_field) params.sort_field = pageFilters.sort_field;
                                        if (pageFilters.sort_direction) params.sort_direction = pageFilters.sort_direction;
                                        params.view_mode = activeView;
                                        router.get(route('contracts.index'), params, { preserveState: false, preserveScroll: false });
                                    }}>
                                        <SelectTrigger className="w-40">
                                            <SelectValue placeholder={t('All Clients')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('All Clients')}</SelectItem>
                                            {clients?.map((client: any) => (
                                                <SelectItem key={client.id} value={client.id.toString()}>{client.name}</SelectItem>
                                            ))}
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
                                        if (selectedType !== 'all') params.contract_type_id = selectedType;
                                        if (selectedClient !== 'all') params.client_id = selectedClient;
                                        if (value !== 'all') params.project_id = value;
                                        if (perPage) params.per_page = perPage;
                                        if (pageFilters.sort_field) params.sort_field = pageFilters.sort_field;
                                        if (pageFilters.sort_direction) params.sort_direction = pageFilters.sort_direction;
                                        params.view_mode = activeView;
                                        router.get(route('contracts.index'), params, { preserveState: false, preserveScroll: false });
                                    }}>
                                        <SelectTrigger className="w-40">
                                            <SelectValue placeholder={t('All Projects')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('All Projects')}</SelectItem>
                                            {filteredProjects?.map((project: any) => (
                                                <SelectItem key={project.id} value={project.id.toString()}>{project.title}</SelectItem>
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

            {/* Contracts Content */}
            {(activeView === 'grid' || !activeView) ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {contracts?.data?.map((contract: any) => (
                    <Card key={contract.id} className="overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                        <CardHeader className="pb-1">
                            <div className="flex justify-between items-start gap-2">
                                <CardTitle 
                                    className="text-base line-clamp-2 cursor-pointer hover:text-blue-600 transition-colors flex items-center gap-2 flex-1 font-bold"
                                    onClick={() => router.get(route('contracts.show', contract.id))}
                                >
                                    <div 
                                        className="w-3 h-3 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: contract.contract_type?.color }}
                                    />
                                    <span>{contract.subject}</span>
                                </CardTitle>
                                <div className="flex-shrink-0">
                                    {getStatusBadge(contract.status)}
                                </div>
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                                {t('By')} {contract.creator?.name} • {new Date(contract.created_at).toLocaleDateString()}
                            </div>
                        </CardHeader>
                        
                        <CardContent className="py-2 flex-grow">
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <Badge 
                                        variant="secondary" 
                                        style={{ backgroundColor: '#007bff20', color: '#007bff' }}
                                    >
                                        {contract.contract_type?.name}
                                    </Badge>
                                    <span className="text-muted-foreground text-xs">
                                        {new Date(contract.end_date).toLocaleDateString()}
                                    </span>
                                </div>
                                
                                <div>
                                    <span className="font-bold text-green-600 text-base">
                                        ${contract.contract_value?.toLocaleString()}
                                    </span>
                                </div>
                                
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    <span>{contract.notes_count} {t('notes')}</span>
                                    <span>{contract.comments_count} {t('comments')}</span>
                                    <span>{contract.attachments_count} {t('files')}</span>
                                </div>
                            </div>
                        </CardContent>
                        
                        <CardFooter className="flex justify-end gap-1 pt-1 pb-1 mt-auto">
                            {hasPermission(permissions, 'contract_view') && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleAction('files', contract)}
                                            className="text-slate-500 hover:text-slate-700 h-8 w-8"
                                        >
                                            <FileText className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>{t('Files')}</TooltipContent>
                                </Tooltip>
                            )}
                            {hasPermission(permissions, 'contract_create') && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            onClick={() => handleAction('duplicate', contract)}
                                            className="text-green-500 hover:text-green-700 h-8 w-8"
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>{t('Duplicate')}</TooltipContent>
                                </Tooltip>
                            )}
                            {hasPermission(permissions, 'contract_view') && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            onClick={() => handleAction('view', contract)}
                                            className="text-blue-500 hover:text-blue-700 h-8 w-8"
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>{t('View')}</TooltipContent>
                                </Tooltip>
                            )}
                            {hasPermission(permissions, 'contract_update') && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            onClick={() => handleAction('edit', contract)}
                                            className="text-amber-500 hover:text-amber-700 h-8 w-8"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>{t('Edit')}</TooltipContent>
                                </Tooltip>
                            )}
                            {hasPermission(permissions, 'contract_delete') && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button 
                                            variant="ghost" 
                                            size="icon"
                                            className="text-red-500 hover:text-red-700 h-8 w-8"
                                            onClick={() => handleAction('delete', contract)}
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
                        columns={[
                            {
                                key: 'subject',
                                label: t('Contract'),
                                sortable: true,
                                render: (value: string, row: any) => (
                                    <div className="flex items-center gap-2">
                                        <div 
                                            className="w-3 h-3 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: row.contract_type?.color }}
                                        />
                                        <div>
                                            <div 
                                                className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
                                                onClick={() => router.get(route('contracts.show', row.id))}
                                            >
                                                {value}
                                            </div>
                                            <div className="text-sm text-gray-500">{row.contract_id}</div>
                                        </div>
                                    </div>
                                )
                            },
                            {
                                key: 'client.name',
                                label: t('Client'),
                                sortable: false,
                                render: (value: string, row: any) => (
                                    <div>
                                        <div className="text-sm font-medium text-gray-900">{row.client?.name}</div>
                                        <div className="text-sm text-gray-500">{row.client?.email}</div>
                                    </div>
                                )
                            },
                            {
                                key: 'contract_type.name',
                                label: t('Type'),
                                sortable: true,
                                render: (value: string, row: any) => (
                                    <Badge 
                                        variant="secondary" 
                                        style={{ backgroundColor: '#007bff20', color: '#007bff' }}
                                    >
                                        {row.contract_type?.name}
                                    </Badge>
                                )
                            },
                            {
                                key: 'contract_value',
                                label: t('Value'),
                                sortable: true,
                                render: (value: number) => (
                                    <span className="text-sm font-medium text-green-600">
                                        ${value?.toLocaleString()}
                                    </span>
                                )
                            },
                            {
                                key: 'status',
                                label: t('Status'),
                                sortable: true,
                                render: (value: string) => getStatusBadge(value)
                            },
                            {
                                key: 'end_date',
                                label: t('End Date'),
                                sortable: true,
                                render: (value: string) => (
                                    <span className="text-sm text-gray-900">
                                        {new Date(value).toLocaleDateString()}
                                    </span>
                                )
                            }
                        ]}
                        actions={[
                            {
                                label: t('Files'),
                                icon: 'FileText',
                                action: 'files',
                                className: 'text-slate-500 hover:text-slate-700',
                                condition: () => hasPermission(permissions, 'contract_view')
                            },
                            {
                                label: t('Duplicate'),
                                icon: 'Copy',
                                action: 'duplicate',
                                className: 'text-green-500 hover:text-green-700',
                                condition: () => hasPermission(permissions, 'contract_create')
                            },
                            {
                                label: t('View'),
                                icon: 'Eye',
                                action: 'view',
                                className: 'text-blue-500 hover:text-blue-700',
                                condition: () => hasPermission(permissions, 'contract_view')
                            },
                            {
                                label: t('Edit'),
                                icon: 'Edit',
                                action: 'edit',
                                className: 'text-amber-500 hover:text-amber-700',
                                condition: () => hasPermission(permissions, 'contract_update')
                            },
                            {
                                label: t('Delete'),
                                icon: 'Trash2',
                                action: 'delete',
                                className: 'text-red-500 hover:text-red-700',
                                condition: () => hasPermission(permissions, 'contract_delete')
                            }
                        ]}
                        data={contracts?.data || []}
                        from={contracts?.from || 1}
                        onAction={handleAction}
                        sortField={pageFilters.sort_field}
                        sortDirection={pageFilters.sort_direction}
                        onSort={handleSort}
                        permissions={permissions}
                    />
                    
                    {/* Pagination for list view */}
                    {contracts?.links && (
                        <div className="p-4 border-t flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">
                                {t('Showing')} <span className="font-medium">{contracts?.from || 0}</span> {t('to')} <span className="font-medium">{contracts?.to || 0}</span> {t('of')} <span className="font-medium">{contracts?.total || 0}</span> {t('contracts')}
                            </div>
                            
                            <div className="flex gap-1">
                                {contracts?.links?.map((link: any, i: number) => {
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
                                            {isTextLink ? t(label) : <span dangerouslySetInnerHTML={{ __html: link.label }} />}
                                        </Button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            {/* Pagination for grid view */}
            {activeView === 'grid' && contracts?.links && (
                <div className="mt-6 bg-white p-4 rounded-lg shadow flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        {t('Showing')} <span className="font-medium">{contracts?.from || 0}</span> {t('to')} <span className="font-medium">{contracts?.to || 0}</span> {t('of')} <span className="font-medium">{contracts?.total || 0}</span> {t('contracts')}
                    </div>
                    
                    <div className="flex gap-1">
                        {contracts?.links?.map((link: any, i: number) => {
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
                key={modalKey}
                isOpen={isFormModalOpen}
                onClose={() => {
                    setIsFormModalOpen(false);
                    setFormClientId(null);
                    setFormProjects([]);
                    setContractFiles([]);
                }}
                onSubmit={handleFormSubmit}
                submitButtonText={formMode === 'create' ? t('Create Contract') : t('Update Contract')}
                formConfig={contractFormConfig}
                initialData={contractInitialData}
                title={
                    formMode === 'create' 
                        ? t('Add Contract') 
                        : formMode === 'edit' 
                            ? t('Edit Contract') 
                            : t('View Contract')
                }
                mode={formMode}
            />

            {/* Delete Modal */}
            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                itemName={currentItem?.subject || ''}
                entityName={t('contract')}
                warningMessage={t('All contract data including notes, comments, and attachments will be permanently lost.')}
                additionalInfo={[
                    t('Contract notes and comments'),
                    t('File attachments'),
                    t('Contract history'),
                    t('Related activities')
                ]}
            />

            <Dialog open={isFilesModalOpen} onOpenChange={(open) => {
                setIsFilesModalOpen(open);
                if (!open) setFilesContract(null);
            }}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{t('Files')} {filesContract?.subject ? `- ${filesContract.subject}` : ''}</DialogTitle>
                    </DialogHeader>

                    {filesContract?.attachments?.length ? (
                        <TaskFileUpload
                            mode="view"
                            files={(filesContract.attachments || []).map(mapAttachmentToTaskFile)}
                        />
                    ) : (
                        <div className="py-10 text-center text-sm text-gray-500">{t('No files available')}</div>
                    )}
                </DialogContent>
            </Dialog>
        </PageTemplate>
    );
}
