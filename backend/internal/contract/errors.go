package contract

type ErrorCode string

const (
	ErrorInvalidRequest          ErrorCode = "INVALID_REQUEST"
	ErrorContentTooShort         ErrorCode = "CONTENT_TOO_SHORT"
	ErrorContentTooLong          ErrorCode = "CONTENT_TOO_LONG"
	ErrorQuestionCountOutOfRange ErrorCode = "QUESTION_COUNT_OUT_OF_RANGE"
	ErrorUnsupportedModel        ErrorCode = "UNSUPPORTED_MODEL"
	ErrorInvalidModelOutput      ErrorCode = "INVALID_MODEL_OUTPUT"
	ErrorModelRateLimited        ErrorCode = "MODEL_RATE_LIMITED"
	ErrorModelUnsupported        ErrorCode = "MODEL_UNSUPPORTED"
	ErrorUpstreamFailure         ErrorCode = "UPSTREAM_FAILURE"
	ErrorUpstreamTimeout         ErrorCode = "UPSTREAM_TIMEOUT"
	ErrorCapacityExceeded        ErrorCode = "CAPACITY_EXCEEDED"
)

type ErrorEnvelope struct {
	Error ErrorDetail `json:"error"`
}

type ErrorDetail struct {
	Code      ErrorCode `json:"code"`
	Message   string    `json:"message"`
	RequestID string    `json:"requestId"`
}
