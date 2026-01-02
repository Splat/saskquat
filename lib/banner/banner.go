package banner

import (
	"fmt"
	"os"
	"runtime"
	"strings"
)

// ANSI color codes (foreground + styles)
const (
	ansiReset = "\x1b[0m"
	ansiBold  = "\x1b[1m"

	ansiCyan    = "\x1b[36m"
	ansiMagenta = "\x1b[35m"
	ansiGreen   = "\x1b[32m"
	ansiYellow  = "\x1b[33m"
	ansiBlue    = "\x1b[34m"
	ansiDim     = "\x1b[2m"
)

// colorEnabled returns true when we should emit ANSI color.
// - honors NO_COLOR
// - avoids coloring when not a terminal (common CI + pipes)
// NOTE: This is a conservative heuristic; for full TTY detection you can
// optionally add golang.org/x/term (recommended).
func colorEnabled() bool {
	if os.Getenv("NO_COLOR") != "" {
		return false
	}
	// If stdout is being piped, avoid color; we print banner to stderr anyway.
	// Still, keep it simple.
	fi, err := os.Stderr.Stat()
	if err != nil {
		return false
	}
	// Char device usually indicates a terminal.
	return (fi.Mode() & os.ModeCharDevice) != 0
}

func c(enabled bool, code string, s string) string {
	if !enabled {
		return s
	}
	return code + s + ansiReset
}

/*
PrintBanner prints a colored ASCII banner to stderr.

	Keeping it on stderr preserves stdout as pure JSONL.
*/
func PrintBanner() {
	enabled := colorEnabled()

	title := "Sasquat.rr"
	// A compact ASCII block that renders well in most terminals.
	
	art := []string{
		"███████╗ █████╗ ███████╗ ██████╗ ██╗   ██╗ █████╗ ████████╗",
		"██╔════╝██╔══██╗██╔════╝██╔═══██╗██║   ██║██╔══██╗╚══██╔══╝",
		"███████╗███████║███████╗██║   ██║██║   ██║███████║   ██║",
		"╚════██║██╔══██║╚════██║██║▄▄ ██║██║   ██║██╔══██║   ██║",
		"███████║██║  ██║███████║╚██████╔╝╚██████╔╝██║  ██║   ██║",
		"╚══════╝╚═╝  ╚═╝╚══════╝ ╚══▀▀═╝  ╚═════╝ ╚═╝  ╚═╝   ╚═╝",
	}

	// Choose a simple “gradient” by alternating colors line-by-line.
	colors := []string{ansiCyan, ansiBlue, ansiMagenta, ansiBlue, ansiCyan}

	fmt.Fprintln(os.Stderr)
	for i, line := range art {
		col := colors[i%len(colors)]
		fmt.Fprintln(os.Stderr, c(enabled, ansiBold+col, line))
	}
	fmt.Fprintln(os.Stderr, c(enabled, ansiBold+ansiGreen, "  "+title))
	fmt.Fprintln(os.Stderr, c(enabled, ansiDim, fmt.Sprintf("  typosquatting enumeration + verification (%s/%s)", runtime.GOOS, runtime.GOARCH)))
	fmt.Fprintln(os.Stderr)
}

// Optional: a “status line” helper for human-readable run context (stderr).
func PrintRunInfo(domain string, workers int, tls, http bool, tlds []string) {
	enabled := colorEnabled()
	fmt.Fprintln(os.Stderr, c(enabled, ansiYellow+ansiBold, "Run configuration"))
	fmt.Fprintln(os.Stderr, "  Domain:  ", c(enabled, ansiCyan, domain))
	fmt.Fprintln(os.Stderr, "  Workers: ", workers)
	fmt.Fprintln(os.Stderr, "  TLS:     ", tls)
	fmt.Fprintln(os.Stderr, "  HTTP:    ", http)
	if len(tlds) > 0 {
		fmt.Fprintln(os.Stderr, "  TLDs:    ", strings.Join(tlds, ","))
	}
	fmt.Fprintln(os.Stderr)
}
