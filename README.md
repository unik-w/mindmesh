# 🧠 MindMesh

**From Research Papers to Structured Insights — Instantly**

MindMesh is an AI-powered system designed to streamline how users discover and understand academic research. It combines real-time paper retrieval with large language model–driven processing to transform complex research into concise, structured insights.

In addition to research papers, MindMesh surfaces relevant academic opportunities, including research-related job postings and upcoming conferences, enabling users to stay informed about developments across both knowledge and career landscapes.

Instead of returning raw papers, MindMesh enables a faster transition from query → understanding → opportunity discovery.

---

## 📌 About the Project

Navigating research is inefficient:

* Keyword-based retrieval often lacks relevance
* Papers are dense and time-consuming
* Extracting key insights requires effort

MindMesh addresses this by introducing an intelligent pipeline that:

* Retrieves relevant research papers from external sources
* Processes and structures key information
* Generates high-signal summaries using LLMs
* Converts insights into audio for on-the-go consumption
* Surfaces relevant research jobs and upcoming conferences

---
## 📱 Screenshorts

![homepage](https://github.com/user-attachments/assets/c21f910d-47a8-44bf-ba94-25cb8cd7fd37)

![Topic Selection](https://github.com/user-attachments/assets/da39862f-2c66-4c52-8c84-a30b937a2d2d)

![feed](https://github.com/user-attachments/assets/80ef1ecc-4636-4606-8ade-4e924affaf21)

![get in touch](https://github.com/user-attachments/assets/33ebb757-8b8f-44d4-968d-bc04110547c0)

![related](https://github.com/user-attachments/assets/67e627eb-d6dd-4a20-ba1e-b3ccdce7a098)

---

## 🚀 Access MindMesh

MindMesh is available as a hosted application. No local setup is required.

👉 **Try it here:**
https://mindmesh-0.vercel.app

---

## 🧪 How It Works

1. Research papers are collected from arXiv API and stored
2. Papers are converted into embeddings and indexed in a vector database
3. A user submits a research query or opens their personalized feed
4. Relevant papers are retrieved using semantic search
5. LLM processes the selected papers for summaries and insights
6. Clean structured response or feed is shown to the user

---

## 🧠 Backend & AI Pipeline

MindMesh is built around a modular pipeline that separates retrieval, processing, and understanding.

---

### 1. Retrieval Layer (ArXiv API)

* Fetches research papers based on user queries
* Returns metadata including title, abstract, and authors

---

### 2. Processing Pipeline

* Filters irrelevant results
* Extracts key concepts
* Prepares structured context for LLM processing

---

### 3. LLM Understanding Layer

* Interprets research content
* Generates concise summaries
* Preserves technical meaning

---

### 4. Structured Response

```json
{
  "papers": [
    {
      "title": "Semantic Image Attack for Visual Model Diagnosis",
      "summary": "Evaluates robustness using semantic perturbations.",
      "domain": "Computer Vision",
      "insight": "Shifts focus from pixel-level noise to semantic-level changes"
    }
  ]
}
```

---

## 🏗️ System Architecture

<img width="291" height="636" alt="system" src="https://github.com/user-attachments/assets/8edaf6c8-bb1d-4693-a2b4-45b18bec93de" />


---

## ⚙️ Core Capabilities

* 🔍 Research paper retrieval from ArXiv
* 🧠 LLM-based summarization and interpretation
* 📡 Research jobs and conference tracking
* 🧩 Structured and enriched responses
* ⚡ Scalable API-driven backend

---

## 🛠️ Tech Stack
* **Frontend**: Vite 
* **Backend**: FastAPI, Hugging Face,Superbase
* ** AI Tools**: Featherless, Vercel, BeyondPresence, ElevenLabs
* **Cloud Computing**: AWS
* **LLM Model*: LLaMA (configurable)
* **Data Source**: ArXiv API


---

## 💡 Vision

> Research is more than papers - it’s an ecosystem.
> MindMesh connects knowledge, opportunities, and insights in one place.

---

