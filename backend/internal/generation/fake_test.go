package generation

import (
	"context"
	"testing"

	"github.com/altunmustafa/context-tutor/backend/internal/contract"
)

func TestFakeClientRecordsRequestsAndClonesResponses(t *testing.T) {
	t.Parallel()

	client := &FakeClient{QuizResponse: contract.QuizResponse{
		Questions: []contract.QuizQuestion{{Options: []string{"A", "B", "C", "D"}}},
	}}
	request := contract.QuizRequest{Content: "source", QuestionCount: 1, Model: "gemini-a"}
	response, err := client.GenerateQuiz(context.Background(), request)
	if err != nil {
		t.Fatalf("generate quiz: %v", err)
	}

	response.Questions[0].Options[0] = "changed"
	if client.QuizResponse.Questions[0].Options[0] != "A" {
		t.Fatal("fake client leaked mutable response state")
	}
	if len(client.QuizRequests) != 1 || client.QuizRequests[0] != request {
		t.Fatal("fake client did not record the request")
	}
}
