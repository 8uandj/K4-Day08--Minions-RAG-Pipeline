"""
RAG Evaluation Pipeline.

Sử dụng DeepEval / RAGAS / TruLens để đánh giá chất lượng RAG pipeline.
Chọn 1 framework và implement đầy đủ.

Yêu cầu:
    1. Load golden_dataset.json (≥15 Q&A pairs)
    2. Chạy RAG pipeline trên từng question
    3. Evaluate với 4 metrics: faithfulness, relevance, context_recall, context_precision
    4. So sánh A/B ít nhất 2 configs
    5. Export results ra results.md

Lưu ý rate limit nếu dùng model OpenRouter ":free": RAGAS/DeepEval gọi LLM RẤT NHIỀU LẦN
(không phải 1 lần/câu hỏi mà nhiều lần/metric/câu hỏi). Model free của OpenRouter giới hạn
50 request/ngày CHO CẢ TÀI KHOẢN (không phải theo model hay theo API key — đổi model free
khác hay tạo key mới KHÔNG reset quota). Nếu chạy full 15+ câu hỏi mà bị rate limit giữa
chừng, thử giảm xuống subset 5 câu để chạy kịp trong buổi, hoặc nạp $10 credit để mở khóa
1000 request/ngày.
"""

import json
import math
from contextlib import contextmanager
from pathlib import Path
from typing import Any

GOLDEN_DATASET_PATH = Path(__file__).parent / "golden_dataset.json"
RESULTS_PATH = Path(__file__).parent / "results.md"


