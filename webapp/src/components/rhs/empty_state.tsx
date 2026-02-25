import React from 'react';

interface Props {
    theme: any;
    title: string;
    message: string;
}

const EmptyState: React.FC<Props> = ({theme, title, message}) => (
    <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        textAlign: 'center',
        color: theme?.centerChannelColor || '#333',
    }}>
        <h4 style={{margin: '0 0 8px', fontWeight: 600}}>{title}</h4>
        <p style={{margin: 0, opacity: 0.7, fontSize: '13px'}}>{message}</p>
    </div>
);

export default EmptyState;
