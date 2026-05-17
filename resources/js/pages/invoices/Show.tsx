import React, { useEffect } from 'react';
import { router, usePage, Head } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/custom-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Edit, DollarSign, Printer, Send, Link, CreditCard, ArrowLeft } from 'lucide-react';
import { PageTemplate } from '@/components/page-template';
import { formatCurrency } from '@/utils/currency';
import { InvoicePaymentModal } from '@/components/invoices/invoice-payment-modal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QRCodeGenerator } from '@/components/QRCodeGenerator';
import { NewYork, Toronto, Rio, London, Istanbul, Mumbai, HongKong, Tokyo, Sydney, Paris } from '../settings/components/invoice-templates';
import { useBrand } from '@/contexts/BrandContext';
import TaskFileUpload, { TaskFileItem } from '@/components/tasks/TaskFileUpload';

interface InvoiceItem {
    id: number;
    type: string;
    description: string;
    rate: number;
    amount: number;
    task?: {
        id: number;
        title: string;
    };
    expense?: {
        id: number;
        title: string;
    };
}

interface Invoice {
    id: number;
    invoice_number: string;
    project: {
        id: number;
        title: string;
    };
    client?: {
        id: number;
        name: string;
        avatar?: string;
    };
    creator: {
        id: number;
        name: string;
    };
    title: string;
    description?: string;
    invoice_date: string;
    due_date: string;
    subtotal: number;
    tax_rate: Array<{id: number, name: string, rate: number}>;
    tax_amount: number;
    discount_amount: number;
    total_amount: number;
    paid_amount: number;
    payment_method?: string;
    payment_reference?: string;
    payment_details?: any;
    status: string;
    is_overdue: boolean;
    days_overdue: number;
    balance_due: number;
    notes?: string;
    terms?: string;
    payment_token: string;
    items: InvoiceItem[];
    attachments?: any[];
    created_at: string;
}

