package autolinkplugin

import (
	"fmt"
	"time"

	"github.com/mattermost/mattermost/server/public/model"
)

// notifyOfSubmission sends a DM notification when a new submission is created.
// If plugin managers are configured, they are always notified (even if they are
// the submitter). Otherwise all admins are notified, skipping the submitter.
func (p *Plugin) notifyOfSubmission(submission *Submission) {
	conf := p.getConfig()

	var recipients []string
	skipSubmitter := true

	if len(conf.PluginManagerIds) > 0 {
		// Explicit plugin managers — always notify, no submitter skip
		recipients = make([]string, 0, len(conf.PluginManagerIds))
		for userID := range conf.PluginManagerIds {
			recipients = append(recipients, userID)
		}
		skipSubmitter = false
		p.API.LogDebug("Notification: using plugin managers list",
			"count", len(recipients))
	} else {
		// Fall back to all admins
		recipients = p.getAllAdminUserIDs()
		p.API.LogDebug("Notification: using admin list",
			"count", len(recipients))
	}

	if len(recipients) == 0 {
		p.API.LogWarn("Notification: no users found to notify")
		return
	}

	message := p.buildSubmissionNotificationMessage(submission)

	sent := 0
	for _, userID := range recipients {
		if skipSubmitter && userID == submission.UserID {
			p.API.LogDebug("Notification: skipping submitter",
				"userID", userID)
			continue
		}

		p.API.LogDebug("Notification: sending DM",
			"userID", userID,
			"botUserID", p.botUserID)

		if err := p.sendDMToUser(userID, message); err != nil {
			p.API.LogWarn("Notification: failed to send DM",
				"userID", userID,
				"submissionID", submission.ID,
				"error", err)
		} else {
			sent++
		}
	}

	p.API.LogDebug("Notification: complete",
		"sent", sent,
		"total", len(recipients),
		"submissionID", submission.ID)
}

// getAllAdminUserIDs returns a list of all admin user IDs (system admins + plugin admins)
func (p *Plugin) getAllAdminUserIDs() []string {
	adminSet := make(map[string]struct{})

	// Fetch system admins via paginated API call, filtering out bots
	sysAdminCount := 0
	page := 0
	const perPage = 100
	for {
		users, appErr := p.API.GetUsers(&model.UserGetOptions{
			Roles:   []string{"system_admin"},
			Active:  true,
			Page:    page,
			PerPage: perPage,
		})
		if appErr != nil {
			p.API.LogWarn("getAllAdminUserIDs: failed to fetch system admins",
				"page", page, "error", appErr)
			break
		}
		p.API.LogDebug("getAllAdminUserIDs: GetUsers returned",
			"page", page, "count", len(users))
		for _, user := range users {
			if user.IsBot {
				p.API.LogDebug("getAllAdminUserIDs: skipping bot system admin",
					"userID", user.Id, "username", user.Username)
				continue
			}
			adminSet[user.Id] = struct{}{}
			sysAdminCount++
		}
		if len(users) < perPage {
			break
		}
		page++
	}

	p.API.LogDebug("getAllAdminUserIDs: summary",
		"systemAdmins", sysAdminCount,
		"totalUnique", len(adminSet))

	adminUserIDs := make([]string, 0, len(adminSet))
	for userID := range adminSet {
		adminUserIDs = append(adminUserIDs, userID)
	}

	return adminUserIDs
}

// sendDMToUser sends a direct message from the bot to a specific user
func (p *Plugin) sendDMToUser(userID, message string) error {
	// Get or create DM channel between bot and user
	channel, appErr := p.API.GetDirectChannel(userID, p.botUserID)
	if appErr != nil {
		return fmt.Errorf("failed to get direct channel: %w", appErr)
	}

	// Create the post
	post := &model.Post{
		UserId:    p.botUserID,
		ChannelId: channel.Id,
		Message:   message,
	}

	if _, appErr := p.API.CreatePost(post); appErr != nil {
		return fmt.Errorf("failed to create post: %w", appErr)
	}

	return nil
}

// buildSubmissionNotificationMessage builds the notification message for a new submission
func (p *Plugin) buildSubmissionNotificationMessage(submission *Submission) string {
	message := "#### 📬 New Autolink Request\n\n"
	message += fmt.Sprintf("**User:** @%s\n", submission.Username)
	message += fmt.Sprintf("**Submitted:** %s\n", time.Unix(submission.SubmittedAt, 0).Format("2006-01-02 15:04 MST"))
	message += fmt.Sprintf("**ID:** `%s`\n\n", submission.ID)
	message += fmt.Sprintf("**Description:**\n%s\n\n", submission.Description)

	if submission.Pattern != "" {
		message += fmt.Sprintf("**Pattern:** `%s`\n", submission.Pattern)
	}
	if submission.Template != "" {
		message += fmt.Sprintf("**Template:** `%s`\n", submission.Template)
	}

	message += "\n---\n"
	message += "**Actions:**\n"
	message += fmt.Sprintf("* View all: `/autolink-request admin list`\n")
	message += fmt.Sprintf("* View pending: `/autolink-request admin list pending`\n")
	message += fmt.Sprintf("* Update status: `/autolink-request admin update %s <status> [note]`\n", submission.ID)

	return message
}
