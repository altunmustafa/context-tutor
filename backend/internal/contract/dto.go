package contract

type ModelsResponse struct {
	Models       []string `json:"models"`
	DefaultModel string   `json:"defaultModel"`
}

type SummaryRequest struct {
	Content string `json:"content"`
	Model   string `json:"model"`
}

type SummaryResponse struct {
	Summary []string `json:"summary"`
	Model   string   `json:"model"`
}

type QuizRequest struct {
	Content       string `json:"content"`
	QuestionCount int    `json:"questionCount"`
	Model         string `json:"model"`
}

type QuizQuestion struct {
	Question           string   `json:"question"`
	Options            []string `json:"options"`
	CorrectOptionIndex int      `json:"correctOptionIndex"`
	SourceQuote        string   `json:"sourceQuote"`
}

type QuizResponse struct {
	Questions              []QuizQuestion `json:"questions"`
	RequestedQuestionCount int            `json:"requestedQuestionCount"`
	ActualQuestionCount    int            `json:"actualQuestionCount"`
	Model                  string         `json:"model"`
}
