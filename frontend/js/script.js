const button = document.getElementById("checkApi");
const result = document.getElementById("result");

button.addEventListener("click", async () => {
    result.textContent = "Connecting...";

    try {
        const response = await fetch("/api/health");

        if (!response.ok) {
            throw new Error("Request failed");
        }

        const data = await response.json();
        result.textContent = `Backend status: ${data.status}`;
    } catch (error) {
        result.textContent = "Cannot connect to the backend.";
    }
});