def load_golden_dataset() -> list[dict]:
    """Load golden dataset từ JSON file."""
    with open(GOLDEN_DATASET_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


# =============================================================================
# Option 1: DeepEval
# =============================================================================

def evaluate_with_deepeval(rag_pipeline, golden_dataset: list[dict]) -> dict:
    """
    Evaluate RAG pipeline sử dụng DeepEval.

    pip install deepeval
    """
    # TODO: Implement
    #
    # from deepeval import evaluate
    # from deepeval.metrics import (
    #     FaithfulnessMetric,
    #     AnswerRelevancyMetric,
    #     ContextualRecallMetric,
    #     ContextualPrecisionMetric,
    # )
    # from deepeval.test_case import LLMTestCase
    #
    # test_cases = []
    # for item in golden_dataset:
    #     result = rag_pipeline.generate_with_citation(item["question"])
    #     test_case = LLMTestCase(
    #         input=item["question"],
    #         actual_output=result["answer"],
    #         expected_output=item["expected_answer"],
    #         retrieval_context=[c["content"] for c in result["sources"]],
    #     )
    #     test_cases.append(test_case)
    #
    # metrics = [
    #     FaithfulnessMetric(threshold=0.7),
    #     AnswerRelevancyMetric(threshold=0.7),
    #     ContextualRecallMetric(threshold=0.7),
    #     ContextualPrecisionMetric(threshold=0.7),
    # ]
    #
    # results = evaluate(test_cases, metrics)
    # return results
    raise NotImplementedError("Implement evaluate_with_deepeval")


# =============================================================================
# Option 2: RAGAS
# =============================================================================

def evaluate_with_ragas(rag_pipeline, golden_dataset: list[dict]) -> dict:
    """
    Evaluate RAG pipeline sử dụng RAGAS.

    pip install ragas
    """
    from ragas import evaluate
    from ragas.metrics import (
        faithfulness,
        answer_relevancy,
        context_recall,
        context_precision,
    )
    from datasets import Dataset

    eval_data = {"question": [], "answer": [], "contexts": [], "ground_truth": []}

    for item in golden_dataset:
        result = rag_pipeline.generate_with_citation(item["question"])
        eval_data["question"].append(item["question"])
        eval_data["answer"].append(result["answer"])
        eval_data["contexts"].append([c["content"] for c in result["sources"]])
        eval_data["ground_truth"].append(item["expected_answer"])

    dataset = Dataset.from_dict(eval_data)
    result = evaluate(
        dataset,
        metrics=[faithfulness, answer_relevancy, context_recall, context_precision],
    )
    return result.to_pandas()


# =============================================================================
# Option 3: TruLens
# =============================================================================

def evaluate_with_trulens(rag_pipeline, golden_dataset: list[dict]) -> dict:
    """
    Evaluate RAG pipeline sử dụng TruLens.

    pip install trulens
    """
    # TODO: Implement
    #
    # from trulens.apps.custom import TruCustomApp
    # from trulens.core import Feedback
    # from trulens.providers.openai import OpenAI as TruOpenAI
    #
    # provider = TruOpenAI()
    #
    # f_faithfulness = Feedback(provider.groundedness_measure_with_cot_reasons).on_output()
    # f_relevance = Feedback(provider.relevance).on_input_output()
    # f_context_relevance = Feedback(provider.context_relevance).on_input()
    #
    # tru_rag = TruCustomApp(
    #     rag_pipeline,
    #     app_name="EcommerceSupport_RAG",
    #     feedbacks=[f_faithfulness, f_relevance, f_context_relevance],
    # )
    #
    # with tru_rag as recording:
    #     for item in golden_dataset:
    #         rag_pipeline.generate_with_citation(item["question"])
    #
    # # Dashboard: from trulens.dashboard import run_dashboard; run_dashboard()
    raise NotImplementedError("Implement evaluate_with_trulens")


# =============================================================================
# A/B Comparison
# =============================================================================

def compare_configs(rag_pipeline, golden_dataset: list[dict]):
    """
    So sánh A/B giữa ít nhất 2 configs.

    Gợi ý configs để so sánh:
    - Config A: hybrid search + reranking
    - Config B: dense-only (không reranking)
    - Config C: hybrid search + PageIndex fallback
    """

    configs = {
        "hybrid_rerank": {"use_reranking": True, "alpha": 0.5},
        "dense_only": {"use_reranking": False, "alpha": 1.0},
    }

    if not golden_dataset:
        raise ValueError("golden_dataset must contain at least one test case")

    results = {}
    for config_name, params in configs.items():
        # Khôi phục config ban đầu sau mỗi lần chạy để kết quả B không bị ảnh
        # hưởng bởi config A (và để caller tiếp tục dùng pipeline như trước).
        with _temporary_pipeline_config(rag_pipeline, params) as configured_pipeline:
            results[config_name] = evaluate_with_ragas(
                configured_pipeline, golden_dataset
            )

    return results


# =============================================================================
# Export Results
# =============================================================================

def export_results(results: dict, comparison: dict):
    """Export evaluation results to results.md"""
    """
    Export kết quả tổng và so sánh A/B dưới dạng Markdown.

    ``results`` và từng giá trị trong ``comparison`` có thể là pandas
    DataFrame, RAGAS EvaluationResult (có ``to_pandas``), list records hoặc
    dict. Nhờ vậy hàm không phụ thuộc vào một phiên bản RAGAS cụ thể.
    """
    overall_rows = _as_records(results)
    overall_scores = _mean_scores(overall_rows)
    comparison = comparison or {}
    comparison_scores = {
        str(config_name): _mean_scores(_as_records(config_results))
        for config_name, config_results in comparison.items()
    }

    lines = [
        "# RAG Evaluation Results",
        "",
        "## Overall Scores",
        "",
        "| Metric | Score |",
        "|---|---:|",
    ]
    if overall_scores:
        for metric in _METRICS:
            if metric in overall_scores:
                lines.append(
                    f"| {_METRIC_LABELS[metric]} | {_format_score(overall_scores[metric])} |"
                )
        lines.append(f"| **Average** | **{_format_score(_average(overall_scores.values()))}** |")
    else:
        lines.append("| No numeric metric data | N/A |")

    lines.extend([
        "",
        "## A/B Comparison",
        "",
        "| Config | Faithfulness | Answer Relevance | Context Recall | Context Precision | Average |",
        "|---|---:|---:|---:|---:|---:|",
    ])
    for config_name, scores in comparison_scores.items():
        values = [_format_score(scores.get(metric)) for metric in _METRICS]
        lines.append(
            f"| {_markdown_cell(config_name)} | {' | '.join(values)} | "
            f"{_format_score(_average(scores.values()))} |"
        )
    if not comparison_scores:
        lines.append("| No comparison data | N/A | N/A | N/A | N/A | N/A |")

    winner = _best_config(comparison_scores)
    lines.extend(["", "### Analysis", ""])
    if winner:
        lines.append(
            f"**{_markdown_cell(winner)}** has the highest available average score "
            f"({_format_score(_average(comparison_scores[winner].values()))})."
        )
    else:
        lines.append("There is not enough numeric data to select a winning config.")

    worst_rows = sorted(
        overall_rows,
        key=lambda row: _row_average(row),
    )[:3]
    lines.extend([
        "",
        "## Worst Performers (Bottom 3)",
        "",
        "| # | Question | Faithfulness | Relevance | Recall | Precision | Average |",
        "|---:|---|---:|---:|---:|---:|---:|",
    ])
    if worst_rows:
        for index, row in enumerate(worst_rows, 1):
            normalized = _normalized_scores(row)
            question = row.get("question", row.get("user_input", "N/A"))
            lines.append(
                f"| {index} | {_markdown_cell(question)} | "
                f"{_format_score(normalized.get('faithfulness'))} | "
                f"{_format_score(normalized.get('answer_relevance'))} | "
                f"{_format_score(normalized.get('context_recall'))} | "
                f"{_format_score(normalized.get('context_precision'))} | "
                f"{_format_score(_row_average(row))} |"
            )
    else:
        lines.append("| 1 | No per-question data | N/A | N/A | N/A | N/A | N/A |")

    weakest_metric = min(overall_scores, key=overall_scores.get) if overall_scores else None
    lines.extend(["", "## Recommendations", ""])
    if weakest_metric:
        lines.append(
            f"- Prioritize **{_METRIC_LABELS[weakest_metric]}**, the lowest overall "
            f"metric ({_format_score(overall_scores[weakest_metric])})."
        )
    lines.extend([
        "- Review the bottom-performing questions and their retrieved contexts before tuning prompts.",
        "- Re-run the same golden dataset after each retrieval or generation change to measure impact.",
        "",
    ])

    RESULTS_PATH.parent.mkdir(parents=True, exist_ok=True)
    RESULTS_PATH.write_text("\n".join(lines), encoding="utf-8")


_METRICS = (
    "faithfulness",
    "answer_relevance",
    "context_recall",
    "context_precision",
)
_METRIC_LABELS = {
    "faithfulness": "Faithfulness",
    "answer_relevance": "Answer Relevance",
    "context_recall": "Context Recall",
    "context_precision": "Context Precision",
}
_METRIC_ALIASES = {
    "faithfulness": "faithfulness",
    "answer_relevance": "answer_relevance",
    "answer_relevancy": "answer_relevance",
    "relevance": "answer_relevance",
    "context_recall": "context_recall",
    "context_precision": "context_precision",
}


@contextmanager
def _temporary_pipeline_config(rag_pipeline: Any, params: dict[str, Any]):
    """Apply a config using common pipeline APIs and restore mutable state."""
    pipeline = rag_pipeline
    configure = getattr(rag_pipeline, "configure", None)
    set_config = getattr(rag_pipeline, "set_config", None)
    config = getattr(rag_pipeline, "config", None)
    old_config = dict(config) if isinstance(config, dict) else None
    missing = object()
    old_attributes = {
        key: getattr(rag_pipeline, key, missing)
        for key in params
    }

    try:
        # Some pipelines are immutable and return a configured clone; others
        # mutate themselves. Both cases are supported.
        if callable(configure):
            configured = configure(**params)
            if configured is not None:
                pipeline = configured
        elif callable(set_config):
            configured = set_config(**params)
            if configured is not None:
                pipeline = configured
        elif isinstance(config, dict):
            config.update(params)
        else:
            for key, value in params.items():
                setattr(rag_pipeline, key, value)
        yield pipeline
    finally:
        if old_config is not None:
            config.clear()
            config.update(old_config)
        for key, value in old_attributes.items():
            if value is missing:
                try:
                    delattr(rag_pipeline, key)
                except AttributeError:
                    pass
            else:
                setattr(rag_pipeline, key, value)


def _as_records(data: Any) -> list[dict]:
    """Normalize common evaluation result containers to list-of-dicts."""
    if data is None:
        return []
    if hasattr(data, "to_pandas"):
        data = data.to_pandas()
    if hasattr(data, "to_dict") and not isinstance(data, dict):
        try:
            return [dict(row) for row in data.to_dict(orient="records")]
        except TypeError:
            data = data.to_dict()
    if isinstance(data, list):
        return [dict(row) for row in data if isinstance(row, dict)]
    if isinstance(data, dict):
        if not data:
            return []
        if all(not isinstance(value, (list, tuple)) for value in data.values()):
            return [data]
        lengths = [len(value) for value in data.values() if isinstance(value, (list, tuple))]
        if not lengths:
            return [data]
        row_count = max(lengths)
        return [
            {
                key: value[index] if isinstance(value, (list, tuple)) and index < len(value) else value
                for key, value in data.items()
            }
            for index in range(row_count)
        ]
    return []


def _number(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def _normalized_scores(row: dict) -> dict[str, float]:
    scores = {}
    for key, value in row.items():
        normalized_key = str(key).strip().lower().replace(" ", "_")
        metric = _METRIC_ALIASES.get(normalized_key)
        number = _number(value)
        if metric and number is not None:
            scores[metric] = number
    return scores


def _mean_scores(rows: list[dict]) -> dict[str, float]:
    values = {metric: [] for metric in _METRICS}
    for row in rows:
        for metric, score in _normalized_scores(row).items():
            values[metric].append(score)
    return {
        metric: sum(scores) / len(scores)
        for metric, scores in values.items()
        if scores
    }


def _average(values) -> float | None:
    numeric_values = [number for value in values if (number := _number(value)) is not None]
    return sum(numeric_values) / len(numeric_values) if numeric_values else None


def _row_average(row: dict) -> float:
    value = _average(_normalized_scores(row).values())
    return value if value is not None else math.inf


def _best_config(scores: dict[str, dict[str, float]]) -> str | None:
    candidates = [
        (average, name)
        for name, config_scores in scores.items()
        if (average := _average(config_scores.values())) is not None
    ]
    return max(candidates)[1] if candidates else None


def _format_score(value: Any) -> str:
    number = _number(value)
    return f"{number:.3f}" if number is not None else "N/A"


def _markdown_cell(value: Any) -> str:
    return str(value).replace("|", "\\|").replace("\n", " ").strip() or "N/A"


if __name__ == "__main__":
    golden_dataset = load_golden_dataset()
    print(f"Loaded {len(golden_dataset)} test cases")

    from src.task10_generation import generate_with_citation
    #
    # Chọn 1 framework:
    # results = evaluate_with_deepeval(pipeline, golden_dataset)
    results = evaluate_with_ragas(pipeline, golden_dataset)
    # results = evaluate_with_trulens(pipeline, golden_dataset)
    #
    comparison = compare_configs(pipeline, golden_dataset)
    export_results(results, comparison)
    print("⚠ Implement evaluation logic and run again!")
