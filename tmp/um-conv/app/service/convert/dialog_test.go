package convert

import (
	"errors"
	"fmt"
	"testing"
)

func TestDialogCancelled(t *testing.T) {
	cancel := errors.New(dialogCancelMessage)
	cases := []struct {
		name string
		err  error
		want bool
	}{
		{name: "nil", err: nil, want: false},
		{name: "cancel", err: cancel, want: true},
		{name: "wrapped cancel", err: fmt.Errorf("open file: %w", cancel), want: true},
		{name: "other", err: errors.New("access denied"), want: false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := dialogCancelled(tc.err); got != tc.want {
				t.Fatalf("dialogCancelled() = %v, want %v", got, tc.want)
			}
		})
	}
}
