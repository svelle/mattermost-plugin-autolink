import React, {useEffect} from 'react';
import {useSelector, useDispatch} from 'react-redux';

import {getSubmissions, getSubmissionsLoading} from '../../selectors';
import {fetchSubmissions} from '../../actions';
import {Submission} from '../../types';
import Loading from '../common/loading';
import EmptyState from './empty_state';

interface Props {
    theme: any;
}

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

const SubmissionCard: React.FC<{submission: Submission; theme: any}> = ({submission, theme}) => {
    const borderColor = theme?.centerChannelColor ? `${theme.centerChannelColor}20` : '#ddd';
    const badge = getStatusBadge(submission.status, theme);

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
                <span style={{
                    fontSize: '11px',
                    opacity: 0.6,
                }}>
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
                    <span style={{fontWeight: 500}}>{'Admin note: '}</span>
                    {submission.status_note}
                </div>
            )}
        </div>
    );
};

const SubmissionList: React.FC<Props> = ({theme}) => {
    const dispatch = useDispatch();
    const submissions = useSelector(getSubmissions);
    const loading = useSelector(getSubmissionsLoading);

    useEffect(() => {
        dispatch(fetchSubmissions() as any);
    }, [dispatch]);

    if (loading && submissions.length === 0) {
        return <Loading theme={theme}/>;
    }

    if (submissions.length === 0) {
        return (
            <EmptyState
                theme={theme}
                title="No requests yet"
                message='Use the "Submit Request" tab to submit an autolink request.'
            />
        );
    }

    // Sort by submission time (newest first)
    const sorted = [...submissions].sort((a, b) => b.submitted_at - a.submitted_at);

    return (
        <div>
            {sorted.map((sub) => (
                <SubmissionCard key={sub.id} submission={sub} theme={theme}/>
            ))}
        </div>
    );
};

export default SubmissionList;
