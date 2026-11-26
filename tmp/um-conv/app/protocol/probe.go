package protocol

// ProbeRequest asks the backend whether an external executable is usable.
type ProbeRequest struct {
	Exe  string `json:"exe"`
	Path string `json:"path"` // empty = auto-detect via PATH
}

// ProbeResult is the unified probe response. Extra fields (e.g. encoders) are omitted when unused.
type ProbeResult struct {
	OK       bool     `json:"ok"`
	Error    string   `json:"error,omitempty"`
	Version  string   `json:"version,omitempty"`
	Path     string   `json:"path,omitempty"`
	Encoders []string `json:"encoders,omitempty"` // ffmpeg-only
}
