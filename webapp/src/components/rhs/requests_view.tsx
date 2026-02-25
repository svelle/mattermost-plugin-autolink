import React, {useEffect, useState, useCallback} from 'react';
import {useSelector, useDispatch} from 'react-redux';

import {getSubmissions, getSubmissionsLoading, isAdmin as isAdminSelector, getTestResult} from '../../selectors';
import {fetchSubmissions, createSubmission, updateSubmission, testLink} from '../../actions';
import {Submission, TestResult} from '../../types';
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

// Inline new-request form (collapsible)
const NewRequestForm: React.FC<{theme: any; onDone: () => void}> = ({theme, onDone}) => {
    const dispatch = useDispatch();
    const testResult = useSelector(getTestResult);
    const [description, setDescription] = useState('');
    const [pattern, setPattern] = useState('');
    const [template, setTemplate] = useState('');
    const [showOptional, setShowOptional] = useState(false);
    const [sampleText, setSampleText] = useState('');

    const borderColor = theme?.centerChannelColor ? `${theme.centerChannelColor}20` : '#ddd';
    const activeColor = theme?.buttonBg || '#166DE0';
    const textColor = theme?.centerChannelColor || '#333';

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '6px 10px',
        border: `1px solid ${borderColor}`,
        borderRadius: '4px',
        fontSize: '13px',
        backgroundColor: 'transparent',
        color: textColor,
        outline: 'none',
        boxSizing: 'border-box',
    };

    const handleSubmit = useCallback(async () => {
        const success = await (dispatch(createSubmission(
            description,
            pattern || undefined,
            template || undefined,
        ) as any) as Promise<boolean>);
        if (success) {
            setDescription('');
            setPattern('');
            setTemplate('');
            setShowOptional(false);
            setSampleText('');
            onDone();
        }
    }, [dispatch, description, pattern, template, onDone]);

    const handleTest = useCallback(() => {
        if (pattern && sampleText) {
            dispatch(testLink(pattern, template, sampleText, false) as any);
        }
    }, [dispatch, pattern, template, sampleText]);

    return (
        <div style={{padding: '12px', borderBottom: `1px solid ${borderColor}`}}>
            <div style={{marginBottom: '10px'}}>
                <label style={{display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px'}}>
                    {'Description *'}
                </label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g., Replace Jira ticket numbers (MM-1234) with links to our Jira instance"
                    rows={3}
                    style={{...inputStyle, resize: 'vertical'}}
                />
            </div>

            <div style={{marginBottom: '12px'}}>
                <button
                    onClick={() => setShowOptional(!showOptional)}
                    style={{
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        fontSize: '12px',
                        color: activeColor,
                        padding: '0',
                    }}
                >
                    {showOptional ? '- Hide optional fields' : '+ Add pattern/template (optional)'}
                </button>
            </div>

            {showOptional && (
                <>
                    <div style={{marginBottom: '10px'}}>
                        <label style={{display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px'}}>
                            {'Pattern (regex)'}
                        </label>
                        <input
                            type="text"
                            value={pattern}
                            onChange={(e) => setPattern(e.target.value)}
                            placeholder="e.g., MM-(\\d+)"
                            style={{...inputStyle, fontFamily: 'monospace'}}
                        />
                    </div>

                    <div style={{marginBottom: '12px'}}>
                        <label style={{display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px'}}>
                            {'Template'}
                        </label>
                        <input
                            type="text"
                            value={template}
                            onChange={(e) => setTemplate(e.target.value)}
                            placeholder="e.g., [MM-$1](https://jira.example.com/browse/MM-$1)"
                            style={{...inputStyle, fontFamily: 'monospace'}}
                        />
                    </div>

                    {/* Inline pattern tester */}
                    {pattern.trim() && (
                        <div style={{
                            marginBottom: '12px',
                            padding: '10px',
                            border: `1px solid ${borderColor}`,
                            borderRadius: '4px',
                            backgroundColor: theme?.centerChannelColor ? `${theme.centerChannelColor}04` : '#fafafa',
                        }}>
                            <label style={{display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px'}}>
                                {'Test your pattern'}
                            </label>
                            <div style={{display: 'flex', gap: '6px', marginBottom: '6px'}}>
                                <input
                                    type="text"
                                    value={sampleText}
                                    onChange={(e) => setSampleText(e.target.value)}
                                    placeholder="Enter sample text..."
                                    style={{...inputStyle, flex: 1}}
                                />
                                <button
                                    onClick={handleTest}
                                    disabled={!sampleText.trim()}
                                    style={{
                                        padding: '4px 12px',
                                        backgroundColor: sampleText.trim() ? activeColor : `${activeColor}50`,
                                        color: theme?.buttonColor || '#fff',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: sampleText.trim() ? 'pointer' : 'default',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {'Test'}
                                </button>
                            </div>
                            {testResult && (
                                <div style={{
                                    fontSize: '12px',
                                    padding: '6px 8px',
                                    borderRadius: '3px',
                                    backgroundColor: theme?.centerChannelColor ? `${theme.centerChannelColor}08` : '#f5f5f5',
                                }}>
                                    {testResult.error ? (
                                        <div style={{color: theme?.errorTextColor || '#D24B4E'}}>
                                            {testResult.error}
                                        </div>
                                    ) : (
                                        <>
                                            <div style={{marginBottom: '2px'}}>
                                                <span style={{fontWeight: 500}}>{'In: '}</span>
                                                <code style={{fontSize: '11px'}}>{testResult.input}</code>
                                            </div>
                                            <div>
                                                <span style={{fontWeight: 500}}>{'Out: '}</span>
                                                <code style={{fontSize: '11px'}}>{testResult.output}</code>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            <div style={{display: 'flex', gap: '8px'}}>
                <button
                    onClick={handleSubmit}
                    disabled={!description.trim()}
                    style={{
                        padding: '6px 16px',
                        backgroundColor: description.trim() ? activeColor : `${activeColor}50`,
                        color: theme?.buttonColor || '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: description.trim() ? 'pointer' : 'default',
                        fontSize: '13px',
                        fontWeight: 600,
                    }}
                >
                    {'Submit'}
                </button>
                <button
                    onClick={onDone}
                    style={{
                        padding: '6px 16px',
                        border: `1px solid ${borderColor}`,
                        borderRadius: '4px',
                        background: 'none',
                        cursor: 'pointer',
                        fontSize: '13px',
                        color: textColor,
                    }}
                >
                    {'Cancel'}
                </button>
            </div>
        </div>
    );
};

// Submission card shown in the list
const SubmissionCard: React.FC<{
    submission: Submission;
    theme: any;
    showAdmin: boolean;
    onApprove?: (id: string, note: string) => void;
    onReject?: (id: string, note: string) => void;
}> = ({submission, theme, showAdmin, onApprove, onReject}) => {
    const [showNoteInput, setShowNoteInput] = useState<'approve' | 'reject' | null>(null);
    const [note, setNote] = useState('');

    const borderColor = theme?.centerChannelColor ? `${theme.centerChannelColor}20` : '#ddd';
    const successColor = theme?.onlineIndicator || '#3DB887';
    const dangerColor = theme?.errorTextColor || '#D24B4E';
    const badge = getStatusBadge(submission.status, theme);

    const handleAction = useCallback((action: 'approve' | 'reject') => {
        if (action === 'approve' && onApprove) {
            onApprove(submission.id, note);
        } else if (action === 'reject' && onReject) {
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
                <span style={{fontSize: '11px', opacity: 0.6}}>
                    {showAdmin && <span style={{fontWeight: 600, opacity: 1}}>{'@'}{submission.username}{' \u00B7 '}</span>}
                    {formatDate(submission.submitted_at)}
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

            {showAdmin && submission.status === 'pending' && (
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

const RequestsView: React.FC<Props> = ({theme}) => {
    const dispatch = useDispatch();
    const submissions = useSelector(getSubmissions);
    const loading = useSelector(getSubmissionsLoading);
    const admin = useSelector(isAdminSelector);
    const [showForm, setShowForm] = useState(false);
    const [statusFilter, setStatusFilter] = useState('');
    const [successMessage, setSuccessMessage] = useState(false);

    const borderColor = theme?.centerChannelColor ? `${theme.centerChannelColor}20` : '#ddd';
    const activeColor = theme?.buttonBg || '#166DE0';
    const successColor = theme?.onlineIndicator || '#3DB887';

    useEffect(() => {
        dispatch(fetchSubmissions() as any);
    }, [dispatch]);

    const handleApprove = useCallback((id: string, note: string) => {
        dispatch(updateSubmission(id, 'implemented', note) as any);
    }, [dispatch]);

    const handleReject = useCallback((id: string, note: string) => {
        dispatch(updateSubmission(id, 'rejected', note) as any);
    }, [dispatch]);

    const handleFormDone = useCallback(() => {
        setShowForm(false);
        setSuccessMessage(true);
        dispatch(fetchSubmissions() as any);
        setTimeout(() => setSuccessMessage(false), 3000);
    }, [dispatch]);

    const filteredSubmissions = statusFilter
        ? submissions.filter((s) => s.status === statusFilter)
        : submissions;

    const sorted = [...filteredSubmissions].sort((a, b) => b.submitted_at - a.submitted_at);

    const pendingCount = submissions.filter((s) => s.status === 'pending').length;

    return (
        <div>
            {/* Header bar with New Request button */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 12px',
                borderBottom: `1px solid ${borderColor}`,
            }}>
                <span style={{fontSize: '13px', fontWeight: 600}}>
                    {'Requests'}
                    {admin && pendingCount > 0 && (
                        <span style={{
                            marginLeft: '6px',
                            padding: '1px 7px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#fff',
                            backgroundColor: activeColor,
                        }}>
                            {pendingCount}
                        </span>
                    )}
                </span>
                {!showForm && (
                    <button
                        onClick={() => setShowForm(true)}
                        style={{
                            padding: '4px 12px',
                            backgroundColor: activeColor,
                            color: theme?.buttonColor || '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 600,
                        }}
                    >
                        {'+ New Request'}
                    </button>
                )}
            </div>

            {/* Success banner */}
            {successMessage && (
                <div style={{
                    padding: '8px 12px',
                    backgroundColor: `${successColor}15`,
                    color: successColor,
                    fontSize: '12px',
                    fontWeight: 600,
                }}>
                    {'Request submitted! Admins have been notified.'}
                </div>
            )}

            {/* Inline form */}
            {showForm && (
                <NewRequestForm theme={theme} onDone={handleFormDone}/>
            )}

            {/* Filter pills (admin sees status filters) */}
            {admin && submissions.length > 0 && (
                <div style={{
                    display: 'flex',
                    padding: '8px 12px',
                    gap: '4px',
                    borderBottom: `1px solid ${borderColor}`,
                    flexWrap: 'wrap',
                }}>
                    {STATUS_FILTERS.map((filter) => {
                        const isActive = filter.id === statusFilter;
                        const count = filter.id === ''
                            ? submissions.length
                            : submissions.filter((s) => s.status === filter.id).length;
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
                                {` (${count})`}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Submission list */}
            {loading && submissions.length === 0 ? (
                <Loading theme={theme}/>
            ) : sorted.length === 0 ? (
                <EmptyState
                    theme={theme}
                    title={statusFilter ? 'No matching requests' : 'No requests yet'}
                    message={statusFilter ? `No ${statusFilter} requests.` : 'Click "+ New Request" to submit an autolink request.'}
                />
            ) : (
                sorted.map((sub) => (
                    <SubmissionCard
                        key={sub.id}
                        submission={sub}
                        theme={theme}
                        showAdmin={admin}
                        onApprove={handleApprove}
                        onReject={handleReject}
                    />
                ))
            )}
        </div>
    );
};

export default RequestsView;
