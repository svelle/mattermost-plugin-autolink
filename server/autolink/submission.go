package autolink

import (
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
	ID          string `json:"id"`
	UserID      string `json:"user_id"`
	Username    string `json:"username"`
	SubmittedAt int64  `json:"submitted_at"`
	Description string `json:"description"`
	Pattern     string `json:"pattern"`
	Template    string `json:"template"`
	Status      string `json:"status"`
	StatusNote  string `json:"status_note"`
}

const (
	SubmissionStatusPending     = "pending"
	SubmissionStatusImplemented = "implemented"
	SubmissionStatusRejected    = "rejected"
)

// ParsePatternTemplate extracts pattern and template from description text.
func ParsePatternTemplate(description string) (pattern, template string) {
	if matches := patternRegex.FindStringSubmatch(description); len(matches) > 1 {
		pattern = strings.TrimSpace(matches[1])
	}

	if matches := templateRegex.FindStringSubmatch(description); len(matches) > 1 {
		template = strings.TrimSpace(matches[1])
	}

	return pattern, template
}

// CreateSubmissionID generates a unique submission ID
func CreateSubmissionID(userID string) string {
	return fmt.Sprintf("%d_%s", time.Now().Unix(), userID)
}
