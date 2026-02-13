package autolinkplugin

import (
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
)

const (
	autolinkRequestCommand = "/autolink-request"
)

const requestHelpText = "###### Mattermost Autolink Request System\n" +
	"Submit autolink pattern requests for admin review.\n\n" +
	"**User Commands:**\n" +
	"* `/autolink-request submit <description>` - Submit a new autolink request.\n" +
	"* `/autolink-request list` - View your submitted requests.\n" +
	"* `/autolink-request help` - Show this help text.\n\n" +
	"**Admin Commands:**\n" +
	"* `/autolink-request admin list [status]` - View all submissions (optionally filter by status: pending, implemented, rejected).\n" +
	"* `/autolink-request admin update <id> <status> [note]` - Update submission status.\n\n" +
	"**Submission Format:**\n" +
	"You can submit a free-text description or include optional Pattern/Template:\n" +
	"```\n" +
	"/autolink-request submit Replace MM-1234 with Jira ticket link\n" +
	"/autolink-request submit Pattern: MM-(\\d+) Template: [MM-$1](https://jira.example.com/MM-$1)\n" +
	"```\n"

var autolinkRequestUserCommandHandler = CommandHandler{
	handlers: map[string]CommandHandlerFunc{
		"submit": executeRequestSubmit,
		"list":   executeRequestList,
		"help":   executeRequestHelp,
	},
	defaultHandler: executeRequestHelp,
}

var autolinkRequestAdminCommandHandler = CommandHandler{
	handlers: map[string]CommandHandlerFunc{
		"list":   executeRequestAdminList,
		"update": executeRequestAdminUpdate,
	},
	defaultHandler: func(_ *Plugin, _ *plugin.Context, _ *model.CommandArgs, _ ...string) *model.CommandResponse {
		return responsef("Unknown admin command. Use `list` or `update`.")
	},
}

func (p *Plugin) ExecuteAutolinkRequestCommand(c *plugin.Context, commandArgs *model.CommandArgs) (*model.CommandResponse, *model.AppError) {
	// Check if feature is enabled
	conf := p.getConfig()
	if !conf.EnableUserSubmissions {
		return responsef("User submissions are not enabled. Please contact your system administrator."), nil
	}

	args := strings.Fields(commandArgs.Command)
	if len(args) == 0 || args[0] != autolinkRequestCommand {
		return responsef(requestHelpText), nil
	}

	// Check if this is an admin subcommand
	if len(args) > 1 && args[1] == "admin" {
		isAdmin, err := p.IsAuthorizedAdmin(commandArgs.UserId)
		if err != nil {
			return responsef("Error occurred while authorizing the command: %v", err), nil
		}
		if !isAdmin {
			return responsef("`/autolink-request admin` commands can only be executed by a system administrator or `autolink` plugin admins."), nil
		}

		// Handle admin commands
		if len(args) == 2 {
			return executeRequestHelp(p, c, commandArgs), nil
		}
		return autolinkRequestAdminCommandHandler.Handle(p, c, commandArgs, args[2:]...), nil
	}

	// Handle user commands (no authorization check)
	if len(args) == 1 {
		return executeRequestHelp(p, c, commandArgs), nil
	}
	return autolinkRequestUserCommandHandler.Handle(p, c, commandArgs, args[1:]...), nil
}

