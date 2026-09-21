package config

import (
	"errors"
	"fmt"
	"net/netip"
	"os"
	"strconv"
	"strings"
	"time"
)

const (
	defaultListenAddress    = ":8080"
	defaultMaxContentLength = 20000
	defaultMaxQuizQuestions = 10
	defaultRequestTimeout   = 30 * time.Second
	defaultRateLimit        = 10
	defaultConcurrencyLimit = 2
	minimumMaxContentLength = 200
	maximumMaxQuizQuestions = 10
)

type Config struct {
	ListenAddress              string
	GeminiApiKey               string
	Models                     ModelCatalog
	MaxContentLength           int
	MaxQuizQuestions           int
	ModelRequestTimeout        time.Duration
	RateLimitRequestsPerMinute int
	GeminiConcurrencyLimit     int
	TrustedProxies             []netip.Prefix
}

type ModelCatalog struct {
	Ids       []string
	DefaultId string
	allowed   map[string]struct{}
}

func (catalog ModelCatalog) Allows(modelId string) bool {
	_, ok := catalog.allowed[modelId]
	return ok
}

type lookupEnvironment func(string) (string, bool)

func Load() (Config, error) {
	return load(os.LookupEnv)
}

func load(lookup lookupEnvironment) (Config, error) {
	apiKey, err := required(lookup, "GEMINI_API_KEY")
	if err != nil {
		return Config{}, err
	}

	modelsValue, err := required(lookup, "GEMINI_MODELS")
	if err != nil {
		return Config{}, err
	}
	defaultModel, err := required(lookup, "DEFAULT_GEMINI_MODEL")
	if err != nil {
		return Config{}, err
	}
	catalog, err := parseModelCatalog(modelsValue, defaultModel)
	if err != nil {
		return Config{}, err
	}

	maxContentLength, err := integerSetting(lookup, "MAX_CONTENT_LENGTH", defaultMaxContentLength, minimumMaxContentLength, 0)
	if err != nil {
		return Config{}, err
	}
	maxQuizQuestions, err := integerSetting(lookup, "MAX_QUIZ_QUESTIONS", defaultMaxQuizQuestions, 1, maximumMaxQuizQuestions)
	if err != nil {
		return Config{}, err
	}
	requestTimeout, err := durationSetting(lookup, "MODEL_REQUEST_TIMEOUT", defaultRequestTimeout)
	if err != nil {
		return Config{}, err
	}
	rateLimit, err := integerSetting(lookup, "RATE_LIMIT_REQUESTS_PER_MINUTE", defaultRateLimit, 1, 0)
	if err != nil {
		return Config{}, err
	}
	concurrencyLimit, err := integerSetting(lookup, "GEMINI_CONCURRENCY_LIMIT", defaultConcurrencyLimit, 1, 0)
	if err != nil {
		return Config{}, err
	}
	trustedProxies, err := parseTrustedProxies(valueOrDefault(lookup, "TRUSTED_PROXIES", ""))
	if err != nil {
		return Config{}, err
	}

	return Config{
		ListenAddress:              valueOrDefault(lookup, "LISTEN_ADDRESS", defaultListenAddress),
		GeminiApiKey:               apiKey,
		Models:                     catalog,
		MaxContentLength:           maxContentLength,
		MaxQuizQuestions:           maxQuizQuestions,
		ModelRequestTimeout:        requestTimeout,
		RateLimitRequestsPerMinute: rateLimit,
		GeminiConcurrencyLimit:     concurrencyLimit,
		TrustedProxies:             trustedProxies,
	}, nil
}

func required(lookup lookupEnvironment, name string) (string, error) {
	value, ok := lookup(name)
	value = strings.TrimSpace(value)
	if !ok || value == "" {
		return "", fmt.Errorf("%s must be set", name)
	}
	return value, nil
}

func valueOrDefault(lookup lookupEnvironment, name, fallback string) string {
	value, ok := lookup(name)
	if !ok {
		return fallback
	}
	return strings.TrimSpace(value)
}

func parseModelCatalog(value, defaultId string) (ModelCatalog, error) {
	parts := strings.Split(value, ",")
	ids := make([]string, 0, len(parts))
	allowed := make(map[string]struct{}, len(parts))

	for _, part := range parts {
		id := strings.TrimSpace(part)
		if id == "" {
			return ModelCatalog{}, errors.New("GEMINI_MODELS must not contain empty entries")
		}
		if _, exists := allowed[id]; exists {
			return ModelCatalog{}, fmt.Errorf("GEMINI_MODELS contains duplicate model %q", id)
		}
		allowed[id] = struct{}{}
		ids = append(ids, id)
	}

	defaultId = strings.TrimSpace(defaultId)
	if _, exists := allowed[defaultId]; !exists {
		return ModelCatalog{}, errors.New("DEFAULT_GEMINI_MODEL must be present in GEMINI_MODELS")
	}

	return ModelCatalog{Ids: ids, DefaultId: defaultId, allowed: allowed}, nil
}

func integerSetting(lookup lookupEnvironment, name string, fallback, minimum, maximum int) (int, error) {
	value := valueOrDefault(lookup, name, strconv.Itoa(fallback))
	parsed, err := strconv.Atoi(value)
	if err != nil || parsed < minimum || (maximum > 0 && parsed > maximum) {
		return 0, fmt.Errorf("%s has an invalid value", name)
	}
	return parsed, nil
}

func durationSetting(lookup lookupEnvironment, name string, fallback time.Duration) (time.Duration, error) {
	value := valueOrDefault(lookup, name, fallback.String())
	parsed, err := time.ParseDuration(value)
	if err != nil || parsed <= 0 {
		return 0, fmt.Errorf("%s has an invalid value", name)
	}
	return parsed, nil
}

func parseTrustedProxies(value string) ([]netip.Prefix, error) {
	if value == "" {
		return nil, nil
	}

	parts := strings.Split(value, ",")
	prefixes := make([]netip.Prefix, 0, len(parts))
	for _, part := range parts {
		entry := strings.TrimSpace(part)
		if entry == "" {
			return nil, errors.New("TRUSTED_PROXIES must not contain empty entries")
		}

		prefix, err := netip.ParsePrefix(entry)
		if err != nil {
			address, addressErr := netip.ParseAddr(entry)
			if addressErr != nil {
				return nil, errors.New("TRUSTED_PROXIES contains an invalid address or prefix")
			}
			prefix = netip.PrefixFrom(address, address.BitLen())
		}
		prefixes = append(prefixes, prefix.Masked())
	}
	return prefixes, nil
}
