import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { useLayout } from '@/contexts/LayoutContext';
import { useSidebarSettings } from '@/contexts/SidebarContext';
import { useBrand } from '@/contexts/BrandContext';

import { type NavItem } from '@/types';
import { Link, usePage, router } from '@inertiajs/react';
import { BookOpen, Contact, Folder, LayoutGrid, ShoppingBag, Users, Tag, FileIcon, Settings, BarChart, Barcode, FileText, Briefcase, CheckSquare, Calendar, CreditCard, Nfc, Ticket, Gift, DollarSign, MessageSquare, CalendarDays, Palette, Image, Mail, Mail as VCard, ChevronDown, Building2, Globe, FolderOpen, Clock, Bug, Receipt, TrendingUp, Bot, Video, Bell, HelpCircle, Workflow, Activity, Archive, ListTodo } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import AppLogo from './app-logo';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { hasPermission } from '@/utils/authorization';



export function AppSidebar() {
    const { t, i18n } = useTranslation();
    const { auth, isSaasMode, globalSettings } = usePage().props as any;
    const permissions = auth?.permissions || [];
    const [currentLang, setCurrentLang] = useState(i18n.language);
    const [forceUpdate, setForceUpdate] = useState(0);
    const [isDarkTheme, setIsDarkTheme] = useState(() => document.documentElement.classList.contains('dark'));
    
    // Listen for language changes to force re-render
    useEffect(() => {
        const handleLanguageChange = (event: CustomEvent) => {
            setCurrentLang(event.detail.languageCode);
        };
        
        const handleLayoutDirectionChange = (event: CustomEvent) => {
            setForceUpdate(prev => prev + 1);
        };
        
        // Listen for theme changes
        const handleThemeChange = () => {
            setIsDarkTheme(document.documentElement.classList.contains('dark'));
        };
        
        // Create a MutationObserver to watch for class changes on html element
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    handleThemeChange();
                }
            });
        });
        
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        });
        
        window.addEventListener('languageChanged', handleLanguageChange as EventListener);
        window.addEventListener('layoutDirectionChanged', handleLayoutDirectionChange as EventListener);
        
        return () => {
            observer.disconnect();
            window.removeEventListener('languageChanged', handleLanguageChange as EventListener);
            window.removeEventListener('layoutDirectionChanged', handleLayoutDirectionChange as EventListener);
        };
    }, []);
    
    // Check if current language is RTL
    const isRTL = ['ar', 'he'].includes(currentLang);

    const getNavItems = (): NavItem[] => {
        const items: NavItem[] = [];

        // Dashboard
        if (hasPermission(permissions, 'dashboard_view')) {
            items.push({
                title: t('Dashboard'),
                href: route('dashboard'),
                icon: LayoutGrid,
            });
        }

        // Companies
        if (hasPermission(permissions, 'company_view_any')) {
            items.push({
                title: t('Companies'),
                href: route('companies.index'),
                icon: Building2,
            });
        }

        // Clients
        if (hasPermission(permissions, 'client_management_view_any')) {
            items.push({
                title: t('Clients'),
                href: route('clients.index'),
                icon: Users,
            });
        }

        if (hasPermission(permissions, 'manager_management_view_any')) {
            items.push({
                title: t('Managers'),
                href: route('managers.index'),
                icon: Users,
            });
        }

        if (hasPermission(permissions, 'member_management_view_any')) {
            items.push({
                title: t('Members'),
                href: route('members.index'),
                icon: Users,
            });
        }

        // Workspaces
        if (hasPermission(permissions, 'workspace_view_any')) {
            items.push({
                title: t('Workspaces'),
                href: route('workspaces.index'),
                icon: Building2,
            });
        }

        // Projects
        if (hasPermission(permissions, 'project_view_any')) {
            items.push({
                title: t('Projects'),
                href: route('projects.index'),
                icon: FolderOpen,
            });
        }

        // Tasks
        if (hasPermission(permissions, 'task_view_any')) {
            const taskChildren = [];

            taskChildren.push({
                title: t('All Tasks'),
                href: route('tasks.index')
            });

            if (hasPermission(permissions, 'task_manage_stages')) {
                taskChildren.push({
                    title: t('Task Stages'),
                    href: route('task-stages.index')
                });
            }

            items.push({
                title: t('Tasks'),
                icon: CheckSquare,
                children: taskChildren.length > 0 ? taskChildren : undefined,
                href: taskChildren.length === 0 ? route('tasks.index') : undefined
            });
        }

        // Bugs
        if (hasPermission(permissions, 'bug_view_any')) {
            const bugChildren = [];

            bugChildren.push({
                title: t('All Bugs'),
                href: route('bugs.index')
            });

            if (hasPermission(permissions, 'bug_manage_statuses')) {
                bugChildren.push({
                    title: t('Bug Statuses'),
                    href: route('bug-statuses.index')
                });
            }

            items.push({
                title: t('Bugs'),
                icon: Bug,
                children: bugChildren.length > 0 ? bugChildren : undefined,
                href: bugChildren.length === 0 ? route('bugs.index') : undefined
            });
        }

        // Timesheets
        if (hasPermission(permissions, 'timesheet_view_any')) {
            const timesheetChildren = [];

            timesheetChildren.push({
                title: t('My Timesheets'),
                href: route('timesheets.index')
            });
            timesheetChildren.push({
                title: t('Daily View'),
                href: route('timesheets.daily-view')
            });
            timesheetChildren.push({
                title: t('Weekly View'),
                href: route('timesheets.weekly-view')
            });
            timesheetChildren.push({
                title: t('Monthly View'),
                href: route('timesheets.monthly-view')
            });
            timesheetChildren.push({
                title: t('Calendar View'),
                href: route('timesheets.calendar-view')
            });

            if (hasPermission(permissions, 'timesheet_approve')) {
                timesheetChildren.push({
                    title: t('Approvals'),
                    href: route('timesheet-approvals.index')
                });
            }

            if (hasPermission(permissions, 'timesheet_generate_reports')) {
                timesheetChildren.push({
                    title: t('Reports'),
                    href: route('timesheet-reports.index')
                });
            }

            items.push({
                title: t('Timesheets'),
                icon: Clock,
                children: timesheetChildren.length > 0 ? timesheetChildren : undefined,
                href: timesheetChildren.length === 0 ? route('timesheets.index') : undefined
            });
        }

        // Zoom Meetings
        if (hasPermission(permissions, 'zoom_meeting_view_any') && globalSettings?.is_zoom_meeting_test === '1') {
            items.push({
                title: t('Zoom Meetings'),
                href: route('zoom-meetings.index'),
                icon: Video,
            });
        }

        // Google Meetings
        if (hasPermission(permissions, 'google_meeting_view_any') && globalSettings?.is_google_meeting_test === '1') {
            items.push({
                title: t('Google Meetings'),
                href: route('google-meetings.index'),
                icon: Video,
            });
        }

        // Budget & Expenses
        if (hasPermission(permissions, 'budget_view_any') || hasPermission(permissions, 'expense_view_any')) {
            const budgetChildren = [];

            if (hasPermission(permissions, 'budget_dashboard_view')) {
                budgetChildren.push({
                    title: t('Budget Dashboard'),
                    href: route('budgets.dashboard')
                });
            }

            if (hasPermission(permissions, 'budget_view_any')) {
                budgetChildren.push({
                    title: t('Budgets'),
                    href: route('budgets.index')
                });
            }

            if (hasPermission(permissions, 'expense_view_any')) {
                budgetChildren.push({
                    title: t('Expenses'),
                    href: route('expenses.index')
                });
            }

            if (hasPermission(permissions, 'expense_approval_approve')) {
                budgetChildren.push({
                    title: t('Expense Approvals'),
                    href: route('expense-approvals.index')
                });
            }

            items.push({
                title: t('Budget & Expenses'),
                icon: Receipt,
                children: budgetChildren.length > 0 ? budgetChildren : undefined,
                href: budgetChildren.length === 1 ? budgetChildren[0].href : undefined
            });
        }

        // ToDos
        if (hasPermission(permissions, 'todo_view_any')) {
            items.push({
                title: t('ToDos'),
                href: route('todos.index'),
                icon: ListTodo,
            });
        }

        // Project Reports
        if (hasPermission(permissions, 'project_report_view_any')) {
            items.push({
                title: t('Project Reports'),
                href: route('project-reports.index'),
                icon: TrendingUp,
            });
        }

        // Invoices
        if (hasPermission(permissions, 'invoice_view_any')) {
            items.push({
                title: t('Invoices'),
                href: route('invoices.index'),
                icon: FileText,
            });
        }

        // Notes
        if (hasPermission(permissions, 'note_view_any')) {
            items.push({
                title: t('Notes'),
                href: route('notes.index'),
                icon: FileIcon,
            });
        }

        // Calendar
        if (hasPermission(permissions, 'task_calendar_view')) {
            items.push({
                title: t('Calendar'),
                href: route('task-calendar.index'),
                icon: Calendar,
            });
        }

        // Contracts
        if (hasPermission(permissions, 'contract_view_any') || hasPermission(permissions, 'contract_type_view_any')) {
            const contractChildren = [];

            if (hasPermission(permissions, 'contract_view_any')) {
                contractChildren.push({
                    title: t('Contracts'),
                    href: route('contracts.index')
                });
            }

            if (hasPermission(permissions, 'contract_type_view_any')) {
                contractChildren.push({
                    title: t('Contract Types'),
                    href: route('contract-types.index')
                });
            }

            items.push({
                title: t('Contracts'),
                icon: FileText,
                children: contractChildren.length > 1 ? contractChildren : undefined,
                href: contractChildren.length === 1 ? contractChildren[0].href : undefined
            });
        }

        // Plans (SaaS mode)
        if (isSaasMode) {
            const planChildren = [];

            if (hasPermission(permissions, 'plan_view_any')) {
                planChildren.push({
                    title: t('Plans'),
                    href: route('plans.index')
                });
            }

            if (hasPermission(permissions, 'plan_manage_requests')) {
                planChildren.push({
                    title: t('Plan Requests'),
                    href: route('plan-requests.index')
                });
            }

            if (hasPermission(permissions, 'plan_manage_orders')) {
                planChildren.push({
                    title: t('Plan Orders'),
                    href: route('plan-orders.index')
                });
            }

            if (hasPermission(permissions, 'plan_view_my_requests') && auth?.user?.type !== 'superadmin') {
                planChildren.push({
                    title: t('My Plan Requests'),
                    href: route('my-plan-requests.index')
                });
            }

            if (hasPermission(permissions, 'plan_view_my_orders') && auth?.user?.type !== 'superadmin') {
                planChildren.push({
                    title: t('My Plan Orders'),
                    href: route('my-plan-orders.index')
                });
            }

            if (planChildren.length > 0) {
                items.push({
                    title: t('Plans'),
                    icon: CreditCard,
                    children: planChildren.length > 1 ? planChildren : undefined,
                    href: planChildren.length === 1 ? planChildren[0].href : undefined
                });
            }

            // Coupons
            if (hasPermission(permissions, 'coupon_view_any')) {
                items.push({
                    title: t('Coupons'),
                    href: route('coupons.index'),
                    icon: Ticket,
                });
            }

            // Referral Program
            if (hasPermission(permissions, 'referral_view_any')) {
                items.push({
                    title: t('Referral Program'),
                    href: route('referral.index'),
                    icon: Gift,
                });
            }
        }

        // Currencies
        if (hasPermission(permissions, 'currency_view_any')) {
            items.push({
                title: t('Currency'),
                href: route('currencies.index'),
                icon: DollarSign,
            });
        }

        // Landing Page
        const landingPageChildren = [];

        if (hasPermission(permissions, 'landing_page_manage')) {
            landingPageChildren.push({
                title: t('Landing Page'),
                href: route('landing-page')
            });
        }

        if (hasPermission(permissions, 'custom_page_view_any')) {
            landingPageChildren.push({
                title: t('Custom Pages'),
                href: route('landing-page.custom-pages.index')
            });
        }

        // Newsletters
        if (hasPermission(permissions, 'newsletter_view_any')) {
            landingPageChildren.push({
                title: t('Newsletters'),
                href: route('newsletters.index')
            });
        }

        // Contacts
        if (hasPermission(permissions, 'contact_view_any')) {
            landingPageChildren.push({
                title: t('Contact Inquiries'),
                href: route('contacts.index')
            });
        }

        if (landingPageChildren.length > 0) {
            items.push({
                title: t('Landing Page'),
                icon: Globe,
                children: landingPageChildren.length > 1 ? landingPageChildren : undefined,
                href: landingPageChildren.length === 1 ? landingPageChildren[0].href : undefined
            });
        }

        // Media Library
        if (hasPermission(permissions, 'media_view_any')) {
            items.push({
                title: t('Media Library'),
                href: route('media-library'),
                icon: Image,
            });
        }

        // Notification Templates (only for company users)
        if (hasPermission(permissions, 'notification_template_view_any') && auth?.user?.type !== 'superadmin') {
            items.push({
                title: t('Notification Templates'),
                href: route('notification-templates.index'),
                icon: Bell,
            });
        }

        // Analytics & Reports
        if (hasPermission(permissions, 'view-analytics')) {
            const analyticsChildren = [];

            if (hasPermission(permissions, 'view-timesheet-reports')) {
                analyticsChildren.push({
                    title: t('Timesheet Reports'),
                    href: route('timesheet-reports.index')
                });
            }

            if (analyticsChildren.length > 0) {
                items.push({
                    title: t('Analytics & Reports'),
                    icon: TrendingUp,
                    children: analyticsChildren
                });
            }
        }

        // Email Templates
        if (hasPermission(permissions, 'email_template_view_any')) {
            items.push({
                title: t('Email Templates'),
                href: route('email-templates.index'),
                icon: Mail,
            });
        }

        // Settings
        if (hasPermission(permissions, 'settings_view')) {
            items.push({
                title: t('Settings'),
                href: route('settings'),
                icon: Settings,
            });
        }

        return items;
    };

    const mainNavItems = getNavItems();

    const { position, effectivePosition, isRtl } = useLayout();
    const { variant, collapsible, style } = useSidebarSettings();
    const { logoLight, logoDark, updateBrandSettings } = useBrand();
    const [sidebarStyle, setSidebarStyle] = useState({});

    useEffect(() => {

        // Apply styles based on sidebar style
        if (style === 'colored') {
            setSidebarStyle({ backgroundColor: 'var(--primary)', color: 'white' });
        } else if (style === 'gradient') {
            setSidebarStyle({
                background: 'linear-gradient(to bottom, var(--primary), color-mix(in srgb, var(--primary), transparent 20%))',
                color: 'white'
            });
        } else {
            setSidebarStyle({});
        }
    }, [style]);

    const filteredNavItems = mainNavItems;

    // Get the first available menu item's href for logo link
    const getFirstAvailableHref = () => {
        if (filteredNavItems.length === 0) return route('dashboard');

        const firstItem = filteredNavItems[0];
        if (firstItem.href) {
            return firstItem.href;
        } else if (firstItem.children && firstItem.children.length > 0) {
            return firstItem.children[0].href || route('dashboard');
        }
        return route('dashboard');
    };

    return (
        <Sidebar
            // key={`sidebar-${effectivePosition}-${position}-${forceUpdate}-${isRTL ? 'rtl' : 'ltr'}`}
            side={effectivePosition}
            collapsible={collapsible}
            variant={variant}
            className={style !== 'plain' ? 'sidebar-custom-style' : ''}
        >
            <SidebarHeader className={style !== 'plain' ? 'sidebar-styled' : ''} style={sidebarStyle}>
                <div className="flex justify-center items-center p-2">
                    <Link href={getFirstAvailableHref()} prefetch className="flex items-center justify-center">
                        {/* Logo should always be visible */}
                        <div className="flex items-center">
                            {(() => {
                                const currentLogo = isDarkTheme ? logoLight : logoDark;
                                const displayUrl = currentLogo ? (
                                    currentLogo.startsWith('http') ? currentLogo :
                                        currentLogo.startsWith('/storage/') ? `${window.location.origin}${currentLogo}` :
                                            currentLogo.startsWith('/') ? `${window.location.origin}${currentLogo}` : currentLogo
                                ) : '';

                                return displayUrl ? (
                                    <img
                                        src={displayUrl}
                                        alt="Logo"
                                        className="w-auto transition-all duration-200"
                                        onError={() => updateBrandSettings({ [isDarkTheme ? 'logoLight' : 'logoDark']: '' })}
                                    />
                                ) : (
                                    <div className="h-8 text-inherit font-semibold flex items-center text-lg tracking-tight">
                                        WorkDo
                                    </div>
                                );
                            })()}
                        </div>

                    </Link>
                </div>


            </SidebarHeader>

            <SidebarContent style={sidebarStyle} className={style !== 'plain' ? 'sidebar-styled' : ''}>
                <NavMain items={filteredNavItems} position={effectivePosition} />
            </SidebarContent>

            <SidebarFooter>
                {/* <NavFooter items={footerNavItems} className="mt-auto" position={position} /> */}
                {/* Profile menu moved to header */}
            </SidebarFooter>
        </Sidebar>
    );
}
