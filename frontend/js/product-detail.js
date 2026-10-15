
const productDetail = document.getElementById("productDetail");

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

async function loadProductDetails() {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get("id");

    if (!productId || !/^\d+$/.test(productId)) {
        productDetail.innerHTML = "<p>Invalid product ID.</p>";
        return;
    }

    try {
        const response = await fetch(`/api/products/${productId}`);

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error("Product not found.");
            }

            throw new Error("Unable to load product details.");
        }

        const product = await response.json();

        productDetail.innerHTML = `
            <div class="product-detail-card">
                <img
                    src="${escapeHTML(
                        product.image || "/static/images/placeholder.jpg")}"
                    alt="${escapeHTML(product.name)}"
                    class="product-detail-image"
                >

                <div class="product-detail-info">
                    <span class="product-condition">
                        ${escapeHTML(product.condition)}
                    </span>

                    <h1>${escapeHTML(product.name)}</h1>

                    <p class="product-detail-price">
                        RM ${Number(product.price).toFixed(2)}
                    </p>

                    <p>
                        <strong>Category:</strong>
                        ${escapeHTML(product.category)}
                    </p>

                    <p>
                        <strong>Location:</strong>
                        ${escapeHTML(product.location)}
                    </p>

                    <div class="product-actions">
                    <a
                        href="/edit-product?id=${encodeURIComponent(product.product_id)}"
                        class="sell-item-btn"
                    >
                        Edit Product
                    </a>

                    <button
                        type="button"
                        id="deleteProductBtn"
                        class="delete-product-btn"
                    >
                        Delete Product
                    </button>
                </div>

                    <h2>Description</h2>

                    <p>
                        ${escapeHTML(
                            product.description || "No description provided."
                        )}
                    </p>
                </div>
            </div>

            <div class="seller-profile">
                <h2>Seller Information</h2>

                <div class="seller-profile-header">
                    <div class="seller-avatar">
                        <span>${escapeHTML(
                            (product.seller || "S").charAt(0).toUpperCase()
                        )}</span>
                    </div>

                    <div>
                        <h3>${escapeHTML(
                            product.seller || "Unknown Seller"
                        )}</h3>
                        <p>NeighbourHub Member</p>
                    </div>
                </div>

                <div class="seller-contact">
                    <p>
                        <strong>Email:</strong>
                        ${
                            product.seller_email
                                ? `<a href="mailto:${escapeHTML(
                                    product.seller_email
                                )}">${escapeHTML(product.seller_email)}</a>`
                                : "Not provided"
                        }
                    </p>

                    <p>
                        <strong>Phone:</strong>
                        ${
                            product.seller_phone
                                ? `<a href="tel:${escapeHTML(
                                    product.seller_phone
                                )}">${escapeHTML(product.seller_phone)}</a>`
                                : "Not provided"
                        }
                    </p>

                    <p>
                        <strong>Address:</strong>
                        ${escapeHTML(
                            product.seller_address || "Not provided"
                        )}
                    </p>
                </div>
            </div>
        `;
        const deleteButton = document.getElementById("deleteProductBtn");

        if (deleteButton) {
            deleteButton.addEventListener("click", async () => {
                const confirmed = window.confirm(
                    "Are you sure you want to delete this product? This action cannot be undone."
                );

                if (!confirmed) {
                    return;
                }

                deleteButton.disabled = true;
                deleteButton.textContent = "Deleting...";

                try {
                    const response = await fetch(
                        `/api/products/${encodeURIComponent(product.product_id)}`,
                        {
                            method: "DELETE"
                        }
                    );

                    const responseText = await response.text();
                    console.log("Delete response status:", response.status);
                    console.log("Delete response body:", responseText);

                    let result = {};

                    try {
                        result = responseText ? JSON.parse(responseText) : {};
                    } catch {
                        throw new Error(
                            "The server returned a non-JSON response. Check the backend terminal for errors."
                        );
                    }

                    if (!response.ok) {
                        throw new Error(
                            result.detail || "Unable to delete product."
                        );
                    }


                    if (!response.ok) {
                        throw new Error(
                            result.detail || "Unable to delete product."
                        );
                    }

                    alert("Product deleted successfully!");

                    window.location.href = "/market";

                } catch (error) {
                    console.error("Error deleting product:", error);

                    alert(error.message || "Something went wrong.");

                    deleteButton.disabled = false;
                    deleteButton.textContent = "Delete Product";
                }
            });
        }
    } catch (error) {
        console.error("Error loading product:", error);

        productDetail.innerHTML = `
            <p>${escapeHTML(error.message)}</p>
            <a href="/market">Return to Marketplace</a>
        `;
    }
}

if (productDetail) {
    loadProductDetails();
}

if (document.getElementById("editProductForm")) {
    const editForm = document.getElementById("editProductForm");
    const editLoading = document.getElementById("editLoading");
    const editMessage = document.getElementById("editMessage");
    const saveButton = document.getElementById("saveProductBtn");

    const imageInput = document.getElementById("image");
    const currentImage = document.getElementById("currentImage");
    const imagePreview = document.getElementById("imagePreview");
    const imagePreviewContainer =
        document.getElementById("imagePreviewContainer");

    const editableFields = [
        "name",
        "price",
        "category",
        "condition",
        "location",
        "description"
    ];

    let productId;
    let originalProduct = {};
    let previewUrl = null;

    function showMessage(message, type = "") {
        editMessage.textContent = message;
        editMessage.className = type;
    }

    function normalizeValue(field, value) {
        if (field === "price") {
            return Number(value);
        }

        return value ?? "";
    }

    async function loadProduct() {
        const params = new URLSearchParams(window.location.search);
        productId = params.get("id");

        if (!productId || !/^\d+$/.test(productId)) {
            editLoading.textContent = "Invalid product ID.";
            return;
        }

        try {
            const response = await fetch(`/api/products/${productId}`);

            if (!response.ok) {
                throw new Error(
                    response.status === 404
                        ? "Product not found."
                        : "Unable to load the product."
                );
            }

            const product = await response.json();

            editableFields.forEach(field => {
                const input = document.getElementById(field);
                input.value = product[field] ?? "";

                originalProduct[field] = normalizeValue(
                    field,
                    product[field]
                );
            });

            originalProduct.image = product.image ?? "";

            if (product.image) {
                currentImage.src = product.image;
                currentImage.hidden = false;
            }

            editLoading.hidden = true;
            editForm.hidden = false;

        } catch (error) {
            editLoading.textContent = error.message;
        }
    }

    // Preview a replacement image
    imageInput.addEventListener("change", () => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            previewUrl = null;
        }

        imagePreview.removeAttribute("src");
        imagePreviewContainer.hidden = true;

        const file = imageInput.files[0];

        if (!file) {
            return;
        }

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (!allowedTypes.includes(file.type)) {
            imageInput.value = "";
            showMessage("Choose a JPG, PNG, or WebP image.", "error");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            imageInput.value = "";
            showMessage("Image size must not exceed 5 MB.", "error");
            return;
        }

        previewUrl = URL.createObjectURL(file);
        imagePreview.src = previewUrl;
        imagePreviewContainer.hidden = false;
        showMessage("");
    });

    editForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        showMessage("");

        const patchData = {};

        // Include only fields that changed
        editableFields.forEach(field => {
            const currentValue = normalizeValue(
                field,
                document.getElementById(field).value
            );

            if (currentValue !== originalProduct[field]) {
                patchData[field] = currentValue;
            }
        });

        saveButton.disabled = true;

        try {
            // Upload a replacement image only when one is selected
            const imageFile = imageInput.files[0];

            if (imageFile) {
                saveButton.textContent = "Uploading image...";

                const imageFormData = new FormData();
                imageFormData.append("file", imageFile);

                const uploadResponse = await fetch("/api/upload-image", {
                    method: "POST",
                    body: imageFormData
                });

                const uploadResult = await uploadResponse.json();

                if (!uploadResponse.ok) {
                    throw new Error(
                        uploadResult.detail || "Image upload failed."
                    );
                }

                patchData.image = uploadResult.image_url;
            }

            if (Object.keys(patchData).length === 0) {
                showMessage("No changes to save.");
                return;
            }

            saveButton.textContent = "Saving changes...";

            const response = await fetch(
                `/api/products/${productId}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(patchData)
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.detail || "Unable to update product."
                );
            }

            // Update the saved baseline
            Object.assign(originalProduct, patchData);

            showMessage("Product updated successfully!", "success");

            setTimeout(() => {
                window.location.href =
                    `/product?id=${encodeURIComponent(productId)}`;
            }, 1000);

        } catch (error) {
            console.error("Error updating product:", error);
            showMessage(error.message, "error");

        } finally {
            saveButton.disabled = false;
            saveButton.textContent = "Save Changes";
        }
    });

    loadProduct();
}
