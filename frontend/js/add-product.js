
const addProductForm = document.getElementById("addProductForm");
const formMessage = document.getElementById("formMessage");
const submitProductBtn = document.getElementById("submitProductBtn");


const imageInput = document.getElementById("image");
const imagePreviewContainer = document.getElementById("imagePreviewContainer");
const imagePreview = document.getElementById("imagePreview");

let previewUrl = null;

// Preview the selected image
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
        formMessage.textContent =
            "Please select a JPG, PNG, or WebP image.";
        formMessage.className = "error";
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        imageInput.value = "";
        formMessage.textContent = "Image size must not exceed 5 MB.";
        formMessage.className = "error";
        return;
    }

    previewUrl = URL.createObjectURL(file);
    imagePreview.src = previewUrl;
    imagePreviewContainer.hidden = false;

    formMessage.textContent = "";
    formMessage.className = "";
});

addProductForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const sessionResponse = await fetch("/api/me");

    if (!sessionResponse.ok) {
        alert("Please log in before selling an item.");
        window.location.href = "/static/pages/login.html";
        return;
    }

    formMessage.textContent = "";
    formMessage.className = "";

    const formData = new FormData(addProductForm);
    const imageFile = imageInput.files[0];

    const productData = {
        name: formData.get("name").trim(),
        price: Number(formData.get("price")),
        category: formData.get("category"),
        condition: formData.get("condition"),
        location: formData.get("location").trim(),
        description: formData.get("description").trim(),
        image: ""
    };

    if (
        !productData.name ||
        !productData.location ||
        !Number.isFinite(productData.price) ||
        productData.price < 0
    ) {
        formMessage.textContent =
            "Please enter valid product details and a valid member ID.";
        formMessage.className = "error";
        return;
    }

    submitProductBtn.disabled = true;

    try {
        // Step 1: Upload the image, if one was selected
        if (imageFile) {
            submitProductBtn.textContent = "Uploading image...";

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

            productData.image = uploadResult.image_url;
        }

        // Step 2: Create the product
        submitProductBtn.textContent = "Publishing product...";

        const response = await fetch("/api/products", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(productData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.detail || "Unable to publish the product."
            );
        }

        formMessage.textContent =
            "Product published successfully! Returning to the marketplace...";
        formMessage.className = "success";

        addProductForm.reset();

        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            previewUrl = null;
        }

        imagePreview.removeAttribute("src");
        imagePreviewContainer.hidden = true;

        setTimeout(() => {
            window.location.href = "/market";
        }, 1200);

    } catch (error) {
        console.error("Error publishing product:", error);

        formMessage.textContent =
            error.message || "Something went wrong. Please try again.";
        formMessage.className = "error";

    } finally {
        submitProductBtn.disabled = false;
        submitProductBtn.textContent = "Publish Product";
    }
});
