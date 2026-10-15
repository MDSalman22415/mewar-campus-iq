import re
from typing import Dict, List

# Universal syllabus topics across departments
TOPICS = {
    # Computer Science
    "Data Structures and Algorithms": ["array", "linked list", "stack", "queue", "tree", "graph", "sorting", "searching"],
    "Database Management Systems": ["sql", "database", "schema", "normalization", "transaction", "indexing"],
    "Operating Systems": ["process", "thread", "scheduling", "deadlock", "memory", "file system"],
    "Computer Networks": ["tcp", "ip", "protocol", "router", "switch", "bandwidth", "latency"],

    # Physics
    "Newton's Laws of Motion": ["newton", "laws", "motion", "inertia"],
    "Work, Energy and Power": ["work", "energy", "power", "kinetic", "potential"],
    "Thermodynamics": ["thermodynamics", "heat", "temperature", "entropy", "first law", "second law"],
    "Waves and Sound": ["waves", "sound", "frequency", "wavelength", "amplitude"],
    "Electric Current and Circuits": ["electric", "current", "circuit", "voltage", "resistance"],

    # Mathematics
    "Linear Algebra": ["matrix", "vector", "determinant", "eigenvalue", "eigenvector"],
    "Probability and Statistics": ["mean", "variance", "probability", "distribution", "random variable"],
    "Calculus": ["derivative", "integral", "limit", "function", "series"],

    # Management
    "Principles of Management": ["planning", "organizing", "leading", "controlling", "decision making"],
    "Marketing": ["consumer", "brand", "advertising", "promotion", "pricing", "distribution"],
    "Finance": ["investment", "capital", "budget", "profit", "loss", "balance sheet"],

    # Medical
    "Human Anatomy": ["heart", "lungs", "brain", "kidney", "liver", "muscle"],
    "Physiology": ["blood", "respiration", "digestion", "nervous system", "circulation"],
    "Pathology": ["disease", "infection", "tumor", "symptom", "diagnosis"],

    # Law
    "Constitutional Law": ["constitution", "fundamental rights", "directive principles", "amendment"],
    "Criminal Law": ["crime", "punishment", "trial", "evidence", "justice"],
    "Contract Law": ["agreement", "contract", "breach", "consideration", "liability"]
}

def analyze_text(file_name: str, content: str) -> Dict:
    results = []
    found_count, partial_count, not_found_count = 0, 0, 0

    for topic, keywords in TOPICS.items():
        matched_terms = []
        snippet = ""
        status = "Not Found"

        for kw in keywords:
            if re.search(rf"\b{kw}\b", content, re.IGNORECASE):
                matched_terms.append(kw)

        if len(matched_terms) >= 3:
            status = "Found"
            found_count += 1
        elif 0 < len(matched_terms) < 3:
            status = "Partial"
            partial_count += 1
        else:
            not_found_count += 1

        if matched_terms:
            idx = content.lower().find(matched_terms[0].lower())
            snippet = content[max(0, idx-50): idx+100]

        results.append({
            "topic": topic,
            "status": status,
            "matched_terms": matched_terms,
            "snippet": snippet if snippet else "No matching text found."
        })

    total_topics = len(TOPICS)
    coverage_percent = round(((found_count + partial_count*0.5) / total_topics) * 100, 2)

    return {
        "file_name": file_name,
        "summary": {
            "found": found_count,
            "partial": partial_count,
            "not_found": not_found_count,
            "coverage_percent": coverage_percent
        },
        "evidence": results,
        "recommendations": {
            "focus_files": [file_name]
        }
    }

def analyze_multiple(files: List[Dict[str, str]]) -> List[Dict]:
    return [analyze_text(f["file_name"], f["content"]) for f in files]
