import React, {useState, useCallback} from 'react';
import {useSelector, useDispatch} from 'react-redux';

import {getTestResult} from '../../selectors';
import {testLink} from '../../actions';

interface Props {
    theme: any;
}

const LinkTest: React.FC<Props> = ({theme}) => {
    const dispatch = useDispatch();
    const testResult = useSelector(getTestResult);

    const [pattern, setPattern] = useState('');
    const [template, setTemplate] = useState('');
    const [sampleText, setSampleText] = useState('');
    const [wordMatch, setWordMatch] = useState(false);

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
        fontFamily: 'monospace',
    };

    const handleTest = useCallback(() => {
        if (pattern && sampleText) {
            dispatch(testLink(pattern, template, sampleText, wordMatch) as any);
        }
    }, [dispatch, pattern, template, sampleText, wordMatch]);

    return (
        <div style={{padding: '12px'}}>
            <h4 style={{margin: '0 0 12px', fontSize: '14px', fontWeight: 600}}>
                {'Pattern Tester'}
            </h4>

            <div style={{marginBottom: '8px'}}>
                <label style={{display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px'}}>
                    {'Pattern (regex)'}
                </label>
                <input
                    type="text"
                    value={pattern}
                    onChange={(e) => setPattern(e.target.value)}
                    placeholder="e.g., MM-(\\d+)"
                    style={inputStyle}
                />
            </div>

            <div style={{marginBottom: '8px'}}>
                <label style={{display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px'}}>
                    {'Template'}
                </label>
                <input
                    type="text"
                    value={template}
                    onChange={(e) => setTemplate(e.target.value)}
                    placeholder="e.g., [MM-$1](https://jira.example.com/MM-$1)"
                    style={inputStyle}
                />
            </div>

            <div style={{marginBottom: '8px'}}>
                <label style={{display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px'}}>
                    {'Sample Text'}
                </label>
                <textarea
                    value={sampleText}
                    onChange={(e) => setSampleText(e.target.value)}
                    placeholder="Enter text to test the pattern against..."
                    rows={3}
                    style={{...inputStyle, resize: 'vertical', fontFamily: 'inherit'}}
                />
            </div>

            <div style={{marginBottom: '12px'}}>
                <label style={{display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer'}}>
                    <input
                        type="checkbox"
                        checked={wordMatch}
                        onChange={(e) => setWordMatch(e.target.checked)}
                    />
                    {'Word Match'}
                </label>
            </div>

            <button
                onClick={handleTest}
                disabled={!pattern || !sampleText}
                style={{
                    padding: '8px 20px',
                    backgroundColor: pattern && sampleText ? activeColor : `${activeColor}50`,
                    color: theme?.buttonColor || '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: pattern && sampleText ? 'pointer' : 'default',
                    fontSize: '13px',
                    fontWeight: 600,
                    marginBottom: '12px',
                }}
            >
                {'Test'}
            </button>

            {testResult && (
                <div style={{
                    padding: '12px',
                    border: `1px solid ${borderColor}`,
                    borderRadius: '4px',
                    fontSize: '12px',
                    backgroundColor: theme?.centerChannelColor ? `${theme.centerChannelColor}08` : '#f9f9f9',
                }}>
                    {testResult.error ? (
                        <div style={{color: theme?.errorTextColor || '#D24B4E'}}>
                            {'Error: '}{testResult.error}
                        </div>
                    ) : (
                        <>
                            <div style={{marginBottom: '4px'}}>
                                <strong>{'Input: '}</strong>
                                <code>{testResult.input}</code>
                            </div>
                            <div>
                                <strong>{'Output: '}</strong>
                                <code>{testResult.output}</code>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default LinkTest;
