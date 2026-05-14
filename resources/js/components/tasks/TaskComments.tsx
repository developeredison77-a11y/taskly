import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MessageSquare, MoreHorizontal, Edit, Trash2, Send } from 'lucide-react';
import { Task, TaskComment, User } from '@/types';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';

interface Props {
    task: Task;
    comments: TaskComment[];
    currentUser: User;
    onUpdate?: () => void;
    canAddComments?: boolean;
}

export default function TaskComments({ task, comments, currentUser, onUpdate, canAddComments = true }: Props) {
    const [newComment, setNewComment] = useState('');
    const [editingComment, setEditingComment] = useState<number | null>(null);
    const [editText, setEditText] = useState('');
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; commentId: number | null }>({ isOpen: false, commentId: null });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        router.post(route('task-comments.store', task.id), {
            comment: newComment,
            mentions: []
        }, {
            onSuccess: () => {
                setNewComment('');
                onUpdate?.();
            }
        });
    };

    const handleEdit = (comment: TaskComment) => {
        setEditingComment(comment.id);
        setEditText(comment.comment);
    };

    const handleUpdate = (commentId: number) => {
        router.put(route('task-comments.update', commentId), {
            comment: editText,
            mentions: []
        }, {
            onSuccess: () => {
                setEditingComment(null);
                setEditText('');
                onUpdate?.();
            }
        });
    };

    const handleDelete = (commentId: number) => {
        setDeleteModal({ isOpen: true, commentId });
    };

    const confirmDelete = () => {
        if (deleteModal.commentId) {
            router.delete(route('task-comments.destroy', deleteModal.commentId), {
                onSuccess: () => {
                    setDeleteModal({ isOpen: false, commentId: null });
                    onUpdate?.();
                }
            });
        }
    };

    return (
        <>
            <CrudDeleteModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, commentId: null })}
                onConfirm={confirmDelete}
                itemName="this comment"
                entityName="comment"
            />
            <div className="space-y-4">
            {/* Comments List */}
            <div className="space-y-3">
                {comments.map((comment) => (
                    <div key={comment.id} className="flex space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center space-x-2">
                                    <span className="text-sm font-medium">{comment.user?.name}</span>
                                    <span className="text-xs text-gray-500">
                                        {new Date(comment.created_at).toLocaleString()}
                                    </span>
                                </div>
                                {(comment.can_update || comment.can_delete) && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="z-[9999]">
                                            {comment.can_update && (
                                                <DropdownMenuItem onClick={() => handleEdit(comment)}>
                                                    <Edit className="h-4 w-4 mr-2" />
                                                    Edit
                                                </DropdownMenuItem>
                                            )}
                                            {comment.can_delete && (
                                                <DropdownMenuItem
                                                    onClick={() => handleDelete(comment.id)}
                                                    className="text-red-600"
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Delete
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                            </div>

                            {editingComment === comment.id ? (
                                <div className="space-y-2">
                                    <Textarea
                                        value={editText}
                                        onChange={(e) => setEditText(e.target.value)}
                                        rows={2}
                                    />
                                    <div className="flex space-x-2">
                                        <Button size="sm" onClick={() => handleUpdate(comment.id)}>
                                            Save
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setEditingComment(null)}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-700">{comment.comment}</p>
                            )}
                        </div>
                    </div>
                ))}

                {comments.length === 0 && (
                    <div className="text-center py-6 text-gray-500">
                        <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                        <p>No comments yet. Be the first to comment!</p>
                    </div>
                )}
            </div>

            {/* Add Comment Form */}
            {canAddComments && (
                <form onSubmit={handleSubmit} className="space-y-3">
                    <Textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        rows={3}
                    />
                    <div className="flex justify-end">
                        <Button type="submit" size="sm" disabled={!newComment.trim()}>
                            <Send className="h-4 w-4 mr-2" />
                            Post Comment
                        </Button>
                    </div>
                </form>
            )}
            </div>
        </>
    );
}