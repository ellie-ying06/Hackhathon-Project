

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