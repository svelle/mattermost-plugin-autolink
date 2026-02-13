package autolinkplugin

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
	"time"
)

var (
	patternRegex  = regexp.MustCompile(`(?i)pattern:\s*([^\n]+)`)
	templateRegex = regexp.MustCompile(`(?i)template:\s*([^\n]+)`)
)

// Submission represents a user-submitted autolink request
type Submission struct {
	ID          string `json:"id"`           // Format: {timestamp}_{userID}
	UserID      string `json:"user_id"`      // Mattermost user ID
	Username    string `json:"username"`     // Cached for display
	SubmittedAt int64  `json:"submitted_at"` // Unix timestamp
	Description string `json:"description"`  // Free-text or structured description
	Pattern     string `json:"pattern"`      // Optional regex pattern
	Template    string `json:"template"`     // Optional template
	Status      string `json:"status"`       // "pending", "implemented", "rejected"
	StatusNote  string `json:"status_note"`  // Admin notes on the status
}

const (
	// Submission status constants
	SubmissionStatusPending     = "pending"
	SubmissionStatusImplemented = "implemented"
	SubmissionStatusRejected    = "rejected"

	// KV store key prefixes
	kvSubmissionPrefix    = "submission_"
	kvSubmissionIndexUser = "submission_index_user_"
	kvSubmissionIndexAll  = "submission_index_all"
)

// saveSubmissionRecord writes a submission to the KV store without updating indexes.
func (p *Plugin) saveSubmissionRecord(submission *Submission) error {
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
func (p *Plugin) saveSubmission(submission *Submission) error {
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

// getUserSubmissions retrieves all submissions for a specific user
func (p *Plugin) getUserSubmissions(userID string) ([]*Submission, error) {
	indexKey := kvSubmissionIndexUser + userID
	return p.getSubmissionsByIndex(indexKey)
}

// getAllSubmissions retrieves all submissions (for admin view)
func (p *Plugin) getAllSubmissions() ([]*Submission, error) {
	return p.getSubmissionsByIndex(kvSubmissionIndexAll)
}

// getSubmissionsByIndex retrieves submissions using an index key
func (p *Plugin) getSubmissionsByIndex(indexKey string) ([]*Submission, error) {
	// Load index
	data, appErr := p.API.KVGet(indexKey)
	if appErr != nil {
		return nil, fmt.Errorf("failed to get index: %w", appErr)
	}

	if data == nil {
		return []*Submission{}, nil
	}

	var keys []string
	if err := json.Unmarshal(data, &keys); err != nil {
		return nil, fmt.Errorf("failed to unmarshal index: %w", err)
	}

	// Load each submission
	submissions := make([]*Submission, 0, len(keys))
	for _, key := range keys {
		submissionData, appErr := p.API.KVGet(key)
		if appErr != nil {
			p.API.LogWarn("Failed to get submission", "key", key, "error", appErr)
			continue
		}

		if submissionData == nil {
			continue
		}

		var submission Submission
		if err := json.Unmarshal(submissionData, &submission); err != nil {
			p.API.LogWarn("Failed to unmarshal submission", "key", key, "error", err)
			continue
		}

		submissions = append(submissions, &submission)
	}

	return submissions, nil
}

// getSubmission retrieves a single submission by ID
func (p *Plugin) getSubmission(id string) (*Submission, error) {
	key := fmt.Sprintf("%s%s", kvSubmissionPrefix, id)
	data, appErr := p.API.KVGet(key)
	if appErr != nil {
		return nil, fmt.Errorf("failed to get submission: %w", appErr)
	}

	if data == nil {
		return nil, fmt.Errorf("submission not found")
	}

	var submission Submission
	if err := json.Unmarshal(data, &submission); err != nil {
		return nil, fmt.Errorf("failed to unmarshal submission: %w", err)
	}

	return &submission, nil
}

// updateSubmissionStatus updates the status of an already-fetched submission
// and writes it back without redundant index updates.
func (p *Plugin) updateSubmissionStatus(submission *Submission, status, statusNote string) error {
	submission.Status = status
	submission.StatusNote = statusNote
	return p.saveSubmissionRecord(submission)
}

// countPendingSubmissions counts the number of pending submissions for a user.
// When limit > 0, it short-circuits once the count reaches the limit.
func (p *Plugin) countPendingSubmissions(userID string, limit int) (int, error) {
	submissions, err := p.getUserSubmissions(userID)
	if err != nil {
		return 0, err
	}

	count := 0
	for _, s := range submissions {
		if s.Status == SubmissionStatusPending {
			count++
			if limit > 0 && count >= limit {
				return count, nil
			}
		}
	}

	return count, nil
}

// parsePatternTemplate extracts pattern and template from description text.
// Looks for lines like "Pattern: <pattern>" and "Template: <template>"
func parsePatternTemplate(description string) (pattern, template string) {
	if matches := patternRegex.FindStringSubmatch(description); len(matches) > 1 {
		pattern = strings.TrimSpace(matches[1])
	}

	if matches := templateRegex.FindStringSubmatch(description); len(matches) > 1 {
		template = strings.TrimSpace(matches[1])
	}

	return pattern, template
}

// createSubmissionID generates a unique submission ID
func createSubmissionID(userID string) string {
	return fmt.Sprintf("%d_%s", time.Now().Unix(), userID)
}
