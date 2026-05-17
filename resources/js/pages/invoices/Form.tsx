import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { PageTemplate } from '@/components/page-template';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, CalendarDays, Package, FileText, ArrowLeft } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/utils/currency';
import TaskFileUpload, { TaskFileItem } from '@/components/tasks/TaskFileUpload';

interface InvoiceItem {
    type: 'task';
    description: string;
    rate: number;
    amount: number;
    task_id: number | null;
}

interface Props {
    invoice?: any;
    projects: any[];
    clients: any[];
    currencies: any[];
    taxes: any[];
}

export default function InvoiceForm({ invoice, projects, clients, currencies, taxes }: Props) {
    const { t } = useTranslation();
    const isEdit = !!invoice;

    const [formData, setFormData] = useState({
        project_id: invoice?.project_id?.toString() || '',
        client_id: invoice?.client_id?.toString() || '',
        title: invoice?.title || '',
        description: invoice?.description || '',
        invoice_date: invoice?.invoice_date ? new Date(invoice.invoice_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        due_date: invoice?.due_date ? new Date(invoice.due_date).toISOString().split('T')[0] : '',

        selected_taxes: invoice?.selected_taxes || [],

        currency: invoice?.currency || 'USD',
        notes: invoice?.notes || '',
        terms: invoice?.terms || '',
    });

    const [items, setItems] = useState<InvoiceItem[]>(
        invoice?.items?.map((item: any) => ({
            type: 'task',
            description: item.description || '',
            rate: item.rate || 0,
            amount: item.amount || 0,
            task_id: item.task_id,
        })) || [{
            type: 'task',
            description: '',
            rate: 0,
            amount: 0,
            task_id: null
        }]
    );

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [projectTasks, setProjectTasks] = useState([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [projectClients, setProjectClients] = useState([]);
    const [availableClients, setAvailableClients] = useState([]);
    const [invoiceFiles, setInvoiceFiles] = useState<TaskFileItem[]>([]);

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
        if (isEdit && invoice?.attachments) {
            const mapped = (invoice.attachments || []).map((attachment: any) => ({
                id: attachment.media_item?.id || attachment.mediaItem?.id || attachment.media_item_id,
                media_id: attachment.media_item?.id || attachment.mediaItem?.id || attachment.media_item_id,
                attachment_id: attachment.id,
                name: attachment.media_item?.name || attachment.mediaItem?.name || 'file',
                url: attachment.media_item?.url || attachment.mediaItem?.url || route('invoice-attachments.preview', attachment.id),
                thumb_url: attachment.media_item?.thumb_url || attachment.mediaItem?.thumb_url || route('invoice-attachments.preview', attachment.id),
                preview_url: route('invoice-attachments.preview', attachment.id),
                download_url: route('invoice-attachments.download', attachment.id),
                mime_type: attachment.media_item?.mime_type || attachment.mediaItem?.mime_type || '',
                size: getAttachmentSize(attachment)
            }));
            setInvoiceFiles(mapped);
        }
    }, [isEdit, invoice]);

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Invoices'), href: route('invoices.index') },
        { title: isEdit ? `${t('Edit')} ${invoice.invoice_number}` : t('Create Invoice') }
    ];

    useEffect(() => {
        if (formData.project_id) {
            loadProjectData(formData.project_id);
        }
        // Set initial available clients
        setAvailableClients(clients || []);
    }, []);

    const handleInputChange = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        if (field === 'project_id' && value) {
            loadProjectData(value);
        } else if (field === 'project_id' && !value) {
            setProjectTasks([]);
            setProjectClients([]);
            setAvailableClients(clients || []);
        }
    };

    const loadProjectData = async (projectId: string) => {
        try {
            const response = await fetch(route('api.projects.invoice-data', projectId), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'same-origin'
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setProjectTasks(data.tasks || []);
            setProjectClients(data.clients || []);

            // Merge project clients with all clients, ensuring current client is included
            const mergedClients = [...(data.clients || [])];
            const allClientIds = mergedClients.map(c => c.id);

            // Add clients that aren't in project clients but are in workspace
            clients.forEach(client => {
                if (!allClientIds.includes(client.id)) {
                    mergedClients.push(client);
                }
            });

            setAvailableClients(mergedClients);
        } catch (error) {
            console.error('Failed to load project data:', error);
            setProjectTasks([]);
            setProjectClients([]);
            setAvailableClients(clients || []);
        }
    };

    const handleItemChange = (index: number, field: string, value: any) => {
        const updatedItems = [...items];
        updatedItems[index] = {
            ...updatedItems[index],
            [field]: value
        };
        setItems(updatedItems);
    };

    const addItem = () => {
        setItems([...items, {
            type: 'task',
            description: '',
            rate: 0,
            amount: 0,
            task_id: null
        }]);
    };

    const removeItem = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const calculateSubtotal = () => {
        return items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    };

    const calculateTax = () => {
        if (!formData.selected_taxes || !formData.selected_taxes.length) return 0;
        const subtotal = calculateSubtotal();
        return formData.selected_taxes.reduce((total: number, taxId: number) => {
            const tax = taxes?.find(t => t.id == taxId);
            return total + (subtotal * (tax?.rate || 0)) / 100;
        }, 0);
    };

    const calculateTotal = () => {
        return calculateSubtotal() + calculateTax();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const submitData = {
            ...formData,
            client_id: formData.client_id === 'none' ? null : formData.client_id,
            items: items.filter(item => item.task_id !== null && item.task_id !== 'no-tasks'),
            media_item_ids: invoiceFiles
                .map((file) => file.media_id || file.id)
                .filter((id) => !!id)
        };

        if (isEdit) {
            router.put(route('invoices.update', invoice.id), submitData, {
                onSuccess: () => setIsSubmitting(false),
                onError: (errors) => {
                    setIsSubmitting(false);
                    setErrors(errors);
                }
            });
        } else {
            router.post(route('invoices.store'), submitData, {
                onSuccess: () => setIsSubmitting(false),
                onError: (errors) => {
                    setIsSubmitting(false);
                    setErrors(errors);
                }
            });
        }
    };

    return (
        <PageTemplate
            title={isEdit ? `${t('Edit Invoice')} ${invoice.invoice_number}` : t('Create Invoice')}
            url={isEdit ? `/invoices/${invoice.id}/edit` : "/invoices/create"}
            breadcrumbs={breadcrumbs}
            actions={[
                {
                    label: t('Back'),
                    icon: <ArrowLeft className="h-4 w-4 mr-2" />,
                    variant: 'outline',
                    onClick: () => router.get(route('invoices.index'))
                }
            ]}
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <CalendarDays className="h-5 w-5" />
                            {t('Invoice Details')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <Label htmlFor="project_id">
                                    {t('Project')} <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                    value={formData.project_id}
                                    onValueChange={(value) => handleInputChange('project_id', value)}
                                >
                                    <SelectTrigger className={errors.project_id ? 'border-red-500' : ''}>
                                        <SelectValue placeholder={t('Select project')} />
                                    </SelectTrigger>
                                    <SelectContent className="z-[9999]">
                                        {projects?.map((project: any) => (
                                            <SelectItem key={project.id} value={project.id.toString()}>
                                                {project.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.project_id && <p className="text-sm text-red-600 mt-1">{errors.project_id}</p>}
                            </div>

                            <div>
                                <Label htmlFor="client_id">
                                    {t('Client')}
                                </Label>
                                <Select
                                    value={formData.client_id}
                                    onValueChange={(value) => handleInputChange('client_id', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('Select client (optional)')} />
                                    </SelectTrigger>
                                    <SelectContent className="z-[9999]">
                                        <SelectItem value="none">{t('No client')}</SelectItem>
                                        {availableClients?.map((client: any) => (
                                            <SelectItem key={client.id} value={client.id.toString()}>
                                                {client.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="invoice_date">
                                    {t('Invoice Date')} <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="invoice_date"
                                    type="date"
                                    value={formData.invoice_date}
                                    onChange={(e) => handleInputChange('invoice_date', e.target.value)}
                                    className={errors.invoice_date ? 'border-red-500' : ''}
                                />
                                {errors.invoice_date && <p className="text-sm text-red-600 mt-1">{errors.invoice_date}</p>}
                            </div>

                            <div>
                                <Label htmlFor="due_date">
                                    {t('Due Date')} <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="due_date"
                                    type="date"
                                    value={formData.due_date}
                                    onChange={(e) => handleInputChange('due_date', e.target.value)}
                                    className={errors.due_date ? 'border-red-500' : ''}
                                />
                                {errors.due_date && <p className="text-sm text-red-600 mt-1">{errors.due_date}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div>
                                <Label htmlFor="title">
                                    {t('Invoice Title')} <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="title"
                                    value={formData.title}
                                    onChange={(e) => handleInputChange('title', e.target.value)}
                                    placeholder={t('Enter invoice title')}
                                    className={errors.title ? 'border-red-500' : ''}
                                />
                                {errors.title && <p className="text-sm text-red-600 mt-1">{errors.title}</p>}
                            </div>

                            <div>
                                <Label htmlFor="description">
                                    {t('Description')}
                                </Label>
                                <Input
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => handleInputChange('description', e.target.value)}
                                    placeholder={t('Enter invoice description')}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div>
                                <Label htmlFor="notes">
                                    {t('Notes')}
                                </Label>
                                <Textarea
                                    id="notes"
                                    value={formData.notes}
                                    onChange={(e) => handleInputChange('notes', e.target.value)}
                                    placeholder={t('Internal notes')}
                                    rows={2}
                                />
                            </div>
                            <div>
                                <Label htmlFor="terms">
                                    {t('Terms & Conditions')}
                                </Label>
                                <Textarea
                                    id="terms"
                                    value={formData.terms}
                                    onChange={(e) => handleInputChange('terms', e.target.value)}
                                    placeholder={t('Payment terms and conditions')}
                                    rows={2}
                                />
                            </div>
                        </div>

                        <div className="mt-4">
                            <Label>{t('Tax')}</Label>
                            <div className="space-y-2">
                                <Select
                                    value=""
                                    onValueChange={(value) => {
                                        const taxId = parseInt(value);
                                        if (!formData.selected_taxes.includes(taxId)) {
                                            handleInputChange('selected_taxes', [...formData.selected_taxes, taxId]);
                                        }
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('Select tax')} />
                                    </SelectTrigger>
                                    <SelectContent className="z-[9999]">
                                        {taxes?.filter(tax => !formData.selected_taxes.includes(tax.id)).map((tax: any) => (
                                            <SelectItem key={tax.id} value={tax.id.toString()}>
                                                {tax.name} ({tax.rate}%)
                                            </SelectItem>
                                        ))}
                                        {taxes?.filter(tax => !formData.selected_taxes.includes(tax.id)).length === 0 && (
                                            <SelectItem value="no-taxes" disabled>
                                                {taxes?.length === 0 ? t('No taxes configured') : t('All taxes selected')}
                                            </SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                                {formData.selected_taxes.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {formData.selected_taxes.map((taxId: number) => {
                                            const tax = taxes?.find(t => t.id === taxId);
                                            if (!tax) return null;
                                            const taxAmount = (calculateSubtotal() * tax.rate) / 100;
                                            return (
                                                <div key={taxId} className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                                    <span>{tax.name} ({tax.rate}%): {formatCurrency(taxAmount)}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            handleInputChange('selected_taxes', formData.selected_taxes.filter((id: number) => id !== taxId));
                                                        }}
                                                        className="ml-1 text-blue-600 cursor-pointer hover:text-blue-800 font-bold"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <FileText className="h-5 w-5" />
                            {t('Files')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <TaskFileUpload
                            mode="edit"
                            files={invoiceFiles}
                            onFilesChange={(nextFiles) => {
                                if (!isEdit) {
                                    setInvoiceFiles(nextFiles);
                                    return;
                                }

                                const existingIds = new Set(invoiceFiles.map((file) => file.id));
                                const addedIds = nextFiles.map((file) => file.id).filter((id) => !existingIds.has(id));

                                if (addedIds.length === 0) return;

                                router.post(route('invoice-attachments.store', invoice.id), {
                                    media_item_ids: addedIds
                                }, {
                                    onSuccess: () => {
                                        setInvoiceFiles(nextFiles);
                                    }
                                });
                            }}
                            onRemoveFile={(file) => {
                                if (!isEdit) {
                                    setInvoiceFiles((prev) => prev.filter((f) => f.id !== file.id));
                                    return;
                                }

                                if (!file.attachment_id) return;
                                router.delete(route('invoice-attachments.destroy', file.attachment_id), {
                                    onSuccess: () => {
                                        setInvoiceFiles((prev) => prev.filter((f) => f.id !== file.id));
                                    }
                                });
                            }}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Package className="h-5 w-5" />
                                {t('Invoice Items')}
                            </CardTitle>
                            <Button type="button" onClick={addItem} variant="default" size="sm">
                                + {t('Add Item')}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {items.map((item, index) => {
                                const taskError = errors[`items.${index}.task_id`] || errors['items'];
                                const amountError = errors[`items.${index}.amount`];
                                return (
                                <div key={index} className="grid grid-cols-12 gap-2 items-end">
                                    <div className="col-span-9">
                                        <Label>
                                            {t('Task')} <span className="text-red-500">*</span>
                                        </Label>
                                        <Select
                                            value={item.task_id?.toString() || ''}
                                            onValueChange={(value) => handleItemChange(index, 'task_id', value ? parseInt(value) : null)}
                                        >
                                            <SelectTrigger className={taskError ? 'border-red-500' : ''}>
                                                <SelectValue placeholder={t('Select task')} />
                                            </SelectTrigger>
                                            <SelectContent className="z-[9999]">
                                                {projectTasks.map((task: any) => (
                                                    <SelectItem key={task.id} value={task.id.toString()}>
                                                        {task.title}
                                                    </SelectItem>
                                                ))}
                                                {projectTasks.length === 0 && (
                                                    <SelectItem value="no-tasks" disabled>
                                                        {formData.project_id ? t('No tasks found') : t('Select project first')}
                                                    </SelectItem>
                                                )}
                                            </SelectContent>
                                        </Select>
                                        {taskError && <p className="text-sm text-red-600 mt-1">{taskError}</p>}
                                    </div>
                                    <div className="col-span-2">
                                        <Label>
                                            {t('Amount')} <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={item.amount}
                                            onChange={(e) => handleItemChange(index, 'amount', parseFloat(e.target.value) || 0)}
                                            className={amountError ? 'border-red-500' : ''}
                                        />
                                        {amountError && <p className="text-sm text-red-600 mt-1">{amountError}</p>}
                                    </div>
                                    <div className="col-span-1">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeItem(index)}
                                            disabled={items.length === 1}
                                            className="text-red-600 hover:text-red-800"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )})}
                        </div>

                        <div className="mt-6 flex justify-end">
                            <div className="w-80 bg-muted/30 rounded-lg p-4">
                                <h3 className="font-semibold mb-3">{t('Invoice Summary')}</h3>
                                <div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">{t('Subtotal')}</span>
                                        <span className="font-medium">{formatCurrency(calculateSubtotal())}</span>
                                    </div>
                                    {formData.selected_taxes.length > 0 && formData.selected_taxes.map((taxId: number) => {
                                        const tax = taxes?.find(t => t.id === taxId);
                                        if (!tax) return null;
                                        const taxAmount = (calculateSubtotal() * tax.rate) / 100;
                                        return (
                                            <div key={taxId} className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">{tax.name} ({tax.rate}%)</span>
                                                <span className="font-medium">{formatCurrency(taxAmount)}</span>
                                            </div>
                                        );
                                    })}
                                    <Separator className="my-2" />
                                    <div className="flex justify-between">
                                        <span className="font-semibold">{t('Total')}</span>
                                        <span className="font-bold text-lg">{formatCurrency(calculateTotal())}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                        {items.length} {t('items added')}
                    </div>
                    <div className="flex gap-3">
                        <Button type="button" variant="outline" onClick={() => router.visit(route('invoices.index'))}>
                            {t('Cancel')}
                        </Button>
                        <Button type="submit" disabled={isSubmitting || items.length === 0}>
                            {isSubmitting ? (isEdit ? t('Updating...') : t('Creating...')) : (isEdit ? t('Update Invoice') : t('Create Invoice'))}
                        </Button>
                    </div>
                </div>
            </form>
        </PageTemplate>
    );
}
