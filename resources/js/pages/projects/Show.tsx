import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowLeft, Edit, Plus, Pin, Trash2, Users, Calendar, DollarSign, Clock, User, Eye, Receipt, CheckSquare, Timer, CheckCircle, AlertTriangle, BarChart3, CreditCard, Columns, Paperclip, Download, Upload, Search, Bug, Link, Settings, Shield } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageTemplate } from '@/components/page-template';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { SimplePagination } from '@/components/SimplePagination';
import { toast } from '@/components/custom-toast';
import { hasPermission } from '@/utils/authorization';
import { useTranslation } from 'react-i18next';
import { getTimesheetLabel, formatHoursDisplay, isTimesheetOverdue, getDaysOverdue } from '@/utils/timesheetUtils';
import { formatCurrency } from '@/utils/currency';
import MediaPicker from '@/components/MediaPicker';
import TimesheetFormModal from '@/components/timesheets/TimesheetFormModal';
import SharedProjectSettingsModal from '@/components/projects/SharedProjectSettingsModal';


export default function ProjectShow() {
    const { t } = useTranslation();
    const { auth, project, budget = null, members, managers, clients, projectTasks = [], projectBugs = [], projectTimesheets = [], canDeleteProject, canViewBudget, canManageSharedSettings, attachmentFilters = {}, noteFilters = {}, activityFilters = {} } = usePage().props as any;
    const permissions = auth?.permissions || [];

    // Get expenses from project relationship
    const projectExpenses = project?.expenses || [];

    const formatText = (text: string) => {
        if (!text) return '';
        return text.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
    };

    // Permission-based access control
    const canEditProject = hasPermission(permissions, 'project_update');
    const canManageProject = hasPermission(permissions, 'project_assign_members') || hasPermission(permissions, 'project_assign_clients') || hasPermission(permissions, 'project_manage_notes');
    const canManageBudget = hasPermission(permissions, 'project_manage_budget');
    const canViewBudgetPermission = hasPermission(permissions, 'budget_view') || hasPermission(permissions, 'budget_view_any');
    const canCreateBudget = hasPermission(permissions, 'budget_create');
    const canManageAttachments = hasPermission(permissions, 'project_manage_attachments');
    const canManageNotes = hasPermission(permissions, 'project_manage_notes');
    const canTrackProgress = hasPermission(permissions, 'project_track_progress');

    // Only use permission-based check for budget access
    const hasViewBudgetAccess = canViewBudgetPermission;

    const [activeTab, setActiveTab] = useState('overview');
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<any>(null);
    const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
    const [modalType, setModalType] = useState<'milestone' | 'note' | 'client' | 'member' | 'manager' | 'project' | 'attachment'>('milestone');
    const [isTimesheetModalOpen, setIsTimesheetModalOpen] = useState(false);
    const [selectedAttachments, setSelectedAttachments] = useState('');
    const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
    const [isSharedSettingsModalOpen, setIsSharedSettingsModalOpen] = useState(false);


    // Pagination states
    const [milestonesPage, setMilestonesPage] = useState(1);
    const [notesPage, setNotesPage] = useState(1);
    const [activityPage, setActivityPage] = useState(1);
    const [attachmentSearch, setAttachmentSearch] = useState(attachmentFilters?.attachment_search || '');
    const [attachmentsPerPage, setAttachmentsPerPage] = useState(attachmentFilters?.attachments_per_page || 12);
    const [notesSearch, setNotesSearch] = useState(noteFilters?.notes_search || '');
    const [notesPerPage, setNotesPerPage] = useState(noteFilters?.notes_per_page || 5);
    const [activitySearch, setActivitySearch] = useState(activityFilters?.activity_search || '');
    const [activityPerPage, setActivityPerPage] = useState(activityFilters?.activity_per_page || 10);
    const itemsPerPage = 5;

    // Reset pagination when switching tabs
    const handleTabChange = (value: string) => {
        setActiveTab(value);
        if (value === 'milestones') setMilestonesPage(1);
        if (value === 'notes') setNotesPage(1);
        if (value === 'activity') setActivityPage(1);
    };

    const handleAttachmentSearch = () => {
        const params: any = { attachments_page: 1 };
        if (attachmentSearch) params.attachment_search = attachmentSearch;
        if (attachmentsPerPage !== 12) params.attachments_per_page = attachmentsPerPage;

        router.get(route('projects.show', project.id), params, {
            preserveState: true,
            preserveScroll: true,
            only: ['project', 'attachmentFilters']
        });
    };

    const handleAttachmentPerPageChange = (value: string) => {
        const newPerPage = parseInt(value);
        setAttachmentsPerPage(newPerPage);

        const params: any = { attachments_page: 1, attachments_per_page: newPerPage };
        if (attachmentSearch) params.attachment_search = attachmentSearch;

        router.get(route('projects.show', project.id), params, {
            preserveState: true,
            preserveScroll: true,
            only: ['project', 'attachmentFilters']
        });
    };

    const handleNotesSearch = () => {
        const params: any = { notes_page: 1 };
        if (notesSearch) params.notes_search = notesSearch;
        if (notesPerPage !== 5) params.notes_per_page = notesPerPage;

        router.get(route('projects.show', project.id), params, {
            preserveState: true,
            preserveScroll: true,
            only: ['project', 'noteFilters']
        });
    };

    const handleNotesPerPageChange = (value: string) => {
        const newPerPage = parseInt(value);
        setNotesPerPage(newPerPage);

        const params: any = { notes_page: 1, notes_per_page: newPerPage };
        if (notesSearch) params.notes_search = notesSearch;

        router.get(route('projects.show', project.id), params, {
            preserveState: true,
            preserveScroll: true,
            only: ['project', 'noteFilters']
        });
    };

    const handleActivitySearch = () => {
        const params: any = { activity_page: 1 };
        if (activitySearch) params.activity_search = activitySearch;
        if (activityPerPage !== 10) params.activity_per_page = activityPerPage;

        router.get(route('projects.show', project.id), params, {
            preserveState: true,
            preserveScroll: true,
            only: ['project', 'activityFilters']
        });
    };

    const handleActivityPerPageChange = (value: string) => {
        const newPerPage = parseInt(value);
        setActivityPerPage(newPerPage);

        const params: any = { activity_page: 1, activity_per_page: newPerPage };
        if (activitySearch) params.activity_search = activitySearch;

        router.get(route('projects.show', project.id), params, {
            preserveState: true,
            preserveScroll: true,
            only: ['project', 'activityFilters']
        });
    };

    const getStatusColor = (status: string) => {
        const colors = {
            planning: 'bg-blue-100 text-blue-800',
            active: 'bg-green-100 text-green-800',
            on_hold: 'bg-yellow-100 text-yellow-800',
            completed: 'bg-gray-100 text-gray-800',
            cancelled: 'bg-red-100 text-red-800'
        };
        return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
    };

    const getMilestoneStatusColor = (status: string) => {
        const colors = {
            pending: 'bg-yellow-100 text-yellow-800',
            in_progress: 'bg-blue-100 text-blue-800',
            completed: 'bg-green-100 text-green-800',
            cancelled: 'bg-red-100 text-red-800',
            on_hold: 'bg-orange-100 text-orange-800'
        };
        return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
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

    const handleAction = (action: string, item: any = null, type: string = '') => {
        setCurrentItem(item);

        switch (action) {
            case 'add-milestone':
                setModalType('milestone');
                setFormMode('create');
                setIsFormModalOpen(true);
                break;
            case 'edit-milestone':
                setModalType('milestone');
                setFormMode('edit');
                setIsFormModalOpen(true);
                break;
            case 'delete-milestone':
                setIsDeleteModalOpen(true);
                break;
            case 'add-note':
                setModalType('note');
                setFormMode('create');
                setIsFormModalOpen(true);
                break;
            case 'edit-note':
                setModalType('note');
                setFormMode('edit');
                setIsFormModalOpen(true);
                break;
            case 'delete-note':
                setIsDeleteModalOpen(true);
                break;
            case 'invite-client':
                setModalType('client');
                setFormMode('create');
                setIsFormModalOpen(true);
                break;
            case 'invite-member':
                setModalType('member');
                setFormMode('create');
                setIsFormModalOpen(true);
                break;
            case 'invite-manager':
                setModalType('manager');
                setFormMode('create');
                setIsFormModalOpen(true);
                break;
            case 'toggle-pin':
                router.put(route('project-notes.toggle-pin', [project.id, item.id]));
                break;
            case 'add-attachment':
                setCurrentItem({ media_ids: [] });
                setModalType('attachment');
                setFormMode('create');
                setIsFormModalOpen(true);
                break;
            case 'delete-attachment':
                setIsDeleteModalOpen(true);
                break;
        }
    };

    const handleFormSubmit = (formData: any) => {
        let routeName = '';
        let routeParams: any[] = [];

        switch (modalType) {
            case 'milestone':
                routeName = formMode === 'create' ? 'project-milestones.store' : 'project-milestones.update';
                routeParams = formMode === 'create' ? [project.id] : [project.id, currentItem.id];
                break;
            case 'note':
                routeName = formMode === 'create' ? 'project-notes.store' : 'project-notes.update';
                routeParams = formMode === 'create' ? [project.id] : [project.id, currentItem.id];
                break;
            case 'client':
                routeName = 'projects.assign-clients';
                routeParams = [project.id];
                break;
            case 'member':
                routeName = 'projects.assign-members';
                routeParams = [project.id];
                break;
            case 'manager':
                routeName = 'projects.assign-managers';
                routeParams = [project.id];
                break;
            case 'project':
                routeName = 'projects.update';
                routeParams = [project.id];
                break;
            case 'budget':
                routeName = 'projects.create-budget';
                routeParams = [project.id];
                break;
            case 'attachment':
                // Handle attachment upload - check both formData and currentItem for media_ids
                const mediaIds = formData.media_ids || currentItem?.media_ids || [];
                // Debug: Check available media IDs

                if (mediaIds && mediaIds.length > 0) {
                    setIsUploadingAttachment(true);
                    router.post(route('project-attachments.store', project.id), {
                        media_ids: mediaIds
                    }, {
                        onSuccess: () => {
                            setIsFormModalOpen(false);
                            setSelectedAttachments('');
                            setCurrentItem(null);
                            setIsUploadingAttachment(false);
                            toast.success('Attachments uploaded successfully');
                        },
                        onError: (errors) => {
                            setIsUploadingAttachment(false);
                            toast.error(`Failed: ${Object.values(errors).join(', ')}`);
                        }
                    });
                    return;
                }

                // Also check if selectedAttachments has URLs that we can extract media IDs from
                if (selectedAttachments) {
                    // Try to extract media IDs from URLs
                    const urlMediaIds = selectedAttachments.split(',').map(url => {
                        const match = url.trim().match(/\/media\/(\d+)/);
                        return match ? parseInt(match[1]) : null;
                    }).filter(Boolean);

                    if (urlMediaIds.length > 0) {
                        setIsUploadingAttachment(true);
                        router.post(route('project-attachments.store', project.id), {
                            media_ids: urlMediaIds
                        }, {
                            onSuccess: () => {
                                setIsFormModalOpen(false);
                                setSelectedAttachments('');
                                setCurrentItem(null);
                                setIsUploadingAttachment(false);
                                toast.success('Attachments uploaded successfully');
                            },
                            onError: (errors) => {
                                setIsUploadingAttachment(false);
                                toast.error(`Failed: ${Object.values(errors).join(', ')}`);
                            }
                        });
                        return;
                    }
                }

                toast.error('Please select attachments to upload');
                return;
        }

        // For attachment uploads, handle differently
        if (modalType === 'attachment') {
            // This is handled in the attachment case above
            return;
        }

        const method = formMode === 'create' ? 'post' : 'put';
        toast.loading(`${formMode === 'create' ? 'Creating' : 'Updating'}...`);

        const routeUrl = routeParams.length === 2 ?
            route(routeName, modalType === 'milestone' ?
                { project: routeParams[0], milestone: routeParams[1] } :
                { project: routeParams[0], note: routeParams[1] }
            ) :
            route(routeName, routeParams[0]);

        router[method](routeUrl, formData, {
            onSuccess: () => {
                setIsFormModalOpen(false);
                toast.dismiss();
                toast.success(`${modalType} ${formMode === 'create' ? 'created' : 'updated'} successfully`);
            },
            onError: (errors) => {
                toast.dismiss();
                toast.error(`Failed: ${Object.values(errors).join(', ')}`);
            }
        });
    };

    const handleDeleteConfirm = () => {
        let routeName = '';
        let routeParams: any[] = [];

        switch (modalType) {
            case 'milestone':
                routeName = 'project-milestones.destroy';
                routeParams = [project.id, currentItem.id];
                break;
            case 'note':
                routeName = 'project-notes.destroy';
                routeParams = [project.id, currentItem.id];
                break;
            case 'attachment':
                routeName = 'project-attachments.destroy';
                routeParams = [currentItem.id];
                break;
            case 'member':
                routeName = 'projects.remove-member';
                routeParams = [project.id, currentItem.user?.id || currentItem.id];
                break;
            case 'client':
                routeName = 'projects.remove-client';
                routeParams = [project.id, currentItem.id];
                break;
            default:
                return;
        }

        toast.loading('Removing...');

        router.delete(route(routeName, routeParams), {
            onSuccess: () => {
                setIsDeleteModalOpen(false);
                toast.dismiss();
                toast.success(`${modalType === 'member' ? 'Team member' : modalType} removed successfully`);
            },
            onError: (errors) => {
                toast.dismiss();
                toast.error(`Failed to remove: ${Object.values(errors).join(', ')}`);
            }
        });
    };

    const getFormConfig = () => {
        switch (modalType) {
            case 'milestone':
                return {
                    fields: [
                        { name: 'title', label: 'Title', type: 'text', required: true },
                        { name: 'description', label: 'Description', type: 'textarea' },
                        { name: 'due_date', label: 'Due Date', type: 'date' },
                        {
                            name: 'status',
                            label: 'Status',
                            type: 'select',
                            options: [
                                { value: 'pending', label: 'Pending' },
                                { value: 'in_progress', label: 'In Progress' },
                                { value: 'completed', label: 'Completed' },
                                { value: 'overdue', label: 'Overdue' }
                            ],
                            required: true
                        }
                    ],
                    modalSize: 'lg'
                };
            case 'note':
                return {
                    fields: [
                        { name: 'title', label: 'Title', type: 'text', required: true },
                        { name: 'content', label: 'Content', type: 'textarea', required: true },
                        { name: 'is_pinned', label: 'Pin this note', type: 'checkbox' }
                    ],
                    modalSize: 'lg'
                };
            case 'client':
                const availableClients = clients ? clients.filter((client: any) =>
                    !project.clients?.some((pc: any) => pc.id === client.id)
                ) : [];
                return {
                    fields: [
                        {
                            name: 'client_ids',
                            label: 'Add Clients',
                            type: 'multi-select',
                            options: availableClients.map((client: any) => ({
                                value: client.id.toString(),
                                label: `${client.name} (${client.email})`
                            })),
                            placeholder: 'Select clients...',
                            required: true
                        }
                    ],
                    modalSize: 'xl'
                };
            case 'member':
                const availableMembers = members ? members.filter((member: any) => {
                    const isProjectMember = project.members?.some((pm: any) => pm.user?.id === member.id);
                    const isProjectClient = project.clients?.some((pc: any) => pc.id === member.id);
                    return !isProjectMember && !isProjectClient;
                }) : [];
                return {
                    fields: [
                        {
                            name: 'member_ids',
                            label: 'Add Members',
                            type: 'multi-select',
                            options: availableMembers.map((member: any) => ({
                                value: member.id.toString(),
                                label: `${member.name} (${member.email})`
                            })),
                            placeholder: 'Select members...',
                            required: true
                        }
                    ],
                    modalSize: 'xl'
                };
            case 'manager':
                const availableManagers = managers ? managers.filter((manager: any) => {
                    const isProjectMember = project.members?.some((pm: any) => pm.user?.id === manager.id);
                    const isProjectClient = project.clients?.some((pc: any) => pc.id === manager.id);
                    return !isProjectMember && !isProjectClient;
                }) : [];

                return {
                    fields: [
                        {
                            name: 'manager_ids',
                            label: 'Add Managers',
                            type: 'multi-select',
                            options: availableManagers.map((manager: any) => ({
                                value: manager.id.toString(),
                                label: `${manager.name} (${manager.email})`
                            })),
                            placeholder: 'Select managers...',
                            required: true
                        }
                    ],
                    modalSize: 'xl'
                };
            case 'project':
                return {
                    fields: [
                        { name: 'title', label: 'Project Title', type: 'text', required: true },
                        { name: 'description', label: 'Description', type: 'textarea' },
                        {
                            name: 'status',
                            label: 'Status',
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
                            label: 'Priority',
                            type: 'select',
                            options: [
                                { value: 'low', label: 'Low' },
                                { value: 'medium', label: 'Medium' },
                                { value: 'high', label: 'High' },
                                { value: 'urgent', label: 'Urgent' }
                            ],
                            required: true
                        },
                        { name: 'start_date', label: 'Start Date', type: 'date' },
                        { name: 'deadline', label: 'Deadline', type: 'date' },
                        { name: 'estimated_hours', label: 'Estimated Hours', type: 'number', min: 0 },
                        { name: 'is_public', label: 'Make project public', type: 'checkbox' }
                    ],
                    modalSize: 'xl'
                };
            case 'budget':
                return {
                    fields: [
                        { name: 'total_budget', label: 'Total Budget', type: 'number', required: true, min: 0 },
                        {
                            name: 'currency',
                            label: 'Currency',
                            type: 'select',
                            options: [
                                { value: 'USD', label: 'USD' },
                                { value: 'EUR', label: 'EUR' },
                                { value: 'GBP', label: 'GBP' }
                            ],
                            required: true
                        },
                        {
                            name: 'period_type',
                            label: 'Period Type',
                            type: 'select',
                            options: [
                                { value: 'project', label: 'Project Duration' },
                                { value: 'monthly', label: 'Monthly' },
                                { value: 'quarterly', label: 'Quarterly' }
                            ],
                            required: true
                        },
                        { name: 'start_date', label: 'Start Date', type: 'date', required: true },
                        { name: 'end_date', label: 'End Date', type: 'date' },
                        { name: 'description', label: 'Description', type: 'textarea' },
                        {
                            name: 'categories',
                            label: 'Budget Categories',
                            type: 'dynamic-list',
                            fields: [
                                { name: 'name', label: 'Category Name', type: 'text', required: true },
                                { name: 'allocated_amount', label: 'Allocated Amount', type: 'number', required: true, min: 0 },
                                { name: 'color', label: 'Color', type: 'color', defaultValue: '#3B82F6' },
                                { name: 'description', label: 'Description', type: 'text' }
                            ],
                            required: true,
                            minItems: 1
                        }
                    ],
                    modalSize: 'xl'
                };
            case 'attachment':
                return {
                    fields: [
                        {
                            name: 'media_ids',
                            type: 'custom',
                            component: (
                                <MediaPicker
                                    label="Select Files"
                                    value={selectedAttachments}
                                    onChange={(value, mediaIds) => {
                                        // Store selected attachments
                                        setSelectedAttachments(value);
                                        // Store media IDs for form submission
                                        if (mediaIds && mediaIds.length > 0) {
                                            setCurrentItem(prev => ({ ...prev, media_ids: mediaIds }));
                                        }
                                    }}
                                    multiple={true}
                                    placeholder={t('Select files to upload...')}
                                    showPreview={true}
                                />
                            ),
                            required: true
                        }
                    ],
                    modalSize: 'lg'
                };
            default:
                return { fields: [], modalSize: 'md' };
        }
    };

    const pageActions = [
        ...(hasPermission(permissions, 'task_view_any') ? [{
            label: t('Tasks'),
            icon: <CheckSquare className="h-4 w-4 mr-2" />,
            variant: 'outline',
            onClick: () => router.get(route('tasks.index', { project_id: project.id, project_name: project.title, view: 'kanban' }))
        }] : []),
        ...(hasPermission(permissions, 'project_view') ? [{
            label: t('Gantt Chart'),
            icon: <BarChart3 className="h-4 w-4 mr-2" />,
            variant: 'outline',
            onClick: () => router.get(route('projects.gantt', { project: project.id }))
        }] : []),
        ...(hasPermission(permissions, 'bug_view_any') ? [{
            label: t('Bugs'),
            icon: <Bug className="h-4 w-4 mr-2" />,
            variant: 'outline',
            onClick: () => router.get(route('bugs.index', { project_id: project.id, project_name: project.title }))
        }] : []),
        ...(hasPermission(permissions, 'expense_view_any') ? [{
            label: t('Expenses'),
            icon: <Receipt className="h-4 w-4 mr-2" />,
            variant: 'outline',
            onClick: () => router.get(route('expenses.index', { project_id: project.id, project_name: project.title }))
        }] : []),
        ...(hasViewBudgetAccess ? [{
            label: t('Budget'),
            icon: <DollarSign className="h-4 w-4 mr-2" />,
            variant: 'outline',
            onClick: () => {
                if (budget) {
                    router.get(route('budgets.show', budget.id));
                } else {
                    router.get(route('budgets.index'));
                }
            }
        }] : [])
    ];

    if (canManageSharedSettings && hasPermission(permissions, 'project_manage_shared_settings')) {
        pageActions.push({
            label: t('Shared Project'),
            icon: <Settings className="h-4 w-4 mr-2" />,
            variant: 'outline',
            onClick: () => setIsSharedSettingsModalOpen(true)
        });
    }

    if (canEditProject) {
        pageActions.push({
            label: t('Edit Project'),
            icon: <Edit className="h-4 w-4 mr-2" />,
            variant: 'default',
            onClick: () => {
                setCurrentItem(project);
                setModalType('project');
                setFormMode('edit');
                setIsFormModalOpen(true);
            }
        });
    }

    pageActions.push({
            label: t('back'),
            icon: <ArrowLeft className="h-4 w-4 mr-2" />,
            variant: 'outline',
            onClick: () => {router.get(route('projects.index'))}
        });

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Projects'), href: route('projects.index') },
        { title: project.title }
    ];

    return (
        <PageTemplate
            title={project.title}
            url={`/projects/${project.id}`}
            actions={pageActions}
            breadcrumbs={breadcrumbs}
            noPadding
        >
            {/* Project Header */}
            <div className="bg-white rounded-lg shadow mb-4">
                <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <div className="flex gap-2">
                                <Badge className={getStatusColor(project.status)}>
                                    {formatText(project.status)}
                                </Badge>
                                <Badge className={getPriorityColor(project.priority)}>
                                    {formatText(project.priority)}
                                </Badge>
                                {project.is_public ? (
                                    <Badge variant="outline" className="text-green-600 border-green-600">
                                        {t('Public Project')}
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="text-gray-600 border-gray-600">
                                        {t('Private Project')}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Project Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-blue-500" />
                                    <span className="text-sm font-medium">{t('Team Members')}</span>
                                </div>
                                <p className="text-2xl font-bold">{(project.members?.length || 0) + (project.clients?.length || 0)}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-green-500" />
                                    <span className="text-sm font-medium">{t('Deadline')}</span>
                                </div>
                                <p className="text-lg font-semibold">{new Date(project.deadline).toLocaleDateString()}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2">
                                    <DollarSign className="h-4 w-4 text-yellow-500" />
                                    <span className="text-sm font-medium">{t('Budget')}</span>
                                </div>
                                <p className="text-2xl font-bold">{hasViewBudgetAccess ? formatCurrency(budget?.total_budget || 0) : 'N/A'}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-purple-500" />
                                    <span className="text-sm font-medium">{t('Est. Hours')}</span>
                                </div>
                                <p className="text-2xl font-bold">{project.estimated_hours}h</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Progress */}
                    <Card>
                        <CardContent className="p-4">
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="font-medium">{t('Project Progress')}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold">{project.progress}%</span>
                                        {hasPermission(permissions, 'project_track_progress') && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            toast.loading('Recalculating progress...');
                                                            router.post(route('projects.recalculate-progress', project.id), {}, {
                                                                onSuccess: () => {
                                                                    toast.dismiss();
                                                                    toast.success('Progress recalculated successfully');
                                                                },
                                                                onError: () => {
                                                                    toast.dismiss();
                                                                    toast.error('Failed to recalculate progress');
                                                                }
                                                            });
                                                        }}
                                                        className="h-6 px-2 text-xs"
                                                    >
                                                        <BarChart3 className="h-3 w-3" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>{t('Recalculate Progress')}</TooltipContent>
                                            </Tooltip>
                                        )}
                                    </div>
                                </div>
                                <Progress value={project.progress} className="h-2" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Tabs Content */}
            <div className="bg-white rounded-lg shadow">
                <Tabs value={activeTab} onValueChange={handleTabChange} className="relative">
                    <div className="border-b bg-gradient-to-r from-gray-50 to-blue-50 relative z-10">
                        <TabsList className="h-12 bg-white/80 backdrop-blur-sm border-0 rounded-none p-0 shadow-none relative z-20 flex-wrap w-full justify-center">
                            {hasPermission(permissions, 'project_view') && (
                                <TabsTrigger value="overview" className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:scale-105 hover:bg-primary/10 hover:text-primary text-gray-600">
                                    <User className="h-4 w-4 mr-2" />
                                    {t('Overview')}
                                </TabsTrigger>
                            )}
                            {hasPermission(permissions, 'project_assign_members') && (
                                <TabsTrigger value="team" className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:scale-105 hover:bg-primary/10 hover:text-primary text-gray-600">
                                    <Users className="h-4 w-4 mr-2" />
                                    {t('Team')}
                                </TabsTrigger>
                            )}
                            {hasPermission(permissions, 'project_manage_milestones') && (
                                <TabsTrigger value="milestones" className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:scale-105 hover:bg-primary/10 hover:text-primary text-gray-600">
                                    <Calendar className="h-4 w-4 mr-2" />
                                    {t('Milestones')}
                                </TabsTrigger>
                            )}
                            {hasPermission(permissions, 'project_manage_notes') && (
                                <TabsTrigger value="notes" className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:scale-105 hover:bg-primary/10 hover:text-primary text-gray-600">
                                    <Pin className="h-4 w-4 mr-2" />
                                    {t('Notes')}
                                </TabsTrigger>
                            )}
                            {hasViewBudgetAccess && (
                                <TabsTrigger value="budget" className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:scale-105 hover:bg-primary/10 hover:text-primary text-gray-600">
                                    <DollarSign className="h-4 w-4 mr-2" />
                                    {t('Budget')}
                                </TabsTrigger>
                            )}
                            {hasPermission(permissions, 'expense_view_any') && (
                                <TabsTrigger value="expense" className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:scale-105 hover:bg-primary/10 hover:text-primary text-gray-600">
                                    <CreditCard className="h-4 w-4 mr-2" />
                                    {t('Expense')}
                                </TabsTrigger>
                            )}
                            {hasPermission(permissions, 'task_view_any') && (
                                <TabsTrigger value="tasks" className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:scale-105 hover:bg-primary/10 hover:text-primary text-gray-600">
                                    <CheckSquare className="h-4 w-4 mr-2" />
                                    {t('Tasks')}
                                </TabsTrigger>
                            )}
                            {hasPermission(permissions, 'bug_view_any') && (
                                <TabsTrigger value="bugs" className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:scale-105 hover:bg-primary/10 hover:text-primary text-gray-600">
                                    <Bug className="h-4 w-4 mr-2" />
                                    {t('Bugs')}
                                </TabsTrigger>
                            )}
                            {hasPermission(permissions, 'timesheet_view_any') && (
                                <TabsTrigger value="timesheet" className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:scale-105 hover:bg-primary/10 hover:text-primary text-gray-600">
                                    <Timer className="h-4 w-4 mr-2" />
                                    {t('Timesheet')}
                                </TabsTrigger>
                            )}
                            {hasPermission(permissions, 'project_manage_attachments') && (
                                <TabsTrigger value="attachments" className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:scale-105 hover:bg-primary/10 hover:text-primary text-gray-600">
                                    <Paperclip className="h-4 w-4 mr-2" />
                                    {t('Attachments')}
                                </TabsTrigger>
                            )}
                            {hasPermission(permissions, 'project_view') && (
                                <TabsTrigger value="activity" className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:scale-105 hover:bg-primary/10 hover:text-primary text-gray-600">
                                    <Clock className="h-4 w-4 mr-2" />
                                    {t('Activity')}
                                </TabsTrigger>
                            )}
                        </TabsList>
                    </div>

                    <div className="p-4 relative overflow-visible z-0">
                        <TabsContent value="overview" className="space-y-6 mt-0">
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t('Project Description')}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{project.description || t('No description provided.')}</p>
                                </CardContent>
                            </Card>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Calendar className="h-5 w-5 text-blue-500" />
                                            {t('Project Timeline')}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-600">{t('Start Date')}:</span>
                                            <span className="font-medium">{project.start_date ? new Date(project.start_date).toLocaleDateString() : t('Not set')}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-600">{t('Deadline')}:</span>
                                            <span className="font-medium">{project.deadline ? new Date(project.deadline).toLocaleDateString() : t('Not set')}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-600">{t('Estimated Hours')}:</span>
                                            <span className="font-medium">{project.estimated_hours || 0}h</span>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Users className="h-5 w-5 text-green-500" />
                                            {t('Team Summary')}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-600">{t('Managers')}:</span>
                                            <span className="font-medium">{project.members?.filter((member: any) => member.role === 'manager').length || 0}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-600">{t('Team Members')}:</span>
                                            <span className="font-medium">{project.members?.filter((member: any) => member.role === 'member').length || 0}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-600">{t('Clients')}:</span>
                                            <span className="font-medium">{project.clients?.length || 0}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Project Reports */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Timer className="h-5 w-5 text-blue-500" />
                                            {t('Time Tracking Summary')}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-600">{t('Total Hours Logged')}:</span>
                                                <span className="font-semibold">
                                                    {projectTimesheets ?
                                                        projectTimesheets.reduce((total: number, ts: any) => total + parseFloat(ts.total_hours || 0), 0).toFixed(1)
                                                        : '0.0'
                                                    }h
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-600">{t('Billable Hours')}:</span>
                                                <span className="font-semibold text-green-600">
                                                    {projectTimesheets ?
                                                        projectTimesheets.reduce((total: number, ts: any) => total + parseFloat(ts.billable_hours || 0), 0).toFixed(1)
                                                        : '0.0'
                                                    }h
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-600">{t('Team Members Active')}:</span>
                                                <span className="font-semibold">
                                                    {projectTimesheets ?
                                                        new Set(projectTimesheets.map((ts: any) => ts.user?.id)).size
                                                        : 0
                                                    }
                                                </span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <BarChart3 className="h-5 w-5 text-purple-500" />
                                            {t('Project Reports')}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-600">{t('Total Milestones')}:</span>
                                                <span className="font-semibold">{project.milestones?.length || 0}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-600">{t('Notes Created')}:</span>
                                                <span className="font-semibold text-blue-600">
                                                    {project.notes?.total || 0}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-600">{t('Attachments')}:</span>
                                                <span className="font-semibold text-green-600">
                                                    {project.attachments?.total || 0}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-600">{t('Activities')}:</span>
                                                <span className="font-semibold text-orange-600">
                                                    {project.activities?.total || 0}
                                                </span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {hasViewBudgetAccess && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <DollarSign className="h-5 w-5 text-yellow-500" />
                                                {t('Budget Utilization')}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-gray-600">{t('Total Budget')}:</span>
                                                    <span className="font-semibold">{formatCurrency(budget?.total_budget || 0)}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-gray-600">{t('Amount Spent')}:</span>
                                                    <span className="font-semibold text-red-600">{formatCurrency(budget?.total_spent || 0)}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-gray-600">{t('Remaining')}:</span>
                                                    <span className="font-semibold text-green-600">{formatCurrency(budget?.remaining_budget || 0)}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-gray-600">{t('Utilization')}:</span>
                                                    <span className="font-semibold">{budget?.utilization_percentage?.toFixed(1) || '0.0'}%</span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Users className="h-5 w-5 text-purple-500" />
                                            {t('Team Performance')}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-600">{t('Team Size')}:</span>
                                                <span className="font-semibold">{project.members?.length || 0}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-600">{t('Active Members')}:</span>
                                                <span className="font-semibold text-green-600">
                                                    {projectTimesheets ?
                                                        new Set(projectTimesheets.map((ts: any) => ts.user?.id)).size
                                                        : 0
                                                    }
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-600">{t('Avg Hours/Member')}:</span>
                                                <span className="font-semibold">
                                                    {projectTimesheets && project.members?.length ?
                                                        (projectTimesheets.reduce((total: number, ts: any) => total + parseFloat(ts.total_hours || 0), 0) / project.members.length).toFixed(1)
                                                        : '0.0'
                                                    }h
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-600">{t('Project Progress')}:</span>
                                                <span className="font-semibold">{project.progress || 0}%</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        <TabsContent value="team" className="space-y-6 mt-0">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold">{t('Team & Clients')}</h3>
                                <div className="flex gap-2">
                                    {hasPermission(permissions, 'project_assign_clients') && (
                                        <Button size="sm" onClick={() => handleAction('invite-client')}>
                                            <Plus className="h-4 w-4 mr-2" />
                                            {t('Add Client')}
                                        </Button>
                                    )}
                                    {hasPermission(permissions, 'project_assign_members') && (
                                        <Button size="sm" onClick={() => handleAction('invite-member')}>
                                            <Plus className="h-4 w-4 mr-2" />
                                            {t('Add Member')}
                                        </Button>
                                    )}
                                    {hasPermission(permissions, 'project_assign_members') && (
                                        <Button size="sm" onClick={() => handleAction('invite-manager')}>
                                            <Plus className="h-4 w-4 mr-2" />
                                            {t('Add Manager')}
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Project Managers */}
                            {project.members?.filter((member: any) => member.role === 'manager').length > 0 && (
                                <div>
                                    <h4 className="font-medium mb-3">{t('Managers')} ({project.members.filter((member: any) => member.role === 'manager').length})</h4>
                                    <div className="grid gap-3">
                                        {project.members.filter((member: any) => member.role === 'manager').map((member: any) => (
                                            <Card key={member.user.id}>
                                                <CardContent className="p-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar>
                                                                <AvatarImage src={member.user.avatar} />
                                                                <AvatarFallback>{member.user.name.charAt(0)}</AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <p className="font-medium">{member.user.name}</p>
                                                                <p className="text-sm text-gray-500">{member.user.email}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="secondary" className="bg-gray-100 text-gray-700 flex items-center gap-1"><User className="h-3 w-3" />{formatText(member.role)}</Badge>
                                                            {canManageProject && (
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            onClick={() => {
                                                                                setCurrentItem({ ...member, type: 'manager' });
                                                                                setModalType('member');
                                                                                setIsDeleteModalOpen(true);
                                                                            }}
                                                                            className="h-8 w-8 text-red-500 hover:text-red-700"
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>{t('Delete')}</TooltipContent>
                                                                </Tooltip>
                                                            )}
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Project Members */}
                            {project.members?.filter((member: any) => member.role === 'member').length > 0 && (
                                <div>
                                    <h4 className="font-medium mb-3">{t('Team Members')} ({project.members.filter((member: any) => member.role === 'member').length})</h4>
                                    <div className="grid gap-3">
                                        {project.members.filter((member: any) => member.role === 'member').map((member: any) => (
                                            <Card key={member.user.id}>
                                                <CardContent className="p-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar>
                                                                <AvatarImage src={member.user.avatar} />
                                                                <AvatarFallback>{member.user.name.charAt(0)}</AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <p className="font-medium">{member.user.name}</p>
                                                                <p className="text-sm text-gray-500">{member.user.email}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="secondary" className="bg-blue-100 text-blue-800 flex items-center gap-1"><User className="h-3 w-3" />{formatText(member.role)}</Badge>
                                                            {canManageProject && (
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            onClick={() => {
                                                                                setCurrentItem({ ...member, type: 'member' });
                                                                                setModalType('member');
                                                                                setIsDeleteModalOpen(true);
                                                                            }}
                                                                            className="h-8 w-8 text-red-500 hover:text-red-700"
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>{t('Delete')}</TooltipContent>
                                                                </Tooltip>
                                                            )}
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Project Clients */}
                            {project.clients?.length > 0 && (
                                <div>
                                    <h4 className="font-medium mb-3">{t('Clients')} ({project.clients.length})</h4>
                                    <div className="grid gap-3">
                                        {project.clients.map((client: any) => (
                                            <Card key={client.id}>
                                                <CardContent className="p-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar>
                                                                <AvatarImage src={client.avatar} />
                                                                <AvatarFallback>{client.name.charAt(0)}</AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <p className="font-medium">{client.name}</p>
                                                                <p className="text-sm text-gray-500">{client.email}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 flex items-center gap-1"><User className="h-3 w-3" />{formatText('client')}</Badge>
                                                            {canManageProject && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => {
                                                                        setCurrentItem({ ...client, type: 'client' });
                                                                        setModalType('client');
                                                                        setIsDeleteModalOpen(true);
                                                                    }}
                                                                    className="text-red-600"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Empty State */}
                            {(!project.members?.length && !project.clients?.length) && (
                                <div className="text-center py-8 text-gray-500">
                                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>{t('No managers, team members or clients assigned yet.')}</p>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="milestones" className="space-y-6 mt-0">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold">Milestones</h3>
                                {hasPermission(permissions, 'project_manage_milestones') && (
                                    <Button size="sm" onClick={() => handleAction('add-milestone')}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        {t('Add Milestone')}
                                    </Button>
                                )}
                            </div>

                            {project.milestones && project.milestones.length > 0 ? (
                                <div className="space-y-4">
                                    {project.milestones.slice((milestonesPage - 1) * itemsPerPage, milestonesPage * itemsPerPage).map((milestone: any) => (
                                        <Card key={milestone.id}>
                                            <CardContent className="p-4">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <h4 className="font-medium">{milestone.title}</h4>
                                                        <p className="text-sm text-gray-600 mt-1 line-clamp-1">{milestone.description}</p>
                                                        <div className="flex items-center gap-4 mt-2">
                                                            <Badge className={getMilestoneStatusColor(milestone.status)}>{formatText(milestone.status)}</Badge>
                                                            <span className="text-sm text-gray-500">
                                                                {t('Due')}: {new Date(milestone.due_date).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        <div className="mt-2">
                                                            <Progress value={milestone.progress} className="h-1" />
                                                        </div>
                                                    </div>
                                                    {canManageProject && (
                                                        <div className="flex gap-1">
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => handleAction('edit-milestone', milestone)}
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
                                                                        onClick={() => {
                                                                            setModalType('milestone');
                                                                            handleAction('delete-milestone', milestone);
                                                                        }}
                                                                        className="text-red-500 hover:text-red-700 h-8 w-8"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>{t('Delete')}</TooltipContent>
                                                            </Tooltip>
                                                        </div>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>{t('No milestones created yet.')}</p>
                                    {canManageProject && (
                                        <Button className="mt-4" onClick={() => handleAction('add-milestone')}>
                                            <Plus className="h-4 w-4 mr-2" />
                                            {t('Add First Milestone')}
                                        </Button>
                                    )}
                                </div>
                            )}

                            {project.milestones && project.milestones.length > itemsPerPage && (
                                <SimplePagination
                                    currentPage={milestonesPage}
                                    totalPages={Math.ceil(project.milestones.length / itemsPerPage)}
                                    onPageChange={setMilestonesPage}
                                />
                            )}
                        </TabsContent>

                        <TabsContent value="notes" className="space-y-6 mt-0">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-semibold">{t('Notes')}</h3>
                                    {hasPermission(permissions, 'project_manage_notes') && (
                                        <Button size="sm" onClick={() => handleAction('add-note')}>
                                            <Plus className="h-4 w-4 mr-2" />
                                            {t('Add Note')}
                                        </Button>
                                    )}
                                </div>

                                {/* Search and Filter Bar */}
                                <div className="bg-gray-50 rounded-lg p-4 border">
                                    <div className="flex items-center justify-between gap-4">
                                        <form onSubmit={(e) => { e.preventDefault(); handleNotesSearch(); }} className="flex gap-2 flex-1">
                                            <div className="relative flex-1 max-w-md">
                                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                                <Input
                                                    placeholder="Search by title or content..."
                                                    value={notesSearch}
                                                    onChange={(e) => setNotesSearch(e.target.value)}
                                                    className="pl-10 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                                                />
                                            </div>
                                            <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700">
                                                <Search className="h-4 w-4 mr-1.5" />
                                                {t('Search')}
                                            </Button>
                                            {notesSearch && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setNotesSearch('');
                                                        router.get(route('projects.show', project.id), {}, {
                                                            preserveState: true,
                                                            preserveScroll: true,
                                                            only: ['project', 'noteFilters']
                                                        });
                                                    }}
                                                >
                                                    {t('Clear')}
                                                </Button>
                                            )}
                                        </form>

                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-gray-600 whitespace-nowrap">{t('Per Page')}:</span>
                                            <Select
                                                value={notesPerPage.toString()}
                                                onValueChange={handleNotesPerPageChange}
                                            >
                                                <SelectTrigger className="w-20 h-9 bg-white border-gray-200">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="5">5</SelectItem>
                                                    <SelectItem value="10">10</SelectItem>
                                                    <SelectItem value="20">20</SelectItem>
                                                    <SelectItem value="50">50</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {project.notes && project.notes.data?.length > 0 ? (
                                <>
                                    <div className="space-y-4">
                                        {project.notes.data.map((note: any) => (
                                            <Card key={note.id}>
                                                <CardContent className="p-4">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="font-medium">{note.title}</h4>
                                                                {note.is_pinned && <Pin className="h-4 w-4 text-yellow-500" />}
                                                            </div>
                                                            <p className="text-sm text-gray-600 mt-2 line-clamp-1">{note.content}</p>
                                                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                                                                <span>{t('By')} {note.creator.name}</span>
                                                                <span>•</span>
                                                                <span>{new Date(note.created_at).toLocaleDateString()}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-1">
                                                            {canManageProject && (
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            onClick={() => handleAction('toggle-pin', note)}
                                                                            className="text-blue-500 hover:text-blue-700 h-8 w-8"
                                                                        >
                                                                            <Pin className="h-4 w-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>{t('Toggle Pin')}</TooltipContent>
                                                                </Tooltip>
                                                            )}
                                                            {canManageProject && (
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            onClick={() => handleAction('edit-note', note)}
                                                                            className="text-amber-500 hover:text-amber-700 h-8 w-8"
                                                                        >
                                                                            <Edit className="h-4 w-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>{t('Edit')}</TooltipContent>
                                                                </Tooltip>
                                                            )}
                                                            {canManageProject && (
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            onClick={() => {
                                                                                setModalType('note');
                                                                                handleAction('delete-note', note);
                                                                            }}
                                                                            className="text-red-500 hover:text-red-700 h-8 w-8"
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>{t('Delete')}</TooltipContent>
                                                                </Tooltip>
                                                            )}
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>

                                    {/* Pagination */}
                                    {project.notes.links && (
                                        <div className="flex items-center justify-between">
                                            <div className="text-sm text-gray-500">
                                                {t('Showing')} {project.notes.from || 0} {t('to')} {project.notes.to || 0} {t('of')} {project.notes.total || 0} {t('notes')}
                                            </div>
                                            <div className="flex gap-1">
                                                {project.notes.links.map((link: any, i: number) => {
                                                    const isTextLink = link.label === "&laquo; Previous" || link.label === "Next &raquo;";
                                                    const label = link.label.replace("&laquo; ", "").replace(" &raquo;", "");

                                                    return (
                                                        <Button
                                                            key={i}
                                                            variant={link.active ? 'default' : 'outline'}
                                                            size={isTextLink ? "sm" : "icon"}
                                                            className={isTextLink ? "px-3" : "h-8 w-8"}
                                                            disabled={!link.url}
                                                            onClick={() => {
                                                                if (link.url) {
                                                                    const url = new URL(link.url);
                                                                    const params: any = {};
                                                                    url.searchParams.forEach((value, key) => {
                                                                        params[key] = value;
                                                                    });
                                                                    router.get(route('projects.show', project.id), params, {
                                                                        preserveState: true,
                                                                        preserveScroll: true,
                                                                        only: ['project', 'noteFilters']
                                                                    });
                                                                }
                                                            }}
                                                        >
                                                            {isTextLink ? label : <span dangerouslySetInnerHTML={{ __html: link.label }} />}
                                                        </Button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <Pin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                        {notesSearch ? t('No notes found') : t('No notes created yet')}
                                    </h3>
                                    <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                                        {notesSearch ? t('Try adjusting your search terms or') + ' ' : t('Create notes to keep track of important information.')}
                                        {notesSearch && (
                                            <Button variant="link" className="p-0 h-auto" onClick={() => {
                                                setNotesSearch('');
                                                router.get(route('projects.show', project.id), {}, {
                                                    preserveState: true,
                                                    preserveScroll: true,
                                                    only: ['project', 'noteFilters']
                                                });
                                            }}>
                                                {t('clear search')}
                                            </Button>
                                        )}
                                    </p>
                                    {!notesSearch && canManageProject && (
                                        <Button className="mt-4" onClick={() => handleAction('add-note')}>
                                            <Plus className="h-4 w-4 mr-2" />
                                            {t('Add First Note')}
                                        </Button>
                                    )}
                                </div>
                            )}
                        </TabsContent>

                        {hasViewBudgetAccess && (
                            <TabsContent value="budget" className="space-y-6 mt-0">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-semibold">{t('Budget Management')}</h3>
                                    {budget && hasViewBudgetAccess && (
                                        <Button size="sm" onClick={() => router.get(route('budgets.show', budget.id))}>
                                            <Eye className="h-4 w-4 mr-2" />
                                            {t('Show Budget')}
                                        </Button>
                                    )}
                                </div>

                                {budget ? (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <Card>
                                                <CardContent className="p-4">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <DollarSign className="h-4 w-4 text-green-500" />
                                                        <span className="text-sm font-medium">{t('Total Budget')}</span>
                                                    </div>
                                                    <p className="text-2xl font-bold">{formatCurrency(budget.total_budget || 0)}</p>
                                                </CardContent>
                                            </Card>
                                            <Card>
                                                <CardContent className="p-4">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Receipt className="h-4 w-4 text-blue-500" />
                                                        <span className="text-sm font-medium">{t('Total Spent')}</span>
                                                    </div>
                                                    <p className="text-2xl font-bold">{formatCurrency(budget.total_spent || 0)}</p>
                                                </CardContent>
                                            </Card>
                                            <Card>
                                                <CardContent className="p-4">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Clock className="h-4 w-4 text-orange-500" />
                                                        <span className="text-sm font-medium">{t('Remaining')}</span>
                                                    </div>
                                                    <p className="text-2xl font-bold">{formatCurrency(budget.remaining_budget || 0)}</p>
                                                </CardContent>
                                            </Card>
                                        </div>

                                        <Card>
                                            <CardHeader>
                                                <CardTitle>{t('Budget Progress')}</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between">
                                                        <span>{t('Utilization')}</span>
                                                        <span>{budget.utilization_percentage?.toFixed(1) || 0}%</span>
                                                    </div>
                                                    <Progress value={budget.utilization_percentage || 0} className="h-2" />
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card>
                                            <CardHeader>
                                                <CardTitle>{t('Recent Expenses')}</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                {budget.expenses?.length > 0 ? (
                                                    <div className="space-y-3">
                                                        {budget.expenses.slice(0, 3).map((expense: any) => (
                                                            <div key={expense.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                                                                <div>
                                                                    <p className="font-medium">{expense.title}</p>
                                                                    <p className="text-sm text-gray-500">{expense.submitter?.name}</p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="font-bold">{formatCurrency(expense.amount)}</p>
                                                                    <Badge variant="outline" className={`text-xs ${expense.status === 'approved' ? 'bg-green-100 text-green-800 border-green-200' :
                                                                            expense.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                                                                expense.status === 'rejected' ? 'bg-red-100 text-red-800 border-red-200' :
                                                                                    'bg-gray-100 text-gray-800 border-gray-200'
                                                                        }`}>{formatText(expense.status)}</Badge>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-gray-500 text-center py-4">{t('No expenses recorded yet')}</p>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </div>
                                ) : (
                                    <Card>
                                        <CardContent className="p-8 text-center">
                                            <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                                            <h3 className="text-lg font-semibold mb-2">{t('No Budget Set')}</h3>
                                            <p className="text-gray-500 mb-4">{t('Create a budget to track project expenses and spending.')}</p>
                                            {canCreateBudget && (
                                                <Button onClick={() => router.get(route('budgets.index'))}>
                                                    <Plus className="h-4 w-4 mr-2" />
                                                    {t('Create Budget')}
                                                </Button>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}
                            </TabsContent>
                        )}

                        <TabsContent value="expense" className="space-y-6 mt-0">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold">{t('Project Expenses')}</h3>
                                <Button size="sm" onClick={() => router.get(route('expenses.index', { project_id: project.id, project_name: project.title }))}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    {t('Manage Expenses')}
                                </Button>
                            </div>

                            {projectExpenses && projectExpenses.length > 0 ? (
                                <div className="space-y-4">
                                    {/* Expense Stats */}
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <Card>
                                            <CardContent className="p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <CreditCard className="h-4 w-4 text-blue-500" />
                                                    <span className="text-sm font-medium">{t('Total Expenses')}</span>
                                                </div>
                                                <p className="text-2xl font-bold">{projectExpenses.length}</p>
                                            </CardContent>
                                        </Card>
                                        <Card>
                                            <CardContent className="p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                                    <span className="text-sm font-medium">{t('Approved')}</span>
                                                </div>
                                                <p className="text-2xl font-bold">
                                                    {projectExpenses.filter((expense: any) => expense.status === 'approved').length}
                                                </p>
                                            </CardContent>
                                        </Card>
                                        <Card>
                                            <CardContent className="p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Clock className="h-4 w-4 text-yellow-500" />
                                                    <span className="text-sm font-medium">{t('Pending')}</span>
                                                </div>
                                                <p className="text-2xl font-bold">
                                                    {projectExpenses.filter((expense: any) => expense.status === 'pending').length}
                                                </p>
                                            </CardContent>
                                        </Card>
                                        <Card>
                                            <CardContent className="p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <DollarSign className="h-4 w-4 text-purple-500" />
                                                    <span className="text-sm font-medium">{t('Total Amount')}</span>
                                                </div>
                                                <p className="text-2xl font-bold">
                                                    {formatCurrency(projectExpenses.reduce((total: number, expense: any) => total + parseFloat(expense.amount || 0), 0))}
                                                </p>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {/* Recent Expenses */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>{t('Recent Expenses')}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-3">
                                                {projectExpenses.slice(0, 5).map((expense: any) => (
                                                    <div key={expense.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex-1">
                                                                    <h4 className="font-medium text-sm">{expense.title}</h4>
                                                                    <p className="text-xs text-gray-500 mt-1">
                                                                        <span className="line-clamp-1">{expense.description || t('No description')}</span>
                                                                    </p>
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        <span className="text-xs text-gray-400">{t('By')} {expense.submitter?.name}</span>
                                                                        <span className="text-xs text-gray-400">•</span>
                                                                        <span className="text-xs text-gray-400">{new Date(expense.created_at).toLocaleDateString()}</span>
                                                                        {expense.category && (
                                                                            <>
                                                                                <span className="text-xs text-gray-400">•</span>
                                                                                <Badge variant="outline" className="text-xs">{expense.category}</Badge>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-lg font-bold">{formatCurrency(expense.amount)}</p>
                                                                    <Badge variant="outline" className={`text-xs ${expense.status === 'approved' ? 'bg-green-100 text-green-800 border-green-200' :
                                                                            expense.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                                                                expense.status === 'rejected' ? 'bg-red-100 text-red-800 border-red-200' :
                                                                                    'bg-gray-100 text-gray-800 border-gray-200'
                                                                        }`}>
                                                                        {formatText(expense.status)}
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            {projectExpenses.length > 5 && (
                                                <div className="mt-4 text-center">
                                                    <Button variant="outline" size="sm" onClick={() => router.get(route('expenses.index', { project_id: project.id }))}>
                                                        {t('View All')} {projectExpenses.length} {t('Expenses')}
                                                    </Button>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            ) : (
                                <Card>
                                    <CardContent className="p-8 text-center">
                                        <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                                        <h3 className="text-lg font-semibold mb-2">{t('No Expenses Recorded')}</h3>
                                        <p className="text-gray-500 mb-4">{t('Track project expenses and spending for better budget management.')}</p>
                                        <Button onClick={() => router.get(route('expenses.index', { project_id: project.id }))}>
                                            <Plus className="h-4 w-4 mr-2" />
                                            {t('Manage Expenses')}
                                        </Button>
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>



                        <TabsContent value="tasks" className="space-y-6 mt-0">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold">{t('Project Tasks')}</h3>
                                <div className="flex gap-2">
                                    <Button size="sm" onClick={() => router.get(route('tasks.index', { project_id: project.id, project_name: project.title }))}>
                                        <Eye className="h-4 w-4 mr-2" />
                                        {t('Manage Tasks')}
                                    </Button>
                                </div>
                            </div>

                            {projectTasks && projectTasks.length > 0 ? (
                                <div className="space-y-6">
                                    {/* Task Stats - Always 4 Cards */}
                                    {(() => {
                                        const tasksByStage = projectTasks.reduce((acc: any, task: any) => {
                                            const stageName = task.task_stage?.name || 'No Stage';
                                            acc[stageName] = (acc[stageName] || 0) + 1;
                                            return acc;
                                        }, {});

                                        const totalTasks = projectTasks.length;
                                        const completedTasks = projectTasks.filter((task: any) => task.task_stage?.name === 'Completed' || task.task_stage?.name === 'Done').length;
                                        const inProgressTasks = projectTasks.filter((task: any) => task.task_stage?.name === 'In Progress' || task.task_stage?.name === 'Working').length;
                                        const pendingTasks = totalTasks - completedTasks - inProgressTasks;

                                        return (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                                {/* Total Tasks Card */}
                                                <Card>
                                                    <CardContent className="p-4">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <CheckSquare className="h-4 w-4 text-blue-500" />
                                                            <span className="text-sm font-medium">{t('Total Tasks')}</span>
                                                        </div>
                                                        <p className="text-2xl font-bold">{totalTasks}</p>
                                                    </CardContent>
                                                </Card>

                                                {/* Completed Tasks Card */}
                                                <Card>
                                                    <CardContent className="p-4">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <CheckSquare className="h-4 w-4 text-green-500" />
                                                            <span className="text-sm font-medium">{t('Completed')}</span>
                                                        </div>
                                                        <p className="text-2xl font-bold">{completedTasks}</p>
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            {totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0}% {t('of total')}
                                                        </p>
                                                    </CardContent>
                                                </Card>

                                                {/* In Progress Tasks Card */}
                                                <Card>
                                                    <CardContent className="p-4">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <CheckSquare className="h-4 w-4 text-orange-500" />
                                                            <span className="text-sm font-medium">{t('In Progress')}</span>
                                                        </div>
                                                        <p className="text-2xl font-bold">{inProgressTasks}</p>
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            {totalTasks > 0 ? ((inProgressTasks / totalTasks) * 100).toFixed(1) : 0}% {t('of total')}
                                                        </p>
                                                    </CardContent>
                                                </Card>

                                                {/* Pending Tasks Card */}
                                                <Card>
                                                    <CardContent className="p-4">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <CheckSquare className="h-4 w-4 text-purple-500" />
                                                            <span className="text-sm font-medium">{t('Pending')}</span>
                                                        </div>
                                                        <p className="text-2xl font-bold">{pendingTasks}</p>
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            {totalTasks > 0 ? ((pendingTasks / totalTasks) * 100).toFixed(1) : 0}% {t('of total')}
                                                        </p>
                                                    </CardContent>
                                                </Card>
                                            </div>
                                        );
                                    })()}

                                    {/* Recent Tasks */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>{t('Recent Tasks')}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-3">
                                                {projectTasks.slice(0, 5).map((task: any) => (
                                                    <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex-1">
                                                                    <h4 className="font-medium text-sm">{task.title}</h4>
                                                                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">{task.description || 'No description'}</p>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <Badge
                                                                        variant="outline"
                                                                        className={`text-xs ${task.priority === 'critical' ? 'bg-red-100 text-red-800 border-red-200' :
                                                                                task.priority === 'high' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                                                                                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                                                                        'bg-green-100 text-green-800 border-green-200'
                                                                            }`}
                                                                    >
                                                                        {formatText(task.priority)}
                                                                    </Badge>
                                                                    <Badge
                                                                        variant="outline"
                                                                        style={{
                                                                            backgroundColor: task.task_stage?.color + '20',
                                                                            borderColor: task.task_stage?.color,
                                                                            color: task.task_stage?.color
                                                                        }}
                                                                        className="text-xs"
                                                                    >
                                                                        {formatText(task.task_stage?.name)}
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center justify-between mt-2">
                                                                <div className="flex items-center gap-2">
                                                                    {task.assigned_to ? (
                                                                        <div className="flex items-center gap-1">
                                                                            <Avatar className="h-5 w-5">
                                                                                <AvatarImage src={task.assigned_to.avatar} />
                                                                                <AvatarFallback className="text-xs">
                                                                                    {task.assigned_to.name?.charAt(0)}
                                                                                </AvatarFallback>
                                                                            </Avatar>
                                                                            <span className="text-xs text-gray-600">{task.assigned_to.name}</span>
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-xs text-gray-400">{t('Unassigned')}</span>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="flex items-center gap-1">
                                                                        <div className="w-12 bg-gray-200 rounded-full h-1">
                                                                            <div
                                                                                className="bg-blue-600 h-1 rounded-full"
                                                                                style={{ width: `${task.progress}%` }}
                                                                            ></div>
                                                                        </div>
                                                                        <span className="text-xs text-gray-600">{task.progress}%</span>
                                                                    </div>
                                                                    <span className="text-xs text-gray-500">
                                                                        {task.end_date ? new Date(task.end_date).toLocaleDateString() : 'No due date'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            {projectTasks.length > 5 && (
                                                <div className="mt-4 text-center">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => router.get(route('tasks.index', { project_id: project.id, project_name: project.title }))}
                                                    >
                                                        {t('View All')} {projectTasks.length} {t('Tasks')}
                                                    </Button>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            ) : (
                                <Card>
                                    <CardContent className="p-8 text-center">
                                        <CheckSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                                        <h3 className="text-lg font-semibold mb-2">{t('No Tasks Yet')}</h3>
                                        <p className="text-gray-500 mb-4">{t('Create tasks to track progress and assign work for this project.')}</p>
                                        {canManageProject && (
                                            <Button onClick={() => router.get(route('tasks.index', { project_id: project.id, project_name: project.title }))}>
                                                <Plus className="h-4 w-4 mr-2" />
                                                {t('Create First Task')}
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>

                        <TabsContent value="bugs" className="space-y-6 mt-0">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold">{t('Project Bugs')}</h3>
                                <div className="flex gap-2">
                                    <Button size="sm" onClick={() => router.get(route('bugs.index', { project_id: project.id, project_name: project.title }))}>
                                        <Eye className="h-4 w-4 mr-2" />
                                        {t('Manage Bugs')}
                                    </Button>
                                </div>
                            </div>

                            {projectBugs && projectBugs.length > 0 ? (
                                <div className="space-y-4">
                                    {/* Bug Stats */}
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <Card>
                                            <CardContent className="p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Bug className="h-4 w-4 text-red-500" />
                                                    <span className="text-sm font-medium">{t('Total Bugs')}</span>
                                                </div>
                                                <p className="text-2xl font-bold">{projectBugs.length}</p>
                                            </CardContent>
                                        </Card>
                                        <Card>
                                            <CardContent className="p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                                    <span className="text-sm font-medium">{t('Open Issues')}</span>
                                                </div>
                                                <p className="text-2xl font-bold">
                                                    {projectBugs.filter((bug: any) => !['Resolved', 'Closed'].includes(bug.bug_status?.name)).length}
                                                </p>
                                            </CardContent>
                                        </Card>
                                        <Card>
                                            <CardContent className="p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                                                    <span className="text-sm font-medium">{t('Critical')}</span>
                                                </div>
                                                <p className="text-2xl font-bold">
                                                    {projectBugs.filter((bug: any) => bug.priority === 'critical').length}
                                                </p>
                                            </CardContent>
                                        </Card>
                                        <Card>
                                            <CardContent className="p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <User className="h-4 w-4 text-purple-500" />
                                                    <span className="text-sm font-medium">{t('Unassigned')}</span>
                                                </div>
                                                <p className="text-2xl font-bold">
                                                    {projectBugs.filter((bug: any) => !bug.assigned_to).length}
                                                </p>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {/* Recent Bugs */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>{t('Recent Bugs')}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-3">
                                                {projectBugs.slice(0, 5).map((bug: any) => (
                                                    <div key={bug.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex-1">
                                                                    <h4 className="font-medium text-sm">{bug.title}</h4>
                                                                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">{bug.description || 'No description'}</p>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <Badge
                                                                        variant="outline"
                                                                        className={`text-xs ${bug.priority === 'critical' ? 'bg-red-100 text-red-800 border-red-200' :
                                                                                bug.priority === 'high' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                                                                                    bug.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                                                                        'bg-green-100 text-green-800 border-green-200'
                                                                            }`}
                                                                    >
                                                                        {formatText(bug.priority)}
                                                                    </Badge>
                                                                    <Badge
                                                                        variant="outline"
                                                                        className={`text-xs ${bug.severity === 'blocker' ? 'bg-red-100 text-red-800 border-red-200' :
                                                                                bug.severity === 'critical' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                                                                                    bug.severity === 'major' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                                                                        'bg-green-100 text-green-800 border-green-200'
                                                                            }`}
                                                                    >
                                                                        {formatText(bug.severity)}
                                                                    </Badge>
                                                                    <Badge
                                                                        variant="outline"
                                                                        style={{
                                                                            backgroundColor: bug.bug_status?.color + '20',
                                                                            borderColor: bug.bug_status?.color,
                                                                            color: bug.bug_status?.color
                                                                        }}
                                                                        className="text-xs"
                                                                    >
                                                                        {formatText(bug.bug_status?.name)}
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center justify-between mt-2">
                                                                <div className="flex items-center gap-2">
                                                                    {bug.assigned_to ? (
                                                                        <div className="flex items-center gap-1">
                                                                            <Avatar className="h-5 w-5">
                                                                                <AvatarImage src={bug.assigned_to.avatar} />
                                                                                <AvatarFallback className="text-xs">
                                                                                    {bug.assigned_to.name?.charAt(0)}
                                                                                </AvatarFallback>
                                                                            </Avatar>
                                                                            <span className="text-xs text-gray-600">{bug.assigned_to.name}</span>
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-xs text-gray-400">{t('Unassigned')}</span>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs text-gray-500">
                                                                        {t('Reported by')} {bug.reported_by?.name}
                                                                    </span>
                                                                    <span className="text-xs text-gray-500">
                                                                        {bug.end_date ? new Date(bug.end_date).toLocaleDateString() : t('No due date')}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            {projectBugs.length > 5 && (
                                                <div className="mt-4 text-center">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => router.get(route('bugs.index', { project_id: project.id, project_name: project.title }))}
                                                    >
                                                        {t('View All')} {projectBugs.length} {t('Bugs')}
                                                    </Button>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            ) : (
                                <Card>
                                    <CardContent className="p-8 text-center">
                                        <Bug className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                                        <h3 className="text-lg font-semibold mb-2">{t('No Bugs Reported')}</h3>
                                        <p className="text-gray-500 mb-4">{t('Track and manage bugs for better project quality.')}</p>
                                        {canManageProject && (
                                            <Button onClick={() => router.get(route('bugs.index', { project_id: project.id, project_name: project.title }))}>
                                                <Plus className="h-4 w-4 mr-2" />
                                                {t('Report First Bug')}
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>

                        <TabsContent value="timesheet" className="space-y-6 mt-0">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold">{t('Time Tracking')}</h3>
                                <div className="flex gap-2">
                                    <Button size="sm" onClick={() => router.get(route('timesheets.index', { project_id: project.id }))}>
                                        <Eye className="h-4 w-4 mr-2" />
                                        {t('Manage Timesheets')}
                                    </Button>
                                </div>
                            </div>

                            {projectTimesheets && projectTimesheets.length > 0 ? (
                                <div className="space-y-4">
                                    {/* Timesheet Stats */}
                                    {(() => {
                                        const totalHours = projectTimesheets.reduce((total: number, timesheet: any) => total + parseFloat(timesheet.total_hours || 0), 0);
                                        const billableHours = projectTimesheets.reduce((total: number, timesheet: any) => total + parseFloat(timesheet.billable_hours || 0), 0);
                                        const hoursDisplay = formatHoursDisplay(totalHours, billableHours);
                                        const overdueCount = projectTimesheets.filter((timesheet: any) => isTimesheetOverdue(timesheet.end_date, timesheet.status)).length;

                                        return (
                                            <>
                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                    <Card>
                                                        <CardContent className="p-4">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <Timer className="h-4 w-4 text-blue-500" />
                                                                <span className="text-sm font-medium">{t('Total Hours')}</span>
                                                                {hoursDisplay.match && totalHours > 0 && (
                                                                    <CheckCircle className="h-4 w-4 text-green-500" title={t('Hours match')} />
                                                                )}
                                                            </div>
                                                            <p className="text-2xl font-bold">{project.total_project_hours?.toFixed(1) || '0.0'}h</p>
                                                        </CardContent>
                                                    </Card>
                                                    <Card>
                                                        <CardContent className="p-4">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <Clock className="h-4 w-4 text-green-500" />
                                                                <span className="text-sm font-medium">{t('Billable Hours')}</span>
                                                            </div>
                                                            <p className="text-2xl font-bold text-green-600">
                                                                {project.total_billable_hours?.toFixed(1) || '0.0'}h
                                                            </p>
                                                            <p className="text-xs text-gray-500 mt-1">{project.submitted_timesheets_percentage || 0}% {t('of total hours')}</p>
                                                        </CardContent>
                                                    </Card>
                                                    <Card>
                                                        <CardContent className="p-4">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <Users className="h-4 w-4 text-purple-500" />
                                                                <span className="text-sm font-medium">{t('Team Members')}</span>
                                                            </div>
                                                            <p className="text-2xl font-bold">
                                                                {new Set(projectTimesheets.map((timesheet: any) => timesheet.user?.id)).size}
                                                            </p>
                                                        </CardContent>
                                                    </Card>
                                                    <Card>
                                                        <CardContent className="p-4">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <CheckSquare className="h-4 w-4 text-orange-500" />
                                                                <span className="text-sm font-medium">{t('Approved')}</span>
                                                            </div>
                                                            <p className="text-2xl font-bold">
                                                                {projectTimesheets.filter((timesheet: any) => timesheet.status === 'approved').length}
                                                            </p>
                                                        </CardContent>
                                                    </Card>
                                                </div>

                                                {/* Hours Status Summary */}
                                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-lg p-4">
                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between">
                                                            <h4 className="text-sm font-semibold text-gray-700">{t('Hours Status')}</h4>
                                                            <div className="flex items-center gap-2">
                                                                {hoursDisplay.match && totalHours > 0 ? (
                                                                    <Badge className="bg-green-100 text-green-800 border-green-300" variant="outline">
                                                                        <CheckCircle className="h-3 w-3 mr-1" />
                                                                        {t('All Hours Billable')}
                                                                    </Badge>
                                                                ) : totalHours > 0 ? (
                                                                    <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300" variant="outline">
                                                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                                                        {t('Partial Billable')}
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="outline">{t('No Hours Logged')}</Badge>
                                                                )}
                                                                {overdueCount > 0 && (
                                                                    <Badge className="bg-red-100 text-red-800 border-red-300" variant="outline">
                                                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                                                        {overdueCount} {t('Overdue')}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {totalHours > 0 && (
                                                            <div className="bg-white rounded-md p-3 border border-gray-200">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <span className="text-sm font-medium text-gray-700">{t('Billable Rate')}</span>
                                                                    <span className="text-lg font-bold text-gray-900">{project.submitted_timesheets_percentage}%</span>
                                                                </div>
                                                                <div className="relative">
                                                                    <Progress value={project.submitted_timesheets_percentage} className="w-full h-3 bg-gray-200" />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </>
                                        );
                                    })()}

                                    {/* Recent Timesheets */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>{t('Recent Timesheets')}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-3">
                                                {projectTimesheets.slice(0, 5).map((timesheet: any) => {
                                                    const hoursDisplay = formatHoursDisplay(timesheet.total_hours || 0, timesheet.billable_hours || 0);
                                                    const label = getTimesheetLabel({
                                                        total_hours: timesheet.total_hours || 0,
                                                        billable_hours: timesheet.billable_hours || 0,
                                                        end_date: timesheet.end_date,
                                                        status: timesheet.status
                                                    });
                                                    const isOverdue = isTimesheetOverdue(timesheet.end_date, timesheet.status);

                                                    return (
                                                        <div key={timesheet.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="flex-1">
                                                                        <div className="flex items-center gap-2">
                                                                            <h4 className="font-medium text-sm">
                                                                                {t('Week of')} {new Date(timesheet.start_date).toLocaleDateString()}
                                                                            </h4>
                                                                            {hoursDisplay.match && timesheet.total_hours > 0 && (
                                                                                <CheckCircle className="h-3 w-3 text-green-500" title={t('Hours match')} />
                                                                            )}
                                                                            {isOverdue && (
                                                                                <Badge className="bg-red-100 text-red-800 border-red-200 text-xs" variant="outline">
                                                                                    {getDaysOverdue(timesheet.end_date)}{t('d overdue')}
                                                                                </Badge>
                                                                            )}
                                                                        </div>
                                                                        <p className="text-xs text-gray-500 mt-1">
                                                                            {new Date(timesheet.start_date).toLocaleDateString()} - {new Date(timesheet.end_date).toLocaleDateString()}
                                                                        </p>
                                                                        {label && (
                                                                            <Badge className={`${label.className} text-xs mt-1`} variant="outline">
                                                                                {label.label}
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <Badge
                                                                            variant="outline"
                                                                            className={`text-xs ${timesheet.status === 'approved' ? 'bg-green-100 text-green-800 border-green-200' :
                                                                                    timesheet.status === 'submitted' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                                                                        timesheet.status === 'rejected' ? 'bg-red-100 text-red-800 border-red-200' :
                                                                                            isOverdue ? 'bg-red-100 text-red-800 border-red-200' :
                                                                                                'bg-gray-100 text-gray-800 border-gray-200'
                                                                                }`}
                                                                        >
                                                                            {isOverdue ? formatText('overdue') : formatText(timesheet.status)}
                                                                        </Badge>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center justify-between mt-2">
                                                                    <div className="flex items-center gap-2">
                                                                        {timesheet.user ? (
                                                                            <div className="flex items-center gap-1">
                                                                                <Avatar className="h-5 w-5">
                                                                                    <AvatarImage src={timesheet.user.avatar} />
                                                                                    <AvatarFallback className="text-xs">
                                                                                        {timesheet.user.name?.charAt(0)}
                                                                                    </AvatarFallback>
                                                                                </Avatar>
                                                                                <span className="text-xs text-gray-600">{timesheet.user.name}</span>
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-xs text-gray-400">{t('Unknown User')}</span>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="flex items-center gap-1">
                                                                            <Timer className="h-3 w-3 text-blue-500" />
                                                                            <span className="text-xs text-gray-600">{hoursDisplay.total}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-1">
                                                                            <DollarSign className="h-3 w-3 text-green-500" />
                                                                            <span className="text-xs text-green-600">
                                                                                {hoursDisplay.billable} ({hoursDisplay.percentage}%)
                                                                            </span>
                                                                        </div>
                                                                        <span className="text-xs text-gray-500">
                                                                            {timesheet.entries?.length || 0} {t('entries')}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            {projectTimesheets.length > 5 && (
                                                <div className="mt-4 text-center">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => router.get(route('timesheets.index', { project_id: project.id }))}
                                                    >
                                                        {t('View All')} {projectTimesheets.length} {t('timesheets')}
                                                    </Button>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            ) : (
                                <Card>
                                    <CardContent className="p-8 text-center">
                                        <Timer className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                                        <h3 className="text-lg font-semibold mb-2">{t('No Timesheets Yet')}</h3>
                                        <p className="text-gray-500 mb-4">{t('Start tracking time on project tasks to see timesheet data here.')}</p>
                                        {canManageProject && (
                                            <Button onClick={() => router.get(route('timesheets.index', { project_id: project.id }))}>
                                                <Plus className="h-4 w-4 mr-2" />
                                                {t('Create First Timesheet')}
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>

                        <TabsContent value="attachments" className="space-y-6 mt-0">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-semibold">{t('Project Attachments')}</h3>
                                    {hasPermission(permissions, 'project_manage_attachments') && (
                                        <Button size="sm" onClick={() => handleAction('add-attachment')}>
                                            <Upload className="h-4 w-4 mr-2" />
                                            {t('Upload Files')}
                                        </Button>
                                    )}
                                </div>

                                {/* Search and Filter Bar */}
                                <div className="bg-gray-50 rounded-lg p-4 border">
                                    <div className="flex items-center justify-between gap-4">
                                        <form onSubmit={(e) => { e.preventDefault(); handleAttachmentSearch(); }} className="flex gap-2 flex-1">
                                            <div className="relative flex-1 max-w-md">
                                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                                <Input
                                                    placeholder="Search by filename or uploader..."
                                                    value={attachmentSearch}
                                                    onChange={(e) => setAttachmentSearch(e.target.value)}
                                                    className="pl-10 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                                                />
                                            </div>
                                            <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700">
                                                <Search className="h-4 w-4 mr-1.5" />
                                                {t('Search')}
                                            </Button>
                                            {attachmentSearch && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setAttachmentSearch('');
                                                        router.get(route('projects.show', project.id), {}, {
                                                            preserveState: true,
                                                            preserveScroll: true,
                                                            only: ['project', 'attachmentFilters']
                                                        });
                                                    }}
                                                >
                                                    {t('Clear')}
                                                </Button>
                                            )}
                                        </form>

                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-gray-600 whitespace-nowrap">{t('Per Page')}:</span>
                                            <Select
                                                value={attachmentsPerPage.toString()}
                                                onValueChange={handleAttachmentPerPageChange}
                                            >
                                                <SelectTrigger className="w-20 h-9 bg-white border-gray-200">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="6">6</SelectItem>
                                                    <SelectItem value="12">12</SelectItem>
                                                    <SelectItem value="24">24</SelectItem>
                                                    <SelectItem value="48">48</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {project.attachments && project.attachments.data?.length > 0 ? (
                                <>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                                        {project.attachments.data.map((attachment: any) => (
                                            <Card key={attachment.id} className="group hover:shadow-lg transition-all duration-200 border-0 shadow-md hover:scale-[1.02] bg-gradient-to-br from-white to-gray-50">
                                                <CardContent className="p-0">
                                                    {/* Image Preview */}
                                                    <div className="relative overflow-hidden rounded-t-lg">
                                                        {attachment.media_item?.url ? (
                                                            <div className="relative">
                                                                <img
                                                                    src={attachment.media_item.url}
                                                                    alt={attachment.media_item.name}
                                                                    className="w-full h-24 object-cover transition-transform duration-200 group-hover:scale-105"
                                                                    onError={(e) => {
                                                                        e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik04NyA2NUw5MyA3MUwxMDcgNTdMMTIzIDczVjEwNUg3N1Y2NUg4N1oiIGZpbGw9IiM5Q0EzQUYiLz4KPGNpcmNsZSBjeD0iOTEiIGN5PSI1NyIgcj0iNCIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K';
                                                                    }}
                                                                />
                                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                                                                {/* Action Buttons Overlay */}
                                                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                                    <Button
                                                                        variant="secondary"
                                                                        size="icon"
                                                                        className="h-8 w-8 bg-white/90 hover:bg-white shadow-md"
                                                                        onClick={() => {
                                                                            if (attachment.media_item?.url) {
                                                                                window.open(route('project-attachments.download', attachment.id), '_blank');
                                                                            }
                                                                        }}
                                                                    >
                                                                        <Download className="h-4 w-4 text-gray-700" />
                                                                    </Button>

                                                                    {canManageProject && (
                                                                        <Button
                                                                            variant="secondary"
                                                                            size="icon"
                                                                            className="h-8 w-8 bg-red-500/90 hover:bg-red-600 shadow-md"
                                                                            onClick={() => {
                                                                                setModalType('attachment');
                                                                                handleAction('delete-attachment', attachment);
                                                                            }}
                                                                        >
                                                                            <Trash2 className="h-4 w-4 text-white" />
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="w-full h-24 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                                                <Paperclip className="h-6 w-6 text-gray-400" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Content */}
                                                    <div className="p-2">
                                                        <h4 className="font-medium text-xs text-gray-900 truncate mb-1" title={attachment.media_item?.name}>
                                                            {attachment.media_item?.name || 'Unnamed file'}
                                                        </h4>
                                                        <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                                                            <Avatar className="h-3 w-3">
                                                                <AvatarFallback className="text-xs bg-blue-100 text-blue-600">
                                                                    {attachment.uploaded_by?.name?.charAt(0)}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <span className="truncate">{attachment.uploaded_by?.name}</span>
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {new Date(attachment.created_at).toLocaleString()}
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>

                                    {/* Pagination */}
                                    {project.attachments.links && (
                                        <div className="flex items-center justify-between">
                                            <div className="text-sm text-gray-500">
                                                {t('Showing')} {project.attachments.from || 0} {t('to')} {project.attachments.to || 0} {t('of')} {project.attachments.total || 0} {t('attachments')}
                                            </div>
                                            <div className="flex gap-1">
                                                {project.attachments.links.map((link: any, i: number) => {
                                                    const isTextLink = link.label === "&laquo; Previous" || link.label === "Next &raquo;";
                                                    const label = link.label.replace("&laquo; ", "").replace(" &raquo;", "");

                                                    return (
                                                        <Button
                                                            key={i}
                                                            variant={link.active ? 'default' : 'outline'}
                                                            size={isTextLink ? "sm" : "icon"}
                                                            className={isTextLink ? "px-3" : "h-8 w-8"}
                                                            disabled={!link.url}
                                                            onClick={() => {
                                                                if (link.url) {
                                                                    const url = new URL(link.url);
                                                                    const params: any = {};
                                                                    url.searchParams.forEach((value, key) => {
                                                                        params[key] = value;
                                                                    });
                                                                    router.get(route('projects.show', project.id), params, {
                                                                        preserveState: true,
                                                                        preserveScroll: true,
                                                                        only: ['project', 'attachmentFilters']
                                                                    });
                                                                }
                                                            }}
                                                        >
                                                            {isTextLink ? label : <span dangerouslySetInnerHTML={{ __html: link.label }} />}
                                                        </Button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-16">
                                    <div className="mx-auto w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                                        <Paperclip className="h-10 w-10 text-primary" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                        {attachmentSearch ? 'No attachments found' : 'No attachments yet'}
                                    </h3>
                                    <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                                        {attachmentSearch ? 'Try adjusting your search terms or ' : 'Upload files to share documents, images, and other resources with your team.'}
                                        {attachmentSearch && (
                                            <Button variant="link" className="p-0 h-auto" onClick={() => {
                                                setAttachmentSearch('');
                                                router.get(route('projects.show', project.id), {}, {
                                                    preserveState: true,
                                                    preserveScroll: true,
                                                    only: ['project', 'attachmentFilters']
                                                });
                                            }}>
                                                {t('Clear search')}
                                            </Button>
                                        )}
                                    </p>
                                    {!attachmentSearch && canManageProject && (
                                        <Button onClick={() => handleAction('add-attachment')}>
                                            <Upload className="h-4 w-4 mr-2" />
                                            {t('Upload First Attachment')}
                                        </Button>
                                    )}
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="activity" className="space-y-6 mt-0">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-semibold">{t('Project Activity')}</h3>
                                </div>

                                {/* Search and Filter Bar */}
                                <div className="bg-gray-50 rounded-lg p-4 border">
                                    <div className="flex items-center justify-between gap-4">
                                        <form onSubmit={(e) => { e.preventDefault(); handleActivitySearch(); }} className="flex gap-2 flex-1">
                                            <div className="relative flex-1 max-w-md">
                                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                                <Input
                                                    placeholder="Search activity..."
                                                    value={activitySearch}
                                                    onChange={(e) => setActivitySearch(e.target.value)}
                                                    className="pl-10 bg-white"
                                                />
                                            </div>
                                            <Button type="submit" size="sm">
                                                <Search className="h-4 w-4 mr-1.5" />
                                                {t('Search')}
                                            </Button>
                                            {activitySearch && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setActivitySearch('');
                                                        router.get(route('projects.show', project.id), {}, {
                                                            preserveState: true,
                                                            preserveScroll: true,
                                                            only: ['project', 'activityFilters']
                                                        });
                                                    }}
                                                >
                                                    {t('Clear')}
                                                </Button>
                                            )}
                                        </form>

                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-gray-600 whitespace-nowrap">{t('Per Page')}:</span>
                                            <Select
                                                value={activityPerPage.toString()}
                                                onValueChange={handleActivityPerPageChange}
                                            >
                                                <SelectTrigger className="w-20 h-9 bg-white border-gray-200">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="5">5</SelectItem>
                                                    <SelectItem value="10">10</SelectItem>
                                                    <SelectItem value="20">20</SelectItem>
                                                    <SelectItem value="50">50</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {project.activities && project.activities.data?.length > 0 ? (
                                <>
                                    <div className="space-y-4">
                                        {project.activities.data.map((activity: any) => (
                                            <Card key={activity.id}>
                                                <CardContent className="p-4">
                                                    <div className="flex items-start gap-3">
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarFallback className="text-xs">
                                                                {activity.user.name.charAt(0)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex-1">
                                                            <p className="text-sm">{activity.description}</p>
                                                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                                                <span>{activity.user.name}</span>
                                                                <span>•</span>
                                                                <span>{new Date(activity.created_at).toLocaleString()}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>

                                    {/* Pagination */}
                                    {project.activities.links && (
                                        <div className="flex items-center justify-between">
                                            <div className="text-sm text-gray-500">
                                                {t('Showing')} {project.activities.from || 0} {t('to')} {project.activities.to || 0} {t('of')} {project.activities.total || 0} {t('activities')}
                                            </div>
                                            <div className="flex gap-1">
                                                {project.activities.links.map((link: any, i: number) => {
                                                    const isTextLink = link.label === "&laquo; Previous" || link.label === "Next &raquo;";
                                                    const label = link.label.replace("&laquo; ", "").replace(" &raquo;", "");

                                                    return (
                                                        <Button
                                                            key={i}
                                                            variant={link.active ? 'default' : 'outline'}
                                                            size={isTextLink ? "sm" : "icon"}
                                                            className={isTextLink ? "px-3" : "h-8 w-8"}
                                                            disabled={!link.url}
                                                            onClick={() => {
                                                                if (link.url) {
                                                                    const url = new URL(link.url);
                                                                    const params: any = {};
                                                                    url.searchParams.forEach((value, key) => {
                                                                        params[key] = value;
                                                                    });
                                                                    router.get(route('projects.show', project.id), params, {
                                                                        preserveState: true,
                                                                        preserveScroll: true,
                                                                        only: ['project', 'activityFilters']
                                                                    });
                                                                }
                                                            }}
                                                        >
                                                            {isTextLink ? label : <span dangerouslySetInnerHTML={{ __html: link.label }} />}
                                                        </Button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                        {activitySearch ? 'No activity found' : 'No activity recorded yet'}
                                    </h3>
                                    <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                                        {activitySearch ? 'Try adjusting your search terms or ' : 'Project activities will appear here as they happen.'}
                                        {activitySearch && (
                                            <Button variant="link" className="p-0 h-auto" onClick={() => {
                                                setActivitySearch('');
                                                router.get(route('projects.show', project.id), {}, {
                                                    preserveState: true,
                                                    preserveScroll: true,
                                                    only: ['project', 'activityFilters']
                                                });
                                            }}>
                                                {t('Clear search')}
                                            </Button>
                                        )}
                                    </p>
                                </div>
                            )}
                        </TabsContent>
                    </div>
                </Tabs>
            </div>

            {/* Form Modal */}
            <CrudFormModal
                isOpen={isFormModalOpen}
                onClose={() => setIsFormModalOpen(false)}
                onSubmit={handleFormSubmit}
                formConfig={getFormConfig()}
                initialData={currentItem || (modalType === 'milestone' ? { status: 'pending' } : modalType === 'member' ? { role: 'member' } : modalType === 'project' ? { status: 'planning', priority: 'medium', is_public: false } : {})}
                title={modalType === 'project' ? t('Edit Project') : `${formMode === 'create' ? t('Add') : t('Edit')} ${modalType.charAt(0).toUpperCase() + modalType.slice(1)}`}
                mode={formMode}
            />

            {/* Delete Modal */}
            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                itemName={currentItem?.title || currentItem?.name || currentItem?.user?.name || currentItem?.media_item?.name || ''}
                entityName={modalType === 'member' ? t('team member') : modalType}
                warningMessage={
                    modalType === 'member' ? `${t('This will remove')} ${currentItem?.user?.name || t('this member')} ${t('from the project team.')}` :
                        modalType === 'client' ? `${t('This will remove')} ${currentItem?.name || t('this client')} ${t('from the project.')}` :
                            modalType === 'attachment' ? `${t('This file will be permanently deleted from the project.')}` :
                                `${t('This action cannot be undone.')}`
                }
                additionalInfo={
                    modalType === 'member' ? [
                        t('Access to project resources will be revoked'),
                        t('Task assignments may need to be reassigned'),
                        t('Time tracking history will be preserved')
                    ] :
                        modalType === 'client' ? [
                            t('Client access to project will be removed'),
                            t('Project visibility for this client will be revoked')
                        ] :
                            modalType === 'attachment' ? [
                                t('File will be removed from all project references'),
                                t('Download history will be preserved')
                            ] : []
                }
            />

            {/* Timesheet Modal */}
            <TimesheetFormModal
                isOpen={isTimesheetModalOpen}
                onClose={() => setIsTimesheetModalOpen(false)}
                projects={[project]}
            />

            {/* Shared Project Settings Modal */}
            <SharedProjectSettingsModal
                isOpen={isSharedSettingsModalOpen}
                onClose={() => setIsSharedSettingsModalOpen(false)}
                project={project}
            />
        </PageTemplate>
    );
}
