
import json
import os
import re

from google import genai
from google.genai import types


def generate_mcqs(
    pdf_text: str,
    topic: str = "all",
    count: int = 10,
    model: str | None = None,
) -> list[dict]:
    """
    Generate multiple-choice questions from extracted PDF text.

    Returns:
        List of dictionaries containing question, options, answer, and topic.
    """
    if not isinstance(pdf_text, str) or not pdf_text.strip():
        raise ValueError("PDF text is empty. Please upload a readable PDF.")

    if not 1 <= count <= 30:
        raise ValueError("Question count must be between 1 and 30.")

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is missing from the environment.")

    model_name = (
        model
        or os.getenv("GEMINI_MODEL")
        or "gemini-2.5-flash"
    )

    # Limit input size to keep requests manageable.
    text = pdf_text[:60000]

    prompt = f"""
You are an expert educational quiz generator.

Generate exactly {count} multiple-choice questions using ONLY the
provided study material.

Selected topic: {topic}

Rules:
1. Each question must have exactly four options.
2. Exactly one option must be correct.
3. Questions must test understanding, not just memorization.
4. Do not invent facts that are absent from the material.
5. If a specific topic is selected, focus on that topic.
6. If the material does not contain enough information, generate fewer
   questions rather than inventing content.
7. Avoid duplicate questions.
8. Return valid JSON only.

Required JSON format:
{{
  "questions": [
    {{
      "topic": "Topic name",
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": 0,
      "explanation": "Brief explanation based on the material"
    }}
  ]
}}

The answer field is a zero-based index:
0 = first option, 1 = second, 2 = third, 3 = fourth.

STUDY MATERIAL:
{text}
"""

    client = genai.Client(api_key=api_key)

    response = client.models.generate_content(
        model=model_name,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.3,
        ),
    )

    response_text = response.text
    if not response_text:
        raise RuntimeError("Gemini returned an empty response.")

    # Tolerate JSON wrapped in Markdown fences.
    response_text = response_text.strip()
    response_text = re.sub(
        r"^```(?:json)?\s*|\s*```$",
        "",
        response_text,
        flags=re.IGNORECASE,
    )

    try:
        payload = json.loads(response_text)
    except json.JSONDecodeError as exc:
        raise RuntimeError("Gemini returned invalid JSON.") from exc

    raw_questions = payload.get("questions", [])
    if not isinstance(raw_questions, list):
        raise RuntimeError("Gemini returned an invalid questions list.")

    questions = []

    for item in raw_questions:
        if not isinstance(item, dict):
            continue

        question = item.get("question")
        options = item.get("options")
        answer = item.get("answer")

        if not isinstance(question, str) or not question.strip():
            continue

        if (
            not isinstance(options, list)
            or len(options) != 4
            or not all(isinstance(option, str) and option.strip()
                       for option in options)
        ):
            continue

        # bool is a subclass of int in Python, so reject it explicitly.
        if isinstance(answer, bool) or not isinstance(answer, int):
            continue

        if answer not in range(4):
            continue

        questions.append({
            "topic": str(item.get("topic") or topic),
            "question": question.strip(),
            "options": [option.strip() for option in options],
            "answer": answer,
            "explanation": str(item.get("explanation") or ""),
        })

    if not questions:
        raise RuntimeError(
            "Gemini did not generate any valid questions from this material."
        )

    return questions[:count]
