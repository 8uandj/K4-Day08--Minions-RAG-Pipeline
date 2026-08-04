# RAG Evaluation Results

## Overall Scores

| Metric | Score |
|---|---:|
| Faithfulness | 0.850 |
| Answer Relevance | 0.810 |
| Context Recall | 0.900 |
| Context Precision | 0.883 |
| **Average** | **0.861** |

## A/B Comparison

| Config | Faithfulness | Answer Relevance | Context Recall | Context Precision | Average |
|---|---:|---:|---:|---:|---:|
| hybrid_rerank | 0.850 | 0.810 | 0.900 | 0.883 | 0.861 |
| dense_only | 0.428 | 0.472 | 0.400 | 0.243 | 0.386 |

### Analysis

**hybrid_rerank** has the highest available average score (0.861).

## Worst Performers (Bottom 3)

| # | Question | Faithfulness | Relevance | Recall | Precision | Average |
|---:|---|---:|---:|---:|---:|---:|
| 1 | What ingredients and dipping sauce are served with the Da Nang banh xeo described in the article? | 0.417 | 0.654 | 0.000 | 0.333 | 0.351 |
| 2 | Where can visitors travel by train from Da Lat station, and what attraction can they visit there? | 0.600 | 0.841 | 1.000 | 0.500 | 0.735 |
| 3 | What is the best time of year to visit Da Nang? | 0.800 | 0.961 | 1.000 | 0.417 | 0.794 |

## Recommendations

- Prioritize **Answer Relevance**, the lowest overall metric (0.810).
- Review the bottom-performing questions and their retrieved contexts before tuning prompts.
- Re-run the same golden dataset after each retrieval or generation change to measure impact.
