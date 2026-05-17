import React, { useState, useEffect } from 'react';
import { useForm, router } from '@inertiajs/react';
import axios from 'axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Bug, MessageSquare, Paperclip, X, Send, Trash2, Edit, Download, MoreHorizontal, File, Image, FileText, Upload } from 'lucide-react';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import TaskFileUpload, { TaskFileItem } from '@/components/tasks/TaskFileUpload';
import { useTranslation } from 'react-i18next';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface BugModalProps {
    bug?: any;
    projects: Array<{ id: number; title: string; milestones?: any[] }>;
    statuses: Array<{ id: number; name: string; color: string }>;
    members: Array<{ id: number; name: string }>;
    onClose: () => void;
    permissions?: any;
}

export function BugModal({ bug, projects, statuses, members, onClose, permissions }: BugModalProps) {
    const { t } = useTranslation();
    const [bugPermissions, setBugPermissions] = useState(permissions);
    
    const formatText = (text: string) => {
        if (!text) return '';
        return text.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
    };
    const [activeTab, setActiveTab] = useState('details');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [projectMembers, setProjectMembers] = useState<Array<{ id: number; name: string; email: string }>>([]);
    const [projectMilestones, setProjectMilestones] = useState<Array<{ id: number; title: string; status: string }>>([]);
    const [loadingProjectData, setLoadingProjectData] = useState(false);
    const [bugData, setBugData] = useState(bug);
    const [loadingBug, setLoadingBug] = useState(false);
    const [editingComment, setEditingComment] = useState<number | null>(null);
    const [editCommentText, setEditCommentText] = useState('');
    const [commentToDelete, setCommentToDelete] = useState<any>(null);
    const [isDeleteCommentModalOpen, setIsDeleteCommentModalOpen] = useState(false);
    const [attachmentToDelete, setAttachmentToDelete] = useState<any>(null);
    const [isDeleteAttachmentModalOpen, setIsDeleteAttachmentModalOpen] = useState(false);
    const [createFiles, setCreateFiles] = useState<TaskFileItem[]>([]);

    const getAttachmentSize = (attachment: any): number => {
        const size =
            attachment.media_item?.size ??
            attachment.mediaItem?.size ??
            attachment.media_item?.file_size ??
            attachment.mediaItem?.file_size ??
            attachment.media_item?.filesize ??
            attachment.mediaItem?.filesize ??
            attachment.size ??
            0;

        return typeof size === 'number' ? size : Number(size) || 0;
    };
    
    const { data, setData, post, put, transform, processing, errors } = useForm({
        project_id: bug?.project_id?.toString() || '',
        milestone_id: bug?.milestone_id?.toString() || 'none',
        title: bug?.title || '',
        description: bug?.description || '',
        priority: bug?.priority || 'medium',
        severity: bug?.severity || 'major',
        steps_to_reproduce: bug?.steps_to_reproduce || '',
        expected_behavior: bug?.expected_behavior || '',
        actual_behavior: bug?.actual_behavior || '',
        environment: bug?.environment || '',
        assigned_to: bug?.assigned_to?.id?.toString() || 'none',
        start_date: bug?.start_date || '',
        end_date: bug?.end_date || '',
        resolution_notes: bug?.resolution_notes || '',
        media_item_ids: [] as number[]
    });

    const { data: commentData, setData: setCommentData, post: postComment, reset: resetComment } = useForm({
        comment: ''
    });

    const selectedProject = projects.find(p => p.id.toString() === data.project_id);

    // Fetch project data when project changes
    useEffect(() => {
        if (data.project_id) {
            setLoadingProjectData(true);
            axios.get(route('api.bugs.project-data') + `?project_id=${data.project_id}`)
                .then(response => {
                    if (response.data.success) {
                        setProjectMembers(response.data.members || []);
                        setProjectMilestones(response.data.milestones || []);
                    }
                })
                .catch(error => {
                    console.error('Error fetching project data:', error);
                    setProjectMembers([]);
                    setProjectMilestones([]);
                })
                .finally(() => {
                    setLoadingProjectData(false);
                });
        } else {
            setProjectMembers([]);
            setProjectMilestones([]);
        }
    }, [data.project_id]);

    // Reset assigned_to when project changes
    useEffect(() => {
        if (data.project_id && !bug) {
            setData('assigned_to', 'none');
        }
    }, [data.project_id]);

    // Fetch bug data when bug prop changes
    useEffect(() => {
        if (bug?.id) {
            setLoadingBug(true);
            axios.get(route('bugs.show', bug.id))
                .then(response => {
                    setBugData(response.data.bug);
                    setBugPermissions(response.data.permissions);
                })
                .catch(error => {
                    console.error('Error fetching bug data:', error);
                    setBugData(bug);
                })
                .finally(() => {
                    setLoadingBug(false);
                });
        } else {
            setBugData(bug);
        }
    }, [bug]);

    useEffect(() => {
        if (!bug) {
            setData('media_item_ids', createFiles.map((file) => file.id));
        }
    }, [createFiles, bug]);

    const mapAttachmentToTaskFile = (attachment: any): TaskFileItem => ({
        id: attachment.media_item?.id || attachment.mediaItem?.id || attachment.media_item_id,
        media_id: attachment.media_item?.id || attachment.mediaItem?.id || attachment.media_item_id,
        attachment_id: attachment.id,
        name: attachment.media_item?.name || attachment.mediaItem?.name || 'file',
        url: attachment.media_item?.url || attachment.mediaItem?.url || '',
        thumb_url: attachment.media_item?.thumb_url || attachment.mediaItem?.thumb_url || attachment.media_item?.url || attachment.mediaItem?.url || '',
        preview_url: attachment.media_item?.url || attachment.mediaItem?.url || '',
        download_url: route('bug-attachments.download', attachment.id),
        mime_type: attachment.media_item?.mime_type || attachment.mediaItem?.mime_type || '',
        size: getAttachmentSize(attachment)
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Prepare data for submission
        const submitData = {
            ...data,
            milestone_id: data.milestone_id === 'none' ? null : data.milestone_id,
            assigned_to: data.assigned_to === 'none' ? null : data.assigned_to
        };
        
        if (bug) {
            transform(() => submitData);
            put(route('bugs.update', bug.id), {
                onSuccess: () => onClose(),
                onError: (errors) => {
                    console.error('Update error:', errors);
                },
                onFinish: () => transform((currentData) => currentData)
            });
        } else {
            transform(() => submitData);
            post(route('bugs.store'), {
                onSuccess: () => onClose(),
                onError: (errors) => {
                    console.error('Create error:', errors);
                },
                onFinish: () => transform((currentData) => currentData)
            });
        }
    };

    const handleComment = (e: React.FormEvent) => {
        e.preventDefault();
        postComment(route('bug-comments.store', bugData.id), {
            onSuccess: () => {
                resetComment();
                // Refresh bug data
                if (bugData?.id) {
                    axios.get(route('bugs.show', bugData.id))
                        .then(response => {
                            setBugData(response.data.bug);
                        })
                        .catch(error => {
                            console.error('Error refreshing bug data:', error);
                        });
                }
            }
        });
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

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl h-[95vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Bug className="h-5 w-5 text-red-500" />
                        {bug ? `${t('Edit Bug')}: ${bug.title}` : t('Report New Bug')}
                    </DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="details">{t('Details')}</TabsTrigger>
                        <TabsTrigger value="comments" disabled={!bugData}>{t('Comments')} {bugData?.comments?.length ? `(${bugData.comments.length})` : ''}</TabsTrigger>
                        <TabsTrigger value="attachments">{t('Attachments')} {((bugData?.attachments?.length || 0) + (!bug ? createFiles.length : 0)) ? `(${(bugData?.attachments?.length || 0) + (!bug ? createFiles.length : 0)})` : ''}</TabsTrigger>
                    </TabsList>

                    <TabsContent value="details" className="space-y-4 overflow-y-auto flex-1">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="project_id">{t('Project')} <span className="text-red-500">*</span></Label>
                                    <Select value={data.project_id} onValueChange={(value) => setData('project_id', value)}>
                                        <SelectTrigger className={errors.project_id ? 'border-red-500' : ''}>
                                            <SelectValue placeholder={t('Select project')} />
                                        </SelectTrigger>
                                        <SelectContent className="z-[9999]">
                                            {projects.map(project => (
                                                <SelectItem key={project.id} value={project.id.toString()}>
                                                    {project.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.project_id && <p className="text-red-500 text-sm mt-1">{errors.project_id}</p>}
                                </div>

                                <div>
                                    <Label htmlFor="milestone_id">{t('Milestone')} <span className="text-red-500">*</span></Label>
                                    <Select value={data.milestone_id} onValueChange={(value) => setData('milestone_id', value)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={loadingProjectData ? t('Loading...') : t('Select milestone')} />
                                        </SelectTrigger>
                                        <SelectContent className="z-[9999]">
                                            <SelectItem value="none">{t('No milestone')}</SelectItem>
                                            {projectMilestones.map(milestone => (
                                                <SelectItem key={milestone.id} value={milestone.id.toString()}>
                                                    {milestone.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.milestone_id && <p className="text-red-500 text-sm mt-1">{errors.milestone_id}</p>}
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="title">{t('Bug Title')} <span className="text-red-500">*</span></Label>
                                <Input
                                    id="title"
                                    value={data.title}
                                    onChange={(e) => setData('title', e.target.value)}
                                    placeholder={t('Brief description of the bug')}
                                    className={errors.title ? 'border-red-500' : ''}
                                />
                                {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
                            </div>

                            <div>
                                <Label htmlFor="description">{t('Description')}</Label>
                                <Textarea
                                    id="description"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    placeholder={t('Detailed description of the bug')}
                                    rows={3}
                                />
                                {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="priority">{t('Priority')} <span className="text-red-500">*</span></Label>
                                    <Select value={data.priority} onValueChange={(value) => setData('priority', value)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="z-[9999]">
                                            <SelectItem value="low">{formatText('low')}</SelectItem>
                                            <SelectItem value="medium">{formatText('medium')}</SelectItem>
                                            <SelectItem value="high">{formatText('high')}</SelectItem>
                                            <SelectItem value="critical">{formatText('critical')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.priority && <p className="text-red-500 text-sm mt-1">{errors.priority}</p>}
                                </div>

                                <div>
                                    <Label htmlFor="severity">{t('Severity')} <span className="text-red-500">*</span></Label>
                                    <Select value={data.severity} onValueChange={(value) => setData('severity', value)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="z-[9999]">
                                            <SelectItem value="minor">{formatText('minor')}</SelectItem>
                                            <SelectItem value="major">{formatText('major')}</SelectItem>
                                            <SelectItem value="critical">{formatText('critical')}</SelectItem>
                                            <SelectItem value="blocker">{formatText('blocker')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.severity && <p className="text-red-500 text-sm mt-1">{errors.severity}</p>}
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="steps_to_reproduce">{t('Steps to Reproduce')}</Label>
                                <Textarea
                                    id="steps_to_reproduce"
                                    value={data.steps_to_reproduce}
                                    onChange={(e) => setData('steps_to_reproduce', e.target.value)}
                                    placeholder="1. Step one&#10;2. Step two&#10;3. Step three"
                                    rows={4}
                                />
                                {errors.steps_to_reproduce && <p className="text-red-500 text-sm mt-1">{errors.steps_to_reproduce}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="expected_behavior">{t('Expected Behavior')}</Label>
                                    <Textarea
                                        id="expected_behavior"
                                        value={data.expected_behavior}
                                        onChange={(e) => setData('expected_behavior', e.target.value)}
                                        placeholder={t('What should happen')}
                                        rows={3}
                                    />
                                    {errors.expected_behavior && <p className="text-red-500 text-sm mt-1">{errors.expected_behavior}</p>}
                                </div>

                                <div>
                                    <Label htmlFor="actual_behavior">{t('Actual Behavior')}</Label>
                                    <Textarea
                                        id="actual_behavior"
                                        value={data.actual_behavior}
                                        onChange={(e) => setData('actual_behavior', e.target.value)}
                                        placeholder={t('What actually happens')}
                                        rows={3}
                                    />
                                    {errors.actual_behavior && <p className="text-red-500 text-sm mt-1">{errors.actual_behavior}</p>}
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="environment">{t('Environment')}</Label>
                                <Input
                                    id="environment"
                                    value={data.environment}
                                    onChange={(e) => setData('environment', e.target.value)}
                                    placeholder={t('Browser, OS, device details')}
                                />
                                {errors.environment && <p className="text-red-500 text-sm mt-1">{errors.environment}</p>}
                            </div>

                            {bugPermissions?.assign_users && (
                                <div>
                                    <Label htmlFor="assigned_to">{t('Assign To')}</Label>
                                    <Select 
                                        value={data.assigned_to} 
                                        onValueChange={(value) => setData('assigned_to', value)}
                                        disabled={!data.project_id || loadingProjectData}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={
                                                !data.project_id ? "Select project first" : 
                                                loadingProjectData ? "Loading..." : 
                                                "Select assignee"
                                            } />
                                        </SelectTrigger>
                                        <SelectContent className="z-[9999]">
                                            <SelectItem value="none">{t('Unassigned')}</SelectItem>
                                            {projectMembers.map(member => (
                                                <SelectItem key={member.id} value={member.id.toString()}>
                                                    {member.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.assigned_to && <p className="text-red-500 text-sm mt-1">{errors.assigned_to}</p>}
                                    {!data.project_id && !errors.assigned_to && (
                                        <p className="text-sm text-gray-500 mt-1">{t('Please select a project first to see available assignees')}</p>
                                    )}
                                </div>
                            )}

                            {/* Display form errors */}
                            {Object.keys(errors).length > 0 && (
                                <div className="rounded-md bg-red-50 p-4">
                                    <div className="flex">
                                        <div className="flex-shrink-0">
                                            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div className="ml-3">
                                            <h3 className="text-sm font-medium text-red-800">{t('Error')}</h3>
                                            <div className="mt-2 text-sm text-red-700">
                                                {Object.entries(errors).map(([key, error]) => (
                                                    <p key={key}>{error}</p>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-between pt-4">
                                <div>
                                    {bug && (
                                        <div className="flex gap-2">
                                            <Badge className={getPriorityColor(data.priority)} variant="secondary">
                                                {formatText(data.priority)}
                                            </Badge>
                                            <Badge className={getSeverityColor(data.severity)} variant="secondary">
                                                {formatText(data.severity)}
                                            </Badge>
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <Button type="button" variant="outline" onClick={onClose}>
                                        {t('Cancel')}
                                    </Button>
                                    {(bug ? bugPermissions?.update : bugPermissions?.create) && (
                                        <Button type="submit" disabled={processing || !data.project_id || !data.title}>
                                            {processing ? t('Saving...') : bug ? t('Update Bug') : t('Report Bug')}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </form>
                    </TabsContent>

                    <TabsContent value="comments" className="flex flex-col flex-1 overflow-hidden">
                        {bugData ? (
                            <>
                                {loadingBug ? (
                                    <div className="text-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                                        <p className="text-gray-500 mt-2">{t('Loading comments...')}</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="space-y-3 flex-1 overflow-y-auto mb-4">
                                            {bugData.comments?.length > 0 ? (
                                                [...bugData.comments].reverse().map((comment: any) => (
                                                    <div key={comment.id} className="group flex gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                                                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                                            <span className="text-blue-600 font-semibold text-sm">
                                                                {comment.user.name.charAt(0).toUpperCase()}
                                                            </span>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-medium text-sm text-gray-900">{comment.user.name}</span>
                                                                    <span className="text-xs text-gray-500">
                                                                        {new Date(comment.created_at).toLocaleDateString()}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    {comment.can_update && (
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    onClick={() => {
                                                                                        setEditingComment(comment.id);
                                                                                        setEditCommentText(comment.comment);
                                                                                    }}
                                                                                    className="h-8 w-8 text-amber-500 hover:text-amber-700"
                                                                                >
                                                                                    <Edit className="h-4 w-4" />
                                                                                </Button>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent>Edit</TooltipContent>
                                                                        </Tooltip>
                                                                    )}
                                                                    {comment.can_delete && (
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    onClick={() => {
                                                                                        setCommentToDelete(comment);
                                                                                        setIsDeleteCommentModalOpen(true);
                                                                                    }}
                                                                                    className="h-8 w-8 text-red-500 hover:text-red-700"
                                                                                >
                                                                                    <Trash2 className="h-4 w-4" />
                                                                                </Button>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent>Delete</TooltipContent>
                                                                        </Tooltip>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {editingComment === comment.id ? (
                                                                <div className="space-y-2 mt-2">
                                                                    <Textarea
                                                                        value={editCommentText}
                                                                        onChange={(e) => setEditCommentText(e.target.value)}
                                                                        rows={2}
                                                                        className="text-sm"
                                                                    />
                                                                    <div className="flex gap-2">
                                                                        <Button 
                                                                            size="sm"
                                                                            onClick={() => {
                                                                                router.put(route('bug-comments.update', comment.id), {
                                                                                    comment: editCommentText
                                                                                }, {
                                                                                    onSuccess: () => {
                                                                                        setEditingComment(null);
                                                                                        axios.get(route('bugs.show', bugData.id))
                                                                                            .then(response => setBugData(response.data.bug))
                                                                                            .catch(console.error);
                                                                                    }
                                                                                });
                                                                            }}
                                                                            className="h-7 px-3 text-xs"
                                                                        >
                                                                            Save
                                                                        </Button>
                                                                        <Button 
                                                                            size="sm" 
                                                                            variant="outline"
                                                                            onClick={() => setEditingComment(null)}
                                                                            className="h-7 px-3 text-xs"
                                                                        >
                                                                            Cancel
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{comment.comment}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-8 text-gray-500">
                                                    <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                                                    <p>{t('No comments yet')}</p>
                                                </div>
                                            )}
                                        </div>

                                        <form onSubmit={handleComment} className="flex items-end gap-2 mb-2 ml-1">
                                            <Textarea
                                                value={commentData.comment}
                                                onChange={(e) => setCommentData('comment', e.target.value)}
                                                placeholder={t('Add a comment...')}
                                                rows={2}
                                                className="flex-1"
                                            />
                                            <Button type="submit" disabled={!commentData.comment.trim()} className="self-end">
                                                <Send className="h-4 w-4" />
                                            </Button>
                                        </form>
                                    </>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                                <p>{t('Save the bug first to add comments')}</p>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="attachments" className="flex flex-col flex-1 overflow-hidden">
                        <div className="flex-1 overflow-y-auto mb-4">
                            <TaskFileUpload
                                mode={bugData ? 'edit' : 'edit'}
                                files={bugData ? (bugData.attachments || []).map(mapAttachmentToTaskFile) : createFiles}
                                onFilesChange={(nextFiles) => {
                                    if (!bugData) {
                                        setCreateFiles(nextFiles);
                                        return;
                                    }

                                    const existingIds = new Set((bugData.attachments || []).map((attachment: any) => (
                                        attachment.media_item?.id || attachment.mediaItem?.id || attachment.media_item_id
                                    )));
                                    const addedIds = nextFiles.map((file) => file.id).filter((id) => !existingIds.has(id));

                                    if (addedIds.length === 0) return;
                                    router.post(route('bug-attachments.store', bugData.id), {
                                        media_item_ids: addedIds
                                    }, {
                                        onSuccess: () => {
                                            axios.get(route('bugs.show', bugData.id))
                                                .then(response => setBugData(response.data.bug))
                                                .catch(console.error);
                                        }
                                    });
                                }}
                                onRemoveFile={(file) => {
                                    if (!bugData) {
                                        setCreateFiles((prev) => prev.filter((f) => f.id !== file.id));
                                        return;
                                    }
                                    if (!file.attachment_id) return;
                                    router.delete(route('bug-attachments.destroy', file.attachment_id), {
                                        onSuccess: () => {
                                            axios.get(route('bugs.show', bugData.id))
                                                .then(response => setBugData(response.data.bug))
                                                .catch(console.error);
                                        }
                                    });
                                }}
                            />
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
            
            {/* Delete Bug Modal */}
            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={() => {
                    if (bug) {
                        router.delete(route('bugs.destroy', bug.id), {
                            onSuccess: () => {
                                setIsDeleteModalOpen(false);
                                onClose();
                            },
                            onError: () => {
                                setIsDeleteModalOpen(false);
                            }
                        });
                    }
                }}
                itemName={bug?.title || ''}
                entityName="bug"
            />
            
            {/* Delete Comment Modal */}
            <CrudDeleteModal
                isOpen={isDeleteCommentModalOpen}
                onClose={() => {
                    setIsDeleteCommentModalOpen(false);
                    setCommentToDelete(null);
                }}
                onConfirm={() => {
                    if (commentToDelete) {
                        router.delete(route('bug-comments.destroy', commentToDelete.id), {
                            onSuccess: () => {
                                setIsDeleteCommentModalOpen(false);
                                setCommentToDelete(null);
                                axios.get(route('bugs.show', bugData.id))
                                    .then(response => setBugData(response.data.bug))
                                    .catch(console.error);
                            },
                            onError: () => {
                                setIsDeleteCommentModalOpen(false);
                                setCommentToDelete(null);
                            }
                        });
                    }
                }}
                itemName="comment"
                entityName="comment"
            />
            
            {/* Delete Attachment Modal */}
            <CrudDeleteModal
                isOpen={isDeleteAttachmentModalOpen}
                onClose={() => {
                    setIsDeleteAttachmentModalOpen(false);
                    setAttachmentToDelete(null);
                }}
                onConfirm={() => {
                    if (attachmentToDelete) {
                        router.delete(route('bug-attachments.destroy', attachmentToDelete.id), {
                            onSuccess: () => {
                                setIsDeleteAttachmentModalOpen(false);
                                setAttachmentToDelete(null);
                                axios.get(route('bugs.show', bugData.id))
                                    .then(response => setBugData(response.data.bug))
                                    .catch(console.error);
                            },
                            onError: () => {
                                setIsDeleteAttachmentModalOpen(false);
                                setAttachmentToDelete(null);
                            }
                        });
                    }
                }}
                itemName={attachmentToDelete?.media_item?.name || "attachment"}
                entityName="attachment"
            />
        </Dialog>
    );
}
