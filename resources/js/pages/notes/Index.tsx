import React, { useState, useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';
import { toast } from '@/components/custom-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Search, Filter, Eye, Edit, Trash2, StickyNote, Users, User, LayoutGrid, List } from 'lucide-react';
import { PageTemplate } from '@/components/page-template';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { CrudTable } from '@/components/CrudTable';
import { useTranslation } from 'react-i18next';
import NoteFormModal from '@/components/notes/NoteFormModal';

interface Note {
    id: number;
    title: string;
    text: string;
    color: string;
    type: 'personal' | 'shared';
    assign_to: string | null;
    workspace: number;
    created_by: number;
    created_at: string;
    creator: {
        id: number;
        name: string;
        email: string;
    };
    assigned_users?: Array<{
        id: number;
        name: string;
        email: string;
    }>;
}

interface User {
    id: number;
    name: string;
    email: string;
    role: string;
}

export default function NotesIndex() {
    const { t } = useTranslation();
    const { personal_notes, shared_notes, combined_notes, users, auth, flash, permissions: pagePermissions, filters: pageFilters = {} } = usePage().props as any;
    const notePermissions = pagePermissions;

    // Show flash messages
    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
        if (flash?.info) {
            toast.info(flash.info);
        }
    }, [flash]);

    const [activeView, setActiveView] = useState(pageFilters.view_mode || 'grid');
    const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
    const [selectedType, setSelectedType] = useState(pageFilters.type || 'all');
    const [showFilters, setShowFilters] = useState(false);
    const [perPage, setPerPage] = useState(pageFilters.per_page?.toString() || '12');
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [currentNote, setCurrentNote] = useState<Note | null>(null);
    const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');

    const hasActiveFilters = () => {
        return searchTerm !== '' || selectedType !== 'all';
    };

    const activeFilterCount = () => {
        return (searchTerm ? 1 : 0) + (selectedType !== 'all' ? 1 : 0);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const applyFilters = () => {
        const params: any = { page: 1 };
        if (searchTerm) params.search = searchTerm;
        if (selectedType !== 'all') params.type = selectedType;
        if (perPage) params.per_page = perPage;
        if (pageFilters.sort_field) params.sort_field = pageFilters.sort_field;
        if (pageFilters.sort_direction) params.sort_direction = pageFilters.sort_direction;
        params.view_mode = activeView;
        router.get(route('notes.index'), params, { preserveState: false, preserveScroll: false });
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
        if (selectedType !== 'all') params.type = selectedType;
        if (perPage) params.per_page = perPage;
        params.view_mode = activeView;
        
        router.get(route('notes.index'), params, { preserveState: true, preserveScroll: true });
    };

    const handleResetFilters = () => {
        setSearchTerm('');
        setSelectedType('all');
        setShowFilters(false);
        const params: any = { page: 1 };
        if (perPage) params.per_page = perPage;
        params.view_mode = activeView;
        router.get(route('notes.index'), params, { preserveState: false, preserveScroll: false });
    };

    const handleAction = (action: string, noteOrId: Note | number) => {
        let note: Note;
        
        if (typeof noteOrId === 'number') {
            // Called from CrudTable with ID
            note = (combined_notes?.data || [...(personal_notes?.data || []), ...(shared_notes?.data || [])]).find((n: Note) => n.id === noteOrId);
            if (!note) return;
        } else {
            // Called from grid view with note object
            note = noteOrId;
        }
        
        setCurrentNote(note);
        switch (action) {
            case 'view':
                setModalMode('view');
                setIsFormModalOpen(true);
                break;
            case 'edit':
                setModalMode('edit');
                setIsFormModalOpen(true);
                break;
            case 'delete':
                setIsDeleteModalOpen(true);
                break;
        }
    };

    const handleAddNew = () => {
        setCurrentNote(null);
        setModalMode('create');
        setIsFormModalOpen(true);
    };

    const handleDeleteConfirm = () => {
        if (currentNote) {
            toast.loading(t('Deleting note...'));
            router.delete(route('notes.destroy', currentNote.id), {
                onSuccess: () => {
                    toast.dismiss();
                    setIsDeleteModalOpen(false);
                },
                onError: () => {
                    toast.dismiss();
                    toast.error(t('Failed to delete note'));
                    setIsDeleteModalOpen(false);
                }
            });
        }
    };

    // CrudTable configuration
    const columns = [
        {
            key: 'title',
            label: t('Title'),
            sortable: true,
            render: (value: string, row: Note) => (
                <div className="flex items-center gap-2">
                    <div 
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: row.color }}
                    />
                    <div>
                        <div className="text-sm font-medium text-gray-900">
                            {value}
                        </div>
                        <div className="text-xs text-gray-500">
                            {t('By')} {row.creator.name} • {new Date(row.created_at).toLocaleDateString()}
                        </div>
                    </div>
                </div>
            )
        },
        {
            key: 'text',
            label: t('Content'),
            render: (value: string) => (
                <div 
                    className="text-sm text-gray-500 max-w-xs line-clamp-2 break-words overflow-hidden"
                    dangerouslySetInnerHTML={{ __html: value }}
                />
            )
        },
        {
            key: 'type',
            label: t('Type'),
            sortable: true,
            render: (value: string, row: Note) => (
                <div className="flex items-center gap-2">
                    <Badge variant={value === 'shared' ? 'default' : 'secondary'} className="text-xs">
                        {value === 'shared' ? t('Shared') : t('Personal')}
                    </Badge>
                    {value === 'shared' ? (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Users className="h-4 w-4 text-blue-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                                {row.assigned_users ? row.assigned_users.map((user: any) => user.name).join(', ') : row.creator.name}
                            </TooltipContent>
                        </Tooltip>
                    ) : (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <User className="h-4 w-4 text-gray-500" />
                            </TooltipTrigger>
                            <TooltipContent>{row.creator.name}</TooltipContent>
                        </Tooltip>
                    )}
                </div>
            )
        },
        {
            key: 'created_at',
            label: t('Created'),
            sortable: true,
            render: (value: string) => (
                <span className="text-sm text-gray-500">
                    {new Date(value).toLocaleDateString()}
                </span>
            )
        }
    ];

    const actions = [
        {
            label: t('View'),
            icon: 'Eye',
            action: 'view',
            className: 'text-blue-500 hover:text-blue-700'
        },
        {
            label: t('Edit'),
            icon: 'Edit',
            action: 'edit',
            className: 'text-amber-500 hover:text-amber-700',
            condition: () => notePermissions?.update
        },
        {
            label: t('Delete'),
            icon: 'Trash2',
            action: 'delete',
            className: 'text-red-500 hover:text-red-700',
            condition: () => notePermissions?.delete
        }
    ];

    // Remove the old filtered notes logic since we're using server-side filtering
    const filteredPersonalNotes = personal_notes?.data || [];
    const filteredSharedNotes = shared_notes?.data || [];

    const renderNoteCard = (note: Note) => (
        <Card key={note.id} className="overflow-hidden hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <CardTitle className="text-base line-clamp-1 flex items-center gap-2">
                        <div 
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: note.color }}
                        />
                        {note.title}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        {note.type === 'shared' ? (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Users className="h-4 w-4 text-blue-500" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    {note.assigned_users ? note.assigned_users.map((user: any) => user.name).join(', ') : note.creator.name}
                                </TooltipContent>
                            </Tooltip>
                        ) : (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <User className="h-4 w-4 text-gray-500" />
                                </TooltipTrigger>
                                <TooltipContent>{note.creator.name}</TooltipContent>
                            </Tooltip>
                        )}
                    </div>
                </div>
                <div className="text-xs text-muted-foreground">
                    {t('By')} {note.creator.name} • {new Date(note.created_at).toLocaleDateString()}
                </div>
            </CardHeader>

            <CardContent className="py-2">
                <div 
                    className="text-sm text-gray-500 line-clamp-2 break-words overflow-hidden"
                    dangerouslySetInnerHTML={{ __html: note.text }}
                />
            </CardContent>

            <CardFooter className="flex justify-between items-center pt-0 pb-2">
                <Badge variant={note.type === 'shared' ? 'default' : 'secondary'} className="text-xs">
                    {note.type === 'shared' ? t('Shared') : t('Personal')}
                </Badge>
                <div className="flex gap-1">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleAction('view', note)}
                                className="text-blue-500 hover:text-blue-700 h-8 w-8"
                            >
                                <Eye className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t('View')}</TooltipContent>
                    </Tooltip>
                    {notePermissions?.update && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleAction('edit', note)}
                                    className="text-amber-500 hover:text-amber-700 h-8 w-8"
                                >
                                    <Edit className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('Edit')}</TooltipContent>
                        </Tooltip>
                    )}
                    {notePermissions?.delete && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-red-500 hover:text-red-700 h-8 w-8"
                                    onClick={() => handleAction('delete', note)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('Delete')}</TooltipContent>
                        </Tooltip>
                    )}
                </div>
            </CardFooter>
        </Card>
    );

    const pageActions = [];

    if (notePermissions?.create) {
        pageActions.push({
            label: t('Create Note'),
            icon: <Plus className="h-4 w-4 mr-2" />,
            variant: 'default',
            onClick: handleAddNew
        });
    }

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Notes') }
    ];

    return (
        <PageTemplate
            title={t('Notes')}
            url="/notes"
            actions={pageActions}
            breadcrumbs={breadcrumbs}
            noPadding
        >
            {/* Overview Row */}
            <Card className="mb-4 hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                            <div className="text-xl font-bold text-blue-600">
                                {(personal_notes?.total || 0) + (shared_notes?.total || 0)}
                            </div>
                            <div className="text-xs text-gray-600">{t('Total Notes')}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xl font-bold text-gray-600">
                                {personal_notes?.total || 0}
                            </div>
                            <div className="text-xs text-gray-600">{t('Personal')}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xl font-bold text-blue-600">
                                {shared_notes?.total || 0}
                            </div>
                            <div className="text-xs text-gray-600">{t('Shared')}</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Search and filters */}
            <div className="bg-white rounded-lg shadow mb-4">
                <div className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <form onSubmit={handleSearch} className="flex gap-2">
                                <div className="relative w-64">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder={t('Search notes...')}
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
                                        if (selectedType !== 'all') params.type = selectedType;
                                        if (perPage) params.per_page = perPage;
                                        if (pageFilters.sort_field) params.sort_field = pageFilters.sort_field;
                                        if (pageFilters.sort_direction) params.sort_direction = pageFilters.sort_direction;
                                        router.get(route('notes.index'), params, { preserveState: true, preserveScroll: true });
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
                                        if (selectedType !== 'all') params.type = selectedType;
                                        if (perPage) params.per_page = perPage;
                                        if (pageFilters.sort_field) params.sort_field = pageFilters.sort_field;
                                        if (pageFilters.sort_direction) params.sort_direction = pageFilters.sort_direction;
                                        router.get(route('notes.index'), params, { preserveState: true, preserveScroll: true });
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
                                    if (selectedType !== 'all') params.type = selectedType;
                                    if (pageFilters.sort_field) params.sort_field = pageFilters.sort_field;
                                    if (pageFilters.sort_direction) params.sort_direction = pageFilters.sort_direction;
                                    params.view_mode = activeView;
                                    router.get(route('notes.index'), params, { preserveState: false, preserveScroll: false });
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
                                    <Label>{t('Type')}</Label>
                                    <Select value={selectedType} onValueChange={(value) => {
                                        setSelectedType(value);
                                        const params: any = { page: 1 };
                                        if (searchTerm) params.search = searchTerm;
                                        if (value !== 'all') params.type = value;
                                        if (perPage) params.per_page = perPage;
                                        if (pageFilters.sort_field) params.sort_field = pageFilters.sort_field;
                                        if (pageFilters.sort_direction) params.sort_direction = pageFilters.sort_direction;
                                        params.view_mode = activeView;
                                        router.get(route('notes.index'), params, { preserveState: false, preserveScroll: false });
                                    }}>
                                        <SelectTrigger className="w-40">
                                            <SelectValue placeholder={t('All Types')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('All Types')}</SelectItem>
                                            <SelectItem value="personal">{t('Personal')}</SelectItem>
                                            <SelectItem value="shared">{t('Shared')}</SelectItem>
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

            {/* Notes Content */}
            {activeView === 'list' ? (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <CrudTable
                        columns={columns}
                        actions={actions}
                        data={combined_notes?.data || [...(personal_notes?.data || []), ...(shared_notes?.data || [])]}
                        from={(combined_notes?.from || personal_notes?.from || shared_notes?.from) || 1}
                        onAction={handleAction}
                        sortField={pageFilters.sort_field}
                        sortDirection={pageFilters.sort_direction}
                        onSort={handleSort}
                        permissions={auth?.permissions || []}
                    />
                </div>
            ) : (
                <>
                    {/* Combined Notes Section */}
                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-4">
                            <StickyNote className="h-5 w-5 text-gray-600" />
                            <h2 className="text-lg font-semibold text-gray-900">{t('All Notes')}</h2>
                            <Badge variant="secondary" className="ml-2">
                                {(filteredPersonalNotes.length || 0) + (filteredSharedNotes.length || 0)}
                            </Badge>
                        </div>

                        {((filteredPersonalNotes.length || 0) > 0 || (filteredSharedNotes.length || 0) > 0) ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {[...filteredPersonalNotes, ...filteredSharedNotes].map((note: Note) => renderNoteCard(note))}
                            </div>
                        ) : (
                            <div className="bg-white rounded-lg shadow p-8 text-center">
                                <StickyNote className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                <p className="text-gray-500 mb-4">{searchTerm ? t('No notes found matching your search') : t('No notes found')}</p>
                                {notePermissions?.create && (
                                    <Button onClick={handleAddNew}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        {t('Create your first note')}
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}
            
            {/* Unified Pagination */}
            {(combined_notes?.links || personal_notes?.links || shared_notes?.links) && (
                <div className="mt-6 bg-white p-4 rounded-lg shadow flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        {t('Showing')} <span className="font-medium">{activeView === 'list' ? (combined_notes?.from || personal_notes?.from || shared_notes?.from) || 1 : (combined_notes?.from || 1)}</span> {t('to')} <span className="font-medium">{activeView === 'list' ? (combined_notes?.to || personal_notes?.to || shared_notes?.to) || 0 : (combined_notes?.to || (filteredPersonalNotes.length + filteredSharedNotes.length))}</span> {t('of')} <span className="font-medium">{(combined_notes?.total || (personal_notes?.total || 0) + (shared_notes?.total || 0))}</span> {t('notes')}
                    </div>
                    
                    <div className="flex gap-1">
                        {(combined_notes?.links || personal_notes?.links || shared_notes?.links)?.map((link: any, i: number) => {
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
            <NoteFormModal
                isOpen={isFormModalOpen}
                onClose={() => {
                    setIsFormModalOpen(false);
                    setCurrentNote(null);
                }}
                note={currentNote}
                mode={modalMode}
                users={users}
            />

            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                itemName={currentNote?.title || ''}
                entityName="note"
            />
        </PageTemplate>
    );
}