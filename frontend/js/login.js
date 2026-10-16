
document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const loginMessage = document.getElementById("loginMessage");

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const credentials = {
            email: document.getElementById("email").value.trim(),
            password: document.getElementById("password").value
        };

        loginMessage.textContent = "Logging in...";
        loginMessage.style.color = "#174d40";

        try {
            const response = await fetch("/api/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(credentials)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    typeof result.detail === "string"
                        ? result.detail
                        : "Login failed. Please try again."
                );
            }

            loginMessage.textContent = "Login successful!";
            loginMessage.style.color = "green";

            loginForm.reset();

            // Redirect after successful login.
            // Change "/" if your intended destination is different.
            window.location.href = "/";

        } catch (error) {
            loginMessage.textContent = error.message;
            loginMessage.style.color = "red";
        }
    });
});
