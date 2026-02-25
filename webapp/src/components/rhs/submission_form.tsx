import React, {useState, useCallback} from 'react';
import {useDispatch} from 'react-redux';

import {createSubmission} from '../../actions';

interface Props {
    theme: any;
}

const SubmissionForm: React.FC<Props> = ({theme}) => {
    const dispatch = useDispatch();
    const [description, setDescription] = useState('');
    const [pattern, setPattern] = useState('');
    const [template, setTemplate] = useState('');
    const [showOptional, setShowOptional] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const borderColor = theme?.centerChannelColor ? `${theme.centerChannelColor}20` : '#ddd';
    const activeColor = theme?.buttonBg || '#166DE0';
    const textColor = theme?.centerChannelColor || '#333';
    const successColor = theme?.onlineIndicator || '#3DB887';

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
            setSubmitted(true);
            setTimeout(() => setSubmitted(false), 3000);
        }
    }, [dispatch, description, pattern, template]);

    return (
        <div style={{padding: '12px'}}>
            <h4 style={{margin: '0 0 4px', fontSize: '14px', fontWeight: 600}}>
                {'Submit Autolink Request'}
            </h4>
            <p style={{margin: '0 0 16px', fontSize: '12px', opacity: 0.7}}>
                {'Describe the autolink pattern you\'d like an admin to add.'}
            </p>

            {submitted && (
                <div style={{
                    padding: '8px 12px',
                    marginBottom: '12px',
                    backgroundColor: `${successColor}15`,
                    color: successColor,
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 600,
                }}>
                    {'Request submitted successfully! Admins have been notified.'}
                </div>
            )}

            <div style={{marginBottom: '12px'}}>
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

            <button
                onClick={() => setShowOptional(!showOptional)}
                style={{
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    fontSize: '12px',
                    color: activeColor,
                    padding: '0',
                    marginBottom: '12px',
                }}
            >
                {showOptional ? '- Hide optional fields' : '+ Add pattern/template (optional)'}
            </button>

            {showOptional && (
                <>
                    <div style={{marginBottom: '12px'}}>
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
                </>
            )}

            <button
                onClick={handleSubmit}
                disabled={!description.trim()}
                style={{
                    padding: '8px 20px',
                    backgroundColor: description.trim() ? activeColor : `${activeColor}50`,
                    color: theme?.buttonColor || '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: description.trim() ? 'pointer' : 'default',
                    fontSize: '13px',
                    fontWeight: 600,
                }}
            >
                {'Submit Request'}
            </button>
        </div>
    );
};

export default SubmissionForm;
