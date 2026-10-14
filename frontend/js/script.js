

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
        card.innerHTML = `
        <img
        src="${product.image || '/static/images/placeholder.jpg'}"
        alt="${product.name}"
        class="product-image"
    >

    <div class="product-info">

        <h3 class="product-name">
            ${product.name}
        </h3>

        <p class="product-price">
            RM ${product.price.toFixed(2)}
        </p>

        <span class="product-condition">
            ${product.condition}
        </span>

        <p class="product-location">
            📍 ${product.location}
        </p>

        <p class="product-seller">
            👤 ${product.seller}
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