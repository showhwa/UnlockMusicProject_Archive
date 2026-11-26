package protocol

// InputFormatGroup is one about-page category and the labels shown in its tooltip.
type InputFormatGroup struct {
	Name    string   `json:"name"`
	Formats []string `json:"formats"`
}

// AppInfo contains build metadata shown by the frontend.
type AppInfo struct {
	Name         string             `json:"name"`
	Version      string             `json:"version"`
	Commit       string             `json:"commit"`
	ProjectURL   string             `json:"projectURL"`
	InputFormats []InputFormatGroup `json:"inputFormats"`
}
