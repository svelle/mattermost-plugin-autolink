import React, {useEffect, useMemo} from 'react';
import {useSelector, useDispatch} from 'react-redux';

import {
    getUserRole,
    getActiveTab,
    getError,
    isAdmin as isAdminSelector,
    isSubmissionsEnabled as isSubmissionsEnabledSelector,
} from '../../selectors';
import {fetchUserRole, setActiveTab, clearError} from '../../actions';
import {
    TAB_SUBMIT,
    TAB_MY_REQUESTS,
    TAB_MANAGE_LINKS,
    TAB_REVIEW_REQUESTS,
} from '../../constants';

import TabBar, {Tab} from './tab_bar';
import LinkList from './link_list';
import LinkForm from './link_form';
import SubmissionForm from './submission_form';
import SubmissionList from './submission_list';
import AdminSubmissions from './admin_submissions';

interface Props {
    theme: any;
    store?: any;
}

const RHSView: React.FC<Props> = ({theme}) => {
    const dispatch = useDispatch();
    const role = useSelector(getUserRole);
    const activeTab = useSelector(getActiveTab);
    const admin = useSelector(isAdminSelector);
    const submissionsEnabled = useSelector(isSubmissionsEnabledSelector);
    const error = useSelector(getError);

    useEffect(() => {
        dispatch(fetchUserRole() as any);
    }, [dispatch]);

    const tabs = useMemo(() => {
        const t: Tab[] = [];
        if (submissionsEnabled) {
            t.push({id: TAB_SUBMIT, label: 'Submit Request'});
            t.push({id: TAB_MY_REQUESTS, label: 'My Requests'});
        }
        if (admin) {
            t.push({id: TAB_MANAGE_LINKS, label: 'Manage Links'});
            if (submissionsEnabled) {
                t.push({id: TAB_REVIEW_REQUESTS, label: 'Review Requests'});
            }
        }
        // If no tabs available (submissions disabled, not admin), show a default
        if (t.length === 0) {
            t.push({id: TAB_MANAGE_LINKS, label: 'Links'});
        }
        return t;
    }, [admin, submissionsEnabled]);

    // If activeTab is not in available tabs, switch to first available
    useEffect(() => {
        if (role && tabs.length > 0 && !tabs.find((t) => t.id === activeTab)) {
            dispatch(setActiveTab(tabs[0].id) as any);
        }
    }, [role, tabs, activeTab, dispatch]);

    const handleTabChange = (tabId: string) => {
        dispatch(setActiveTab(tabId) as any);
    };

    const bgColor = theme?.centerChannelBg || '#fff';
    const textColor = theme?.centerChannelColor || '#333';
    const errorColor = theme?.errorTextColor || '#D24B4E';

    if (!role) {
        return (
            <div style={{
                padding: '20px',
                textAlign: 'center',
                color: textColor,
                backgroundColor: bgColor,
                height: '100%',
            }}>
                {'Loading...'}
            </div>
        );
    }

    const renderContent = () => {
        switch (activeTab) {
        case TAB_SUBMIT:
            return <SubmissionForm theme={theme}/>;
        case TAB_MY_REQUESTS:
            return <SubmissionList theme={theme}/>;
        case TAB_MANAGE_LINKS:
            return <LinkList theme={theme}/>;
        case TAB_REVIEW_REQUESTS:
            return <AdminSubmissions theme={theme}/>;
        default:
            return null;
        }
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            backgroundColor: bgColor,
            color: textColor,
        }}>
            <TabBar
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                theme={theme}
            />
            {error && (
                <div
                    style={{
                        padding: '8px 12px',
                        margin: '8px 12px 0',
                        backgroundColor: `${errorColor}15`,
                        color: errorColor,
                        borderRadius: '4px',
                        fontSize: '12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <span>{error}</span>
                    <button
                        onClick={() => dispatch(clearError())}
                        style={{
                            border: 'none',
                            background: 'none',
                            cursor: 'pointer',
                            color: errorColor,
                            fontWeight: 600,
                            padding: '0 4px',
                        }}
                    >
                        {'X'}
                    </button>
                </div>
            )}
            <div style={{flex: 1, overflow: 'auto'}}>
                {renderContent()}
            </div>
        </div>
    );
};

export default RHSView;
