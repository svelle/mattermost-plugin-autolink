import {Dispatch} from 'redux';

import client from './client';
import {Autolink} from './types';
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

export const fetchLinks = () => async (dispatch: Dispatch) => {
    dispatch({type: LINKS_LOADING, data: true});
    try {
        const links = await client.getLinks();
        dispatch({type: RECEIVED_LINKS, data: links});
    } catch (err: any) {
        dispatch({type: SET_ERROR, data: err.message});
    } finally {
        dispatch({type: LINKS_LOADING, data: false});
    }
};

export const createOrUpdateLink = (link: Autolink) => async (dispatch: Dispatch) => {
    try {
        await client.createOrUpdateLink(link);
        dispatch({type: CLEAR_ERROR});
        // Refresh links list
        const links = await client.getLinks();
        dispatch({type: RECEIVED_LINKS, data: links});
        dispatch({type: SET_EDITING_LINK, data: null});
    } catch (err: any) {
        dispatch({type: SET_ERROR, data: err.message});
    }
};

export const deleteLink = (name: string) => async (dispatch: Dispatch) => {
    try {
        await client.deleteLink(name);
        dispatch({type: CLEAR_ERROR});
        const links = await client.getLinks();
        dispatch({type: RECEIVED_LINKS, data: links});
    } catch (err: any) {
        dispatch({type: SET_ERROR, data: err.message});
    }
};

export const testLink = (pattern: string, template: string, sampleText: string, wordMatch: boolean) => async (dispatch: Dispatch) => {
    try {
        const result = await client.testLink(pattern, template, sampleText, wordMatch);
        dispatch({type: SET_TEST_RESULT, data: result});
    } catch (err: any) {
        dispatch({type: SET_ERROR, data: err.message});
    }
};

export const fetchUserRole = () => async (dispatch: Dispatch) => {
    try {
        const role = await client.getUserRole();
        dispatch({type: RECEIVED_USER_ROLE, data: role});
    } catch (err: any) {
        dispatch({type: SET_ERROR, data: err.message});
    }
};

export const fetchSubmissions = (status?: string) => async (dispatch: Dispatch) => {
    dispatch({type: SUBMISSIONS_LOADING, data: true});
    try {
        const submissions = await client.getSubmissions(status);
        dispatch({type: RECEIVED_SUBMISSIONS, data: submissions});
    } catch (err: any) {
        dispatch({type: SET_ERROR, data: err.message});
    } finally {
        dispatch({type: SUBMISSIONS_LOADING, data: false});
    }
};

export const createSubmission = (description: string, pattern?: string, template?: string) => async (dispatch: Dispatch) => {
    try {
        await client.createSubmission(description, pattern, template);
        dispatch({type: CLEAR_ERROR});
        // Refresh submissions
        const submissions = await client.getSubmissions();
        dispatch({type: RECEIVED_SUBMISSIONS, data: submissions});
        return true;
    } catch (err: any) {
        dispatch({type: SET_ERROR, data: err.message});
        return false;
    }
};

export const updateSubmission = (id: string, status: string, statusNote?: string) => async (dispatch: Dispatch) => {
    try {
        await client.updateSubmission(id, status, statusNote);
        dispatch({type: CLEAR_ERROR});
        // Refresh submissions
        const submissions = await client.getSubmissions();
        dispatch({type: RECEIVED_SUBMISSIONS, data: submissions});
    } catch (err: any) {
        dispatch({type: SET_ERROR, data: err.message});
    }
};

export const setActiveTab = (tab: string) => (dispatch: Dispatch) => {
    dispatch({type: SET_ACTIVE_TAB, data: tab});
    dispatch({type: CLEAR_ERROR});
};

export const setEditingLink = (link: Autolink | null) => (dispatch: Dispatch) => {
    dispatch({type: SET_EDITING_LINK, data: link});
    dispatch({type: SET_TEST_RESULT, data: null});
};

export const clearError = () => ({type: CLEAR_ERROR});
