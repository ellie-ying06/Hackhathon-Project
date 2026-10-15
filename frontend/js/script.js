
// =========================
// MARKETPLACE
// =========================

const productGrid = document.getElementById("productGrid");
const searchInput = document.getElementById("searchInput");
const categoryButtons = document.querySelectorAll(".category-btn");

let products = [];
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
        card.style.cursor = "pointer";

        const safeText = (value) =>
            String(value ?? "").replace(/[&<>"']/g, char => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            })[char]);

        card.innerHTML = `
            <img
                src="${safeText(
                    product.image || "/static/images/placeholder.jpg"
                )}"
                alt="${safeText(product.name)}"
                class="product-image"
            >

            <div class="product-info">
                <h3 class="product-name">
                    ${safeText(product.name)}
                </h3>

                <p class="product-price">
                    RM ${Number(product.price).toFixed(2)}
                </p>

                <span class="product-condition">
                    ${safeText(product.condition)}
                </span>

                <p class="product-location">
                    📍 ${safeText(product.location)}
                </p>

                <p class="product-seller">
                    👤 ${safeText(product.seller)}
                </p>
            </div>
        `;

        card.addEventListener("click", () => {
            window.location.href =
                `/product?id=${encodeURIComponent(product.product_id)}`;
        });

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

fetchProducts();


function filterProducts() {
    const searchText = searchInput
        ? searchInput.value.toLowerCase().trim()
        : "";

    const filteredProducts = products.filter(product => {
        const matchesSearch =
            product.name.toLowerCase().includes(searchText) ||
            product.category.toLowerCase().includes(searchText) ||
            product.location.toLowerCase().includes(searchText);

        const matchesCategory =
            selectedCategory === "All" ||
            product.category === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    displayProducts(filteredProducts);
}


async function fetchProducts() {
    try {
        const response = await fetch("/api/products");

        if (!response.ok) {
            throw new Error("Failed to fetch products");
        }

        products = await response.json();

        displayProducts(products);

    } catch (error) {
        console.error("Error loading products:", error);

        productGrid.innerHTML = `
            <div class="no-products">
                <h3>Unable to load products</h3>
                <p>Please try again later.</p>
            </div>
        `;
    }
}

// =========================
// NEIGHBOUR HELP & THREADS
// =========================
// 1. Force-initialize sample posts immediately if localStorage is empty
const STORAGE_KEY = "community_posts_v2";

// Ensure sample posts exist immediately
if (!localStorage.getItem(STORAGE_KEY)) {
    const samplePosts = [
        {
            id: 1,
            title: "Need help carrying a heavy couch to the 2nd floor",
            username: "Sarah_M",
            content: "Hi neighbors! I just bought a second-hand sofa and need one or two friendly hands to help carry it up to my apartment on Saturday morning. Will provide coffee and snacks!",
            date: "Oct 14, 2026",
            comments: [
                { username: "Renu", text: "I'm free Saturday morning! Happy to help carry it.", date: "Oct 14, 2026" },
                { username: "Liam", text: "Count me in too if you need a second pair of hands.", date: "Oct 15, 2026" }
            ]
        },
        {
            id: 2,
            title: "!Need Help Taking care of 2 pet cats next Friday to Tuesday",
            username: "Alisha",
            content: "Can anyone help to take care of my two pet cats as I'm going on a vacation next Friday? Feel free to message me if you need to borrow it for your yard.",
            date: "Oct 13, 2026",
            comments: [
            ]
        }
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(samplePosts));
}

document.addEventListener("DOMContentLoaded", () => {
    // 1. Always try to render threads if the feed list exists
    renderThreads();

    // 2. Handle New Post Submission
    const postForm = document.getElementById("postForm");
    if (postForm) {
        postForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const usernameInput = document.getElementById("usernameInput");
            const username = usernameInput ? usernameInput.value.trim() : "Anonymous";
            const title = document.getElementById("titleInput").value.trim();
            const content = document.getElementById("contentInput").value.trim();

            if (!title || !content) {
                alert("Please fill in all required fields.");
                return;
            }

            const posts = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
            const newPost = {
                id: Date.now(),
                title: title,
                username: username,
                content: content,
                date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                comments: []
            };

            posts.unshift(newPost);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
            window.location.href = "/static/pages/help.html";
        });
    }

    // 3. Render Thread Detail View & Comments on post-detail.html
    const detailContainer = document.getElementById("threadDetailContainer");
    if (detailContainer) {
        renderPostDetail();
    }
});

function renderThreads() {
    const threadListEl = document.getElementById("threadList");
    if (!threadListEl) return;

    const posts = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

    if (posts.length === 0) {
        threadListEl.innerHTML = `
            <div class="empty-state">
                <h3>No requests or posts yet</h3>
                <p>Be the First Neighbour to reach out for Help or Share an Offer!</p>
            </div>
        `;
        return;
    }

    threadListEl.innerHTML = posts.map(post => `
        <a href="/static/pages/post-detail.html?id=${post.id}" class="thread-card">
            <h3 class="thread-title">${escapeHTML(post.title)}</h3>
            <div class="thread-meta">
                <span>👤 @${escapeHTML(post.username)}</span>
                <span>💬 ${post.comments ? post.comments.length : 0} Replies</span>
                <span> ${post.date}</span>
            </div>
        </a>
    `).join("");
}

function renderPostDetail() {
    const detailContainer = document.getElementById("threadDetailContainer");
    if (!detailContainer) return;

    const urlParams = new URLSearchParams(window.location.search);
    const postId = Number(urlParams.get("id"));
    const posts = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    const post = posts.find(p => Number(p.id) === postId);

    if (!post) {
        detailContainer.innerHTML = `
            <a href="/static/pages/help.html" class="back-link">← Back to Feed</a>
            <div class="empty-state">
                <h3>Post not found</h3>
                <p>This post may have been removed or does not exist.</p>
            </div>
        `;
        return;
    }

    const commentsHTML = post.comments && post.comments.length > 0 
        ? post.comments.map(c => `
            <div class="comment-card" style="background: #f4f7f5; padding: 12px 16px; border-radius: 8px; margin-bottom: 10px;">
                <div style="font-size: 0.9rem; color: #174d40; margin-bottom: 4px;"><strong>@${escapeHTML(c.username)}</strong> <span style="color: #777; font-size: 0.8rem;">• ${c.date}</span></div>
                <div style="color: #333; font-size: 0.95rem;">${escapeHTML(c.text)}</div>
            </div>
          `).join("")
        : `<p style="color: #66786e; font-style: italic;">No comments yet. Be the first to Lend a Hand!</p>`;

    detailContainer.innerHTML = `
        <a href="/static/pages/help.html" class="back-link">← Back to Neighbour Help Feed</a>
        
        <div class="detail-card" style="margin-bottom: 30px;">
            <h2 class="detail-title">${escapeHTML(post.title)}</h2>
            <div class="detail-meta">Posted by <strong>@${escapeHTML(post.username)}</strong> on ${post.date}</div>
            <div class="detail-body" style="margin-top: 15px; line-height: 1.6;">${escapeHTML(post.content)}</div>
        </div>

        <div class="comments-section">
            <h3 style="color: #174d40; margin-bottom: 15px;">Community Replies (${post.comments ? post.comments.length : 0})</h3>
            <div id="commentsList" style="margin-bottom: 25px;">
                ${commentsHTML}
            </div>

            <div class="form-card" style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                <h4 style="margin-top: 0; color: #174d40;">Leave a Reply</h4>
                <form id="commentForm">
                    <div style="margin-bottom: 12px;">
                        <label for="commentText" style="display: block; margin-bottom: 5px; font-weight: 500;">Your Message</label>
                        <textarea id="commentText" rows="3" placeholder="..." required style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 6px;"></textarea>
                    </div>
                    <button type="submit" class="btn">Post Reply</button>
                </form>
            </div>
        </div>
    `;

    const commentForm = document.getElementById("commentForm");
    if (commentForm) {
        commentForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const cUser = document.getElementById("commentUser").value.trim();
            const cText = document.getElementById("commentText").value.trim();

            if (!cUser || !cText) return;

            const newComment = {
                username: cUser,
                text: cText,
                date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            };

            post.comments.push(newComment);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));

            renderPostDetail();
        });
    }
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}
