import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, User, MessageSquare, CheckSquare, Paperclip, Edit, Save, X } from 'lucide-react';
import { Task, User as UserType, TaskStage, ProjectMilestone } from '@/types';
import TaskComments from '@/components/tasks/TaskComments';
import TaskChecklist from '@/components/tasks/TaskChecklist';
import TaskFileUpload, { TaskFileItem } from '@/components/tasks/TaskFileUpload';
import { toast } from '@/components/custom-toast';

interface Props {
    task: Task;
    isOpen: boolean;
    onClose: () => void;
    members: UserType[];
    stages: TaskStage[];
    milestones: ProjectMilestone[];
    permissions?: any;
    workspaceRole?: string;
}

export default function TaskModal({ task, isOpen, onClose, members, stages, milestones, permissions, workspaceRole: initialWorkspaceRole }: Props) {
    const { t } = useTranslation();
    const [currentTask, setCurrentTask] = useState(task);
    const [taskPermissions, setTaskPermissions] = useState(permissions);
    const [workspaceRole, setWorkspaceRole] = useState<string | null>(initialWorkspaceRole || null);

    const refreshTask = async () => {
        try {
            const response = await fetch(route('tasks.show', task.id));
            const data = await response.json();
            setCurrentTask(data.task);
            setTaskPermissions(data.permissions);
            setWorkspaceRole(data.workspace_role);
        } catch (error) {
            console.error('Failed to refresh task:', error);
        }
    };



    const handleStageChange = (stageId: string) => {
        router.put(route('tasks.change-stage', task.id), {
            task_stage_id: stageId
        }, {
            onSuccess: () => {
                refreshTask();
            },
            onError: () => {
                toast.error('Failed to update stage');
            }
        });
    };

    const handlePriorityChange = (priority: string) => {
        router.put(route('tasks.update', task.id), {
            title: currentTask.title,
            description: currentTask.description || '',
            priority: priority,
            start_date: currentTask.start_date,
            end_date: currentTask.end_date,
            assigned_to: currentTask.assigned_to?.id,
            milestone_id: currentTask.milestone_id
        }, {
            onSuccess: () => {
                refreshTask();
            },
            onError: () => {
                toast.error('Failed to update priority');
            }
        });
    };

    const handleAssigneeChange = (assigneeId: string) => {
        const assignedUserId = assigneeId === 'unassigned' ? null : parseInt(assigneeId);
        
        router.put(route('tasks.update', task.id), {
            title: currentTask.title,
            description: currentTask.description || '',
            priority: currentTask.priority,
            start_date: currentTask.start_date,
            end_date: currentTask.end_date,
            assigned_to: assignedUserId,
            milestone_id: currentTask.milestone_id
        }, {
            onSuccess: () => {
                refreshTask();
            },
            onError: () => {
                toast.error('Failed to update assignee');
            }
        });
    };

    const handleDateChange = (field: string, value: string) => {
        router.put(route('tasks.update', task.id), {
            title: currentTask.title,
            description: currentTask.description || '',
            priority: currentTask.priority,
            start_date: field === 'start_date' ? (value || null) : currentTask.start_date,
            end_date: field === 'end_date' ? (value || null) : currentTask.end_date,
            assigned_to: currentTask.assigned_to?.id,
            milestone_id: currentTask.milestone_id
        }, {
            onSuccess: () => {
                refreshTask();
            },
            onError: () => {
                toast.error('Failed to update date');
            }
        });
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'critical': return 'bg-red-100 text-red-800';
            case 'high': return 'bg-orange-100 text-orange-800';
            case 'medium': return 'bg-yellow-100 text-yellow-800';
            case 'low': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{currentTask.title}</DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Description */}
                        <div>
                            <h3 className="text-sm font-medium text-gray-900 mb-2">{t('Description')}</h3>
                            <div className="text-sm text-gray-600">
                                {currentTask.description || t('No description provided')}
                            </div>
                        </div>

                        {/* Tabs for Comments, Checklist, Attachments */}
                        <Tabs defaultValue="comments" className="w-full">
                            <TabsList>
                                <TabsTrigger value="comments" className="flex items-center space-x-2">
                                    <MessageSquare className="h-4 w-4" />
                                    <span>{t('Comments')} ({task.comments?.length || 0})</span>
                                </TabsTrigger>
                                <TabsTrigger value="checklist" className="flex items-center space-x-2">
                                    <CheckSquare className="h-4 w-4" />
                                    <span>{t('Checklist')} ({task.checklists?.length || 0})</span>
                                </TabsTrigger>
                                <TabsTrigger value="attachments" className="flex items-center space-x-2">
                                    <Paperclip className="h-4 w-4" />
                                    <span>{t('Files')} ({currentTask.attachments?.length || 0})</span>
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="comments" className="space-y-4">
                                <TaskComments 
                                    task={currentTask} 
                                    comments={currentTask.comments || []} 
                                    currentUser={members[0]} 
                                    onUpdate={refreshTask}
                                    canAddComments={workspaceRole !== 'client'}
                                />
                            </TabsContent>

                            <TabsContent value="checklist" className="space-y-4">
                                <TaskChecklist 
                                    task={currentTask} 
                                    checklist={currentTask.checklists || []} 
                                    members={currentTask.project?.members?.filter(m => m.user?.type !== 'client').map(m => m.user) || members} 
                                    onUpdate={refreshTask}
                                    canManageChecklists={workspaceRole !== 'client' && workspaceRole !== 'member'}
                                />
                            </TabsContent>

                            <TabsContent value="attachments" className="space-y-4">
                                <TaskFileUpload
                                    mode="view"
                                    files={(currentTask.attachments || []).map((attachment: any): TaskFileItem => ({
                                        id: attachment.media_item?.id || attachment.mediaItem?.id || attachment.media_item_id,
                                        media_id: attachment.media_item?.id || attachment.mediaItem?.id || attachment.media_item_id,
                                        attachment_id: attachment.id,
                                        name: attachment.media_item?.name || attachment.mediaItem?.name || 'file',
                                        url: attachment.media_item?.url || attachment.mediaItem?.url || route('task-attachments.preview', attachment.id),
                                        thumb_url: attachment.media_item?.thumb_url || attachment.mediaItem?.thumb_url || route('task-attachments.preview', attachment.id),
                                        preview_url: route('task-attachments.preview', attachment.id),
                                        download_url: route('task-attachments.download', attachment.id),
                                        mime_type: attachment.media_item?.mime_type || attachment.mediaItem?.mime_type || '',
                                        size: attachment.media_item?.size || attachment.mediaItem?.size || 0
                                    }))}
                                />
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Stage */}
                        <div>
                            <h3 className="text-sm font-medium text-gray-900 mb-2">{t('Stage')}</h3>
                            {taskPermissions?.change_status ? (
                                <Select value={currentTask.task_stage_id.toString()} onValueChange={handleStageChange}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="z-[9999]">
                                        {stages.map((stage) => (
                                            <SelectItem key={stage.id} value={stage.id.toString()}>
                                                <div className="flex items-center space-x-2">
                                                    <div 
                                                        className="w-3 h-3 rounded-full" 
                                                        style={{ backgroundColor: stage.color }}
                                                    />
                                                    <span>{stage.name}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                                    <div 
                                        className="w-3 h-3 rounded-full" 
                                        style={{ backgroundColor: currentTask.task_stage?.color }}
                                    />
                                    <span>{currentTask.task_stage?.name}</span>
                                </div>
                            )}
                        </div>

                        {/* Priority */}
                        <div>
                            <h3 className="text-sm font-medium text-gray-900 mb-2">{t('Priority')}</h3>
                            {taskPermissions?.update && workspaceRole !== 'client' ? (
                                <Select value={currentTask.priority} onValueChange={handlePriorityChange}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="z-[9999]">
                                        <SelectItem value="low">{t('Low')}</SelectItem>
                                        <SelectItem value="medium">{t('Medium')}</SelectItem>
                                        <SelectItem value="high">{t('High')}</SelectItem>
                                        <SelectItem value="critical">{t('Critical')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            ) : (
                                <div className={`inline-flex px-2 py-1 rounded text-sm ${getPriorityColor(currentTask.priority)}`}>
                                    {currentTask.priority}
                                </div>
                            )}
                        </div>

                        {/* Assignee - Completely hide for client role */}
                        {workspaceRole !== 'client' && (
                            <div>
                                <h3 className="text-sm font-medium text-gray-900 mb-2">{t('Assignee')}</h3>
                                {taskPermissions?.assign_users === true ? (
                                    <Select value={currentTask.assigned_to?.id?.toString() || 'unassigned'} onValueChange={handleAssigneeChange}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('Select assignee')} />
                                        </SelectTrigger>
                                        <SelectContent className="z-[9999]">
                                            <SelectItem value="unassigned">{t('Unassigned')}</SelectItem>
                                            {(() => {
                                                const projectMembers = currentTask.project?.members?.filter(m => m.user?.type !== 'client').map(m => m.user) || [];
                                                return projectMembers.length > 0 ? projectMembers : members;
                                            })().map((member) => (
                                                <SelectItem key={member.id} value={member.id.toString()}>
                                                    {member.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : currentTask.assigned_to ? (
                                    <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                                        <span className="text-sm text-gray-700">{currentTask.assigned_to.name}</span>
                                    </div>
                                ) : null}
                            </div>
                        )}
                        

                        {/* Dates */}
                        <div>
                            <h3 className="text-sm font-medium text-gray-900 mb-2">{t('Dates')}</h3>
                            <div className="space-y-2">
                                <div>
                                    <label className="text-xs text-gray-500">{t('Start Date')}</label>
                                    {taskPermissions?.update && workspaceRole !== 'client' ? (
                                        <Input
                                            type="date"
                                            value={currentTask.start_date?.split('T')[0] || ''}
                                            onChange={(e) => handleDateChange('start_date', e.target.value)}
                                            className="mt-1"
                                        />
                                    ) : (
                                        <div className="text-sm text-gray-600 mt-1">
                                            {currentTask.start_date ? new Date(currentTask.start_date).toLocaleDateString() : t('Not set')}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500">{t('Due Date')}</label>
                                    {taskPermissions?.update && workspaceRole !== 'client' ? (
                                        <Input
                                            type="date"
                                            value={currentTask.end_date?.split('T')[0] || ''}
                                            onChange={(e) => handleDateChange('end_date', e.target.value)}
                                            className="mt-1"
                                        />
                                    ) : (
                                        <div className="text-sm text-gray-600 mt-1">
                                            {currentTask.end_date ? new Date(currentTask.end_date).toLocaleDateString() : t('Not set')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Progress */}
                        <div>
                            <h3 className="text-sm font-medium text-gray-900 mb-2">{t('Progress')}</h3>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">{currentTask.progress}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                        className="bg-blue-600 h-2 rounded-full transition-all" 
                                        style={{ width: `${currentTask.progress}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Project & Milestone */}
                        <div>
                            <h3 className="text-sm font-medium text-gray-900 mb-2">{t('Project')}</h3>
                            <span className="text-sm text-gray-600">{currentTask.project?.title}</span>
                            
                            {currentTask.milestone && (
                                <div className="mt-2">
                                    <h3 className="text-sm font-medium text-gray-900 mb-1">{t('Milestone')}</h3>
                                    <span className="text-sm text-gray-600">{currentTask.milestone.title}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
