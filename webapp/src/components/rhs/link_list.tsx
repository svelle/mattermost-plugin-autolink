import React, {useEffect, useState, useCallback} from 'react';
import {useSelector, useDispatch} from 'react-redux';

import {getLinks, getLinksLoading, getEditingLink} from '../../selectors';
import {fetchLinks, deleteLink, createOrUpdateLink, setEditingLink} from '../../actions';
import {Autolink} from '../../types';
import Loading from '../common/loading';
import EmptyState from './empty_state';
import LinkForm from './link_form';

interface Props {
    theme: any;
}

const LinkList: React.FC<Props> = ({theme}) => {
    const dispatch = useDispatch();
    const links = useSelector(getLinks);
    const loading = useSelector(getLinksLoading);
    const editingLink = useSelector(getEditingLink);
    const [filter, setFilter] = useState('');
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

    useEffect(() => {
        dispatch(fetchLinks() as any);
    }, [dispatch]);

    const handleToggle = useCallback((link: Autolink) => {
        const updated = {...link, Disabled: !link.Disabled};
        dispatch(createOrUpdateLink(updated) as any);
    }, [dispatch]);

    const handleDelete = useCallback((name: string) => {
        dispatch(deleteLink(name) as any);
        setConfirmDelete(null);
    }, [dispatch]);

    const handleEdit = useCallback((link: Autolink) => {
        dispatch(setEditingLink(link) as any);
    }, [dispatch]);

    const handleAdd = useCallback(() => {
        dispatch(setEditingLink({
            Name: '',
            Disabled: false,
            Pattern: '',
            Template: '',
            Scope: [],
            WordMatch: false,
            DisableNonWordPrefix: false,
            DisableNonWordSuffix: false,
            ProcessBotPosts: false,
        }) as any);
    }, [dispatch]);

    if (editingLink) {
        return <LinkForm theme={theme}/>;
    }

    if (loading && links.length === 0) {
        return <Loading theme={theme}/>;
    }

    const borderColor = theme?.centerChannelColor ? `${theme.centerChannelColor}20` : '#ddd';
    const activeColor = theme?.buttonBg || '#166DE0';
    const dangerColor = theme?.errorTextColor || '#D24B4E';
    const successColor = theme?.onlineIndicator || '#3DB887';

    const filteredLinks = filter
        ? links.filter((l) =>
            l.Name.toLowerCase().includes(filter.toLowerCase()) ||
            l.Pattern.toLowerCase().includes(filter.toLowerCase()),
        )
        : links;

    return (
        <div style={{padding: '12px'}}>
            <div style={{display: 'flex', gap: '8px', marginBottom: '12px'}}>
                <input
                    type="text"
                    placeholder="Filter by name or pattern..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    style={{
                        flex: 1,
                        padding: '6px 10px',
                        border: `1px solid ${borderColor}`,
                        borderRadius: '4px',
                        fontSize: '13px',
                        backgroundColor: 'transparent',
                        color: theme?.centerChannelColor || '#333',
                        outline: 'none',
                    }}
                />
                <button
                    onClick={handleAdd}
                    style={{
                        padding: '6px 14px',
                        backgroundColor: activeColor,
                        color: theme?.buttonColor || '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                    }}
                >
                    {'+ Add Link'}
                </button>
            </div>

            {filteredLinks.length === 0 ? (
                <EmptyState
                    theme={theme}
                    title={filter ? 'No matching links' : 'No links configured'}
                    message={filter ? 'Try a different search term.' : 'Click "+ Add Link" to create your first autolink.'}
                />
            ) : (
                <div>
                    {filteredLinks.map((link) => (
                        <div
                            key={link.Name || link.Pattern}
                            style={{
                                padding: '10px 12px',
                                borderBottom: `1px solid ${borderColor}`,
                                opacity: link.Disabled ? 0.5 : 1,
                            }}
                        >
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '4px',
                            }}>
                                <span style={{
                                    fontWeight: 600,
                                    fontSize: '13px',
                                    textDecoration: link.Disabled ? 'line-through' : 'none',
                                }}>
                                    {link.Name || '(unnamed)'}
                                </span>
                                <div style={{display: 'flex', gap: '4px', alignItems: 'center'}}>
                                    <button
                                        onClick={() => handleToggle(link)}
                                        title={link.Disabled ? 'Enable' : 'Disable'}
                                        style={{
                                            padding: '2px 8px',
                                            border: `1px solid ${borderColor}`,
                                            borderRadius: '3px',
                                            background: 'none',
                                            cursor: 'pointer',
                                            fontSize: '11px',
                                            color: link.Disabled ? successColor : dangerColor,
                                        }}
                                    >
                                        {link.Disabled ? 'Enable' : 'Disable'}
                                    </button>
                                    <button
                                        onClick={() => handleEdit(link)}
                                        style={{
                                            padding: '2px 8px',
                                            border: `1px solid ${borderColor}`,
                                            borderRadius: '3px',
                                            background: 'none',
                                            cursor: 'pointer',
                                            fontSize: '11px',
                                            color: activeColor,
                                        }}
                                    >
                                        {'Edit'}
                                    </button>
                                    {confirmDelete === link.Name ? (
                                        <>
                                            <button
                                                onClick={() => handleDelete(link.Name)}
                                                style={{
                                                    padding: '2px 8px',
                                                    border: `1px solid ${dangerColor}`,
                                                    borderRadius: '3px',
                                                    backgroundColor: dangerColor,
                                                    cursor: 'pointer',
                                                    fontSize: '11px',
                                                    color: '#fff',
                                                }}
                                            >
                                                {'Confirm'}
                                            </button>
                                            <button
                                                onClick={() => setConfirmDelete(null)}
                                                style={{
                                                    padding: '2px 8px',
                                                    border: `1px solid ${borderColor}`,
                                                    borderRadius: '3px',
                                                    background: 'none',
                                                    cursor: 'pointer',
                                                    fontSize: '11px',
                                                    color: theme?.centerChannelColor,
                                                }}
                                            >
                                                {'Cancel'}
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={() => setConfirmDelete(link.Name)}
                                            style={{
                                                padding: '2px 8px',
                                                border: `1px solid ${borderColor}`,
                                                borderRadius: '3px',
                                                background: 'none',
                                                cursor: 'pointer',
                                                fontSize: '11px',
                                                color: dangerColor,
                                            }}
                                        >
                                            {'Delete'}
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div style={{fontSize: '12px', opacity: 0.7}}>
                                <div>
                                    <span style={{fontWeight: 500}}>{'Pattern: '}</span>
                                    <code style={{fontSize: '11px'}}>{link.Pattern || '(none)'}</code>
                                </div>
                                <div>
                                    <span style={{fontWeight: 500}}>{'Template: '}</span>
                                    <code style={{fontSize: '11px'}}>{link.Template || '(none)'}</code>
                                </div>
                                {link.Scope && link.Scope.length > 0 && (
                                    <div>
                                        <span style={{fontWeight: 500}}>{'Scope: '}</span>
                                        <span>{link.Scope.join(', ')}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LinkList;
