
const uploadForm = document.getElementById("uploadForm");
const fileInput = document.getElementById("studyFile");
const selectedFile = document.getElementById("selectedFile");
const uploadStatus = document.getElementById("uploadStatus");
const uploadButton = document.getElementById("uploadButton");

const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("chatMessages");
const sendButton = document.getElementById("sendButton");

const allowedExtensions = [".pdf", ".pptx", ".docx", ".md", ".txt"];
const MAX_FILE_SIZE = 14 * 1024 * 1024;
const MAX_TOTAL_SIZE = 50 * 1024 * 1024;
const MAX_FILES = 10;

let documents = [];
let fileUploaded = false;
let isUploading = false;
let isAsking = false;

// --------------------------------------------------
// 1. CREATE DOCUMENT SELECTOR
// --------------------------------------------------

const documentSelectorWrapper = document.createElement("div");
documentSelectorWrapper.className = "document-selector-wrapper";
documentSelectorWrapper.style.margin = "12px 0";

const documentLabel = document.createElement("label");
documentLabel.htmlFor = "documentSelector";
documentLabel.textContent = "Choose a study document";
documentLabel.style.display = "block";
documentLabel.style.marginBottom = "6px";

const documentSelector = document.createElement("select");
documentSelector.id = "documentSelector";
documentSelector.style.width = "100%";
documentSelector.style.padding = "10px";

const defaultOption = document.createElement("option");
defaultOption.value = "";
defaultOption.textContent = "Select a document first";

documentSelector.appendChild(defaultOption);
documentSelectorWrapper.appendChild(documentLabel);
documentSelectorWrapper.appendChild(documentSelector);

// Insert selector before chat form.
chatForm.parentNode.insertBefore(
    documentSelectorWrapper,
    chatForm
);

sendButton.disabled = true;
chatInput.disabled = true;

// --------------------------------------------------
// 2. UPDATE CHAT CONTROLS
// --------------------------------------------------

function updateChatControls() {
    const hasSelectedDocument =
        documentSelector.value !== "" &&
        documents.some(
            item => String(item.id) === documentSelector.value
        );

    fileUploaded = hasSelectedDocument;

    chatInput.disabled = !hasSelectedDocument || isUploading;
    sendButton.disabled =
        !hasSelectedDocument || isUploading || isAsking;
}

documentSelector.addEventListener("change", () => {
    updateChatControls();

    const selectedDocument = documents.find(
        item => String(item.id) === documentSelector.value
    );

    if (selectedDocument) {
        uploadStatus.textContent =
            `Selected document: ${selectedDocument.filename}`;
    }
});

// --------------------------------------------------
// 3. LOAD AND DISPLAY DOCUMENTS
// --------------------------------------------------

async function refreshDocuments(preferredIds = [], preferredNames = []) {
    const previousSelection = documentSelector.value;

    try {
        const response = await fetch("/api/documents");
        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error || "Could not load your documents."
            );
        }

        documents = Array.isArray(result.documents)
            ? result.documents
            : [];

        documentSelector.replaceChildren();

        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = documents.length
            ? "Select a document"
            : "No documents uploaded yet";

        documentSelector.appendChild(placeholder);

        documents.forEach(item => {
            const option = document.createElement("option");
            option.value = String(item.id);
            option.textContent =
                `${item.filename} (ID: ${item.id})`;

            documentSelector.appendChild(option);
        });

        // Prefer a newly uploaded document when possible.
        let desiredId = "";

        for (const id of preferredIds) {
            if (documents.some(
                item => String(item.id) === String(id)
            )) {
                desiredId = String(id);
                break;
            }
        }

        // Fallback for upload responses that don't include IDs.
        if (!desiredId && preferredNames.length) {
            const matchingDocument = [...documents].find(
                item => preferredNames.includes(item.filename)
            );

            if (matchingDocument) {
                desiredId = String(matchingDocument.id);
            }
        }

        // Otherwise preserve the user's previous selection.
        if (
            !desiredId &&
            documents.some(
                item => String(item.id) === previousSelection
            )
        ) {
            desiredId = previousSelection;
        }

        // Otherwise select the most recent document.
        if (!desiredId && documents.length) {
            desiredId = String(documents[0].id);
        }

        documentSelector.value = desiredId;
        updateChatControls();

        return documents;

    } catch (error) {
        documents = [];
        documentSelector.replaceChildren();

        const option = document.createElement("option");
        option.value = "";
        option.textContent = "Could not load documents";

        documentSelector.appendChild(option);
        updateChatControls();

        uploadStatus.textContent = error.message;
        return [];
    }
}

// --------------------------------------------------
// 4. VALIDATE SELECTED FILES
// --------------------------------------------------

