package convert

import "testing"

func TestFormatJobMessage_Running(t *testing.T) {
	got := formatJobMessage(jobMsgRunning, 0, 2, 0, 0, 0)
	want := "已处理 0/2 个文件，成功 0，跳过 0，错误 0"
	if got != want {
		t.Fatalf("got %q want %q", got, want)
	}
}

func TestFormatJobMessage_Done(t *testing.T) {
	got := formatJobMessage(jobMsgDone, 4, 4, 2, 1, 1)
	want := "转换完成，已处理 4/4 个文件，成功 2，跳过 1，错误 1"
	if got != want {
		t.Fatalf("got %q want %q", got, want)
	}
}

func TestFormatJobMessage_Cancelled(t *testing.T) {
	got := formatJobMessage(jobMsgCancelled, 1, 2, 1, 0, 0)
	want := "转换已取消，已处理 1/2 个文件，成功 1，跳过 0，错误 0"
	if got != want {
		t.Fatalf("got %q want %q", got, want)
	}
}

func TestOverallPercent_TwoFilesHalf(t *testing.T) {
	p := overallPercent([]float64{0.5, 0})
	if p != 25 {
		t.Fatalf("got %v want 25", p)
	}
}

func TestOverallPercent_AllDone(t *testing.T) {
	p := overallPercent([]float64{1, 1})
	if p != 100 {
		t.Fatalf("got %v want 100", p)
	}
}
