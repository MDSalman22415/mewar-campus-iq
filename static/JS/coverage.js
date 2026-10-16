
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const message = $("coverageMessage");
  const refreshBtn = $("refreshCoverage");
  const tableBody = $("coverageTableBody");
  const searchInput = $("topicSearch");
  const statusFilter = $("statusFilter");
  const exportBtn = $("exportCoverage");
  const fileGrid = $("pdfCoverageGrid");
  const recommendationList = $("recommendationList");

  let currentResult = null;
  let visibleRows = [];

  function showMessage(text, type = "") {
    message.textContent = text;
    message.className = `message ${type}`.trim();
  }

  async function requestJSON(url) {
    const response = await fetch(url, {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Accept": "application/json" }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error("Your login session may have expired. Please log in again.");
      }
      throw new Error(data.error || `Request failed (${response.status})`);
    }

    return data;
  }

  function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined && text !== null) element.textContent = text;
    return element;
  }

  function statusClass(status) {
    if (status === "Found") return "status-found";
    if (status === "Partial") return "status-partial";
    return "status-missing";
  }

  function safePercent(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.max(0, Math.min(100, number));
  }

  function renderSummary(summary, fileCount) {
    const percent = safePercent(summary.coverage_percent);

    $("coveragePercent").textContent = `${percent.toFixed(2)}%`;
    $("coverageProgress").style.width = `${percent}%`;

    $("foundCount").textContent = summary.found ?? 0;
    $("partialCount").textContent = summary.partial ?? 0;
    $("missingCount").textContent = summary.not_found ?? 0;

    $("totalFilesLabel").textContent =
      `${fileCount} ${fileCount === 1 ? "file" : "files"}`;
  }

  function renderFileCards(files) {
    fileGrid.replaceChildren();

    if (!files.length) {
      fileGrid.appendChild(
        makeElement("div", "empty-state",
          "No uploaded study files were found. Upload a document first.")
      );
      return;
    }

    files.forEach((file) => {
      const summary = file.summary || {};
      const percent = safePercent(summary.coverage_percent);

      const card = makeElement("article", "file-coverage-card");
      const top = makeElement("div", "file-card-top");
      const icon = makeElement("div", "file-icon", "▤");
      const info = makeElement("div", "file-card-info");

      info.appendChild(makeElement("h3", "", file.file_name || "Untitled file"));
      info.appendChild(makeElement(
        "p", "muted",
        `${summary.found ?? 0} found · ${summary.partial ?? 0} partial · ${summary.not_found ?? 0} not found`
      ));

      top.append(icon, info);
      card.appendChild(top);

      const percentageRow = makeElement("div", "file-percentage-row");
      percentageRow.appendChild(makeElement("span", "", "Content coverage"));
      percentageRow.appendChild(makeElement("strong", "", `${percent.toFixed(2)}%`));
      card.appendChild(percentageRow);

      const track = makeElement("div", "progress-track");
      const fill = makeElement("div", "progress-fill");
      fill.style.width = `${percent}%`;
      track.appendChild(fill);
      card.appendChild(track);

      const topicCount = summary.found !== undefined
        ? Number(summary.found || 0) +
          Number(summary.partial || 0) +
          Number(summary.not_found || 0)
        : (file.evidence || []).length;

      card.appendChild(makeElement(
        "p", "file-topic-count", `${topicCount} topic checks for this file`
      ));

      const focusTopics = (file.evidence || [])
        .filter((row) => row.status !== "Found")
        .map((row) => row.topic);

      const focusLine = focusTopics.length
        ? `Review ${focusTopics.length} partial or unmatched topic(s).`
        : "All configured topics matched at least three keywords.";

      card.appendChild(makeElement("p", "file-focus", focusLine));
      fileGrid.appendChild(card);
    });
  }

  function renderTable() {
    tableBody.replaceChildren();

    const query = searchInput.value.trim().toLowerCase();
    const selectedStatus = statusFilter.value;
    const allRows = currentResult?.evidence || [];

    visibleRows = allRows.filter((row) => {
      const terms = Array.isArray(row.matched_terms) ? row.matched_terms : [];
      const searchable = [
        row.topic || "",
        row.file_name || "",
        ...terms
      ].join(" ").toLowerCase();

      return searchable.includes(query) &&
        (selectedStatus === "all" || row.status === selectedStatus);
    });

    if (!visibleRows.length) {
      const tr = document.createElement("tr");
      const td = makeElement("td", "empty-cell", allRows.length
        ? "No topics match your filters."
        : "No topic results are available.");
      td.colSpan = 5;
      tr.appendChild(td);
      tableBody.appendChild(tr);
      $("tableCount").textContent = "0 results";
      return;
    }

    visibleRows.forEach((row) => {
      const tr = document.createElement("tr");

      tr.appendChild(makeElement("td", "topic-cell", row.topic || "Untitled topic"));
      tr.appendChild(makeElement("td", "source-cell", row.file_name || "Unknown file"));

      const statusCell = document.createElement("td");
      statusCell.appendChild(makeElement(
        "span",
        `status-pill ${statusClass(row.status)}`,
        row.status || "Not Found"
      ));
      tr.appendChild(statusCell);

      const termsCell = document.createElement("td");
      const termsWrap = makeElement("div", "keyword-list");
      const terms = Array.isArray(row.matched_terms) ? row.matched_terms : [];

      if (terms.length) {
        terms.forEach((term) => {
          termsWrap.appendChild(makeElement("span", "keyword", term));
        });
      } else {
        termsWrap.appendChild(makeElement("span", "no-keywords", "No matches"));
      }

      termsCell.appendChild(termsWrap);
      tr.appendChild(termsCell);

      const evidenceCell = document.createElement("td");
      const evidenceButton = makeElement("button", "evidence-btn", "View evidence");
      evidenceButton.type = "button";
      evidenceButton.addEventListener("click", () => openEvidence(row));
      evidenceCell.appendChild(evidenceButton);
      tr.appendChild(evidenceCell);

      tableBody.appendChild(tr);
    });

    $("tableCount").textContent =
      `Showing ${visibleRows.length} of ${allRows.length} topic checks`;
  }

  function renderRecommendations(files) {
    recommendationList.replaceChildren();

    if (!files.length) {
      recommendationList.appendChild(
        makeElement("p", "muted", "Upload study files to receive recommendations.")
      );
      return;
    }

    let totalPriorityTopics = 0;

    files.forEach((file) => {
      const priorityRows = (file.evidence || [])
        .filter((row) => row.status === "Partial" || row.status === "Not Found");

      totalPriorityTopics += priorityRows.length;

      const group = makeElement("div", "recommendation-group");
      group.appendChild(makeElement("h3", "", file.file_name || "Untitled file"));

      if (!priorityRows.length) {
        group.appendChild(makeElement(
          "p", "recommendation-good",
          "All configured topics matched at least three keywords in this file."
        ));
      } else {
        group.appendChild(makeElement(
          "p", "muted",
          `${priorityRows.length} topic(s) need review based on keyword matching.`
        ));

        const list = document.createElement("ul");

        priorityRows
          .slice()
          .sort((a, b) => {
            const rank = { "Not Found": 0, "Partial": 1, "Found": 2 };
            return (rank[a.status] ?? 3) - (rank[b.status] ?? 3);
          })
          .forEach((row) => {
            const li = document.createElement("li");
            li.appendChild(makeElement("strong", "", row.topic));

            const details = row.status === "Partial"
              ? ` — Partial match (${(row.matched_terms || []).join(", ")})`
              : " — No configured keywords matched";

            li.appendChild(document.createTextNode(details));
            list.appendChild(li);
          });

        group.appendChild(list);
      }

      recommendationList.appendChild(group);
    });

    const summary = makeElement(
      "p",
      "recommendation-summary",
      `Across your uploaded files, ${totalPriorityTopics} file-topic result(s) are marked Partial or Not Found. Start with these topics, then verify the original material because keyword matching can miss relevant content.`
    );

    recommendationList.prepend(summary);
  }

  function openEvidence(row) {
    $("evidenceTitle").textContent = "Topic evidence";
    $("evidenceTopic").textContent =
      `${row.topic || "Untitled topic"} · Source: ${row.file_name || "Unknown file"}`;

    $("evidenceSnippet").textContent =
      row.snippet || "No matching text found.";

    const wrap = $("evidenceKeywords");
    wrap.replaceChildren();

    const terms = Array.isArray(row.matched_terms) ? row.matched_terms : [];

    if (terms.length) {
      terms.forEach((term) => {
        wrap.appendChild(makeElement("span", "keyword", term));
      });
    } else {
      wrap.appendChild(makeElement("span", "no-keywords", "No matched keywords"));
    }

    $("evidenceModal").hidden = false;
    $("closeEvidence").focus();
  }

  function renderResult(data) {
    if (!data.summary || !Array.isArray(data.files) ||
        !Array.isArray(data.evidence)) {
      throw new Error("Unexpected combined coverage API response.");
    }

    currentResult = data;

    renderSummary(data.summary, data.files.length);
    renderFileCards(data.files);
    renderTable();
    renderRecommendations(data.files);

    exportBtn.disabled = visibleRows.length === 0;

    if (!data.files.length) {
      showMessage(
        "No uploaded documents were found for your account. Upload a study file first."
      );
    } else {
      showMessage(
        `Analysis complete: ${data.files.length} file(s), ${data.evidence.length} file-topic result(s).`,
        "success"
      );
    }
  }

  async function loadAllCoverage() {
    refreshBtn.disabled = true;
    exportBtn.disabled = true;
    showMessage("Analysing all your uploaded files...");

    try {
      // Combined endpoint: no file selection and no single-file request.
      const data = await requestJSON("/api/coverage/analyze-all");
      renderResult(data);
    } catch (error) {
      showMessage(`Could not load coverage: ${error.message}`, "error");
      fileGrid.replaceChildren();
      fileGrid.appendChild(
        makeElement("div", "empty-state", "Coverage could not be loaded.")
      );
    } finally {
      refreshBtn.disabled = false;
    }
  }

  function exportCSV() {
    if (!visibleRows.length) return;

    const quote = (value) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const rows = [
      ["Topic", "Source File", "Status", "Matched Keywords", "Evidence"],
      ...visibleRows.map((row) => [
        row.topic,
        row.file_name,
        row.status,
        (row.matched_terms || []).join("; "),
        row.snippet
      ])
    ];

    const csv = "\uFEFF" + rows
      .map((row) => row.map(quote).join(","))
      .join("\r\n");

    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" })
    );

    const link = document.createElement("a");
    link.href = url;
    link.download = "mewar-campus-iq-coverage.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  refreshBtn.addEventListener("click", loadAllCoverage);
  searchInput.addEventListener("input", renderTable);
  statusFilter.addEventListener("change", renderTable);

  searchInput.addEventListener("input", () => {
    exportBtn.disabled = visibleRows.length === 0;
  });

  statusFilter.addEventListener("change", () => {
    exportBtn.disabled = visibleRows.length === 0;
  });

  exportBtn.addEventListener("click", exportCSV);

  $("closeEvidence").addEventListener("click", () => {
    $("evidenceModal").hidden = true;
  });

  $("evidenceModal").addEventListener("click", (event) => {
    if (event.target === $("evidenceModal")) {
      $("evidenceModal").hidden = true;
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      $("evidenceModal").hidden = true;
    }
  });

  // Load the combined analysis automatically on page open.
  loadAllCoverage();
})();
