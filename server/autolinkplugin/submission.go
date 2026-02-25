package autolinkplugin

import (
	"encoding/json"
	"fmt"

	"github.com/mattermost-community/mattermost-plugin-autolink/server/autolink"
)

const (
	// KV store key prefixes
	kvSubmissionPrefix    = "submission_"
	kvSubmissionIndexUser = "submission_index_user_"
	kvSubmissionIndexAll  = "submission_index_all"
)

// saveSubmissionRecord writes a submission to the KV store without updating indexes.
func (p *Plugin) saveSubmissionRecord(submission *autolink.Submission) error {
	data, err := json.Marshal(submission)
	if err != nil {
		return fmt.Errorf("failed to marshal submission: %w", err)
	}

	key := fmt.Sprintf("%s%s", kvSubmissionPrefix, submission.ID)
	if appErr := p.API.KVSet(key, data); appErr != nil {
		return fmt.Errorf("failed to save submission: %w", appErr)
	}

	return nil
}

// saveSubmission saves a submission to the KV store and updates indexes.
func (p *Plugin) saveSubmission(submission *autolink.Submission) error {
	if err := p.saveSubmissionRecord(submission); err != nil {
		return err
	}

	key := fmt.Sprintf("%s%s", kvSubmissionPrefix, submission.ID)

	// Update user index
	if err := p.addToSubmissionIndex(kvSubmissionIndexUser+submission.UserID, key); err != nil {
		p.API.LogWarn("Failed to update user submission index", "error", err)
	}

	// Update global index
	if err := p.addToSubmissionIndex(kvSubmissionIndexAll, key); err != nil {
		p.API.LogWarn("Failed to update global submission index", "error", err)
	}

	return nil
}

// SaveNewSubmission is the public version of saveSubmission for the API layer.
func (p *Plugin) SaveNewSubmission(submission *autolink.Submission) error {
	return p.saveSubmission(submission)
}

// addToSubmissionIndex atomically adds a key to an index array in the KV store
// using compare-and-set to prevent race conditions.
func (p *Plugin) addToSubmissionIndex(indexKey, submissionKey string) error {
	const maxRetries = 5
	for attempt := 0; attempt < maxRetries; attempt++ {
		oldData, appErr := p.API.KVGet(indexKey)
		if appErr != nil {
			return fmt.Errorf("failed to get index: %w", appErr)
		}

		var keys []string
		if oldData != nil {
			if err := json.Unmarshal(oldData, &keys); err != nil {
				return fmt.Errorf("failed to unmarshal index: %w", err)
			}
		}

		// Already present — nothing to do
		for _, k := range keys {
			if k == submissionKey {
				return nil
			}
		}
		keys = append(keys, submissionKey)

		newData, err := json.Marshal(keys)
		if err != nil {
			return fmt.Errorf("failed to marshal index: %w", err)
		}

		ok, casErr := p.API.KVCompareAndSet(indexKey, oldData, newData)
		if casErr != nil {
			return fmt.Errorf("failed to save index: %w", casErr)
		}
		if ok {
			return nil
		}
		// CAS conflict — retry with fresh data
	}
	return fmt.Errorf("failed to update index %q after %d retries", indexKey, maxRetries)
}

// GetUserSubmissions retrieves all submissions for a specific user.
func (p *Plugin) GetUserSubmissions(userID string) ([]*autolink.Submission, error) {
	indexKey := kvSubmissionIndexUser + userID
	return p.getSubmissionsByIndex(indexKey)
}

// GetAllSubmissions retrieves all submissions (for admin view).
func (p *Plugin) GetAllSubmissions() ([]*autolink.Submission, error) {
	return p.getSubmissionsByIndex(kvSubmissionIndexAll)
}

// getSubmissionsByIndex retrieves submissions using an index key.
func (p *Plugin) getSubmissionsByIndex(indexKey string) ([]*autolink.Submission, error) {
	data, appErr := p.API.KVGet(indexKey)
	if appErr != nil {
		return nil, fmt.Errorf("failed to get index: %w", appErr)
	}

	if data == nil {
		return []*autolink.Submission{}, nil
	}

	var keys []string
	if err := json.Unmarshal(data, &keys); err != nil {
		return nil, fmt.Errorf("failed to unmarshal index: %w", err)
	}

	submissions := make([]*autolink.Submission, 0, len(keys))
	for _, key := range keys {
		submissionData, appErr := p.API.KVGet(key)
		if appErr != nil {
			p.API.LogWarn("Failed to get submission", "key", key, "error", appErr)
			continue
		}

		if submissionData == nil {
			continue
		}

		var submission autolink.Submission
		if err := json.Unmarshal(submissionData, &submission); err != nil {
			p.API.LogWarn("Failed to unmarshal submission", "key", key, "error", err)
			continue
		}

		submissions = append(submissions, &submission)
	}

	return submissions, nil
}

// GetSubmission retrieves a single submission by ID.
func (p *Plugin) GetSubmission(id string) (*autolink.Submission, error) {
	key := fmt.Sprintf("%s%s", kvSubmissionPrefix, id)
	data, appErr := p.API.KVGet(key)
	if appErr != nil {
		return nil, fmt.Errorf("failed to get submission: %w", appErr)
	}

	if data == nil {
		return nil, fmt.Errorf("submission not found")
	}

	var submission autolink.Submission
	if err := json.Unmarshal(data, &submission); err != nil {
		return nil, fmt.Errorf("failed to unmarshal submission: %w", err)
	}

	return &submission, nil
}

// UpdateSubmissionStatus updates the status of an already-fetched submission.
func (p *Plugin) UpdateSubmissionStatus(submission *autolink.Submission, status, statusNote string) error {
	submission.Status = status
	submission.StatusNote = statusNote
	return p.saveSubmissionRecord(submission)
}

// CountPendingSubmissions counts the number of pending submissions for a user.
func (p *Plugin) CountPendingSubmissions(userID string, limit int) (int, error) {
	submissions, err := p.GetUserSubmissions(userID)
	if err != nil {
		return 0, err
	}

	count := 0
	for _, s := range submissions {
		if s.Status == autolink.SubmissionStatusPending {
			count++
			if limit > 0 && count >= limit {
				return count, nil
			}
		}
	}

	return count, nil
}

// IsSubmissionsEnabled returns whether user submissions are enabled.
func (p *Plugin) IsSubmissionsEnabled() bool {
	return p.getConfig().EnableUserSubmissions
}

// GetMaxSubmissionsPerUser returns the max pending submissions per user.
func (p *Plugin) GetMaxSubmissionsPerUser() int {
	return p.getConfig().MaxSubmissionsPerUser
}

// NotifySubmission sends notification DMs for a new submission.
func (p *Plugin) NotifySubmission(submission *autolink.Submission) {
	p.notifyOfSubmission(submission)
}

// GetUserInfo returns the username for a user ID.
func (p *Plugin) GetUserInfo(userID string) (string, error) {
	user, appErr := p.API.GetUser(userID)
	if appErr != nil {
		return "", fmt.Errorf("failed to get user: %w", appErr)
	}
	return user.Username, nil
}
