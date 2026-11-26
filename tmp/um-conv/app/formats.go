package app

import (
	"context"

	"git.um-react.app/um/um-conv/app/protocol"
	"git.um-react.app/um/um-conv/app/service/convert"
)

// supportedFormatGroups collects the about-page categories in display order.
// Plain media comes first, then each decryptor in registration order.
func supportedFormatGroups() []protocol.InputFormatGroup {
	formats := map[string][]string{
		"媒体格式": convert.MediaFormatLabels(),
	}
	order := []string{"媒体格式"}
	known := map[string]struct{}{"媒体格式": {}}

	for _, algo := range convert.DecryptAlgorithms(context.Background(), &protocol.Settings{}) {
		algo.PopulateSupportedFormats(formats)
		for name := range formats {
			if _, ok := known[name]; ok {
				continue
			}
			known[name] = struct{}{}
			order = append(order, name)
		}
	}

	groups := make([]protocol.InputFormatGroup, 0, len(order))
	for _, name := range order {
		groups = append(groups, protocol.InputFormatGroup{
			Name:    name,
			Formats: append([]string(nil), formats[name]...),
		})
	}
	return groups
}
