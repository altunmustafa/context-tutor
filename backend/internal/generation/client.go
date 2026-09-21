package generation

import (
	"context"

	"github.com/altunmustafa/context-tutor/backend/internal/contract"
)

type Client interface {
	GenerateSummary(context.Context, contract.SummaryRequest) (contract.SummaryResponse, error)
	GenerateQuiz(context.Context, contract.QuizRequest) (contract.QuizResponse, error)
}
