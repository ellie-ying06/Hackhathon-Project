
document.addEventListener("DOMContentLoaded", async () => {

    const profileName = document.getElementById("profileName");
    const profileEmail = document.getElementById("profileEmail");
    const profileLocation = document.getElementById("profileLocation");
    const logoutBtn = document.getElementById("logoutBtn");

    // Check whether a user is logged in
    try {
        const response = await fetch("/api/me", {
            credentials: "same-origin",
            cache: "no-store"
        });

        // Not logged in -> Go to login page
        if (response.status === 401) {
            window.location.replace("/static/pages/login.html");
            return;
        }

        if (!response.ok) {
            throw new Error("Unable to load your profile.");
        }

        const member = await response.json();

        // Display the logged-in member's information
        profileName.textContent = member.full_name;
        profileEmail.textContent = member.email;
        profileLocation.textContent =
            member.address || "Residential area not provided";

        // Load this member's Marketplace listings
        await loadMyMarketplace(member.member_id);

    } catch (error) {
        console.error("Profile error:", error);
        profileName.textContent = "Unable to load profile";
        profileEmail.textContent = error.message;
    }

    // Log out
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            try {
                const response = await fetch("/api/logout", {
                    method: "POST",
                    credentials: "same-origin"
                });

                if (!response.ok) {
                    throw new Error("Logout failed.");
                }

                sessionStorage.removeItem("member_id");

                window.location.replace(
                    "/static/pages/login.html"
                );

            } catch (error) {
                alert(error.message);
            }
        });
    }
});


// Show only products belonging to the logged-in user
async function loadMyMarketplace(memberId) {

    const container = document.getElementById("myMarketplace");

    if (!container) return;

    try {
        const response = await fetch("/api/products");

        if (!response.ok) {
            throw new Error("Unable to load Marketplace listings.");
        }

        const products = await response.json();

        const myProducts = products.filter(
            product => Number(product.member_id) === Number(memberId)
        );
        
        const countElement = document.getElementById("marketplaceCount");

        if (countElement) {
            countElement.textContent = myProducts.length;
        }

        container.replaceChildren();

        if (myProducts.length === 0) {
            const empty = document.createElement("p");
            empty.textContent = "You haven't listed any items yet.";
            container.appendChild(empty);
            return;
        }

        myProducts.forEach(product => {
            const item = document.createElement("div");
            item.className = "list-item";

            const details = document.createElement("div");
            details.className = "item-details";

            const name = document.createElement("h3");
            name.textContent = product.name;

            const price = document.createElement("p");
            price.textContent = `RM ${Number(product.price).toFixed(2)}`;

            const link = document.createElement("a");
            link.href = `/product?id=${encodeURIComponent(product.product_id)}`;
            link.textContent = "View Product Details";

            details.append(name, price, link);
            item.appendChild(details);
            container.appendChild(item);
        });

    } catch (error) {
        console.error(error);
        container.textContent = "Unable to load listings.";
    }
}
