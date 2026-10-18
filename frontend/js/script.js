
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
        
        // Temporary UI-only ownership check for local demo
        const currentMemberId = Number(
            sessionStorage.getItem("member_id")
        );

        const isOwner =
            currentMemberId > 0 &&
            currentMemberId === Number(product.member_id);  

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

                <span class="buyer-label">
                    View Product Details
                </span>
            
        </div>
    `;

    // Only the seller sees Edit and Delete buttons
    
    // Only the seller sees Edit and Delete buttons
    // if (isOwner) {
    //     const editBtn = card.querySelector(".edit-product-btn");
    //     const deleteBtn = card.querySelector(".delete-product-btn");

    //     editBtn.addEventListener("click", async (event) => {
    //         event.stopPropagation();
    //         await editProduct(product);
    //     });

    //     deleteBtn.addEventListener("click", async (event) => {
    //         event.stopPropagation();
    //         await deleteProduct(product);
    //     });
    // }


    // Clicking the product card opens product details
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


async function editProduct(product) {
    const memberId = Number(sessionStorage.getItem("member_id"));

    if (!memberId || memberId !== Number(product.member_id)) {
        alert("You can only edit your own products.");
        return;
    }

    // Ask for the updated product details.
    // Press Cancel to stop editing.
    const name = prompt("Product name:", product.name);
    if (name === null) return;

    const priceText = prompt("Price (RM):", product.price);
    if (priceText === null) return;

    const category = prompt("Category:", product.category);
    if (category === null) return;

    const condition = prompt("Condition:", product.condition);
    if (condition === null) return;

    const location = prompt("Location:", product.location);
    if (location === null) return;

    const description = prompt(
        "Description:",
        product.description || ""
    );
    if (description === null) return;

    // Validate the input before sending it to the backend.
    const trimmedName = name.trim();
    const trimmedCategory = category.trim();
    const trimmedCondition = condition.trim();
    const trimmedLocation = location.trim();
    const price = Number(priceText);

    if (
        !trimmedName ||
        !trimmedCategory ||
        !trimmedCondition ||
        !trimmedLocation ||
        priceText.trim() === "" ||
        !Number.isFinite(price) ||
        price < 0
    ) {
        alert("Please enter valid product details and a price of RM 0 or above.");
        return;
    }

    const updatedProduct = {
        name: trimmedName,
        price: price,
        category: trimmedCategory,
        condition: trimmedCondition,
        location: trimmedLocation,
        description: description.trim(),
        image: product.image || ""
    };

    try {
        const response = await fetch(
            `/api/products/${product.product_id}?member_id=${memberId}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(updatedProduct)
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.detail || "Failed to update product."
            );
        }

        alert("Product updated successfully!");

        // Reload products to show the latest information.
        await fetchProducts();

    } catch (error) {
        console.error("Edit product error:", error);
        alert(error.message || "Unable to update product.");
    }
}


