package main

import (
	"fmt"
	"os"
)

func main() {
	if err := prepareIcon(); err != nil {
		fmt.Fprintf(os.Stderr, "prepare icon: %v\n", err)
		os.Exit(1)
	}
}

func prepareIcon() error {
	icon, err := os.ReadFile("app/assets/icon.png")
	if err != nil {
		return err
	}
	return os.WriteFile("build/appicon.png", icon, 0o666)
}
