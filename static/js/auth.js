// =====================================================
// MEWAR CAMPUS AI — AUTHENTICATION CLIENT CONTROLLER
// Handles Login, Register, Mode Toggling & UI Validation
// =====================================================

"use strict";

document.addEventListener("DOMContentLoaded", () => {
    // Tab & Toggle Elements
    const tabLoginBtn = document.getElementById("tabLoginBtn");
    const tabRegisterBtn = document.getElementById("tabRegisterBtn");
    const toggleModeLink = document.getElementById("toggleModeLink");
    const promptText = document.getElementById("promptText");

    const cardHeading = document.getElementById("cardHeading");
    const cardSubheading = document.getElementById("cardSubheading");

    // Forms
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");

    // Login Elements
    const loginEmail = document.getElementById("loginEmail");
    const loginPassword = document.getElementById("loginPassword");
    const loginEmailWrap = document.getElementById("loginEmailWrap");
    const loginPasswordWrap = document.getElementById("loginPasswordWrap");
    const loginEmailError = document.getElementById("loginEmailError");
    const loginPasswordError = document.getElementById("loginPasswordError");
    const toggleLoginPassword = document.getElementById("toggleLoginPassword");
    const loginSubmitBtn = document.getElementById("loginSubmitBtn");

    // Register Elements
    const regName = document.getElementById("regName");
    const regEmail = document.getElementById("regEmail");
    const regPassword = document.getElementById("regPassword");
    const regConfirmPassword = document.getElementById("regConfirmPassword");
    const regNameWrap = document.getElementById("regNameWrap");
    const regEmailWrap = document.getElementById("regEmailWrap");
    const regPasswordWrap = document.getElementById("regPasswordWrap");
    const regConfirmWrap = document.getElementById("regConfirmWrap");
    const regNameError = document.getElementById("regNameError");
    const regEmailError = document.getElementById("regEmailError");
    const regPasswordError = document.getElementById("regPasswordError");
    const regConfirmError = document.getElementById("regConfirmError");
    const toggleRegPassword = document.getElementById("toggleRegPassword");
    const regSubmitBtn = document.getElementById("regSubmitBtn");

    // Alert Message
    const serverAlert = document.getElementById("serverAlert");

    // ----------------------------------------------------
    // Tab Switching Logic
    // ----------------------------------------------------
    function switchToLogin() {
        if (!loginForm || !registerForm) return;
        loginForm.style.display = "flex";
        registerForm.style.display = "none";

        tabLoginBtn?.classList.add("active");
        tabLoginBtn?.setAttribute("aria-selected", "true");
        tabRegisterBtn?.classList.remove("active");
        tabRegisterBtn?.setAttribute("aria-selected", "false");

        if (cardHeading) cardHeading.innerHTML = 'Welcome <span class="accent">Back</span>';
        if (cardSubheading) cardSubheading.textContent = 'Login to your Mewar Campus AI account';

        if (promptText) promptText.textContent = "Don't have an account?";
        if (toggleModeLink) toggleModeLink.textContent = "Register here";
    }

    function switchToRegister() {
        if (!loginForm || !registerForm) return;
        loginForm.style.display = "none";
        registerForm.style.display = "flex";

        tabRegisterBtn?.classList.add("active");
        tabRegisterBtn?.setAttribute("aria-selected", "true");
        tabLoginBtn?.classList.remove("active");
        tabLoginBtn?.setAttribute("aria-selected", "false");

        if (cardHeading) cardHeading.innerHTML = 'Create <span class="accent">Account</span>';
        if (cardSubheading) cardSubheading.textContent = 'Join Mewar Campus AI today';

        if (promptText) promptText.textContent = "Already have an account?";
        if (toggleModeLink) toggleModeLink.textContent = "Login here";
    }

    tabLoginBtn?.addEventListener("click", switchToLogin);
    tabRegisterBtn?.addEventListener("click", switchToRegister);

    toggleModeLink?.addEventListener("click", (e) => {
        e.preventDefault();
        if (loginForm && loginForm.style.display !== "none") {
            switchToRegister();
        } else {
            switchToLogin();
        }
    });

    // Check if server indicated register mode or URL contains #register
    if (window.__SHOW_REGISTER_TAB__ || window.location.hash === "#register") {
        switchToRegister();
    }

    // ----------------------------------------------------
    // Error Display Helpers
    // ----------------------------------------------------
    function showError(input, wrapper, errorElem, message) {
        if (wrapper) wrapper.classList.add("has-error");
        if (errorElem) {
            errorElem.textContent = message;
            errorElem.classList.add("visible");
        }
        if (input) input.setAttribute("aria-invalid", "true");
    }

    function clearError(input, wrapper, errorElem) {
        if (wrapper) wrapper.classList.remove("has-error");
        if (errorElem) {
            errorElem.textContent = "";
            errorElem.classList.remove("visible");
        }
        if (input) input.removeAttribute("aria-invalid");
    }

    function clearAlert() {
        if (serverAlert) {
            serverAlert.textContent = "";
            serverAlert.className = "server-alert";
        }
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    // ----------------------------------------------------
    // Password Visibility Toggles
    // ----------------------------------------------------
    function setupPasswordToggle(button, input) {
        if (!button || !input) return;
        button.addEventListener("click", () => {
            const isPassword = input.type === "password";
            input.type = isPassword ? "text" : "password";
            button.style.color = isPassword ? "#a855f7" : "#64748b";
            button.setAttribute("aria-label", isPassword ? "Hide password" : "Show password");
        });
    }

    setupPasswordToggle(toggleLoginPassword, loginPassword);
    setupPasswordToggle(toggleRegPassword, regPassword);

    // ----------------------------------------------------
    // Live Input Listeners (Clear Errors on Type)
    // ----------------------------------------------------
    const allInputs = [loginEmail, loginPassword, regName, regEmail, regPassword, regConfirmPassword];
    allInputs.forEach((inp) => {
        if (!inp) return;
        inp.addEventListener("input", () => {
            clearAlert();
            if (inp === loginEmail) clearError(loginEmail, loginEmailWrap, loginEmailError);
            if (inp === loginPassword) clearError(loginPassword, loginPasswordWrap, loginPasswordError);
            if (inp === regName) clearError(regName, regNameWrap, regNameError);
            if (inp === regEmail) clearError(regEmail, regEmailWrap, regEmailError);
            if (inp === regPassword) clearError(regPassword, regPasswordWrap, regPasswordError);
            if (inp === regConfirmPassword) clearError(regConfirmPassword, regConfirmWrap, regConfirmError);
        });
    });

    // ----------------------------------------------------
    // Login Form Validation & Submit
    // ----------------------------------------------------
    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            let valid = true;
            const emailVal = loginEmail?.value.trim() || "";
            const passVal = loginPassword?.value || "";

            if (!emailVal) {
                showError(loginEmail, loginEmailWrap, loginEmailError, "Please enter your email address.");
                valid = false;
            } else if (!isValidEmail(emailVal)) {
                showError(loginEmail, loginEmailWrap, loginEmailError, "Please enter a valid email format.");
                valid = false;
            } else {
                clearError(loginEmail, loginEmailWrap, loginEmailError);
            }

            if (!passVal) {
                showError(loginPassword, loginPasswordWrap, loginPasswordError, "Please enter your password.");
                valid = false;
            } else {
                clearError(loginPassword, loginPasswordWrap, loginPasswordError);
            }

            if (!valid) {
                e.preventDefault();
                return;
            }

            if (loginSubmitBtn) {
                loginSubmitBtn.disabled = true;
                const txt = loginSubmitBtn.querySelector(".btn-text");
                if (txt) txt.textContent = "Logging in...";
            }
        });
    }

    // ----------------------------------------------------
    // Register Form Validation & Submit
    // ----------------------------------------------------
    if (registerForm) {
        registerForm.addEventListener("submit", (e) => {
            let valid = true;
            const nameVal = regName?.value.trim() || "";
            const emailVal = regEmail?.value.trim() || "";
            const passVal = regPassword?.value || "";
            const confirmVal = regConfirmPassword?.value || "";

            if (!nameVal) {
                showError(regName, regNameWrap, regNameError, "Please enter your full name.");
                valid = false;
            } else {
                clearError(regName, regNameWrap, regNameError);
            }

            if (!emailVal) {
                showError(regEmail, regEmailWrap, regEmailError, "Please enter your email address.");
                valid = false;
            } else if (!isValidEmail(emailVal)) {
                showError(regEmail, regEmailWrap, regEmailError, "Please enter a valid email format.");
                valid = false;
            } else {
                clearError(regEmail, regEmailWrap, regEmailError);
            }

            if (!passVal) {
                showError(regPassword, regPasswordWrap, regPasswordError, "Please enter a password.");
                valid = false;
            } else if (passVal.length < 6) {
                showError(regPassword, regPasswordWrap, regPasswordError, "Password must be at least 6 characters.");
                valid = false;
            } else {
                clearError(regPassword, regPasswordWrap, regPasswordError);
            }

            if (!confirmVal) {
                showError(regConfirmPassword, regConfirmWrap, regConfirmError, "Please confirm your password.");
                valid = false;
            } else if (passVal !== confirmVal) {
                showError(regConfirmPassword, regConfirmWrap, regConfirmError, "Passwords do not match.");
                valid = false;
            } else {
                clearError(regConfirmPassword, regConfirmWrap, regConfirmError);
            }

            if (!valid) {
                e.preventDefault();
                return;
            }

            if (regSubmitBtn) {
                regSubmitBtn.disabled = true;
                const txt = regSubmitBtn.querySelector(".btn-text");
                if (txt) txt.textContent = "Creating Account...";
            }
        });
    }

    // ----------------------------------------------------
    // Restore buttons on page back/forward cache
    // ----------------------------------------------------
    window.addEventListener("pageshow", () => {
        if (loginSubmitBtn) {
            loginSubmitBtn.disabled = false;
            const txt = loginSubmitBtn.querySelector(".btn-text");
            if (txt) txt.textContent = "Login";
        }
        if (regSubmitBtn) {
            regSubmitBtn.disabled = false;
            const txt = regSubmitBtn.querySelector(".btn-text");
            if (txt) txt.textContent = "Create Account";
        }
    });
});