async function deleteProduct(product) {
    const memberId = Number(sessionStorage.getItem("member_id"));

    if (!memberId || memberId !== Number(product.member_id)) {
        alert("You can only delete your own products.");
        return;
    }

    const confirmed = confirm(
        `Are you sure you want to delete "${product.name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
        const response = await fetch(
            `/api/products/${product.product_id}?member_id=${memberId}`,
            {
                method: "DELETE"
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.detail || "Failed to delete product."
            );
        }

        alert("Product deleted successfully!");

        // Reload products to remove the deleted item.
        await fetchProducts();

    } catch (error) {
        console.error("Delete product error:", error);
        alert(error.message || "Unable to delete product.");
    }
}


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

// =================================
// THREADS, HELP, EVENTS & COMMUNITY
// =================================
// Check which page is being used 
let pageType = "help"; // Help page as default configuration

if (window.location.pathname.includes("events.html")) {
  pageType = "events";
} else if (window.location.pathname.includes("community.html")) {
  pageType = "community";
} else if (window.location.pathname.includes("post-detail.html")) {
  const urlParams = new URLSearchParams(window.location.search);
  const typeParam = urlParams.get("type");
  if (typeParam === "events" || typeParam === "community") {
    pageType = typeParam;
  }
}

// Page configurations
const CONFIGS = {
  help: {
    storageKey: "NEIGHBOUR_HELP_KEY",
    redirectUrl: "/static/pages/help.html",
    feedName: "Neighbour Help Feed",
    emptyMsg: "No requests or posts yet",
    emptySub: "Be the First Neighbour to reach out for Help or Share an Offer!"
  },
  events: {
    storageKey: "EVENTS_KEY",
    redirectUrl: "/static/pages/events.html",
    feedName: "Events Feed",
    emptyMsg: "No events yet",
    emptySub: "Have an Event Approved by the Residential Committee? Promote it Here!"
  },
  community: {
    storageKey: "COMMUNITY_KEY",
    redirectUrl: "/static/pages/community.html",
    feedName: "Community Message Board",
    emptyMsg: "No discussion posts yet",
    emptySub: "Be the First Neighbour to Start a Conversation!"
  }
};

const activeConfig = CONFIGS[pageType];

// Sample posts 
const sampleData = {
  help: [
    {
        id: "h1",
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
        id: "h2",
        title: "!Need Help Taking care of 2 pet cats next Friday to Tuesday",
        username: "Alisha",
        content: "Can anyone help to take care of my two pet cats as I'm going on a vacation next Friday?",
        date: "Oct 13, 2026",
        comments: []
    }
  ],
  events: [
    {
        id: "e1",
        title: "Annual Gotong Royong",
        username: "Official_Residential_Committee",
        content: "It's that time of year again! Register now to help keep our neighbourhood clean!",
        date: "Oct 15, 2026",
        comments: []
    }
  ],
  community: [
    {
        id: "c1",
        title: "Anyone's cat?",
        username: "Alex_Lee",
        content: "Saw a cat with orange and white fur this morning. Is anyone missing a cat? It looked like it had a collar.",
        date: "Oct 10, 2026",
        comments: [
            { username: "CatMom_Betty", text: "Yes, that's my Oyen! He ran away this morning but we have since got him back. Thanks for the concern!", date: "Oct 10, 2026" },
        ]
    }
  ]
};

if (!localStorage.getItem(activeConfig.storageKey)) {
  localStorage.setItem(activeConfig.storageKey, JSON.stringify(sampleData[pageType]));
}

// ! OLD CODE FOR POSTERITY, IN CASE OF ERRORS ! :
// 1. Force-initialize sample posts immediately if localStorage is empty
// const STORAGE_KEY = "community_posts_v2";

// // Ensure sample posts exist immediately
// if (!localStorage.getItem(STORAGE_KEY)) {
//     const samplePosts = [
//         {
//             id: 1,
//             title: "Need help carrying a heavy couch to the 2nd floor",
//             username: "Sarah_M",
//             content: "Hi neighbors! I just bought a second-hand sofa and need one or two friendly hands to help carry it up to my apartment on Saturday morning. Will provide coffee and snacks!",
//             date: "Oct 14, 2026",
//             comments: [
//                 { username: "Renu", text: "I'm free Saturday morning! Happy to help carry it.", date: "Oct 14, 2026" },
//                 { username: "Liam", text: "Count me in too if you need a second pair of hands.", date: "Oct 15, 2026" }
//             ]
//         },
//         {
//             id: 2,
//             title: "!Need Help Taking care of 2 pet cats next Friday to Tuesday",
//             username: "Alisha",
//             content: "Can anyone help to take care of my two pet cats as I'm going on a vacation next Friday? Feel free to message me if you need to borrow it for your yard.",
//             date: "Oct 13, 2026",
//             comments: [
//             ]
//         }
//     ];
//     localStorage.setItem(STORAGE_KEY, JSON.stringify(samplePosts));
// }

document.addEventListener("DOMContentLoaded", () => {
    // 1. Always try to render threads if the feed list exists
    renderThreads();

    // 2. Handle New Post Submission
    const postForm = document.getElementById("postForm");
    
    if (postForm) {
        postForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const memberId = sessionStorage.getItem("member_id");
            const title = document.getElementById("titleInput").value.trim();
            const content = document.getElementById("contentInput").value.trim();

            if (!memberId) {
                alert("Please register first before creating a post.");
                window.location.href = "/static/pages/register.html";
                return;
            }

            if (!title || !content) {
                alert("Please fill in all required fields.");
                return;
            }

            const posts = JSON.parse(localStorage.getItem(activeConfig.storageKey)) || [];
            const newPost = {
                id: Date.now(),
                title: title,
                username: username,
                content: content,
                date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                comments: []
            };

            posts.unshift(newPost);
            localStorage.setItem(activeConfig.storageKey, JSON.stringify(posts));
            window.location.href = "/static/pages/help.html";
            try {
                const response = await fetch("/api/posts", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        member_id: Number(memberId),
                        title: title,
                        content: content,
                        category: "General"
                    })
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(
                        typeof result.detail === "string"
                            ? result.detail
                            : "Could not create your post."
                    );
                }

                alert("Your post has been published!");
                window.location.href = "/static/pages/help.html";

            } catch (error) {
                console.error("Create post error:", error);
                alert(error.message || "Something went wrong. Please try again.");
            }
        });
    }


    // 3. Render Thread Detail View & Comments on post-detail.html
    const detailContainer = document.getElementById("threadDetailContainer");
    if (detailContainer) {
        renderPostDetail();
    }
});


async function renderThreads() {
    const threadListEl = document.getElementById("threadList");
    if (!threadListEl) return;

    const posts = JSON.parse(localStorage.getItem(activeConfig.storageKey)) || [];
    // Show a loading message while fetching posts
    threadListEl.innerHTML = "<p>Loading posts...</p>";

    try {
        // Get posts from the FastAPI backend
        const response = await fetch("/api/posts");

        if (!response.ok) {
            throw new Error("Failed to load community posts.");
        }

        const posts = await response.json();

        if (posts.length === 0) {
            threadListEl.innerHTML = `
                <div class="empty-state">
                    <p>Be the First Neighbour to reach out for Help or Share an Offer!</p>
                </div>
            `;
            return;
        }

        // Display posts returned by the database
        threadListEl.innerHTML = posts.map(post => `
            <a href="/static/pages/post-detail.html?id=${post.post_id}"
               class="thread-card">
                <h3 class="thread-title">
                    ${escapeHTML(post.title)}
                </h3>

                <div class="thread-meta">
                    <span>👤 @${escapeHTML(post.author || "Anonymous")}</span>
                    <span>💬 ${post.reply_count} ${post.reply_count === 1 ? "Reply" : "Replies"}</span>
                    <span>${escapeHTML(post.created_at || "")}</span>
                </div>
            </a>
        `).join("");

    } catch (error) {
        console.error("Load posts error:", error);

        threadListEl.innerHTML = `
            <div class="empty-state">
                <p>Unable to load posts. Please try again later.</p>
            </div>
        `;
    }

    threadListEl.innerHTML = posts.map(post => `
        <a href="/static/pages/post-detail.html?id=${post.id}&type=${pageType}" class="thread-card">
            <h3 class="thread-title">${escapeHTML(post.title)}</h3>
            <div class="thread-meta">
                <span>👤 @${escapeHTML(post.username)}</span>
                <span>💬 ${post.comments ? post.comments.length : 0} Replies</span>
                <span> ${post.date}</span>
            </div>
        </a>
    `).join("");
}

async function renderPostDetail() {
    const detailContainer = document.getElementById("threadDetailContainer");
    if (!detailContainer) return;

    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get("id");
    const posts = JSON.parse(localStorage.getItem(activeConfig.storageKey)) || [];
    const post = posts.find(p => String(p.id) === postId);

    if (!postId) {
        detailContainer.innerHTML = `
            <a href="${activeConfig.redirectUrl}" class="back-link">← Back to ${activeConfig.feedName}</a>
            <div class="empty-state">
                <h3>Invalid post</h3>
                <p>Please select a post from the Help feed.</p>
            </div>
        `;
        return;
    }

    detailContainer.innerHTML = "<p>Loading post...</p>";

    // detailContainer.innerHTML = `
    //     <a href="${activeConfig.redirectUrl}" class="back-link">← Back to ${activeConfig.feedName}</a>
        
    //     <div class="detail-card" style="margin-bottom: 30px;">
    //         <h2 class="detail-title">${escapeHTML(post.title)}</h2>
    //         <div class="detail-meta">Posted by <strong>@${escapeHTML(post.username)}</strong> on ${post.date}</div>
    //         <div class="detail-body" style="margin-top: 15px; line-height: 1.6;">${escapeHTML(post.content)}</div>
    //     </div>
    
    try {
        // Load the post
        const postResponse = await fetch(`/api/posts/${postId}`);

        if (!postResponse.ok) {
            throw new Error(
                postResponse.status === 404
                    ? "Post not found."
                    : "Failed to load post."
            );
        }

        const post = await postResponse.json();

        // Load replies for this post
        const repliesResponse = await fetch(
            `/api/posts/${postId}/replies`
        );

        if (!repliesResponse.ok) {
            throw new Error("Failed to load replies.");
        }

        const replies = await repliesResponse.json();

        const repliesHTML = replies.length > 0
            ? replies.map(reply => `
                <div class="comment-card"
                     style="background: #f4f7f5; padding: 12px 16px; border-radius: 8px; margin-bottom: 10px;">
                    <div style="font-size: 0.9rem; color: #174d40; margin-bottom: 4px;">
                        <strong>@${escapeHTML(reply.author || "Neighbour")}</strong>
                        <span style="color: #777; font-size: 0.8rem;">
                            • ${escapeHTML(reply.created_at || "")}
                        </span>
                    </div>
                    <div style="color: #333; font-size: 0.95rem; white-space: pre-wrap;">${escapeHTML(reply.content)}</div>
                </div>
            `).join("")
            : `<p style="color: #66786e; font-style: italic;">
                No replies yet. Be the first to Lend a Hand!
               </p>`;

        detailContainer.innerHTML = `
            <a href="/static/pages/help.html" class="back-link">
                ← Back to Neighbour Help Feed
            </a>

            <div class="detail-card" style="margin-bottom: 30px;">
                <h2 class="detail-title">${escapeHTML(post.title)}</h2>
                <div class="detail-meta">
                    Posted by <strong>@${escapeHTML(post.author || "Anonymous")}</strong>
                    on ${escapeHTML(post.created_at || "")}
                </div>
                <div class="detail-body" style="margin-top: 15px; line-height: 1.6; white-space: pre-wrap;">${escapeHTML(post.content)}</div>
            </div>

            <div class="comments-section">
                <h3 style="color: #174d40; margin-bottom: 15px;">
                    Community Replies (${replies.length})
                </h3>

                <div id="commentsList" style="margin-bottom: 25px;">
                    ${repliesHTML}
                </div>

                <div class="form-card" style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                    <h4 style="margin-top: 0; color: #174d40;">Leave a Reply</h4>
                    <form id="commentForm">
                        <div style="margin-bottom: 12px;">
                            <label for="commentText" style="display: block; margin-bottom: 5px; font-weight: 500;">
                                Your Message
                            </label>
                            <textarea id="commentText" rows="3"
                                placeholder="Write your reply..."
                                required
                                style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 6px;"></textarea>
                        </div>
                        <button type="submit" class="btn">Post Reply</button>
                    </form>
                </div>
            </div>
        `;

        // Submit a reply to the backend
        const commentForm = document.getElementById("commentForm");

        commentForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const memberId = sessionStorage.getItem("member_id");
            const commentText = document.getElementById("commentText");
            const content = commentText.value.trim();
            const submitButton = commentForm.querySelector(
                'button[type="submit"]'
            );

            if (!memberId) {
                alert("Please register first before replying.");
                window.location.href = "/static/pages/register.html";
                return;
            }

            if (!content) {
                alert("Please enter a reply.");
                return;
            }

            submitButton.disabled = true;

            try {
                const response = await fetch("/api/replies", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        post_id: postId,
                        member_id: Number(memberId),
                        content: content
                    })
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(
                        typeof result.detail === "string"
                            ? result.detail
                            : "Failed to submit reply."
                    );
                }

                // Reload the post and replies to show the new reply
                await renderPostDetail();

            } catch (error) {
                console.error("Submit reply error:", error);
                alert(error.message || "Unable to submit reply.");
                submitButton.disabled = false;
            }
        });

    } catch (error) {
        console.error("Load post detail error:", error);

        detailContainer.innerHTML = `
            <a href="/static/pages/help.html" class="back-link">← Back to Feed</a>
            <div class="empty-state">
                <h3>Unable to load post</h3>
                <p>${escapeHTML(error.message || "Please try again later.")}</p>
            </div>
        `;
    }
}



