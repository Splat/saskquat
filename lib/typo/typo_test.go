package typo

import (
	"testing"
)

func TestSplitSLDTLD(t *testing.T) {
	tests := []struct {
		name    string
		domain  string
		wantSld string
		wantTld string
		wantOk  bool
	}{
		{
			name:    "Domain with TLD",
			domain:  "example.com",
			wantSld: "example",
			wantTld: "com",
			wantOk:  true,
		},
		{
			name:    "Domain without TLD",
			domain:  "example",
			wantSld: "",
			wantTld: "",
			wantOk:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotSld, gotTld, gotOk := splitSLDTLD(tt.domain)

			if gotSld != tt.wantSld {
				t.Errorf("Expected SLD to be %s, got %s", tt.wantSld, gotSld)
			}

			if gotTld != tt.wantTld {
				t.Errorf("Expected TLD to be %s, got %s", tt.wantTld, gotTld)
			}

			if gotOk != tt.wantOk {
				t.Errorf("Expected OK to be %v, got %v", tt.wantOk, gotOk)
			}
		})
	}
}
