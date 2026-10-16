
document.addEventListener("DOMContentLoaded", () => {

    const registerForm = document.getElementById("registerForm");
    const registerMessage = document.getElementById("registerMessage");

    registerForm.addEventListener("submit", async (event) => {

        // Prevent browser from refreshing the page
        event.preventDefault();

        // Collect user input
        const resident = {
            full_name: document.getElementById("fullName").value.trim(),
            email: document.getElementById("email").value.trim(),
            phone: document.getElementById("phone").value.trim(),
            address: document.getElementById("address").value,
            password: document.getElementById("password").value
        };

        registerMessage.textContent = "Registering...";
        registerMessage.style.color = "#174d40";

        try {
            // Send user details to FastAPI
            const response = await fetch("/api/members", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(resident)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    typeof result.detail === "string"
                        ? result.detail
                        : "Registration failed. Please check your details."
                );
            }

            // Registration successful
            registerMessage.textContent =
                "Registration successful! Welcome to CommunityConnect.";

            registerMessage.style.color = "green";

            console.log("New Member ID:", result.member_id);
            sessionStorage.setItem("member_id", String(result.member_id));
            sessionStorage.setItem("member_name", resident.full_name); //stores the new test member's ID for the current browser tab

            // Clear form
            registerForm.reset();

        } catch (error) {

            registerMessage.textContent = error.message;
            registerMessage.style.color = "red";

        }

    });

});
