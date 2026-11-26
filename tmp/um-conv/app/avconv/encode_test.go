package avconv

import (
	"reflect"
	"testing"
)

func TestConvertInputArgsWithMetadataAndCover(t *testing.T) {
	got, coverMap := convertInputArgs("音频.flac", ConvertOptions{
		MetadataPath: "metadata.txt",
		CoverPath:    "cover.jpg",
	})
	want := []string{
		"-i", "file:音频.flac",
		"-f", "ffmetadata", "-i", "file:metadata.txt",
		"-i", "file:cover.jpg",
		"-map", "0:a",
		"-map_metadata", "1",
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("args = %#v, want %#v", got, want)
	}
	if coverMap != "2:v:0" {
		t.Fatalf("cover map = %q, want %q", coverMap, "2:v:0")
	}
}

func TestConvertInputArgsWithoutSidecars(t *testing.T) {
	got, coverMap := convertInputArgs("audio.flac", ConvertOptions{})
	want := []string{"-i", "file:audio.flac", "-map", "0:a"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("args = %#v, want %#v", got, want)
	}
	if coverMap != "0:v:0?" {
		t.Fatalf("cover map = %q, want %q", coverMap, "0:v:0?")
	}
}

func TestBuildConvertArgsPrefixesFileSchemeForColonOutputPath(t *testing.T) {
	inputArgs, _ := convertInputArgs("dir/in:1.flac", ConvertOptions{})
	dest := `C:\music\track:1\out:2.mp3`
	args := buildConvertArgs(inputArgs, []string{"-c:a", "libmp3lame"}, dest, true)

	if got := args[len(args)-1]; got != "file:"+dest {
		t.Fatalf("output arg = %q, want %q", got, "file:"+dest)
	}
	if !reflect.DeepEqual(args[:7], []string{"-y", "-hide_banner", "-nostdin", "-nostats", "-stats_period", "0.3", "-progress"}) {
		t.Fatalf("unexpected prefix args: %#v", args[:7])
	}
}
