const uploadForm = document.getElementById("uploadForm");
const fileInput = document.getElementById("studyFile");
const selectedFile = document.getElementById("selectedFile");
const uploadStatus = document.getElementById("uploadStatus");
const uploadButton = document.getElementById("uploadButton");

const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("chatMessages");
const sendButton = document.getElementById("sendButton");

let fileUploaded = false;

// Initially, chat is unavailable until a PDF is uploaded.
sendButton.disabled = true;
chatInput.disabled = true;

fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];

    selectedFile.textContent = file
        ? `${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`
        : "No file selected yet";

    fileUploaded = false;
    sendButton.disabled = true;
    chatInput.disabled = true;

    if (file && !file.name.toLowerCase().endsWith(".pdf")) {
        uploadStatus.textContent = "Please select a PDF file.";
    } else {
        uploadStatus.textContent = "";
    }
});

uploadForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const file = fileInput.files[0];

    if (!file) {
        uploadStatus.textContent = "Please select a PDF file first.";
        return;
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
        uploadStatus.textContent = "Only PDF files are supported right now.";
        return;
    }

    if (file.size > 20 * 1024 * 1024) {
        uploadStatus.textContent = "File size must be 20 MB or less.";
        return;
    }

    const formData = new FormData();
    formData.append("file", file);

    uploadButton.disabled = true;
    uploadButton.textContent = "Uploading...";
    uploadStatus.textContent = "Uploading and extracting PDF text...";

    try {
        const response = await fetch("/api/pdf/upload", {
            method: "POST",
            body: formData
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "PDF upload failed.");
        }

        fileUploaded = true;
        sendButton.disabled = false;
        chatInput.disabled = false;

        uploadStatus.textContent =
            `✓ ${result.message} (${result.pages} pages processed)`;

        addMessage(
            "assistant",
            `Your PDF "${file.name}" was processed. You can now ask questions.`
        );
    } catch (error) {
        fileUploaded = false;
        sendButton.disabled = true;
        chatInput.disabled = true;
        uploadStatus.textContent = error.message;
    } finally {
        uploadButton.disabled = false;
        uploadButton.textContent = "Upload & Analyze";
    }
});

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

chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!fileUploaded) {
        addMessage("assistant", "Please upload a PDF before asking questions.");
        return;
    }

    const question = chatInput.value.trim();

    if (!question) return;

    addMessage("user", question);
    chatInput.value = "";

    const waitingMessage = addMessage(
        "assistant",
        "Let me check your study material..."
    );

    sendButton.disabled = true;

    try {
        const response = await fetch("/api/ask", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                question: question
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Could not get an answer.");
        }

        waitingMessage.querySelector("p").textContent = result.answer;
    } catch (error) {
        waitingMessage.querySelector("p").textContent = error.message;
    } finally {
        sendButton.disabled = !fileUploaded;
        chatInput.focus();
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
});