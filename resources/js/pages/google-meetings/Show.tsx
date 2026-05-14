import { useState, useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, ArrowLeft, Edit, Trash2, Calendar, Clock, MapPin, Shield, Users, Eye, EyeOff } from 'lucide-react';
import { PageTemplate } from '@/components/page-template';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { formatDateTime } from '@/lib/utils';
// import GoogleMeetingModal from './GoogleMeetingModal';

export default function GoogleMeetingShow() {
    const { t } = useTranslation();
    const { meeting, projects, members, permissions, flash, googleCalendarEnabled } = usePage().props as any;

    const formatText = (text: string) => {
        return text.replace(/_/g, ' ').split(' ').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
    };

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
    }, [flash]);

    const copyToClipboard = (text: string, type: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${type} copied to clipboard`);
    };

    const handleDeleteConfirm = () => {
        router.delete(route('google-meetings.destroy', meeting.id), {
            onSuccess: () => {
                router.visit(route('google-meetings.index'));
            }
        });
    };

    const getStatusColor = (status: string) => {
        const colors = {
            scheduled: 'bg-blue-100 text-blue-800',
            started: 'bg-green-100 text-green-800',
            ended: 'bg-gray-100 text-gray-800',
            cancelled: 'bg-red-100 text-red-800',
        };
        return colors[status as keyof typeof colors] || colors.scheduled;
    };

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Google Meetings'), href: route('google-meetings.index') },
        { title: meeting.title }
    ];

    const pageActions = [];

    // Add Edit button if user has update permission
    if (permissions?.google_meeting_update) {
        pageActions.push({
            label: t('Edit'),
            icon: <Edit className="h-4 w-4 mr-2" />,
            variant: 'outline',
            onClick: () => setIsEditModalOpen(true)
        });
    }

    // Add Delete button if user has delete permission
    if (permissions?.google_meeting_delete) {
        pageActions.push({
            label: t('Delete'),
            icon: <Trash2 className="h-4 w-4 mr-2" />,
            variant: 'destructive',
            onClick: () => setIsDeleteModalOpen(true)
        });
    }

    pageActions.push({
        label: t('Back'),
        icon: <ArrowLeft className="h-4 w-4 mr-2" />,
        variant: 'outline',
        onClick: () => router.get(route('google-meetings.index'))
    });


    return (
        <PageTemplate
            title={meeting.title}
            url={`/google-meetings/${meeting.id}`}
            breadcrumbs={breadcrumbs}
            actions={pageActions}
        >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Meeting Details */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>{t('Meeting Details')}</CardTitle>
                                <Badge className={getStatusColor(meeting.status)}>
                                    {formatText(meeting.status)}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {meeting.description && (
                                <div>
                                    <Label className="text-sm font-medium">{t('Description')}</Label>
                                    <p className="text-gray-600 mt-1">{meeting.description}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-center space-x-2">
                                    <Calendar className="h-4 w-4 text-gray-400" />
                                    <div>
                                        <Label className="text-sm text-gray-500">{t('Start Time')}</Label>
                                        <p className="font-medium">{meeting.start_time ? meeting.start_time.substring(0, 16).replace('T', ' ') : ''}</p>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <Calendar className="h-4 w-4 text-gray-400" />
                                    <div>
                                        <Label className="text-sm text-gray-500">{t('End Time')}</Label>
                                        <p className="font-medium">{meeting.end_time ? meeting.end_time.substring(0, 16).replace('T', ' ') : ''}</p>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <Clock className="h-4 w-4 text-gray-400" />
                                    <div>
                                        <Label className="text-sm text-gray-500">{t('Duration')}</Label>
                                        <p className="font-medium">{meeting.duration} {t('minutes')}</p>
                                    </div>
                                </div>

                            </div>

                            {meeting.project && (
                                <div>
                                    <Label className="text-sm font-medium">{t('Project')}</Label>
                                    <p className="text-blue-600 mt-1">{meeting.project.title}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Meeting URLs */}
                    {(meeting.join_url || meeting.start_url) && (
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('Meeting URLs')}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {meeting.join_url && (
                                    <div>
                                        <Label className="text-sm font-medium">{t('Join URL')}</Label>
                                        <div className="flex items-center space-x-2 mt-1">
                                            <Input
                                                value={meeting.join_url}
                                                readOnly
                                                className="flex-1"
                                            />
                                            <Button
                                                size="icon"
                                                variant="outline"
                                                onClick={() => copyToClipboard(meeting.join_url, 'Join URL')}
                                                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                                title={t('Copy Join URL')}
                                            >
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {meeting.start_url && (
                                    <div>
                                        <Label className="text-sm font-medium">{t('Start URL')}</Label>
                                        <div className="flex items-center space-x-2 mt-1">
                                            <Input
                                                value={meeting.start_url}
                                                readOnly
                                                className="flex-1"
                                            />
                                            <Button
                                                size="icon"
                                                variant="outline"
                                                onClick={() => copyToClipboard(meeting.start_url, 'Start URL')}
                                                className="text-green-600 border-green-200 hover:bg-green-50"
                                                title={t('Copy Start URL')}
                                            >
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Host Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('Host')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                    <span className="text-sm font-medium">
                                        {meeting.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                                    </span>
                                </div>
                                <div>
                                    <p className="font-medium">{meeting.user?.name || t('Unknown')}</p>
                                    <p className="text-sm text-gray-500">{meeting.user?.email || ''}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Members */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <Users className="h-4 w-4 mr-2" />
                                {t('Members')} ({meeting.members?.length || 0})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {meeting.members && meeting.members.length > 0 ? (
                                meeting.members.map((member: any) => (
                                    <div key={member.id} className="flex items-center space-x-2">
                                        <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                                            <span className="text-xs">
                                                {member.name?.charAt(0)?.toUpperCase() || 'U'}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">{member.name}</p>
                                            <p className="text-xs text-gray-500">{member.email}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-gray-500">{t('No members assigned')}</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Edit Modal */}
            {/* <GoogleMeetingModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                meeting={meeting}
                projects={projects || []}
                members={members || []}
                googleCalendarEnabled={googleCalendarEnabled}
            /> */}

            {/* Delete Modal */}
            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                itemName={meeting?.title || ''}
                entityName={t('meeting')}
                warningMessage={t('This meeting will be permanently deleted.')}
            />
        </PageTemplate>
    );
}
