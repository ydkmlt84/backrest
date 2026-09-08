package types

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"reflect"

	v1 "github.com/garethgeorge/backrest/gen/go/v1"
	"github.com/garethgeorge/backrest/internal/hook/hookutil"
	"github.com/garethgeorge/backrest/internal/orchestrator/tasks"
	"go.uber.org/zap"
)

type discordHandler struct{}

func (discordHandler) Name() string {
	return "discord"
}

func (discordHandler) Execute(ctx context.Context, h *v1.Hook, vars interface{}, runner tasks.TaskRunner, event v1.Hook_Condition) error {
	payload, err := hookutil.RenderTemplateOrDefault(h.GetActionDiscord().GetTemplate(), hookutil.DefaultTemplate, vars)
	if err != nil {
		return fmt.Errorf("template rendering: %w", err)
	}

	l := runner.Logger(ctx)
	l.Sugar().Infof("Sending discord message to %s", h.GetActionDiscord().GetWebhookUrl())
	l.Debug("Sending discord message", zap.String("payload", payload))

	requestBytes, err := discordRequestBytes(payload)
	if err != nil {
		return fmt.Errorf("building discord request: %w", err)
	}
	body, err := hookutil.PostRequest(h.GetActionDiscord().GetWebhookUrl(), "application/json", bytes.NewReader(requestBytes))
	if err != nil {
		return fmt.Errorf("sending discord message to %q: %w", h.GetActionDiscord().GetWebhookUrl(), err)
	}
	zap.S().Debug("Discord response", zap.String("body", body))
	return nil
}

// discordRequestBytes preserves the simple text-template behavior while also
// allowing templates to render a complete Discord webhook JSON object. This
// supports embeds without expanding Backrest's hook configuration schema.
func discordRequestBytes(payload string) ([]byte, error) {
	if json.Valid([]byte(payload)) {
		var request map[string]any
		if err := json.Unmarshal([]byte(payload), &request); err == nil {
			return []byte(payload), nil
		}
	}

	return json.Marshal(struct {
		Content string `json:"content"`
	}{Content: payload})
}

func (discordHandler) ActionType() reflect.Type {
	return reflect.TypeOf(&v1.Hook_ActionDiscord{})
}

func init() {
	DefaultRegistry().RegisterHandler(&discordHandler{})
}
