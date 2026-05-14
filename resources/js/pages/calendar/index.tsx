import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { Card } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar, Phone, CheckSquare, User, Clock, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/custom-toast';

export default function CalendarIndex() {
  const { t } = useTranslation();
  const { events, auth, googleCalendarEnabled } = usePage().props as any;
  const permissions = auth?.permissions || [];
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [calendarView, setCalendarView] = useState('local');
  
  // Filter events based on calendar view
  const filteredEvents = calendarView === 'google' 
    ? events.filter((event: any) => event.is_googlecalendar_sync)
    : events;

  const handleEventClick = (info: any) => {
    info.jsEvent.preventDefault();
    const event = info.event;
    setSelectedEvent({
      title: event.title,
      start: event.start,
      end: event.end,
      type: event.extendedProps.type,
      ...event.extendedProps
    });
    setShowModal(true);
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'meeting': return <Calendar className="h-4 w-4" />;
      case 'task': return <CheckSquare className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'meeting': return 'bg-blue-100 text-blue-800';
      case 'task': return 'bg-amber-100 text-amber-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusClasses = (status: string, eventType: string) => {
    if (eventType === 'meeting') {
      switch (status?.toLowerCase()) {
        case 'planned':
          return 'bg-blue-50 text-blue-700 ring-blue-600/20';
        case 'held':
          return 'bg-green-50 text-green-700 ring-green-600/20';
        case 'not_held':
          return 'bg-red-50 text-red-700 ring-red-600/20';
        default:
          return 'bg-gray-50 text-gray-700 ring-gray-600/20';
      }
    } else if (eventType === 'task') {
      switch (status?.toLowerCase()) {
        case 'to_do':
          return 'bg-gray-50 text-gray-700 ring-gray-600/20';
        case 'in_progress':
          return 'bg-blue-50 text-blue-700 ring-blue-600/20';
        case 'review':
          return 'bg-yellow-50 text-yellow-700 ring-yellow-600/20';
        case 'done':
          return 'bg-green-50 text-green-700 ring-green-600/20';
        default:
          return 'bg-gray-50 text-gray-700 ring-gray-600/20';
      }
    }
    return 'bg-gray-50 text-gray-700 ring-gray-600/20';
  };

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Calendar') }
  ];

  const pageActions = [];
  
  if (googleCalendarEnabled) {
    pageActions.push({
      label: '',
      icon: (
        <Select value={calendarView} onValueChange={setCalendarView}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="local">{t('Local Calendar')}</SelectItem>
            <SelectItem value="google">{t('Google Calendar')}</SelectItem>
          </SelectContent>
        </Select>
      ),
      variant: 'ghost' as const,
      onClick: () => {}
    });
  }

  return (
    <PageTemplate
      title={t('Calendar')}
      breadcrumbs={breadcrumbs}
      actions={pageActions}
    >
      <Card className="p-4">
        <div className="mb-4 flex flex-wrap gap-4 justify-end">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{backgroundColor: '#3b82f6'}}></div>
            <span className="text-sm">{t('Zoom Meetings')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{backgroundColor: '#10B77F'}}></div>
            <span className="text-sm">{t('Google Meetings')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{backgroundColor: '#f59e0b'}}></div>
            <span className="text-sm">{t('Tasks')}</span>
          </div>
        </div>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          events={filteredEvents}
          eventClick={handleEventClick}
          eventTimeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            meridiem: 'short'
          }}
          height="auto"
          aspectRatio={1.8}
          eventDisplay="block"
          dayMaxEvents={1}
          moreLinkClick="popover"
          eventContent={(eventInfo) => {
            const isNotHeld = eventInfo.event.extendedProps.status === 'not_held';
            return (
              <div className="p-1 overflow-hidden cursor-pointer hover:opacity-80">
                <div className={`font-medium text-xs truncate ${isNotHeld ? 'line-through' : ''}`}>
                  {eventInfo.event.title}
                </div>
                {eventInfo.view.type !== 'dayGridMonth' && eventInfo.event.extendedProps.parent_name && (
                  <div className={`text-xs truncate ${isNotHeld ? 'line-through' : ''}`}>
                    {eventInfo.event.extendedProps.parent_name}
                  </div>
                )}
              </div>
            );
          }}
        />
      </Card>

      {/* Event Details Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEvent && getEventIcon(selectedEvent.type)}
              {selectedEvent?.title}
            </DialogTitle>
          </DialogHeader>
          
          {selectedEvent && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={getEventColor(selectedEvent.type)}>
                  {t(selectedEvent.type.charAt(0).toUpperCase() + selectedEvent.type.slice(1))}
                </Badge>
              </div>
              
              <div className="space-y-3">
                {selectedEvent.type === 'meeting' && (
                  <div className="text-sm">
                    <strong className="text-gray-700">{t('Start Time')}:</strong>
                    <span className="text-gray-600 ml-2">
                      {selectedEvent.start_time ? selectedEvent.start_time.substring(0, 16).replace('T', ' ') : ''}
                    </span>
                  </div>
                )}
                
                {selectedEvent.type === 'meeting' && selectedEvent.duration && (
                  <div className="text-sm">
                    <strong className="text-gray-700">{t('Duration (minutes)')}:</strong>
                    <span className="text-gray-600 ml-2">{selectedEvent.duration}</span>
                  </div>
                )}
                {selectedEvent.type === 'task' && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span>
                      {selectedEvent.start && new Date(selectedEvent.start).toLocaleDateString()}
                    </span>
                  </div>
                )}
                
                {selectedEvent.type === 'meeting' && selectedEvent.status && (
                  <div className="flex items-center gap-2 text-sm">
                    <strong>{t('Status')}:</strong>
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                      selectedEvent.status.toLowerCase() === 'scheduled' ? 'bg-blue-50 text-blue-700 ring-blue-600/20' :
                      selectedEvent.status.toLowerCase() === 'planned' ? 'bg-blue-50 text-blue-700 ring-blue-600/20' :
                      selectedEvent.status.toLowerCase() === 'held' || selectedEvent.status.toLowerCase() === 'completed' ? 'bg-green-50 text-green-700 ring-green-600/20' :
                      selectedEvent.status.toLowerCase() === 'not_held' || selectedEvent.status.toLowerCase() === 'cancelled' ? 'bg-red-50 text-red-700 ring-red-600/20' :
                      'bg-gray-50 text-gray-700 ring-gray-600/20'
                    }`}>
                      {selectedEvent.status}
                    </span>
                  </div>
                )}
                
                {selectedEvent.type === 'task' && selectedEvent.stage && (
                  <div className="flex items-center gap-2 text-sm">
                    <strong>{t('Stage')}:</strong>
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                      selectedEvent.stage.toLowerCase().includes('to do') || selectedEvent.stage.toLowerCase().includes('todo') ? 'bg-red-50 text-red-700 ring-red-600/20' :
                      selectedEvent.stage.toLowerCase().includes('progress') || selectedEvent.stage.toLowerCase().includes('doing') ? 'bg-orange-50 text-orange-700 ring-orange-600/20' :
                      selectedEvent.stage.toLowerCase().includes('review') ? 'bg-blue-50 text-blue-700 ring-blue-600/20' :
                      selectedEvent.stage.toLowerCase().includes('blocked') ? 'bg-purple-50 text-purple-700 ring-purple-600/20' :
                      selectedEvent.stage.toLowerCase().includes('done') || selectedEvent.stage.toLowerCase().includes('complete') ? 'bg-green-50 text-green-700 ring-green-600/20' :
                      'bg-gray-50 text-gray-700 ring-gray-600/20'
                    }`}>
                      {selectedEvent.stage}
                    </span>
                  </div>
                )}
                
                {selectedEvent.description && (
                  <div className="text-sm">
                    <strong className="text-gray-700">{t('Description')}:</strong>
                    <p className="text-gray-600 mt-1">{selectedEvent.description}</p>
                  </div>
                )}
                
                {selectedEvent.parent_name && (
                  <div className="text-sm">
                    <strong className="text-gray-700">{t('Project')}:</strong>
                    <span className="text-gray-600 ml-2">{selectedEvent.parent_name}</span>
                  </div>
                )}
                
                {selectedEvent.type === 'task' && selectedEvent.priority && (
                  <div className="flex items-center gap-2 text-sm">
                    <strong>{t('Priority')}:</strong>
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                      selectedEvent.priority.toLowerCase() === 'high' || selectedEvent.priority.toLowerCase() === 'critical' ? 'bg-red-50 text-red-700 ring-red-600/20' :
                      selectedEvent.priority.toLowerCase() === 'medium' ? 'bg-yellow-50 text-yellow-700 ring-yellow-600/20' :
                      selectedEvent.priority.toLowerCase() === 'low' ? 'bg-green-50 text-green-700 ring-green-600/20' :
                      'bg-gray-50 text-gray-700 ring-gray-600/20'
                    }`}>
                      {selectedEvent.priority}
                    </span>
                  </div>
                )}
                
                {selectedEvent.type === 'task' && selectedEvent.start_date && (
                  <div className="text-sm">
                    <strong className="text-gray-700">{t('Start Date')}:</strong>
                    <span className="text-gray-600 ml-2">{new Date(selectedEvent.start_date).toLocaleDateString()}</span>
                  </div>
                )}
                
                {selectedEvent.type === 'task' && selectedEvent.due_date && (
                  <div className="text-sm">
                    <strong className="text-gray-700">{t('Due Date')}:</strong>
                    <span className="text-gray-600 ml-2">{new Date(selectedEvent.due_date).toLocaleDateString()}</span>
                  </div>
                )}
                
                {selectedEvent.type === 'task' && selectedEvent.progress !== undefined && (
                  <div className="text-sm">
                    <strong className="text-gray-700">{t('Progress')}:</strong>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${selectedEvent.progress || 0}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-600">{selectedEvent.progress || 0}%</span>
                    </div>
                  </div>
                )}
                
                {/* Meeting URLs */}
                {selectedEvent.type === 'meeting' && (selectedEvent.join_url || selectedEvent.start_url) && (
                  <div className="space-y-3 pt-4 border-t">
                    <div className="text-sm font-medium text-gray-700">{t('Meeting URLs')}</div>
                    <div className="space-y-2">
                      {selectedEvent.join_url && (
                        <div className="space-y-1">
                          <div className="text-xs text-gray-500">{t('Join URL')}</div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 p-2 bg-gray-50 rounded text-xs font-mono text-gray-700 break-all">
                              {selectedEvent.join_url}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(selectedEvent.join_url);
                                toast.success(t('Join URL copied to clipboard'));
                              }}
                              className="text-blue-600 border-blue-200 hover:bg-blue-50 h-8 px-2 text-xs"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                      {selectedEvent.start_url && (
                        <div className="space-y-1">
                          <div className="text-xs text-gray-500">{t('Start URL')}</div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 p-2 bg-gray-50 rounded text-xs font-mono text-gray-700 break-all">
                              {selectedEvent.start_url}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(selectedEvent.start_url);
                                toast.success(t('Start URL copied to clipboard'));
                              }}
                              className="text-green-600 border-green-200 hover:bg-green-50 h-8 px-2 text-xs"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageTemplate>
  );
}