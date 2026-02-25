package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"github.com/pkg/errors"

	"github.com/mattermost-community/mattermost-plugin-autolink/server/autolink"
)

// Store provides access to autolink configuration.
type Store interface {
	GetLinks() []autolink.Autolink
	SaveLinks([]autolink.Autolink) error
}

// SubmissionStore provides access to user submission data.
type SubmissionStore interface {
	GetAllSubmissions() ([]*autolink.Submission, error)
	GetUserSubmissions(userID string) ([]*autolink.Submission, error)
	SaveNewSubmission(submission *autolink.Submission) error
	GetSubmission(id string) (*autolink.Submission, error)
	UpdateSubmissionStatus(submission *autolink.Submission, status, statusNote string) error
	CountPendingSubmissions(userID string, limit int) (int, error)
	IsSubmissionsEnabled() bool
	GetMaxSubmissionsPerUser() int
	NotifySubmission(submission *autolink.Submission)
	GetUserInfo(userID string) (username string, err error)
}

// Authorization provides user authorization checks.
type Authorization interface {
	IsAuthorizedAdmin(userID string) (bool, error)
}

// Handler serves the plugin HTTP API.
type Handler struct {
	root            *mux.Router
	store           Store
	submissionStore SubmissionStore
	authorization   Authorization
}

// NewHandler creates a new API handler with all routes.
func NewHandler(store Store, authorization Authorization, submissionStore SubmissionStore) *Handler {
	h := &Handler{
		store:           store,
		submissionStore: submissionStore,
		authorization:   authorization,
	}

	root := mux.NewRouter()

	// Admin-only routes (existing middleware)
	adminAPI := root.PathPrefix("/api/v1").Subrouter()
	adminAPI.Use(h.adminOrPluginRequired)
	adminAPI.HandleFunc("/link", h.setLink).Methods("POST")
	adminAPI.HandleFunc("/links", h.getLinks).Methods("GET")
	adminAPI.HandleFunc("/link", h.deleteLink).Methods("DELETE")
	adminAPI.HandleFunc("/submissions/{id}", h.updateSubmission).Methods("PUT")

	// User routes (any authenticated user)
	userAPI := root.PathPrefix("/api/v1").Subrouter()
	userAPI.Use(h.userRequired)
	userAPI.HandleFunc("/user/role", h.getUserRole).Methods("GET")
	userAPI.HandleFunc("/submissions", h.getSubmissions).Methods("GET")
	userAPI.HandleFunc("/submissions", h.createSubmission).Methods("POST")
	userAPI.HandleFunc("/link/test", h.testLink).Methods("POST")

	root.Handle("{anything:.*}", http.NotFoundHandler())

	h.root = root
	return h
}

func (h *Handler) handleError(w http.ResponseWriter, err error) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusInternalServerError)
	b, _ := json.Marshal(struct {
		Error   string `json:"error"`
		Details string `json:"details"`
	}{
		Error:   "An internal error has occurred. Check app server logs for details.",
		Details: err.Error(),
	})
	_, _ = w.Write(b)
}

func (h *Handler) handleErrorWithStatus(w http.ResponseWriter, statusCode int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	b, _ := json.Marshal(struct {
		Error string `json:"error"`
	}{
		Error: message,
	})
	_, _ = w.Write(b)
}

func (h *Handler) respondJSON(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(data); err != nil {
		h.handleError(w, err)
	}
}

