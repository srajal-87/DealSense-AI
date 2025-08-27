# 🧠 Machine Learning Models

This section details the models used for price prediction in DealSense AI.

---

## Fine-Tuned LLaMA Model

We fine-tuned a **`LLaMA 3.1 8B Quantized`** model using **`QLoRA`**  on a curated subset (~400K items) from a larger dataset.

🔗 See [Data Pipeline](data.md) for dataset source and preprocessing steps.

After fine-tuning and evaluation, the best-performing checkpoint was published to **Hugging Face Hub**.

📓 Related Notebooks:
* ⚙️ [Fine-Tuning QLoRA ](./notebooks/llama3_1_finetunning.ipynb)
* 📊 [Evaluation Results ](./notebooks/evaluating_fineTune.ipynb)


---

## XGBoost Model

We reused the same curated dataset to generate embeddings using the **E5 model**, and stored them in a **ChromaDB**

Using these embeddings, we trained an **XGBoost regression model** with tuned hyperparameters to predict product prices from vectorized descriptions in the training dataset. The trained model (`xgboost_model.pkl`) was pushed to **Hugging Face Hub**.

📓 Related Notebooks:
* ⚙️ [Embeddings XGB ](./notebooks/embedding_xgb.ipynb)



---

## RAG Pipeline

We also use the **ChromaDB** with **E5 embeddings** to power a **RAG pipeline** for price prediction.

* **Retrieval**: Given a product description, we embed it using the E5 model and retrieve the **top 5 most similar items** from ChromaDB. Each retrieved item includes its description and actual price.

* **Augmented**: The retrieved similar items and their prices are combined with the original product description to form the input context, which **augments** the prompt sent to the language model for price prediction.

* **Generation**: The full prompt — containing the product description and similar item data — is sent to **GPT** via the OpenAI API. The model is instructed to output only the estimated price.

---

## Ensemble Model

After obtaining individual price predictions from the three independent models on the **curated dataset**, we trained a **linear regression model** to combine their outputs.

The model uses the raw predictions along with simple engineered features (e.g., `max`, `mean`) to generate a more stable final estimate.

Once trained and evaluated, the ensemble model (`ensemble_model.pkl`) was pushed to Hugging Face Hub.

📓 [Related Notebook]
* ⚙️ [Ensemble Model ](./notebooks/ensemble_model.ipynb)


---

## Frontier Model (OpenAI)

We use `OpenAI GPT`to:

- Select the top 5 deals from raw inputs, ensuring clear descriptions and explicit prices, and 
- Estimate product prices after retrieving similar items from ChromaDB for contextual grounding via RAG.