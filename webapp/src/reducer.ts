import {combineReducers} from 'redux';

import {Autolink, Submission, UserRole, TestResult} from './types';
import {
    RECEIVED_LINKS,
    LINKS_LOADING,
    RECEIVED_SUBMISSIONS,
    SUBMISSIONS_LOADING,
    RECEIVED_USER_ROLE,
    SET_ACTIVE_TAB,
    SET_EDITING_LINK,
    SET_TEST_RESULT,
    SET_ERROR,
    CLEAR_ERROR,
} from './action_types';
import {TAB_SUBMIT} from './constants';

function links(state: Autolink[] = [], action: {type: string; data?: Autolink[]}) {
    switch (action.type) {
    case RECEIVED_LINKS:
        return action.data || [];
    default:
        return state;
    }
}

function linksLoading(state = false, action: {type: string; data?: boolean}) {
    switch (action.type) {
    case LINKS_LOADING:
        return action.data ?? false;
    default:
        return state;
    }
}

function submissions(state: Submission[] = [], action: {type: string; data?: Submission[]}) {
    switch (action.type) {
    case RECEIVED_SUBMISSIONS:
        return action.data || [];
    default:
        return state;
    }
}

function submissionsLoading(state = false, action: {type: string; data?: boolean}) {
    switch (action.type) {
    case SUBMISSIONS_LOADING:
        return action.data ?? false;
    default:
        return state;
    }
}

function userRole(state: UserRole | null = null, action: {type: string; data?: UserRole}) {
    switch (action.type) {
    case RECEIVED_USER_ROLE:
        return action.data || null;
    default:
        return state;
    }
}

function activeTab(state: string = TAB_SUBMIT, action: {type: string; data?: string}) {
    switch (action.type) {
    case SET_ACTIVE_TAB:
        return action.data || TAB_SUBMIT;
    default:
        return state;
    }
}

function editingLink(state: Autolink | null = null, action: {type: string; data?: Autolink | null}) {
    switch (action.type) {
    case SET_EDITING_LINK:
        return action.data ?? null;
    default:
        return state;
    }
}

function testResult(state: TestResult | null = null, action: {type: string; data?: TestResult | null}) {
    switch (action.type) {
    case SET_TEST_RESULT:
        return action.data ?? null;
    default:
        return state;
    }
}

function error(state: string | null = null, action: {type: string; data?: string | null}) {
    switch (action.type) {
    case SET_ERROR:
        return action.data || null;
    case CLEAR_ERROR:
        return null;
    default:
        return state;
    }
}

export default combineReducers({
    links,
    linksLoading,
    submissions,
    submissionsLoading,
    userRole,
    activeTab,
    editingLink,
    testResult,
    error,
});
