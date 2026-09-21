package contract

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"os"
	"path/filepath"
	"slices"
	"testing"
)

func TestContractFixturesDecodeIntoDTOs(t *testing.T) {
	t.Parallel()

	fixtures := map[string]any{
		"error.response.json":   &ErrorEnvelope{},
		"models.response.json":  &ModelsResponse{},
		"quiz.request.json":     &QuizRequest{},
		"quiz.response.json":    &QuizResponse{},
		"summary.request.json":  &SummaryRequest{},
		"summary.response.json": &SummaryResponse{},
	}

	for name, destination := range fixtures {
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			path := filepath.Join("..", "..", "..", "testdata", "contracts", name)
			contents, err := os.ReadFile(path)
			if err != nil {
				t.Fatalf("read fixture: %v", err)
			}
			decoder := json.NewDecoder(bytes.NewReader(contents))
			decoder.DisallowUnknownFields()
			if err := decoder.Decode(destination); err != nil {
				t.Fatalf("decode fixture: %v", err)
			}
			if err := decoder.Decode(new(any)); !errors.Is(err, io.EOF) {
				t.Fatalf("expected end of fixture after one JSON value, got %v", err)
			}
			switch fixture := destination.(type) {
			case *ModelsResponse:
				if fixture.DefaultModel == "" || !slices.Contains(fixture.Models, fixture.DefaultModel) {
					t.Error("default model must belong to the model catalog")
				}
			case *QuizResponse:
				if fixture.ActualQuestionCount != len(fixture.Questions) || fixture.ActualQuestionCount < 1 || fixture.ActualQuestionCount > fixture.RequestedQuestionCount {
					t.Error("question counts must match the nonempty question list and requested limit")
				}
				for index, question := range fixture.Questions {
					if len(question.Options) != 4 {
						t.Errorf("question %d: expected four options", index)
					}
					if question.CorrectOptionIndex < 0 || question.CorrectOptionIndex >= len(question.Options) {
						t.Errorf("question %d: correct option index is out of range", index)
					}
				}
			}
		})
	}
}
