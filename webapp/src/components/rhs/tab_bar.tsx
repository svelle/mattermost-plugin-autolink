import React from 'react';

export interface Tab {
    id: string;
    label: string;
}

interface Props {
    tabs: Tab[];
    activeTab: string;
    onTabChange: (tabId: string) => void;
    theme: any;
}

const TabBar: React.FC<Props> = ({tabs, activeTab, onTabChange, theme}) => {
    const bgColor = theme?.centerChannelBg || '#fff';
    const textColor = theme?.centerChannelColor || '#333';
    const activeColor = theme?.buttonBg || '#166DE0';
    const borderColor = theme?.centerChannelColor ? `${theme.centerChannelColor}20` : '#ddd';

    return (
        <div style={{
            display: 'flex',
            borderBottom: `1px solid ${borderColor}`,
            backgroundColor: bgColor,
            paddingLeft: '8px',
            overflowX: 'auto',
        }}>
            {tabs.map((tab) => {
                const isActive = tab.id === activeTab;
                return (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        style={{
                            padding: '10px 14px',
                            border: 'none',
                            borderBottom: isActive ? `2px solid ${activeColor}` : '2px solid transparent',
                            background: 'none',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: isActive ? 600 : 400,
                            color: isActive ? activeColor : textColor,
                            opacity: isActive ? 1 : 0.7,
                            whiteSpace: 'nowrap',
                            transition: 'all 0.15s ease',
                        }}
                    >
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
};

export default TabBar;
