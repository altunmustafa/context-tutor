package config

import (
	"reflect"
	"testing"
	"time"
)

func TestLoadTrimsCatalogAndAppliesDefaults(t *testing.T) {
	t.Parallel()

	values := map[string]string{
		"GEMINI_API_KEY":       "secret",
		"GEMINI_MODELS":        "gemini-a, gemini-b",
		"DEFAULT_GEMINI_MODEL": "gemini-b",
	}
	cfg, err := load(mapLookup(values))
	if err != nil {
		t.Fatalf("load config: %v", err)
	}

	if !reflect.DeepEqual(cfg.Models.Ids, []string{"gemini-a", "gemini-b"}) {
		t.Fatalf("unexpected model Ids: %v", cfg.Models.Ids)
	}
	if !cfg.Models.Allows("gemini-b") || cfg.Models.Allows("gemini-c") {
		t.Fatal("model allowlist returned an unexpected result")
	}
	if cfg.MaxContentLength != 20000 || cfg.ModelRequestTimeout != 30*time.Second {
		t.Fatal("configuration defaults were not applied")
	}
}

func TestLoadRejectsInvalidConfiguration(t *testing.T) {
	t.Parallel()

	tests := map[string]map[string]string{
		"missing API key": {
			"GEMINI_MODELS": "gemini-a", "DEFAULT_GEMINI_MODEL": "gemini-a",
		},
		"duplicate model": {
			"GEMINI_API_KEY": "secret", "GEMINI_MODELS": "gemini-a,gemini-a", "DEFAULT_GEMINI_MODEL": "gemini-a",
		},
		"default outside catalog": {
			"GEMINI_API_KEY": "secret", "GEMINI_MODELS": "gemini-a", "DEFAULT_GEMINI_MODEL": "gemini-b",
		},
		"quiz maximum too high": {
			"GEMINI_API_KEY": "secret", "GEMINI_MODELS": "gemini-a", "DEFAULT_GEMINI_MODEL": "gemini-a", "MAX_QUIZ_QUESTIONS": "11",
		},
		"invalid trusted proxy": {
			"GEMINI_API_KEY": "secret", "GEMINI_MODELS": "gemini-a", "DEFAULT_GEMINI_MODEL": "gemini-a", "TRUSTED_PROXIES": "not-an-address",
		},
	}

	for name, values := range tests {
		name, values := name, values
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			if _, err := load(mapLookup(values)); err == nil {
				t.Fatal("expected configuration error")
			}
		})
	}
}

func mapLookup(values map[string]string) lookupEnvironment {
	return func(name string) (string, bool) {
		value, ok := values[name]
		return value, ok
	}
}
