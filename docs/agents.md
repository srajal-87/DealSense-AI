# 🤖 AI Agents

DealSense AI backend is built around modular AI agents, each encapsulated in a Python class that performs a distinct function within the deal processing pipeline. All agents inherit from a common `Agent` base class and are orchestrated by the `PlanningAgent`.

The `FTPriceAgent` is deployed remotely via **Modal** for GPU acceleration, while other agents — including `RAGPriceAgent`, `XGBoostAgent`, and `EnsemblePriceAgent` — run locally.

This section provides a technical summary of each agent’s:
    - Input/output interface  
    - Execution context  
    - Internal responsibilities

---

## 🧩 Agent Summary Table

| Agent                  | Input                               | Output                  | Notes                                                            |
|------------------------|-------------------------------------|--------------------------|------------------------------------------------------------------|
| **PlanningAgent**      | Selected categories                 | Accepted deals           | Orchestrates all agents; applies discount logic, saves to memory |
| **DealScannerAgent**   | RSS feeds, memory (seen URLs)       | 5 cleaned deals (JSON)   | Filters out duplicates, uses OpenAI to pick top 5               |
| **FTPriceAgent**       | Product description                 | Estimated price (float)  | Runs fine-tuned LLaMA 3.1 8B model via Modal                     |
| **XGBoostAgent**       | Product description                       | Estimated price (float)  | Uses pretrained XGBoost with E5 embeddings         |
| **RAGPriceAgent**      | Product description                 | Estimated price (float)  | Runs E5 → ChromaDB → LLM on Modal                               |
| **EnsemblePriceAgent** | 3 predictions (FT, XGB, RAG)        | Final price (float)      | Linear regression over predictions + simple features            |

---

