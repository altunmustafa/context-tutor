import type { ModelsResponse } from "../../api/contracts";

interface ModelSelectorProps {
  selectedModel: string | null;
  catalog: ModelsResponse | null;
  catalogError: string | null;
  disabled: boolean;
  onModelChange: (model: string) => void;
  onRetryCatalog: () => void;
}

export function ModelSelector({
  selectedModel,
  catalog,
  catalogError,
  disabled,
  onModelChange,
  onRetryCatalog,
}: ModelSelectorProps) {
  return (
    <>
      <label htmlFor="model">Generation model</label>
      <select
        id="model"
        disabled={!catalog || disabled}
        value={catalog ? (selectedModel ?? "") : ""}
        onChange={(event) => onModelChange(event.target.value)}
      >
        {!catalog && <option value="">Models unavailable</option>}
        {catalog?.models.map((model) => (
          <option key={model}>{model}</option>
        ))}
      </select>
      {catalogError ? (
        <div role="alert">
          <p>{catalogError} Saved work remains readable.</p>
          <button onClick={onRetryCatalog}>Retry model catalog</button>
        </div>
      ) : (
        !catalog && <p role="status">Loading models…</p>
      )}
    </>
  );
}
