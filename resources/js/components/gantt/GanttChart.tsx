import React, { useEffect, useRef } from 'react';

interface Task {
    id: string;
    name: string;
    start: string;
    end: string;
    progress: number;
    custom_class?: string;
    extra?: {
        priority: string;
        comments: number;
        duration: string;
    };
}

interface GanttChartProps {
    tasks: Task[];
    viewMode?: string;
    onDateChange?: (task: Task, start: Date, end: Date) => void;
}

const GanttChart: React.FC<GanttChartProps> = ({ tasks, viewMode = 'Week', onDateChange }) => {
    const ganttRef = useRef<HTMLDivElement>(null);
    const ganttInstance = useRef<any>(null);

    useEffect(() => {
        if (ganttRef.current && tasks.length > 0 && (window as any).Gantt) {
            if (ganttInstance.current) {
                ganttInstance.current = null;
            }

            ganttRef.current.innerHTML = '';

            // Debug: Log container dimensions
            const container = ganttRef.current.parentElement;

            ganttInstance.current = new (window as any).Gantt(ganttRef.current, tasks, {
                view_mode: viewMode,
                column_width: 50, // Increase column width to make chart wider
                custom_popup_html: function(task: Task) {
                    let status_class = 'success';
                    if (task.custom_class == 'medium') {
                        status_class = 'info';
                    } else if (task.custom_class == 'high') {
                        status_class = 'danger';
                    }
                    
                    return `<div class="details-container">
                                <div class="title">${task.name}</div>
                                <div class="subtitle">
                                    <b>${task.progress}%</b> Progress <br>
                                    <b>${task.extra?.comments || 0}</b> Comments <br>
                                    <b>Duration:</b> ${task.extra?.duration || 'No dates set'} <br>
                                    <b>Status:</b><span class="badge badge-${status_class}">${task.extra?.priority || 'Low'}</span>
                                </div>
                            </div>`;
                },
                on_date_change: function(task: Task, start: Date, end: Date) {
                    if (onDateChange) {
                        onDateChange(task, start, end);
                    }
                }
            });
        }
    }, [tasks, viewMode, onDateChange]);

    useEffect(() => {
        if (ganttInstance.current && ganttInstance.current.change_view_mode) {
            ganttInstance.current.change_view_mode(viewMode);
        }
    }, [viewMode]);

    return (
        <div 
            ref={ganttRef} 
            className="gantt-target" 
            style={{ minWidth: '1500px', width: 'auto' }}
        />
    );
};

export default GanttChart;