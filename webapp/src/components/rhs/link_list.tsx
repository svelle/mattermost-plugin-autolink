import React, {useEffect, useState, useCallback} from 'react';
import {useSelector, useDispatch} from 'react-redux';

import {getLinks, getLinksLoading, getEditingLink} from '../../selectors';
import {fetchLinks, deleteLink, createOrUpdateLink, setEditingLink, importLinks} from '../../actions';
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
    const [showImport, setShowImport] = useState(false);
    const [importJson, setImportJson] = useState('');
    const [importResult, setImportResult] = useState<{imported: number; skipped: number; total: number} | null>(null);
    const [importError, setImportError] = useState<string | null>(null);

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

    const handleImport = useCallback(async () => {
        setImportError(null);
        setImportResult(null);

        if (!importJson.trim()) {
            setImportError('Please paste JSON content.');
            return;
        }

        // Validate JSON locally first
        try {
            JSON.parse(importJson);
        } catch {
            setImportError('Invalid JSON. Please check the format.');
            return;
        }

        const result = await (dispatch(importLinks(importJson) as any) as Promise<{imported: number; skipped: number; total: number} | null>);
        if (result) {
            setImportResult(result);
            setImportJson('');
            if (result.imported > 0) {
                setTimeout(() => {
                    setShowImport(false);
                    setImportResult(null);
                }, 3000);
            }
        } else {
            setImportError('Import failed. Check the JSON format and try again.');
        }
    }, [dispatch, importJson]);

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
    const textColor = theme?.centerChannelColor || '#333';

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
                        color: textColor,
                        outline: 'none',
                    }}
                />
                <button
                    onClick={() => {
                        setShowImport(!showImport);
                        setImportResult(null);
                        setImportError(null);
                    }}
                    style={{
                        padding: '6px 10px',
                        border: `1px solid ${borderColor}`,
                        borderRadius: '4px',
                        background: 'none',
                        cursor: 'pointer',
                        fontSize: '13px',
                        color: activeColor,
                        whiteSpace: 'nowrap',
                    }}
                >
                    {'Import'}
                </button>
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
                    {'+ Add'}
                </button>
            </div>

            {/* Import panel */}
            {showImport && (
                <div style={{
                    marginBottom: '12px',
                    padding: '10px',
                    border: `1px solid ${borderColor}`,
                    borderRadius: '4px',
                    backgroundColor: theme?.centerChannelColor ? `${theme.centerChannelColor}04` : '#fafafa',
                }}>
                    <label style={{display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px'}}>
                        {'Import from JSON'}
                    </label>
                    <p style={{margin: '0 0 8px', fontSize: '11px', opacity: 0.6}}>
                        {'Paste a plugin config JSON, or a raw array of link objects. Duplicates will be skipped.'}
                    </p>
                    <textarea
                        value={importJson}
                        onChange={(e) => {
                            setImportJson(e.target.value);
                            setImportError(null);
                            setImportResult(null);
                        }}
                        placeholder='{"links": [...]} or [{"Name": "...", "Pattern": "...", "Template": "..."}]'
                        rows={6}
                        style={{
                            width: '100%',
                            padding: '6px 10px',
                            border: `1px solid ${borderColor}`,
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontFamily: 'monospace',
                            backgroundColor: 'transparent',
                            color: textColor,
                            outline: 'none',
                            boxSizing: 'border-box',
                            resize: 'vertical',
                            marginBottom: '8px',
                        }}
                    />
                    {importError && (
                        <div style={{
                            marginBottom: '8px',
                            padding: '6px 8px',
                            borderRadius: '3px',
                            fontSize: '12px',
                            color: dangerColor,
                            backgroundColor: `${dangerColor}15`,
                        }}>
                            {importError}
                        </div>
                    )}
                    {importResult && (
                        <div style={{
                            marginBottom: '8px',
                            padding: '6px 8px',
                            borderRadius: '3px',
                            fontSize: '12px',
                            color: successColor,
                            backgroundColor: `${successColor}15`,
                        }}>
                            {`Imported ${importResult.imported} link${importResult.imported !== 1 ? 's' : ''}`}
                            {importResult.skipped > 0 && `, skipped ${importResult.skipped} duplicate${importResult.skipped !== 1 ? 's' : ''}`}
                            {'.'}
                        </div>
                    )}
                    <div style={{display: 'flex', gap: '8px'}}>
                        <button
                            onClick={handleImport}
                            disabled={!importJson.trim()}
                            style={{
                                padding: '5px 14px',
                                backgroundColor: importJson.trim() ? activeColor : `${activeColor}50`,
                                color: theme?.buttonColor || '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: importJson.trim() ? 'pointer' : 'default',
                                fontSize: '12px',
                                fontWeight: 600,
                            }}
                        >
                            {'Import'}
                        </button>
                        <button
                            onClick={() => {
                                setShowImport(false);
                                setImportJson('');
                                setImportResult(null);
                                setImportError(null);
                            }}
                            style={{
                                padding: '5px 14px',
                                border: `1px solid ${borderColor}`,
                                borderRadius: '4px',
                                background: 'none',
                                cursor: 'pointer',
                                fontSize: '12px',
                                color: textColor,
                            }}
                        >
                            {'Cancel'}
                        </button>
                    </div>
                </div>
            )}

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
