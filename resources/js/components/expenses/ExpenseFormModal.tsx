import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/custom-toast';
import TaskFileUpload, { TaskFileItem } from '@/components/tasks/TaskFileUpload';
import { useTranslation } from 'react-i18next';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    expense?: any;
    projects: any[];
    mode: 'create' | 'edit';
    currentProject?: any;
    redirectUrl?: string;
}

export default function ExpenseFormModal({ isOpen, onClose, expense, projects, mode, currentProject, redirectUrl }: Props) {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        project_id: '',
        budget_category_id: '',
        task_id: '',
        amount: '',
        expense_date: new Date().toISOString().split('T')[0],
        title: '',
        description: ''
    });

    const [availableCategories, setAvailableCategories] = useState<any[]>([]);
    const [availableTasks, setAvailableTasks] = useState<any[]>([]);
    const [expenseFiles, setExpenseFiles] = useState<TaskFileItem[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    useEffect(() => {
        if (mode === 'edit' && expense && isOpen) {
            const expenseDate = expense.expense_date.includes('T') 
                ? expense.expense_date.split('T')[0] 
                : expense.expense_date;
            
            setFormData({
                project_id: expense.project_id.toString(),
                budget_category_id: expense.budget_category_id?.toString() || 'none',
                task_id: expense.task_id?.toString() || 'none',
                amount: expense.amount.toString(),
                expense_date: expenseDate,
                title: expense.title || '',
                description: expense.description || ''
            });
            loadProjectData(expense.project_id);

            const mappedFiles: TaskFileItem[] = (expense.attachments || []).map((attachment: any) => ({
                id: attachment.media_item?.id || attachment.mediaItem?.id || attachment.media_item_id,
                media_id: attachment.media_item?.id || attachment.mediaItem?.id || attachment.media_item_id,
                attachment_id: attachment.id,
                name: attachment.media_item?.name || attachment.mediaItem?.name || 'file',
                url: attachment.media_item?.url || attachment.mediaItem?.url || route('expense-attachments.preview', attachment.id),
                thumb_url: attachment.media_item?.thumb_url || attachment.mediaItem?.thumb_url || route('expense-attachments.preview', attachment.id),
                preview_url: route('expense-attachments.preview', attachment.id),
                download_url: route('expense-attachments.download', attachment.id),
                mime_type: attachment.media_item?.mime_type || attachment.mediaItem?.mime_type || '',
                size: getAttachmentSize(attachment)
            }));
            setExpenseFiles(mappedFiles);
        } else if (mode === 'create' && isOpen) {
            const projectId = currentProject ? currentProject.id.toString() : '';
            setFormData({
                project_id: projectId,
                budget_category_id: 'none',
                task_id: 'none',
                amount: '',
                expense_date: new Date().toISOString().split('T')[0],
                title: '',
                description: ''
            });
            if (currentProject) {
                loadProjectData(currentProject.id);
            } else {
                setAvailableCategories([]);
                setAvailableTasks([]);
            }
            setExpenseFiles([]);
        }
    }, [mode, expense, isOpen, currentProject]);

    const loadProjectData = async (projectId: number) => {
        // If currentProject is provided and matches the projectId, use its budget categories
        if (currentProject && currentProject.id === projectId && currentProject.budget?.categories) {
            setAvailableCategories(currentProject.budget.categories);
        } else {
            // Otherwise, find project in projects array
            const project = projects.find(p => p.id === projectId);
            setAvailableCategories(project?.budget?.categories || []);
        }
        
        try {
            const response = await fetch(route('api.projects.tasks', projectId));
            if (response.ok) {
                const tasks = await response.json();
                setAvailableTasks(tasks);
            }
        } catch (error) {
            setAvailableTasks([]);
        }
    };

    const handleProjectChange = (projectId: string) => {
        setFormData({
            ...formData,
            project_id: projectId,
            budget_category_id: 'none',
            task_id: 'none'
        });
        
        if (projectId) {
            loadProjectData(parseInt(projectId));
        } else {
            setAvailableCategories([]);
            setAvailableTasks([]);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (isSubmitting) return;
        
        setIsSubmitting(true);
        setErrors({});
        
        const submitData = {
            project_id: formData.project_id,
            budget_category_id: formData.budget_category_id === 'none' ? null : formData.budget_category_id,
            task_id: formData.task_id === 'none' ? null : formData.task_id,
            amount: parseFloat(formData.amount),
            expense_date: formData.expense_date,
            title: formData.title,
            description: formData.description,
            media_item_ids: expenseFiles
                .map((file) => file.media_id || file.id)
                .filter((id) => !!id)
        };

        if (mode === 'create') {
            router.post(route('expenses.store'), submitData, {
                onSuccess: () => {
                    setIsSubmitting(false);
                    onClose();
                    if (redirectUrl) {
                        router.get(redirectUrl);
                    }
                },
                onError: (errors) => {
                    setIsSubmitting(false);
                    setErrors(errors);
                }
            });
        } else if (expense) {
            router.put(route('expenses.update', expense.id), submitData, {
                onSuccess: () => {
                    setIsSubmitting(false);
                    onClose();
                },
                onError: (errors) => {
                    setIsSubmitting(false);
                    setErrors(errors);
                }
            });
        }
    };

    const canEdit = !expense || expense.status === 'pending' || expense.status === 'requires_info';
    
    const handleRemoveFile = (file: TaskFileItem) => {
        if (!file.attachment_id) {
            setExpenseFiles((prev) => prev.filter((f) => f.id !== file.id));
            return;
        }

        router.delete(route('expense-attachments.destroy', file.attachment_id), {
            onSuccess: () => {
                setExpenseFiles((prev) => prev.filter((f) => f.attachment_id !== file.attachment_id));
            },
            onError: () => {
                toast.error(t('Failed to delete file'));
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl z-50 max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex justify-between items-center">
                        <DialogTitle>{mode === 'create' ? t('Create Expense') : t('Edit Expense')}</DialogTitle>
                        {expense?.status && (
                            <Badge variant="secondary">
                                {expense.status}
                            </Badge>
                        )}
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="project_id">{t('Project')} <span className="text-red-500">*</span></Label>
                        {currentProject ? (
                            <Input
                                value={currentProject.title}
                                disabled
                                className="bg-gray-50"
                            />
                        ) : (
                            <Select 
                                value={formData.project_id} 
                                onValueChange={handleProjectChange}
                                disabled={!canEdit || mode === 'edit'}
                            >
                                <SelectTrigger className={errors.project_id ? 'border-red-500' : ''}>
                                    <SelectValue placeholder={t('Select project')} />
                                </SelectTrigger>
                                <SelectContent className="z-[60]">
                                    {projects.map((project) => (
                                        <SelectItem key={project.id} value={project.id.toString()}>
                                            {project.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                        {errors.project_id && <p className="text-sm text-red-600 mt-1">{errors.project_id}</p>}
                    </div>

                    <div>
                        <Label htmlFor="budget_category_id">{t('Budget Category')}</Label>
                        <Select 
                            value={formData.budget_category_id} 
                            onValueChange={(value) => setFormData({...formData, budget_category_id: value})}
                            disabled={!canEdit || !formData.project_id}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={!formData.project_id ? t('Select project first') : t('Select category (optional)')} />
                            </SelectTrigger>
                            <SelectContent className="z-[60]">
                                <SelectItem value="none">{t('No category')}</SelectItem>
                                {availableCategories.map((category) => (
                                    <SelectItem key={category.id} value={category.id.toString()}>
                                        <div className="flex items-center gap-2">
                                            <div 
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: category.color }}
                                            />
                                            {category.name}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label htmlFor="task_id">{t('Task')}</Label>
                        <Select 
                            value={formData.task_id} 
                            onValueChange={(value) => setFormData({...formData, task_id: value})}
                            disabled={!canEdit || !formData.project_id}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={!formData.project_id ? t('Select project first') : t('Select task (optional)')} />
                            </SelectTrigger>
                            <SelectContent className="z-[60]">
                                <SelectItem value="none">{t('No task')}</SelectItem>
                                {availableTasks.map((task: any) => (
                                    <SelectItem key={task.id} value={task.id.toString()}>
                                        {task.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="title">{t('Title')} <span className="text-red-500">*</span></Label>
                            <Input
                                id="title"
                                value={formData.title}
                                onChange={(e) => setFormData({...formData, title: e.target.value})}
                                disabled={!canEdit}
                                className={errors.title ? 'border-red-500' : ''}
                            />
                            {errors.title && <p className="text-sm text-red-600 mt-1">{errors.title}</p>}
                        </div>

                        <div>
                            <Label htmlFor="amount">{t('Amount')} <span className="text-red-500">*</span></Label>
                            <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                value={formData.amount}
                                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                                disabled={!canEdit}
                                className={errors.amount ? 'border-red-500' : ''}
                            />
                            {errors.amount && <p className="text-sm text-red-600 mt-1">{errors.amount}</p>}
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="expense_date">{t('Date')} <span className="text-red-500">*</span></Label>
                        <Input
                            id="expense_date"
                            type="date"
                            value={formData.expense_date}
                            onChange={(e) => setFormData({...formData, expense_date: e.target.value})}
                            disabled={!canEdit}
                            className={errors.expense_date ? 'border-red-500' : ''}
                        />
                        {errors.expense_date && <p className="text-sm text-red-600 mt-1">{errors.expense_date}</p>}
                    </div>

                    <div>
                        <Label htmlFor="description">{t('Description')}</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                            rows={3}
                            disabled={!canEdit}
                        />
                    </div>

                    <div>
                        <Label>{t('Files')}</Label>
                        <div className="mt-2">
                            <TaskFileUpload
                                mode={canEdit ? 'edit' : 'view'}
                                files={expenseFiles}
                                onFilesChange={setExpenseFiles}
                                onRemoveFile={handleRemoveFile}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={onClose}>
                            {t('Cancel')}
                        </Button>
                        {canEdit && (
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? t('Saving...') : (mode === 'create' ? t('Create Expense') : t('Update Expense'))}
                            </Button>
                        )}
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