// adminOrPluginRequired checks for admin or inter-plugin access.
func (h *Handler) adminOrPluginRequired(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var err error
		authorized := false
		pluginID := r.Header.Get("Mattermost-Plugin-ID")
		if pluginID != "" {
			authorized = true
		}

		userID := r.Header.Get("Mattermost-User-ID")
		if !authorized && userID != "" {
			authorized, err = h.authorization.IsAuthorizedAdmin(userID)
			if err != nil {
				http.Error(w, "Not authorized", http.StatusUnauthorized)
				return
			}
		}

		if !authorized {
			http.Error(w, "Not authorized", http.StatusUnauthorized)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// userRequired checks that the request comes from an authenticated user.
func (h *Handler) userRequired(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID := r.Header.Get("Mattermost-User-ID")
		if userID == "" {
			http.Error(w, "Not authorized", http.StatusUnauthorized)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	h.root.ServeHTTP(w, r)
}

// --- Link endpoints ---

func (h *Handler) setLink(w http.ResponseWriter, r *http.Request) {
	var newLink autolink.Autolink
	if err := json.NewDecoder(r.Body).Decode(&newLink); err != nil {
		h.handleError(w, errors.Wrap(err, "unable to decode body"))
		return
	}

	links := h.store.GetLinks()
	found := false
	changed := false
	for i := range links {
		if links[i].Name == newLink.Name || links[i].Pattern == newLink.Pattern {
			if !links[i].Equals(newLink) {
				links[i] = newLink
				changed = true
			}
			found = true
			break
		}
	}
	if !found {
		links = append(h.store.GetLinks(), newLink)
		changed = true
	}
	status := http.StatusNotModified
	if changed {
		if err := h.store.SaveLinks(links); err != nil {
			h.handleError(w, errors.Wrap(err, "unable to save link"))
			return
		}
		status = http.StatusOK
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write([]byte(`{"status": "OK"}`))
}

func (h *Handler) getLinks(w http.ResponseWriter, r *http.Request) {
	links := h.store.GetLinks()
	if links == nil {
		links = []autolink.Autolink{}
	}
	h.respondJSON(w, links)
}

type deleteLinkRequest struct {
	Name string `json:"name"`
}

func (h *Handler) deleteLink(w http.ResponseWriter, r *http.Request) {
	var req deleteLinkRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.handleError(w, errors.Wrap(err, "unable to decode body"))
		return
	}

	if req.Name == "" {
		h.handleErrorWithStatus(w, http.StatusBadRequest, "name is required")
		return
	}

	links := h.store.GetLinks()
	found := false
	newLinks := make([]autolink.Autolink, 0, len(links))
	for _, l := range links {
		if l.Name == req.Name {
			found = true
			continue
		}
		newLinks = append(newLinks, l)
	}

	if !found {
		h.handleErrorWithStatus(w, http.StatusNotFound, fmt.Sprintf("link %q not found", req.Name))
		return
	}

	if err := h.store.SaveLinks(newLinks); err != nil {
		h.handleError(w, errors.Wrap(err, "unable to save links"))
		return
	}

	h.respondJSON(w, map[string]string{"status": "OK"})
}

type testLinkRequest struct {
	Pattern    string `json:"pattern"`
	Template   string `json:"template"`
	WordMatch  bool   `json:"word_match"`
	SampleText string `json:"sample_text"`
}

type testLinkResponse struct {
	Input  string `json:"input"`
	Output string `json:"output"`
	Error  string `json:"error,omitempty"`
}

func (h *Handler) testLink(w http.ResponseWriter, r *http.Request) {
	var req testLinkRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.handleError(w, errors.Wrap(err, "unable to decode body"))
		return
	}

	if req.Pattern == "" || req.SampleText == "" {
		h.handleErrorWithStatus(w, http.StatusBadRequest, "pattern and sample_text are required")
		return
	}

	link := autolink.Autolink{
		Pattern:   req.Pattern,
		Template:  req.Template,
		WordMatch: req.WordMatch,
	}

	if err := link.Compile(); err != nil {
		h.respondJSON(w, testLinkResponse{
			Input: req.SampleText,
			Error: fmt.Sprintf("invalid pattern: %v", err),
		})
		return
	}

	output := link.Replace(req.SampleText)
	h.respondJSON(w, testLinkResponse{
		Input:  req.SampleText,
		Output: output,
	})
}

// --- User role endpoint ---

type userRoleResponse struct {
	IsAdmin            bool `json:"is_admin"`
	SubmissionsEnabled bool `json:"submissions_enabled"`
}

func (h *Handler) getUserRole(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("Mattermost-User-ID")

	isAdmin, err := h.authorization.IsAuthorizedAdmin(userID)
	if err != nil {
		isAdmin = false
	}

	submissionsEnabled := false
	if h.submissionStore != nil {
		submissionsEnabled = h.submissionStore.IsSubmissionsEnabled()
	}

	h.respondJSON(w, userRoleResponse{
		IsAdmin:            isAdmin,
		SubmissionsEnabled: submissionsEnabled,
	})
}

// --- Submission endpoints ---

func (h *Handler) getSubmissions(w http.ResponseWriter, r *http.Request) {
	if h.submissionStore == nil {
		h.handleErrorWithStatus(w, http.StatusNotFound, "submissions not available")
		return
	}

	userID := r.Header.Get("Mattermost-User-ID")
	statusFilter := r.URL.Query().Get("status")

	// Validate status filter
	if statusFilter != "" && statusFilter != autolink.SubmissionStatusPending &&
		statusFilter != autolink.SubmissionStatusImplemented && statusFilter != autolink.SubmissionStatusRejected {
		h.handleErrorWithStatus(w, http.StatusBadRequest, "invalid status filter")
		return
	}

	isAdmin, _ := h.authorization.IsAuthorizedAdmin(userID)

	var submissions []*autolink.Submission
	var err error

	if isAdmin {
		submissions, err = h.submissionStore.GetAllSubmissions()
	} else {
		submissions, err = h.submissionStore.GetUserSubmissions(userID)
	}

	if err != nil {
		h.handleError(w, errors.Wrap(err, "unable to get submissions"))
		return
	}

	// Apply status filter
	if statusFilter != "" {
		filtered := make([]*autolink.Submission, 0)
		for _, s := range submissions {
			if s.Status == statusFilter {
				filtered = append(filtered, s)
			}
		}
		submissions = filtered
	}

	if submissions == nil {
		submissions = []*autolink.Submission{}
	}

	h.respondJSON(w, submissions)
}

type createSubmissionRequest struct {
	Description string `json:"description"`
	Pattern     string `json:"pattern"`
	Template    string `json:"template"`
}

func (h *Handler) createSubmission(w http.ResponseWriter, r *http.Request) {
	if h.submissionStore == nil {
		h.handleErrorWithStatus(w, http.StatusNotFound, "submissions not available")
		return
	}

	if !h.submissionStore.IsSubmissionsEnabled() {
		h.handleErrorWithStatus(w, http.StatusForbidden, "user submissions are not enabled")
		return
	}

	userID := r.Header.Get("Mattermost-User-ID")

	var req createSubmissionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.handleError(w, errors.Wrap(err, "unable to decode body"))
		return
	}

	if strings.TrimSpace(req.Description) == "" {
		h.handleErrorWithStatus(w, http.StatusBadRequest, "description is required")
		return
	}

	// Check submission limit
	maxPerUser := h.submissionStore.GetMaxSubmissionsPerUser()
	if maxPerUser > 0 {
		count, err := h.submissionStore.CountPendingSubmissions(userID, maxPerUser)
		if err != nil {
			h.handleError(w, errors.Wrap(err, "unable to check submission limits"))
			return
		}
		if count >= maxPerUser {
			h.handleErrorWithStatus(w, http.StatusTooManyRequests,
				fmt.Sprintf("maximum pending submissions (%d) reached", maxPerUser))
			return
		}
	}

	// Get username
	username, err := h.submissionStore.GetUserInfo(userID)
	if err != nil {
		h.handleError(w, errors.Wrap(err, "unable to get user info"))
		return
	}

	submission := &autolink.Submission{
		ID:          autolink.CreateSubmissionID(userID),
		UserID:      userID,
		Username:    username,
		SubmittedAt: time.Now().Unix(),
		Description: strings.TrimSpace(req.Description),
		Pattern:     strings.TrimSpace(req.Pattern),
		Template:    strings.TrimSpace(req.Template),
		Status:      autolink.SubmissionStatusPending,
	}

	if err := h.submissionStore.SaveNewSubmission(submission); err != nil {
		h.handleError(w, errors.Wrap(err, "unable to save submission"))
		return
	}

	// Notify in background
	go h.submissionStore.NotifySubmission(submission)

	w.WriteHeader(http.StatusCreated)
	h.respondJSON(w, submission)
}

type updateSubmissionRequest struct {
	Status     string `json:"status"`
	StatusNote string `json:"status_note"`
}

func (h *Handler) updateSubmission(w http.ResponseWriter, r *http.Request) {
	if h.submissionStore == nil {
		h.handleErrorWithStatus(w, http.StatusNotFound, "submissions not available")
		return
	}

	vars := mux.Vars(r)
	id := vars["id"]

	var req updateSubmissionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.handleError(w, errors.Wrap(err, "unable to decode body"))
		return
	}

	if req.Status != autolink.SubmissionStatusPending &&
		req.Status != autolink.SubmissionStatusImplemented &&
		req.Status != autolink.SubmissionStatusRejected {
		h.handleErrorWithStatus(w, http.StatusBadRequest,
			"status must be pending, implemented, or rejected")
		return
	}

	submission, err := h.submissionStore.GetSubmission(id)
	if err != nil {
		h.handleErrorWithStatus(w, http.StatusNotFound, "submission not found")
		return
	}

	if err := h.submissionStore.UpdateSubmissionStatus(submission, req.Status, req.StatusNote); err != nil {
		h.handleError(w, errors.Wrap(err, "unable to update submission"))
		return
	}

	h.respondJSON(w, submission)
}