export default function InvoiceShow() {
    const { t } = useTranslation();
    const { invoice, userWorkspaceRole, flash, emailNotificationsEnabled, invoiceSettings } = usePage().props as { invoice: Invoice; userWorkspaceRole: string; flash?: any; emailNotificationsEnabled?: boolean; invoiceSettings?: any };
    const { logoDark } = useBrand();
    const [showPaymentModal, setShowPaymentModal] = React.useState(false);
    const [showMarkPaidModal, setShowMarkPaidModal] = React.useState(false);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const paymentStatus = urlParams.get('payment_status');
        const message = urlParams.get('message');

        if (paymentStatus && message) {
            const decodedMessage = decodeURIComponent(message);
            setTimeout(() => {
                if (paymentStatus === 'success') {
                    toast.success(decodedMessage);
                } else {
                    toast.error(decodedMessage);
                }
            }, 1000);

            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
        }

        if (flash?.success) {
            const message = flash.success.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
            setTimeout(() => {
                toast.success(message);
            }, 1000);
        }
        if (flash?.error) {
            const message = flash.error.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
            setTimeout(() => {
                toast.error(message);
            }, 1000);
        }
    }, [flash]);

    const getStatusColor = (status: string) => {
        const colors = {
            draft: 'bg-gray-100 text-gray-800',
            sent: 'bg-blue-100 text-blue-800',
            viewed: 'bg-yellow-100 text-yellow-800',
            paid: 'bg-green-100 text-green-800',
            partial_paid: 'bg-orange-100 text-orange-800',
            overdue: 'bg-red-100 text-red-800',
            cancelled: 'bg-gray-100 text-gray-800'
        };
        return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
    };

    const handlePrint = () => {
        window.print();
    };

    const handleAction = (action: string) => {
        switch (action) {
            case 'edit':
                router.get(route('invoices.edit', invoice.id));
                break;

            case 'mark-paid':
                setShowMarkPaidModal(true);
                break;

            case 'send':
                toast.loading('Sending invoice...');
                router.post(route('invoices.send', invoice.id), {}, {
                    onSuccess: () => {
                        toast.dismiss();
                    },
                    onError: () => {
                        toast.dismiss();
                        toast.error('Failed to send invoice');
                    }
                });
                break;

            case 'pay':
                setShowPaymentModal(true);
                break;

            case 'copy-payment-link':
                const paymentUrl = route('invoices.payment', invoice.payment_token);
                navigator.clipboard.writeText(paymentUrl).then(() => {
                    toast.success(t('Payment link copied to clipboard'));
                }).catch(() => {
                    toast.error(t('Failed to copy payment link'));
                });
                break;
        }
    };

    const handlePaymentSuccess = () => {
        router.reload();
    };

    const handleMarkPaidConfirm = () => {
        toast.loading('Marking invoice as paid...');
        router.post(route('invoices.mark-paid', invoice.id), {}, {
            onSuccess: () => {
                toast.dismiss();
                setShowMarkPaidModal(false);
            },
            onError: () => {
                toast.dismiss();
                toast.error('Failed to mark invoice as paid');
                setShowMarkPaidModal(false);
            }
        });
    };

    const pageActions = [
        {
            label: t('Print'),
            icon: <Printer className="h-4 w-4 mr-2" />,
            variant: 'outline',
            onClick: handlePrint
        }
    ];

    if (invoice.status === 'draft' && ['owner', 'manager'].includes(userWorkspaceRole)) {
        pageActions.push(
            {
                label: t('Edit'),
                icon: <Edit className="h-4 w-4 mr-2" />,
                variant: 'outline',
                onClick: () => handleAction('edit')
            },
            {
                label: t('Copy Payment Link'),
                icon: <Link className="h-4 w-4 mr-2" />,
                variant: 'outline',
                onClick: () => handleAction('copy-payment-link')
            }
        );

        if (emailNotificationsEnabled) {
            pageActions.push(
                {
                    label: t('Send'),
                    icon: <Send className="h-4 w-4 mr-2" />,
                    variant: 'default',
                    onClick: () => handleAction('send')
                }
            );
        }
    }

    if (invoice.status !== 'paid' && invoice.status !== 'cancelled') {
        if (userWorkspaceRole === 'client') {
            pageActions.push(
                {
                    label: t('Pay Now'),
                    icon: <CreditCard className="h-4 w-4 mr-2" />,
                    variant: 'default',
                    onClick: () => handleAction('pay')
                }
            );
        } else {
            // Only add Copy Payment Link if not already added in draft section
            if (invoice.status !== 'draft') {
                pageActions.push(
                    {
                        label: t('Copy Payment Link'),
                        icon: <Link className="h-4 w-4 mr-2" />,
                        variant: 'outline',
                        onClick: () => handleAction('copy-payment-link')
                    }
                );
            }
            pageActions.push(
                {
                    label: t('Mark as Paid'),
                    icon: <DollarSign className="h-4 w-4 mr-2" />,
                    variant: 'default',
                    onClick: () => handleAction('mark-paid')
                }
            );
        }
    }

    pageActions.push(
                {
                    label: t('Back'),
                    icon: <ArrowLeft className="h-4 w-4 mr-2" />,
                    variant: 'outline',
                    onClick: () => router.get(route('invoices.index'))
                }
            );

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Invoices'), href: route('invoices.index') },
        { title: invoice.invoice_number }
    ];

    const formatAmount = (amount: number) => {
        return formatCurrency(amount);
    };

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

    const invoiceFiles: TaskFileItem[] = (invoice.attachments || []).map((attachment: any) => ({
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

    const showQr = invoiceSettings?.invoice_qr_display === 'true' || invoiceSettings?.invoice_qr_display === true;
    const footerTitle = invoiceSettings?.invoice_footer_title || '';
    const footerNotes = invoiceSettings?.invoice_footer_notes || '';
    const templateName = invoiceSettings?.invoice_template || 'london';
    const invoiceColor = invoiceSettings?.invoice_color || '#ffffff';
    const companyLogo = (invoiceSettings?.invoice_logo && invoiceSettings.invoice_logo.trim() !== '') ? invoiceSettings.invoice_logo : logoDark;

    return (
        <>
            <Head>
                <style>{`
                    @media print {
                        @page { margin: 0.5in; }
                        body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
                        a[href]::after { content: none !important; }
                        .print\:hidden { display: none !important; }
                        .print\:block { display: block !important; }
                    }
                `}</style>
            </Head>
        <div className="print:hidden">
        <PageTemplate
            title={`${t('Invoice')} #${invoice.invoice_number}`}
            url={`/invoices/${invoice.id}`}
            actions={pageActions}
            breadcrumbs={breadcrumbs}
        >
            <div className="space-y-6 print:hidden">
                {/* Customer Details Card */}
                <Card>
                    <CardContent className="p-6">
                        {/* Header with Invoice Number, Status, and Total */}
                        <div className="flex justify-between items-start mb-6">
                            <div className="text-xl tracking-tight">#{invoice.invoice_number}</div>
                            <div className="text-right">
                                <Badge className={`${getStatusColor(invoice.status)} text-xs font-semibold`}>
                                    {invoice.status.replace('_', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                </Badge>
                                <div className="text-2xl font-bold mt-2 tracking-tight">{formatCurrency(invoice.total_amount)}</div>
                                <div className="text-sm text-muted-foreground font-medium">{t('Total Amount')}</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            {/* Customer */}
                            <div>
                                <div>
                                    <h3 className="font-semibold mb-2">{t('Customer')}</h3>
                                    <div className="text-sm text-muted-foreground space-y-1">{invoice.client?.name || '-'}</div>
                                </div>
                                {invoice.description && (
                                    <div className="mt-4">
                                        <h3 className="font-semibold mb-2">{t('Description')}</h3>
                                        <div className="text-sm text-muted-foreground space-y-1">{invoice.description}</div>
                                    </div>
                                )}
                            </div>

                            {/* Project */}
                            {invoice.project && (
                                <div>
                                    <h3 className="font-semibold mb-2">{t('Project')}</h3>
                                    <div className="text-sm text-muted-foreground space-y-1">{invoice.project.title}</div>
                                </div>
                            )}

                            {/* QR Code */}
                            {showQr ? (
                                <div>
                                    <QRCodeGenerator
                                        value={route('invoices.payment', invoice.payment_token)}
                                        size={110}
                                    />
                                    <p className="text-xs text-muted-foreground mt-2">{t('Scan for invoice details')}</p>
                                </div>
                            ) : (
                                <div></div>
                            )}

                            {/* Details */}
                            <div>
                                <h3 className="font-semibold uppercase mb-2">{t('Details')}</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="font-semibold">{t('Invoice Date')}</span>
                                        <span className="text-sm text-muted-foreground">{new Date(invoice.invoice_date).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-semibold">{t('Due Date')}</span>
                                        <span className="text-sm font-semibold text-red-600">
                                            {new Date(invoice.due_date).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-blue-600 tracking-tight">{formatCurrency(invoice.balance_due)}</div>
                                        <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">{t('Balance Due')}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        {invoice.notes && (
                            <div className="mt-6 pt-4 border-t">
                                <div className="flex gap-2">
                                    <span className="font-bold text-sm">{t('Notes')}:</span>
                                    <span className="text-sm text-muted-foreground">{invoice.notes}</span>
                                </div>
                            </div>
                        )}

                        {/* Terms & Conditions */}
                        {invoice.terms && (
                            <div className={`${invoice.notes ? 'mt-3' : 'mt-6 pt-4 border-t'}`}>
                                <div className="flex gap-2">
                                    <span className="font-bold text-sm">{t('Terms & Conditions')}:</span>
                                    <span className="text-sm text-muted-foreground">{invoice.terms}</span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Invoice Items */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl font-bold tracking-tight">
                            {t('Invoice Tasks')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className="px-4 py-3 text-left text-sm font-bold uppercase tracking-wide">{t('Task')}</th>
                                        <th className="px-4 py-3 text-right text-sm font-bold uppercase tracking-wide">{t('Amount')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {invoice.items?.map((item) => (
                                        <tr key={item.id}>
                                            <td className="px-4 py-4">
                                                {item.task?.title && (
                                                    <div className="font-semibold text-base">{item.task.title}</div>
                                                )}
                                                {item.task?.description && (
                                                    <div className="text-sm text-muted-foreground mt-1">{item.task.description}</div>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-right font-bold text-base">
                                                {formatCurrency(item.amount)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <div className="w-96 space-y-2 bg-muted/30 rounded-lg p-5">
                                <div className="flex justify-between text-sm">
                                    <span className=" font-semibold">{t('Subtotal')}</span>
                                    <span className="font-bold">{formatCurrency(invoice.subtotal)}</span>
                                </div>
                                {invoice.tax_rate && Array.isArray(invoice.tax_rate) && invoice.tax_rate.length > 0 && (
                                    invoice.tax_rate.map((tax: any, index: number) => {
                                        const taxAmount = (invoice.subtotal * tax.rate) / 100;
                                        return (
                                            <div key={index} className="flex justify-between text-sm">
                                                <span className="text-muted-foreground font-semibold">{tax.name} ({tax.rate}%)</span>
                                                <span className="font-bold">{formatCurrency(taxAmount)}</span>
                                            </div>
                                        );
                                    })
                                )}
                                <Separator className="my-3" />
                                <div className="flex justify-between">
                                    <span className="font-bold text-base">{t('Total Amount')}</span>
                                    <span className="font-bold text-xl tracking-tight">{formatCurrency(invoice.total_amount)}</span>
                                </div>
                                {invoice.paid_amount > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground font-semibold">{t('Paid Amount')}</span>
                                        <span className="font-bold text-green-600">{formatCurrency(invoice.paid_amount)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="font-bold text-base">{t('Balance Due')}</span>
                                    <span className="font-bold text-xl text-blue-600 tracking-tight">{formatCurrency(invoice.balance_due)}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl font-bold tracking-tight">
                            {t('Files')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {invoiceFiles.length > 0 ? (
                            <TaskFileUpload mode="view" files={invoiceFiles} />
                        ) : (
                            <div className="py-6 text-center text-sm text-gray-500">{t('No files available')}</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Payment Modal */}
            <InvoicePaymentModal
                invoice={invoice}
                open={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                onSuccess={handlePaymentSuccess}
            />

            {/* Mark as Paid Confirmation Modal */}
            <Dialog open={showMarkPaidModal} onOpenChange={setShowMarkPaidModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('Mark Invoice as Paid')}</DialogTitle>
                    </DialogHeader>
                    <p>{t('Are you sure you want to mark invoice')} {invoice.invoice_number} {t('as paid')}?</p>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" onClick={() => setShowMarkPaidModal(false)}>
                            {t('Cancel')}
                        </Button>
                        <Button onClick={handleMarkPaidConfirm}>
                            {t('Mark as Paid')}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </PageTemplate>
        </div>

        {/* Print Template */}
        <div className="hidden print:block">
                {(() => {
                    const templateProps = {
                        invoice,
                        color: invoiceColor,
                        showQr,
                        invoiceUrl: route('invoices.payment', invoice.payment_token),
                        footerTitle,
                        footerNotes,
                        remainingAmount: invoice.balance_due,
                        formatAmount,
                        t,
                        companyLogo
                    };

                    switch(templateName?.toLowerCase()) {
                        case 'new_york': return <NewYork {...templateProps} />;
                        case 'toronto': return <Toronto {...templateProps} />;
                        case 'rio': return <Rio {...templateProps} />;
                        case 'istanbul': return <Istanbul {...templateProps} />;
                        case 'mumbai': return <Mumbai {...templateProps} />;
                        case 'hong_kong': return <HongKong {...templateProps} />;
                        case 'tokyo': return <Tokyo {...templateProps} />;
                        case 'sydney': return <Sydney {...templateProps} />;
                        case 'paris': return <Paris {...templateProps} />;
                        case 'london':
                        default:
                            return <London {...templateProps} />;
                    }
                })()}
            </div>
        </>
    );
}
