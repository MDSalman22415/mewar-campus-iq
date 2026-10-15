import os
from google import genai
from dotenv import load_dotenv

load_dotenv()


def generate_ai_response(prompt):
    api_key = os.getenv("GEMINI_API_KEY")
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    if not api_key:
        raise RuntimeError("Gemini API key is not configured.")

    client = genai.Client(api_key=api_key)

    response = client.models.generate_content(
        model=model,
        contents=prompt
    )

    if not response.text:
        raise RuntimeError("Gemini returned an empty response.")

    return response.text.strip()


def summarize_text(text):
    prompt = f"""
    You are Mewar Campus IQ, an AI study assistant.

    Summarize the following study material using:
    1. A short overview
    2. Important concepts
    3. Key points for revision
    4. Important definitions, if present

    Use simple English. Do not invent information absent from the source.

    STUDY MATERIAL:
    {text[:50000]}
    """

    return generate_ai_response(prompt)


def answer_question(text, question):
    prompt = f"""
    You are Mewar Campus IQ, a study assistant.

    Answer the student's question using the supplied study material.
    Use simple English. If the material does not contain the answer,
    clearly say so instead of inventing an answer.

    STUDY MATERIAL:
    {text[:30000]}

    STUDENT QUESTION:
    {question}
    """

    return generate_ai_response(prompt)   