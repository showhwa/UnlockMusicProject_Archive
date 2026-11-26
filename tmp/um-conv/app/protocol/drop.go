package protocol

// FilesDroppedEvent is emitted when OS files are dropped onto a marked target.
const FilesDroppedEvent = "files:dropped"

// DroppedItem is one path from a native file drop, with directory classification.
type DroppedItem struct {
	Path  string `json:"path"`
	IsDir bool   `json:"isDir"`
}

// FilesDroppedPayload is the frontend event body for FilesDroppedEvent.
type FilesDroppedPayload struct {
	TargetID string        `json:"targetId"`
	Items    []DroppedItem `json:"items"`
}
