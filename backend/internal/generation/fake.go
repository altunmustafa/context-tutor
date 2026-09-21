package generation

import (
	"context"
	"slices"
	"sync"

	"github.com/altunmustafa/context-tutor/backend/internal/contract"
)

type FakeClient struct {
	mu sync.Mutex

	SummaryResponse contract.SummaryResponse
	SummaryError    error
	QuizResponse    contract.QuizResponse
	QuizError       error

	SummaryRequests []contract.SummaryRequest
	QuizRequests    []contract.QuizRequest
}

func (client *FakeClient) GenerateSummary(_ context.Context, request contract.SummaryRequest) (contract.SummaryResponse, error) {
	client.mu.Lock()
	defer client.mu.Unlock()

	client.SummaryRequests = append(client.SummaryRequests, request)
	response := client.SummaryResponse
	response.Summary = slices.Clone(response.Summary)
	return response, client.SummaryError
}

func (client *FakeClient) GenerateQuiz(_ context.Context, request contract.QuizRequest) (contract.QuizResponse, error) {
	client.mu.Lock()
	defer client.mu.Unlock()

	client.QuizRequests = append(client.QuizRequests, request)
	response := client.QuizResponse
	response.Questions = slices.Clone(response.Questions)
	for index := range response.Questions {
		response.Questions[index].Options = slices.Clone(response.Questions[index].Options)
	}
	return response, client.QuizError
}