func executeRequestSubmit(p *Plugin, _ *plugin.Context, header *model.CommandArgs, args ...string) *model.CommandResponse {
	conf := p.getConfig()

	// Extract description from command (everything after "submit")
	cmdPrefix := autolinkRequestCommand + " submit"
	if !strings.HasPrefix(header.Command, cmdPrefix) {
		return responsef("Please provide a description for your autolink request.\n\nExample: `/autolink-request submit Replace MM-1234 with Jira link`")
	}

	description := strings.TrimSpace(header.Command[len(cmdPrefix):])
	if description == "" {
		return responsef("Please provide a description for your autolink request.\n\nExample: `/autolink-request submit Replace MM-1234 with Jira link`")
	}

	// Check submission limit
	if conf.MaxSubmissionsPerUser > 0 {
		count, err := p.countPendingSubmissions(header.UserId, conf.MaxSubmissionsPerUser)
		if err != nil {
			p.API.LogError("Failed to count pending submissions", "error", err)
			return responsef("Error checking submission limits. Please try again.")
		}
		if count >= conf.MaxSubmissionsPerUser {
			return responsef("You have reached the maximum number of pending submissions (%d). Please wait for your existing requests to be reviewed.", conf.MaxSubmissionsPerUser)
		}
	}

	// Parse optional Pattern/Template from description
	pattern, template := parsePatternTemplate(description)

	// Get user info for caching username
	user, appErr := p.API.GetUser(header.UserId)
	if appErr != nil {
		p.API.LogError("Failed to get user", "error", appErr)
		return responsef("Error retrieving user information. Please try again.")
	}

	// Create submission
	submission := &Submission{
		ID:          createSubmissionID(header.UserId),
		UserID:      header.UserId,
		Username:    user.Username,
		SubmittedAt: time.Now().Unix(),
		Description: description,
		Pattern:     pattern,
		Template:    template,
		Status:      SubmissionStatusPending,
	}

	// Save to KV store
	if err := p.saveSubmission(submission); err != nil {
		p.API.LogError("Failed to save submission", "error", err)
		return responsef("Error saving your request. Please try again.")
	}

	// Notify admins
	go p.notifyOfSubmission(submission)

	return responsef("✅ Request submitted successfully!\n\n**ID:** `%s`\n**Description:** %s\n\nAdmins have been notified and will review your request.", submission.ID, description)
}

func executeRequestList(p *Plugin, _ *plugin.Context, header *model.CommandArgs, args ...string) *model.CommandResponse {
	// Get user's submissions
	submissions, err := p.getUserSubmissions(header.UserId)
	if err != nil {
		p.API.LogError("Failed to get user submissions", "error", err)
		return responsef("Error retrieving your submissions. Please try again.")
	}

	if len(submissions) == 0 {
		return responsef("You have no submitted requests.\n\nSubmit a request with: `/autolink-request submit <description>`")
	}

	// Sort by submission time (newest first)
	sort.Slice(submissions, func(i, j int) bool {
		return submissions[i].SubmittedAt > submissions[j].SubmittedAt
	})

	// Format output
	text := fmt.Sprintf("#### Your Autolink Requests (%d total)\n\n", len(submissions))
	for _, s := range submissions {
		text += formatSubmission(s, false)
	}

	return responsef(text)
}

func executeRequestAdminList(p *Plugin, _ *plugin.Context, header *model.CommandArgs, args ...string) *model.CommandResponse {
	// Parse optional status filter
	statusFilter := ""
	if len(args) > 0 {
		statusFilter = strings.ToLower(args[0])
		if statusFilter != SubmissionStatusPending && statusFilter != SubmissionStatusImplemented && statusFilter != SubmissionStatusRejected {
			return responsef("Invalid status filter. Use: `pending`, `implemented`, or `rejected`")
		}
	}

	// Get all submissions
	submissions, err := p.getAllSubmissions()
	if err != nil {
		p.API.LogError("Failed to get submissions", "error", err)
		return responsef("Error retrieving submissions. Please try again.")
	}

	// Filter by status if specified
	if statusFilter != "" {
		filtered := make([]*Submission, 0)
		for _, s := range submissions {
			if s.Status == statusFilter {
				filtered = append(filtered, s)
			}
		}
		submissions = filtered
	}

	if len(submissions) == 0 {
		if statusFilter != "" {
			return responsef("No submissions with status `%s`.", statusFilter)
		}
		return responsef("No submissions yet.")
	}

	// Sort by submission time (newest first)
	sort.Slice(submissions, func(i, j int) bool {
		return submissions[i].SubmittedAt > submissions[j].SubmittedAt
	})

	// Format output
	filterText := ""
	if statusFilter != "" {
		filterText = fmt.Sprintf(" (status: %s)", statusFilter)
	}
	text := fmt.Sprintf("#### All Autolink Requests%s (%d total)\n\n", filterText, len(submissions))
	for _, s := range submissions {
		text += formatSubmission(s, true)
	}

	return responsef(text)
}

