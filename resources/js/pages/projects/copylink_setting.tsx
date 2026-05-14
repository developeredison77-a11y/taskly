import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Users, Calendar, DollarSign, Clock, Pin, Paperclip, Bug, ChevronRight, CheckSquare, Timer, Receipt, BarChart3, AlertTriangle, CheckCircle } from 'lucide-react';
import { formatCurrency } from '@/utils/currency';
import { useState } from 'react';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useTranslation } from 'react-i18next';
import { isTimesheetOverdue, getDaysOverdue } from '@/utils/timesheetUtils';
import { BrandProvider } from '@/contexts/BrandContext';
import { useBrandTheme } from '@/hooks/use-brand-theme';

interface projectlinkProps {
    project: any;
    encryptedId: string;
    globalSettings?: any;
}

function ProjectLinkContent({ project, encryptedId }: { project: any; encryptedId: string }) {
    useBrandTheme();

    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState('overview');

    // Use only dynamic project data
    const currentProject = project;
    const sharedSettings = currentProject?.shared_settings || {};

    const formatText = (text: string) => {
        if (!text) return '';
        return text.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
    };

    // Filter tabs based on shared settings permissions and data availability
    const allTabs = [
        { id: 'overview', label: t('Overview'), icon: Pin, permission: 'overview' },
        { id: 'member', label: t('Team Members'), icon: Users, permission: 'member' },
        { id: 'milestone', label: t('Milestones'), icon: Calendar, permission: 'milestone' },
        { id: 'notes', label: t('Notes'), icon: Pin, permission: 'notes' },
        { id: 'budget', label: t('Budget'), icon: DollarSign, permission: 'budget' },
        { id: 'expenses', label: t('Expenses'), icon: Receipt, permission: 'expenses' },
        { id: 'task', label: t('Tasks'), icon: CheckSquare, permission: 'task' },
        { id: 'recent_bugs', label: t('Recent Bugs'), icon: Bug, permission: 'recent_bugs' },
        { id: 'timesheet', label: t('Timesheets'), icon: Timer, permission: 'timesheet' },
        { id: 'files', label: t('Files'), icon: Paperclip, permission: 'files' },
        { id: 'activity', label: t('Activity'), icon: Clock, permission: 'activity' }
    ];

    // Filter tabs based on shared settings permissions and data availability
    const tabs = allTabs.filter(tab => {
        // Check if permission is disabled in shared settings
        if (sharedSettings[tab.permission] === false) return false;

        // Check if data exists for the section
        switch (tab.id) {
            case 'member':
                return (currentProject?.members && currentProject.members.length > 0) || (currentProject?.clients && currentProject.clients.length > 0);
            case 'milestone':
                return currentProject?.milestones && currentProject.milestones.length > 0;
            case 'notes':
                return currentProject?.notes && (currentProject.notes.data?.length > 0 || currentProject.notes.length > 0);
            case 'budget':
                return currentProject?.budget;
            case 'expenses':
                return currentProject?.expenses && currentProject.expenses.length > 0;
            case 'task':
                return currentProject?.tasks && currentProject.tasks.length > 0;
            case 'recent_bugs':
                return currentProject?.bugs && currentProject.bugs.length > 0;
            case 'timesheet':
                return currentProject?.timesheets && currentProject.timesheets.length > 0;
            case 'files':
                return currentProject?.attachments && (currentProject.attachments.data?.length > 0 || currentProject.attachments.length > 0);
            case 'activity':
                return currentProject?.activities && (currentProject.activities.data?.length > 0 || currentProject.activities.length > 0);
            default:
                return true;
        }
    });

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
            pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
            in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
            completed: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
            cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
            on_hold: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300'
        };
        return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    };

    const getPriorityColor = (priority: string) => {
        const colors = {
            low: 'bg-green-100 text-green-800',
            medium: 'bg-yellow-100 text-yellow-800',
            high: 'bg-orange-100 text-orange-800',
            urgent: 'bg-red-100 text-red-800',
            critical: 'bg-red-100 text-red-800'
        };
        return colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800';
    };

    const scrollToSection = (sectionId: string) => {
        setActiveTab(sectionId);
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Language Switcher - Top Right */}
            <div className="absolute top-7 right-4 z-50 mr-75">
                <LanguageSwitcher />
            </div>
            <div className="max-w-7xl mx-auto px-6 py-8 flex gap-6">
                {/* Left Sidebar */}
                <div className="w-80 sticky top-8 h-fit">
                    <div className="bg-white rounded-xl shadow-sm">
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('Project Details')}</h1>
                        <div className="p-2">
                            {tabs.map(tab => {
                                const Icon = tab.icon;
                                return (
                                    <Button
                                        key={tab.id}
                                        variant={activeTab === tab.id ? 'default' : 'ghost'}
                                        onClick={() => scrollToSection(tab.id)}
                                        className="w-full justify-between mb-1"
                                    >
                                        <span className="flex items-center gap-2">
                                            <Icon className="h-4 w-4" />
                                            {tab.label}
                                            {tab.count !== undefined && (
                                                <Badge variant="secondary" className="ml-1 text-xs">
                                                    {tab.count}
                                                </Badge>
                                            )}
                                        </span>
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 space-y-8">
                    {/* Overview Section */}
                    {sharedSettings.overview !== false && (
                    <section id="overview">
                        <div className="mb-6">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('Project Overview')}</h1>
                            <p className="text-lg text-gray-600 dark:text-gray-400">{t('Complete project details and statistics')}</p>
                        </div>
                        <Card className="rounded-xl shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
                            <CardContent className="p-6 space-y-6">
                                <Card className="group hover:shadow-lg transition-all duration-200 border-0 shadow-md bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-blue-950">
                                    <CardContent className="p-6">
                                        <div className="flex items-start gap-4">
                                            <div className="p-3 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 rounded-xl group-hover:from-blue-200 group-hover:to-indigo-200 dark:group-hover:from-blue-800 dark:group-hover:to-indigo-800 transition-all duration-200">
                                                <Pin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div className="flex-1">
                                                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{currentProject?.title || t('Project Title')}</h2>
                                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">{currentProject?.description || t('No description available')}</p>
                                                <div className="flex gap-2 mt-4">
                                                    <Badge className={getStatusColor(currentProject?.status || 'unknown')}>
                                                        {formatText(currentProject?.status || 'unknown')}
                                                    </Badge>
                                                    <Badge className={getPriorityColor(currentProject?.priority || 'low')}>
                                                        {formatText(currentProject?.priority || 'low')}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {[
                                        { label: t('Team Members'), value: (currentProject?.members?.length || 0) + (currentProject?.clients?.length || 0), icon: Users, gradient: 'from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950', iconGradient: 'from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900', iconColor: 'text-purple-600 dark:text-purple-400' },
                                        { label: t('Deadline'), value: currentProject?.deadline ? new Date(currentProject.deadline).toLocaleDateString() : t('Not set'), icon: Calendar, gradient: 'from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950', iconGradient: 'from-orange-100 to-red-100 dark:from-orange-900 dark:to-red-900', iconColor: 'text-orange-600 dark:text-orange-400' },
                                        { label: t('Budget'), value: formatCurrency(currentProject?.budget?.total_budget || 0), icon: DollarSign, gradient: 'from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950', iconGradient: 'from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900', iconColor: 'text-green-600 dark:text-green-400' },
                                        { label: t('Est. Hours'), value: `${currentProject?.estimated_hours || 0}h`, icon: Clock, gradient: 'from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950', iconGradient: 'from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900', iconColor: 'text-blue-600 dark:text-blue-400' }
                                    ].map((item, i) => (
                                        <Card key={i} className={`group hover:shadow-lg transition-all duration-200 border-0 shadow-md hover:scale-[1.02] bg-gradient-to-br ${item.gradient}`}>
                                            <CardContent className="p-4">
                                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                                                    <div className={`p-1 bg-gradient-to-br ${item.iconGradient} rounded-lg transition-all duration-200`}>
                                                        <item.icon className={`h-4 w-4 ${item.iconColor}`} />
                                                    </div>
                                                    <span className="font-medium">{item.label}</span>
                                                </div>
                                                <p className="text-base font-semibold text-gray-900 dark:text-gray-100">{item.value}</p>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                                {/* Project Progress - Always show */}
                                {currentProject?.progress !== undefined && (
                                    <Card className="group hover:shadow-lg transition-all duration-200 border-0 shadow-md bg-gradient-to-br from-white to-indigo-50 dark:from-gray-800 dark:to-indigo-950">
                                        <CardContent className="p-6">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="p-2 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 rounded-lg group-hover:from-indigo-200 group-hover:to-purple-200 dark:group-hover:from-indigo-800 dark:group-hover:to-purple-800 transition-all duration-200">
                                                    <BarChart3 className="h-5 w-5 text-primary" />
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{t('Project Progress')}</h3>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('Overall project completion status')}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-lg font-bold text-primary">{currentProject.progress}%</p>
                                                </div>
                                            </div>
                                            <div className="mt-2">
                                                <Progress value={currentProject.progress} className="h-2" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </CardContent>
                        </Card>
                    </section>
                    )}

                    {/* Team Members Section (includes both members and clients) */}
                    {sharedSettings.member !== false && ((currentProject?.members && currentProject.members.length > 0) || (currentProject?.clients && currentProject.clients.length > 0)) && (
                        <section id="member">
                            <div className="mb-6">
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('Team Members')}</h1>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{t('Project team members and clients')}</p>
                            </div>
                            <Card className="rounded-xl shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
                                <CardContent className="p-6">
                                    <div className={`grid md:grid-cols-2 gap-4 ${((currentProject?.members?.length || 0) + (currentProject?.clients?.length || 0)) >= 6 ? 'max-h-80 overflow-y-auto pr-0.5' : ''}`}>
                                        {/* Project Members */}
                                        {currentProject?.members?.map((member: any) => (
                                            <Card key={`member-${member.id}`} className="group hover:shadow-lg transition-all duration-200 border-0 shadow-md hover:scale-[1.01] bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-blue-950">
                                                <CardContent className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative">
                                                            <Avatar className="h-12 w-12 ring-2 ring-white dark:ring-gray-700 shadow-md group-hover:ring-blue-200 dark:group-hover:ring-blue-800 transition-all duration-200">
                                                                {member.user.avatar && <AvatarImage src={member.user.avatar} />}
                                                                <AvatarFallback className="bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 text-blue-700 dark:text-blue-300 font-semibold">
                                                                    {member.user.name.split(' ').map((n: string) => n[0]).join('')}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                        </div>
                                                        <div className="flex-1">
                                                            <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">{member.user.name}</h4>
                                                            <p className="text-sm text-gray-600 dark:text-gray-400">{member.user.email}</p>
                                                        </div>
                                                        <Badge variant="secondary" className="bg-primary/10 text-primary">
                                                            {formatText(member.role)}
                                                        </Badge>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                        {/* Project Clients */}
                                        {currentProject?.clients?.map((client: any) => (
                                            <Card key={`client-${client.id}`} className="group hover:shadow-lg transition-all duration-200 border-0 shadow-md hover:scale-[1.01] bg-gradient-to-br from-white to-green-50 dark:from-gray-800 dark:to-green-950">
                                                <CardContent className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative">
                                                            <Avatar className="h-12 w-12 ring-2 ring-white dark:ring-gray-700 shadow-md group-hover:ring-green-200 dark:group-hover:ring-green-800 transition-all duration-200">
                                                                {client.avatar && <AvatarImage src={client.avatar} />}
                                                                <AvatarFallback className="bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900 text-green-700 dark:text-green-300 font-semibold">
                                                                    {client.name.split(' ').map((n: string) => n[0]).join('')}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                        </div>
                                                        <div className="flex-1">
                                                            <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">{client.name}</h4>
                                                            <p className="text-sm text-gray-600 dark:text-gray-400">{client.email}</p>
                                                        </div>
                                                        <Badge variant="secondary" className="bg-primary/10 text-primary">
                                                            {t('Client')}
                                                        </Badge>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </section>
                    )}

                    {/* Milestones Section */}
                    {sharedSettings.milestone !== false && currentProject?.milestones && currentProject.milestones.length > 0 && (
                        <section id="milestone">
                            <div className="mb-6">
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('Milestones')}</h1>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{t('Project milestones and progress')}</p>
                            </div>
                            <Card className="rounded-xl shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
                                <CardContent className="p-6">
                                    <div className={`space-y-4 ${currentProject.milestones.length > 5 ? 'max-h-96 overflow-y-auto pr-0.5' : ''}`}>
                                        {currentProject.milestones.map((milestone: any) => (
                                            <Card key={milestone.id} className="group hover:shadow-lg transition-all duration-200 border-0 shadow-md hover:scale-[1.01] bg-gradient-to-br from-white to-orange-50 dark:from-gray-800 dark:to-orange-950">
                                                <CardContent className="p-4">
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-2 bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900 dark:to-red-900 rounded-lg group-hover:from-orange-200 group-hover:to-red-200 dark:group-hover:from-orange-800 dark:group-hover:to-red-800 transition-all duration-200">
                                                            <Calendar className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-start justify-between mb-2">
                                                                <div>
                                                                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{milestone.title}</h3>
                                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-1">{milestone.description}</p>
                                                                </div>
                                                                <Badge className={getMilestoneStatusColor(milestone.status)}>
                                                                    {formatText(milestone.status)}
                                                                </Badge>
                                                            </div>
                                                            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                                                                <span className="flex items-center gap-1">
                                                                    <Calendar className="h-4 w-4" />
                                                                    {t('Due')}: {new Date(milestone.due_date).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                            <div className="mt-2">
                                                                <Progress value={milestone.progress} className="h-1" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </section>
                    )}

                    {/* Notes Section */}
                    {sharedSettings.notes !== false && currentProject?.notes && (currentProject.notes.data?.length > 0 || currentProject.notes.length > 0) && (
                        <section id="notes">
                            <div className="mb-6">
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('Notes')}</h1>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{t('Project notes and documentation')}</p>
                            </div>
                            <Card className="rounded-xl shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
                                <CardContent className="p-6">
                                    <div className={`space-y-4 ${currentProject.notes.length > 5 ? 'max-h-96 overflow-y-auto pr-0.5' : ''}`}>
                                        {currentProject.notes.map((note: any) => (
                                            <Card key={note.id} className="group hover:shadow-lg transition-all duration-200 border-0 shadow-md hover:scale-[1.01] bg-gradient-to-br from-white to-yellow-50 dark:from-gray-800 dark:to-yellow-950">
                                                <CardContent className="p-4">
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-2 bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900 dark:to-orange-900 rounded-lg group-hover:from-yellow-200 group-hover:to-orange-200 dark:group-hover:from-yellow-800 dark:group-hover:to-orange-800 transition-all duration-200">
                                                            <Pin className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">{note.title}</h3>
                                                            <p className="text-sm text-gray-700 dark:text-gray-400 mb-3 line-clamp-1">{note.content}</p>
                                                            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                                                                <div className="flex items-center gap-2">
                                                                    <Avatar className="h-5 w-5">
                                                                        <AvatarFallback className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300">
                                                                            {note.creator?.name?.charAt(0)}
                                                                        </AvatarFallback>
                                                                    </Avatar>
                                                                    <span>{t('Created by')} {note.creator?.name}</span>
                                                                </div>
                                                                <span className="flex items-center gap-1">
                                                                    <Calendar className="h-4 w-4" />
                                                                    {new Date(note.created_at).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </section>
                    )}

                    {/* Budget Section */}
                    {sharedSettings.budget !== false && currentProject?.budget && (
                        <section id="budget">
                            <div className="mb-6">
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('Budget Overview')}</h1>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{t('Project budget and financial summary')}</p>
                            </div>
                            <Card className="rounded-xl shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
                                <CardContent className="p-6 space-y-6">

                                    {/* Budget Stats Cards */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <Card className="group hover:shadow-lg transition-all duration-200 border-0 shadow-md hover:scale-[1.02] bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-blue-950">
                                            <CardContent className="p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="p-1 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 rounded-lg">
                                                        <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('Total Budget')}</span>
                                                </div>
                                                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(currentProject.budget?.total_budget || 0)}</p>
                                            </CardContent>
                                        </Card>
                                        <Card className="group hover:shadow-lg transition-all duration-200 border-0 shadow-md hover:scale-[1.02] bg-gradient-to-br from-white to-red-50 dark:from-gray-800 dark:to-red-950">
                                            <CardContent className="p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="p-1 bg-gradient-to-br from-red-100 to-pink-100 dark:from-red-900 dark:to-pink-900 rounded-lg">
                                                        <Receipt className="h-4 w-4 text-red-600 dark:text-red-400" />
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('Total Spent')}</span>
                                                </div>
                                                <p className="text-xl font-bold text-red-600 dark:text-red-400">{formatCurrency(currentProject.budget?.total_spent || 0)}</p>
                                            </CardContent>
                                        </Card>
                                        <Card className="group hover:shadow-lg transition-all duration-200 border-0 shadow-md hover:scale-[1.02] bg-gradient-to-br from-white to-green-50 dark:from-gray-800 dark:to-green-950">
                                            <CardContent className="p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="p-1 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900 rounded-lg">
                                                        <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('Remaining')}</span>
                                                </div>
                                                <p className="text-xl font-bold text-green-600 dark:text-green-400">{formatCurrency(currentProject.budget?.remaining_budget || 0)}</p>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {/* Budget Progress */}
                                    <Card className="group hover:shadow-lg transition-all duration-200 border-0 shadow-md bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-blue-950">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="flex items-center gap-2 text-lg">
                                                <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 rounded-lg group-hover:from-blue-200 group-hover:to-indigo-200 dark:group-hover:from-blue-800 dark:group-hover:to-indigo-800 transition-all duration-200">
                                                    <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                                </div>
                                                <span className="text-gray-900 dark:text-gray-100">{t('Budget Progress')}</span>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-medium text-gray-700 dark:text-gray-300">{t('Budget Progress')}</span>
                                                    <span className="font-bold text-gray-900 dark:text-gray-100">{(() => {
                                                        const totalBudget = currentProject.budget?.total_budget || 0;
                                                        const totalSpent = currentProject.budget?.total_spent || 0;
                                                        return totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : '0.0';
                                                    })()}%</span>
                                                </div>
                                                {(() => {
                                                    const totalBudget = currentProject.budget?.total_budget || 0;
                                                    const totalSpent = currentProject.budget?.total_spent || 0;
                                                    const percentage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

                                                    return (
                                                        <div className="mt-2">
                                                            <Progress value={percentage} className="h-1" />
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </CardContent>
                                    </Card>

                                </CardContent>
                            </Card>
                        </section>
                    )}

                    {/* Expenses Section */}
                    {sharedSettings.expenses !== false && currentProject?.expenses && currentProject.expenses.length > 0 && (
                        <section id="expenses">
                            <div className="mb-6">
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('Project Expenses')}</h1>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{t('Project expenses and financial records')}</p>
                            </div>
                            <Card className="rounded-xl shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
                                <CardContent className="p-6 space-y-6">

                                    {/* Expense Stats Cards */}
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <Card className="group hover:shadow-lg transition-all duration-200 border-0 shadow-md hover:scale-[1.02] bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-blue-950">
                                            <CardContent className="p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="p-1 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 rounded-lg">
                                                        <Receipt className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('Total Expenses')}</span>
                                                </div>
                                                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{currentProject.expenses.length}</p>
                                            </CardContent>
                                        </Card>
                                        <Card className="group hover:shadow-lg transition-all duration-200 border-0 shadow-md hover:scale-[1.02] bg-gradient-to-br from-white to-green-50 dark:from-gray-800 dark:to-green-950">
                                            <CardContent className="p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="p-1 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900 rounded-lg">
                                                        <CheckSquare className="h-4 w-4 text-green-600 dark:text-green-400" />
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Approved</span>
                                                </div>
                                                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{currentProject.expenses.filter((expense: any) => expense.status === 'approved').length}</p>
                                            </CardContent>
                                        </Card>
                                        <Card className="group hover:shadow-lg transition-all duration-200 border-0 shadow-md hover:scale-[1.02] bg-gradient-to-br from-white to-yellow-50 dark:from-gray-800 dark:to-yellow-950">
                                            <CardContent className="p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="p-1 bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900 dark:to-orange-900 rounded-lg">
                                                        <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Pending</span>
                                                </div>
                                                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{currentProject.expenses.filter((expense: any) => expense.status === 'pending').length}</p>
                                            </CardContent>
                                        </Card>
                                        <Card className="group hover:shadow-lg transition-all duration-200 border-0 shadow-md hover:scale-[1.02] bg-gradient-to-br from-white to-purple-50 dark:from-gray-800 dark:to-purple-950">
                                            <CardContent className="p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="p-1 bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900 dark:to-indigo-900 rounded-lg">
                                                        <DollarSign className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('Total Amount')}</span>
                                                </div>
                                                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{formatCurrency(currentProject.approved_expenses_total || 0)}</p>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {/* Recent Expenses */}
                                    <div>
                                        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('Recent Expenses')}</h3>
                                        <div className={`space-y-4 ${currentProject.expenses.length > 5 ? 'max-h-96 overflow-y-auto pr-0.5' : ''}`}>
                                            {currentProject.expenses.map((expense: any) => (
                                                <Card key={expense.id} className="group hover:shadow-lg transition-all duration-200 border-0 shadow-md hover:scale-[1.01] bg-gradient-to-br from-white to-green-50 dark:from-gray-800 dark:to-green-950">
                                                    <CardContent className="p-4">
                                                        <div className="flex items-start gap-3">
                                                            <div className="p-2 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900 rounded-lg group-hover:from-green-200 group-hover:to-emerald-200 dark:group-hover:from-green-800 dark:group-hover:to-emerald-800 transition-all duration-200">
                                                                <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="flex items-start justify-between mb-2">
                                                                    <div>
                                                                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">{expense.title}</h4>
                                                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-1">{expense.description || 'No description'}</p>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <p className="font-bold text-lg text-gray-900 dark:text-gray-100">{formatCurrency(expense.amount)}</p>
                                                                        <Badge className={`text-xs ${expense.status === 'approved' ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700' :
                                                                                expense.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700' :
                                                                                    expense.status === 'rejected' ? 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700' :
                                                                                        'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                                                                            }`} variant="outline">
                                                                            {formatText(expense.status)}
                                                                        </Badge>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                                                    <span className="flex items-center gap-1">
                                                                        <Calendar className="h-4 w-4" />
                                                                        {new Date(expense.created_at).toLocaleDateString()}
                                                                    </span>
                                                                    {expense.submitter?.name && (
                                                                        <span className="flex items-center gap-1">
                                                                            <Users className="h-4 w-4" />
                                                                            {expense.submitter.name}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </section>
                    )}

                    {/* Tasks Section */}
                    {sharedSettings.task !== false && currentProject?.tasks && currentProject.tasks.length > 0 && (
                        <section id="task">
                            <div className="mb-6">
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('Project Tasks')}</h1>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{t('Current project tasks and assignments')}</p>
                            </div>
                            <Card className="rounded-xl shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
                                <CardContent className="p-6 space-y-6">

                                    {/* Task Stats Cards */}
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <Card className="group hover:shadow-lg transition-all duration-200 border-0 shadow-md hover:scale-[1.02] bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-blue-950">
                                            <CardContent className="p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="p-1 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 rounded-lg">
                                                        <CheckSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('Total Tasks')}</span>
                                                </div>
                                                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{currentProject.tasks.length}</p>
                                            </CardContent>
                                        </Card>
                                        <Card className="group hover:shadow-lg transition-all duration-200 border-0 shadow-md hover:scale-[1.02] bg-gradient-to-br from-white to-green-50 dark:from-gray-800 dark:to-green-950">
                                            <CardContent className="p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="p-1 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900 rounded-lg">
                                                        <CheckSquare className="h-4 w-4 text-green-600 dark:text-green-400" />
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('Completed')}</span>
                                                </div>
                                                <p className="text-2xl font-bold text-primary">{currentProject.tasks.filter((task: any) => task.task_stage?.name === 'Completed' || task.task_stage?.name === 'Done').length}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{currentProject.tasks.length > 0 ? ((currentProject.tasks.filter((task: any) => task.task_stage?.name === 'Completed' || task.task_stage?.name === 'Done').length / currentProject.tasks.length) * 100).toFixed(1) : 0}% {t('of total')}</p>
                                            </CardContent>
                                        </Card>
                                        <Card className="group hover:shadow-lg transition-all duration-200 border-0 shadow-md hover:scale-[1.02] bg-gradient-to-br from-white to-orange-50 dark:from-gray-800 dark:to-orange-950">
                                            <CardContent className="p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="p-1 bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900 dark:to-red-900 rounded-lg">
                                                        <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('In Progress')}</span>
                                                </div>
                                                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{currentProject.tasks.filter((task: any) => task.task_stage?.name === 'In Progress' || task.task_stage?.name === 'Working').length}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{currentProject.tasks.length > 0 ? ((currentProject.tasks.filter((task: any) => task.task_stage?.name === 'In Progress' || task.task_stage?.name === 'Working').length / currentProject.tasks.length) * 100).toFixed(1) : 0}% {t('of total')}</p>
                                            </CardContent>
                                        </Card>
                                        <Card className="group hover:shadow-lg transition-all duration-200 border-0 shadow-md hover:scale-[1.02] bg-gradient-to-br from-white to-purple-50 dark:from-gray-800 dark:to-purple-950">
                                            <CardContent className="p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="p-1 bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900 dark:to-indigo-900 rounded-lg">
                                                        <Timer className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Pending</span>
                                                </div>
                                                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{currentProject.tasks.filter((task: any) => !['Completed', 'Done', 'In Progress', 'Working'].includes(task.task_stage?.name)).length}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{currentProject.tasks.length > 0 ? ((currentProject.tasks.filter((task: any) => !['Completed', 'Done', 'In Progress', 'Working'].includes(task.task_stage?.name)).length / currentProject.tasks.length) * 100).toFixed(1) : 0}% {t('of total')}</p>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {/* Recent Tasks */}
                                    <div>
                                        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('Recent Tasks')}</h3>
                                        <div className={`space-y-4 ${currentProject.tasks.length > 5 ? 'max-h-96 overflow-y-auto pr-0.5' : ''}`}>
                                            {currentProject.tasks.map((task: any) => (
                                                <Card key={task.id} className="group hover:shadow-lg transition-all duration-200 border-0 shadow-md hover:scale-[1.01] bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-blue-950">
                                                    <CardContent className="p-4">
                                                        <div className="flex items-start gap-3">
                                                            <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 rounded-lg group-hover:from-blue-200 group-hover:to-indigo-200 dark:group-hover:from-blue-800 dark:group-hover:to-indigo-800 transition-all duration-200">
                                                                <CheckSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="flex items-start justify-between mb-2">
                                                                    <div>
                                                                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">{task.title}</h4>
                                                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-1">{task.description || t('No description')}</p>
                                                                    </div>
                                                                    <div className="text-right flex gap-2">
                                                                        <Badge className={getPriorityColor(task.priority)} size="sm">
                                                                            {formatText(task.priority)}
                                                                        </Badge>
                                                                        <Badge className={`text-xs ${task.task_stage?.name === 'Completed' || task.task_stage?.name === 'Done' ? 'bg-primary/10 text-primary' :
                                                                                task.task_stage?.name === 'In Progress' || task.task_stage?.name === 'Working' ? 'bg-primary/10 text-primary' :
                                                                                    'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                                                                            }`} size="sm">
                                                                            {task.task_stage?.name || 'To Do'}
                                                                        </Badge>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                                                        <span className="flex items-center gap-1">
                                                                            <Users className="h-4 w-4" />
                                                                            {task.assigned_to?.name || t('Unassigned')}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="flex items-center gap-1">
                                                                            <div className="w-12 bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                                                                                <div
                                                                                    className="bg-primary h-1 rounded-full"
                                                                                    style={{ width: `${task.progress || 0}%` }}
                                                                                ></div>
                                                                            </div>
                                                                            <span className="text-xs text-gray-600 dark:text-gray-400">{task.progress || 0}%</span>
                                                                        </div>
                                                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                            {task.end_date ? new Date(task.end_date).toLocaleDateString() : t('No due date')}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </section>
                    )}

                    {/* Bugs Section */}
                    {sharedSettings.recent_bugs !== false && currentProject?.bugs && currentProject.bugs.length > 0 && (
                        <section id="recent_bugs">
                            <div className="mb-6">
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('Project Bugs')}</h1>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{t('Current issues and bug reports')}</p>
                            </div>
                            <Card className="rounded-xl shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
                                <CardContent className="p-6 space-y-6">

                                    {/* Bug Stats Cards */}
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <Card className="group hover:shadow-lg transition-all duration-200 border-0 shadow-md hover:scale-[1.02] bg-gradient-to-br from-white to-red-50 dark:from-gray-800 dark:to-red-950">
                                            <CardContent className="p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="p-1 bg-gradient-to-br from-red-100 to-pink-100 dark:from-red-900 dark:to-pink-900 rounded-lg">
                                                        <Bug className="h-4 w-4 text-red-600 dark:text-red-400" />
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('Total Bugs')}</span>
                                                </div>
                                                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{currentProject.bugs.length}</p>
                                            </CardContent>
                                        </Card>
                                        <Card className="group hover:shadow-lg transition-all duration-200 border-0 shadow-md hover:scale-[1.02] bg-gradient-to-br from-white to-green-50 dark:from-gray-800 dark:to-green-950">
                                            <CardContent className="p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="p-1 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900 rounded-lg">
                                                        <CheckSquare className="h-4 w-4 text-green-600 dark:text-green-400" />
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('Open Issues')}</span>
                                                </div>
                                                <p className="text-2xl font-bold text-primary">{currentProject.bugs.filter((bug: any) => !['Resolved', 'Closed'].includes(bug.bug_status?.name)).length}</p>
                                            </CardContent>
                                        </Card>
                                        <Card className="group hover:shadow-lg transition-all duration-200 border-0 shadow-md hover:scale-[1.02] bg-gradient-to-br from-white to-orange-50 dark:from-gray-800 dark:to-orange-950">
                                            <CardContent className="p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="p-1 bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900 dark:to-red-900 rounded-lg">
                                                        <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('Critical')}</span>
                                                </div>
                                                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{currentProject.bugs.filter((bug: any) => bug.priority === 'critical').length}</p>
                                            </CardContent>
                                        </Card>
                                        <Card className="group hover:shadow-lg transition-all duration-200 border-0 shadow-md hover:scale-[1.02] bg-gradient-to-br from-white to-purple-50 dark:from-gray-800 dark:to-purple-950">
                                            <CardContent className="p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="p-1 bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900 dark:to-indigo-900 rounded-lg">
                                                        <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Unassigned</span>
                                                </div>
                                                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{currentProject.bugs.filter((bug: any) => !bug.assigned_to).length}</p>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {/* Recent Bugs */}
                                    <div>
                                        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('Recent Bugs')}</h3>
                                        <div className={`space-y-4 ${currentProject.bugs.length > 5 ? 'max-h-96 overflow-y-auto pr-0.5' : ''}`}>
                                            {currentProject.bugs.map((bug: any) => (
                                                <Card key={bug.id} className="group hover:shadow-lg transition-all duration-200 border-0 shadow-md hover:scale-[1.01] bg-gradient-to-br from-white to-red-50 dark:from-gray-800 dark:to-red-950">
                                                    <CardContent className="p-4">
                                                        <div className="flex items-start gap-3">
                                                            <div className="p-2 bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900 dark:to-orange-900 rounded-lg group-hover:from-red-200 group-hover:to-orange-200 dark:group-hover:from-red-800 dark:group-hover:to-orange-800 transition-all duration-200">
                                                                <Bug className="h-4 w-4 text-red-600 dark:text-red-400" />
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="flex items-start justify-between mb-2">
                                                                    <div>
                                                                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">{bug.title}</h4>
                                                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-1">{bug.description || t('No description')}</p>
                                                                    </div>
                                                                    <div className="text-right flex gap-2">
                                                                        <Badge className={getPriorityColor(bug.priority)} size="sm">
                                                                            {formatText(bug.priority)}
                                                                        </Badge>
                                                                        <Badge className={`text-xs ${bug.severity === 'blocker' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' :
                                                                                bug.severity === 'critical' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' :
                                                                                    bug.severity === 'major' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' :
                                                                                        'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                                                                            }`} size="sm">
                                                                            {formatText(bug.severity || 'minor')}
                                                                        </Badge>
                                                                        <Badge className={`text-xs ${bug.bug_status?.name === 'New' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' :
                                                                                bug.bug_status?.name === 'In Progress' ? 'bg-primary/10 text-primary' :
                                                                                    bug.bug_status?.name === 'Resolved' ? 'bg-primary/10 text-primary' :
                                                                                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                                                            }`} size="sm">
                                                                            {bug.bug_status?.name || 'New'}
                                                                        </Badge>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                                                        <span className="flex items-center gap-1">
                                                                            <Users className="h-4 w-4" />
                                                                            {bug.assigned_to?.name || t('Unassigned')}
                                                                        </span>
                                                                    </div>
                                                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                                                        <span>{t('Reported by')} {bug.reported_by?.name}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </section>
                    )}

                    {/* Timesheets Section */}
                    {sharedSettings.timesheet !== false && currentProject?.timesheets && currentProject.timesheets.length > 0 && (
                        <section id="timesheet">
                            <div className="mb-6">
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('Time Tracking')}</h1>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{t('Team time tracking and hours logged')}</p>
                            </div>
                            <Card className="rounded-xl shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
                                <CardContent className="p-6 space-y-6">

                                    {/* Timesheet Stats Cards */}
                                    {(() => {
                                        const overdueCount = currentProject.timesheets.filter((ts: any) => isTimesheetOverdue(ts.end_date, ts.status)).length;

                                        return (
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                <Card className="group hover:shadow-lg transition-all duration-200 border-0 shadow-md hover:scale-[1.02] bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-blue-950">
                                                    <CardContent className="p-4">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <div className="p-1 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 rounded-lg">
                                                                <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                                            </div>
                                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('Total Hours')}</span>
                                                        </div>
                                                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{currentProject.total_project_hours?.toFixed(1) || '0.0'}h</p>
                                                    </CardContent>
                                                </Card>
                                                <Card className="group hover:shadow-lg transition-all duration-200 border-0 shadow-md hover:scale-[1.02] bg-gradient-to-br from-white to-green-50 dark:from-gray-800 dark:to-green-950">
                                                    <CardContent className="p-4">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <div className="p-1 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900 rounded-lg">
                                                                <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                                                            </div>
                                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('Billable Hours')}</span>
                                                        </div>
                                                        <p className="text-2xl font-bold text-primary">{currentProject.total_billable_hours?.toFixed(1) || '0.0'}h ({project.submitted_timesheets_percentage || 0}%)</p>
                                                    </CardContent>
                                                </Card>
                                                <Card className="group hover:shadow-lg transition-all duration-200 border-0 shadow-md hover:scale-[1.02] bg-gradient-to-br from-white to-purple-50 dark:from-gray-800 dark:to-purple-950">
                                                    <CardContent className="p-4">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <div className="p-1 bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900 dark:to-indigo-900 rounded-lg">
                                                                <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                                            </div>
                                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('Team Members')}</span>
                                                        </div>
                                                        <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{currentProject.total_team_members || 0}</p>
                                                    </CardContent>
                                                </Card>
                                                <Card className="group hover:shadow-lg transition-all duration-200 border-0 shadow-md hover:scale-[1.02] bg-gradient-to-br from-white to-orange-50 dark:from-gray-800 dark:to-orange-950">
                                                    <CardContent className="p-4">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <div className="p-1 bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900 dark:to-red-900 rounded-lg">
                                                                <CheckSquare className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                                            </div>
                                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Approved</span>
                                                        </div>
                                                        <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{currentProject.approved_timesheets_count || 0}</p>
                                                    </CardContent>
                                                </Card>
                                            </div>
                                        );
                                    })()}

                                    {/* Hours Status */}
                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border border-blue-100 dark:border-blue-900 rounded-lg p-4">
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('Hours Status')}</h4>
                                                <div className="flex items-center gap-2">
                                                    {(() => {
                                                        const totalHours = currentProject.total_project_hours || 0;
                                                        const billableHours = currentProject.total_billable_hours || 0;
                                                        const pendingCount = currentProject.timesheets.filter((ts: any) => ts.status === 'pending').length;
                                                        const overdueCount = currentProject.timesheets.filter((ts: any) => isTimesheetOverdue(ts.end_date, ts.status)).length;

                                                        return (
                                                            <>
                                                                {billableHours === totalHours && totalHours > 0 ? (
                                                                    <Badge className="bg-primary/10 text-primary border-primary/30" variant="outline">
                                                                        <CheckCircle className="h-3 w-3 mr-1" />
                                                                        {t('All Hours Billable')}
                                                                    </Badge>
                                                                ) : totalHours > 0 ? (
                                                                    <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700" variant="outline">
                                                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                                                        {t('Partial Billable')}
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="outline">{t('No Hours Logged')}</Badge>
                                                                )}
                                                                {overdueCount > 0 && (
                                                                    <Badge className="bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700" variant="outline">
                                                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                                                        {overdueCount} {t('Overdue')}
                                                                    </Badge>
                                                                )}
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                            {(() => {
                                                const totalHours = currentProject.total_project_hours || 0;
                                                const billableHours = currentProject.total_billable_hours || 0;
                                                const percentage = currentProject.billable_rate_percentage || 0;

                                                return totalHours > 0 ? (
                                                    <div className="bg-white dark:bg-gray-800 rounded-md p-3 border border-gray-200 dark:border-gray-700">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('Submitted Progress')}</span>
                                                            <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{currentProject.submitted_timesheets_percentage}%</span>
                                                        </div>
                                                        <div className="relative">
                                                            <Progress value={currentProject.submitted_timesheets_percentage} className="w-full h-1 bg-gray-200 dark:bg-gray-700" />
                                                        </div>
                                                    </div>
                                                ) : null;
                                            })()}
                                        </div>
                                    </div>

                                    {/* Recent Timesheets */}
                                    <div>
                                        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('Recent Timesheets')}</h3>
                                        <div className={`space-y-4 ${currentProject.timesheets.length > 5 ? 'max-h-96 overflow-y-auto pr-0.5' : ''}`}>
                                            {currentProject.timesheets.map((timesheet: any) => {
                                                const isOverdue = isTimesheetOverdue(timesheet.end_date, timesheet.status);

                                                return (
                                                    <Card key={timesheet.id} className="group hover:shadow-lg transition-all duration-200 border-0 shadow-md hover:scale-[1.01] bg-gradient-to-br from-white to-purple-50 dark:from-gray-800 dark:to-purple-950">
                                                        <CardContent className="p-4">
                                                            <div className="flex items-start gap-3">
                                                                <div className="p-2 bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900 dark:to-indigo-900 rounded-lg group-hover:from-purple-200 group-hover:to-indigo-200 dark:group-hover:from-purple-800 dark:group-hover:to-indigo-800 transition-all duration-200">
                                                                    <Timer className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                                                </div>
                                                                <div className="flex-1">
                                                                    <div className="flex items-start justify-between mb-2">
                                                                        <div>
                                                                            <div className="flex items-center gap-2">
                                                                                <h4 className="font-semibold text-gray-900 dark:text-gray-100">{t('Week of')} {new Date(timesheet.start_date).toLocaleDateString()}</h4>
                                                                                {isOverdue && (
                                                                                    <Badge className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700 text-xs" variant="outline">
                                                                                        {getDaysOverdue(timesheet.end_date)}d {t('overdue')}
                                                                                    </Badge>
                                                                                )}
                                                                            </div>
                                                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{new Date(timesheet.start_date).toLocaleDateString()} - {new Date(timesheet.end_date).toLocaleDateString()}</p>
                                                                            {timesheet.billable_hours > 0 && (
                                                                                <p className="text-sm text-primary mt-1 font-medium">{t('All hours billable')}</p>
                                                                            )}
                                                                        </div>
                                                                        <Badge className={`text-xs ${timesheet.status === 'approved' ? 'bg-primary/10 text-primary' :
                                                                                timesheet.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' :
                                                                                    timesheet.status === 'draft' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' :
                                                                                        isOverdue ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' :
                                                                                            'bg-primary/10 text-primary'
                                                                            }`} size="sm">
                                                                            {isOverdue ? formatText('overdue') : formatText(timesheet.status)}
                                                                        </Badge>
                                                                    </div>
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                                                            <span className="flex items-center gap-1">
                                                                                <Users className="h-4 w-4" />
                                                                                {timesheet.user?.name}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex items-center gap-4 text-sm">
                                                                            <span className="text-primary font-medium">{timesheet.total_hours || 0}h</span>
                                                                            <span className="text-primary font-medium">{timesheet.billable_hours || 0}h ({timesheet.billable_percentage || 0}%)</span>
                                                                            <span className="text-gray-500 dark:text-gray-400">{timesheet.entries_count || 0} {t('entries')}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </section>
                    )}

                    {/* Files Section */}
                    {sharedSettings.files !== false && currentProject?.attachments && (currentProject.attachments.data?.length > 0 || currentProject.attachments.length > 0) && (
                        <section id="files">
                            <div className="mb-6">
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('Files & Attachments')}</h1>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{t('Project documents and media files')}</p>
                            </div>
                            <Card className="rounded-xl shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
                                <CardContent className="p-6">
                                    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${currentProject.attachments.length > 8 ? 'max-h-96 overflow-y-auto pr-0.5' : ''}`}>
                                        {currentProject.attachments.map((attachment: any) => {
                                            const isImage = attachment.media_item?.mime_type?.startsWith('image/');
                                            return (
                                                <Card key={attachment.id} className="group hover:shadow-lg transition-all duration-200 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 bg-white dark:bg-gray-800">
                                                    <CardContent className="p-3">
                                                        <div className="aspect-square mb-3 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                                            {isImage ? (
                                                                <img
                                                                    src={attachment.media_item.url}
                                                                    alt={attachment.media_item.name}
                                                                    className="w-full h-full object-cover"
                                                                    onError={(e) => {
                                                                        e.currentTarget.style.display = 'none';
                                                                        e.currentTarget.nextElementSibling.style.display = 'flex';
                                                                    }}
                                                                />
                                                            ) : null}
                                                            <div className={`w-full h-full flex items-center justify-center ${isImage ? 'hidden' : 'flex'}`}>
                                                                <Paperclip className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate" title={attachment.media_item.name}>
                                                                {attachment.media_item.name}
                                                            </h3>
                                                            <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                                                                <Users className="h-3 w-3" />
                                                                <span className="truncate">{attachment.uploaded_by?.name || 'Unknown'}</span>
                                                            </div>
                                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                                {new Date(attachment.created_at).toLocaleDateString()}, {new Date(attachment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        </section>
                    )}

                    {/* Activity Section */}
                    {sharedSettings.activity !== false && currentProject?.activities && (currentProject.activities.data?.length > 0 || currentProject.activities.length > 0) && (
                        <section id="activity">
                            <div className="mb-6">
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('Recent Activity')}</h1>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{t('Latest project activities and updates')}</p>
                            </div>
                            <Card className="rounded-xl shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
                                <CardContent className="p-6">
                                    <div className={`space-y-4 ${currentProject.activities.length > 5 ? 'max-h-96 overflow-y-auto pr-0.5' : ''}`}>
                                        {currentProject.activities.map((activity: any) => (
                                            <Card key={activity.id} className="group hover:shadow-lg transition-all duration-200 border-0 shadow-md hover:scale-[1.01] bg-gradient-to-br from-white to-indigo-50 dark:from-gray-800 dark:to-indigo-950">
                                                <CardContent className="p-4">
                                                    <div className="flex gap-3">
                                                        <div className="relative">
                                                            <Avatar className="h-10 w-10 ring-2 ring-white dark:ring-gray-700 shadow-md group-hover:ring-indigo-200 dark:group-hover:ring-indigo-800 transition-all duration-200">
                                                                {activity.user.avatar && <AvatarImage src={activity.user.avatar} />}
                                                                <AvatarFallback className="bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 text-indigo-700 dark:text-indigo-300 font-semibold">
                                                                    {activity.user.name.split(' ').map((n: string) => n[0]).join('')}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-start justify-between">
                                                                <div className="flex-1">
                                                                    <p className="text-gray-900 dark:text-gray-100 font-medium leading-relaxed">{activity.description}</p>
                                                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-2">
                                                                        <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full"></div>
                                                                        <span className="font-medium">{activity.user.name}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right text-sm text-gray-500 dark:text-gray-400 ml-4">
                                                                    <span className="flex items-center gap-1">
                                                                        <Clock className="h-4 w-4" />
                                                                        {new Date(activity.created_at).toLocaleString()}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </section>
                    )}

                </div>
            </div>
        </div>
    );
}

export default function projectlink({ project, encryptedId, globalSettings }: projectlinkProps) {
    return (
        <BrandProvider globalSettings={globalSettings}>
            <ProjectLinkContent project={project} encryptedId={encryptedId} />
        </BrandProvider>
    );
}