import { useState, useEffect, useRef } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { PageTemplate } from '@/components/page-template';
import { useTranslation } from 'react-i18next';
import { Copy, FileText, MessageSquare, Paperclip, User, Calendar, DollarSign, Plus, Pin, Trash2, Eye, Upload, Search, Clock, CheckCircle, AlertTriangle, PenTool, Send, Download, Edit, ArrowLeft } from 'lucide-react';

import { formatCurrency } from '@/utils/currency';
import { toast } from 'sonner';

interface Contract {
    id: number;
    contract_id: string;
    subject: string;
    description: string;
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
    notes: any[];
    comments: any[];
    attachments: any[];
    created_at: string;
}

const statusOptions = [
    { value: 'pending', label: 'Pending', color: '#ffc107' },
    { value: 'sent', label: 'Sent', color: '#007bff' },
    { value: 'accept', label: 'Accept', color: '#28a745' },
    { value: 'decline', label: 'Decline', color: '#dc3545' },
    { value: 'expired', label: 'Expired', color: '#fd7e14' },
];

export default function ContractShow() {
    const { t } = useTranslation();
    const { contract, auth, assignedUsers, emailTemplateEnabled } = usePage().props as any;
    const permissions = auth?.permissions || [];
    const [activeTab, setActiveTab] = useState('overview');
    const [newNote, setNewNote] = useState('');
    const [newComment, setNewComment] = useState('');
    const [isAddingNote, setIsAddingNote] = useState(false);
    const [isAddingComment, setIsAddingComment] = useState(false);
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    const [signaturePad, setSignaturePad] = useState<any>(null);
    const [scriptLoaded, setScriptLoaded] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
    const [searchNotes, setSearchNotes] = useState('');
    const [searchComments, setSearchComments] = useState('');
    const [searchAttachments, setSearchAttachments] = useState('');
    const [notesPerPage, setNotesPerPage] = useState(10);
    const [commentsPerPage, setCommentsPerPage] = useState(10);
    const [attachmentsPerPage, setAttachmentsPerPage] = useState(10);
    const [currentNotesPage, setCurrentNotesPage] = useState(1);
    const [currentCommentsPage, setCurrentCommentsPage] = useState(1);
    const [currentAttachmentsPage, setCurrentAttachmentsPage] = useState(1);
    const [signatureType, setSignatureType] = useState<'company' | 'client'>('company');
    const isClient = auth?.user?.id === contract.client?.id;
    const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
    const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
    const [editNoteText, setEditNoteText] = useState('');
    const [editCommentText, setEditCommentText] = useState('');


    useEffect(() => {
        // Load signature pad script if not already loaded
        if (!window.SignaturePad && !scriptLoaded) {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/signature_pad@4.0.0/dist/signature_pad.umd.min.js';
            script.onload = () => setScriptLoaded(true);
            document.head.appendChild(script);
        } else if (window.SignaturePad) {
            setScriptLoaded(true);
        }
    }, []);

    const getStatusBadge = (status: string) => {
        const statusOption = statusOptions.find(s => s.value === status);
        const label = statusOption?.label || status.charAt(0).toUpperCase() + status.slice(1);
        return (
            <Badge
                variant="secondary"
                style={{ backgroundColor: statusOption?.color + '20', color: statusOption?.color }}
            >
                {label}
            </Badge>
        );
    };

    const handleAddNote = () => {
        if (!newNote.trim()) return;
        router.post(route('contract-notes.store', contract.id), {
            note: newNote
        }, {
            onSuccess: () => {
                setNewNote('');
                setIsAddingNote(false);
                toast.success('Note added successfully');
            }
        });
    };

    const handleAddComment = () => {
        if (!newComment.trim()) return;
        router.post(route('contract-comments.store', contract.id), {
            comment: newComment
        }, {
            onSuccess: () => {
                setNewComment('');
                setIsAddingComment(false);
                toast.success('Comment added successfully');
            }
        });
    };

    const handleDeleteNote = (noteId: number) => {
        router.delete(route('contract-notes.destroy', [contract.id, noteId]), {
            onSuccess: () => toast.success('Note deleted successfully')
        });
    };

    const handleEditNote = (note: any) => {
        setEditingNoteId(note.id);
        setEditNoteText(note.note);
    };

    const handleUpdateNote = (noteId: number) => {
        if (!editNoteText.trim()) return;
        router.put(route('contract-notes.update', [contract.id, noteId]), {
            note: editNoteText
        }, {
            onSuccess: () => {
                setEditingNoteId(null);
                setEditNoteText('');
                toast.success('Note updated successfully');
            }
        });
    };

    const handleDeleteComment = (commentId: number) => {
        router.delete(route('contract-comments.destroy', commentId), {
            onSuccess: () => toast.success('Comment deleted successfully')
        });
    };

    const handleEditComment = (comment: any) => {
        setEditingCommentId(comment.id);
        setEditCommentText(comment.comment);
    };

    const handleUpdateComment = (commentId: number) => {
        if (!editCommentText.trim()) return;
        router.put(route('contract-comments.update', commentId), {
            comment: editCommentText
        }, {
            onSuccess: () => {
                setEditingCommentId(null);
                setEditCommentText('');
                toast.success('Comment updated successfully');
            }
        });
    };

    const getContractProgress = () => {
        const statusProgress = {
            'pending': 10,
            'sent': 30,
            'signed': 100,
            'declined': 0,
            'expired': 0,
            'cancelled': 0
        };
        return statusProgress[contract.status as keyof typeof statusProgress] || 0;
    };

    // Filter and paginate functions
    const getFilteredNotes = () => {
        const filtered = contract.notes?.filter(note =>
            note.note?.toLowerCase().includes(searchNotes.toLowerCase()) ||
            note.creator?.name?.toLowerCase().includes(searchNotes.toLowerCase())
        ) || [];
        const startIndex = (currentNotesPage - 1) * notesPerPage;
        return {
            items: filtered.slice(startIndex, startIndex + notesPerPage),
            total: filtered.length,
            totalPages: Math.ceil(filtered.length / notesPerPage)
        };
    };

    const getFilteredComments = () => {
        const filtered = contract.comments?.filter(comment =>
            comment.comment?.toLowerCase().includes(searchComments.toLowerCase()) ||
            comment.creator?.name?.toLowerCase().includes(searchComments.toLowerCase())
        ) || [];
        const startIndex = (currentCommentsPage - 1) * commentsPerPage;
        return {
            items: filtered.slice(startIndex, startIndex + commentsPerPage),
            total: filtered.length,
            totalPages: Math.ceil(filtered.length / commentsPerPage)
        };
    };

    const getFilteredAttachments = () => {
        const filtered = contract.attachments?.filter(attachment =>
            getAttachmentName(attachment)?.toLowerCase().includes(searchAttachments.toLowerCase())
        ) || [];
        const startIndex = (currentAttachmentsPage - 1) * attachmentsPerPage;
        return {
            items: filtered.slice(startIndex, startIndex + attachmentsPerPage),
            total: filtered.length,
            totalPages: Math.ceil(filtered.length / attachmentsPerPage)
        };
    };

    const getAttachmentName = (attachment: any) =>
        attachment.media_item?.name ||
        attachment.mediaItem?.name ||
        attachment.files ||
        'Unnamed file';

    const getAttachmentUrl = (attachment: any) =>
        attachment.media_item?.url ||
        attachment.mediaItem?.url ||
        attachment.url ||
        (attachment.files ? `/storage/media/${attachment.files}` : '');

    const isImageAttachment = (attachment: any) => {
        const mime = (attachment.media_item?.mime_type || attachment.mediaItem?.mime_type || '').toLowerCase();
        if (mime.startsWith('image/')) return true;
        return getAttachmentName(attachment).match(/\.(jpg|jpeg|png|gif|webp)$/i);
    };

    const handleSignature = () => {
        if (!scriptLoaded) {
            alert('Signature pad is loading, please try again in a moment.');
            return;
        }
        setIsSignatureModalOpen(true);
    };

    // Initialize signature pad when modal opens
    useEffect(() => {
        if (isSignatureModalOpen && scriptLoaded && window.SignaturePad) {
            setTimeout(() => {
                const canvas = document.getElementById('signature-canvas') as HTMLCanvasElement;
                if (canvas) {
                    const pad = new window.SignaturePad(canvas);
                    setSignaturePad(pad);
                }
            }, 100);
        }
    }, [isSignatureModalOpen, scriptLoaded]);

    const clearSignature = () => {
        if (signaturePad) {
            signaturePad.clear();
        }
    };

    const saveSignature = () => {
        if (signaturePad && !signaturePad.isEmpty()) {
            const signatureData = signaturePad.toDataURL('image/png');
            const payload: any = {
                signature_type: signatureType
            };
            if (signatureType === 'company') {
                payload.company_signature = signatureData;
            } else {
                payload.client_signature = signatureData;
            }
            router.post(route('contracts.signature.store', contract.id), payload, {
                onSuccess: () => {
                    setIsSignatureModalOpen(false);
                    setSignaturePad(null);
                    toast.success('Signature added successfully');
                },
                onError: (errors) => {
                    console.error('Signature save error:', errors);
                    toast.error('Failed to save signature');
                }
            });
        } else {
            alert('Please add your signature before saving.');
        }
    };

    const handleStatusChange = (newStatus: string) => {
        router.put(route('contracts.change-status', contract.id), {
            status: newStatus
        }, {
            onSuccess: () => {
                toast.success('Contract status updated successfully');
            },
            onError: () => {
                toast.error('Failed to update contract status');
            }
        });
    };


    const pageActions = [
        {
            label: t('Preview'),
            icon: <Eye className="h-4 w-4 mr-2" />,
            variant: 'outline',
            onClick: () => window.open(route('contracts.preview', contract.id), '_blank')
        },
        ...(!contract.company_signature && !isClient ? [{
            label: t('Company Signature'),
            icon: <PenTool className="h-4 w-4 mr-2" />,
            variant: 'outline',
            onClick: () => { setSignatureType('company'); handleSignature(); }
        }] : []),
        ...(contract.status === 'accept' && !contract.client_signature && isClient ? [{
            label: t('Client Signature'),
            icon: <PenTool className="h-4 w-4 mr-2" />,
            variant: 'outline',
            onClick: () => { setSignatureType('client'); handleSignature(); }
        }] : []),
        ...(emailTemplateEnabled && contract.status !== 'sent' && contract.status !== 'accept' && contract.status !== 'decline' && !isClient ? [{
            label: t('Send Email'),
            icon: <Send className="h-4 w-4 mr-2" />,
            variant: 'outline',
            onClick: () => router.post(route('contracts.send-contract-email', contract.id), {}, {
                onSuccess: () => toast.success('Contract email sent successfully')
            })
        }] : []),
        {
            label: t('Back'),
            icon: <ArrowLeft className="h-4 w-4 mr-2" />,
            variant: 'outline',
            onClick: () => router.get(route('contracts.index'))
        }
    ];

    // Add Accept/Decline dropdown for clients
    if (isClient && contract.status !== 'accept' && contract.status !== 'decline') {
        pageActions.push({
            label: (
                <Select value={contract.status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-[160px] h-9 bg-white border-gray-300">
                        <SelectValue placeholder="Pending" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="pending">
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-yellow-600" />
                                Pending
                            </div>
                        </SelectItem>
                        <SelectItem value="accept">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                Accept
                            </div>
                        </SelectItem>
                        <SelectItem value="decline">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                                Decline
                            </div>
                        </SelectItem>
                    </SelectContent>
                </Select>
            ),
            variant: 'ghost',
            onClick: () => {}
        } as any);
    }

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Contracts'), href: route('contracts.index') },
        { title: contract.subject }
    ];

    return (
        <PageTemplate
            title={contract.subject}
            url={`/contracts/${contract.id}`}
            actions={pageActions}
            breadcrumbs={breadcrumbs}
            noPadding
        >
            {/* Contract Header */}
            <div className="bg-white rounded-lg shadow mb-4">
                <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <div className="flex gap-2 mb-2">
                                {getStatusBadge(contract.status)}
                                <Badge
                                    variant="secondary"
                                    style={{ backgroundColor: '#007bff20', color: '#007bff' }}
                                >
                                    {contract.contract_type?.name}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    {/* Contract Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-blue-500" />
                                    <span className="text-sm font-medium">Contract ID</span>
                                </div>
                                <p className="text-lg font-bold">{contract.contract_id}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2">
                                    <DollarSign className="h-4 w-4 text-green-500" />
                                    <span className="text-sm font-medium">Contract Value</span>
                                </div>
                                <p className="text-lg font-bold">{formatCurrency(contract.contract_value || 0)}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-purple-500" />
                                    <span className="text-sm font-medium">Client</span>
                                </div>
                                <p className="text-lg font-semibold">{contract.client?.name}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-orange-500" />
                                    <span className="text-sm font-medium">Duration</span>
                                </div>
                                <p className="text-lg font-semibold">
                                    {Math.ceil((new Date(contract.end_date).getTime() - new Date(contract.start_date).getTime()) / (1000 * 60 * 60 * 24))} days
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Main Content Tabs */}
            <div className="bg-white rounded-lg shadow">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="relative">
                    <div className="border-b bg-gradient-to-r from-gray-50 to-blue-50 relative z-10">
                        <TabsList className="h-12 bg-white/80 backdrop-blur-sm border-0 rounded-none p-0 shadow-none relative z-20 flex-wrap w-full justify-center">
                            <TabsTrigger value="overview" className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:scale-105 hover:bg-primary/10 hover:text-primary text-gray-600">
                                <Eye className="h-4 w-4 mr-2" />
                                Overview
                            </TabsTrigger>
                            <TabsTrigger value="notes" className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:scale-105 hover:bg-primary/10 hover:text-primary text-gray-600">
                                <Pin className="h-4 w-4 mr-2" />
                                Notes ({contract.notes?.length || 0})
                            </TabsTrigger>
                            <TabsTrigger value="comments" className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:scale-105 hover:bg-primary/10 hover:text-primary text-gray-600">
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Comments ({contract.comments?.length || 0})
                            </TabsTrigger>
                            <TabsTrigger value="attachments" className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:scale-105 hover:bg-primary/10 hover:text-primary text-gray-600">
                                <Paperclip className="h-4 w-4 mr-2" />
                                Attachments ({contract.attachments?.length || 0})
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="p-4 relative overflow-visible z-0">
                        <TabsContent value="overview" className="space-y-6 mt-0">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <FileText className="h-5 w-5 text-blue-500" />
                                            Contract Details
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-sm font-medium text-gray-600">Subject</label>
                                                <p className="mt-1 font-semibold">{contract.subject}</p>
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-gray-600">Contract ID</label>
                                                <p className="mt-1 font-mono text-sm bg-gray-100 px-2 py-1 rounded">{contract.contract_id}</p>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-600">Description</label>
                                            <p className="mt-1 text-gray-700 leading-relaxed">{contract.description || 'No description provided'}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-sm font-medium text-gray-600">Type</label>
                                                <div className="mt-1">
                                                    <Badge
                                                        variant="secondary"
                                                        style={{ backgroundColor: '#007bff20', color: '#007bff' }}
                                                    >
                                                        {contract.contract_type?.name}
                                                    </Badge>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-gray-600">Status</label>
                                                <div className="mt-1">{getStatusBadge(contract.status)}</div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-sm font-medium text-gray-600">Contract Value</label>
                                                <p className="mt-1 text-2xl font-bold text-green-600">{formatCurrency(contract.contract_value || 0)}</p>
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-gray-600">Currency</label>
                                                <p className="mt-1 font-semibold">{contract.currency}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <User className="h-5 w-5 text-purple-500" />
                                            Client & Timeline
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div>
                                            <label className="text-sm font-medium text-gray-600">Client</label>
                                            <div className="mt-2 flex items-center gap-3">
                                                <Avatar>
                                                    <AvatarFallback>{contract.client?.name?.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-semibold">{contract.client?.name}</p>
                                                    <p className="text-sm text-gray-500">{contract.client?.email}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-sm font-medium text-gray-600">Start Date</label>
                                                <p className="mt-1 font-semibold">{new Date(contract.start_date).toLocaleDateString()}</p>
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-gray-600">End Date</label>
                                                <p className="mt-1 font-semibold">{new Date(contract.end_date).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-sm font-medium text-gray-600">Created</label>
                                                <p className="mt-1">{new Date(contract.created_at).toLocaleDateString()}</p>
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-gray-600">Created By</label>
                                                <p className="mt-1">{contract.creator?.name}</p>
                                            </div>
                                        </div>
                                        {contract.sent_at && (
                                            <div>
                                                <label className="text-sm font-medium text-gray-600">Sent At</label>
                                                <p className="mt-1">{new Date(contract.sent_at).toLocaleDateString()}</p>
                                            </div>
                                        )}
                                        {contract.signed_at && (
                                            <div>
                                                <label className="text-sm font-medium text-gray-600">Signed At</label>
                                                <p className="mt-1 text-green-600 font-semibold">{new Date(contract.signed_at).toLocaleDateString()}</p>
                                            </div>
                                        )}
                                        {(contract.company_signature || contract.client_signature) && (
                                            <div className="grid grid-cols-2 gap-4">
                                                {contract.company_signature && (
                                                    <div>
                                                        <label className="text-sm font-medium text-gray-600">Company Signature</label>
                                                        <div className="mt-2 p-2 border rounded">
                                                            <img src={contract.company_signature} alt="Company Signature" className="max-w-full h-auto max-h-20" />
                                                        </div>
                                                    </div>
                                                )}
                                                {contract.client_signature && (
                                                    <div>
                                                        <label className="text-sm font-medium text-gray-600">Client Signature</label>
                                                        <div className="mt-2 p-2 border rounded">
                                                            <img src={contract.client_signature} alt="Client Signature" className="max-w-full h-auto max-h-20" />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            {contract.terms_conditions && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <FileText className="h-5 w-5 text-orange-500" />
                                            Terms & Conditions
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="prose max-w-none">
                                            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{contract.terms_conditions}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {assignedUsers && assignedUsers.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <User className="h-5 w-5 text-blue-500" />
                                            Assigned Users
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex flex-wrap gap-3">
                                            {assignedUsers.map((user: any) => (
                                                <div key={user.id} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={user.avatar} />
                                                        <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="text-sm font-medium">{user.name}</p>
                                                        <p className="text-xs text-gray-500">{user.email}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>

                        <TabsContent value="attachments" className="space-y-6 mt-0 relative">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="relative w-64">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search attachments..."
                                            value={searchAttachments}
                                            onChange={(e) => { setSearchAttachments(e.target.value); setCurrentAttachmentsPage(1); }}
                                            className="w-full pl-9"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {getFilteredAttachments().total > 0 && (
                                        <>
                                            <Label className="text-xs text-muted-foreground">Per Page:</Label>
                                            <Select
                                                value={attachmentsPerPage?.toString() || "10"}
                                                onValueChange={(value) => {
                                                    setAttachmentsPerPage(parseInt(value));
                                                    setCurrentAttachmentsPage(1);
                                                }}
                                            >
                                                <SelectTrigger className="w-16 h-8">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="10">10</SelectItem>
                                                    <SelectItem value="25">25</SelectItem>
                                                    <SelectItem value="50">50</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </>
                                    )}
                                    {auth?.permissions?.includes('contract_attachment_create') && (
                                    <Button size="sm" onClick={() => setIsUploadModalOpen(true)}>
                                        <Upload className="h-4 w-4 mr-2" />
                                        Upload Files
                                    </Button>
                                    )}
                                </div>
                            </div>
                            {getFilteredAttachments().items.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                                    {getFilteredAttachments().items.map((attachment: any) => (
                                        <Card key={attachment.id} className="group hover:shadow-lg transition-all duration-200 border-0 shadow-md hover:scale-[1.02] bg-gradient-to-br from-white to-gray-50">
                                            <CardContent className="p-0">
                                                <div className="relative overflow-hidden rounded-t-lg">
                                                    {isImageAttachment(attachment) ? (
                                                        <div className="relative">
                                                            <img
                                                                src={getAttachmentUrl(attachment)}
                                                                alt={getAttachmentName(attachment)}
                                                                className="w-full h-24 object-cover transition-transform duration-200 group-hover:scale-105"
                                                                onError={(e) => {
                                                                    e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik04NyA2NUw5MyA3MUwxMDcgNTdMMTIzIDczVjEwNUg3N1Y2NUg4N1oiIGZpbGw9IiM5Q0EzQUYiLz4KPGNpcmNsZSBjeD0iOTEiIGN5PSI1NyIgcj0iNCIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K';
                                                                }}
                                                            />
                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                                                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                                {auth?.permissions?.includes('contract_attachment_download') && (
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button variant="secondary" size="icon" className="h-8 w-8 bg-blue-500/90 hover:bg-blue-600 shadow-md" onClick={() => {
                                                                            window.location.href = route('contract-attachments.download', attachment.id);
                                                                        }}>
                                                                            <Download className="h-4 w-4 text-white" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>Download</TooltipContent>
                                                                </Tooltip>
                                                                )}
                                                                {auth?.permissions?.includes('contract_attachment_delete') && (
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button variant="secondary" size="icon" className="h-8 w-8 bg-red-500/90 hover:bg-red-600 shadow-md" onClick={() => router.delete(route('contract-attachments.destroy', attachment.id), {
                                                                            onSuccess: () => toast.success('Attachment deleted successfully')
                                                                        })}>
                                                                            <Trash2 className="h-4 w-4 text-white" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>Delete</TooltipContent>
                                                                </Tooltip>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="w-full h-24 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                                            <Paperclip className="h-6 w-6 text-gray-400" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="p-2">
                                                    <h4 className="font-medium text-xs text-gray-900 truncate mb-1" title={getAttachmentName(attachment)}>
                                                        {getAttachmentName(attachment)}
                                                    </h4>
                                                    <div className="text-xs text-gray-500">
                                                        {new Date(attachment.created_at).toLocaleString()}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-16">
                                    <Paperclip className="h-10 w-10 text-primary mx-auto mb-4" />
                                    <p className="text-gray-500 mb-4">No attachments yet</p>
                                    {auth?.permissions?.includes('contract_attachment_create') && (
                                        <Button size="sm" onClick={() => setIsUploadModalOpen(true)}>
                                            <Upload className="h-4 w-4 mr-2" />
                                            Add first attachment
                                        </Button>
                                    )}
                                </div>
                            )}
                            {getFilteredAttachments().totalPages > 1 && (
                                <div className="flex justify-center gap-2 mt-6">
                                    <Button variant="outline" size="sm" onClick={() => setCurrentAttachmentsPage(p => Math.max(1, p - 1))} disabled={currentAttachmentsPage === 1}>
                                        Previous
                                    </Button>
                                    <span className="text-sm text-gray-600 flex items-center">Page {currentAttachmentsPage} of {getFilteredAttachments().totalPages}</span>
                                    <Button variant="outline" size="sm" onClick={() => setCurrentAttachmentsPage(p => Math.min(getFilteredAttachments().totalPages, p + 1))} disabled={currentAttachmentsPage === getFilteredAttachments().totalPages}>
                                        Next
                                    </Button>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="comments" className="space-y-6 mt-0 relative">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="relative w-64">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search comments..."
                                            value={searchComments}
                                            onChange={(e) => { setSearchComments(e.target.value); setCurrentCommentsPage(1); }}
                                            className="w-full pl-9"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {getFilteredComments().total > 0 && (
                                        <>
                                            <Label className="text-xs text-muted-foreground">Per Page:</Label>
                                            <Select
                                                value={commentsPerPage?.toString() || "10"}
                                                onValueChange={(value) => {
                                                    setCommentsPerPage(parseInt(value));
                                                    setCurrentCommentsPage(1);
                                                }}
                                            >
                                                <SelectTrigger className="w-16 h-8">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="10">10</SelectItem>
                                                    <SelectItem value="25">25</SelectItem>
                                                    <SelectItem value="50">50</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </>
                                    )}
                                    <Button size="sm" onClick={() => setIsAddingComment(!isAddingComment)}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Comment
                                    </Button>
                                </div>
                            </div>
                            {isAddingComment && (
                                <Card>
                                    <CardContent className="p-4">
                                        <div className="space-y-3">
                                            <Textarea placeholder="Write your comment here..." value={newComment} onChange={(e) => setNewComment(e.target.value)} rows={3} className="resize-none" />
                                            <div className="flex justify-end gap-2">
                                                <Button variant="outline" onClick={() => { setNewComment(''); setIsAddingComment(false); }}>
                                                    Cancel
                                                </Button>
                                                <Button onClick={handleAddComment}>
                                                    <Send className="h-4 w-4 mr-2" />
                                                    Submit
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                            {getFilteredComments().items.length > 0 ? (
                                <>
                                    <div className="space-y-4">
                                        {getFilteredComments().items.map((comment: any) => (
                                            <Card key={comment.id}>
                                                <CardContent className="p-4">
                                                    {editingCommentId === comment.id ? (
                                                        <div className="space-y-3">
                                                            <Textarea value={editCommentText} onChange={(e) => setEditCommentText(e.target.value)} rows={3} className="resize-none" />
                                                            <div className="flex justify-end gap-2">
                                                                <Button variant="outline" size="sm" onClick={() => { setEditingCommentId(null); setEditCommentText(''); }}>
                                                                    Cancel
                                                                </Button>
                                                                <Button size="sm" onClick={() => handleUpdateComment(comment.id)}>
                                                                    Save
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex justify-between items-start">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <h4 className="font-medium">{comment.creator?.name}</h4>
                                                                </div>
                                                                <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{comment.comment}</p>
                                                                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                                                                    <span>{new Date(comment.created_at).toLocaleDateString()}</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-1">
                                                                <Button variant="ghost" size="icon" className="text-yellow-500 hover:text-yellow-700" onClick={() => handleEditComment(comment)}>
                                                                    <Edit className="h-4 w-4" />
                                                                </Button>
                                                                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => handleDeleteComment(comment.id)}>
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                    {getFilteredComments().totalPages > 1 && (
                                        <div className="flex justify-center gap-2 mt-6">
                                            <Button variant="outline" size="sm" onClick={() => setCurrentCommentsPage(p => Math.max(1, p - 1))} disabled={currentCommentsPage === 1}>
                                                Previous
                                            </Button>
                                            <span className="text-sm text-gray-600 flex items-center">Page {currentCommentsPage} of {getFilteredComments().totalPages}</span>
                                            <Button variant="outline" size="sm" onClick={() => setCurrentCommentsPage(p => Math.min(getFilteredComments().totalPages, p + 1))} disabled={currentCommentsPage === getFilteredComments().totalPages}>
                                                Next
                                            </Button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-16">
                                    <MessageSquare className="h-12 w-12 text-primary mx-auto mb-4" />
                                    <p className="text-gray-700 font-medium mb-2">No comments yet</p>
                                    <p className="text-gray-500 text-sm mb-6">Share your thoughts and feedback on this contract.</p>
                                    <Button size="sm" onClick={() => setIsAddingComment(true)}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add first comment
                                    </Button>
                                </div>
                            )}

                        </TabsContent>

                        <TabsContent value="notes" className="space-y-6 mt-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="relative w-64">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search notes..."
                                            value={searchNotes}
                                            onChange={(e) => { setSearchNotes(e.target.value); setCurrentNotesPage(1); }}
                                            className="w-full pl-9"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {getFilteredNotes().total > 0 && (
                                        <>
                                            <Label className="text-xs text-muted-foreground">Per Page:</Label>
                                            <Select
                                                value={notesPerPage?.toString() || "10"}
                                                onValueChange={(value) => {
                                                    setNotesPerPage(parseInt(value));
                                                    setCurrentNotesPage(1);
                                                }}
                                            >
                                                <SelectTrigger className="w-16 h-8">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="10">10</SelectItem>
                                                    <SelectItem value="25">25</SelectItem>
                                                    <SelectItem value="50">50</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </>
                                    )}
                                    {auth?.permissions?.includes('contract_note_create') && (
                                        <Button size="sm" onClick={() => setIsAddingNote(!isAddingNote)}>
                                            <Plus className="h-4 w-4 mr-2" />
                                            Add Note
                                        </Button>
                                    )}
                                </div>
                            </div>
                            {isAddingNote && (
                                <Card>
                                    <CardContent className="p-4">
                                        <div className="space-y-3">
                                            <Textarea placeholder="Write your note here..." value={newNote} onChange={(e) => setNewNote(e.target.value)} rows={3} className="resize-none" />
                                            <div className="flex justify-end gap-2">
                                                <Button variant="outline" onClick={() => { setNewNote(''); setIsAddingNote(false); }}>
                                                    Cancel
                                                </Button>
                                                <Button onClick={handleAddNote}>
                                                    <Send className="h-4 w-4 mr-2" />
                                                    Submit
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                            {getFilteredNotes().items.length > 0 ? (
                                <>
                                    <div className="space-y-4">
                                        {getFilteredNotes().items.map((note: any) => (
                                            <Card key={note.id}>
                                                <CardContent className="p-4">
                                                    {editingNoteId === note.id ? (
                                                        <div className="space-y-3">
                                                            <Textarea value={editNoteText} onChange={(e) => setEditNoteText(e.target.value)} rows={3} className="resize-none" />
                                                            <div className="flex justify-end gap-2">
                                                                <Button variant="outline" size="sm" onClick={() => { setEditingNoteId(null); setEditNoteText(''); }}>
                                                                    Cancel
                                                                </Button>
                                                                <Button size="sm" onClick={() => handleUpdateNote(note.id)}>
                                                                    Save
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex justify-between items-start">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <h4 className="font-medium">{note.creator?.name}</h4>
                                                                    {note.is_pinned && (
                                                                        <Pin className="h-4 w-4 text-yellow-500" />
                                                                    )}
                                                                </div>
                                                                <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{note.note}</p>
                                                                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                                                                    <span>{new Date(note.created_at).toLocaleDateString()}</span>
                                                                </div>
                                                            </div>
                                                            {(auth?.permissions?.includes('contract_note_update') || auth?.permissions?.includes('contract_note_delete')) && (
                                                            <div className="flex gap-1">
                                                                {auth?.permissions?.includes('contract_note_update') && (
                                                                    <Button variant="ghost" size="icon" className="text-yellow-500 hover:text-yellow-700" onClick={() => handleEditNote(note)}>
                                                                        <Edit className="h-4 w-4" />
                                                                    </Button>
                                                                )}
                                                                {auth?.permissions?.includes('contract_note_delete') && (
                                                                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => handleDeleteNote(note.id)}>
                                                                        <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                                )}
                                                            </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                    {getFilteredNotes().totalPages > 1 && (
                                        <div className="flex justify-center gap-2 mt-6">
                                            <Button variant="outline" size="sm" onClick={() => setCurrentNotesPage(p => Math.max(1, p - 1))} disabled={currentNotesPage === 1}>
                                                Previous
                                            </Button>
                                            <span className="text-sm text-gray-600 flex items-center">Page {currentNotesPage} of {getFilteredNotes().totalPages}</span>
                                            <Button variant="outline" size="sm" onClick={() => setCurrentNotesPage(p => Math.min(getFilteredNotes().totalPages, p + 1))} disabled={currentNotesPage === getFilteredNotes().totalPages}>
                                                Next
                                            </Button>
                                        </div>
                                    )}
                                </>
                            ) : (

                                <div className="text-center py-16">
                                    <Pin className="h-12 w-12 text-primary mx-auto mb-4" />
                                    <p className="text-gray-700 font-medium mb-2">No notes yet</p>
                                    {auth?.permissions?.includes('contract_note_create') && (
                                        <>
                                        <p className="text-gray-500 text-sm mb-6">Add notes to keep track of important information about this contract.</p>
                                        <Button size="sm" onClick={() => setIsAddingNote(true)}>
                                            <Plus className="h-4 w-4 mr-2" />
                                            Add first note
                                        </Button>
                                        </>
                                    )}
                                </div>
                            )}

                        </TabsContent>
                    </div>
                </Tabs>
            </div>

            <Dialog open={isSignatureModalOpen} onOpenChange={setIsSignatureModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add Signature</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Sign</label>
                            <div className="border border-gray-300 rounded">
                                <canvas id="signature-canvas" width="400" height="200" className="w-full" style={{ touchAction: 'none' }} />
                            </div>
                            <Button variant="outline" size="sm" className="mt-2 text-red-600 border-red-300 hover:bg-red-50" onClick={clearSignature}>
                                Clear
                            </Button>
                        </div>
                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={() => { setIsSignatureModalOpen(false); setSignaturePad(null); }}>
                                Cancel
                            </Button>
                            <Button onClick={saveSignature} className="bg-green-600 hover:bg-green-700">
                                Save
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Upload className="h-5 w-5" />
                            {t('Upload Files')}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6">
                        <div
                            className="relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                        >
                            <div>
                                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                    <Upload className="h-8 w-8 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-medium mb-2">
                                    {t('Upload your files')}
                                </h3>
                                <p className="text-sm text-muted-foreground mb-6">
                                    {t('Drag and drop your files here, or click to browse')}
                                </p>

                                <Input
                                    type="file"
                                    multiple
                                    onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                                    className="hidden"
                                    id="file-upload-contract"
                                />

                                <Button
                                    type="button"
                                    onClick={() => document.getElementById('file-upload-contract')?.click()}
                                    disabled={isUploadingAttachment}
                                    size="lg"
                                >
                                    {isUploadingAttachment ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            {t('Uploading...')}
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="h-4 w-4 mr-2" />
                                            {t('Choose Files')}
                                        </>
                                    )}
                                </Button>

                                {selectedFiles.length > 0 && (
                                    <div className="mt-4 text-sm text-gray-600">
                                        {selectedFiles.length} file(s) selected
                                    </div>
                                )}
                            </div>
                        </div>

                        {selectedFiles.length > 0 && (
                            <div className="flex gap-2 justify-end">
                                <Button variant="outline" onClick={() => { setIsUploadModalOpen(false); setSelectedFiles([]); }} disabled={isUploadingAttachment}>
                                    {t('Cancel')}
                                </Button>
                                <Button onClick={() => {
                                    setIsUploadingAttachment(true);
                                    const formData = new FormData();
                                    selectedFiles.forEach(file => formData.append('files[]', file));
                                    router.post(route('contract-attachments.store', contract.id), formData, {
                                        onSuccess: () => {
                                            setIsUploadModalOpen(false);
                                            setSelectedFiles([]);
                                            setIsUploadingAttachment(false);
                                            toast.success('Attachments uploaded successfully');
                                        },
                                        onError: (errors) => {
                                            setIsUploadingAttachment(false);
                                            toast.error(`Failed: ${Object.values(errors).join(', ')}`);
                                        }
                                    });
                                }} disabled={isUploadingAttachment}>
                                    {isUploadingAttachment ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            {t('Uploading...')}
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="h-4 w-4 mr-2" />
                                            {t('Upload Files')}
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>


        </PageTemplate>
    );
}