func executeRequestAdminUpdate(p *Plugin, _ *plugin.Context, header *model.CommandArgs, args ...string) *model.CommandResponse {
	if len(args) < 2 {
		return responsef("Usage: `/autolink-request admin update <id> <status> [note]`\n\nStatus must be: `pending`, `implemented`, or `rejected`")
	}

	submissionID := args[0]
	status := strings.ToLower(args[1])

	// Validate status
	if status != SubmissionStatusPending && status != SubmissionStatusImplemented && status != SubmissionStatusRejected {
		return responsef("Invalid status. Must be: `pending`, `implemented`, or `rejected`")
	}

	// Extract optional note (everything after status)
	cmdPrefix := fmt.Sprintf("%s admin update %s %s", autolinkRequestCommand, submissionID, args[1])
	statusNote := ""
	if strings.HasPrefix(header.Command, cmdPrefix) {
		statusNote = strings.TrimSpace(header.Command[len(cmdPrefix):])
	}

	// Get existing submission
	submission, err := p.getSubmission(submissionID)
	if err != nil {
		return responsef("Submission `%s` not found.", submissionID)
	}

	// Update status (uses the already-fetched submission to avoid a second KV read)
	if err := p.updateSubmissionStatus(submission, status, statusNote); err != nil {
		p.API.LogError("Failed to update submission status", "error", err)
		return responsef("Error updating submission status. Please try again.")
	}

	// Format response
	statusEmoji := getStatusEmoji(status)
	response := fmt.Sprintf("✅ Updated submission `%s` to %s **%s**", submissionID, statusEmoji, status)
	if statusNote != "" {
		response += fmt.Sprintf("\n**Note:** %s", statusNote)
	}
	response += fmt.Sprintf("\n\n**Submitted by:** @%s", submission.Username)
	response += fmt.Sprintf("\n**Description:** %s", submission.Description)

	return responsef(response)
}

func executeRequestHelp(_ *Plugin, _ *plugin.Context, _ *model.CommandArgs, _ ...string) *model.CommandResponse {
	return responsef(requestHelpText)
}

// formatSubmission formats a submission for display
func formatSubmission(s *Submission, includeUser bool) string {
	statusEmoji := getStatusEmoji(s.Status)
	submittedTime := time.Unix(s.SubmittedAt, 0).Format("2006-01-02 15:04")

	text := fmt.Sprintf("---\n**ID:** `%s` | **Status:** %s %s | **Submitted:** %s\n",
		s.ID, statusEmoji, s.Status, submittedTime)

	if includeUser {
		text += fmt.Sprintf("**User:** @%s\n", s.Username)
	}

	text += fmt.Sprintf("**Description:** %s\n", s.Description)

	if s.Pattern != "" {
		text += fmt.Sprintf("**Pattern:** `%s`\n", s.Pattern)
	}
	if s.Template != "" {
		text += fmt.Sprintf("**Template:** `%s`\n", s.Template)
	}
	if s.StatusNote != "" {
		text += fmt.Sprintf("**Note:** %s\n", s.StatusNote)
	}

	return text + "\n"
}

// getStatusEmoji returns an emoji for the submission status
func getStatusEmoji(status string) string {
	switch status {
	case SubmissionStatusPending:
		return "⏳"
	case SubmissionStatusImplemented:
		return "✅"
	case SubmissionStatusRejected:
		return "❌"
	default:
		return "❓"
	}
}

// getAutolinkRequestAutoCompleteData returns autocomplete data for the command
func getAutolinkRequestAutoCompleteData() *model.AutocompleteData {
	cmd := model.NewAutocompleteData("autolink-request", "[command]", "Submit and manage autolink pattern requests")

	// User commands
	submit := model.NewAutocompleteData("submit", "[description]", "Submit a new autolink request")
	submit.AddTextArgument("Description of the autolink pattern you want to add", "[description]", "")
	cmd.AddCommand(submit)

	list := model.NewAutocompleteData("list", "", "View your submitted requests")
	cmd.AddCommand(list)

	help := model.NewAutocompleteData("help", "", "Show help text")
	cmd.AddCommand(help)

	// Admin commands
	admin := model.NewAutocompleteData("admin", "[subcommand]", "Admin commands for managing submissions")

	adminList := model.NewAutocompleteData("list", "[status]", "View all submissions")
	adminList.AddTextArgument("Optional status filter (pending, implemented, rejected)", "[status]", "pending|implemented|rejected")
	admin.AddCommand(adminList)

	adminUpdate := model.NewAutocompleteData("update", "<id> <status> [note]", "Update submission status")
	adminUpdate.AddTextArgument("Submission ID", "[id]", "")
	adminUpdate.AddTextArgument("New status (pending, implemented, rejected)", "[status]", "pending|implemented|rejected")
	adminUpdate.AddTextArgument("Optional note about the status change", "[note]", "")
	admin.AddCommand(adminUpdate)

	cmd.AddCommand(admin)

	return cmd
}
