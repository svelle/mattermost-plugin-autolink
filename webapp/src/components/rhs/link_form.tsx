import React, {useState, useCallback} from 'react';
import {useSelector, useDispatch} from 'react-redux';

import {getEditingLink, getTestResult} from '../../selectors';
import {createOrUpdateLink, setEditingLink, testLink} from '../../actions';
import {Autolink} from '../../types';

interface Props {
    theme: any;
}

const LinkForm: React.FC<Props> = ({theme}) => {
    const dispatch = useDispatch();
    const editingLink = useSelector(getEditingLink);
    const testResult = useSelector(getTestResult);

    const isNew = !editingLink?.Name || editingLink.Name === '';

    const [form, setForm] = useState<Autolink>({
        Name: editingLink?.Name || '',
        Disabled: editingLink?.Disabled || false,
        Pattern: editingLink?.Pattern || '',
        Template: editingLink?.Template || '',
        Scope: editingLink?.Scope || [],
        WordMatch: editingLink?.WordMatch || false,
        DisableNonWordPrefix: editingLink?.DisableNonWordPrefix || false,
        DisableNonWordSuffix: editingLink?.DisableNonWordSuffix || false,
        ProcessBotPosts: editingLink?.ProcessBotPosts || false,
    });

    const [scopeText, setScopeText] = useState((editingLink?.Scope || []).join(', '));
    const [sampleText, setSampleText] = useState('');

    const borderColor = theme?.centerChannelColor ? `${theme.centerChannelColor}20` : '#ddd';
    const activeColor = theme?.buttonBg || '#166DE0';
    const textColor = theme?.centerChannelColor || '#333';

    const handleChange = useCallback((field: keyof Autolink, value: any) => {
        setForm((prev) => ({...prev, [field]: value}));
    }, []);

    const handleScopeChange = useCallback((text: string) => {
        setScopeText(text);
        const scopes = text.split(',').map((s) => s.trim()).filter(Boolean);
        setForm((prev) => ({...prev, Scope: scopes}));
    }, []);

    const handleSave = useCallback(() => {
        dispatch(createOrUpdateLink(form) as any);
    }, [dispatch, form]);

    const handleCancel = useCallback(() => {
        dispatch(setEditingLink(null) as any);
    }, [dispatch]);

    const handleTest = useCallback(() => {
        if (form.Pattern && sampleText) {
            dispatch(testLink(form.Pattern, form.Template, sampleText, form.WordMatch) as any);
        }
    }, [dispatch, form.Pattern, form.Template, form.WordMatch, sampleText]);

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

    const labelStyle: React.CSSProperties = {
        display: 'block',
        fontSize: '12px',
        fontWeight: 600,
        marginBottom: '4px',
        color: textColor,
    };

    const fieldStyle: React.CSSProperties = {
        marginBottom: '12px',
    };

    const toggleStyle = (enabled: boolean): React.CSSProperties => ({
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        cursor: 'pointer',
        fontSize: '12px',
        padding: '4px 0',
        color: textColor,
    });

    return (
        <div style={{padding: '12px'}}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
            }}>
                <h4 style={{margin: 0, fontSize: '14px', fontWeight: 600}}>
                    {isNew ? 'Add New Link' : `Edit: ${form.Name}`}
                </h4>
                <button
                    onClick={handleCancel}
                    style={{
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        fontSize: '13px',
                        color: textColor,
                        opacity: 0.7,
                    }}
                >
                    {'Back'}
                </button>
            </div>

            <div style={fieldStyle}>
                <label style={labelStyle}>{'Name'}</label>
                <input
                    type="text"
                    value={form.Name}
                    onChange={(e) => handleChange('Name', e.target.value)}
                    placeholder="e.g., Jira Tickets"
                    style={inputStyle}
                />
            </div>

            <div style={fieldStyle}>
                <label style={labelStyle}>{'Pattern (regex)'}</label>
                <input
                    type="text"
                    value={form.Pattern}
                    onChange={(e) => handleChange('Pattern', e.target.value)}
                    placeholder="e.g., MM-(\\d+)"
                    style={{...inputStyle, fontFamily: 'monospace'}}
                />
            </div>

            <div style={fieldStyle}>
                <label style={labelStyle}>{'Template'}</label>
                <input
                    type="text"
                    value={form.Template}
                    onChange={(e) => handleChange('Template', e.target.value)}
                    placeholder="e.g., [MM-$1](https://jira.example.com/browse/MM-$1)"
                    style={{...inputStyle, fontFamily: 'monospace'}}
                />
            </div>

            <div style={fieldStyle}>
                <label style={labelStyle}>{'Scope (comma-separated team or team/channel)'}</label>
                <input
                    type="text"
                    value={scopeText}
                    onChange={(e) => handleScopeChange(e.target.value)}
                    placeholder="e.g., myteam, myteam/town-square"
                    style={inputStyle}
                />
            </div>

            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px',
                marginBottom: '16px',
            }}>
                <label style={toggleStyle(form.WordMatch)}>
                    <input
                        type="checkbox"
                        checked={form.WordMatch}
                        onChange={(e) => handleChange('WordMatch', e.target.checked)}
                    />
                    {'Word Match'}
                </label>
                <label style={toggleStyle(form.ProcessBotPosts)}>
                    <input
                        type="checkbox"
                        checked={form.ProcessBotPosts}
                        onChange={(e) => handleChange('ProcessBotPosts', e.target.checked)}
                    />
                    {'Process Bot Posts'}
                </label>
                <label style={toggleStyle(form.DisableNonWordPrefix)}>
                    <input
                        type="checkbox"
                        checked={form.DisableNonWordPrefix}
                        onChange={(e) => handleChange('DisableNonWordPrefix', e.target.checked)}
                    />
                    {'Disable Non-Word Prefix'}
                </label>
                <label style={toggleStyle(form.DisableNonWordSuffix)}>
                    <input
                        type="checkbox"
                        checked={form.DisableNonWordSuffix}
                        onChange={(e) => handleChange('DisableNonWordSuffix', e.target.checked)}
                    />
                    {'Disable Non-Word Suffix'}
                </label>
            </div>

            {/* Test Section */}
            <div style={{
                padding: '12px',
                border: `1px solid ${borderColor}`,
                borderRadius: '4px',
                marginBottom: '16px',
                backgroundColor: theme?.centerChannelColor ? `${theme.centerChannelColor}08` : '#f9f9f9',
            }}>
                <label style={labelStyle}>{'Test Pattern'}</label>
                <div style={{display: 'flex', gap: '8px', marginBottom: '8px'}}>
                    <input
                        type="text"
                        value={sampleText}
                        onChange={(e) => setSampleText(e.target.value)}
                        placeholder="Enter sample text to test..."
                        style={{...inputStyle, flex: 1}}
                    />
                    <button
                        onClick={handleTest}
                        disabled={!form.Pattern || !sampleText}
                        style={{
                            padding: '6px 12px',
                            border: `1px solid ${borderColor}`,
                            borderRadius: '4px',
                            background: 'none',
                            cursor: form.Pattern && sampleText ? 'pointer' : 'default',
                            fontSize: '12px',
                            color: activeColor,
                            opacity: form.Pattern && sampleText ? 1 : 0.5,
                        }}
                    >
                        {'Test'}
                    </button>
                </div>
                {testResult && (
                    <div style={{fontSize: '12px'}}>
                        {testResult.error ? (
                            <div style={{color: theme?.errorTextColor || '#D24B4E'}}>
                                {'Error: '}{testResult.error}
                            </div>
                        ) : (
                            <>
                                <div><strong>{'Input: '}</strong><code>{testResult.input}</code></div>
                                <div><strong>{'Output: '}</strong><code>{testResult.output}</code></div>
                            </>
                        )}
                    </div>
                )}
            </div>

            <div style={{display: 'flex', gap: '8px'}}>
                <button
                    onClick={handleSave}
                    disabled={!form.Name}
                    style={{
                        padding: '8px 20px',
                        backgroundColor: form.Name ? activeColor : `${activeColor}50`,
                        color: theme?.buttonColor || '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: form.Name ? 'pointer' : 'default',
                        fontSize: '13px',
                        fontWeight: 600,
                    }}
                >
                    {isNew ? 'Create Link' : 'Save Changes'}
                </button>
                <button
                    onClick={handleCancel}
                    style={{
                        padding: '8px 20px',
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

export default LinkForm;
