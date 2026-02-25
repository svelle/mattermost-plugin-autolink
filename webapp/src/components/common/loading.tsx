import React from 'react';

interface Props {
    theme: any;
}

const Loading: React.FC<Props> = ({theme}) => (
    <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '40px',
        color: theme?.centerChannelColor || '#333',
    }}>
        <span>{'Loading...'}</span>
    </div>
);

export default Loading;
