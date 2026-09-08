package types

import (
	"encoding/json"
	"reflect"
	"testing"
)

func TestDiscordRequestBytes(t *testing.T) {
	tests := []struct {
		name    string
		payload string
		want    map[string]any
	}{
		{
			name:    "plain text remains a content message",
			payload: "backup complete",
			want:    map[string]any{"content": "backup complete"},
		},
		{
			name:    "JSON object is sent as a complete webhook payload",
			payload: `{"embeds":[{"title":"Backup complete","color":5763719}]}`,
			want: map[string]any{
				"embeds": []any{
					map[string]any{"title": "Backup complete", "color": float64(5763719)},
				},
			},
		},
		{
			name:    "JSON scalar remains a content message",
			payload: `"backup complete"`,
			want:    map[string]any{"content": `"backup complete"`},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotBytes, err := discordRequestBytes(tt.payload)
			if err != nil {
				t.Fatalf("discordRequestBytes() error = %v", err)
			}

			var got map[string]any
			if err := json.Unmarshal(gotBytes, &got); err != nil {
				t.Fatalf("result is not a JSON object: %v", err)
			}
			if !reflect.DeepEqual(got, tt.want) {
				t.Fatalf("discordRequestBytes() = %#v, want %#v", got, tt.want)
			}
		})
	}
}
