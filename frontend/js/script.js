

// =========================
// MARKETPLACE
// =========================

const products = [
    {
        name: "Study Desk",
        price: 50,
        condition: "Used",
        category: "Furniture",
        location: "Sunway",
        image: "/static/images/desk.jpg"
    },

    {
        name: "Computer Science Textbook",
        price: 20,
        condition: "Good",
        category: "Books",
        location: "Subang Jaya",
        image: "/static/images/book.jpg"
    },

    {
        name: "Cotton T-Shirt",
        price: 10,
        condition: "Like New",
        category: "Clothing",
        location: "Puchong",
        image: "/static/images/shirt.jpg"
    },

    {
        name: "Wireless Keyboard",
        price: 25,
        condition: "Used",
        category: "Electronics",
        location: "Sunway",
        image: "/static/images/keyboard.jpg"
    },

    {
        name: "Second hand comic",
        price: 3,
        condition: "Used",
        category: "Books",
        location: "Sunway",
        image: "/static/images/comic.jpg"
    }
];

const productGrid = document.getElementById("productGrid");
const searchInput = document.getElementById("searchInput");
const categoryButtons = document.querySelectorAll(".category-btn");

let selectedCategory = "All";
// Display products

function displayProducts(productList) {
    if (!productGrid) {
        return;
    }
    productGrid.innerHTML = "";
    if (productList.length === 0) {
        productGrid.innerHTML = `
            <div class="no-products">
                <h3>No items found</h3>
                <p>Try another search or category.</p>
            </div>
        `;
        return;
    }

    productList.forEach(product => {
        const card = document.createElement("div");
        card.className = "product-card";
        card.innerHTML = `
            <img
                src="${product.image}"
                alt="${product.name}"
                class="product-image"
            >

            <div class="product-info">
                <h3 class="product-name">
                    ${product.name}
                </h3>
                <p class="product-price">
                    RM ${product.price}
                </p>
                <span class="product-condition">
                    ${product.condition}
                </span>
                <p class="product-location">
                    📍 ${product.location}
                </p>
            </div>
        `;
        productGrid.appendChild(card);
    });
}

if (searchInput) {
    searchInput.addEventListener("input", filterProducts);
}

categoryButtons.forEach(button => {
    button.addEventListener("click", function () {
        categoryButtons.forEach(btn =>
            btn.classList.remove("active")
        );

        this.classList.add("active");

        selectedCategory = this.dataset.category;

        filterProducts();
    });
});

displayProducts(products);

function filterProducts() {
    const searchText = searchInput.value.toLowerCase().trim();

    const filteredProducts = products.filter(product => {
        const matchesSearch =
            product.name.toLowerCase().includes(searchText);

        const matchesCategory =
            selectedCategory === "All" ||
            product.category === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    displayProducts(filteredProducts);
}

// =========================
// NEIGHBOUR HELP & THREADS
// =========================

document.addEventListener("DOMContentLoaded", () => {
    // Initial sample neighbour help posts if localStorage is empty
    if (!localStorage.getItem("community_posts")) {
        const samplePosts = [
            {
                id: 1,
                title: "Need help carrying a heavy couch to the 2nd floor",
                username: "Sarah_M",
                content: "Hi neighbors! I just bought a second-hand sofa and need one or two friendly hands to help carry it up to my apartment on Saturday morning. Will provide coffee and snacks!",
                date: "Oct 14, 2026"
            },
            {
                id: 2,
                title: "Lawnmower available to borrow this weekend",
                username: "Dave_Green",
                content: "Hey everyone, I have an electric lawnmower that I'm not using this weekend. Feel free to message me if you need to borrow it for your yard.",
                date: "Oct 13, 2026"
            }
        ];
        localStorage.setItem("community_posts", JSON.stringify(samplePosts));
    }

    // 1. Render Thread Feed on Index Page
    const threadListEl = document.getElementById("threadList");
    if (threadListEl) {
        renderThreads();
    }

    // 2. Authentication & Create Post Protection (Only registered users allowed)
    const usernameInput = document.getElementById("usernameInput");
    const currentUser = localStorage.getItem("current_user"); // Set upon successful registration/login

    if (window.location.pathname.includes("create-post.html")) {
        if (!currentUser) {
            alert("You must be registered and logged in to create a post.");
            window.location.href = "/static/pages/register.html";
            return;
        }
        // Automatically set the logged-in username and make it readonly
        if (usernameInput) {
            usernameInput.value = currentUser;
            usernameInput.readOnly = true;
        }
    }

    // 3. Handle New Post Submission
    const postForm = document.getElementById("postForm");
    if (postForm) {
        postForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const username = currentUser || (usernameInput ? usernameInput.value.trim() : "Anonymous");
            const title = document.getElementById("titleInput").value.trim();
            const content = document.getElementById("contentInput").value.trim();

            if (!title || !content) {
                alert("Please fill in all required fields.");
                return;
            }

            const posts = JSON.parse(localStorage.getItem("community_posts")) || [];
            const newPost = {
                id: Date.now(),
                title: title,
                username: username,
                content: content,
                date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            };

            posts.unshift(newPost); // Add to beginning of array
            localStorage.setItem("community_posts", JSON.stringify(posts));

            // Redirect back to main feed
            window.location.href = "/";
        });
    }

    // 4. Render Thread Detail View
    const detailContainer = document.getElementById("threadDetailContainer");
    if (detailContainer) {
        const urlParams = new URLSearchParams(window.location.search);
        const postId = urlParams.get("id");
        const posts = JSON.parse(localStorage.getItem("community_posts")) || [];
        const post = posts.find(p => p.id == postId);

        if (post) {
            detailContainer.innerHTML = `
                <a href="/" class="back-link">← Back to Neighbour Help Feed</a>
                <div class="detail-card">
                    <h2 class="detail-title">${escapeHTML(post.title)}</h2>
                    <div class="detail-meta">Posted by <strong>@${escapeHTML(post.username)}</strong> on ${post.date}</div>
                    <div class="detail-body">${escapeHTML(post.content)}</div>
                </div>
            `;
        } else {
            detailContainer.innerHTML = `
                <a href="/" class="back-link">← Back to Feed</a>
                <div class="empty-state">
                    <h3>Post not found</h3>
                    <p>This post may have been removed or does not exist.</p>
                </div>
            `;
        }
    }
});

function renderThreads() {
    const threadListEl = document.getElementById("threadList");
    const posts = JSON.parse(localStorage.getItem("community_posts")) || [];

    if (posts.length === 0) {
        threadListEl.innerHTML = `
            <div class="empty-state">
                <h3>No requests or posts yet</h3>
                <p>Be the first neighbor to reach out for help or share an offer!</p>
            </div>
        `;
        return;
    }

    threadListEl.innerHTML = posts.map(post => `
        <a href="/static/pages/post-detail.html?id=${post.id}" class="thread-card">
            <h3 class="thread-title">${escapeHTML(post.title)}</h3>
            <div class="thread-meta">
                <span>👤 @${escapeHTML(post.username)}</span>
                <span>🕒 ${post.date}</span>
            </div>
        </a>
    `).join("");
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}