function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}


/* =========================
   MARKETPLACE POST ITEM
========================= */

const postItemBtn = document.getElementById("postItemBtn");
const postItemModal = document.getElementById("postItemModal");
const closePostModal = document.getElementById("closePostModal");
const postItemForm = document.getElementById("postItemForm");

// Open and close the popup
if (postItemBtn && postItemModal && closePostModal) {

    postItemBtn.addEventListener("click", () => {
        postItemModal.hidden = false;
    });

    closePostModal.addEventListener("click", () => {
        postItemModal.hidden = true;
    });

    postItemModal.addEventListener("click", (event) => {
        if (event.target === postItemModal) {
            postItemModal.hidden = true;
        }
    });
}

// Submit item to FastAPI
if (postItemForm) {

    postItemForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const memberId = sessionStorage.getItem("member_id");

        if (!memberId) {
            alert("Please register before posting an item.");
            window.location.href = "/static/pages/register.html";
            return;
        }

        const product = {
            member_id: Number(memberId),
            name: document.getElementById("itemTitle").value.trim(),
            price: Number(document.getElementById("itemPrice").value),
            category: document.getElementById("itemCategory").value,
            condition: document.getElementById("itemCondition").value,
            location: document.getElementById("itemLocation").value.trim(),
            description: document.getElementById("itemDescription").value.trim(),
            image: ""
        };

        try {
            const response = await fetch("/api/products", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(product)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    typeof result.detail === "string"
                        ? result.detail
                        : "Failed to post item."
                );
            }

            alert("Item posted successfully!");

            postItemForm.reset();
            postItemModal.hidden = true;

            await fetchProducts();

        } catch (error) {
            console.error("Error posting item:", error);
            alert(error.message);
        }
    });
}