fileInput.addEventListener("change", () => {
    const files = Array.from(fileInput.files);

    uploadStatus.textContent = "";

    if (files.length === 0) {
        selectedFile.textContent = "No files selected yet";
        return;
    }

    selectedFile.textContent = files.map(file =>
        `${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`
    ).join(", ");

    if (files.length > MAX_FILES) {
        uploadStatus.textContent =
            `You can upload a maximum of ${MAX_FILES} files.`;

        fileInput.value = "";
        selectedFile.textContent = "No files selected yet";
        return;
    }

    const invalidFile = files.find(file =>
        !allowedExtensions.some(extension =>
            file.name.toLowerCase().endsWith(extension)
        )
    );

    if (invalidFile) {
        uploadStatus.textContent =
            `${invalidFile.name}: Only PDF, PPTX, DOCX, MD and TXT files are supported.`;

        fileInput.value = "";
        selectedFile.textContent = "No files selected yet";
        return;
    }

    const oversizedFile = files.find(
        file => file.size > MAX_FILE_SIZE
    );

    if (oversizedFile) {
        uploadStatus.textContent =
            `${oversizedFile.name}: Each file must be 14 MB or smaller.`;

        fileInput.value = "";
        selectedFile.textContent = "No files selected yet";
        return;
    }

    const totalSize = files.reduce(
        (total, file) => total + file.size,
        0
    );

    if (totalSize > MAX_TOTAL_SIZE) {
        uploadStatus.textContent =
            "Total upload size must be 50 MB or less.";

        fileInput.value = "";
        selectedFile.textContent = "No files selected yet";
    }
});

// --------------------------------------------------
// 5. UPLOAD DOCUMENTS
// --------------------------------------------------

uploadForm.addEventListener("submit", async event => {
    event.preventDefault();

    const files = Array.from(fileInput.files);

    if (files.length === 0) {
        uploadStatus.textContent =
            "Please select at least one file.";
        return;
    }

    if (files.length > MAX_FILES) {
        uploadStatus.textContent =
            `You can upload a maximum of ${MAX_FILES} files.`;
        return;
    }

    const invalidFile = files.find(file =>
        !allowedExtensions.some(extension =>
            file.name.toLowerCase().endsWith(extension)
        )
    );

    if (invalidFile) {
        uploadStatus.textContent =
            `${invalidFile.name}: Unsupported file type.`;
        return;
    }

    if (files.some(file => file.size > MAX_FILE_SIZE)) {
        uploadStatus.textContent =
            "Each file must be 14 MB or smaller.";
        return;
    }

    const totalSize = files.reduce(
        (total, file) => total + file.size,
        0
    );

    if (totalSize > MAX_TOTAL_SIZE) {
        uploadStatus.textContent =
            "Total upload size must be 50 MB or less.";
        return;
    }

    const formData = new FormData();

    files.forEach(file => {
        formData.append("files", file);
    });

    isUploading = true;
    updateChatControls();

    uploadButton.disabled = true;
    uploadButton.textContent = "Uploading...";
    uploadStatus.textContent =
        "Uploading and extracting document text...";

    try {
        const response = await fetch("/api/pdf/upload", {
            method: "POST",
            body: formData
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error || "File upload failed."
            );
        }

        const uploadedFiles = Array.isArray(result.files)
            ? result.files
            : [];

        const uploadedIds = uploadedFiles
            .map(item => item.id)
            .filter(id => id !== undefined && id !== null);

        const uploadedNames = uploadedFiles
            .map(item => item.filename)
            .filter(Boolean);

        // Refresh the document selector after uploading.
        await refreshDocuments(uploadedIds, uploadedNames);

        addMessage(
            "assistant",
            `${result.message || "Upload completed."} Select a document from the dropdown before asking questions.`
        );

        if (Array.isArray(result.errors) && result.errors.length) {
            uploadStatus.textContent =
                "Some files could not be processed: " +
                result.errors.join(" ");
        } else {
            uploadStatus.textContent =
                result.message || "Upload completed successfully.";
        }

    } catch (error) {
        uploadStatus.textContent = error.message;

    } finally {
        isUploading = false;
        uploadButton.disabled = false;
        uploadButton.textContent = "Upload & Analyze";
        updateChatControls();
    }
});

// --------------------------------------------------
// 6. CHAT MESSAGE HELPER
// --------------------------------------------------

function addMessage(type, text) {
    const message = document.createElement("div");

    message.className = type === "user"
        ? "message user-message"
        : "message assistant-message";

    if (type === "assistant") {
        const heading = document.createElement("strong");
        heading.textContent = "Campus AI";
        message.appendChild(heading);
    }

    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    message.appendChild(paragraph);

    chatMessages.appendChild(message);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    return message;
}

// --------------------------------------------------
// 7. ASK ABOUT THE SELECTED DOCUMENT
// --------------------------------------------------

chatForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (isAsking || isUploading) {
        return;
    }

    const documentId = documentSelector.value;

    if (!documentId) {
        addMessage(
            "assistant",
            "Please select a study document first."
        );
        return;
    }

    const selectedDocument = documents.find(
        item => String(item.id) === documentId
    );

    if (!selectedDocument) {
        addMessage(
            "assistant",
            "This document is unavailable. Please refresh the document list."
        );

        await refreshDocuments();
        return;
    }

    const question = chatInput.value.trim();

    if (!question) {
        return;
    }

    addMessage("user", question);
    chatInput.value = "";

    const waitingMessage = addMessage(
        "assistant",
        `Checking "${selectedDocument.filename}"...`
    );

    isAsking = true;
    updateChatControls();

    try {
        const response = await fetch("/api/ask", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                question: question,
                document_id: Number(documentId)
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error || "Could not get an answer."
            );
        }

        waitingMessage.querySelector("p").textContent =
            result.answer;

    } catch (error) {
        waitingMessage.querySelector("p").textContent =
            error.message;

    } finally {
        isAsking = false;
        updateChatControls();
        chatInput.focus();
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
});

// --------------------------------------------------
// 8. INITIALIZE EXISTING DOCUMENTS
// --------------------------------------------------

refreshDocuments();
