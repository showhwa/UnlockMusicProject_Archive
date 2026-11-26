package decryptout

import (
	"os"
	"path/filepath"
	"testing"
)

func TestValidate(t *testing.T) {
	dir := t.TempDir()
	empty := filepath.Join(dir, "empty")
	if err := os.WriteFile(empty, nil, 0o644); err != nil {
		t.Fatal(err)
	}
	nonempty := filepath.Join(dir, "nonempty")
	if err := os.WriteFile(nonempty, []byte("audio"), 0o644); err != nil {
		t.Fatal(err)
	}

	tests := []struct {
		name    string
		path    string
		wantErr bool
	}{
		{name: "missing", path: filepath.Join(dir, "missing"), wantErr: true},
		{name: "directory", path: dir, wantErr: true},
		{name: "empty", path: empty, wantErr: true},
		{name: "nonempty", path: nonempty},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := Validate(tt.path)
			if (err != nil) != tt.wantErr {
				t.Fatalf("Validate(%q) error = %v, wantErr %v", tt.path, err, tt.wantErr)
			}
		})
	}
}
