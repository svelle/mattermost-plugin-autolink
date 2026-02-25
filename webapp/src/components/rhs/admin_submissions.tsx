import React, {useEffect, useState, useCallback} from 'react';
import {useSelector, useDispatch} from 'react-redux';

import {getSubmissions, getSubmissionsLoading} from '../../selectors';
import {fetchSubmissions, updateSubmission} from '../../actions';
import {Submission} from '../../types';
import Loading from '../common/loading';
import EmptyState from './empty_state';

interface Props {
    theme: any;
}

const STATUS_FILTERS = [
    {id: '', label: 'All'},
    {id: 'pending', label: 'Pending'},
    {id: 'implemented', label: 'Implemented'},
    {id: 'rejected', label: 'Rejected'},
];

function formatDate(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function getStatusBadge(status: string, theme: any): {label: string; color: string; bg: string} {
    switch (status) {
    case 'pending':
        return {
            label: 'Pending',
            color: theme?.awayIndicator || '#FFBC1F',
            bg: `${theme?.awayIndicator || '#FFBC1F'}20`,
        };
    case 'implemented':
        return {
            label: 'Implemented',
            color: theme?.onlineIndicator || '#3DB887',
            bg: `${theme?.onlineIndicator || '#3DB887'}20`,
        };
    case 'rejected':
        return {
            label: 'Rejected',
            color: theme?.errorTextColor || '#D24B4E',
            bg: `${theme?.errorTextColor || '#D24B4E'}20`,
        };
    default:
        return {
            label: status,
            color: theme?.centerChannelColor || '#333',
            bg: `${theme?.centerChannelColor || '#333'}20`,
        };
    }
}

const AdminSubmissionCard: React.FC<{
    submission: Submission;
    theme: any;
    onApprove: (id: string, note: string) => void;
    onReject: (id: string, note: string) => void;
}> = ({submission, theme, onApprove, onReject}) => {
    const [showNoteInput, setShowNoteInput] = useState<'approve' | 'reject' | null>(null);
    const [note, setNote] = useState('');

    const borderColor = theme?.centerChannelColor ? `${theme.centerChannelColor}20` : '#ddd';
    const successColor = theme?.onlineIndicator || '#3DB887';
    const dangerColor = theme?.errorTextColor || '#D24B4E';
    const badge = getStatusBadge(submission.status, theme);

    const handleAction = useCallback((action: 'approve' | 'reject') => {
        if (action === 'approve') {
            onApprove(submission.id, note);
        } else {
            onReject(submission.id, note);
        }
        setShowNoteInput(null);
        setNote('');
    }, [submission.id, note, onApprove, onReject]);

    return (
        <div style={{
            padding: '10px 12px',
            borderBottom: `1px solid ${borderColor}`,
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '4px',
            }}>
                <span style={{fontSize: '12px', fontWeight: 600}}>
                    {'@'}{submission.username}
                </span>
                <span style={{
                    padding: '1px 8px',
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: badge.color,
                    backgroundColor: badge.bg,
                }}>
                    {badge.label}
                </span>
            </div>
            <div style={{fontSize: '11px', opacity: 0.6, marginBottom: '4px'}}>
                {formatDate(submission.submitted_at)}
            </div>
            <div style={{fontSize: '13px', marginBottom: '4px'}}>
                {submission.description}
            </div>
            {submission.pattern && (
                <div style={{fontSize: '11px', opacity: 0.7}}>
                    <span style={{fontWeight: 500}}>{'Pattern: '}</span>
                    <code>{submission.pattern}</code>
                </div>
            )}
            {submission.template && (
                <div style={{fontSize: '11px', opacity: 0.7}}>
                    <span style={{fontWeight: 500}}>{'Template: '}</span>
                    <code>{submission.template}</code>
                </div>
            )}
            {submission.status_note && (
                <div style={{
                    fontSize: '11px',
                    marginTop: '4px',
                    padding: '4px 8px',
                    borderRadius: '3px',
                    backgroundColor: theme?.centerChannelColor ? `${theme.centerChannelColor}08` : '#f5f5f5',
                }}>
                    <span style={{fontWeight: 500}}>{'Note: '}</span>
                    {submission.status_note}
                </div>
            )}

            {submission.status === 'pending' && (
                <div style={{marginTop: '8px'}}>
                    {showNoteInput ? (
                        <div>
                            <input
                                type="text"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="Optional note..."
                                style={{
                                    width: '100%',
                                    padding: '4px 8px',
                                    border: `1px solid ${borderColor}`,
                                    borderRadius: '3px',
                                    fontSize: '12px',
                                    marginBottom: '6px',
                                    backgroundColor: 'transparent',
                                    color: theme?.centerChannelColor,
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                }}
                            />
                            <div style={{display: 'flex', gap: '4px'}}>
                                <button
                                    onClick={() => handleAction(showNoteInput)}
                                    style={{
                                        padding: '3px 10px',
                                        border: 'none',
                                        borderRadius: '3px',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        color: '#fff',
                                        backgroundColor: showNoteInput === 'approve' ? successColor : dangerColor,
                                    }}
                                >
                                    {showNoteInput === 'approve' ? 'Approve' : 'Reject'}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowNoteInput(null);
                                        setNote('');
                                    }}
                                    style={{
                                        padding: '3px 10px',
                                        border: `1px solid ${borderColor}`,
                                        borderRadius: '3px',
                                        fontSize: '11px',
                                        background: 'none',
                                        cursor: 'pointer',
                                        color: theme?.centerChannelColor,
                                    }}
                                >
                                    {'Cancel'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div style={{display: 'flex', gap: '4px'}}>
                            <button
                                onClick={() => setShowNoteInput('approve')}
                                style={{
                                    padding: '3px 10px',
                                    border: `1px solid ${successColor}`,
                                    borderRadius: '3px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    background: 'none',
                                    cursor: 'pointer',
                                    color: successColor,
                                }}
                            >
                                {'Approve'}
                            </button>
                            <button
                                onClick={() => setShowNoteInput('reject')}
                                style={{
                                    padding: '3px 10px',
                                    border: `1px solid ${dangerColor}`,
                                    borderRadius: '3px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    background: 'none',
                                    cursor: 'pointer',
                                    color: dangerColor,
                                }}
                            >
                                {'Reject'}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const AdminSubmissions: React.FC<Props> = ({theme}) => {
    const dispatch = useDispatch();
    const submissions = useSelector(getSubmissions);
    const loading = useSelector(getSubmissionsLoading);
    const [statusFilter, setStatusFilter] = useState('');

    useEffect(() => {
        dispatch(fetchSubmissions() as any);
    }, [dispatch]);

    const handleApprove = useCallback((id: string, note: string) => {
        dispatch(updateSubmission(id, 'implemented', note) as any);
    }, [dispatch]);

    const handleReject = useCallback((id: string, note: string) => {
        dispatch(updateSubmission(id, 'rejected', note) as any);
    }, [dispatch]);

    if (loading && submissions.length === 0) {
        return <Loading theme={theme}/>;
    }

    const borderColor = theme?.centerChannelColor ? `${theme.centerChannelColor}20` : '#ddd';
    const activeColor = theme?.buttonBg || '#166DE0';

    const filteredSubmissions = statusFilter
        ? submissions.filter((s) => s.status === statusFilter)
        : submissions;

    const sorted = [...filteredSubmissions].sort((a, b) => b.submitted_at - a.submitted_at);

    return (
        <div>
            {/* Status filter bar */}
            <div style={{
                display: 'flex',
                padding: '8px 12px',
                gap: '4px',
                borderBottom: `1px solid ${borderColor}`,
            }}>
                {STATUS_FILTERS.map((filter) => {
                    const isActive = filter.id === statusFilter;
                    return (
                        <button
                            key={filter.id}
                            onClick={() => setStatusFilter(filter.id)}
                            style={{
                                padding: '3px 10px',
                                border: `1px solid ${isActive ? activeColor : borderColor}`,
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: isActive ? 600 : 400,
                                background: isActive ? `${activeColor}15` : 'none',
                                cursor: 'pointer',
                                color: isActive ? activeColor : theme?.centerChannelColor,
                            }}
                        >
                            {filter.label}
                            {filter.id === '' && ` (${submissions.length})`}
                            {filter.id === 'pending' && ` (${submissions.filter((s) => s.status === 'pending').length})`}
                        </button>
                    );
                })}
            </div>

            {sorted.length === 0 ? (
                <EmptyState
                    theme={theme}
                    title="No submissions"
                    message={statusFilter ? `No ${statusFilter} submissions.` : 'No submissions have been made yet.'}
                />
            ) : (
                sorted.map((sub) => (
                    <AdminSubmissionCard
                        key={sub.id}
                        submission={sub}
                        theme={theme}
                        onApprove={handleApprove}
                        onReject={handleReject}
                    />
                ))
            )}
        </div>
    );
};

export default AdminSubmissions;
